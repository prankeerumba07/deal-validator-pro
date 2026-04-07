import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDealContext } from "@/context/DealContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const AddDeal = () => {
  const { addDeal, validateDeal, partnerSites } = useDealContext();
  const navigate = useNavigate();
  const [partnerSite, setPartnerSite] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [expectedPrice, setExpectedPrice] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [cashbackPercent, setCashbackPercent] = useState("");
  const [expectedFreebie, setExpectedFreebie] = useState("");
  const [expiryDate, setExpiryDate] = useState<Date>();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!productUrl.trim()) errs.productUrl = "Product URL is required";
    if (!expectedPrice || Number(expectedPrice) <= 0) errs.expectedPrice = "Price must be greater than 0";
    if (!partnerSite) errs.partnerSite = "Select a partner site";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = (andValidate = false) => {
    if (!validate()) return;
    const deal = addDeal({
      partnerSite, productUrl, expectedPrice: Number(expectedPrice),
      couponCode, cashbackPercent: Number(cashbackPercent) || 0,
      expectedFreebie, expiryDate: expiryDate ? format(expiryDate, "yyyy-MM-dd") : "",
    });
    if (andValidate) validateDeal(deal.id);
    toast.success(`Deal ${deal.id} saved${andValidate ? " & validated" : ""}`);
    navigate("/");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Add New Flash Deal</h1>
      <Card>
        <CardHeader><CardTitle>Deal Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Partner Site *</Label>
            <Select value={partnerSite} onValueChange={setPartnerSite}>
              <SelectTrigger><SelectValue placeholder="Select partner" /></SelectTrigger>
              <SelectContent>{partnerSites.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            {errors.partnerSite && <p className="text-sm text-destructive">{errors.partnerSite}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Product URL *</Label>
            <Input value={productUrl} onChange={e => setProductUrl(e.target.value)} placeholder="https://..." />
            {errors.productUrl && <p className="text-sm text-destructive">{errors.productUrl}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Expected Price (₹) *</Label>
              <Input type="number" value={expectedPrice} onChange={e => setExpectedPrice(e.target.value)} placeholder="0" />
              {errors.expectedPrice && <p className="text-sm text-destructive">{errors.expectedPrice}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Cashback %</Label>
              <Input type="number" value={cashbackPercent} onChange={e => setCashbackPercent(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Coupon Code</Label>
              <Input value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="Optional" />
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
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !expiryDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiryDate ? format(expiryDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={expiryDate} onSelect={setExpiryDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => handleSave(false)}>Save Deal</Button>
            <Button onClick={() => handleSave(true)}>Save & Validate</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddDeal;
