import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Package,
  AlertTriangle,
  TrendingDown,
  CalendarClock,
  Sparkles,
  ArrowRight,
  Activity,
  Handshake,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { listMedicines } from "@/server/medicines.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { useLiveTrades } from "@/hooks/use-live-trades";
import { tradesByDay, topMedicines } from "@/lib/sample-trades";
import {
  daysUntilExpiry,
  getStatus,
  seasonalSuggestions,
  getSellFirst,
  type Medicine,
} from "@/lib/medicine-logic";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — MediSebi" },
      { name: "description", content: "Overview of inventory health, alerts and seasonal recommendations." },
    ],
  }),
  component: Dashboard,
});

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "primary" | "warning" | "destructive" | "success";
}) {
  const toneClasses = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/15 text-warning-foreground",
    destructive: "bg-destructive/15 text-destructive",
    success: "bg-success/15 text-success",
  }[tone];
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${toneClasses}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-2xl font-bold text-foreground">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["medicines"],
    queryFn: () => listMedicines(),
  });
  const meds: Medicine[] = data?.medicines ?? [];
  const { trades, tick } = useLiveTrades(14, 6, 10_000);

  const total = meds.length;
  const expiring = meds.filter((m) => {
    const d = daysUntilExpiry(m.expiry_date);
    return d >= 0 && d < 7;
  }).length;
  const lowStock = meds.filter((m) => m.quantity < 10).length;
  const excess = meds.filter((m) => m.quantity > 50).length;

  const topAlerts = [...meds]
    .map((m) => ({ m, status: getStatus(m), days: daysUntilExpiry(m.expiry_date) }))
    .filter(({ status }) => status === "expiring" || status === "critical" || status === "expired")
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);

  const sellFirst = getSellFirst(meds, 4);
  const season = seasonalSuggestions();

  // Live trade derivations
  const daily = tradesByDay(trades);
  const topSold = topMedicines(trades, 5);
  const todayRevenue = Math.round(
    trades
      .filter((t) => t.type === "sell" && t.status === "completed")
      .reduce((s, t) => s + t.total, 0) / 14
  );
  const todaySales = trades.filter((t) => t.type === "sell").length;

  return (
    <div className="space-y-6">
      {/* Hero greeting */}
      <div
        className="rounded-2xl border border-border p-6 text-primary-foreground shadow-sm"
        style={{ background: "var(--gradient-primary)" }}
      >
        <p className="text-sm/6 opacity-90">Welcome back</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
          Your pharmacy at a glance
        </h2>
        <p className="mt-2 max-w-xl text-sm opacity-90">
          MediSebi monitors expiry, stock, and demand patterns in real time so you
          never lose revenue to waste or shortages.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total medicines" value={isLoading ? "…" : total} icon={Package} tone="primary" />
        <StatCard label="Expiring (<7 days)" value={isLoading ? "…" : expiring} icon={CalendarClock} tone="warning" />
        <StatCard label="Low stock" value={isLoading ? "…" : lowStock} icon={TrendingDown} tone="destructive" />
        <StatCard label="Excess stock" value={isLoading ? "…" : excess} icon={Sparkles} tone="success" />
      </div>

      {/* Live trade activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-primary" />
                Live trade activity
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Buy vs sell volume — last 14 days (sample data)
              </p>
            </div>
            <Badge variant="secondary" className="gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
              Live #{tick}
            </Badge>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashSell" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="dashBuy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--popover-foreground)",
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="buy" stroke="var(--chart-1)" strokeWidth={2} fill="url(#dashBuy)" name="Bought" />
                <Area type="monotone" dataKey="sell" stroke="var(--chart-2)" strokeWidth={2} fill="url(#dashSell)" name="Sold" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top sellers</CardTitle>
            <p className="text-xs text-muted-foreground">
              ₹{todayRevenue.toLocaleString()}/day avg • {todaySales} sales
            </p>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSold} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={10} />
                <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={10} width={90} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="quantity" radius={[0, 4, 4, 0]}>
                  {topSold.map((_, i) => (
                    <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Friendly trade CTA */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Handshake className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Friendly Trade marketplace is live
              </p>
              <p className="text-xs text-muted-foreground">
                Trade surplus stock with nearby pharmacies — avoid expiry, fulfill shortages instantly.
              </p>
            </div>
          </div>
          <Button asChild size="sm">
            <Link to="/marketplace">
              Open marketplace <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Critical alerts */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Critical alerts
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Items needing immediate attention
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/alerts">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {topAlerts.length === 0 ? (
              <p className="rounded-lg bg-success/10 p-4 text-sm text-success">
                ✓ No critical issues. Inventory looks healthy.
              </p>
            ) : (
              topAlerts.map(({ m, status, days }) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty {m.quantity} • {days < 0 ? `Expired ${-days}d ago` : `Expires in ${days}d`}
                    </p>
                  </div>
                  <StatusBadge status={status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Seasonal recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Seasonal picks
            </CardTitle>
            <p className="text-xs capitalize text-muted-foreground">{season.season} season</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">{season.reason}</p>
            <ul className="space-y-1.5">
              {season.items.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 rounded-md bg-accent/40 px-2.5 py-1.5 text-sm text-accent-foreground"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Sell first */}
      {sellFirst.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">💡 Sell these first</CardTitle>
            <p className="text-xs text-muted-foreground">
              Closest to expiry — prioritize to reduce waste
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {sellFirst.map((m) => (
                <div key={m.id} className="rounded-lg border border-border p-3">
                  <p className="truncate text-sm font-medium text-foreground">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {daysUntilExpiry(m.expiry_date)} days left • Qty {m.quantity}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
