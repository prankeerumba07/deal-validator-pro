import { useMemo } from "react";
import { useDealContext } from "@/context/DealContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AlertTriangle, CheckCircle2, TrendingDown, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const PartnerHealth = () => {
  const { deals, validationResults, alerts } = useDealContext();

  const partnerStats = useMemo(() => {
    const partners = new Map<string, { total: number; valid: number; invalid: number; pending: number; errors: Map<string, number> }>();

    deals.forEach(d => {
      if (!partners.has(d.partner_site)) {
        partners.set(d.partner_site, { total: 0, valid: 0, invalid: 0, pending: 0, errors: new Map() });
      }
      const p = partners.get(d.partner_site)!;
      p.total++;
      if (d.status === "valid") p.valid++;
      else if (d.status === "invalid") p.invalid++;
      else p.pending++;
    });

    // Count error types per partner
    alerts.forEach(a => {
      const deal = deals.find(d => d.id === a.deal_id);
      if (!deal) return;
      const p = partners.get(deal.partner_site);
      if (!p) return;
      const count = p.errors.get(a.alert_type) || 0;
      p.errors.set(a.alert_type, count + 1);
    });

    return Array.from(partners.entries()).map(([name, stats]) => {
      const passRate = stats.total > 0 ? Math.round((stats.valid / stats.total) * 100) : 0;
      const topErrors = Array.from(stats.errors.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      return { name, ...stats, passRate, topErrors };
    }).sort((a, b) => a.passRate - b.passRate);
  }, [deals, alerts]);

  const chartData = partnerStats.map(p => ({
    name: p.name,
    passRate: p.passRate,
    total: p.total,
  }));

  const overallPassRate = useMemo(() => {
    const total = deals.filter(d => d.status !== "pending").length;
    const valid = deals.filter(d => d.status === "valid").length;
    return total > 0 ? Math.round((valid / total) * 100) : 0;
  }, [deals]);

  const alertPartners = partnerStats.filter(p => p.passRate < 80 && p.total > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Partner Health Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor deal validation pass rates across partner sites</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2"><Activity className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{partnerStats.length}</p><p className="text-xs text-muted-foreground">Partners</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
            <div><p className="text-2xl font-bold">{overallPassRate}%</p><p className="text-xs text-muted-foreground">Overall Pass Rate</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
            <div className="rounded-lg bg-destructive/10 p-2"><TrendingDown className="h-5 w-5 text-destructive" /></div>
            <div><p className="text-2xl font-bold">{alertPartners.length}</p><p className="text-xs text-muted-foreground">Below 80%</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
            <div><p className="text-2xl font-bold">{alerts.filter(a => !a.is_resolved).length}</p><p className="text-xs text-muted-foreground">Open Alerts</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Alert Banner */}
      {alertPartners.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold">Pass rate below 80%:</span>
              {alertPartners.map(p => (
                <Badge key={p.name} variant="outline" className="border-destructive/30 text-destructive">{p.name} ({p.passRate}%)</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pass Rate Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pass Rate by Partner</CardTitle>
            <CardDescription>Percentage of deals passing validation per partner site</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} className="text-xs" />
                  <Tooltip formatter={(value: number) => [`${value}%`, "Pass Rate"]} />
                  <Bar dataKey="passRate" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.passRate >= 80 ? "hsl(142, 71%, 45%)" : entry.passRate >= 50 ? "hsl(38, 92%, 50%)" : "hsl(0, 84%, 60%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Partner Details Table */}
      <Card>
        <CardHeader><CardTitle>Partner Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Valid</TableHead>
                  <TableHead className="text-right">Invalid</TableHead>
                  <TableHead>Pass Rate</TableHead>
                  <TableHead>Top Errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partnerStats.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No data yet</TableCell></TableRow>
                ) : partnerStats.map(p => (
                  <TableRow key={p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{p.total}</TableCell>
                    <TableCell className="text-right text-emerald-600">{p.valid}</TableCell>
                    <TableCell className="text-right text-destructive">{p.invalid}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={p.passRate} className="w-16 h-2" />
                        <span className={cn("text-sm font-medium", p.passRate >= 80 ? "text-emerald-600" : p.passRate >= 50 ? "text-amber-600" : "text-destructive")}>
                          {p.passRate}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {p.topErrors.length === 0 ? <span className="text-xs text-muted-foreground">—</span> : p.topErrors.map(([type, count]) => (
                          <Badge key={type} variant="outline" className="text-[10px]">{type.replace(/_/g, " ")} ({count})</Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnerHealth;
