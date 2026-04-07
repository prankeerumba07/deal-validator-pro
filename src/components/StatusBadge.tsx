import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  return (
    <Badge className={cn(
      "text-xs capitalize",
      s === "valid" && "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/20",
      s === "invalid" && "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20",
      s === "pending" && "bg-amber-500/15 text-amber-700 border-amber-500/30 hover:bg-amber-500/20",
    )} variant="outline">
      {status}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const p = priority.toLowerCase();
  return (
    <Badge className={cn(
      "text-xs capitalize",
      p === "high" && "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20",
      p === "medium" && "bg-orange-500/15 text-orange-700 border-orange-500/30 hover:bg-orange-500/20",
      p === "low" && "bg-amber-500/15 text-amber-700 border-amber-500/30 hover:bg-amber-500/20",
    )} variant="outline">
      {priority}
    </Badge>
  );
}
