import React, { createContext, useContext, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DbDeal, DbValidationResult, DbValidationLog, DbAlert, DbSettings } from "@/types/deal";
import type { TablesInsert } from "@/integrations/supabase/types";

const PARTNER_SITES = ["Amazon", "Flipkart", "Myntra", "Ajio", "Meesho"];

interface DealContextType {
  deals: DbDeal[];
  logs: DbValidationLog[];
  alerts: DbAlert[];
  settings: DbSettings | null;
  partnerSites: string[];
  isLoading: boolean;
  addDeal: (deal: TablesInsert<"deals">) => Promise<DbDeal>;
  validateDeal: (dealId: string) => Promise<void>;
  validateAllDeals: () => Promise<void>;
  toggleAlertResolved: (alertId: string, current: boolean) => Promise<void>;
  updateSettings: (s: Partial<TablesInsert<"settings">>) => Promise<void>;
  getDeal: (id: string) => DbDeal | undefined;
  getLatestValidation: (dealId: string) => DbValidationResult | undefined;
  validationResults: DbValidationResult[];
}

const DealContext = createContext<DealContextType | null>(null);

export const useDealContext = () => {
  const ctx = useContext(DealContext);
  if (!ctx) throw new Error("useDealContext must be used within DealProvider");
  return ctx;
};

function simulateValidation(deal: DbDeal): Omit<TablesInsert<"validation_results">, "deal_id"> {
  const rand = Math.random();
  if (rand > 0.4) {
    return {
      actual_price: deal.expected_price,
      coupon_status: deal.coupon_code ? "working" : "not_applied",
      freebie_status: deal.expected_freebie ? "available" : "not_available",
      stock_status: "in_stock",
      final_status: "valid",
      reason: [],
    };
  }
  const reasons: string[] = [];
  const priceDiff = Math.floor(Math.random() * 500) + 100;
  const actualPrice = deal.expected_price + priceDiff;
  reasons.push(`Price mismatch: ₹${actualPrice} vs ₹${deal.expected_price}`);
  const couponStatus = deal.coupon_code ? "failed" : "not_applied";
  if (couponStatus === "failed") reasons.push(`Coupon ${deal.coupon_code} not applicable`);
  if (deal.expected_freebie) reasons.push(`Freebie "${deal.expected_freebie}" not available`);
  return {
    actual_price: actualPrice,
    coupon_status: couponStatus,
    freebie_status: deal.expected_freebie ? "not_available" : "not_available",
    stock_status: rand > 0.2 ? "in_stock" : "out_of_stock",
    final_status: "invalid",
    reason: reasons,
  };
}

export const DealProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  const { data: deals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("deals").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as DbDeal[];
    },
  });

  const { data: validationResults = [] } = useQuery({
    queryKey: ["validation_results"],
    queryFn: async () => {
      const { data, error } = await supabase.from("validation_results").select("*").order("checked_at", { ascending: false });
      if (error) throw error;
      return data as DbValidationResult[];
    },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["validation_logs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("validation_logs").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as DbValidationLog[];
    },
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("alerts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as DbAlert[];
    },
  });

  const { data: settings = null } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("settings").select("*").limit(1).single();
      if (error) throw error;
      return data as DbSettings;
    },
  });

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["deals"] }),
      queryClient.invalidateQueries({ queryKey: ["validation_results"] }),
      queryClient.invalidateQueries({ queryKey: ["validation_logs"] }),
      queryClient.invalidateQueries({ queryKey: ["alerts"] }),
    ]);
  };

  const addDeal = useCallback(async (data: TablesInsert<"deals">) => {
    const { data: deal, error } = await supabase.from("deals").insert(data).select().single();
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["deals"] });
    return deal as DbDeal;
  }, [queryClient]);

  const validateDeal = useCallback(async (dealId: string) => {
    // Fetch deal directly from DB to avoid stale cache issues
    let deal = deals.find(d => d.id === dealId);
    if (!deal) {
      const { data } = await supabase.from("deals").select("*").eq("id", dealId).single();
      if (!data) return;
      deal = data as DbDeal;
    }

    const result = simulateValidation(deal);
    const now = new Date().toISOString();

    // Insert validation result
    await supabase.from("validation_results").insert({ deal_id: dealId, ...result });

    // Update deal status
    await supabase.from("deals").update({ status: result.final_status, last_checked_at: now }).eq("id", dealId);

    // Insert validation log
    const reasons = (result.reason as string[]) || [];
    await supabase.from("validation_logs").insert({
      deal_id: dealId,
      status: result.final_status,
      message: reasons.length ? reasons.join(", ") : "All checks passed",
      run_id: `RUN-${Date.now()}`,
    });

    // Create alerts if invalid
    if (result.final_status === "invalid") {
      const alertInserts = reasons.map((r) => ({
        deal_id: dealId,
        alert_type: r.includes("Price") ? "price_mismatch" as const : r.includes("Coupon") ? "coupon_failed" as const : "freebie_missing" as const,
        description: r,
        priority: r.includes("Price") ? "high" as const : "medium" as const,
      }));
      if (alertInserts.length > 0) {
        await supabase.from("alerts").insert(alertInserts);
      }
    }

    invalidateAll();
  }, [deals, queryClient]);

  const validateAllDeals = useCallback(async () => {
    for (const d of deals) {
      await validateDeal(d.id);
    }
  }, [deals, validateDeal]);

  const toggleAlertResolved = useCallback(async (alertId: string, current: boolean) => {
    await supabase.from("alerts").update({ is_resolved: !current }).eq("id", alertId);
    queryClient.invalidateQueries({ queryKey: ["alerts"] });
  }, [queryClient]);

  const updateSettings = useCallback(async (patch: Partial<TablesInsert<"settings">>) => {
    if (!settings) return;
    await supabase.from("settings").update(patch).eq("id", settings.id);
    queryClient.invalidateQueries({ queryKey: ["settings"] });
  }, [settings, queryClient]);

  const getDeal = useCallback((id: string) => deals.find(d => d.id === id), [deals]);
  const getLatestValidation = useCallback((dealId: string) => validationResults.find(v => v.deal_id === dealId), [validationResults]);

  return (
    <DealContext.Provider value={{
      deals, logs, alerts, settings, partnerSites: PARTNER_SITES,
      isLoading: dealsLoading, addDeal, validateDeal, validateAllDeals,
      toggleAlertResolved, updateSettings, getDeal, getLatestValidation, validationResults,
    }}>
      {children}
    </DealContext.Provider>
  );
};
