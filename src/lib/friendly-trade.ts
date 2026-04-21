// Friendly trade marketplace — pharmacies share stock to avoid expiry & shortages.
// Pure, deterministic-ish sample data. Replace with a real backend later.

import { addDays } from "date-fns";
import { daysUntilExpiry, type Medicine } from "./medicine-logic";

export type Pharmacy = {
  id: string;
  name: string;
  city: string;
  distance_km: number;
  rating: number; // 1-5
  contact_name: string;
  phone: string;
  email: string;
};

export type TradeOfferKind = "offer" | "request";
export type TradeOfferStatus = "open" | "matched" | "completed" | "expired";

export type TradeOffer = {
  id: string;
  kind: TradeOfferKind;
  pharmacy: Pharmacy;
  medicine: string;
  category: string;
  quantity: number;
  expiry_date: string; // ISO (medicine batch expiry)
  unit_price: number;
  posted_at: string; // ISO
  /** Validity window — offer auto-expires from marketplace at this time. */
  valid_until: string; // ISO
  status: TradeOfferStatus;
  reason: string;
  /** Whether the contact details have been shared with the viewer. */
  contact_shared?: boolean;
};

const PHARMACIES: Pharmacy[] = [
  { id: "p1", name: "Sunrise Pharmacy", city: "Bandra West", distance_km: 1.2, rating: 4.8, contact_name: "Rajesh Mehta", phone: "+91 98201 11122", email: "sunrise@medi.in" },
  { id: "p2", name: "GreenLeaf Chemists", city: "Andheri East", distance_km: 3.4, rating: 4.6, contact_name: "Priya Shah", phone: "+91 98202 22233", email: "greenleaf@medi.in" },
  { id: "p3", name: "City Health Mart", city: "Powai", distance_km: 5.8, rating: 4.4, contact_name: "Anil Kumar", phone: "+91 98203 33344", email: "cityhealth@medi.in" },
  { id: "p4", name: "MediHub Express", city: "Dadar", distance_km: 7.1, rating: 4.9, contact_name: "Suresh Iyer", phone: "+91 98204 44455", email: "medihub@medi.in" },
  { id: "p5", name: "HealthFirst Pharma", city: "Thane West", distance_km: 12.5, rating: 4.3, contact_name: "Neha Verma", phone: "+91 98205 55566", email: "healthfirst@medi.in" },
  { id: "p6", name: "Wellness Corner", city: "Juhu", distance_km: 4.2, rating: 4.7, contact_name: "Kiran Joshi", phone: "+91 98206 66677", email: "wellness@medi.in" },
  { id: "p7", name: "CarePoint Pharmacy", city: "Vile Parle", distance_km: 2.9, rating: 4.5, contact_name: "Deepak Rao", phone: "+91 98207 77788", email: "carepoint@medi.in" },
];

const SAMPLE_MEDS = [
  { name: "Paracetamol 500mg", category: "Analgesic", price: 2.5 },
  { name: "Amoxicillin 250mg", category: "Antibiotic", price: 6.8 },
  { name: "Cetirizine 10mg", category: "Antihistamine", price: 1.9 },
  { name: "Ibuprofen 400mg", category: "Analgesic", price: 3.2 },
  { name: "Metformin 500mg", category: "Diabetes", price: 4.1 },
  { name: "Atorvastatin 20mg", category: "Cardiac", price: 7.5 },
  { name: "Omeprazole 20mg", category: "Gastric", price: 5.0 },
  { name: "Azithromycin 500mg", category: "Antibiotic", price: 18.0 },
  { name: "Vitamin D3", category: "Supplement", price: 9.0 },
  { name: "Cough Syrup 100ml", category: "Respiratory", price: 75.0 },
  { name: "ORS Sachet", category: "Hydration", price: 22.0 },
  { name: "Insulin Glargine", category: "Diabetes", price: 850.0 },
  { name: "Loratadine 10mg", category: "Antihistamine", price: 4.5 },
  { name: "Pantoprazole 40mg", category: "Gastric", price: 6.0 },
];

const REASONS_OFFER = [
  "Overstocked — close to expiry",
  "Low local demand this season",
  "Bulk purchase surplus",
  "Returning unsold seasonal stock",
  "Upgrading to new batch",
];

const REASONS_REQUEST = [
  "Sudden surge in demand",
  "Awaiting supplier delivery",
  "Stock-out — need urgent transfer",
  "Seasonal demand spike",
  "Prescription rush this week",
];

function rand<T>(a: readonly T[]): T {
  return a[Math.floor(Math.random() * a.length)];
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Generate sample marketplace offers from other pharmacies. */
export function generateMarketplace(count = 14): TradeOffer[] {
  const out: TradeOffer[] = [];
  for (let i = 0; i < count; i++) {
    const med = rand(SAMPLE_MEDS);
    const pharmacy = rand(PHARMACIES);
    const kind: TradeOfferKind = Math.random() < 0.55 ? "offer" : "request";
    const expiryDays = kind === "offer" ? randInt(20, 180) : randInt(60, 365);
    const status: TradeOfferStatus =
      Math.random() < 0.7 ? "open" : Math.random() < 0.7 ? "matched" : "completed";
    // Short-period validity window: requests are urgent (4-24h), offers (12-72h).
    const validHours = kind === "request" ? randInt(4, 24) : randInt(12, 72);
    out.push({
      id: `m-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      kind,
      pharmacy,
      medicine: med.name,
      category: med.category,
      quantity: randInt(10, 150),
      expiry_date: addDays(new Date(), expiryDays).toISOString(),
      unit_price: med.price,
      posted_at: new Date(Date.now() - randInt(5, 60 * 48) * 60_000).toISOString(),
      valid_until: new Date(Date.now() + validHours * 3_600_000).toISOString(),
      status,
      reason: kind === "offer" ? rand(REASONS_OFFER) : rand(REASONS_REQUEST),
    });
  }
  return out.sort((a, b) => +new Date(b.posted_at) - +new Date(a.posted_at));
}

/** From your own inventory, suggest items to OFFER (excess or near expiry but still safe). */
export function suggestOffersFromInventory(meds: Medicine[]): TradeOffer[] {
  const me: Pharmacy = {
    id: "me",
    name: "Your pharmacy",
    city: "—",
    distance_km: 0,
    rating: 5,
    contact_name: "You",
    phone: "—",
    email: "—",
  };
  return meds
    .filter((m) => {
      const d = daysUntilExpiry(m.expiry_date);
      return (m.quantity > 50 || (d > 14 && d < 90 && m.quantity > 20)) && d >= 7;
    })
    .slice(0, 8)
    .map((m) => {
      const d = daysUntilExpiry(m.expiry_date);
      const reason =
        m.quantity > 50
          ? `Excess stock (${m.quantity} units)`
          : `Approaching expiry in ${d} days`;
      return {
        id: `me-${m.id}`,
        kind: "offer" as const,
        pharmacy: me,
        medicine: m.name,
        category: m.category ?? "General",
        quantity: m.quantity > 50 ? Math.floor(m.quantity * 0.4) : Math.floor(m.quantity * 0.6),
        expiry_date: m.expiry_date,
        unit_price: 0,
        posted_at: new Date().toISOString(),
        valid_until: new Date(Date.now() + 48 * 3_600_000).toISOString(),
        status: "open" as const,
        reason,
      };
    });
}

/** Human-readable countdown until validity expires. */
export function timeUntil(iso: string): string {
  const diff = +new Date(iso) - Date.now();
  if (diff <= 0) return "expired";
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m left`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m left`;
  return `${Math.floor(h / 24)}d left`;
}

/** Match local needs (low stock) with marketplace offers. */
export function matchRequests(meds: Medicine[], market: TradeOffer[]) {
  const lowItems = meds.filter((m) => m.quantity < 10);
  return lowItems
    .map((need) => {
      const offer = market.find(
        (o) =>
          o.kind === "offer" &&
          o.status === "open" &&
          (o.medicine.toLowerCase().includes(need.name.toLowerCase().split(" ")[0]) ||
            o.category.toLowerCase() === (need.category ?? "").toLowerCase())
      );
      return offer ? { need, offer } : null;
    })
    .filter((x): x is { need: Medicine; offer: TradeOffer } => x !== null);
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - +new Date(iso);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** Aggregate shopkeeper REQUESTS into wholesaler-friendly demand summary. */
export type WholesalerDemand = {
  medicine: string;
  category: string;
  total_quantity: number;
  shopkeepers: number;
  avg_price: number;
  urgency: "high" | "medium" | "low";
  cities: string[];
};

export function aggregateDemandForWholesalers(market: TradeOffer[]): WholesalerDemand[] {
  const reqs = market.filter((o) => o.kind === "request" && o.status === "open");
  const grouped = new Map<string, TradeOffer[]>();
  for (const r of reqs) {
    const key = r.medicine.toLowerCase();
    const list = grouped.get(key) ?? [];
    list.push(r);
    grouped.set(key, list);
  }
  const out: WholesalerDemand[] = [];
  for (const [, items] of grouped) {
    const total = items.reduce((s, i) => s + i.quantity, 0);
    const shopkeepers = new Set(items.map((i) => i.pharmacy.id)).size;
    const cities = Array.from(new Set(items.map((i) => i.pharmacy.city)));
    const avgPrice =
      items.reduce((s, i) => s + i.unit_price, 0) / Math.max(items.length, 1);
    const urgency: WholesalerDemand["urgency"] =
      shopkeepers >= 3 || total > 200 ? "high" : shopkeepers >= 2 || total > 80 ? "medium" : "low";
    out.push({
      medicine: items[0].medicine,
      category: items[0].category,
      total_quantity: total,
      shopkeepers,
      avg_price: Math.round(avgPrice * 100) / 100,
      urgency,
      cities,
    });
  }
  return out.sort((a, b) => b.total_quantity - a.total_quantity);
}
