import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, Sparkles, Package, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import {
  listMedicines,
  createMedicine,
  updateMedicine,
  deleteMedicine,
} from "@/server/medicines.functions";
import { listOrders } from "@/server/orders.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { QuickAddDialog } from "@/components/QuickAddDialog";
import { daysUntilExpiry, getStatus, type Medicine } from "@/lib/medicine-logic";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — MediSebi" },
      { name: "description", content: "Add, edit and search all medicines in your pharmacy." },
    ],
  }),
  component: InventoryPage,
});

type FormState = {
  name: string;
  quantity: string;
  expiry_date: string;
  category: string;
};

const emptyForm: FormState = { name: "", quantity: "", expiry_date: "", category: "" };

function InventoryPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["medicines"],
    queryFn: () => listMedicines(),
  });
  const { data: ordersData } = useQuery({
    queryKey: ["orders"],
    queryFn: () => listOrders(),
  });
  const meds: Medicine[] = data?.medicines ?? [];
  const orders = ordersData?.orders ?? [];
  const orderItems = ordersData?.items ?? [];

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [open, setOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return meds;
    return meds.filter(
      (m) => m.name.toLowerCase().includes(q) || (m.category ?? "").toLowerCase().includes(q)
    );
  }, [meds, search]);

  const createMut = useMutation({
    mutationFn: (input: { name: string; quantity: number; expiry_date: string; category: string | null }) =>
      createMedicine({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medicines"] });
      toast.success("Medicine added");
      setOpen(false);
      setForm(emptyForm);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: (input: {
      id: string;
      name: string;
      quantity: number;
      expiry_date: string;
      category: string | null;
    }) => updateMedicine({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medicines"] });
      toast.success("Medicine updated");
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteMedicine({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medicines"] });
      toast.success("Medicine deleted");
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(m: Medicine) {
    setEditing(m);
    setForm({
      name: m.name,
      quantity: String(m.quantity),
      expiry_date: m.expiry_date,
      category: m.category ?? "",
    });
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number(form.quantity);
    const payload = {
      name: form.name,
      quantity: qty,
      expiry_date: form.expiry_date,
      category: form.category || null,
    };
    if (editing) updateMut.mutate({ id: editing.id, ...payload });
    else createMut.mutate(payload);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setQuickOpen(true)}>
              <Sparkles className="mr-1.5 h-4 w-4" /> Quick add
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAdd}>
                  <Plus className="mr-1.5 h-4 w-4" /> Add medicine
                </Button>
              </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit medicine" : "Add new medicine"}</DialogTitle>
              </DialogHeader>

              {/* Inline reference: existing stock + recent orders for context */}
              {!editing && (
                <AddMedicineContext
                  query={form.name}
                  meds={meds}
                  orders={orders}
                  orderItems={orderItems}
                />
              )}

              <form onSubmit={submit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    required
                    maxLength={200}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Start typing to see existing stock…"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="qty">Quantity</Label>
                    <Input
                      id="qty"
                      type="number"
                      min={0}
                      required
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="exp">Expiry date</Label>
                    <Input
                      id="exp"
                      type="date"
                      required
                      value={form.expiry_date}
                      onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cat">Category (optional)</Label>
                  <Input
                    id="cat"
                    placeholder="e.g. Pain Relief"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createMut.isPending || updateMut.isPending}
                  >
                    {editing ? "Save changes" : "Add medicine"}
                  </Button>
                </DialogFooter>
              </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <QuickAddDialog
        open={quickOpen}
        onOpenChange={setQuickOpen}
        existingNames={meds.map((m) => m.name)}
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      No medicines found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((m) => {
                    const days = daysUntilExpiry(m.expiry_date);
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell className="text-muted-foreground">{m.category ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{m.quantity}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{new Date(m.expiry_date).toLocaleDateString()}</span>
                            <span className="text-xs text-muted-foreground">
                              {days < 0 ? `${-days}d ago` : `in ${days}d`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={getStatus(m)} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(m)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleteId(m.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
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

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this medicine?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the entry from your inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMut.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type OrderRow = { id: string; created_at: string; supplier: string | null };
type OrderItemRow = { id: string; order_id: string; medicine_name: string; quantity: number };

function AddMedicineContext({
  query,
  meds,
  orders,
  orderItems,
}: {
  query: string;
  meds: Medicine[];
  orders: OrderRow[];
  orderItems: OrderItemRow[];
}) {
  const q = query.trim().toLowerCase();
  const matches = q
    ? meds.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 4)
    : [];

  // Last 4 orders, most recent first, with their items as a quick reference.
  const recent = orders.slice(0, 4);

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border bg-muted/30 p-3">
      <div>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Package className="h-3.5 w-3.5 text-primary" />
          Existing stock {q ? `for "${query}"` : "(type a name to filter)"}
        </p>
        {q && matches.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">
            No existing entry — this will create a new medicine.
          </p>
        ) : matches.length > 0 ? (
          <ul className="mt-1.5 space-y-1">
            {matches.map((m) => {
              const days = daysUntilExpiry(m.expiry_date);
              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-md bg-background px-2 py-1 text-xs"
                >
                  <span className="truncate font-medium">{m.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {m.quantity} units • exp {days}d
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            {meds.length} medicines currently in inventory.
          </p>
        )}
      </div>

      <div>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <ShoppingCart className="h-3.5 w-3.5 text-primary" />
          Recent orders
        </p>
        {recent.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">No recent orders.</p>
        ) : (
          <ul className="mt-1.5 space-y-1">
            {recent.map((o) => {
              const items = orderItems.filter((it) => it.order_id === o.id);
              const preview = items
                .slice(0, 2)
                .map((it) => `${it.medicine_name}×${it.quantity}`)
                .join(", ");
              return (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-2 rounded-md bg-background px-2 py-1 text-xs"
                >
                  <span className="truncate text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString()} •{" "}
                    {o.supplier ?? "—"}
                  </span>
                  <span className="shrink-0 truncate text-right font-medium">
                    {preview}
                    {items.length > 2 ? ` +${items.length - 2}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
