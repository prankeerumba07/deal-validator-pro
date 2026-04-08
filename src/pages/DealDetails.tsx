import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDealContext } from "@/context/DealContext";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ArrowLeft, BrainCircuit, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DealDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { getDeal, validateDeal, aiValidateDeal, getLatestValidation } = useDealContext();
  const navigate = useNavigate();
  const deal = getDeal(id || "");
  const r = deal ? getLatestValidation(deal.id) : undefined;
  const [aiLoading, setAiLoading] = useState(false);

  if (!deal) return (
    <div className="text-center py-16">
      <p className="text-muted-foreground">Deal not found</p>
      <Button variant="link" onClick={() => navigate("/")}>Back to Dashboard</Button>
    </div>
  );

  const resultColor = (good: boolean) => good ? "text-emerald-600" : "text-destructive";
  const reasons = r?.reason ? (Array.isArray(r.reason) ? r.reason as string[] : []) : [];

  const handleAiValidate = async () => {
    setAiLoading(true);
    try {
      await aiValidateDeal(deal.id, (deal as any).cashkaro_url || undefined);
      toast.success("AI validation complete!");
    } catch (err: any) {
      toast.error(err.message || "AI validation failed");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold tracking-tight">Deal Details</h1>
        <StatusBadge status={deal.status} />
      </div>

      <Card>
        <CardHeader><CardTitle>Deal Information</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Deal Name</dt><dd className="font-medium">{deal.deal_name || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Partner Site</dt><dd className="font-medium">{deal.partner_site}</dd></div>
            <div><dt className="text-muted-foreground">Expected Price</dt><dd className="font-medium">₹{deal.expected_price}</dd></div>
            <div><dt className="text-muted-foreground">Cashback %</dt><dd className="font-medium">{deal.expected_cashback}%</dd></div>
            <div className="col-span-2"><dt className="text-muted-foreground">Product URL</dt><dd><a href={deal.product_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">{deal.product_url}</a></dd></div>
            {(deal as any).cashkaro_url && (
              <div className="col-span-2"><dt className="text-muted-foreground">CashKaro URL</dt><dd><a href={(deal as any).cashkaro_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">{(deal as any).cashkaro_url}</a></dd></div>
            )}
            <div><dt className="text-muted-foreground">Coupon Code</dt><dd className="font-medium">{deal.coupon_code || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Freebie</dt><dd className="font-medium">{deal.expected_freebie || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Expiry</dt><dd className="font-medium">{deal.expiry_date || "—"}</dd></div>
          </dl>
        </CardContent>
      </Card>

      {r && (
        <Card>
          <CardHeader><CardTitle>Validation Results</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className={cn("rounded-lg border p-3", (r.actual_price ?? 0) <= deal.expected_price ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5")}>
                <p className="text-xs text-muted-foreground">Actual Price</p>
                <p className={cn("text-sm font-semibold", resultColor((r.actual_price ?? 0) <= deal.expected_price))}>₹{r.actual_price}</p>
              </div>
              <div className={cn("rounded-lg border p-3", r.coupon_status === "working" ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5")}>
                <p className="text-xs text-muted-foreground">Coupon</p>
                <p className={cn("text-sm font-semibold", resultColor(r.coupon_status === "working"))}>{r.coupon_status}</p>
              </div>
              <div className={cn("rounded-lg border p-3", r.freebie_status === "available" ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5")}>
                <p className="text-xs text-muted-foreground">Freebie</p>
                <p className={cn("text-sm font-semibold", resultColor(r.freebie_status === "available"))}>{r.freebie_status}</p>
              </div>
              <div className={cn("rounded-lg border p-3", r.stock_status === "in_stock" ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5")}>
                <p className="text-xs text-muted-foreground">Stock</p>
                <p className={cn("text-sm font-semibold", resultColor(r.stock_status === "in_stock"))}>{r.stock_status}</p>
              </div>
            </div>

            <div>
              <dt className="text-sm text-muted-foreground mb-1">Final Result</dt>
              <StatusBadge status={r.final_status} />
            </div>

            {reasons.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">Issues Found:</p>
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
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => validateDeal(deal.id)}>
          <RefreshCw className="mr-2 h-4 w-4" />Simulate Validate
        </Button>
        <Button onClick={handleAiValidate} disabled={aiLoading}>
          {aiLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <BrainCircuit className="mr-2 h-4 w-4" />
          )}
          AI Validate
        </Button>
      </div>
    </div>
  );
};

export default DealDetails;
