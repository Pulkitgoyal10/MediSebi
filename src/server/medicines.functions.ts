import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function getServerSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase server env vars missing");
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}

export const listMedicines = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("medicines")
    .select("*")
    .order("expiry_date", { ascending: true });
  if (error) {
    console.error("listMedicines error:", error);
    return { medicines: [], error: error.message };
  }
  return { medicines: data ?? [], error: null };
});

export const createMedicine = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { name: string; quantity: number; expiry_date: string; category?: string | null }) => {
      if (!input?.name?.trim()) throw new Error("Name is required");
      if (input.name.length > 200) throw new Error("Name too long");
      if (!Number.isFinite(input.quantity) || input.quantity < 0)
        throw new Error("Quantity must be a positive number");
      if (input.quantity > 1_000_000) throw new Error("Quantity too large");
      if (!input.expiry_date || isNaN(Date.parse(input.expiry_date)))
        throw new Error("Valid expiry date required");
      return {
        name: input.name.trim(),
        quantity: Math.floor(input.quantity),
        expiry_date: input.expiry_date,
        category: input.category?.trim() || null,
      };
    }
  )
  .handler(async ({ data }) => {
    const supabase = getServerSupabase();
    const { data: row, error } = await supabase
      .from("medicines")
      .insert(data)
      .select()
      .single();
    if (error) {
      console.error("createMedicine error:", error);
      throw new Error(error.message);
    }
    return { medicine: row };
  });

export const updateMedicine = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id: string;
      name?: string;
      quantity?: number;
      expiry_date?: string;
      category?: string | null;
    }) => {
      if (!input?.id) throw new Error("id required");
      const patch: {
        name?: string;
        quantity?: number;
        expiry_date?: string;
        category?: string | null;
      } = {};
      if (input.name !== undefined) {
        if (!input.name.trim()) throw new Error("Name cannot be empty");
        if (input.name.length > 200) throw new Error("Name too long");
        patch.name = input.name.trim();
      }
      if (input.quantity !== undefined) {
        if (!Number.isFinite(input.quantity) || input.quantity < 0)
          throw new Error("Invalid quantity");
        patch.quantity = Math.floor(input.quantity);
      }
      if (input.expiry_date !== undefined) {
        if (isNaN(Date.parse(input.expiry_date))) throw new Error("Invalid expiry");
        patch.expiry_date = input.expiry_date;
      }
      if (input.category !== undefined) patch.category = input.category?.trim() || null;
      return { id: input.id, patch };
    }
  )
  .handler(async ({ data }) => {
    const supabase = getServerSupabase();
    const { data: row, error } = await supabase
      .from("medicines")
      .update(data.patch)
      .eq("id", data.id)
      .select()
      .single();
    if (error) {
      console.error("updateMedicine error:", error);
      throw new Error(error.message);
    }
    return { medicine: row };
  });

export const sellMedicine = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; quantity: number }) => {
    if (!input?.id) throw new Error("id required");
    if (!Number.isFinite(input.quantity) || input.quantity <= 0)
      throw new Error("Quantity must be positive");
    if (input.quantity > 100000) throw new Error("Quantity too large");
    return { id: input.id, quantity: Math.floor(input.quantity) };
  })
  .handler(async ({ data }) => {
    const supabase = getServerSupabase();
    const { data: current, error: readErr } = await supabase
      .from("medicines")
      .select("id, name, quantity")
      .eq("id", data.id)
      .single();
    if (readErr || !current) throw new Error(readErr?.message ?? "Medicine not found");
    if (current.quantity < data.quantity)
      throw new Error(`Only ${current.quantity} units of ${current.name} available`);
    const newQty = current.quantity - data.quantity;
    const { data: updated, error } = await supabase
      .from("medicines")
      .update({ quantity: newQty })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { medicine: updated, sold: data.quantity };
  });

export const deleteMedicine = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data }) => {
    const supabase = getServerSupabase();
    const { error } = await supabase.from("medicines").delete().eq("id", data.id);
    if (error) {
      console.error("deleteMedicine error:", error);
      throw new Error(error.message);
    }
    return { success: true };
  });
