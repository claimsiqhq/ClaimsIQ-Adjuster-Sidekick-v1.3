// supabase/functions/fnol-extract-with-conversion/index.ts
// Extracts structured data from FNOL PDF documents
// Uses free open-source unpdf library for PDF to image conversion
// Secrets required: OPENAI_API_KEY

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { renderPageAsImage, getResolvedPDFJS } from "npm:unpdf@0.12.0";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Convert PDF to images using free unpdf library
 * Processes up to 10 pages for FNOL documents
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
  "insuranceCompany": "carrier name or null",
  "adjusterName": "assigned adjuster or null",
  "contactInfo": {
    "phone": "phone number or null",
    "email": "email address or null",
    "preferredContact": "phone/email/text or null"
  },
  "propertyType": "residential/commercial/auto/other or null",
  "occupancy": "owner/tenant/vacant or null",
  "mortgagee": "mortgage company name or null",
  "priorLoss": "yes/no/unknown",
  "emergencyServices": "yes/no/unknown",
  "temporaryRepairs": "yes/no/unknown",
  "documentsAttached": ["list of mentioned attachments"],
  "specialInstructions": "any special notes or null",
  "metadata": {
    "documentPages": ${imageUrls.length},
    "extractionConfidence": "high/medium/low based on document quality"
  }
}

Be thorough and extract every piece of information visible in the document. If information is not present, use null.`;

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
          { 
            role: "user", 
            content: [
              { type: "text", text: "Extract all FNOL information from these document pages." },
              ...imageContent
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.1,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const result = await response.json();
    const extractedData = JSON.parse(result.choices[0].message.content);
    
    console.log("Extraction successful:", {
      claimNumber: extractedData.claimNumber,
      insuredName: extractedData.insuredName,
      pages: imageUrls.length
    });
    
    return extractedData;
  } catch (error) {
    console.error("OpenAI extraction error:", error);
    throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS });
  }

  try {
    const { pdfUrl, documentId } = await req.json();
    
    if (!pdfUrl) {
      return new Response(
        JSON.stringify({ error: "PDF URL is required" }), 
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" }}
      );
    }

    console.log("Processing FNOL document:", documentId);

    // Initialize Supabase client
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader || "" }},
    });

    // Update document status to processing
    if (documentId) {
      await supabase
        .from("documents")
        .update({ 
          extraction_status: "processing",
          updated_at: new Date().toISOString()
        })
        .eq("id", documentId);
    }

    // Fetch the PDF
    console.log("Fetching PDF from:", pdfUrl);
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch PDF: ${pdfResponse.status}`);
    }
    
    const pdfData = new Uint8Array(await pdfResponse.arrayBuffer());
    console.log(`PDF size: ${pdfData.length} bytes`);

    // Convert PDF to images
    console.log("Converting PDF to images...");
    const imageUrls = await convertPDFToImages(pdfData);
    console.log(`Converted to ${imageUrls.length} images`);

    // Extract data using OpenAI Vision
    console.log("Extracting FNOL data with OpenAI...");
    const extractedData = await extractFromImages(imageUrls);

    // Update document with extracted data
    if (documentId) {
      const { error: updateError } = await supabase
        .from("documents")
        .update({
          extracted_data: extractedData,
          extraction_status: "completed",
          extraction_confidence: extractedData.metadata?.extractionConfidence || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);

      if (updateError) {
        console.error("Failed to update document:", updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: extractedData,
        pages: imageUrls.length
      }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" }}
    );
    
  } catch (error) {
    console.error("FNOL extraction error:", error);
    
    // Try to update document status to failed
    const { documentId } = await req.json().catch(() => ({}));
    if (documentId) {
      const authHeader = req.headers.get("Authorization");
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader || "" }},
      });
      
      await supabase
        .from("documents")
        .update({
          extraction_status: "failed",
          extraction_error: error.message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: "Check edge function logs for more information"
      }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" }}
    );
  }
});