import { useState, useMemo } from "react";
import { useDealContext } from "@/context/DealContext";
import { PriorityBadge } from "@/components/StatusBadge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

const Alerts = () => {
  const { alerts, toggleAlertResolved, partnerSites, deals } = useDealContext();
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterSite, setFilterSite] = useState("all");

  const getDealSite = (dealId: string) => deals.find(d => d.id === dealId)?.partner_site || "";

  const filtered = useMemo(() => alerts.filter(a => {
    if (filterPriority !== "all" && a.priority !== filterPriority) return false;
    if (filterSite !== "all" && getDealSite(a.deal_id) !== filterSite) return false;
    return true;
  }), [alerts, filterPriority, filterSite]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Alerts & Notifications</h1>
      <div className="flex gap-3">
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSite} onValueChange={setFilterSite}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Partner Site" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sites</SelectItem>
            {partnerSites.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Deal ID</TableHead>
              <TableHead>Issue Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Time Detected</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Resolved</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No alerts</TableCell></TableRow>
            ) : filtered.map(a => (
              <TableRow key={a.id} className={a.is_resolved ? "opacity-50" : ""}>
                <TableCell className="font-medium">{a.deal_id.slice(0, 8)}</TableCell>
                <TableCell>{a.alert_type}</TableCell>
                <TableCell className="max-w-[250px] truncate text-sm">{a.description}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{format(new Date(a.created_at), "dd MMM, HH:mm")}</TableCell>
                <TableCell><PriorityBadge priority={a.priority} /></TableCell>
                <TableCell><Switch checked={a.is_resolved} onCheckedChange={() => toggleAlertResolved(a.id, a.is_resolved)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Alerts;
