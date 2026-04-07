import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDealContext } from "@/context/DealContext";
import { StatusBadge } from "@/components/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

const ValidationLogs = () => {
  const { logs, partnerSites, deals } = useDealContext();
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSite, setFilterSite] = useState("all");

  const getDealSite = (dealId: string) => deals.find(d => d.id === dealId)?.partnerSite || "";

  const filtered = useMemo(() => logs.filter(l => {
    if (filterStatus !== "all" && l.result !== filterStatus) return false;
    if (filterSite !== "all" && getDealSite(l.dealId) !== filterSite) return false;
    return true;
  }), [logs, filterStatus, filterSite]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Validation Logs</h1>
      <div className="flex gap-3">
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
            <SelectItem value="Valid">Valid</SelectItem>
            <SelectItem value="Invalid">Invalid</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Deal ID</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead className="text-right">Actual Price</TableHead>
              <TableHead>Coupon Status</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Reason Summary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No logs found</TableCell></TableRow>
            ) : filtered.map(l => (
              <TableRow key={l.id} className="cursor-pointer" onClick={() => navigate(`/deal/${l.dealId}`)}>
                <TableCell className="font-medium">{l.dealId}</TableCell>
                <TableCell className="text-muted-foreground">{format(new Date(l.dateTime), "dd MMM yyyy, HH:mm")}</TableCell>
                <TableCell className="text-right">₹{l.actualPrice}</TableCell>
                <TableCell>{l.couponStatus}</TableCell>
                <TableCell><StatusBadge status={l.result} /></TableCell>
                <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{l.reasonSummary}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ValidationLogs;
