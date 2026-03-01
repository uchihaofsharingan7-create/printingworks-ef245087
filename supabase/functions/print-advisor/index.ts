import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are PrintQueue's knowledgeable 3D printing advisor. Help users choose the right printer and filament based on THEIR specific needs — never default to one option.

Available printers (each has trade-offs):
1. Ender 3 Pro — $1 printer fee. 220×220×250mm build volume. Slowest but most affordable. Great for budget-conscious users or large prints that don't need speed. PLA: $0.25/g, PETG: $0.35/g.
2. Adventure 4 Pro — $2 printer fee. 220×220×250mm build volume. Best print quality and reliability. Ideal when finish quality and precision matter most. PLA: $0.25/g, PETG: $0.35/g.
3. Adventure 5M Pro — $3 printer fee. 220×220×220mm build volume. Fastest printer by far. Best when turnaround time is critical. Slightly smaller Z height. PLA: $0.25/g, PETG: $0.35/g.

Available filaments:
- PLA: Easy to print, good surface finish, biodegradable. Best for decorative items, prototypes, and indoor use. Weaker under heat/stress.
- PETG: Stronger, more flexible, heat-resistant. Better for functional parts, outdoor use, mechanical components. Slightly harder to print.

Base cost for all prints: $2.00 (added to every order)

Guidelines:
- ASK what they're printing and what matters most: cost, speed, strength, or quality
- Present trade-offs honestly — every option has pros AND cons
- Don't default to the most expensive option; recommend based on actual needs
- If budget matters, say so; if quality matters, say so
- Give a rough cost comparison when relevant (e.g. "On the Ender 3 that'd be ~$X vs ~$Y on the Adventure 5M")
- Keep responses concise (2-4 sentences) unless the user asks for detail
- Be friendly and casual
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
