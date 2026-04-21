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

export type OrderItemInput = {
  medicine_id: string | null;
  medicine_name: string;
  quantity: number;
};

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { supplier?: string | null; notes?: string | null; items: OrderItemInput[] }) => {
      if (!Array.isArray(input?.items) || input.items.length === 0)
        throw new Error("Order must have at least one item");
      if (input.items.length > 200) throw new Error("Too many items in one order");
      const cleanItems = input.items.map((it) => {
        if (!it.medicine_name?.trim()) throw new Error("Each item needs a medicine name");
        if (!Number.isFinite(it.quantity) || it.quantity <= 0)
          throw new Error("Item quantity must be > 0");
        if (it.quantity > 100000) throw new Error("Item quantity too large");
        return {
          medicine_id: it.medicine_id ?? null,
          medicine_name: it.medicine_name.trim().slice(0, 200),
          quantity: Math.floor(it.quantity),
        };
      });
      return {
        supplier: input.supplier?.trim().slice(0, 200) || null,
        notes: input.notes?.trim().slice(0, 1000) || null,
        items: cleanItems,
      };
    }
  )
  .handler(async ({ data }) => {
    const supabase = getServerSupabase();
    const total = data.items.reduce((s, i) => s + i.quantity, 0);
    const { data: order, error } = await supabase
      .from("purchase_orders")
      .insert({
        supplier: data.supplier,
        notes: data.notes,
        status: "pending",
        total_items: total,
      })
      .select()
      .single();
    if (error || !order) throw new Error(error?.message ?? "Failed to create order");

    const itemRows = data.items.map((it) => ({ ...it, order_id: order.id }));
    const { error: itemsError } = await supabase.from("purchase_order_items").insert(itemRows);
    if (itemsError) {
      await supabase.from("purchase_orders").delete().eq("id", order.id);
      throw new Error(itemsError.message);
    }
    return { order };
  });

export const listOrders = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerSupabase();
  const { data: orders, error } = await supabase
    .from("purchase_orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listOrders error:", error);
    return { orders: [], items: [], error: error.message };
  }
  const ids = (orders ?? []).map((o) => o.id);
  let items: Database["public"]["Tables"]["purchase_order_items"]["Row"][] = [];
  if (ids.length > 0) {
    const { data: rows, error: iErr } = await supabase
      .from("purchase_order_items")
      .select("*")
      .in("order_id", ids);
    if (iErr) {
      console.error("listOrders items error:", iErr);
      return { orders: orders ?? [], items: [], error: iErr.message };
    }
    items = rows ?? [];
  }
  return { orders: orders ?? [], items, error: null };
});

export const updateOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; status: "pending" | "ordered" | "received" | "cancelled" }) => {
    if (!input?.id) throw new Error("id required");
    if (!["pending", "ordered", "received", "cancelled"].includes(input.status))
      throw new Error("Invalid status");
    return input;
  })
  .handler(async ({ data }) => {
    const supabase = getServerSupabase();
    const { error } = await supabase
      .from("purchase_orders")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const deleteOrder = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data }) => {
    const supabase = getServerSupabase();
    const { error } = await supabase.from("purchase_orders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });
