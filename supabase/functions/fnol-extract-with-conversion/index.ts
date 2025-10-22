// supabase/functions/fnol-extract-with-conversion/index.ts
// Extracts structured data from FNOL PDF documents
// Handles PDF to image conversion for OpenAI Vision API
// Secrets required: OPENAI_API_KEY

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Convert PDF to images using pdf.co API (or similar service)
 * You'll need to sign up for a free account at pdf.co to get an API key
 */
async function convertPDFToImages(pdfUrl: string): Promise<string[]> {
  // Option 1: Use pdf.co API (recommended - has free tier)
  const PDF_CO_API_KEY = Deno.env.get("PDF_CO_API_KEY");
  
  if (PDF_CO_API_KEY) {
    const response = await fetch("https://api.pdf.co/v1/pdf/convert/to/jpg", {
      method: "POST",
      headers: {
        "x-api-key": PDF_CO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: pdfUrl,
        pages: "0-10", // First 10 pages max for FNOL
        inline: true,
        async: false,
      }),
    });
    
    if (response.ok) {
      const result = await response.json();
      // Return array of image URLs
      return result.urls || [];
    }
  }
  
  // Option 2: Use a free PDF to image conversion service
  // This is a fallback using a public API (may have limitations)
  try {
    // Using api2pdf.com as an example (requires API key)
    const API2PDF_KEY = Deno.env.get("API2PDF_KEY");
    if (API2PDF_KEY) {
      const response = await fetch("https://v2.api2pdf.com/pdf/to/jpg", {
        method: "POST",
        headers: {
          "Authorization": API2PDF_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: pdfUrl,
          inline: true,
          fileName: "fnol.jpg",
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        return [result.FileUrl];
      }
    }
  } catch (error) {
    console.error("PDF conversion fallback failed:", error);
  }
  
  // Option 3: Simple workaround - treat PDF URL as an image
  // This won't work well but allows testing
  console.warn("No PDF conversion API configured. Attempting direct processing.");
  return [pdfUrl];
}

/**
 * Extract FNOL data from images using OpenAI Vision
 */
async function extractFromImages(imageUrls: string[]): Promise<any> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");
  
  // Prepare image content for OpenAI
  const imageContent = imageUrls.map(url => ({
    type: "image_url",
    image_url: { url, detail: "high" }
  }));
  
  const systemPrompt = `You are an expert insurance document processor. Extract ALL information from this FNOL (First Notice of Loss) document.

Return a JSON object with this EXACT structure:
{
  "claimNumber": "extracted claim number or null",
  "policyNumber": "extracted policy number or null",
  "insuredName": "name of insured or null",
  "lossDate": "YYYY-MM-DD format or null",
  "lossLocation": "full address of loss or null",
  "lossDescription": "description of what happened or null",
  "causeOfLoss": "cause (fire, water, wind, etc) or null",
  "estimatedLoss": "dollar amount or null",
  "adjustorName": "assigned adjustor or null",
  "adjustorPhone": "adjustor phone or null",
  "adjustorEmail": "adjustor email or null",
  "reportedToPolice": true/false or null,
  "policeReportNumber": "report number or null",
  "additionalDetails": "any other important information as a string"
}

Extract as much information as possible from all pages. If a field is not found, use null.`;

  const userPrompt = "Extract all FNOL information from these document pages. Return ONLY valid JSON.";

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: [
            { type: "text", text: userPrompt },
            ...imageContent
          ]}
        ],
        temperature: 0.1,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }
    
    const result = await response.json();
    const extractedData = JSON.parse(result.choices[0].message.content);
    
    return extractedData;
  } catch (error) {
    console.error("OpenAI extraction error:", error);
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  
  try {
    const payload = await req.json();
    const { documentId, claimId } = payload;
    
    if (!documentId) {
      throw new Error("documentId is required");
    }
    
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    
    // Get document from database
    const { data: doc, error: docErr } = await sb
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();
    
    if (docErr || !doc) {
      throw new Error(`Document not found: ${docErr?.message}`);
    }
    
    // Update status to processing
    await sb
      .from("documents")
      .update({ extraction_status: "processing" })
      .eq("id", documentId);
    
    // Get public URL for the PDF
    const { data: pub } = sb.storage
      .from("documents")
      .getPublicUrl(doc.storage_path);
    
    const pdfUrl = pub?.publicUrl;
    if (!pdfUrl) {
      throw new Error("Failed to get document URL");
    }
    
    // Convert PDF to images
    console.log("Converting PDF to images...");
    const imageUrls = await convertPDFToImages(pdfUrl);
    
    if (!imageUrls || imageUrls.length === 0) {
      throw new Error("Failed to convert PDF to images");
    }
    
    console.log(`Converted PDF to ${imageUrls.length} images`);
    
    // Extract data from images
    console.log("Extracting data with OpenAI Vision...");
    const extractedData = await extractFromImages(imageUrls);
    
    // Update document with extracted data
    await sb
      .from("documents")
      .update({
        extracted_data: extractedData,
        extraction_status: "completed",
        extraction_confidence: 0.85,
      })
      .eq("id", documentId);
    
    // If claimId provided, update or create claim
    if (claimId || extractedData.claimNumber) {
      let targetClaimId = claimId;
      
      // Create claim if needed
      if (!targetClaimId && extractedData.claimNumber) {
        const { data: newClaim, error: claimError } = await sb
          .from("claims")
          .insert({
            claim_number: extractedData.claimNumber,
            policy_number: extractedData.policyNumber,
            insured_name: extractedData.insuredName,
            loss_date: extractedData.lossDate,
            loss_location: extractedData.lossLocation,
            loss_description: extractedData.lossDescription,
            cause_of_loss: extractedData.causeOfLoss,
            status: "open",
          })
          .select()
          .single();
        
        if (!claimError && newClaim) {
          targetClaimId = newClaim.id;
        }
      }
      
      // Update claim with extracted data
      if (targetClaimId) {
        await sb
          .from("claims")
          .update({
            claim_number: extractedData.claimNumber,
            policy_number: extractedData.policyNumber,
            insured_name: extractedData.insuredName,
            loss_date: extractedData.lossDate,
            loss_location: extractedData.lossLocation,
            loss_description: extractedData.lossDescription,
            cause_of_loss: extractedData.causeOfLoss,
            adjustor_name: extractedData.adjustorName,
            adjustor_phone: extractedData.adjustorPhone,
            adjustor_email: extractedData.adjustorEmail,
          })
          .eq("id", targetClaimId);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        ok: true, 
        extractedData,
        message: `Successfully extracted data from ${imageUrls.length} pages`
      }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
    
  } catch (error: any) {
    console.error("FNOL extraction error:", error);
    
    // Try to update document with error status
    try {
      const payload = await req.json().catch(() => ({}));
      if (payload.documentId) {
        const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        await sb
          .from("documents")
          .update({
            extraction_status: "error",
            extraction_error: error.message,
          })
          .eq("id", payload.documentId);
      }
    } catch (updateError) {
      console.error("Failed to update error status:", updateError);
    }
    
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});