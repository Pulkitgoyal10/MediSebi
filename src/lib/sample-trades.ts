// Random sample "trade" data for analytics until the ML model is wired up.
// A "trade" = any inventory movement (incoming restock order or outgoing sale).
// Replace `generateSampleTrades()` output with real ML / backend data later.

import { subDays, format } from "date-fns";

export type TradeType = "buy" | "sell";
export type TradeStatus = "pending" | "completed" | "cancelled";

export type Trade = {
  id: string;
  date: string; // ISO
  medicine: string;
  category: string;
  type: TradeType;
  quantity: number;
  unit_price: number;
  total: number;
  status: TradeStatus;
  supplier_or_buyer: string;
};

const MEDICINES = [
  { name: "Paracetamol 500mg", category: "Analgesic" },
  { name: "Amoxicillin 250mg", category: "Antibiotic" },
  { name: "Cetirizine 10mg", category: "Antihistamine" },
  { name: "Ibuprofen 400mg", category: "Analgesic" },
  { name: "Metformin 500mg", category: "Diabetes" },
  { name: "Atorvastatin 20mg", category: "Cardiac" },
  { name: "Omeprazole 20mg", category: "Gastric" },
  { name: "Azithromycin 500mg", category: "Antibiotic" },
  { name: "Vitamin D3", category: "Supplement" },
  { name: "Cough Syrup", category: "Respiratory" },
  { name: "ORS Sachet", category: "Hydration" },
  { name: "Insulin Glargine", category: "Diabetes" },
];

const PARTIES = [
  "MediCorp Distributors",
  "PharmaPlus Supplies",
  "Walk-in Customer",
  "Sunrise Hospital",
  "City Clinic",
  "GreenLeaf Pharma",
  "HealthFirst Wholesale",
];

function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Deterministic-ish but varied sample. Generates `days` worth of trades. */
export function generateSampleTrades(days = 30, perDay = 8): Trade[] {
  const trades: Trade[] = [];
  for (let d = 0; d < days; d++) {
    const date = subDays(new Date(), days - 1 - d);
    const count = randInt(Math.max(2, perDay - 4), perDay + 4);
    for (let i = 0; i < count; i++) {
      const med = rand(MEDICINES);
      const type: TradeType = Math.random() < 0.35 ? "buy" : "sell";
      const qty = type === "buy" ? randInt(20, 200) : randInt(1, 25);
      const price = Math.round((Math.random() * 18 + 2) * 100) / 100;
      const status: TradeStatus =
        Math.random() < 0.85 ? "completed" : Math.random() < 0.7 ? "pending" : "cancelled";
      trades.push({
        id: `t-${d}-${i}`,
        date: date.toISOString(),
        medicine: med.name,
        category: med.category,
        type,
        quantity: qty,
        unit_price: price,
        total: Math.round(qty * price * 100) / 100,
        status,
        supplier_or_buyer:
          type === "buy"
            ? rand(PARTIES.slice(0, 2).concat(PARTIES.slice(5)))
            : rand(PARTIES.slice(2, 5)),
      });
    }
  }
  return trades;
}

// ---------- aggregations ----------

export function tradesByDay(trades: Trade[]) {
  const map = new Map<string, { date: string; buy: number; sell: number; revenue: number }>();
  for (const t of trades) {
    const key = format(new Date(t.date), "MMM d");
    const cur = map.get(key) ?? { date: key, buy: 0, sell: 0, revenue: 0 };
    if (t.type === "buy") cur.buy += t.quantity;
    else {
      cur.sell += t.quantity;
      if (t.status === "completed") cur.revenue += t.total;
    }
    map.set(key, cur);
  }
  return Array.from(map.values());
}

export function topMedicines(trades: Trade[], limit = 6) {
  const map = new Map<string, number>();
  for (const t of trades) {
    if (t.type !== "sell" || t.status !== "completed") continue;
    map.set(t.medicine, (map.get(t.medicine) ?? 0) + t.quantity);
  }
  return Array.from(map.entries())
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

export function statusBreakdown(trades: Trade[]) {
  const map = new Map<TradeStatus, number>();
  for (const t of trades) map.set(t.status, (map.get(t.status) ?? 0) + 1);
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

export function categoryRevenue(trades: Trade[]) {
  const map = new Map<string, number>();
  for (const t of trades) {
    if (t.type !== "sell" || t.status !== "completed") continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.total);
  }
  return Array.from(map.entries())
    .map(([category, revenue]) => ({ category, revenue: Math.round(revenue) }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function cumulativeRevenue(trades: Trade[]) {
  const byDay = tradesByDay(trades);
  let acc = 0;
  return byDay.map((d) => {
    acc += d.revenue;
    return { date: d.date, cumulative: Math.round(acc) };
  });
}
