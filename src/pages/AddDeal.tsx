import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDealContext } from "@/context/DealContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, ArrowRight, IndianRupee } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const AddDeal = () => {
  const { addDeal, validateDeal, aiValidateDeal, partnerSites } = useDealContext();
  const navigate = useNavigate();

  const [dealName, setDealName] = useState("");
  const [partnerSite, setPartnerSite] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [cashkaroUrl, setCashkaroUrl] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [expectedFreebie, setExpectedFreebie] = useState("");
  const [expiryDate, setExpiryDate] = useState<Date>();
  const [notes, setNotes] = useState("");

  // Pricing fields
  const [mrp, setMrp] = useState("");
  const [partnerSalePrice, setPartnerSalePrice] = useState("");
  const [couponDiscount, setCouponDiscount] = useState("");
  const [prepayDiscount, setPrepayDiscount] = useState("");
  const [cashbackPercent, setCashbackPercent] = useState("");
  const [effectivePriceClaimed, setEffectivePriceClaimed] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Auto-calculate expected payable and effective price
  const calculated = useMemo(() => {
    const m = Number(mrp) || 0;
    const sp = Number(partnerSalePrice) || m;
    const cd = Number(couponDiscount) || 0;
    const pd = Number(prepayDiscount) || 0;
    const cb = Number(cashbackPercent) || 0;

    const afterCoupon = Math.max(sp - cd, 0);
    const expectedPayable = Math.max(afterCoupon - pd, 0);
    const cashbackAmount = Math.round((expectedPayable * cb) / 100);
    const effectivePrice = expectedPayable - cashbackAmount;
    const totalDiscount = m > 0 ? m - effectivePrice : 0;
    const discountPct = m > 0 ? Math.round((totalDiscount / m) * 100) : 0;

    return { afterCoupon, expectedPayable, cashbackAmount, effectivePrice, totalDiscount, discountPct };
  }, [mrp, partnerSalePrice, couponDiscount, prepayDiscount, cashbackPercent]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!productUrl.trim()) errs.productUrl = "Product URL is required";
    if (!partnerSite) errs.partnerSite = "Select a partner site";
    if (!mrp || Number(mrp) <= 0) errs.mrp = "MRP is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (mode: "save" | "simulate" | "ai") => {
    if (!validate()) return;
    setSaving(true);
    try {
      const deal = await addDeal({
        deal_name: dealName || "Untitled Deal",
        partner_site: partnerSite,
        product_url: productUrl,
        expected_price: calculated.expectedPayable,
        coupon_code: couponCode || null,
        expected_cashback: Number(cashbackPercent) || 0,
        expected_freebie: expectedFreebie || null,
        expiry_date: expiryDate ? format(expiryDate, "yyyy-MM-dd") : null,
        cashkaro_url: cashkaroUrl || null,
        mrp: Number(mrp) || 0,
        partner_sale_price: Number(partnerSalePrice) || Number(mrp) || 0,
        coupon_discount: Number(couponDiscount) || 0,
        prepay_discount: Number(prepayDiscount) || 0,
        expected_payable: calculated.expectedPayable,
        effective_price_claimed: Number(effectivePriceClaimed) || calculated.effectivePrice,
      });

      if (mode === "simulate") await validateDeal(deal.id);
      if (mode === "ai") await aiValidateDeal(deal.id, cashkaroUrl || undefined, productUrl);

      toast.success(
        mode === "save" ? "Deal saved!" :
        mode === "simulate" ? "Deal saved & simulated!" :
        "Deal saved & AI validated!"
      );
      navigate(`/deal/${deal.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save deal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Add New Flash Deal</h1>

      {/* URLs & Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Deal Information</CardTitle>
          <CardDescription>Enter the CashKaro offer URL and partner product URL</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Deal Name</Label>
            <Input value={dealName} onChange={e => setDealName(e.target.value)} placeholder="e.g. Big Muscles Premium Gold Whey 1kg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>CashKaro Offer URL</Label>
              <Input value={cashkaroUrl} onChange={e => setCashkaroUrl(e.target.value)} placeholder="https://cashkaro.com/..." />
            </div>
            <div className="space-y-1.5">
              <Label>Partner Product URL *</Label>
              <Input value={productUrl} onChange={e => setProductUrl(e.target.value)} placeholder="https://..." />
              {errors.productUrl && <p className="text-sm text-destructive">{errors.productUrl}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Partner Site *</Label>
              <Select value={partnerSite} onValueChange={setPartnerSite}>
                <SelectTrigger><SelectValue placeholder="Select partner" /></SelectTrigger>
                <SelectContent>{partnerSites.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              {errors.partnerSite && <p className="text-sm text-destructive">{errors.partnerSite}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Coupon Code</Label>
              <Input value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="e.g. FLAT500" />
            </div>
            <div className="space-y-1.5">
              <Label>Expected Freebie</Label>
              <Input value={expectedFreebie} onChange={e => setExpectedFreebie(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Deal Expiry Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full md:w-[280px] justify-start text-left font-normal", !expiryDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiryDate ? format(expiryDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={expiryDate} onSelect={setExpiryDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Price Waterfall</CardTitle>
          <CardDescription>Enter pricing at each stage to calculate the expected effective price</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>MRP (₹) *</Label>
              <Input type="number" value={mrp} onChange={e => setMrp(e.target.value)} placeholder="0" />
              {errors.mrp && <p className="text-sm text-destructive">{errors.mrp}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Partner Sale Price (₹)</Label>
              <Input type="number" value={partnerSalePrice} onChange={e => setPartnerSalePrice(e.target.value)} placeholder={mrp || "0"} />
            </div>
            <div className="space-y-1.5">
              <Label>Coupon Discount (₹)</Label>
              <Input type="number" value={couponDiscount} onChange={e => setCouponDiscount(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Prepay/UPI Discount (₹)</Label>
              <Input type="number" value={prepayDiscount} onChange={e => setPrepayDiscount(e.target.value)} placeholder="0" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>CashKaro Cashback %</Label>
              <Input type="number" value={cashbackPercent} onChange={e => setCashbackPercent(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Effective Price Claimed (₹)</Label>
              <Input type="number" value={effectivePriceClaimed} onChange={e => setEffectivePriceClaimed(e.target.value)} placeholder={String(calculated.effectivePrice)} />
              <p className="text-xs text-muted-foreground">As shown on CashKaro page</p>
            </div>
          </div>

          <Separator />

          {/* Price Waterfall Visual */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <PriceStep label="MRP" value={Number(mrp) || 0} />
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <PriceStep label="Sale Price" value={Number(partnerSalePrice) || Number(mrp) || 0} />
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <PriceStep label="After Coupon" value={calculated.afterCoupon} />
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <PriceStep label="After Prepay" value={calculated.expectedPayable} highlight />
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <PriceStep label="Effective" value={calculated.effectivePrice} highlight className="bg-emerald-500/10 border-emerald-500/30 text-emerald-700" />
          </div>

          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Cashback: ₹{calculated.cashbackAmount}</span>
            <span>Total Savings: ₹{calculated.totalDiscount} ({calculated.discountPct}% off)</span>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader><CardTitle>Notes & Conditions</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special conditions, variant info, etc." rows={3} />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 pb-8">
        <Button variant="outline" onClick={() => handleSave("save")} disabled={saving}>Save Deal</Button>
        <Button variant="secondary" onClick={() => handleSave("simulate")} disabled={saving}>Save & Simulate</Button>
        <Button onClick={() => handleSave("ai")} disabled={saving}>Save & AI Validate</Button>
      </div>
    </div>
  );
};

const PriceStep = ({ label, value, highlight, className }: { label: string; value: number; highlight?: boolean; className?: string }) => (
  <div className={cn("rounded-md border px-3 py-1.5 text-center", highlight ? "border-primary/30 bg-primary/5 font-semibold" : "border-border", className)}>
    <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
    <p className="text-sm font-medium">₹{value}</p>
  </div>
);

export default AddDeal;
