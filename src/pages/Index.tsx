import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDealContext } from "@/context/DealContext";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";

const Index = () => {
  const { deals, partnerSites, validateAllDeals, isLoading } = useDealContext();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterSite, setFilterSite] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = useMemo(() => deals.filter(d => {
    if (filterSite !== "all" && d.partner_site !== filterSite) return false;
    if (filterStatus !== "all" && d.status !== filterStatus) return false;
    if (search && !d.id.toLowerCase().includes(search.toLowerCase()) && !d.product_url.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [deals, filterSite, filterStatus, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => validateAllDeals()}><RefreshCw className="mr-2 h-4 w-4" />Validate All</Button>
          <Button onClick={() => navigate("/add-deal")}><PlusCircle className="mr-2 h-4 w-4" />Add New Deal</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search Deal ID or URL..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={filterSite} onValueChange={setFilterSite}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Partner Site" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sites</SelectItem>
            {partnerSites.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="valid">Valid</SelectItem>
            <SelectItem value="invalid">Invalid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Deal ID</TableHead>
              <TableHead>Partner Site</TableHead>
              <TableHead>Product URL</TableHead>
              <TableHead className="text-right">Expected Price</TableHead>
              <TableHead>Coupon</TableHead>
              <TableHead className="text-right">Cashback %</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Checked</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No deals found</TableCell></TableRow>
            ) : filtered.map(d => (
              <TableRow key={d.id} className="cursor-pointer" onClick={() => navigate(`/deal/${d.id}`)}>
                <TableCell className="font-medium">{d.id.slice(0, 8)}</TableCell>
                <TableCell>{d.partner_site}</TableCell>
                <TableCell><a href={d.product_url} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4 hover:opacity-80" onClick={e => e.stopPropagation()}>{d.product_url.slice(0, 35)}...</a></TableCell>
                <TableCell className="text-right">₹{d.expected_price}</TableCell>
                <TableCell>{d.coupon_code || "—"}</TableCell>
                <TableCell className="text-right">{d.expected_cashback}%</TableCell>
                <TableCell><StatusBadge status={d.status} /></TableCell>
                <TableCell className="text-muted-foreground text-sm">{d.last_checked_at ? format(new Date(d.last_checked_at), "dd MMM, HH:mm") : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Index;
