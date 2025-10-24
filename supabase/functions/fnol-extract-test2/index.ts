// Test with Supabase client import
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req) => {
  console.log("=== TEST WITH SUPABASE CLIENT ===");
  
  try {
    const payload = await req.json();
    console.log("Payload:", payload);
    
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    console.log("Supabase client created");
    
    const { data, error } = await sb.from('documents').select('id').limit(1);
    console.log("Query result:", data, error);
    
    return new Response(JSON.stringify({
      success: true,
      hasClient: !!sb,
      documentCount: data?.length || 0
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});

