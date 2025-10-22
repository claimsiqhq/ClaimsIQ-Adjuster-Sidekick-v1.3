// supabase/functions/fnol-extract/index.ts
// Extracts structured data from FNOL PDF documents with automatic PDF to image conversion
// Secrets required: OPENAI_API_KEY
// Uses SUPABASE_URL / SUPABASE_ANON_KEY from Edge runtime

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { renderPageAsImage, getResolvedPDFJS } from "npm:unpdf@0.12.0";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function render(tpl, vars) {
  return tpl.replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

/**
 * Convert PDF to images using free unpdf library
 */
async function convertPDFToImages(pdfData: Uint8Array): Promise<string[]> {
  try {
    const { getDocument } = await getResolvedPDFJS();
    const pdf = await getDocument(pdfData).promise;
    
    // Process up to 10 pages for FNOL documents
    const maxPages = Math.min(pdf.numPages, 10);
    const imageBuffers: Uint8Array[] = [];
    
    for (let i = 1; i <= maxPages; i++) {
      console.log(`Converting page ${i} of ${maxPages}`);
      const imageBuffer = await renderPageAsImage(pdfData, i, {
        scale: 2.0, // High quality for text extraction
      });
      imageBuffers.push(imageBuffer);
    }
    
    // Convert buffers to base64 data URLs for OpenAI
    const base64Images = imageBuffers.map(buffer => {
      const base64 = btoa(String.fromCharCode(...buffer));
      return `data:image/png;base64,${base64}`;
    });
    
    console.log(`Successfully converted ${base64Images.length} pages to images`);
    return base64Images;
  } catch (error) {
    console.error("PDF conversion error:", error);
    throw new Error(`Failed to convert PDF: ${error.message}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  
  try {
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
    
    const payload = await req.json();
    if (!payload?.documentId) throw new Error("documentId required");
    
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization") ?? ""
        }
      }
    });
    
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
    
    // 3) Check if document is PDF and needs conversion
    let imageUrls: string[] = [];
    
    if (doc.mime_type === "application/pdf" || doc.file_name?.toLowerCase().endsWith('.pdf')) {
      console.log("PDF detected, converting to images...");
      
      // Fetch the PDF
      const pdfResponse = await fetch(DOCUMENT_URL);
      if (!pdfResponse.ok) {
        throw new Error(`Failed to fetch PDF: ${pdfResponse.status}`);
      }
      
      const pdfData = new Uint8Array(await pdfResponse.arrayBuffer());
      console.log(`PDF size: ${pdfData.length} bytes`);
      
      // Convert PDF to images
      imageUrls = await convertPDFToImages(pdfData);
      console.log(`Converted to ${imageUrls.length} images`);
    } else {
      // Document is already an image
      console.log("Document is an image, using directly");
      imageUrls = [DOCUMENT_URL];
    }
    
    // 4) Get active FNOL extraction prompt (SINGLE PROMPT)
    const { data: promptData } = await sb
      .from("app_prompts")
      .select("template")
      .eq("key", "fnol_extract")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    
    // Default prompt if none exists in database
    const defaultPrompt = `You are an expert at extracting insurance claim data from FNOL documents.

Extract ALL information from the provided document images and return a JSON object with this EXACT structure:
{
  "policyDetails": {
    "claimNumber": "claim number",
    "policyNumber": "policy number"
  },
  "carrierName": "insurance company name",
  "policyHolder": {
    "insuredName": "insured person's name"
  },
  "adjustor": {
    "adjustorAssigned": "adjuster's name",
    "adjustorEmail": "adjuster's email",
    "adjustorPhoneNumber": "adjuster's phone"
  },
  "lossDetails": {
    "lossLocation": "full address of loss",
    "lossDescription": "detailed description of what happened",
    "causeOfLoss": "primary cause (e.g., Wind, Water, Fire)",
    "dateOfLoss": "YYYY-MM-DD format",
    "timeOfLoss": "HH:MM format if available",
    "estimatedLoss": "dollar amount if available",
    "claimType": "type of claim"
  },
  "reporterInfo": {
    "reportersName": "person who reported",
    "callerCellPhone": "reporter's phone"
  }
}

Be thorough - extract every piece of information visible in the document. Use null for missing fields.`;
    
    const extractionPrompt = promptData?.template || defaultPrompt;
    
    // Prepare image content for OpenAI
    const imageContent = imageUrls.map(url => ({
      type: "image_url",
      image_url: { url }
    }));
    
    // 5) Call OpenAI Vision API with SINGLE prompt
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
    
    // 8) Update associated claim with key fields
    if (doc.claim_id || payload.claimId) {
      const claimId = doc.claim_id || payload.claimId;
      const claimUpdate: any = {
        metadata: extracted
      };
      
      // Map key fields to columns for easy querying
      if (extracted.policyDetails?.claimNumber) {
        claimUpdate.claim_number = extracted.policyDetails.claimNumber;
      }
      if (extracted.policyDetails?.policyNumber) {
        claimUpdate.policy_number = extracted.policyDetails.policyNumber;
      }
      if (extracted.carrierName) {
        claimUpdate.carrier_name = extracted.carrierName;
      }
      if (extracted.policyHolder?.insuredName) {
        claimUpdate.insured_name = extracted.policyHolder.insuredName;
      }
      if (extracted.adjustor?.adjustorAssigned) {
        claimUpdate.adjuster_name = extracted.adjustor.adjustorAssigned;
      }
      if (extracted.adjustor?.adjustorEmail) {
        claimUpdate.adjuster_email = extracted.adjustor.adjustorEmail;
      }
      if (extracted.adjustor?.adjustorPhoneNumber) {
        claimUpdate.adjuster_phone = extracted.adjustor.adjustorPhoneNumber;
      }
      if (extracted.lossDetails?.lossLocation) {
        claimUpdate.loss_location = extracted.lossDetails.lossLocation;
      }
      if (extracted.lossDetails?.lossDescription) {
        claimUpdate.loss_description = extracted.lossDetails.lossDescription;
      }
      if (extracted.lossDetails?.causeOfLoss) {
        claimUpdate.cause_of_loss = extracted.lossDetails.causeOfLoss;
      }
      if (extracted.lossDetails?.dateOfLoss) {
        claimUpdate.loss_date = extracted.lossDetails.dateOfLoss;
      }
      if (extracted.lossDetails?.timeOfLoss) {
        claimUpdate.time_of_loss = extracted.lossDetails.timeOfLoss;
      }
      if (extracted.lossDetails?.estimatedLoss) {
        claimUpdate.estimated_loss = parseFloat(extracted.lossDetails.estimatedLoss.replace(/[^0-9.-]/g, '')) || null;
      }
      
      await sb.from("claims").update(claimUpdate).eq("id", claimId);
    }
    
    // 9) Create workflow based on extracted data
    const workflowItems = [];
    
    if (extracted.lossDetails?.causeOfLoss) {
      const cause = extracted.lossDetails.causeOfLoss.toLowerCase();
      
      if (cause.includes("water") || cause.includes("flood")) {
        workflowItems.push(
          { title: "Document water source", completed: false },
          { title: "Check for mold", completed: false },
          { title: "Moisture readings", completed: false }
        );
      } else if (cause.includes("wind") || cause.includes("storm")) {
        workflowItems.push(
          { title: "Inspect roof damage", completed: false },
          { title: "Check siding/windows", completed: false },
          { title: "Document debris", completed: false }
        );
      } else if (cause.includes("fire")) {
        workflowItems.push(
          { title: "Document burn patterns", completed: false },
          { title: "Check structural integrity", completed: false },
          { title: "Inventory damaged items", completed: false }
        );
      }
    }
    
    if (workflowItems.length > 0 && (doc.claim_id || payload.claimId)) {
      await sb.from("inspection_steps").insert(
        workflowItems.map((item, idx) => ({
          claim_id: doc.claim_id || payload.claimId,
          step_order: idx + 1,
          title: item.title,
          description: `Generated from FNOL: ${item.title}`,
          completed: false,
          required: true
        }))
      );
    }
    
    return new Response(JSON.stringify({
      success: true,
      documentId: payload.documentId,
      claimId: doc.claim_id || payload.claimId,
      extracted,
      workflowGenerated: workflowItems.length > 0
    }), {
      headers: { ...CORS, "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error("Error:", error.message);
    
    // Mark document as failed if we have documentId
    if (payload?.documentId && sb) {
      await sb.from("documents").update({
        extraction_status: "failed",
        extraction_error: error.message
      }).eq("id", payload.documentId);
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" }
    });
  }
});