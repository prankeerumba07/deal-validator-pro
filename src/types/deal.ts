import type { Tables } from "@/integrations/supabase/types";

export type DbDeal = Tables<"deals">;
export type DbValidationResult = Tables<"validation_results">;
export type DbValidationLog = Tables<"validation_logs">;
export type DbAlert = Tables<"alerts">;
export type DbSettings = Tables<"settings">;
