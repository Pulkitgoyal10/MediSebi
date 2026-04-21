import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Siren,
  Hospital,
  Search,
  Phone,
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listMedicines, sellMedicine } from "@/server/medicines.functions";
import { type Medicine, daysUntilExpiry } from "@/lib/medicine-logic";
import { MedicineInfoDialog } from "@/components/MedicineInfoDialog";

export const Route = createFileRoute("/emergency")({
  head: () => ({
    meta: [
      { title: "Emergency Dispatch — MediSebi" },
      {
        name: "description",
        content:
          "Send emergency medicines to hospitals and clinics with priority dispatch and live ping.",
      },
    ],
  }),
  component: EmergencyPage,
});

const HOSPITALS = [
  { id: "h1", name: "City General Hospital", phone: "+91 22 2200 0001", distance: 1.4 },
  { id: "h2", name: "Lifeline Multi-Specialty", phone: "+91 22 2200 0002", distance: 2.7 },
  { id: "h3", name: "Apex Trauma Centre", phone: "+91 22 2200 0003", distance: 4.1 },
  { id: "h4", name: "Sunrise Children's Clinic", phone: "+91 22 2200 0004", distance: 0.9 },
  { id: "h5", name: "Bandra Heart Institute", phone: "+91 22 2200 0005", distance: 5.6 },
];

type Priority = "critical" | "urgent" | "high";
type DispatchLog = {
  id: string;
  hospital: string;
  medicine: string;
  quantity: number;
  priority: Priority;
  notes: string;
  at: Date;
  eta: number; // minutes
  status: "pinged" | "acknowledged" | "delivered";
};

function EmergencyPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["medicines"],
    queryFn: () => listMedicines(),
    refetchInterval: 40_000,
  });
  const meds: Medicine[] = data?.medicines ?? [];

  const [hospitalId, setHospitalId] = useState(HOSPITALS[0].id);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Medicine | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [priority, setPriority] = useState<Priority>("urgent");
  const [notes, setNotes] = useState("");
  const [logs, setLogs] = useState<DispatchLog[]>([]);
  const [infoOpen, setInfoOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = meds.filter((m) => m.quantity > 0);
    if (!q) return list.slice(0, 12);
    return list
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) || (m.category ?? "").toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [meds, search]);

  const hospital = HOSPITALS.find((h) => h.id === hospitalId)!;

  const pingMut = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Pick a medicine");
      if (quantity <= 0) throw new Error("Quantity must be > 0");
      if (quantity > selected.quantity)
        throw new Error(`Only ${selected.quantity} units in stock`);
      // Deduct from inventory immediately for emergency dispatch
      await sellMedicine({ data: { id: selected.id, quantity } });
      return true;
    },
    onSuccess: () => {
      const eta = priority === "critical" ? 8 : priority === "urgent" ? 15 : 25;
      const newLog: DispatchLog = {
        id: `d-${Date.now()}`,
        hospital: hospital.name,
        medicine: selected!.name,
        quantity,
        priority,
        notes,
        at: new Date(),
        eta,
        status: "pinged",
      };
      setLogs((l) => [newLog, ...l].slice(0, 10));
      toast.success(
        `🚨 Emergency ping sent to ${hospital.name} — ${selected!.name} ×${quantity} • ETA ${eta} min`,
        { duration: 5000 }
      );
      // Simulate hospital acknowledgement
      setTimeout(() => {
        setLogs((l) =>
          l.map((log) => (log.id === newLog.id ? { ...log, status: "acknowledged" } : log))
        );
        toast.info(`✓ ${hospital.name} acknowledged the dispatch`);
      }, 3500);
      qc.invalidateQueries({ queryKey: ["medicines"] });
      setQuantity(1);
      setNotes("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const priorityTone = {
    critical: "bg-destructive/15 text-destructive border-destructive/40",
    urgent: "bg-warning/15 text-warning-foreground border-warning/40",
    high: "bg-primary/10 text-primary border-primary/30",
  }[priority];

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div
        className="rounded-2xl border border-destructive/40 p-4 text-destructive-foreground shadow-sm sm:p-6"
        style={{
          background:
            "linear-gradient(135deg, hsl(0 75% 55%), hsl(15 85% 55%))",
        }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm/6 opacity-90">
              <Siren className="h-4 w-4" /> Emergency Dispatch
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
              Send life-saving medicines to hospitals — instantly
            </h2>
            <p className="mt-2 max-w-xl text-xs opacity-90 sm:text-sm">
              Ping hospitals & clinics with priority. Stock deducts automatically. Hospital ack
              within seconds.
            </p>
          </div>
          <Badge variant="secondary" className="gap-1.5 self-start text-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
            Live channel
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Form */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Hospital className="h-4 w-4 text-primary" />
              New emergency dispatch
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Hospital */}
            <div>
              <Label className="text-xs">Hospital / clinic</Label>
              <Select value={hospitalId} onValueChange={setHospitalId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOSPITALS.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name} • {h.distance} km
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" /> {hospital.phone}
              </p>
            </div>

            {/* Medicine search */}
            <div>
              <Label className="text-xs">Medicine</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search inventory…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-border">
                {filtered.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    No matching stock.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {filtered.map((m) => {
                      const active = selected?.id === m.id;
                      return (
                        <li
                          key={m.id}
                          className={`flex items-center justify-between gap-2 p-2 text-sm ${
                            active ? "bg-primary/10" : "hover:bg-muted/50"
                          }`}
                        >
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => setSelected(m)}
                          >
                            <p className="truncate font-medium">{m.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {m.quantity} in stock • exp {daysUntilExpiry(m.expiry_date)}d
                            </p>
                          </button>
                          {active && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7"
                              onClick={() => setInfoOpen(true)}
                            >
                              <Info className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Quantity + priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  max={selected?.quantity ?? 1}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  disabled={!selected}
                />
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">🔴 Critical (≤8 min)</SelectItem>
                    <SelectItem value="urgent">🟠 Urgent (≤15 min)</SelectItem>
                    <SelectItem value="high">🟡 High (≤25 min)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs">Notes for hospital staff</Label>
              <Textarea
                placeholder="Patient ward, attending doctor, special instructions…"
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 300))}
                rows={2}
              />
            </div>

            {/* Confirm strip */}
            {selected && (
              <div className={`rounded-lg border p-3 ${priorityTone}`}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="text-xs">
                    Dispatch <b>{quantity}</b> units of <b>{selected.name}</b> to{" "}
                    <b>{hospital.name}</b> ({hospital.distance} km) on <b>{priority}</b> priority.
                    Stock will deduct on ping.
                  </div>
                </div>
              </div>
            )}

            <Button
              size="lg"
              className="w-full"
              variant="destructive"
              disabled={!selected || pingMut.isPending}
              onClick={() => pingMut.mutate()}
            >
              <Send className="mr-2 h-4 w-4" />
              {pingMut.isPending ? "Pinging…" : "🚨 Ping hospital now"}
            </Button>
          </CardContent>
        </Card>

        {/* Activity log */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" />
              Recent dispatches
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {logs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No dispatches yet. Pings will appear here.
              </p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg border border-border p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{log.medicine}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        → {log.hospital} • {log.quantity} units
                      </p>
                    </div>
                    <Badge
                      variant={log.status === "delivered" ? "secondary" : "outline"}
                      className="shrink-0 text-[10px] uppercase"
                    >
                      {log.status === "acknowledged" && (
                        <CheckCircle2 className="mr-1 h-3 w-3 text-success" />
                      )}
                      {log.status}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span>{log.at.toLocaleTimeString()}</span>
                    <span>ETA {log.eta} min</span>
                    <span className="capitalize">{log.priority}</span>
                  </div>
                  {log.notes && (
                    <p className="mt-1 text-xs italic text-muted-foreground">"{log.notes}"</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <MedicineInfoDialog
        open={infoOpen}
        onOpenChange={setInfoOpen}
        medicineName={selected?.name ?? null}
        category={selected?.category ?? null}
      />
    </div>
  );
}
