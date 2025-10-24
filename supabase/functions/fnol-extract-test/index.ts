// Minimal test function to isolate the issue
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  console.log("=== TEST FUNCTION STARTED ===");
  
  try {
    const payload = await req.json();
    console.log("Payload:", payload);
    
    return new Response(JSON.stringify({
      success: true,
      message: "Test successful",
      payload
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});

