import { useParams, useNavigate } from "react-router-dom";
import { useDealContext } from "@/context/DealContext";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ArrowLeft, Image } from "lucide-react";
import { cn } from "@/lib/utils";

const DealDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { getDeal, validateDeal } = useDealContext();
  const navigate = useNavigate();
  const deal = getDeal(id || "");

  if (!deal) return (
    <div className="text-center py-16">
      <p className="text-muted-foreground">Deal not found</p>
      <Button variant="link" onClick={() => navigate("/")}>Back to Dashboard</Button>
    </div>
  );

  const r = deal.validationResult;

  const resultColor = (good: boolean) => good ? "text-emerald-600" : "text-destructive";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold tracking-tight">Deal {deal.id}</h1>
        <StatusBadge status={deal.status} />
      </div>

      <Card>
        <CardHeader><CardTitle>Deal Information</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-muted-foreground">Partner Site</dt><dd className="font-medium">{deal.partnerSite}</dd></div>
            <div><dt className="text-muted-foreground">Expected Price</dt><dd className="font-medium">₹{deal.expectedPrice}</dd></div>
            <div className="col-span-2"><dt className="text-muted-foreground">Product URL</dt><dd><a href={deal.productUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">{deal.productUrl}</a></dd></div>
            <div><dt className="text-muted-foreground">Coupon Code</dt><dd className="font-medium">{deal.couponCode || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Cashback %</dt><dd className="font-medium">{deal.cashbackPercent}%</dd></div>
            <div><dt className="text-muted-foreground">Freebie</dt><dd className="font-medium">{deal.expectedFreebie || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Expiry</dt><dd className="font-medium">{deal.expiryDate || "—"}</dd></div>
          </dl>
        </CardContent>
      </Card>

      {r && (
        <Card>
          <CardHeader><CardTitle>Validation Results</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><dt className="text-muted-foreground">Actual Price</dt><dd className={cn("font-medium", resultColor(r.actualPrice <= deal.expectedPrice))}>₹{r.actualPrice}</dd></div>
              <div><dt className="text-muted-foreground">Coupon Status</dt><dd className={cn("font-medium", resultColor(r.couponStatus === "Working"))}>{r.couponStatus}</dd></div>
              <div><dt className="text-muted-foreground">Freebie Status</dt><dd className={cn("font-medium", resultColor(r.freebieStatus === "Available"))}>{r.freebieStatus}</dd></div>
              <div><dt className="text-muted-foreground">Stock Status</dt><dd className={cn("font-medium", resultColor(r.stockStatus === "In Stock"))}>{r.stockStatus}</dd></div>
            </dl>
            <div>
              <dt className="text-sm text-muted-foreground mb-1">Final Result</dt>
              <StatusBadge status={r.finalResult} />
            </div>
            {r.reasons.length > 0 && (
              <div>
                <p className="text-sm font-medium text-destructive mb-1">Reasons for Failure:</p>
                <ul className="list-disc list-inside text-sm space-y-1 text-destructive/80">
                  {r.reasons.map((reason, i) => <li key={i}>{reason}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button onClick={() => validateDeal(deal.id)}><RefreshCw className="mr-2 h-4 w-4" />Validate Again</Button>
        <Button variant="outline" disabled={!deal.screenshotUrl}><Image className="mr-2 h-4 w-4" />View Screenshot</Button>
      </div>
    </div>
  );
};

export default DealDetails;
