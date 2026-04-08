import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDealContext } from "@/context/DealContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Zap, Globe, CheckCircle2, XCircle, AlertTriangle, Download } from "lucide-react";

interface ScrapedDeal {
  deal_name: string;
  partner_site?: string;
  cashkaro_url?: string;
  partner_url?: string;
  expected_price: number;
  original_price?: number;
  coupon_code?: string;
  cashback_percent?: number;
  freebie?: string;
  expiry?: string;
}

interface ValidationResult {
  actual_price: number;
  coupon_status: string;
  freebie_status: string;
  stock_status: string;
  final_status: string;
  summary: string;
  errors: Array<{
    error_type: string;
    expected?: string;
    actual?: string;
    description: string;
  }>;
}

const AutoValidate = () => {
  const { addDeal } = useDealContext();
  const navigate = useNavigate();

  // Test Mode state
  const [cashkaroUrl, setCashkaroUrl] = useState("");
  const [partnerUrl, setPartnerUrl] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<ValidationResult | null>(null);
  const [testDealId, setTestDealId] = useState<string | null>(null);

  // Auto Mode state
  const [autoUrl, setAutoUrl] = useState("https://cashkaro.com/flash-deals");
  const [autoLoading, setAutoLoading] = useState(false);
  const [scrapedDeals, setScrapedDeals] = useState<ScrapedDeal[]>([]);
  const [importingIds, setImportingIds] = useState<Set<number>>(new Set());
  const [validatingAll, setValidatingAll] = useState(false);

  // Test Mode: Create deal from URLs and validate
  const handleTestValidate = async () => {
    if (!cashkaroUrl && !partnerUrl) {
      toast.error("Please enter at least one URL");
      return;
    }
    setTestLoading(true);
    setTestResult(null);

    try {
      // Create a deal entry first
      const deal = await addDeal({
        deal_name: "Test Validation",
        partner_site: "CashKaro",
        product_url: partnerUrl || cashkaroUrl,
        expected_price: 0,
        cashkaro_url: cashkaroUrl || null,
      });

      setTestDealId(deal.id);

      // Call the AI validation edge function
      const { data, error } = await supabase.functions.invoke("validate-deal", {
        body: {
          dealId: deal.id,
          cashkaroUrl: cashkaroUrl || undefined,
          partnerUrl: partnerUrl || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setTestResult(data.result);
      toast.success("Validation complete!");
    } catch (err: any) {
      console.error("Test validation error:", err);
      toast.error(err.message || "Validation failed");
    } finally {
      setTestLoading(false);
    }
  };

  // Auto Mode: Scrape flash deals
  const handleAutoScrape = async () => {
    setAutoLoading(true);
    setScrapedDeals([]);

    try {
      const { data, error } = await supabase.functions.invoke("scrape-flash-deals", {
        body: { url: autoUrl },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setScrapedDeals(data.deals || []);
      toast.success(`Found ${data.total_found || 0} deals!`);
    } catch (err: any) {
      console.error("Auto scrape error:", err);
      toast.error(err.message || "Failed to scrape deals");
    } finally {
      setAutoLoading(false);
    }
  };

  // Import a scraped deal into the system
  const handleImportDeal = async (index: number, deal: ScrapedDeal) => {
    setImportingIds(prev => new Set(prev).add(index));
    try {
      await addDeal({
        deal_name: deal.deal_name,
        partner_site: deal.partner_site || "Unknown",
        product_url: deal.partner_url || deal.cashkaro_url || "",
        expected_price: deal.expected_price,
        coupon_code: deal.coupon_code || null,
        expected_cashback: deal.cashback_percent || 0,
        expected_freebie: deal.freebie || null,
        cashkaro_url: deal.cashkaro_url || null,
      });
      toast.success(`Imported: ${deal.deal_name}`);
    } catch {
      toast.error("Failed to import deal");
    } finally {
      setImportingIds(prev => {
        const n = new Set(prev);
        n.delete(index);
        return n;
      });
    }
  };

  // Import all scraped deals
  const handleImportAll = async () => {
    setValidatingAll(true);
    let imported = 0;
    for (let i = 0; i < scrapedDeals.length; i++) {
      try {
        await handleImportDeal(i, scrapedDeals[i]);
        imported++;
      } catch {}
    }
    toast.success(`Imported ${imported} deals`);
    setValidatingAll(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Auto-Validation</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Validate deals using AI-powered scraping & analysis
          </p>
        </div>
      </div>

      <Tabs defaultValue="test" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="test" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Test Mode
          </TabsTrigger>
          <TabsTrigger value="auto" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Auto Mode
          </TabsTrigger>
        </TabsList>

        {/* TEST MODE */}
        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manual URL Validation</CardTitle>
              <CardDescription>
                Enter a CashKaro offer URL and/or partner site URL to validate a specific deal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>CashKaro Offer URL</Label>
                <Input
                  value={cashkaroUrl}
                  onChange={e => setCashkaroUrl(e.target.value)}
                  placeholder="https://cashkaro.com/..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Partner Website URL</Label>
                <Input
                  value={partnerUrl}
                  onChange={e => setPartnerUrl(e.target.value)}
                  placeholder="https://hyugalife.com/product/..."
                />
              </div>
              <Button onClick={handleTestValidate} disabled={testLoading}>
                {testLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Validate Deal
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {testResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Validation Result
                  {testResult.final_status === "valid" ? (
                    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Verified
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="bg-destructive/15 text-destructive border-destructive/30">
                      <XCircle className="mr-1 h-3 w-3" /> Failed
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{testResult.summary}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <ResultCard label="Actual Price" value={`₹${testResult.actual_price}`} good={true} />
                  <ResultCard label="Coupon" value={testResult.coupon_status} good={testResult.coupon_status === "working"} />
                  <ResultCard label="Freebie" value={testResult.freebie_status} good={testResult.freebie_status === "available"} />
                  <ResultCard label="Stock" value={testResult.stock_status} good={testResult.stock_status === "in_stock"} />
                </div>

                {testResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" /> Issues Found
                    </h4>
                    {testResult.errors.map((e, i) => (
                      <div key={i} className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">{e.error_type.replace(/_/g, " ")}</Badge>
                        </div>
                        <p className="text-muted-foreground">{e.description}</p>
                        {e.expected && (
                          <p className="text-xs mt-1">
                            <span className="text-emerald-600">Expected: {e.expected}</span>
                            {" → "}
                            <span className="text-destructive">Actual: {e.actual}</span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {testDealId && (
                  <Button variant="outline" size="sm" onClick={() => navigate(`/deal/${testDealId}`)}>
                    View Deal Details →
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* AUTO MODE */}
        <TabsContent value="auto" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Auto-Discover Flash Deals</CardTitle>
              <CardDescription>
                Automatically scrape CashKaro's flash deals page and import all active offers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>CashKaro Flash Deals URL</Label>
                <Input
                  value={autoUrl}
                  onChange={e => setAutoUrl(e.target.value)}
                  placeholder="https://cashkaro.com/flash-deals"
                />
              </div>
              <Button onClick={handleAutoScrape} disabled={autoLoading}>
                {autoLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  <>
                    <Globe className="mr-2 h-4 w-4" />
                    Discover Deals
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {scrapedDeals.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Discovered Deals ({scrapedDeals.length})</CardTitle>
                  <Button size="sm" onClick={handleImportAll} disabled={validatingAll}>
                    {validatingAll ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Import All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Deal Name</TableHead>
                        <TableHead>Partner</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead>Coupon</TableHead>
                        <TableHead className="text-right">Cashback</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scrapedDeals.map((d, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium max-w-[200px] truncate">{d.deal_name}</TableCell>
                          <TableCell>{d.partner_site || "—"}</TableCell>
                          <TableCell className="text-right">₹{d.expected_price}</TableCell>
                          <TableCell>{d.coupon_code || "—"}</TableCell>
                          <TableCell className="text-right">{d.cashback_percent || 0}%</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleImportDeal(i, d)}
                              disabled={importingIds.has(i)}
                            >
                              {importingIds.has(i) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Import"
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

const ResultCard = ({ label, value, good }: { label: string; value: string; good: boolean }) => (
  <div className={`rounded-lg border p-3 ${good ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5"}`}>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={`text-sm font-semibold ${good ? "text-emerald-600" : "text-destructive"}`}>{value}</p>
  </div>
);

export default AutoValidate;
