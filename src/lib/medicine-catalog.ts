// General dispensary catalog — common over-the-counter & generic medicines
// kept in a typical Indian pharmacy. Used for one-tap "Quick Add" to inventory.

export type CatalogItem = {
  name: string;
  category: string;
  defaultQty: number;
  defaultExpiryMonths: number; // months from today
};

export const MEDICINE_CATALOG: CatalogItem[] = [
  // Pain & Fever
  { name: "Paracetamol 500mg", category: "Pain & Fever", defaultQty: 50, defaultExpiryMonths: 18 },
  { name: "Crocin Advance", category: "Pain & Fever", defaultQty: 40, defaultExpiryMonths: 18 },
  { name: "Dolo 650", category: "Pain & Fever", defaultQty: 50, defaultExpiryMonths: 18 },
  { name: "Ibuprofen 400mg", category: "Pain & Fever", defaultQty: 40, defaultExpiryMonths: 24 },
  { name: "Combiflam", category: "Pain & Fever", defaultQty: 30, defaultExpiryMonths: 18 },
  { name: "Aspirin 75mg", category: "Pain & Fever", defaultQty: 30, defaultExpiryMonths: 24 },

  // Cold, Cough & Flu
  { name: "Cetirizine 10mg", category: "Cold & Allergy", defaultQty: 50, defaultExpiryMonths: 24 },
  { name: "Levocetirizine 5mg", category: "Cold & Allergy", defaultQty: 40, defaultExpiryMonths: 24 },
  { name: "Cough Syrup (Benadryl)", category: "Cold & Allergy", defaultQty: 20, defaultExpiryMonths: 18 },
  { name: "Vicks Action 500", category: "Cold & Allergy", defaultQty: 30, defaultExpiryMonths: 18 },
  { name: "Sinarest", category: "Cold & Allergy", defaultQty: 30, defaultExpiryMonths: 18 },

  // Antibiotics
  { name: "Amoxicillin 500mg", category: "Antibiotics", defaultQty: 30, defaultExpiryMonths: 24 },
  { name: "Azithromycin 500mg", category: "Antibiotics", defaultQty: 25, defaultExpiryMonths: 24 },
  { name: "Ciprofloxacin 500mg", category: "Antibiotics", defaultQty: 25, defaultExpiryMonths: 24 },
  { name: "Metronidazole 400mg", category: "Antibiotics", defaultQty: 25, defaultExpiryMonths: 24 },

  // Digestive
  { name: "ORS Sachets", category: "Digestive", defaultQty: 50, defaultExpiryMonths: 24 },
  { name: "Pantoprazole 40mg", category: "Digestive", defaultQty: 40, defaultExpiryMonths: 24 },
  { name: "Omeprazole 20mg", category: "Digestive", defaultQty: 40, defaultExpiryMonths: 24 },
  { name: "Eno Powder", category: "Digestive", defaultQty: 30, defaultExpiryMonths: 24 },
  { name: "Digene", category: "Digestive", defaultQty: 30, defaultExpiryMonths: 18 },
  { name: "Loperamide 2mg", category: "Digestive", defaultQty: 25, defaultExpiryMonths: 24 },

  // Diabetes & BP
  { name: "Metformin 500mg", category: "Chronic Care", defaultQty: 60, defaultExpiryMonths: 24 },
  { name: "Amlodipine 5mg", category: "Chronic Care", defaultQty: 60, defaultExpiryMonths: 24 },
  { name: "Telmisartan 40mg", category: "Chronic Care", defaultQty: 60, defaultExpiryMonths: 24 },
  { name: "Atorvastatin 10mg", category: "Chronic Care", defaultQty: 60, defaultExpiryMonths: 24 },

  // Vitamins & Supplements
  { name: "Vitamin C 500mg", category: "Vitamins", defaultQty: 40, defaultExpiryMonths: 24 },
  { name: "Vitamin D3 60K", category: "Vitamins", defaultQty: 30, defaultExpiryMonths: 24 },
  { name: "B-Complex", category: "Vitamins", defaultQty: 40, defaultExpiryMonths: 24 },
  { name: "Calcium + D3", category: "Vitamins", defaultQty: 40, defaultExpiryMonths: 24 },
  { name: "Iron + Folic Acid", category: "Vitamins", defaultQty: 40, defaultExpiryMonths: 24 },
  { name: "Zinc Tablets", category: "Vitamins", defaultQty: 40, defaultExpiryMonths: 24 },

  // First Aid
  { name: "Betadine 100ml", category: "First Aid", defaultQty: 15, defaultExpiryMonths: 24 },
  { name: "Dettol Antiseptic", category: "First Aid", defaultQty: 15, defaultExpiryMonths: 24 },
  { name: "Bandages (Box)", category: "First Aid", defaultQty: 20, defaultExpiryMonths: 36 },
  { name: "Cotton Roll", category: "First Aid", defaultQty: 15, defaultExpiryMonths: 36 },
  { name: "Volini Spray", category: "First Aid", defaultQty: 15, defaultExpiryMonths: 24 },

  // Skin
  { name: "Calamine Lotion", category: "Skin", defaultQty: 15, defaultExpiryMonths: 24 },
  { name: "Clotrimazole Cream", category: "Skin", defaultQty: 20, defaultExpiryMonths: 24 },
  { name: "Mupirocin Ointment", category: "Skin", defaultQty: 20, defaultExpiryMonths: 24 },
];

export function defaultExpiryDate(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export const CATALOG_CATEGORIES = Array.from(
  new Set(MEDICINE_CATALOG.map((m) => m.category))
);
