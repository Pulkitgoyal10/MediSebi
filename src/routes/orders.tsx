import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ShoppingCart, Trash2, Plus, Minus, Send, Package2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listMedicines } from "@/server/medicines.functions";
import { createOrder, listOrders, updateOrderStatus, deleteOrder } from "@/server/orders.functions";
import { daysUntilExpiry, type Medicine } from "@/lib/medicine-logic";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Orders — MediSebi" },
      { name: "description", content: "Place restock orders for low or out-of-stock medicines." },
    ],
  }),
  component: OrdersPage,
});

type CartItem = {
  medicine_id: string | null;
  medicine_name: string;
  quantity: number;
};

function OrdersPage() {
  const qc = useQueryClient();
  const { data: medsData } = useQuery({
    queryKey: ["medicines"],
    queryFn: () => listMedicines(),
  });
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => listOrders(),
  });
  const meds: Medicine[] = medsData?.medicines ?? [];

  const [cart, setCart] = useState<CartItem[]>([]);
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");

  const lowOrOut = useMemo(
    () =>
      meds
        .filter((m) => m.quantity < 10 && daysUntilExpiry(m.expiry_date) >= 0)
        .sort((a, b) => a.quantity - b.quantity),
    [meds]
  );

  function addToCart(m: Medicine) {
    setCart((c) => {
      if (c.find((x) => x.medicine_id === m.id)) return c;
      const suggested = Math.max(20, 30 - m.quantity);
      return [...c, { medicine_id: m.id, medicine_name: m.name, quantity: suggested }];
    });
    toast.success(`${m.name} added to order`);
  }

  function updateQty(idx: number, delta: number) {
    setCart((c) =>
      c.map((it, i) => (i === idx ? { ...it, quantity: Math.max(1, it.quantity + delta) } : it))
    );
  }

  function setQty(idx: number, val: number) {
    setCart((c) =>
      c.map((it, i) => (i === idx ? { ...it, quantity: Math.max(1, val || 1) } : it))
    );
  }

  function removeItem(idx: number) {
    setCart((c) => c.filter((_, i) => i !== idx));
  }

  function addAllLow() {
    const next: CartItem[] = [...cart];
    for (const m of lowOrOut) {
      if (next.find((x) => x.medicine_id === m.id)) continue;
      next.push({
        medicine_id: m.id,
        medicine_name: m.name,
        quantity: Math.max(20, 30 - m.quantity),
      });
    }
    setCart(next);
    toast.success(`${lowOrOut.length} items added to order`);
  }

  const placeMut = useMutation({
    mutationFn: () =>
      createOrder({
        data: {
          supplier: supplier || null,
          notes: notes || null,
          items: cart,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order placed");
      setCart([]);
      setSupplier("");
      setNotes("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: "pending" | "ordered" | "received" | "cancelled" }) =>
      updateOrderStatus({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteOrder({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const orders = ordersData?.orders ?? [];
  const orderItems = ordersData?.items ?? [];
  const totalCart = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Low / out of stock list */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package2 className="h-4 w-4 text-warning" />
              Running out ({lowOrOut.length})
            </CardTitle>
            {lowOrOut.length > 0 && (
              <Button size="sm" variant="outline" onClick={addAllLow}>
                Add all to order
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {lowOrOut.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nothing is running low. ✓{" "}
                <Link to="/inventory" className="text-primary underline">
                  Manage inventory
                </Link>
              </p>
            ) : (
              <div className="space-y-1.5">
                {lowOrOut.map((m) => {
                  const inCart = !!cart.find((x) => x.medicine_id === m.id);
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{m.name}</p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <Badge
                            variant={m.quantity < 5 ? "destructive" : "secondary"}
                            className="text-[10px]"
                          >
                            {m.quantity} left
                          </Badge>
                          {m.category && (
                            <span className="text-xs text-muted-foreground">{m.category}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={inCart ? "secondary" : "default"}
                        disabled={inCart}
                        onClick={() => addToCart(m)}
                      >
                        {inCart ? "Added" : (
                          <>
                            <Plus className="mr-1 h-3.5 w-3.5" /> Reorder
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4 text-primary" />
              New order ({cart.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cart.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Add items from the list to start an order.
              </p>
            ) : (
              <>
                <div className="space-y-1.5">
                  {cart.map((it, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-md border border-border p-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{it.medicine_name}</p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => updateQty(idx, -5)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        value={it.quantity}
                        onChange={(e) => setQty(idx, Number(e.target.value))}
                        className="h-7 w-16 text-center"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => updateQty(idx, 5)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeItem(idx)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="supplier">Supplier (optional)</Label>
                  <Input
                    id="supplier"
                    placeholder="e.g. MediCorp Distributors"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Delivery instructions…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-sm text-muted-foreground">
                    Total units: <span className="font-semibold text-foreground">{totalCart}</span>
                  </span>
                  <Button
                    onClick={() => placeMut.mutate()}
                    disabled={placeMut.isPending || cart.length === 0}
                  >
                    <Send className="mr-1.5 h-4 w-4" />
                    {placeMut.isPending ? "Placing…" : "Place order"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Past orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordersLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      No orders placed yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((o) => {
                    const items = orderItems.filter((it) => it.order_id === o.id);
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {new Date(o.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {o.supplier ?? "—"}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {items.slice(0, 3).map((it) => (
                              <Badge key={it.id} variant="secondary" className="text-[10px]">
                                {it.medicine_name} ×{it.quantity}
                              </Badge>
                            ))}
                            {items.length > 3 && (
                              <Badge variant="outline" className="text-[10px]">
                                +{items.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{o.total_items}</TableCell>
                        <TableCell>
                          <Select
                            value={o.status}
                            onValueChange={(v) =>
                              statusMut.mutate({
                                id: o.id,
                                status: v as "pending" | "ordered" | "received" | "cancelled",
                              })
                            }
                          >
                            <SelectTrigger className="h-7 w-32 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="ordered">Ordered</SelectItem>
                              <SelectItem value="received">Received</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => deleteMut.mutate(o.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
