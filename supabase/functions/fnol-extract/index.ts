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
    
    // 4) Get active FNOL prompts
    const { data: pSys } = await sb
      .from("app_prompts")
      .select("template")
      .eq("key", "fnol_extract_system")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
      
    const { data: pUser } = await sb
      .from("app_prompts")
      .select("template")
      .eq("key", "fnol_extract_user")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    
    const systemPrompt = pSys?.template || `You are an FNOL document extractor. Extract ALL information from this FNOL document.
Return a JSON object with this structure:
{
  "policyDetails": { "claimNumber", "policyNumber" },
  "carrierName": "insurance company name",
  "policyHolder": { "insuredName" },
  "adjustor": { "adjustorAssigned", "adjustorEmail", "adjustorPhoneNumber" },
  "lossDetails": { "lossLocation", "lossDescription", "causeOfLoss", "dateOfLoss", "timeOfLoss", "estimatedLoss", "claimType" },
  "reporterInfo": { "reportersName", "callerCellPhone" }
}`;
    
    const userPrompt = pUser?.template || "Extract all fields from the document.";
    
    const sysText = render(systemPrompt, { DOCUMENT_URL });
    const usrText = render(userPrompt, { DOCUMENT_URL });
    
    // 5) Prepare image content for OpenAI
    const imageContent = imageUrls.map(url => ({
      type: "image_url",
      image_url: { url }
    }));
    
    // 6) Call OpenAI Vision API
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: sysText },
          {
            role: "user",
            content: [
              { type: "text", text: usrText },
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
    
    // 7) Parse JSON
    let extracted;
    try {
      extracted = JSON.parse(raw);
    } catch (e) {
      throw new Error(`Failed to parse JSON: ${e.message}`);
    }
    
    // 8) Update document with extracted data
    await sb.from("documents").update({
      extracted_data: extracted,
      extraction_status: "completed",
      extraction_error: null,
      extraction_confidence: 0.95
    }).eq("id", payload.documentId);
    
    // 9) Update associated claim with key fields
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
        const amount = parseFloat(extracted.lossDetails.estimatedLoss.replace(/[^0-9.]/g, ''));
        if (!isNaN(amount)) {
          claimUpdate.estimated_loss = amount;
        }
      }
      if (extracted.lossDetails?.claimType) {
        claimUpdate.loss_type = extracted.lossDetails.claimType;
      }
      if (extracted.reporterInfo?.reportersName) {
        claimUpdate.reporter_name = extracted.reporterInfo.reportersName;
      }
      if (extracted.reporterInfo?.callerCellPhone) {
        claimUpdate.reporter_phone = extracted.reporterInfo.callerCellPhone;
      }
      
      await sb.from("claims").update(claimUpdate).eq("id", claimId);
    }
    
    return new Response(JSON.stringify({
      ok: true,
      extracted: extracted,
      documentId: payload.documentId,
      pagesProcessed: imageUrls.length
    }), {
      status: 200,
      headers: {
        ...CORS,
        "Content-Type": "application/json"
      }
    });
    
  } catch (error) {
    console.error("FNOL extraction error:", error);
    
    // Update document with error status
    if (payload?.documentId) {
      const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      await sb.from("documents").update({
        extraction_status: "error",
        extraction_error: error.message
      }).eq("id", payload.documentId);
    }
    
    return new Response(JSON.stringify({
      ok: false,
      error: error.message
    }), {
      status: 500,
      headers: {
        ...CORS,
        "Content-Type": "application/json"
      }
    });
  }
});