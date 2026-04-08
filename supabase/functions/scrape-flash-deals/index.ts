import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    const targetUrl = url || "https://cashkaro.com/flash-deals";

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Scrape the CashKaro flash deals page
    const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: targetUrl,
        formats: ["markdown", "links"],
        onlyMainContent: true,
        waitFor: 5000,
      }),
    });

    const scrapeData = await scrapeResp.json();
    const markdown = scrapeData?.data?.markdown || scrapeData?.markdown || "";
    const links = scrapeData?.data?.links || scrapeData?.links || [];

    if (!markdown) {
      return new Response(
        JSON.stringify({ success: false, error: "Could not scrape page content" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use AI to extract structured deal data from the page
    const aiResp = await fetch(
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
            {
              role: "system",
              content:
                "You are a data extraction specialist. Extract all flash deal information from web page content. Be thorough and extract every deal you find.",
            },
            {
              role: "user",
              content: `Extract all flash deals from this CashKaro page content. For each deal, extract as much info as possible.

PAGE CONTENT:
${markdown.slice(0, 15000)}

LINKS FOUND ON PAGE:
${links.slice(0, 100).join("\n")}

Use the extract_deals tool to return the structured data.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_deals",
                description: "Extract all flash deals from the page",
                parameters: {
                  type: "object",
                  properties: {
                    deals: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          deal_name: { type: "string", description: "Product/deal name" },
                          partner_site: { type: "string", description: "Partner website name (e.g. Hyugalife, Amazon, Flipkart)" },
                          cashkaro_url: { type: "string", description: "CashKaro offer page URL" },
                          partner_url: { type: "string", description: "Partner site product URL if found" },
                          expected_price: { type: "number", description: "Effective/final price claimed by CashKaro" },
                          original_price: { type: "number", description: "Original MRP/price before discount" },
                          coupon_code: { type: "string", description: "Coupon code if mentioned" },
                          cashback_percent: { type: "number", description: "Cashback percentage" },
                          freebie: { type: "string", description: "Any freebie mentioned" },
                          expiry: { type: "string", description: "Deal expiry if mentioned" },
                        },
                        required: ["deal_name", "expected_price"],
                      },
                    },
                    total_found: { type: "number" },
                    page_title: { type: "string" },
                  },
                  required: ["deals", "total_found"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "extract_deals" } },
        }),
      }
    );

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI error:", aiResp.status, errText);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI extraction failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI did not return structured result" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, ...extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("scrape-flash-deals error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
