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
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: deal, error: dealErr } = await supabase
      .from("deals").select("*").eq("id", dealId).single();
    if (dealErr || !deal) {
      return new Response(JSON.stringify({ error: "Deal not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ckUrl = cashkaroUrl || deal.cashkaro_url;
    const pUrl = partnerUrl || deal.product_url;

    const stageResults: Array<{ stage: string; status: string; message: string }> = [];
    const addStage = (stage: string, status: string, message: string) => {
      stageResults.push({ stage, status, message });
    };

    // Scrape pages
    const scrapeUrl = async (url: string) => {
      const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, waitFor: 3000 }),
      });
      const d = await resp.json();
      return d?.data?.markdown || d?.markdown || "";
    };

    let cashkaroContent = "";
    let partnerContent = "";

    // Stage 1: Load offer page
    if (ckUrl) {
      try {
        cashkaroContent = await scrapeUrl(ckUrl);
        addStage("load_offer", cashkaroContent ? "pass" : "fail", cashkaroContent ? "Offer page loaded" : "Failed to load offer page");
      } catch (e) {
        addStage("load_offer", "fail", `Error: ${e instanceof Error ? e.message : "unknown"}`);
      }
    } else {
      addStage("load_offer", "skipped", "No CashKaro URL provided");
    }

    // Stage 2: Extract metadata
    addStage("extract_metadata", cashkaroContent ? "pass" : "skipped", cashkaroContent ? "Metadata extraction ready" : "Skipped - no offer content");

    // Stage 3: Load partner page
    try {
      partnerContent = await scrapeUrl(pUrl);
      addStage("load_partner", partnerContent ? "pass" : "fail", partnerContent ? "Partner page loaded" : "Failed to load partner page");
    } catch (e) {
      addStage("load_partner", "fail", `Error: ${e instanceof Error ? e.message : "unknown"}`);
    }

    if (!partnerContent) {
      // Cannot proceed without partner content
      const failResult = {
        deal_id: dealId,
        actual_price: null,
        coupon_status: "not_applied",
        freebie_status: "not_checked",
        stock_status: "in_stock",
        final_status: "invalid",
        confidence_score: 0,
        error_type: "PAGE_LOAD_TIMEOUT",
        severity: "HIGH",
        stage_results: stageResults,
        reason: ["[PAGE_LOAD_TIMEOUT] Could not load partner page"],
      };
      await supabase.from("validation_results").insert(failResult);
      await supabase.from("deals").update({ status: "invalid", last_checked_at: new Date().toISOString() }).eq("id", dealId);
      return new Response(JSON.stringify({ success: true, result: failResult }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // AI validation with enhanced tool schema
    const aiPrompt = `You are a Flash Deal validator for CashKaro. Analyze the scraped content and validate this deal.

DEAL DATA:
- Deal Name: ${deal.deal_name}
- MRP: ₹${deal.mrp || deal.expected_price}
- Partner Sale Price: ₹${deal.partner_sale_price || deal.expected_price}
- Coupon Code: ${deal.coupon_code || "None"}
- Coupon Discount Expected: ₹${deal.coupon_discount || 0}
- Prepay Discount Expected: ₹${deal.prepay_discount || 0}
- Expected Payable: ₹${deal.expected_payable || deal.expected_price}
- Cashback %: ${deal.expected_cashback}%
- Effective Price Claimed: ₹${deal.effective_price_claimed || 0}
- Expected Freebie: ${deal.expected_freebie || "None"}
- Partner Site: ${deal.partner_site}

${ckUrl ? `CASHKARO OFFER PAGE:\n${cashkaroContent.slice(0, 8000)}` : "No CashKaro page."}

PARTNER SITE PAGE:
${partnerContent.slice(0, 8000)}

VALIDATION TASKS:
1. Extract actual product name and verify match
2. Extract actual price (current/sale price) from partner
3. Check stock status
4. Check if coupon code is mentioned/valid
5. Check for any freebie mentions
6. Compare expected vs actual prices at each stage
7. Calculate confidence score (0-100)
8. Determine primary error type and severity
9. Provide AI analysis summary

Return results using the validate_deal_result tool.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a precise deal validation AI for CashKaro. Extract exact prices and validate thoroughly." },
          { role: "user", content: aiPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "validate_deal_result",
            description: "Submit deal validation results",
            parameters: {
              type: "object",
              properties: {
                actual_price: { type: "number", description: "Actual current price on partner site in INR" },
                actual_post_coupon: { type: "number", description: "Price after coupon applied (null if no coupon)" },
                actual_final: { type: "number", description: "Final payable amount after all discounts" },
                coupon_status: { type: "string", enum: ["working", "failed", "not_applied", "not_found", "expired"] },
                freebie_status: { type: "string", enum: ["available", "not_available", "not_checked"] },
                stock_status: { type: "string", enum: ["in_stock", "out_of_stock", "limited"] },
                final_status: { type: "string", enum: ["valid", "invalid"] },
                confidence_score: { type: "number", description: "0-100 confidence in the validation" },
                error_type: {
                  type: "string",
                  enum: ["COUPON_INVALID", "COUPON_FIELD_MISSING", "PRICE_MISMATCH", "PRICE_MISMATCH_AFTER_COUPON", "FINAL_PRICE_MISMATCH", "PAYMENT_DISCOUNT_MISSING", "REDIRECT_ERROR", "PRODUCT_UNAVAILABLE", "LOGIN_REQUIRED", "DATA_EXTRACTION_FAILED", "PAGE_LOAD_TIMEOUT", "NONE"],
                  description: "Primary error type or NONE if valid",
                },
                severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW", "NONE"] },
                errors: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      error_type: { type: "string" },
                      expected: { type: "string" },
                      actual: { type: "string" },
                      description: { type: "string" },
                    },
                    required: ["error_type", "description"],
                  },
                },
                summary: { type: "string", description: "Brief validation summary" },
                ai_analysis: { type: "string", description: "Detailed analysis: verdict, root cause, CashKaro vs partner issue, user risk, recommended action" },
                stage_assessments: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      stage: { type: "string", enum: ["verify_product", "check_price", "apply_coupon", "check_prepay", "final_check"] },
                      status: { type: "string", enum: ["pass", "fail", "warning", "skipped"] },
                      message: { type: "string" },
                    },
                    required: ["stage", "status", "message"],
                  },
                },
              },
              required: ["actual_price", "coupon_status", "freebie_status", "stock_status", "final_status", "confidence_score", "error_type", "severity", "errors", "summary", "ai_analysis", "stage_assessments"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "validate_deal_result" } },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI error:", aiResp.status, errText);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI validation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI did not return structured result" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);
    const now = new Date().toISOString();
    const runId = `RUN-${Date.now()}`;

    // Merge AI stage assessments with scraping stages
    if (result.stage_assessments) {
      for (const sa of result.stage_assessments) {
        addStage(sa.stage, sa.status, sa.message);
      }
    }

    // Build reasons array
    const reasons = result.errors.map(
      (e: any) => `[${e.error_type}] ${e.description}${e.expected ? ` (expected: ${e.expected}, actual: ${e.actual})` : ""}`
    );

    // Insert validation result with new fields
    await supabase.from("validation_results").insert({
      deal_id: dealId,
      actual_price: result.actual_price,
      actual_post_coupon: result.actual_post_coupon ?? null,
      actual_final: result.actual_final ?? null,
      coupon_status: result.coupon_status,
      freebie_status: result.freebie_status,
      stock_status: result.stock_status,
      final_status: result.final_status,
      confidence_score: result.confidence_score,
      error_type: result.error_type === "NONE" ? null : result.error_type,
      severity: result.severity === "NONE" ? null : result.severity,
      stage_results: stageResults,
      ai_analysis: result.ai_analysis,
      reason: reasons.length > 0 ? reasons : [result.summary],
    });

    // Update deal status
    await supabase.from("deals")
      .update({ status: result.final_status, last_checked_at: now })
      .eq("id", dealId);

    // Insert log
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
        priority: ["PRICE_MISMATCH", "FINAL_PRICE_MISMATCH", "PRODUCT_UNAVAILABLE", "COUPON_INVALID"].includes(e.error_type) ? "high" : "medium",
      }));
      await supabase.from("alerts").insert(alertInserts);
    }

    return new Response(
      JSON.stringify({ success: true, result: { ...result, reasons, stage_results: stageResults } }),
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
