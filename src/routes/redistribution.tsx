import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ArrowLeftRight, PackagePlus, PackageMinus } from "lucide-react";
import { listMedicines } from "@/server/medicines.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRedistribution, type Medicine } from "@/lib/medicine-logic";

export const Route = createFileRoute("/redistribution")({
  head: () => ({
    meta: [
      { title: "Redistribution — MediSebi" },
      { name: "description", content: "Smart suggestions to move excess stock to where it's needed." },
    ],
  }),
  component: RedistributionPage,
});

function RedistributionPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["medicines"],
    queryFn: () => listMedicines(),
  });
  const meds: Medicine[] = data?.medicines ?? [];

  const excess = meds.filter((m) => m.quantity > 50);
  const lowStock = meds.filter((m) => m.quantity < 10);
  const suggestions = getRedistribution(meds);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PackagePlus className="h-4 w-4 text-info" />
              Excess stock ({excess.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground">Quantity above 50</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {excess.length === 0 ? (
              <p className="text-sm text-muted-foreground">No excess inventory.</p>
            ) : (
              excess.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-info/30 bg-info/5 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.category ?? "—"}</p>
                  </div>
                  <span className="rounded-md bg-info/15 px-2.5 py-1 text-sm font-semibold text-info tabular-nums">
                    {m.quantity}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PackageMinus className="h-4 w-4 text-destructive" />
              Needs more ({lowStock.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground">Quantity below 10</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">All items adequately stocked.</p>
            ) : (
              lowStock.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.category ?? "—"}</p>
                  </div>
                  <span className="rounded-md bg-destructive/15 px-2.5 py-1 text-sm font-semibold text-destructive tabular-nums">
                    {m.quantity}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            Transfer suggestions ({suggestions.length})
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Rule-based pairings of surplus → shortage. Same category preferred.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No transfers needed right now. Add stock variance to see suggestions.
            </p>
          ) : (
            suggestions.map((s, i) => (
              <div
                key={i}
                className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center"
              >
                <div className="flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    From (excess)
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">{s.excess.name}</p>
                  <p className="text-xs text-muted-foreground">Qty {s.excess.quantity}</p>
                </div>

                <div className="flex items-center gap-2 self-center rounded-full bg-primary/10 px-3 py-1.5 text-primary">
                  <span className="text-sm font-semibold">Transfer {s.transferUnits} units</span>
                  <ArrowRight className="h-4 w-4" />
                </div>

                <div className="flex-1 sm:text-right">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    To (low stock)
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">{s.needs.name}</p>
                  <p className="text-xs text-muted-foreground">Qty {s.needs.quantity}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
