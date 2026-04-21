// Medicine information database — uses, restrictions, allergies, side effects.
// Fuzzy-matched on first word of medicine name (e.g. "Paracetamol 500mg" -> "paracetamol").

export type MedicineInfo = {
  uses: string[];
  restrictions: string[];
  allergies: string[];
  sideEffects: string[];
  schedule?: "OTC" | "H" | "H1" | "X";
};

const DB: Record<string, MedicineInfo> = {
  paracetamol: {
    uses: ["Fever", "Mild to moderate pain", "Headache"],
    restrictions: [
      "Avoid in severe liver disease",
      "Max 4g/day in adults",
      "Avoid alcohol while taking",
    ],
    allergies: ["Skin rash", "Hives", "Anaphylaxis (rare)"],
    sideEffects: ["Nausea", "Liver toxicity (overdose)"],
    schedule: "OTC",
  },
  crocin: {
    uses: ["Fever", "Body pain"],
    restrictions: ["Avoid with other paracetamol products", "Caution in liver impairment"],
    allergies: ["Rash", "Itching"],
    sideEffects: ["Drowsiness (rare)"],
    schedule: "OTC",
  },
  dolo: {
    uses: ["Fever", "Headache", "Post-vaccination pain"],
    restrictions: ["Liver disease", "Chronic alcohol use"],
    allergies: ["Skin reactions"],
    sideEffects: ["Mild stomach upset"],
    schedule: "OTC",
  },
  ibuprofen: {
    uses: ["Pain", "Inflammation", "Fever", "Arthritis"],
    restrictions: [
      "Avoid in peptic ulcer / GI bleeding",
      "Avoid in 3rd trimester pregnancy",
      "Caution with kidney disease",
      "Avoid with blood thinners",
    ],
    allergies: ["NSAID hypersensitivity", "Asthma trigger", "Aspirin allergy cross-reaction"],
    sideEffects: ["Stomach pain", "Heartburn", "Dizziness"],
    schedule: "OTC",
  },
  combiflam: {
    uses: ["Pain", "Fever", "Inflammation"],
    restrictions: ["Ulcers", "Kidney disease", "Pregnancy"],
    allergies: ["NSAID allergy", "Paracetamol hypersensitivity"],
    sideEffects: ["GI upset", "Drowsiness"],
    schedule: "OTC",
  },
  aspirin: {
    uses: ["Pain", "Fever", "Cardio-protective (low dose)"],
    restrictions: [
      "Children < 16 (Reye's syndrome)",
      "Bleeding disorders",
      "Active ulcers",
      "Avoid before surgery",
    ],
    allergies: ["Salicylate allergy", "Asthma", "Nasal polyps"],
    sideEffects: ["GI bleeding", "Tinnitus", "Bruising"],
    schedule: "OTC",
  },
  amoxicillin: {
    uses: ["Bacterial infections", "Throat infection", "UTI"],
    restrictions: [
      "Penicillin allergy — STRICT contraindication",
      "Mononucleosis",
      "Complete full course",
    ],
    allergies: ["Penicillin allergy", "Anaphylaxis", "Severe skin rash"],
    sideEffects: ["Diarrhea", "Nausea", "Yeast infection"],
    schedule: "H",
  },
  azithromycin: {
    uses: ["Respiratory infection", "Skin infection", "STI"],
    restrictions: ["QT prolongation", "Liver disease", "Myasthenia gravis"],
    allergies: ["Macrolide allergy", "Severe skin reaction (SJS)"],
    sideEffects: ["Nausea", "Diarrhea", "Cardiac arrhythmia (rare)"],
    schedule: "H",
  },
  ciprofloxacin: {
    uses: ["UTI", "GI infections", "Respiratory infection"],
    restrictions: [
      "Avoid in children & pregnancy",
      "Tendon rupture risk",
      "Avoid dairy within 2 hours",
    ],
    allergies: ["Fluoroquinolone allergy", "Photosensitivity"],
    sideEffects: ["Tendinitis", "Nausea", "Headache"],
    schedule: "H",
  },
  metronidazole: {
    uses: ["Anaerobic infections", "Amoebiasis", "Giardiasis"],
    restrictions: ["NO ALCOHOL — disulfiram reaction", "1st trimester pregnancy"],
    allergies: ["Nitroimidazole allergy"],
    sideEffects: ["Metallic taste", "Nausea", "Dark urine"],
    schedule: "H",
  },
  cetirizine: {
    uses: ["Allergic rhinitis", "Urticaria", "Itching"],
    restrictions: ["Caution while driving", "Kidney impairment — reduce dose"],
    allergies: ["Hypersensitivity to hydroxyzine"],
    sideEffects: ["Drowsiness", "Dry mouth", "Fatigue"],
    schedule: "OTC",
  },
  levocetirizine: {
    uses: ["Allergies", "Hives"],
    restrictions: ["Renal impairment", "Avoid alcohol"],
    allergies: ["Cetirizine cross-reactivity"],
    sideEffects: ["Drowsiness", "Headache"],
    schedule: "OTC",
  },
  loratadine: {
    uses: ["Allergies", "Hay fever"],
    restrictions: ["Liver disease — adjust dose"],
    allergies: ["Antihistamine hypersensitivity"],
    sideEffects: ["Headache", "Dry mouth"],
    schedule: "OTC",
  },
  metformin: {
    uses: ["Type 2 diabetes", "PCOS"],
    restrictions: [
      "Severe kidney disease (eGFR <30)",
      "Stop before contrast IV scans",
      "Avoid heavy alcohol",
    ],
    allergies: ["Biguanide hypersensitivity"],
    sideEffects: ["GI upset", "B12 deficiency (long-term)", "Lactic acidosis (rare)"],
    schedule: "H",
  },
  amlodipine: {
    uses: ["Hypertension", "Angina"],
    restrictions: ["Severe aortic stenosis", "Caution with grapefruit juice"],
    allergies: ["Calcium channel blocker hypersensitivity"],
    sideEffects: ["Ankle swelling", "Flushing", "Headache"],
    schedule: "H",
  },
  telmisartan: {
    uses: ["Hypertension", "Heart failure"],
    restrictions: ["Pregnancy — CONTRAINDICATED", "Bilateral renal artery stenosis"],
    allergies: ["ARB hypersensitivity", "Angioedema history"],
    sideEffects: ["Dizziness", "Hyperkalemia"],
    schedule: "H",
  },
  atorvastatin: {
    uses: ["High cholesterol", "Cardiovascular risk reduction"],
    restrictions: ["Active liver disease", "Pregnancy", "Avoid grapefruit"],
    allergies: ["Statin myopathy", "Rhabdomyolysis"],
    sideEffects: ["Muscle pain", "Liver enzyme rise"],
    schedule: "H",
  },
  pantoprazole: {
    uses: ["GERD", "Peptic ulcer", "Acid reflux"],
    restrictions: ["Long-term use → B12/Mg deficiency", "Bone fracture risk"],
    allergies: ["PPI hypersensitivity"],
    sideEffects: ["Headache", "Diarrhea"],
    schedule: "OTC",
  },
  omeprazole: {
    uses: ["Acidity", "GERD", "Ulcers"],
    restrictions: ["Long-term use cautions", "Drug interactions (clopidogrel)"],
    allergies: ["PPI cross-reactivity"],
    sideEffects: ["Headache", "Bloating"],
    schedule: "OTC",
  },
  insulin: {
    uses: ["Type 1 & advanced Type 2 diabetes"],
    restrictions: [
      "Refrigerate (2-8°C)",
      "Risk of hypoglycemia",
      "Rotate injection sites",
    ],
    allergies: ["Insulin hypersensitivity (rare)"],
    sideEffects: ["Hypoglycemia", "Weight gain", "Injection site reaction"],
    schedule: "H",
  },
  cough: {
    uses: ["Cough relief"],
    restrictions: ["Children < 6 years", "Asthma patients", "Avoid driving"],
    allergies: ["Codeine allergy", "Dextromethorphan hypersensitivity"],
    sideEffects: ["Drowsiness", "Constipation"],
    schedule: "H",
  },
  ors: {
    uses: ["Dehydration", "Diarrhea recovery"],
    restrictions: ["Severe vomiting → IV instead", "Kidney failure"],
    allergies: ["None typical"],
    sideEffects: ["Nausea if too concentrated"],
    schedule: "OTC",
  },
  vitamin: {
    uses: ["Nutritional supplementation"],
    restrictions: ["Megadoses can be toxic (esp. A, D, E, K)"],
    allergies: ["Excipient allergies"],
    sideEffects: ["Mild GI upset"],
    schedule: "OTC",
  },
};

const DEFAULT_INFO: MedicineInfo = {
  uses: ["Consult prescription label or pharmacist"],
  restrictions: ["Use as directed", "Check expiry before dispensing"],
  allergies: ["Ask patient about known drug allergies"],
  sideEffects: ["Report any adverse reaction"],
  schedule: "OTC",
};

export function getMedicineInfo(name: string): MedicineInfo {
  const key = name.toLowerCase().split(/[\s\d]/)[0];
  return DB[key] ?? DEFAULT_INFO;
}
