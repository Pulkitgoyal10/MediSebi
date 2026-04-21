import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useLiveTrades } from "@/hooks/use-live-trades";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, RefreshCw, TrendingUp, ArrowDownUp, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  tradesByDay,
  topMedicines,
  statusBreakdown,
  categoryRevenue,
  cumulativeRevenue,
} from "@/lib/sample-trades";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Trade Analytics — MediSebi" },
      {
        name: "description",
        content:
          "Visualize all medicine trades — purchases, sales, revenue, status and category breakdowns.",
      },
    ],
  }),
  component: AnalyticsPage,
});

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--primary)",
];

const STATUS_COLORS: Record<string, string> = {
  completed: "var(--chart-2)",
  pending: "var(--chart-4)",
  cancelled: "var(--destructive)",
};

function AnalyticsPage() {
  const { trades, tick } = useLiveTrades(30, 8, 10_000);

  const daily = useMemo(() => tradesByDay(trades), [trades]);
  const top = useMemo(() => topMedicines(trades), [trades]);
  const status = useMemo(() => statusBreakdown(trades), [trades]);
  const byCategory = useMemo(() => categoryRevenue(trades), [trades]);
  const cumulative = useMemo(() => cumulativeRevenue(trades), [trades]);

  const totalTrades = trades.length;
  const totalRevenue = Math.round(
    trades
      .filter((t) => t.type === "sell" && t.status === "completed")
      .reduce((s, t) => s + t.total, 0)
  );
  const totalPurchased = trades
    .filter((t) => t.type === "buy")
    .reduce((s, t) => s + t.quantity, 0);
  const completionRate =
    Math.round((trades.filter((t) => t.status === "completed").length / totalTrades) * 100) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
            <BarChart3 className="h-5 w-5 text-primary" />
            Trade Analytics
          </h2>
          <p className="text-sm text-muted-foreground">
            Visualizing all medicine trades across the last 30 days.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
            Live • auto-refresh 10s (tick #{tick})
          </Badge>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Re-sample
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total trades" value={totalTrades} icon={ArrowDownUp} tone="primary" />
        <KpiCard
          label="Revenue"
          value={`₹${totalRevenue.toLocaleString()}`}
          icon={TrendingUp}
          tone="success"
        />
        <KpiCard
          label="Units purchased"
          value={totalPurchased.toLocaleString()}
          icon={Activity}
          tone="warning"
        />
        <KpiCard
          label="Completion rate"
          value={`${completionRate}%`}
          icon={BarChart3}
          tone="primary"
        />
      </div>

      {/* Row 1: Buy vs Sell over time */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buy vs sell volume (last 30 days)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Daily quantity traded, split by direction.
          </p>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daily} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
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
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="buy"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={false}
                name="Bought (units)"
              />
              <Line
                type="monotone"
                dataKey="sell"
                stroke="var(--chart-2)"
                strokeWidth={2}
                dot={false}
                name="Sold (units)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Row 2: top meds bar + status pie */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Top selling medicines</CardTitle>
            <p className="text-xs text-muted-foreground">By units sold (completed).</p>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top} layout="vertical" margin={{ top: 8, right: 24, left: 16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  width={130}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--popover-foreground)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="quantity" radius={[0, 6, 6, 0]}>
                  {top.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trade status</CardTitle>
            <p className="text-xs text-muted-foreground">Completed / pending / cancelled.</p>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={status}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={84}
                  paddingAngle={2}
                >
                  {status.map((s, i) => (
                    <Cell key={i} fill={STATUS_COLORS[s.name] ?? CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--popover-foreground)",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: revenue by category + cumulative area */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by category</CardTitle>
            <p className="text-xs text-muted-foreground">Where the money is coming from.</p>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="category" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--popover-foreground)",
                    fontSize: 12,
                  }}
                  formatter={(v) => `₹${Number(v).toLocaleString()}`}
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cumulative revenue</CardTitle>
            <p className="text-xs text-muted-foreground">Growth across the period.</p>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulative} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
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
                  formatter={(v) => `₹${Number(v).toLocaleString()}`}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#revGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "warning" | "success" | "destructive";
}) {
  const toneClasses = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/15 text-warning-foreground",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/15 text-destructive",
  }[tone];
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${toneClasses}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-0.5 text-2xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
