import { useParams, useNavigate } from "react-router-dom";
import { useDealContext } from "@/context/DealContext";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, ArrowLeft, Image } from "lucide-react";
import { cn } from "@/lib/utils";

const DealDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { getDeal, validateDeal, getLatestValidation } = useDealContext();
  const navigate = useNavigate();
  const deal = getDeal(id || "");
  const r = deal ? getLatestValidation(deal.id) : undefined;

  if (!deal) return (
    <div className="text-center py-16">
      <p className="text-muted-foreground">Deal not found</p>
      <Button variant="link" onClick={() => navigate("/")}>Back to Dashboard</Button>
    </div>
  );

  const resultColor = (good: boolean) => good ? "text-emerald-600" : "text-destructive";
  const reasons = r?.reason ? (Array.isArray(r.reason) ? r.reason as string[] : []) : [];

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
            <div><dt className="text-muted-foreground">Partner Site</dt><dd className="font-medium">{deal.partner_site}</dd></div>
            <div><dt className="text-muted-foreground">Expected Price</dt><dd className="font-medium">₹{deal.expected_price}</dd></div>
            <div className="col-span-2"><dt className="text-muted-foreground">Product URL</dt><dd><a href={deal.product_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">{deal.product_url}</a></dd></div>
            <div><dt className="text-muted-foreground">Coupon Code</dt><dd className="font-medium">{deal.coupon_code || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Cashback %</dt><dd className="font-medium">{deal.expected_cashback}%</dd></div>
            <div><dt className="text-muted-foreground">Freebie</dt><dd className="font-medium">{deal.expected_freebie || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Expiry</dt><dd className="font-medium">{deal.expiry_date || "—"}</dd></div>
          </dl>
        </CardContent>
      </Card>

      {r && (
        <Card>
          <CardHeader><CardTitle>Validation Results</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><dt className="text-muted-foreground">Actual Price</dt><dd className={cn("font-medium", resultColor((r.actual_price ?? 0) <= deal.expected_price))}>₹{r.actual_price}</dd></div>
              <div><dt className="text-muted-foreground">Coupon Status</dt><dd className={cn("font-medium", resultColor(r.coupon_status === "working"))}>{r.coupon_status}</dd></div>
              <div><dt className="text-muted-foreground">Freebie Status</dt><dd className={cn("font-medium", resultColor(r.freebie_status === "available"))}>{r.freebie_status}</dd></div>
              <div><dt className="text-muted-foreground">Stock Status</dt><dd className={cn("font-medium", resultColor(r.stock_status === "in_stock"))}>{r.stock_status}</dd></div>
            </dl>
            <div>
              <dt className="text-sm text-muted-foreground mb-1">Final Result</dt>
              <StatusBadge status={r.final_status} />
            </div>
            {reasons.length > 0 && (
              <div>
                <p className="text-sm font-medium text-destructive mb-1">Reasons for Failure:</p>
                <ul className="list-disc list-inside text-sm space-y-1 text-destructive/80">
                  {reasons.map((reason, i) => <li key={i}>{String(reason)}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button onClick={() => validateDeal(deal.id)}><RefreshCw className="mr-2 h-4 w-4" />Validate Again</Button>
        <Button variant="outline" disabled={!r?.screenshot_url}><Image className="mr-2 h-4 w-4" />View Screenshot</Button>
      </div>
    </div>
  );
};

export default DealDetails;
