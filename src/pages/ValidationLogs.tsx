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

  const getDealSite = (dealId: string) => deals.find(d => d.id === dealId)?.partner_site || "";

  const filtered = useMemo(() => logs.filter(l => {
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (filterSite !== "all" && getDealSite(l.deal_id) !== filterSite) return false;
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
            <SelectItem value="valid">Valid</SelectItem>
            <SelectItem value="invalid">Invalid</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Deal ID</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Run ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No logs found</TableCell></TableRow>
            ) : filtered.map(l => (
              <TableRow key={l.id} className="cursor-pointer" onClick={() => navigate(`/deal/${l.deal_id}`)}>
                <TableCell className="font-medium">{l.deal_id.slice(0, 8)}</TableCell>
                <TableCell className="text-muted-foreground">{format(new Date(l.created_at), "dd MMM yyyy, HH:mm")}</TableCell>
                <TableCell><StatusBadge status={l.status} /></TableCell>
                <TableCell className="max-w-[250px] truncate text-sm text-muted-foreground">{l.message}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{l.run_id || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ValidationLogs;
