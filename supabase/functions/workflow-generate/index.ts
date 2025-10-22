// supabase/functions/workflow-generate/index.ts
// Generates comprehensive inspection workflows using OpenAI based on FNOL data

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type Payload = {
  claimId: string;
};

type WorkflowStep = {
  stepNumber: number;
  title: string;
  objective: string;
  requiredArtifacts: string[];
  assignedTo: "FieldAdjuster" | "DeskReviewer" | "Vendor";
  status: "not_started" | "in_progress" | "completed";
  estimatedTimeMinutes: number | string;
  dependencies: number[];
  suggestedTools?: string[];
  notes?: string;
};

type Checklist = {
  section: string;
  items: string[];
};

type GeneratedWorkflow = {
  workflowName: string;
  claimNumber: string;
  lossType: string;
  causeOfLoss: string;
  jurisdiction: string;
  estimatedDurationHours: number;
  steps: WorkflowStep[];
  checklists: Checklist[];
  issuesToWatchFor: string[];
  notes: string;
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
    
    const payload = (await req.json()) as Payload;
    if (!payload?.claimId) throw new Error("claimId required");

    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    // 1) Get claim details with FNOL metadata
    const { data: claim, error: claimErr } = await sb
      .from("claims")
      .select("*")
      .eq("id", payload.claimId)
      .single();
    
    if (claimErr || !claim) throw new Error(`Claim not found: ${claimErr?.message}`);

    // 2) Prepare FNOL JSON for the prompt
    // Use the metadata if it exists (from FNOL extraction), otherwise construct basic structure
    const fnolJson = claim.metadata || {
      policyDetails: {
        claimNumber: claim.claim_number,
        policyNumber: claim.policy_number,
      },
      policyHolder: {
        insuredName: claim.insured_name,
      },
      lossDetails: {
        causeOfLoss: claim.cause_of_loss || "Property Damage",
        dateOfLoss: claim.loss_date,
        lossLocation: claim.loss_location,
        lossDescription: claim.loss_description,
      },
      carrierName: claim.carrier_name,
      adjustor: {
        adjustorAssigned: claim.adjuster_name,
        adjustorEmail: claim.adjuster_email,
        adjustorPhoneNumber: claim.adjuster_phone,
      }
    };

    // 3) Get workflow generation prompt
    const { data: promptData } = await sb
      .from("app_prompts")
      .select("template")
      .eq("key", "workflow_generate")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    // Comprehensive workflow generation prompt
    const defaultPrompt = `You are generating a complete field inspection workflow for an insurance adjuster, based on the structured First Notice of Loss (FNOL) data provided below.

### FNOL INPUT
{{FNOL_JSON}}

### OBJECTIVE
Create a detailed workflow in JSON form that guides the adjuster (and any supporting roles) from initial file review through field inspection and reporting. 
Each workflow must dynamically reflect:
- The **cause of loss**, **property type**, **jurisdiction**, and **reported damages**.
- Real-world field conditions, including weather verification, travel, PPE, safety, exterior–interior inspection order, data collection, and documentation.
- Additional context when provided (e.g., multiple structures, fences, trees, interior damage, vehicles).

---

### OUTPUT JSON SCHEMA
{
  "workflowName": "<auto-generate descriptive name, e.g., 'Hail Roof Inspection – PA – CLM-PA-2025-0429A'>",
  "claimNumber": "<from FNOL>",
  "lossType": "<e.g., Property Damage>",
  "causeOfLoss": "<from FNOL>",
  "jurisdiction": "<state abbreviation>",
  "estimatedDurationHours": "<integer>",
  "steps": [
    {
      "stepNumber": 1,
      "title": "<short descriptive action>",
      "objective": "<why this step is needed>",
      "requiredArtifacts": ["<required evidence or documentation>"],
      "assignedTo": "<role: FieldAdjuster | DeskReviewer | Vendor>",
      "status": "not_started",
      "estimatedTimeMinutes": "<integer or dynamic expression>",
      "dependencies": [<list of prior stepNumbers that must be completed>],
      "suggestedTools": ["<if applicable: ladders, drone, moisture meter, PPE, etc.>"],
      "notes": "<additional guidance>"
    }
  ],
  "checklists": [
    {
      "section": "<Inspection Area>",
      "items": ["<bullet item checks for that area>"]
    }
  ],
  "issuesToWatchFor": ["<potential fraud, safety, or compliance red flags>"],
  "notes": "<contextual reminders, forms, or jurisdictional caveats>"
}

---

### LOGIC RULES FOR WORKFLOW GENERATION

#### 1. UNIVERSAL PRE-INSPECTION PHASE
Always include:
- **Step 1: File Review & Weather Verification**
  - Confirm date/time of loss matches a legitimate event using NOAA or similar.
  - Required artifacts: weather report link or screenshot.
- **Step 2: Travel Planning**
  - Compute travel time dynamically from current device geolocation to the FNOL loss location.
  - Required artifacts: GPS route and ETA screenshot.
- **Step 3: Safety & PPE Setup**
  - Mandate PPE and hazard assessment.
  - Tools: hard hat, gloves, vest, harness if roof access needed.

#### 2. ON-SITE EXTERIOR INSPECTION SEQUENCE
Follow clockwise "walkaround" from the **front** of the structure.
Include these defaults:
- Front elevation, right side, rear, left side
- Roof, fencing, detached structures, trees, and utilities
- For catastrophe claims, add drone aerial if available.

If the FNOL cause of loss includes:
- **Wind or Hail:** add roof slope, shingle, gutter, fascia, and ridge checks.
- **Water:** add drainage, sump pump, grading, and basement perimeter.
- **Fire:** add electrical panel, attic, smoke pattern, and odor documentation.
- **Tree Impact:** add tree base, impact zone, debris path.
- **Vehicle Impact:** add collision point, vehicle tag/photo, structural alignment.
- **Catastrophe:** add catastrophe claim ID correlation, community photos, and mapping overlay.

#### 3. INTERIOR INSPECTION SEQUENCE
Include "Enter structure after exterior clearance."
Default order: entry → main level → upper level → attic → crawl/basement.
Checklist areas:
- Ceilings, walls, floors, windows, and attic framing.
- Use moisture meter or thermal camera when applicable.
- Document pre-existing vs. new damage separately.

#### 4. ADDITIONAL TASKS (DYNAMIC)
Add steps dynamically if indicated in FNOL:
- **Vehicles involved:** add vehicle inspection subworkflow.
- **Multiple structures:** add per-building sections.
- **Injuries or fire dept mention:** add official report retrieval step.
- **Agency or vendor names present:** include coordination step with their contact.

#### 5. POST-INSPECTION & REPORTING
Always include:
- **Interview Insured/Witness**
- **Compile Event Verification** (weather, police, or fire)
- **Estimate & Report Creation** (Xactimate or equivalent)
- **File Upload & QA Review**

#### 6. CHECKLIST ENRICHMENT
Generate checklist sections based on cause of loss and property area.
Examples:
- Roof Inspection
- Exterior Envelope
- Interior Damage
- Utilities & Systems
- Safety / PPE Compliance

#### 7. ISSUES TO WATCH FOR
Suggest potential red flags, such as:
- No supporting weather data
- Maintenance-related wear mistaken for storm damage
- Duplicate claims at same address
- Unsafe ladder or electrical hazards

#### 8. JURISDICTIONAL NUANCES
- **Texas (TX):** confirm wind/hail deductible disclosure, TWIA verification if coastal.
- **Tennessee (TN):** confirm state storm reporting and tree liability if neighboring property.
- **Connecticut (CT):** ensure license display for mitigation vendors.
- **Pennsylvania (PA):** verify public adjuster involvement disclosure.
- **Missouri (MO):** include catastrophe code linking for large events.

#### 9. DATA INTEGRITY
Ensure every step is well-labeled, has an objective, expected deliverables, and an estimated time.  
Prefer field realism over academic completeness.

#### 10. OUTPUT REQUIREMENTS
- Produce only valid JSON matching the schema.
- No markdown, commentary, or additional text.
- Use plain English for step titles and objectives.
- Include estimatedTimeMinutes for every step, typically totaling 3–6 hours.
- For travel time, use a dynamic expression: "auto:device_distance".

---

### EXAMPLES OF STANDARD STEPS TO INCORPORATE (ADAPT PER FNOL)
1. Pre-Trip Weather Verification  
2. Travel to Site  
3. Safety & PPE Check  
4. Exterior Walk-Around (start front, move clockwise)  
5. Roof Inspection  
6. Outbuildings / Fence / Tree Assessment (if applicable)  
7. Interior Inspection (room-by-room)  
8. Interview Insured or Reporter  
9. Event Verification (Weather, Police, Fire)  
10. Estimate & Report Preparation  
11. Upload & QA Review  

---

### OUTPUT STYLE
Return a single JSON object following the schema exactly.
If information is ambiguous, fill fields with your best professional inference rather than leaving them blank.`;

    const promptTemplate = promptData?.template || defaultPrompt;
    
    // Replace placeholder with actual FNOL JSON
    const workflowPrompt = promptTemplate.replace('{{FNOL_JSON}}', JSON.stringify(fnolJson, null, 2));

    // 4) Call OpenAI with comprehensive prompt
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
    let workflow: GeneratedWorkflow;
    try {
      workflow = JSON.parse(raw);
    } catch (e) {
      throw new Error(`Failed to parse JSON: ${e.message}`);
    }

    if (!workflow.steps || workflow.steps.length === 0) {
      throw new Error("No workflow steps generated");
    }

    // 6) Save workflow metadata to claim
    const workflowMetadata = {
      workflowName: workflow.workflowName,
      estimatedDurationHours: workflow.estimatedDurationHours,
      checklists: workflow.checklists,
      issuesToWatchFor: workflow.issuesToWatchFor,
      notes: workflow.notes,
      generatedAt: new Date().toISOString()
    };

    await sb
      .from("claims")
      .update({ 
        workflow_metadata: workflowMetadata,
        status: "in_progress" 
      })
      .eq("id", payload.claimId);

    // 7) Save steps to inspection_steps table
    const stepsToInsert = workflow.steps.map((step) => ({
      claim_id: payload.claimId,
      title: step.title,
      kind: determineStepKind(step),
      instructions: [
        step.objective,
        ...(step.requiredArtifacts ? [`Required: ${step.requiredArtifacts.join(", ")}`] : []),
        ...(step.suggestedTools ? [`Tools: ${step.suggestedTools.join(", ")}`] : []),
        ...(step.notes ? [step.notes] : [])
      ],
      evidence_rules: {
        requiredArtifacts: step.requiredArtifacts,
        assignedTo: step.assignedTo,
        dependencies: step.dependencies
      },
      validation: {
        suggestedTools: step.suggestedTools,
        estimatedTimeMinutes: step.estimatedTimeMinutes
      },
      next_steps: step.dependencies.map(d => `step_${d}`),
      step_order: step.stepNumber,
      status: "pending",
      orig_id: `step_${step.stepNumber}`,
    }));

    const { error: insertError } = await sb
      .from("inspection_steps")
      .insert(stepsToInsert);

    if (insertError) throw new Error(`Failed to save steps: ${insertError.message}`);

    return new Response(
      JSON.stringify({ 
        ok: true, 
        workflow,
        stepsGenerated: workflow.steps.length,
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

// Helper function to determine step kind based on title and content
function determineStepKind(step: WorkflowStep): string {
  const title = step.title.toLowerCase();
  
  if (title.includes("photo") || title.includes("document")) return "photo";
  if (title.includes("interview") || title.includes("note")) return "note";
  if (title.includes("measure") || title.includes("dimension")) return "measure";
  if (title.includes("scan") || title.includes("3d")) return "scan";
  if (title.includes("upload") || title.includes("file")) return "doc";
  
  // Default based on artifacts
  if (step.requiredArtifacts?.some(a => a.toLowerCase().includes("photo"))) return "photo";
  if (step.requiredArtifacts?.some(a => a.toLowerCase().includes("report"))) return "doc";
  
  return "note"; // Default
}