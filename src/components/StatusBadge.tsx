import { cn } from "@/lib/utils";
import type { MedicineStatus } from "@/lib/medicine-logic";
import { statusLabel } from "@/lib/medicine-logic";

const styles: Record<MedicineStatus, string> = {
  expired: "bg-destructive/15 text-destructive border-destructive/30",
  expiring: "bg-warning/15 text-warning-foreground border-warning/40",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  low: "bg-warning/15 text-warning-foreground border-warning/40",
  excess: "bg-info/15 text-info border-info/30",
  ok: "bg-success/15 text-success border-success/30",
};

export function StatusBadge({ status }: { status: MedicineStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        styles[status]
      )}
    >
      {statusLabel(status)}
    </span>
  );
}
