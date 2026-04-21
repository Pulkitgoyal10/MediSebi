// Shared medicine intelligence logic (rule engine).
// Pure functions — safe to use on both client and server.

export type Medicine = {
  id: string;
  name: string;
  quantity: number;
  expiry_date: string; // ISO date
  category: string | null;
  created_at?: string;
  updated_at?: string;
};

export type MedicineStatus = "expired" | "expiring" | "critical" | "low" | "excess" | "ok";

export function daysUntilExpiry(expiry_date: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiry_date);
  exp.setHours(0, 0, 0, 0);
  return Math.round((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getStatus(m: Medicine): MedicineStatus {
  const days = daysUntilExpiry(m.expiry_date);
  if (days < 0) return "expired";
  if (days < 7) return "expiring";
  if (m.quantity < 5) return "critical";
  if (m.quantity < 10) return "low";
  if (m.quantity > 50) return "excess";
  return "ok";
}

export function statusLabel(s: MedicineStatus): string {
  return {
    expired: "Expired",
    expiring: "Expiring soon",
    critical: "Will run out soon",
    low: "Low stock",
    excess: "Excess",
    ok: "Healthy",
  }[s];
}

export function statusVariant(s: MedicineStatus): "success" | "warning" | "destructive" | "info" {
  if (s === "expired" || s === "critical") return "destructive";
  if (s === "expiring" || s === "low") return "warning";
  if (s === "excess") return "info";
  return "success";
}

// Alternative medicine mapping
const ALTERNATIVES: Record<string, string[]> = {
  paracetamol: ["Crocin", "Calpol", "Dolo 650"],
  crocin: ["Paracetamol", "Calpol"],
  calpol: ["Paracetamol", "Crocin"],
  ibuprofen: ["Brufen", "Combiflam"],
  brufen: ["Ibuprofen"],
  azithromycin: ["Amoxicillin", "Clarithromycin"],
  amoxicillin: ["Azithromycin"],
  cetirizine: ["Levocetirizine", "Loratadine"],
};

export function getAlternatives(name: string): string[] {
  const key = name.toLowerCase().split(/\s|\d/)[0];
  return ALTERNATIVES[key] ?? [];
}

// Seasonal recommendations
export function getSeason(date = new Date()): "winter" | "summer" | "rainy" | "spring" {
  const m = date.getMonth() + 1;
  if (m >= 6 && m <= 9) return "rainy";
  if (m >= 11 || m <= 2) return "winter";
  if (m >= 3 && m <= 5) return "summer";
  return "spring";
}

export function seasonalSuggestions(): { season: string; items: string[]; reason: string } {
  const season = getSeason();
  const map = {
    rainy: {
      items: ["ORS Sachets", "Paracetamol", "Anti-diarrheal", "Mosquito repellent"],
      reason: "Monsoon brings dehydration, fevers, and waterborne illnesses.",
    },
    winter: {
      items: ["Flu Vaccine", "Cough Syrup", "Vitamin D3", "Cetirizine"],
      reason: "Cold weather increases flu, cough, and respiratory issues.",
    },
    summer: {
      items: ["ORS Sachets", "Sunscreen", "Anti-allergic", "Vitamin C"],
      reason: "Heat causes dehydration and skin/allergy issues.",
    },
    spring: {
      items: ["Cetirizine", "Loratadine", "Vitamin C"],
      reason: "Spring brings pollen allergies.",
    },
  };
  const picked = map[season];
  return { season, items: [...picked.items], reason: picked.reason };
}

// Redistribution suggestions: pair excess items with low/critical items
export type RedistributionSuggestion = {
  excess: Medicine;
  needs: Medicine;
  transferUnits: number;
};

export function getRedistribution(meds: Medicine[]): RedistributionSuggestion[] {
  const excess = meds.filter((m) => m.quantity > 50);
  const needs = meds
    .filter((m) => m.quantity < 10 && daysUntilExpiry(m.expiry_date) >= 7)
    .sort((a, b) => a.quantity - b.quantity);

  const out: RedistributionSuggestion[] = [];
  for (const n of needs) {
    // Match by category first, otherwise any excess
    const match =
      excess.find((e) => e.category && e.category === n.category) ??
      excess.find((e) => e.id !== n.id);
    if (!match) continue;
    out.push({
      excess: match,
      needs: n,
      transferUnits: Math.min(20, Math.max(10, Math.floor(match.quantity * 0.2))),
    });
  }
  return out;
}

// "Sell first" — items closest to expiry but still sellable
export function getSellFirst(meds: Medicine[], limit = 5): Medicine[] {
  return meds
    .filter((m) => {
      const d = daysUntilExpiry(m.expiry_date);
      return d >= 0 && d < 60 && m.quantity > 0;
    })
    .sort((a, b) => daysUntilExpiry(a.expiry_date) - daysUntilExpiry(b.expiry_date))
    .slice(0, limit);
}
