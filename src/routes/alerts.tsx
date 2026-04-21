import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, TrendingDown, AlertOctagon, Lightbulb } from "lucide-react";
import { listMedicines } from "@/server/medicines.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import {
  daysUntilExpiry,
  getStatus,
  getAlternatives,
  getSellFirst,
  type Medicine,
} from "@/lib/medicine-logic";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts & Insights — MediSebi" },
      { name: "description", content: "Expiry alerts, shortage predictions and sell-first recommendations." },
    ],
  }),
  component: AlertsPage,
});

function MedRow({ m }: { m: Medicine }) {
  const days = daysUntilExpiry(m.expiry_date);
  const alts = getAlternatives(m.name);
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{m.name}</p>
        <p className="text-xs text-muted-foreground">
          Qty {m.quantity} • {days < 0 ? `expired ${-days}d ago` : `expires in ${days}d`}
          {alts.length > 0 && (
            <>
              {" • "}
              <span className="text-foreground/70">Alt: {alts.join(", ")}</span>
            </>
          )}
        </p>
      </div>
      <StatusBadge status={getStatus(m)} />
    </div>
  );
}

function AlertsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["medicines"],
    queryFn: () => listMedicines(),
  });
  const meds: Medicine[] = data?.medicines ?? [];

  const expiring = meds
    .filter((m) => {
      const d = daysUntilExpiry(m.expiry_date);
      return d >= 0 && d < 7;
    })
    .sort((a, b) => daysUntilExpiry(a.expiry_date) - daysUntilExpiry(b.expiry_date));

  const lowStock = meds.filter((m) => m.quantity < 10 && m.quantity >= 5);
  const shortage = meds.filter((m) => m.quantity < 5);
  const sellFirst = getSellFirst(meds, 6);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading insights…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-warning" />
              Expiring within 7 days ({expiring.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {expiring.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items expiring soon. ✓</p>
            ) : (
              expiring.map((m) => <MedRow key={m.id} m={m} />)
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertOctagon className="h-4 w-4 text-destructive" />
              Will run out soon ({shortage.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {shortage.length === 0 ? (
              <p className="text-sm text-muted-foreground">No critical shortages. ✓</p>
            ) : (
              shortage.map((m) => <MedRow key={m.id} m={m} />)
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4 text-warning" />
              Low stock ({lowStock.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">All stocked above threshold. ✓</p>
            ) : (
              lowStock.map((m) => <MedRow key={m.id} m={m} />)
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-primary" />
              Sell first ({sellFirst.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sellFirst.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing approaching expiry.</p>
            ) : (
              sellFirst.map((m) => <MedRow key={m.id} m={m} />)
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
