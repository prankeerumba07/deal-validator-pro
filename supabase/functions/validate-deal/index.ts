import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    const { dealId, cashkaroUrl, partnerUrl } = await req.json();
    if (!dealId) {
      return new Response(JSON.stringify({ error: "dealId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the deal from DB
    const { data: deal, error: dealErr } = await supabase
      .from("deals")
      .select("*")
      .eq("id", dealId)
      .single();
    if (dealErr || !deal) {
      return new Response(JSON.stringify({ error: "Deal not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ckUrl = cashkaroUrl || deal.cashkaro_url;
    const pUrl = partnerUrl || deal.product_url;

    // Scrape both pages in parallel using Firecrawl
    const scrapeUrl = async (url: string) => {
      const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          formats: ["markdown"],
          onlyMainContent: true,
          waitFor: 3000,
        }),
      });
      const d = await resp.json();
      return d?.data?.markdown || d?.markdown || "";
    };

    const [cashkaroContent, partnerContent] = await Promise.all([
      ckUrl ? scrapeUrl(ckUrl) : Promise.resolve(""),
      scrapeUrl(pUrl),
    ]);

    // Use AI to extract and validate deal data
    const aiPrompt = `You are a Flash Deal validator for CashKaro. Analyze the following scraped page content and validate the deal.

DEAL EXPECTATIONS FROM DATABASE:
- Deal Name: ${deal.deal_name}
- Expected Price: ₹${deal.expected_price}
- Coupon Code: ${deal.coupon_code || "None"}
- Expected Cashback: ${deal.expected_cashback}%
- Expected Freebie: ${deal.expected_freebie || "None"}
- Partner Site: ${deal.partner_site}

${ckUrl ? `CASHKARO OFFER PAGE CONTENT:
${cashkaroContent.slice(0, 8000)}` : "No CashKaro page provided."}

PARTNER SITE PRODUCT PAGE CONTENT:
${partnerContent.slice(0, 8000)}

VALIDATION TASKS:
1. Extract the actual product name from the partner site
2. Extract the actual price (current/discounted price) from the partner site
3. Check if the product appears to be in stock
4. If a coupon code was mentioned, check if the page mentions it or any coupon-related info
5. Check if any freebie is mentioned
6. Compare CashKaro claimed price vs actual partner site price
7. Identify any price mismatch, coupon issues, or missing offers

Return your analysis using the validate_deal_result tool.`;

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
                "You are a precise deal validation AI. Extract exact prices and product details. Be strict about mismatches.",
            },
            { role: "user", content: aiPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "validate_deal_result",
                description: "Submit the deal validation results",
                parameters: {
                  type: "object",
                  properties: {
                    product_name_match: {
                      type: "boolean",
                      description: "Whether the product name on partner site matches the deal",
                    },
                    extracted_product_name: {
                      type: "string",
                      description: "Product name found on partner site",
                    },
                    actual_price: {
                      type: "number",
                      description: "Actual current price on partner site in INR",
                    },
                    original_price: {
                      type: "number",
                      description: "Original/MRP price before discounts",
                    },
                    discount_amount: {
                      type: "number",
                      description: "Discount amount applied",
                    },
                    coupon_status: {
                      type: "string",
                      enum: ["working", "failed", "not_applied", "not_found", "expired"],
                      description: "Status of coupon code",
                    },
                    coupon_details: {
                      type: "string",
                      description: "Details about coupon validation",
                    },
                    freebie_status: {
                      type: "string",
                      enum: ["available", "not_available", "not_checked"],
                    },
                    stock_status: {
                      type: "string",
                      enum: ["in_stock", "out_of_stock", "limited"],
                    },
                    cashback_valid: {
                      type: "boolean",
                      description: "Whether cashback percentage appears correct",
                    },
                    final_status: {
                      type: "string",
                      enum: ["valid", "invalid"],
                    },
                    errors: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          error_type: {
                            type: "string",
                            enum: [
                              "price_mismatch",
                              "coupon_failed",
                              "coupon_expired",
                              "product_mismatch",
                              "missing_discount",
                              "cashback_mismatch",
                              "freebie_missing",
                              "out_of_stock",
                              "final_price_mismatch",
                            ],
                          },
                          expected: { type: "string" },
                          actual: { type: "string" },
                          description: { type: "string" },
                        },
                        required: ["error_type", "description"],
                      },
                    },
                    summary: {
                      type: "string",
                      description: "Brief human-readable summary of validation",
                    },
                  },
                  required: [
                    "actual_price",
                    "coupon_status",
                    "freebie_status",
                    "stock_status",
                    "final_status",
                    "errors",
                    "summary",
                  ],
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "validate_deal_result" },
          },
        }),
      }
    );

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI error:", aiResp.status, errText);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI validation failed" }), {
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

    const result = JSON.parse(toolCall.function.arguments);
    const now = new Date().toISOString();
    const runId = `RUN-${Date.now()}`;

    // Build reasons array from errors
    const reasons = result.errors.map(
      (e: any) =>
        `[${e.error_type}] ${e.description}${e.expected ? ` (expected: ${e.expected}, actual: ${e.actual})` : ""}`
    );

    // Insert validation result
    await supabase.from("validation_results").insert({
      deal_id: dealId,
      actual_price: result.actual_price,
      coupon_status: result.coupon_status,
      freebie_status: result.freebie_status,
      stock_status: result.stock_status,
      final_status: result.final_status,
      reason: reasons.length > 0 ? reasons : [result.summary],
    });

    // Update deal status
    await supabase
      .from("deals")
      .update({ status: result.final_status, last_checked_at: now })
      .eq("id", dealId);

    // Insert validation log
    await supabase.from("validation_logs").insert({
      deal_id: dealId,
      status: result.final_status,
      message: result.summary,
      run_id: runId,
    });

    // Create alerts for errors
    if (result.errors.length > 0) {
      const alertInserts = result.errors.map((e: any) => ({
        deal_id: dealId,
        alert_type: e.error_type,
        description: `${e.description}${e.expected ? ` | Expected: ${e.expected} | Actual: ${e.actual}` : ""}`,
        priority: ["price_mismatch", "final_price_mismatch", "out_of_stock"].includes(e.error_type)
          ? "high"
          : "medium",
      }));
      await supabase.from("alerts").insert(alertInserts);
    }

    return new Response(
      JSON.stringify({
        success: true,
        result: {
          ...result,
          reasons,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("validate-deal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
