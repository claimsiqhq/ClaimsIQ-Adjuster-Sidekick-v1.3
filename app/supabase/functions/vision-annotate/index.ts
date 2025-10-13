// supabase/functions/vision-annotate/index.ts
// Deno (Supabase Edge Functions). Uses OpenAI Vision to annotate an image and writes back to public.media
// Set secrets: OPENAI_API_KEY in Supabase dashboard (Project Settings -> Functions -> Secrets)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type Payload = {
  mediaId: string;          // UUID of row in public.media
  path?: string | null;     // optional storage path (media/<file>.jpg). If not provided, we read row.storage_path
  sceneTags?: string[];     // optional hints (e.g., ["roof exterior"])
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
  photo_qc: {
    blur_score?: number;
    glare?: boolean;
    underexposed?: boolean;
    distance_hint_m?: number;
  };
  model: { name: string; ts: string };
};

const openaiKey = Deno.env.get("OPENAI_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!; // publishable or anon is fine for RLS-scoped ops

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!openaiKey) throw new Error("OPENAI_API_KEY not set");

    const payload = (await req.json()) as Payload;
    if (!payload?.mediaId) throw new Error("mediaId required");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    // Fetch media row
    const { data: row, error: rowErr } = await supabase
      .from("media")
      .select("*")
      .eq("id", payload.mediaId)
      .single();

    if (rowErr || !row) throw new Error(`media row not found: ${rowErr?.message}`);

    const storage_path = payload.path ?? row.storage_path;
    if (!storage_path) throw new Error("storage_path missing");

    // Get a public URL or a signed URL to pass to OpenAI
    const { data: pub } = supabase.storage.from("media").getPublicUrl(storage_path);
    const imageUrl = pub?.publicUrl;
    if (!imageUrl) throw new Error("failed to resolve public URL");

    // Call OpenAI Vision (JSON responses + structured schema prompt)
    // You can tweak this prompt as you like. Keep it small; models enforce output tokens.
    const system = `You are a property damage assessor. 
Return strict JSON with detections[] (bbox or polygon with RELATIVE 0..1 coords),
photo_qc{}, and model info. Prefer few precise detections over many noisy ones.`;

    const user = `
Task: detect damage/issues/safety concerns. Scene tags: ${(payload.sceneTags ?? []).join(", ") || "none"}.
Output schema:
{
  "detections":[
    {"id":"...", "label":"granule_loss","friendly":"Granule loss","severity":"moderate","confidence":0.86,
     "evidence":"...", "tags":["roof","hail"], "shape":{"type":"bbox","box":{"x":0.1,"y":0.2,"w":0.3,"h":0.25}}}
  ],
  "photo_qc":{"blur_score":0.12,"glare":false,"underexposed":false,"distance_hint_m":2.5},
  "model":{"name":"openai-vision","ts":"<iso timestamp>"}
}
If nothing found, return empty detections[]. JSON ONLY.
Image URL: ${imageUrl}
`;

    // Minimal fetch against OpenAI responses endpoint
    // Using gpt-4o-mini as a capable, fast vision model name (adjust per your account)
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "input_text", text: user },
              { type: "input_image", image_url: imageUrl },
            ],
          },
        ],
        // ask for JSON mode to increase compliance
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`OpenAI error: ${msg}`);
    }

    const out = await res.json();
    // Extract JSON content (depends on Responses API shape)
    const content = out?.output?.[0]?.content?.[0]?.text ?? out?.output_text ?? "";
    if (!content) throw new Error("Empty model output");

    let parsed: AnnotationJSON;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try to extract JSON if model wrapped it in prose
      const match = content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { detections: [], photo_qc: {}, model: { name: "openai-vision", ts: new Date().toISOString() } };
    }

    // Ensure fields present
    parsed.model = parsed.model ?? { name: "openai-vision", ts: new Date().toISOString() };
    if (!Array.isArray(parsed.detections)) parsed.detections = [];

    // Write back to media row
    const { error: upErr } = await supabase
      .from("media")
      .update({
        status: "done",
        annotation_json: parsed,
        anno_count: parsed.detections.length,
        qc: parsed.photo_qc ?? {},
      })
      .eq("id", payload.mediaId);

    if (upErr) throw upErr;

    return new Response(JSON.stringify({ ok: true, anno_count: parsed.detections.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
