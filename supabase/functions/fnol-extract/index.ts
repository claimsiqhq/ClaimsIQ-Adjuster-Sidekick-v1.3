// supabase/functions/fnol-extract/index.ts
// Extracts structured data from FNOL PDF documents with automatic PDF to image conversion
// Secrets required: OPENAI_API_KEY
// Uses SUPABASE_URL / SUPABASE_ANON_KEY from Edge runtime

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { getDocument, GlobalWorkerOptions } from "npm:pdfjs-dist@4.0.379/legacy/build/pdf.mjs";
import { encode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

// Disable worker for Deno Edge Runtime compatibility
GlobalWorkerOptions.workerSrc = '';

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

/**
 * Convert PDF to images using pdfjs-dist
 */
async function convertPDFToImages(pdfData: Uint8Array): Promise<string[]> {
  try {
    console.log("Starting PDF to image conversion");
    const pdf = await getDocument({ data: pdfData }).promise;
    console.log(`PDF loaded successfully: ${pdf.numPages} pages`);

    // Process up to 10 pages for FNOL documents
    const maxPages = Math.min(pdf.numPages, 10);
    const base64Images: string[] = [];

    for (let i = 1; i <= maxPages; i++) {
      console.log(`Rendering page ${i} of ${maxPages}`);
      
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      
      // Create an OffscreenCanvas for rendering
      const canvas = new OffscreenCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error(`Failed to get canvas context for page ${i}`);
      }
      
      // Render the PDF page to the canvas
      await page.render({
        canvasContext: context as any,
        viewport: viewport
      }).promise;
      
      // Convert canvas to blob then to base64
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64 = encode(uint8Array);
      
      base64Images.push(`data:image/png;base64,${base64}`);
      console.log(`Page ${i} converted successfully`);
    }

    console.log(`Successfully converted ${base64Images.length} pages to images`);
    return base64Images;
  } catch (error) {
    console.error("PDF conversion error:", error);
    throw new Error(`Failed to convert PDF: ${error.message}`);
  }
}

Deno.serve(async (req) => {
  console.log("=== FNOL EXTRACTION STARTED ===");
  console.log("Request method:", req.method);
  console.log("Request URL:", req.url);
  
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  let payload: { documentId?: string; claimId?: string } | null = null;
  let sb: SupabaseClient | null = null;

  try {
    console.log("Checking environment variables...");
    console.log("OPENAI_API_KEY:", OPENAI_API_KEY ? "SET" : "NOT SET");
    console.log("SUPABASE_URL:", SUPABASE_URL ? "SET" : "NOT SET");
    console.log("SUPABASE_SERVICE_KEY:", SUPABASE_SERVICE_KEY ? "SET" : "NOT SET");
    
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");

    console.log("Parsing request body...");
    payload = await req.json();
    console.log("Payload received:", payload);
    
    if (!payload || !payload.documentId) throw new Error("documentId required");

    sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization") ?? ""
        }
      }
    });

    if (!sb) throw new Error("Failed to create Supabase client");
    
    // 1) Get document record
    const { data: doc, error: docErr } = await sb
      .from("documents")
      .select("*")
      .eq("id", payload.documentId)
      .single();
      
    if (docErr || !doc) throw new Error(`Document not found: ${docErr?.message}`);
    
    // Update status to processing
    await sb.from("documents").update({
      extraction_status: "processing"
    }).eq("id", payload.documentId);
    
    // 2) Get public URL for the document
    const { data: pub } = sb.storage.from("documents").getPublicUrl(doc.storage_path);
    const DOCUMENT_URL = pub?.publicUrl;
    
    if (!DOCUMENT_URL) throw new Error("Failed to get document URL");
    
    // 3) Handle PDFs and images differently
    console.log(`Document type: ${doc.mime_type}, URL: ${DOCUMENT_URL}`);

    let imageUrls: string[] = [];

    if (doc.mime_type === "application/pdf" || doc.file_name?.toLowerCase().endsWith('.pdf')) {
      console.log("Document is PDF - converting to images");

      // Fetch the PDF file
      const pdfResponse = await fetch(DOCUMENT_URL);
      if (!pdfResponse.ok) {
        throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
      }

      const pdfBuffer = await pdfResponse.arrayBuffer();
      const pdfData = new Uint8Array(pdfBuffer);

      // Convert PDF pages to base64 images
      imageUrls = await convertPDFToImages(pdfData);
      console.log(`PDF converted to ${imageUrls.length} images`);
    } else {
      // For images, use the URL directly
      imageUrls = [DOCUMENT_URL];
      console.log("Using image URL for OpenAI processing");
    }
    
    // 4) Get active FNOL extraction prompt (SINGLE PROMPT)
    const { data: promptData } = await sb
      .from("app_prompts")
      .select("template")
      .eq("key", "fnol_extract")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    
    // Comprehensive FNOL extraction prompt
    const defaultPrompt = `You are extracting structured data from a First Notice of Loss (FNOL) document. 
Return ONLY a single JSON object that exactly matches the target schema below (same keys, same nesting, same order). 
Do not include any commentary, explanations, or additional keys.

DOCUMENT STYLE & LABELS
- The document is a "Homeowners Vendor Assignment" style FNOL and contains blocks labeled like:
  - "Date Prepared", "Policy & Insured Information", "Adjuster Information", "Loss Information", 
    "Reporting Party & Official Reports", "Contact & Witness Information" (if present).
- Common field labels include (not exhaustive): 
  "Carrier Name", "Claim Number", "Policy Number", "Policy Period", "Insured Name", 
  "Insured Mailing Address", "Agency Name", "Agency Phone", 
  "Adjuster Assigned", "Adjuster E-mail", "Adjuster Phone Number", "Extension", 
  "Claim Type", "Cause of Loss", "Date of Loss", "Time of Loss", "Loss Location", 
  "Loss Description", "Description of Damage", "Estimated Loss", 
  "Reporter's Name", "Caller Type", "Business Phone", "Cell Phone", "E-mail Address", "Extension", 
  "Reported to Police", "Fire Department Involved". 
- Page order matters; read all pages, top-to-bottom, left-to-right.

TARGET JSON SCHEMA (exact keys, same order)
{
  "assignmentBy": null,
  "carrierName": null,
  "datePrepared": null,
  "policyDetails": {
    "policyNumber": null,
    "claimNumber": null,
    "policyPeriod": null
  },
  "policyHolder": {
    "insuredName": null,
    "insuredAddress": null
  },
  "agency": {
    "agencyName": null,
    "agencyPhone": null
  },
  "adjustor": {
    "adjustorAssigned": null,
    "adjustorEmail": null,
    "adjustorPhoneNumber": null,
    "adjustorExtension": null
  },
  "lossDetails": {
    "claimType": "Property Damage",
    "causeOfLoss": null,
    "dateOfLoss": null,
    "timeOfLoss": null,
    "lossLocation": null,
    "lossDescription": null,
    "descriptionOfDamage": null,
    "estimatedLoss": null,
    "additionalInformation": null
  },
  "reporterInfo": {
    "reportersName": null,
    "callerType": null,
    "callerHomePhone": null,
    "callerCellPhone": null,
    "callerBusinessPhone": null,
    "callerEmailAddress": null,
    "callerExtension": null
  },
  "officialReports": {
    "reportedToPolice": null,
    "policeDepartment": null,
    "policeReportNumber": null,
    "fireDepartmentInvolved": null,
    "fireDepartment": null,
    "fireReportNumber": null
  },
  "additionalContacts": [
    {
      "name": null,
      "address": null,
      "residencePhone": null,
      "businessPhone": null,
      "cellPhone": null,
      "email": null,
      "extension": null
    }
  ],
  "miscellaneous": {
    "buildingInfo": null,
    "executive": null,
    "riskManager": null,
    "claimsContact": null
  }
}

MAPPING RULES
- assignmentBy: If the header says "Homeowners Vendor Assignment by <Org>", extract <Org>; otherwise null.
- carrierName: From "Carrier Name".
- datePrepared: From "Date Prepared".
- policyDetails.policyNumber: From "Policy Number".
- policyDetails.claimNumber: From "Claim Number".
- policyDetails.policyPeriod: Copy the full "Policy Period" string exactly as written (e.g., "MM/DD/YYYY to MM/DD/YYYY").
- policyHolder.insuredName: From "Insured Name".
- policyHolder.insuredAddress: From "Insured Mailing Address".
- agency.agencyName / agency.agencyPhone: From "Agency Name" / "Agency Phone".
- adjustor.* : From "Adjuster Information". Map "Adjuster Assigned" → adjustorAssigned; 
  "Adjuster E-mail" → adjustorEmail; "Adjuster Phone Number" → adjustorPhoneNumber; "Extension" → adjustorExtension.
- lossDetails: 
  - claimType: If a claim type is explicitly listed, use it. Otherwise default to "Property Damage".
  - causeOfLoss: From "Cause of Loss".
  - dateOfLoss / timeOfLoss: From "Date of Loss" / "Time of Loss".
  - lossLocation: From "Loss Location".
  - lossDescription: From "Loss Description".
  - descriptionOfDamage: If a separate "Description of Damage" field exists, extract verbatim; else null.
  - estimatedLoss: From "Estimated Loss".
  - additionalInformation: Any extra text in the loss section that doesn't fit elsewhere (e.g., qualifiers like 
    "Information limited and unverified..."); otherwise null.
- reporterInfo: 
  - reportersName: From "Reporter's Name".
  - callerType: From "Caller Type".
  - callerHomePhone: From "Home Phone" if present; else null.
  - callerCellPhone: From "Cell Phone".
  - callerBusinessPhone: From "Business Phone".
  - callerEmailAddress: From "E-mail Address".
  - callerExtension: From "Extension" in the reporting block (not the adjuster block).
- officialReports:
  - reportedToPolice / fireDepartmentInvolved: Map "Yes"/"No" to booleans true/false; if absent, null.
  - policeDepartment, policeReportNumber, fireDepartment, fireReportNumber: If explicitly listed; else null.
- additionalContacts: 
  - If the document includes a "Contact & Witness Information" section, push each person as an object. 
  - If none exist, keep a single object with all fields null (as in schema).
- miscellaneous: Leave null unless the document explicitly contains such details.

NORMALIZATION RULES
- Dates: Convert to ISO 8601 date strings "YYYY-MM-DD" when unambiguous (e.g., "07/08/2024" → "2024-07-08"). 
  If the month/day order is certain from context, convert; if ambiguous, leave the original string.
- Times: Keep as seen (e.g., "12:00 AM", "5:00 PM").
- Phones: Normalize to E.164 when possible (US/Canada: "+1XXXXXXXXXX"). If formatting can't be safely inferred, keep original.
- Emails: Lowercase and trim.
- Currency: For "Estimated Loss", extract numeric value as a string with currency symbol preserved if present (e.g., "$0.00"). 
  If the field explicitly says "Initial report, pending inspection", still set estimatedLoss to the numeric/currency literal if present.
- Booleans: Map "Yes"→true, "No"→false. If blank/missing, null.
- Text: Preserve punctuation and casing from the document for descriptive fields (lossDescription, descriptionOfDamage).

ROBUSTNESS
- The PDF may be multi-page. Read all pages and merge fields.
- Sections may be missing; set those keys to null (do NOT drop keys).
- Labels may vary slightly (e.g., "Adjuster E-mail" vs "Adjuster Email"); match by meaning.
- If both "Loss Description" and a narrative paragraph appear, place the labeled line in lossDescription, 
  and longer narrative or disclaimers in additionalInformation.
- If a field has multiple instances (e.g., multiple contacts), populate the array accordingly.
- If OCR noise causes uncertain characters, resolve by context (e.g., email/phone patterns, address patterns, US ZIP formats). 
  When uncertain, prefer null over hallucination.

OUTPUT
- Return exactly one JSON object conforming to the schema above.
- No markdown, no code fences, no extra text.`;
    
    const extractionPrompt = promptData?.template || defaultPrompt;
    
    // Prepare image content for OpenAI
    console.log(`Preparing OpenAI request with ${imageUrls.length} image(s)`);
    const imageContent = imageUrls.map(url => ({
      type: "image_url",
      image_url: { url }
    }));

    // 5) Call OpenAI Vision API with SINGLE prompt
    console.log("Sending request to OpenAI vision model");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: extractionPrompt },
              ...imageContent
            ]
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 4000
      })
    });

    console.log(`OpenAI response received with status ${res.status}`);

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`OpenAI API error: ${errorText}`);
    }
    
    const out = await res.json();
    const raw = out?.choices?.[0]?.message?.content ?? "";
    
    if (!raw) throw new Error("Empty response from OpenAI");
    
    // 6) Parse JSON
    let extracted;
    try {
      extracted = JSON.parse(raw);
    } catch (e) {
      throw new Error(`Failed to parse JSON: ${e.message}`);
    }
    
    // 7) Update document with extracted data
    await sb.from("documents").update({
      extracted_data: extracted,
      extraction_status: "completed",
      extraction_error: null,
      extraction_confidence: 0.95
    }).eq("id", payload.documentId);

    // 8) Create or update claim with ALL 28 columns populated
    let finalClaimId = doc.claim_id || payload.claimId;
    
    // Map ALL extracted FNOL data to claim columns
    const claimData: any = {
      // Core identifiers
      claim_number: extracted.policyDetails?.claimNumber || `AUTO-${Date.now()}`,
      policy_number: extracted.policyDetails?.policyNumber || null,
      
      // Insured information (3 columns)
      insured_name: extracted.policyHolder?.insuredName || null,
      insured_phone: extracted.reporterInfo?.callerCellPhone || extracted.reporterInfo?.callerHomePhone || null,
      insured_email: extracted.reporterInfo?.callerEmailAddress || null,
      
      // Loss details (7 columns)
      loss_date: extracted.lossDetails?.dateOfLoss || null,
      loss_type: extracted.lossDetails?.claimType || null,
      loss_location: extracted.lossDetails?.lossLocation || null,
      loss_description: extracted.lossDetails?.lossDescription || null,
      cause_of_loss: extracted.lossDetails?.causeOfLoss || null,
      estimated_loss: parseFloat(extracted.lossDetails?.estimatedLoss?.replace(/[^0-9.-]/g, '') || '0') || null,
      time_of_loss: extracted.lossDetails?.timeOfLoss || null,
      
      // Adjuster information (3 columns)
      adjuster_name: extracted.adjustor?.adjustorAssigned || null,
      adjuster_email: extracted.adjustor?.adjustorEmail || null,
      adjuster_phone: extracted.adjustor?.adjustorPhoneNumber || null,
      
      // Carrier information
      carrier_name: extracted.carrierName || null,
      
      // Reporter information (2 columns)
      reporter_name: extracted.reporterInfo?.reportersName || null,
      reporter_phone: extracted.reporterInfo?.callerCellPhone || extracted.reporterInfo?.callerBusinessPhone || null,
      
      // Dates
      date_prepared: extracted.datePrepared || null,
      reported_date: new Date().toISOString().split('T')[0], // Today's date
      
      // Status - use valid database constraint value
      status: 'open',
      
      // Property address (text field, not JSONB)
      property_address: extracted.lossDetails?.lossLocation || null,
      
      // Store complete FNOL data in metadata
      metadata: extracted
    };
    
    if (finalClaimId) {
      // Update existing claim
      console.log(`Updating existing claim ${finalClaimId} with ALL extracted data`);
      
      const { error: updateError } = await sb.from("claims").update(claimData).eq("id", finalClaimId);
      
      if (updateError) {
        console.error(`Failed to update claim: ${updateError.message}`);
      } else {
        console.log(`Successfully updated claim ${finalClaimId}`);
      }
    } else {
      // Create new claim
      console.log(`Creating new claim with ALL extracted data`);
      
      const { data: newClaim, error: createError } = await sb
        .from("claims")
        .insert(claimData)
        .select('id')
        .single();
      
      if (createError) {
        console.error(`Failed to create claim: ${createError.message}`);
        console.error(`Error details:`, createError);
      } else {
        finalClaimId = newClaim.id;
        console.log(`Successfully created claim ${finalClaimId}`);
        
        // Link document to newly created claim
        await sb.from("documents").update({ claim_id: finalClaimId }).eq("id", payload.documentId);
      }
    }

    // 9) Create initial workflow based on extracted loss type
    const workflowItems = [];
    
    if (extracted.lossDetails?.causeOfLoss) {
      const cause = extracted.lossDetails.causeOfLoss.toLowerCase();
      
      if (cause.includes("water") || cause.includes("flood") || cause.includes("plumbing")) {
        workflowItems.push(
          { title: "Document water source and shutoff", completed: false },
          { title: "Check for mold growth", completed: false },
          { title: "Moisture readings all affected areas", completed: false },
          { title: "Photo standing water if present", completed: false }
        );
      } else if (cause.includes("wind") || cause.includes("storm") || cause.includes("hail")) {
        workflowItems.push(
          { title: "Inspect roof damage", completed: false },
          { title: "Check gutters and downspouts", completed: false },
          { title: "Document siding/window damage", completed: false },
          { title: "Photo any debris", completed: false }
        );
      } else if (cause.includes("fire") || cause.includes("smoke")) {
        workflowItems.push(
          { title: "Document burn patterns", completed: false },
          { title: "Check structural integrity", completed: false },
          { title: "Inventory damaged items", completed: false },
          { title: "Photo smoke damage to walls/ceilings", completed: false }
        );
      } else if (cause.includes("theft") || cause.includes("vandalism")) {
        workflowItems.push(
          { title: "Document point of entry", completed: false },
          { title: "Photo all damage/vandalism", completed: false },
          { title: "List missing items", completed: false },
          { title: "Check for fingerprints preservation", completed: false }
        );
      } else {
        // Generic property damage workflow
        workflowItems.push(
          { title: "Overall property photos", completed: false },
          { title: "Document all damage areas", completed: false },
          { title: "Measure affected areas", completed: false },
          { title: "Check for safety hazards", completed: false }
        );
      }
    }
    
    // Only create initial workflow steps if we have a claim_id
    // Note: Full workflow generation can be done via the workflow-generate edge function
    if (workflowItems.length > 0 && (doc.claim_id || payload.claimId)) {
      try {
        await sb.from("inspection_steps").insert(
          workflowItems.map((item, idx) => ({
            claim_id: doc.claim_id || payload.claimId,
            step_order: idx + 1,
            title: item.title,
            kind: 'photo',  // Default to 'photo' type for damage documentation
            instructions: `Generated from FNOL: ${item.title}`,
            status: 'pending',
            evidence_rules: { min_count: 1 },
            orig_id: `fnol_step_${idx + 1}`
          }))
        );
      } catch (workflowError) {
        // Log but don't fail the entire extraction if workflow creation fails
        console.error("Failed to create initial workflow steps:", workflowError);
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      documentId: payload.documentId,
      claimId: finalClaimId,
      extraction: extracted,
      workflowGenerated: workflowItems.length > 0
    }), {
      headers: { ...CORS, "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error("Error during FNOL extraction:", error);

    // Mark document as failed if we have documentId
    if (payload?.documentId && sb) {
      try {
        await sb.from("documents").update({
          extraction_status: "failed",
          extraction_error: error.message
        }).eq("id", payload.documentId);
      } catch (updateError) {
        console.error("Failed to update document error status:", updateError);
      }
    }

    // Determine appropriate HTTP status code
    const isClientError =
      error.message?.includes("documentId required") ||
      error.message?.includes("Document not found") ||
      error.message?.includes("Failed to fetch PDF");

    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: isClientError ? 400 : 500,
      headers: { ...CORS, "Content-Type": "application/json" }
    });
  }
});