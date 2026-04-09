import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDealContext } from "@/context/DealContext";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, ArrowLeft, BrainCircuit, Loader2, ArrowRight, CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const VALIDATION_STAGES = [
  { key: "load_offer", label: "Load Offer Page" },
  { key: "extract_metadata", label: "Extract Deal Metadata" },
  { key: "load_partner", label: "Load Partner Page" },
  { key: "verify_product", label: "Verify Product" },
  { key: "check_price", label: "Price Validation" },
  { key: "apply_coupon", label: "Coupon Validation" },
  { key: "check_prepay", label: "Payment Discount" },
  { key: "final_check", label: "Final Price Check" },
];

const SEVERITY_COLORS: Record<string, string> = {
  HIGH: "bg-destructive/15 text-destructive border-destructive/30",
  MEDIUM: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  LOW: "bg-blue-500/15 text-blue-700 border-blue-500/30",
};

const DealDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { getDeal, validateDeal, aiValidateDeal, getLatestValidation, logs } = useDealContext();
  const navigate = useNavigate();
  const deal = getDeal(id || "");
  const r = deal ? getLatestValidation(deal.id) : undefined;
  const [aiLoading, setAiLoading] = useState(false);
  const [simLoading, setSimLoading] = useState(false);

  // Validation stages from result
  const stageResults: Array<{ stage: string; status: string; message?: string }> =
    r && (r as any).stage_results ? ((r as any).stage_results as any[]) : [];

  if (!deal) return (
    <div className="text-center py-16">
      <p className="text-muted-foreground">Deal not found</p>
      <Button variant="link" onClick={() => navigate("/")}>Back to Dashboard</Button>
    </div>
  );

  const reasons = r?.reason ? (Array.isArray(r.reason) ? r.reason as string[] : []) : [];
  const dealLogs = logs.filter(l => l.deal_id === deal.id).slice(0, 10);

  // Price waterfall data
  const d = deal as any;
  const mrp = d.mrp || deal.expected_price;
  const salePrice = d.partner_sale_price || mrp;
  const afterCoupon = salePrice - (d.coupon_discount || 0);
  const payable = afterCoupon - (d.prepay_discount || 0);
  const cashbackAmt = Math.round((payable * deal.expected_cashback) / 100);
  const effectivePrice = payable - cashbackAmt;

  // Confidence score
  const confidence = r ? ((r as any).confidence_score ?? (r.final_status === "valid" ? 95 : 30)) : 0;
  const confidenceColor = confidence >= 80 ? "text-emerald-600" : confidence >= 50 ? "text-amber-600" : "text-destructive";

  const handleAiValidate = async () => {
    setAiLoading(true);
    try {
      await aiValidateDeal(deal.id, d.cashkaro_url || undefined);
      toast.success("AI validation complete!");
    } catch (err: any) {
      toast.error(err.message || "AI validation failed");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSimValidate = async () => {
    setSimLoading(true);
    try {
      await validateDeal(deal.id);
      toast.success("Simulation complete!");
    } catch {
      toast.error("Simulation failed");
    } finally {
      setSimLoading(false);
    }
  };

  const statusLabel = r?.final_status === "valid" ? "VERIFIED" : r?.final_status === "invalid" ? "FAILED" : deal.status === "pending" ? "PENDING" : deal.status.toUpperCase();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{deal.deal_name || "Deal Details"}</h1>
          <p className="text-sm text-muted-foreground">{deal.partner_site} · {deal.product_url.slice(0, 50)}...</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status={deal.status} />
          {r && (
            <Badge className={cn("text-xs", SEVERITY_COLORS[(r as any).severity || "MEDIUM"])}>
              {(r as any).severity || "—"}
            </Badge>
          )}
        </div>
      </div>

      {/* Confidence Score + Status */}
      {r && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <p className={cn("text-2xl font-bold", r.final_status === "valid" ? "text-emerald-600" : "text-destructive")}>{statusLabel}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">Confidence Score</p>
              <div className="flex items-center gap-3">
                <p className={cn("text-2xl font-bold", confidenceColor)}>{confidence}%</p>
                <Progress value={confidence} className="flex-1 h-2" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">Error Type</p>
              <p className="text-sm font-medium">{(r as any).error_type?.replace(/_/g, " ") || "None"}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Price Waterfall */}
      <Card>
        <CardHeader><CardTitle>Price Waterfall</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <WaterfallStep label="MRP" value={mrp} />
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <WaterfallStep label="Sale Price" value={salePrice} />
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <WaterfallStep label="After Coupon" value={afterCoupon} />
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <WaterfallStep label="After Prepay" value={payable} />
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <WaterfallStep label="Effective" value={effectivePrice} className="bg-emerald-500/10 border-emerald-500/30 text-emerald-700 font-semibold" />
          </div>

          {r && (
            <>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <ResultCard label="Actual Price" value={`₹${r.actual_price ?? "—"}`} good={(r.actual_price ?? 0) <= deal.expected_price} />
                <ResultCard label="Post Coupon" value={`₹${(r as any).actual_post_coupon ?? "—"}`} good={true} />
                <ResultCard label="Final Total" value={`₹${(r as any).actual_final ?? "—"}`} good={true} />
                <ResultCard label="Coupon" value={r.coupon_status} good={r.coupon_status === "working"} />
                <ResultCard label="Stock" value={r.stock_status} good={r.stock_status === "in_stock"} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Validation Stages */}
      {stageResults.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Validation Progress</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {VALIDATION_STAGES.map(stage => {
                const sr = stageResults.find(s => s.stage === stage.key);
                const status = sr?.status || "pending";
                return (
                  <div key={stage.key} className="flex items-center gap-3 py-1.5">
                    <div className="w-5 h-5 flex items-center justify-center">
                      {status === "pass" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                      {status === "fail" && <XCircle className="h-4 w-4 text-destructive" />}
                      {status === "warning" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                      {status === "pending" && <Clock className="h-4 w-4 text-muted-foreground" />}
                      {status === "skipped" && <div className="h-2 w-2 rounded-full bg-muted-foreground" />}
                    </div>
                    <span className={cn("text-sm flex-1", status === "pending" ? "text-muted-foreground" : "")}>{stage.label}</span>
                    {sr?.message && <span className="text-xs text-muted-foreground max-w-[300px] truncate">{sr.message}</span>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Errors */}
      {reasons.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-destructive">Issues Found ({reasons.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {reasons.map((reason, i) => {
              const match = String(reason).match(/^\[([^\]]+)\]\s*(.+)/);
              return (
                <div key={i} className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm">
                  {match ? (
                    <>
                      <Badge variant="outline" className="text-xs mb-1">{match[1].replace(/_/g, " ")}</Badge>
                      <p className="text-muted-foreground">{match[2]}</p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">{String(reason)}</p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* AI Analysis */}
      {(r as any)?.ai_analysis && (
        <Card>
          <CardHeader><CardTitle>AI Analysis</CardTitle></CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
              {(r as any).ai_analysis}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deal Info */}
      <Card>
        <CardHeader><CardTitle>Deal Information</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Deal Name</dt><dd className="font-medium">{deal.deal_name || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Partner Site</dt><dd className="font-medium">{deal.partner_site}</dd></div>
            <div><dt className="text-muted-foreground">Cashback %</dt><dd className="font-medium">{deal.expected_cashback}%</dd></div>
            <div className="col-span-2 md:col-span-3"><dt className="text-muted-foreground">Product URL</dt><dd><a href={deal.product_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">{deal.product_url}</a></dd></div>
            {d.cashkaro_url && (
              <div className="col-span-2 md:col-span-3"><dt className="text-muted-foreground">CashKaro URL</dt><dd><a href={d.cashkaro_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">{d.cashkaro_url}</a></dd></div>
            )}
            <div><dt className="text-muted-foreground">Coupon Code</dt><dd className="font-medium">{deal.coupon_code || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Freebie</dt><dd className="font-medium">{deal.expected_freebie || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Expiry</dt><dd className="font-medium">{deal.expiry_date || "—"}</dd></div>
          </dl>
        </CardContent>
      </Card>

      {/* Validation Logs */}
      {dealLogs.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Validation Log</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dealLogs.map(log => (
                <div key={log.id} className="flex items-start gap-3 text-sm border-b border-border/50 pb-2 last:border-0">
                  <StatusBadge status={log.status} />
                  <span className="flex-1 text-muted-foreground">{log.message}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3 pb-8">
        <Button variant="outline" onClick={handleSimValidate} disabled={simLoading}>
          {simLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Simulate Validate
        </Button>
        <Button onClick={handleAiValidate} disabled={aiLoading}>
          {aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
          AI Validate
        </Button>
      </div>
    </div>
  );
};

const WaterfallStep = ({ label, value, className }: { label: string; value: number; className?: string }) => (
  <div className={cn("rounded-md border px-3 py-1.5 text-center", className || "border-border")}>
    <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
    <p className="text-sm font-medium">₹{value}</p>
  </div>
);

const ResultCard = ({ label, value, good }: { label: string; value: string; good: boolean }) => (
  <div className={cn("rounded-lg border p-3", good ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5")}>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={cn("text-sm font-semibold", good ? "text-emerald-600" : "text-destructive")}>{value}</p>
  </div>
);

export default DealDetails;
