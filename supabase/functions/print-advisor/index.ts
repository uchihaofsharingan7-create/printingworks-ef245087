import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are PrintQueue's friendly 3D printing advisor. Help users choose the right printer and filament for their project.

Available printers:
1. Ender 3 Pro — Most affordable, 220×220×250mm build volume, slower but reliable. Best for beginners and budget prints. Time rate: $0.009/min, PLA: $0.025/g, PETG: $0.035/g.
2. Adventure 5M Pro — High-speed printing, 220×220×220mm build volume. Great for fast turnaround. Time rate: $0.014/min, PLA: $0.025/g, PETG: $0.035/g.
3. Adventure 4 Pro — Industrial grade, 220×220×250mm build volume. Best quality and durability. Time rate: $0.05/min (PLA) or $0.08/min (PETG), PLA: $0.025/g, PETG: $0.035/g.

Available filaments:
- PLA: Standard, easy to print, good for decorative items, prototypes, and general use. Biodegradable.
- PETG: Strong, heat resistant, good for functional parts, outdoor use, and items that need durability.

Base cost for all prints: $2.00

Guidelines:
- Ask what the user wants to print and its purpose
- Recommend the best printer+filament combo based on their needs
- Consider budget, speed, strength, and finish quality
- Keep responses concise and helpful (2-4 sentences max)
- Use casual, friendly tone
- If asked about something unrelated to 3D printing, gently redirect`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("print-advisor error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
