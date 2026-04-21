import { Info, AlertTriangle, ShieldAlert, Pill, Activity } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getMedicineInfo } from "@/lib/medicine-info";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  medicineName: string | null;
  category?: string | null;
};

export function MedicineInfoDialog({ open, onOpenChange, medicineName, category }: Props) {
  if (!medicineName) return null;
  const info = getMedicineInfo(medicineName);

  const scheduleTone =
    info.schedule === "H" || info.schedule === "H1" || info.schedule === "X"
      ? "bg-destructive/15 text-destructive"
      : "bg-success/15 text-success";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            {medicineName}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            {category && <Badge variant="outline">{category}</Badge>}
            {info.schedule && (
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${scheduleTone}`}
              >
                Schedule {info.schedule}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Section icon={Activity} title="Common uses" tone="primary">
            <ul className="list-inside list-disc space-y-0.5 text-sm text-foreground">
              {info.uses.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </Section>

          <Section icon={ShieldAlert} title="Restrictions & contraindications" tone="warning">
            <ul className="list-inside list-disc space-y-0.5 text-sm text-foreground">
              {info.restrictions.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </Section>

          <Section icon={AlertTriangle} title="Allergy triggers" tone="destructive">
            <ul className="list-inside list-disc space-y-0.5 text-sm text-foreground">
              {info.allergies.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </Section>

          <Section icon={Info} title="Side effects" tone="muted">
            <ul className="list-inside list-disc space-y-0.5 text-sm text-foreground">
              {info.sideEffects.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </Section>

          <p className="rounded-md border border-border bg-muted/40 p-2 text-[11px] text-muted-foreground">
            ⚠️ Always confirm with the patient's prescription and ask about known allergies before
            dispensing. This information is for reference only.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  icon: Icon,
  title,
  tone,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tone: "primary" | "warning" | "destructive" | "muted";
  children: React.ReactNode;
}) {
  const tones = {
    primary: "border-primary/30 bg-primary/5 text-primary",
    warning: "border-warning/40 bg-warning/5 text-warning-foreground",
    destructive: "border-destructive/30 bg-destructive/5 text-destructive",
    muted: "border-border bg-muted/40 text-muted-foreground",
  }[tone];
  return (
    <div className={`rounded-lg border p-3 ${tones}`}>
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </p>
      {children}
    </div>
  );
}
