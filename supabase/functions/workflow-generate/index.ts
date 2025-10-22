// supabase/functions/workflow-generate/index.ts
// Generates inspection workflow steps using OpenAI based on claim details

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type Payload = {
  claimId: string;
};

type WorkflowStep = {
  id: string;
  title: string;
  kind: "photo" | "scan" | "doc" | "note" | "measure";
  instructions: string[];
  evidence_rules?: {
    min_count?: number;
    must_tags?: string[];
    gps_required?: boolean;
  };
  validation?: any;
  next?: string[];
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
    if (!payload?.claimId) throw new Error("claimId required");

    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    // 1) Get claim details
    const { data: claim, error: claimErr } = await sb
      .from("claims")
      .select("*")
      .eq("id", payload.claimId)
      .single();
    
    if (claimErr || !claim) throw new Error(`Claim not found: ${claimErr?.message}`);

    // 2) Extract variables for prompt
    const LOSS_TYPE = claim.loss_type || "property damage";
    
    // Determine dwelling type from metadata or default
    let DWELLING = "single-family home";
    if (claim.metadata?.policyHolder || claim.metadata?.property) {
      // Could parse from FNOL metadata if available
      DWELLING = claim.metadata?.property?.dwelling_type || "single-family home";
    }
    
    // Extract jurisdiction from address
    let JURISDICTION = "United States";
    if (claim.loss_location) {
      // Try to extract state from address
      const stateMatch = claim.loss_location.match(/,\s*([A-Z]{2})\s*\d/);
      if (stateMatch) {
        JURISDICTION = stateMatch[1]; // e.g., "MO", "TX"
      }
    } else if (claim.property_address?.state) {
      JURISDICTION = claim.property_address.state;
    }
    
    const NOTES = claim.loss_description || "";

    // 3) Get workflow generation prompt (SINGLE PROMPT)
    const { data: promptData } = await sb
      .from("app_prompts")
      .select("template")
      .eq("key", "workflow_generate")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    // Default single prompt combining instructions and task
    const defaultPrompt = `You are an expert insurance inspection workflow generator.

Generate an efficient, stepwise inspection workflow for this claim:
- Loss Type: {{LOSS_TYPE}}
- Property Type: {{DWELLING}}
- Jurisdiction: {{JURISDICTION}}
- Notes: {{NOTES}}

Create a JSON array of inspection steps. Each step should have:
{
  "id": "unique_id",
  "title": "step title",
  "kind": "photo|scan|doc|note|measure",
  "instructions": ["detailed instruction 1", "instruction 2"],
  "evidence_rules": {
    "min_count": number of required items,
    "must_tags": ["required", "tags"],
    "gps_required": true/false
  },
  "validation": {},
  "next": ["next_step_id"]
}

Balance completeness with efficiency. Include safety checks, documentation requirements, and thorough photo coverage of damage.

Return ONLY a JSON array of steps, no explanatory text.`;

    const promptTemplate = promptData?.template || defaultPrompt;
    const workflowPrompt = render(promptTemplate, { LOSS_TYPE, DWELLING, JURISDICTION, NOTES });

    // 4) Call OpenAI with SINGLE prompt
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "user", content: workflowPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 2000,
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
    let parsed: { steps?: WorkflowStep[] };
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      throw new Error(`Failed to parse JSON: ${e.message}`);
    }

    const steps = parsed.steps || (Array.isArray(parsed) ? parsed : []);
    
    if (!steps || steps.length === 0) {
      throw new Error("No workflow steps generated");
    }

    // 6) Save steps to inspection_steps table
    const stepsToInsert = steps.map((step, index) => ({
      claim_id: payload.claimId,
      title: step.title,
      kind: step.kind,
      instructions: step.instructions || [],
      evidence_rules: step.evidence_rules || null,
      validation: step.validation || null,
      next_steps: step.next || [],
      step_order: index + 1,
      status: "pending",
      orig_id: step.id || `step_${index + 1}`,
    }));

    const { error: insertError } = await sb
      .from("inspection_steps")
      .insert(stepsToInsert);

    if (insertError) throw new Error(`Failed to save steps: ${insertError.message}`);

    // 7) Update claim status to in_progress
    await sb
      .from("claims")
      .update({ status: "in_progress" })
      .eq("id", payload.claimId);

    return new Response(
      JSON.stringify({ 
        ok: true, 
        stepsGenerated: steps.length,
        claimId: payload.claimId 
      }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Workflow generation error:", error);

    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});