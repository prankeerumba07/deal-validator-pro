import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DealStatus, AlertPriority } from "@/types/deal";

export function StatusBadge({ status }: { status: DealStatus }) {
  return (
    <Badge className={cn(
      "text-xs",
      status === "Valid" && "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/20",
      status === "Invalid" && "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20",
      status === "Pending" && "bg-amber-500/15 text-amber-700 border-amber-500/30 hover:bg-amber-500/20",
    )} variant="outline">
      {status}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: AlertPriority }) {
  return (
    <Badge className={cn(
      "text-xs",
      priority === "High" && "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20",
      priority === "Medium" && "bg-orange-500/15 text-orange-700 border-orange-500/30 hover:bg-orange-500/20",
      priority === "Low" && "bg-amber-500/15 text-amber-700 border-amber-500/30 hover:bg-amber-500/20",
    )} variant="outline">
      {priority}
    </Badge>
  );
}
