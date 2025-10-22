// supabase/functions/vision-annotate/index.ts
// Annotates photos with damage detection using OpenAI Vision
// Secrets required: OPENAI_API_KEY

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type Payload = {
  mediaId: string;
  path?: string | null;
  sceneTags?: string[];
};

type Detection = {
  id: string;
  label: string;
  friendly?: string;
  severity?: "minor" | "moderate" | "severe" | "uncertain";
  confidence?: number;
  evidence?: string;
  tags?: string[];
  shape:
    | { type: "bbox"; box: { x: number; y: number; w: number; h: number } }
    | { type: "polygon"; points: [number, number][] };
};

type AnnotationJSON = {
  detections: Detection[];
  photo_qc?: { blur_score?: number; glare?: boolean; underexposed?: boolean; distance_hint_m?: number };
  model?: { name: string; ts: string };
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
    if (!payload?.mediaId) throw new Error("mediaId required");

    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    // 1) Media row + public URL
    const { data: media, error: mErr } = await sb.from("media").select("*").eq("id", payload.mediaId).single();
    if (mErr || !media) throw new Error(`media not found: ${mErr?.message}`);
    const storage_path: string | null = payload.path ?? media.storage_path;
    if (!storage_path) throw new Error("storage_path missing for media");

    const { data: pub } = sb.storage.from("media").getPublicUrl(storage_path);
    const IMAGE_URL = pub?.publicUrl;
    if (!IMAGE_URL) throw new Error("failed to get public URL");

    // 2) Get active prompt (SINGLE PROMPT)
    const { data: promptData } = await sb
      .from("app_prompts")
      .select("template")
      .eq("key", "vision_annotate")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    // Get vision settings
    const { data: sRow } = await sb
      .from("app_settings")
      .select("value")
      .eq("key", "vision_annotate")
      .limit(1)
      .maybeSingle();

    const settings = (sRow?.value ?? {
      model: "gpt-4o-mini",
      response_format: "json_object",
      min_confidence: 0.35,
      max_detections: 25,
    }) as Record<string, any>;

    const SCENE_TAGS = (payload.sceneTags ?? []).join(", ") || "none";

    // Default single prompt combining instructions and task
    const defaultPrompt = `You are a senior property damage assessor analyzing an insurance claim photo.

Scene context: {{SCENE_TAGS}}

Analyze this image for all damage, safety concerns, and notable issues. Return STRICT JSON format:

{
  "detections": [
    {
      "id": "unique_identifier",
      "label": "damage_type", 
      "friendly": "user-friendly description",
      "severity": "minor|moderate|severe|uncertain",
      "confidence": 0.0-1.0,
      "evidence": "visual evidence supporting this detection",
      "tags": ["relevant", "descriptive", "tags"],
      "shape": {
        "type": "bbox",
        "box": {"x": 0.0-1.0, "y": 0.0-1.0, "w": 0.0-1.0, "h": 0.0-1.0}
      }
    }
  ],
  "photo_qc": {
    "blur_score": 0.0-1.0,
    "glare": true/false,
    "underexposed": true/false,
    "distance_hint_m": estimated_distance
  },
  "model": {
    "name": "model_name",
    "ts": "ISO_timestamp"
  }
}

Be thorough - identify ALL visible damage and issues. Return JSON ONLY, no explanatory text.`;

    const promptTemplate = promptData?.template ?? defaultPrompt;
    const annotationPrompt = render(promptTemplate, { IMAGE_URL, SCENE_TAGS });

    // 3) Call OpenAI Vision API with SINGLE prompt
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: settings.model ?? "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: annotationPrompt },
              { type: "image_url", image_url: { url: IMAGE_URL } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
    
    if (!res.ok) throw new Error(await res.text());
    const out = await res.json();
    const raw = out?.choices?.[0]?.message?.content ?? "";
    if (!raw) throw new Error("Empty model output");

    let parsed: AnnotationJSON;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { detections: [], photo_qc: {}, model: { name: String(settings.model ?? "gpt-4o-mini"), ts: new Date().toISOString() } };
    }

    parsed.model = parsed.model ?? { name: String(settings.model ?? "gpt-4o-mini"), ts: new Date().toISOString() };
    if (!Array.isArray(parsed.detections)) parsed.detections = [];

    const minConf = typeof settings.min_confidence === "number" ? settings.min_confidence : 0;
    const maxDet = typeof settings.max_detections === "number" ? settings.max_detections : 999;

    parsed.detections = parsed.detections
      .filter((d) => (typeof d.confidence !== "number" ? true : d.confidence >= minConf))
      .slice(0, maxDet);

    // 4) Write results
    const { error: upErr } = await sb
      .from("media")
      .update({
        status: "done",
        annotation_json: parsed,
        anno_count: parsed.detections.length,
        qc: parsed.photo_qc ?? {},
        last_error: null,
      })
      .eq("id", payload.mediaId);
    if (upErr) throw upErr;

    return new Response(JSON.stringify({ ok: true, anno_count: parsed.detections.length }), {
      headers: { ...CORS, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    console.error("Vision annotation error:", e);
    
    // Try to update media with error status
    try {
      const payload = await req.json().catch(() => ({ mediaId: null }));
      if (payload?.mediaId) {
        const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        await sb
          .from("media")
          .update({
            status: "error",
            last_error: e?.message || String(e),
          })
          .eq("id", payload.mediaId);
      }
    } catch (updateError) {
      console.error("Failed to update error status:", updateError);
    }
    
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      headers: { ...CORS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});