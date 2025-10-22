// supabase/functions/daily-optimize/index.ts
// Generates AI-powered daily optimization plans for adjusters
// Uses GPT-4 to analyze claims, weather, locations, and priorities

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  userId: string;
  date?: string; // YYYY-MM-DD, defaults to today
}

interface ClaimWithDetails {
  id: string;
  claim_number: string;
  loss_type: string;
  priority_score: number;
  sla_deadline: string;
  estimated_duration_minutes: number;
  coordinates: { lat: number; lng: number };
  loss_location: string;
  insured_name: string;
  status: string;
  workflow_started_at: string | null;
  scheduled_time: string | null;
  weather_risk: string | null;
  inspection_steps?: Array<{
    title: string;
    status: string;
    is_critical: boolean;
  }>;
}

interface WeatherCondition {
  location: string;
  temperature: number;
  condition: string;
  windSpeed: number;
  precipitation: number;
  visibility: number;
  timeWindow: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");

    const payload = (await req.json()) as Payload;
    if (!payload?.userId) throw new Error("userId required");

    const targetDate = payload.date || new Date().toISOString().split('T')[0];

    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    // 1. Get all active claims for this user
    const { data: claims, error: claimsErr } = await sb
      .from("claims")
      .select(`
        *,
        inspection_steps (
          title,
          status,
          is_critical,
          estimated_minutes
        )
      `)
      .eq("user_id", payload.userId)
      .in("status", ["open", "in_progress"])
      .order("priority_score", { ascending: false });

    if (claimsErr) throw new Error(`Failed to fetch claims: ${claimsErr.message}`);
    if (!claims || claims.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No active claims found",
          optimization: null 
        }),
        { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // 2. Get weather forecasts for claim locations
    const weatherPromises = claims.map(async (claim) => {
      if (!claim.coordinates) return null;
      
      // Call weather API or use cached data
      // For now, we'll simulate weather data
      return {
        claimId: claim.id,
        weather: {
          morning: { safe: true, condition: "Clear", temp: 72 },
          afternoon: { safe: true, condition: "Partly Cloudy", temp: 85 },
          evening: { safe: false, condition: "Rain", temp: 68 }
        }
      };
    });

    const weatherData = await Promise.all(weatherPromises);

    // 3. Prepare data for GPT-4
    const claimsSummary = claims.map(claim => ({
      claim_number: claim.claim_number,
      priority_score: claim.priority_score,
      sla_deadline: claim.sla_deadline,
      loss_type: claim.loss_type,
      location: claim.loss_location,
      coordinates: claim.coordinates,
      estimated_duration: claim.estimated_duration_minutes || 60,
      insured: claim.insured_name,
      status: claim.status,
      steps_remaining: claim.inspection_steps?.filter((s: any) => s.status !== 'completed').length || 0,
      critical_steps: claim.inspection_steps?.filter((s: any) => s.is_critical && s.status !== 'completed').length || 0,
      time_since_start: claim.workflow_started_at 
        ? Math.floor((Date.now() - new Date(claim.workflow_started_at).getTime()) / (1000 * 60 * 60))
        : null
    }));

    // 4. Get daily optimization prompt (SINGLE PROMPT)
    const { data: promptData } = await sb
      .from("app_prompts")
      .select("template")
      .eq("key", "daily_optimize")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    // Default single prompt combining instructions and task
    const defaultPrompt = `You are an AI assistant optimizing daily schedules for insurance adjusters.

Analyze claims data, weather conditions, and travel distances to create an efficient daily plan for ${targetDate}.

Claims to schedule:
${JSON.stringify(claimsSummary, null, 2)}

Weather conditions by location:
${JSON.stringify(weatherData, null, 2)}

Consider:
1. SLA deadlines and priority scores
2. Geographic clustering to minimize travel
3. Weather windows for outdoor work
4. Estimated duration for each inspection
5. Critical steps that must be completed today

Optimize for:
- Meeting all SLA requirements
- Minimizing travel time between locations
- Working during safe weather conditions
- Completing high-priority claims first
- Balancing workload throughout the day

Return a JSON response with:
{
  "daily_brief": "Executive summary of the day's plan",
  "optimized_route": ["claim_id1", "claim_id2", ...] in optimal visit order,
  "time_blocks": [
    {
      "start_time": "08:00",
      "end_time": "09:30",
      "claim_id": "claim_id",
      "activity": "activity description",
      "travel_minutes": 15,
      "notes": "specific considerations"
    }
  ],
  "weather_windows": {
    "best_times": ["08:00-12:00", "14:00-16:00"],
    "avoid_times": ["17:00-18:00"],
    "reason": "explanation"
  },
  "risk_alerts": ["potential issue 1", "potential issue 2"],
  "recommendations": ["actionable advice 1", "actionable advice 2"],
  "efficiency_score": 85
}

Provide a practical, actionable daily plan that maximizes efficiency while ensuring safety and quality.`;

    const optimizationPrompt = promptData?.template || defaultPrompt;

    // 5. Call OpenAI API with SINGLE prompt
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "user", content: optimizationPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`OpenAI API failed: ${errorText}`);
    }

    const aiResponse = await res.json();
    const optimization = JSON.parse(aiResponse.choices[0].message.content);

    // 6. Calculate metrics
    const totalClaims = claims.length;
    const totalTravelTime = optimization.time_blocks?.reduce((acc: number, block: any) => {
      return acc + (block.travel_minutes || 0);
    }, 0) || 0;
    const totalInspectionTime = claims.reduce((acc, claim) => {
      return acc + (claim.estimated_duration_minutes || 60);
    }, 0);

    // 7. Save optimization to database
    const { data: saved, error: saveErr } = await sb
      .from("daily_optimizations")
      .upsert({
        user_id: payload.userId,
        optimization_date: targetDate,
        daily_brief: optimization.daily_brief,
        optimized_route: optimization.optimized_route,
        time_blocks: optimization.time_blocks,
        weather_windows: optimization.weather_windows,
        risk_alerts: optimization.risk_alerts,
        recommendations: optimization.recommendations,
        total_claims: totalClaims,
        total_travel_time_minutes: totalTravelTime,
        total_inspection_time_minutes: totalInspectionTime,
        efficiency_score: optimization.efficiency_score || 75,
      }, {
        onConflict: 'user_id,optimization_date'
      })
      .select()
      .single();

    if (saveErr) throw new Error(`Failed to save optimization: ${saveErr.message}`);

    // 8. Update claims with optimized schedule
    if (optimization.optimized_route && optimization.time_blocks) {
      for (let i = 0; i < optimization.optimized_route.length; i++) {
        const claimId = optimization.optimized_route[i];
        const timeBlock = optimization.time_blocks.find((tb: any) => tb.claim_id === claimId);
        
        if (timeBlock) {
          await sb
            .from("claims")
            .update({
              scheduled_date: targetDate,
              scheduled_time: timeBlock.start_time,
              visit_order: i + 1,
            })
            .eq("id", claimId);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        optimization: saved,
        claims_scheduled: optimization.optimized_route?.length || 0,
      }),
      { 
        status: 200, 
        headers: { ...CORS, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("Daily optimization error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...CORS, "Content-Type": "application/json" } 
      }
    );
  }
});