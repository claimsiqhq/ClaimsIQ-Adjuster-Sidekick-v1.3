// supabase/functions/fnol-extract/index.ts
// Extracts structured data from FNOL PDF documents using OpenAI Vision
// Secrets required: OPENAI_API_KEY
// Uses SUPABASE_URL / SUPABASE_ANON_KEY from Edge runtime

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type Payload = {
  documentId: string;
  claimId?: string;
};

type FNOLData = {
  assignmentBy: string | null;
  carrierName: string | null;
  datePrepared: string | null;
  policyDetails: {
    policyNumber: string | null;
    claimNumber: string | null;
    policyPeriod: string | null;
  };
  policyHolder: {
    insuredName: string | null;
    insuredAddress: string | null;
  };
  agency: {
    agencyName: string | null;
    agencyPhone: string | null;
  };
  adjustor: {
    adjustorAssigned: string | null;
    adjustorEmail: string | null;
    adjustorPhoneNumber: string | null;
    adjustorExtension: string | null;
  };
  lossDetails: {
    claimType: string | null;
    causeOfLoss: string | null;
    dateOfLoss: string | null;
    timeOfLoss: string | null;
    lossLocation: string | null;
    lossDescription: string | null;
    descriptionOfDamage: string | null;
    estimatedLoss: string | null;
    additionalInformation: string | null;
  };
  reporterInfo: {
    reportersName: string | null;
    callerType: string | null;
    callerHomePhone: string | null;
    callerCellPhone: string | null;
    callerBusinessPhone: string | null;
    callerEmailAddress: string | null;
    callerExtension: string | null;
  };
  officialReports: {
    reportedToPolice: boolean | null;
    policeDepartment: string | null;
    policeReportNumber: string | null;
    fireDepartmentInvolved: boolean | null;
    fireDepartment: string | null;
    fireReportNumber: string | null;
  };
  additionalContacts: Array<{
    name: string | null;
    address: string | null;
    residencePhone: string | null;
    businessPhone: string | null;
    cellPhone: string | null;
    email: string | null;
    extension: string | null;
  }>;
  miscellaneous: {
    buildingInfo: string | null;
    executive: string | null;
    riskManager: string | null;
    claimsContact: string | null;
  };
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function render(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{\{\s*([A-Z0-9_]+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
    
    const payload = (await req.json()) as Payload;
    if (!payload?.documentId) throw new Error("documentId required");

    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    // 1) Get document record
    const { data: doc, error: docErr } = await sb
      .from("documents")
      .select("*")
      .eq("id", payload.documentId)
      .single();
    
    if (docErr || !doc) throw new Error(`Document not found: ${docErr?.message}`);
    
    // Update status to processing
    await sb.from("documents").update({ extraction_status: "processing" }).eq("id", payload.documentId);

    // 2) Get public URL for the document
    const { data: pub } = sb.storage.from("documents").getPublicUrl(doc.storage_path);
    const DOCUMENT_URL = pub?.publicUrl;
    if (!DOCUMENT_URL) throw new Error("Failed to get document URL");

    // 3) Get active FNOL prompts
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

    const systemPrompt = pSys?.template || "You are an FNOL document extractor. Return JSON.";
    const userPrompt = pUser?.template || "Extract all fields from the document.";

    const sysText = render(systemPrompt, { DOCUMENT_URL });
    const usrText = render(userPrompt, { DOCUMENT_URL });

    // 4) Call OpenAI Vision API
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: sysText },
          {
            role: "user",
            content: [
              { type: "text", text: usrText },
              { type: "image_url", image_url: { url: DOCUMENT_URL } },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 4000,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const out = await res.json();
    const raw = out?.choices?.[0]?.message?.content ?? "";
    if (!raw) throw new Error("Empty response from OpenAI");

    // 5) Parse JSON
    let extracted: FNOLData;
    try {
      extracted = JSON.parse(raw);
    } catch (e) {
      throw new Error(`Failed to parse JSON: ${e.message}`);
    }

    // 6) Update document with extracted data
    await sb.from("documents").update({
      extracted_data: extracted,
      extraction_status: "completed",
      extraction_error: null,
      extraction_confidence: 0.95, // Could calculate from field confidence scores
    }).eq("id", payload.documentId);

    // 7) Update associated claim with key fields
    if (doc.claim_id || payload.claimId) {
      const claimId = doc.claim_id || payload.claimId;
      
      const claimUpdate: any = {
        metadata: extracted, // Store full JSON
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

    return new Response(
      JSON.stringify({ 
        ok: true, 
        extracted: extracted,
        documentId: payload.documentId 
      }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("FNOL extraction error:", error);
    
    // Update document with error status
    if (payload?.documentId) {
      const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      await sb.from("documents").update({
        extraction_status: "error",
        extraction_error: error.message,
      }).eq("id", payload.documentId);
    }

    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});

