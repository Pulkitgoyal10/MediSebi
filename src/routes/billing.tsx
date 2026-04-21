import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Receipt,
  ShoppingBag,
  RefreshCw,
  Info,
  CreditCard,
  Smartphone,
  Building2,
  Wallet,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { listMedicines, sellMedicine } from "@/server/medicines.functions";
import { daysUntilExpiry, type Medicine } from "@/lib/medicine-logic";
import { MedicineInfoDialog } from "@/components/MedicineInfoDialog";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "Billing & GST Invoice — MediSebi" },
      {
        name: "description",
        content:
          "Generate professional GST invoices with CGST/SGST/IGST breakdown, discounts, and multi-payment options.",
      },
    ],
  }),
  component: BillingPage,
});

type CartLine = {
  id: string;
  name: string;
  category: string | null;
  qty: number;
  available: number;
  price: number; // pre-tax unit price
  gstRate: number; // 5, 12, 18
};

type PaymentMethod = "upi" | "card" | "netbanking" | "cash";

// Most pharma items in India are 5% or 12% GST. Use category to pick.
function gstRateFor(m: Medicine): number {
  const cat = (m.category ?? "").toLowerCase();
  if (cat.includes("vitamin") || cat.includes("supplement")) return 18;
  if (cat.includes("antibiotic") || cat.includes("chronic") || cat.includes("diabetes"))
    return 12;
  return 5; // default for life-saving / OTC drugs
}

function priceFor(m: Medicine): number {
  const seed = (m.id || m.name).split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return Math.round(((seed % 90) + 10) * 100) / 100;
}

function genInvoiceNo(): string {
  const d = new Date();
  return `MS/${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 9000) + 1000}`;
}

function BillingPage() {
  const qc = useQueryClient();
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["medicines"],
    queryFn: () => listMedicines(),
    refetchInterval: 40_000,
  });
  const meds: Medicine[] = data?.medicines ?? [];

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountPct, setDiscountPct] = useState<number>(0);
  const [isInterState, setIsInterState] = useState(false); // IGST vs CGST+SGST
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");
  const [paymentDetails, setPaymentDetails] = useState({
    upiId: "",
    cardLast4: "",
    cardName: "",
    bankRef: "",
    cashTendered: "",
  });
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoMed, setInfoMed] = useState<{ name: string; category: string | null } | null>(null);
  const [lastBill, setLastBill] = useState<{
    invoiceNo: string;
    lines: CartLine[];
    subtotal: number;
    discount: number;
    cgst: number;
    sgst: number;
    igst: number;
    grandTotal: number;
    method: PaymentMethod;
    customer: { name: string; phone: string };
    at: Date;
  } | null>(null);

  // Re-bind cart "available" to fresh inventory after each refetch.
  useEffect(() => {
    if (!meds.length) return;
    setCart((prev) =>
      prev
        .map((line) => {
          const m = meds.find((x) => x.id === line.id);
          if (!m) return null;
          return { ...line, available: m.quantity, qty: Math.min(line.qty, m.quantity || 1) };
        })
        .filter((x): x is CartLine => x !== null && x.available > 0)
    );
  }, [meds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return meds.slice(0, 20);
    return meds
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) || (m.category ?? "").toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [meds, search]);

  function addToCart(m: Medicine) {
    if (m.quantity <= 0) {
      toast.error(`${m.name} is out of stock`);
      return;
    }
    setCart((c) => {
      const existing = c.find((x) => x.id === m.id);
      if (existing) {
        if (existing.qty >= m.quantity) {
          toast.warning(`Only ${m.quantity} available`);
          return c;
        }
        return c.map((x) => (x.id === m.id ? { ...x, qty: x.qty + 1 } : x));
      }
      return [
        ...c,
        {
          id: m.id,
          name: m.name,
          category: m.category,
          qty: 1,
          available: m.quantity,
          price: priceFor(m),
          gstRate: gstRateFor(m),
        },
      ];
    });
  }

  function changeQty(id: string, delta: number) {
    setCart((c) =>
      c.flatMap((line) => {
        if (line.id !== id) return [line];
        const next = line.qty + delta;
        if (next <= 0) return [];
        if (next > line.available) {
          toast.warning(`Only ${line.available} of ${line.name} in stock`);
          return [line];
        }
        return [{ ...line, qty: next }];
      })
    );
  }

  function removeLine(id: string) {
    setCart((c) => c.filter((x) => x.id !== id));
  }

  function openInfo(name: string, category: string | null) {
    setInfoMed({ name, category });
    setInfoOpen(true);
  }

  // Calculations
  const calc = useMemo(() => {
    const subtotal = cart.reduce((s, l) => s + l.qty * l.price, 0);
    const discount = Math.round(((subtotal * discountPct) / 100) * 100) / 100;
    const taxable = Math.max(subtotal - discount, 0);
    // tax per line (GST applied on (line - line's share of discount))
    let totalTax = 0;
    const lineTaxes = cart.map((l) => {
      const lineGross = l.qty * l.price;
      const lineShareDisc = subtotal > 0 ? (lineGross / subtotal) * discount : 0;
      const lineTaxable = lineGross - lineShareDisc;
      const tax = (lineTaxable * l.gstRate) / 100;
      totalTax += tax;
      return { id: l.id, lineTaxable, tax };
    });
    const cgst = isInterState ? 0 : totalTax / 2;
    const sgst = isInterState ? 0 : totalTax / 2;
    const igst = isInterState ? totalTax : 0;
    const grandTotal = Math.round((taxable + totalTax) * 100) / 100;
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discount,
      taxable: Math.round(taxable * 100) / 100,
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      igst: Math.round(igst * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      grandTotal,
      lineTaxes,
    };
  }, [cart, discountPct, isInterState]);

  function validatePayment(): string | null {
    if (paymentMethod === "upi" && !paymentDetails.upiId.trim()) return "Enter UPI ID";
    if (paymentMethod === "card") {
      if (!paymentDetails.cardLast4.match(/^\d{4}$/)) return "Enter last 4 digits of card";
      if (!paymentDetails.cardName.trim()) return "Enter cardholder name";
    }
    if (paymentMethod === "netbanking" && !paymentDetails.bankRef.trim())
      return "Enter bank reference";
    if (paymentMethod === "cash") {
      const tendered = parseFloat(paymentDetails.cashTendered);
      if (!Number.isFinite(tendered) || tendered < calc.grandTotal)
        return `Cash tendered must be ≥ ₹${calc.grandTotal.toFixed(2)}`;
    }
    return null;
  }

  const sellMut = useMutation({
    mutationFn: async () => {
      const results = [];
      for (const line of cart) {
        const r = await sellMedicine({ data: { id: line.id, quantity: line.qty } });
        results.push(r);
      }
      return results;
    },
    onSuccess: () => {
      const invoiceNo = genInvoiceNo();
      setLastBill({
        invoiceNo,
        lines: cart,
        subtotal: calc.subtotal,
        discount: calc.discount,
        cgst: calc.cgst,
        sgst: calc.sgst,
        igst: calc.igst,
        grandTotal: calc.grandTotal,
        method: paymentMethod,
        customer: { name: customerName, phone: customerPhone },
        at: new Date(),
      });
      qc.invalidateQueries({ queryKey: ["medicines"] });
      toast.success(`Invoice ${invoiceNo} generated • ₹${calc.grandTotal.toFixed(2)}`);
      setCart([]);
      setDiscountPct(0);
      setPaymentDetails({
        upiId: "",
        cardLast4: "",
        cardName: "",
        bankRef: "",
        cashTendered: "",
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleGenerate() {
    if (cart.length === 0) return toast.error("Cart is empty");
    const err = validatePayment();
    if (err) return toast.error(err);
    sellMut.mutate();
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div
        className="rounded-2xl border border-border p-4 text-primary-foreground shadow-sm sm:p-6"
        style={{ background: "var(--gradient-primary)" }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm/6 opacity-90">
              <Receipt className="h-4 w-4" /> GST Invoice & Counter
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
              Generate professional GST bills in seconds
            </h2>
            <p className="mt-2 max-w-xl text-xs opacity-90 sm:text-sm">
              CGST/SGST/IGST auto-calc • Multiple payment modes • Stock auto-syncs every 40s.
            </p>
          </div>
          <Badge variant="secondary" className="gap-1.5 self-start text-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
            Auto-sync 40s
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Search & list */}
        <Card className="lg:col-span-3">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Find medicine</CardTitle>
              <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or category…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[55vh] overflow-y-auto">
              {isLoading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
              ) : filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No medicines found.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {filtered.map((m) => {
                    const days = daysUntilExpiry(m.expiry_date);
                    const out = m.quantity <= 0;
                    const gst = gstRateFor(m);
                    return (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-3 p-3 transition-colors hover:bg-muted/50"
                      >
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => openInfo(m.name, m.category)}
                          title="View drug info & allergy alerts"
                        >
                          <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                            {m.name}
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                            <span>{m.category ?? "—"}</span>
                            <span>•</span>
                            <span className={out ? "text-destructive" : ""}>
                              {m.quantity} in stock
                            </span>
                            <span>•</span>
                            <span>exp in {days}d</span>
                            <span>•</span>
                            <span>GST {gst}%</span>
                          </div>
                        </button>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-sm font-semibold tabular-nums">
                            ₹{priceFor(m).toFixed(2)}
                          </span>
                          <Button size="sm" disabled={out} onClick={() => addToCart(m)}>
                            <Plus className="mr-1 h-3.5 w-3.5" /> Add
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bill / cart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingBag className="h-4 w-4 text-primary" />
              Current invoice ({cart.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Customer */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Customer name</Label>
                <Input
                  placeholder="Walk-in"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value.slice(0, 60))}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input
                  placeholder="+91…"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.slice(0, 15))}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {cart.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Add items from the list to start an invoice.
              </p>
            ) : (
              <>
                {/* Line items */}
                <div className="max-h-[32vh] space-y-1.5 overflow-y-auto">
                  {cart.map((line) => (
                    <div
                      key={line.id}
                      className="flex items-center gap-2 rounded-md border border-border p-2"
                    >
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          className="flex items-center gap-1 truncate text-left text-sm font-medium hover:underline"
                          onClick={() => openInfo(line.name, line.category)}
                        >
                          {line.name}
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </button>
                        <p className="text-xs text-muted-foreground">
                          ₹{line.price.toFixed(2)} • GST {line.gstRate}% • {line.available} left
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => changeQty(line.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm tabular-nums">{line.qty}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => changeQty(line.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeLine(line.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Discount + tax mode */}
                <div className="grid grid-cols-2 gap-2 border-t border-border pt-2">
                  <div>
                    <Label className="text-xs">Discount %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={discountPct}
                      onChange={(e) =>
                        setDiscountPct(
                          Math.max(0, Math.min(100, parseFloat(e.target.value) || 0))
                        )
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <Label className="text-xs">Inter-state (IGST)</Label>
                    <div className="flex h-8 items-center gap-2">
                      <Switch checked={isInterState} onCheckedChange={setIsInterState} />
                      <span className="text-xs text-muted-foreground">
                        {isInterState ? "IGST" : "CGST + SGST"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                  <Row label="Subtotal" value={calc.subtotal} />
                  {calc.discount > 0 && (
                    <Row label={`Discount (${discountPct}%)`} value={-calc.discount} negative />
                  )}
                  <Row label="Taxable amount" value={calc.taxable} muted />
                  {isInterState ? (
                    <Row label="IGST" value={calc.igst} muted />
                  ) : (
                    <>
                      <Row label="CGST" value={calc.cgst} muted />
                      <Row label="SGST" value={calc.sgst} muted />
                    </>
                  )}
                  <div className="mt-1 flex items-center justify-between border-t border-border pt-1.5">
                    <span className="text-sm font-semibold">Grand Total</span>
                    <span className="text-xl font-bold tabular-nums">
                      ₹{calc.grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Payment method */}
                <div className="space-y-2">
                  <Label className="text-xs">Payment method</Label>
                  <Tabs
                    value={paymentMethod}
                    onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                  >
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="upi" className="text-xs">
                        <Smartphone className="mr-1 h-3.5 w-3.5" /> UPI
                      </TabsTrigger>
                      <TabsTrigger value="card" className="text-xs">
                        <CreditCard className="mr-1 h-3.5 w-3.5" /> Card
                      </TabsTrigger>
                      <TabsTrigger value="netbanking" className="text-xs">
                        <Building2 className="mr-1 h-3.5 w-3.5" /> Bank
                      </TabsTrigger>
                      <TabsTrigger value="cash" className="text-xs">
                        <Wallet className="mr-1 h-3.5 w-3.5" /> Cash
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="upi" className="mt-2 space-y-2">
                      <Input
                        placeholder="customer@upi"
                        value={paymentDetails.upiId}
                        onChange={(e) =>
                          setPaymentDetails((p) => ({ ...p, upiId: e.target.value.slice(0, 50) }))
                        }
                      />
                    </TabsContent>
                    <TabsContent value="card" className="mt-2 space-y-2">
                      <Input
                        placeholder="Cardholder name"
                        value={paymentDetails.cardName}
                        onChange={(e) =>
                          setPaymentDetails((p) => ({
                            ...p,
                            cardName: e.target.value.slice(0, 50),
                          }))
                        }
                      />
                      <Input
                        placeholder="Last 4 digits"
                        maxLength={4}
                        value={paymentDetails.cardLast4}
                        onChange={(e) =>
                          setPaymentDetails((p) => ({
                            ...p,
                            cardLast4: e.target.value.replace(/\D/g, "").slice(0, 4),
                          }))
                        }
                      />
                    </TabsContent>
                    <TabsContent value="netbanking" className="mt-2 space-y-2">
                      <Input
                        placeholder="Bank txn reference"
                        value={paymentDetails.bankRef}
                        onChange={(e) =>
                          setPaymentDetails((p) => ({
                            ...p,
                            bankRef: e.target.value.slice(0, 40),
                          }))
                        }
                      />
                    </TabsContent>
                    <TabsContent value="cash" className="mt-2 space-y-2">
                      <Input
                        type="number"
                        placeholder={`Tendered (≥ ₹${calc.grandTotal.toFixed(2)})`}
                        value={paymentDetails.cashTendered}
                        onChange={(e) =>
                          setPaymentDetails((p) => ({ ...p, cashTendered: e.target.value }))
                        }
                      />
                      {paymentDetails.cashTendered &&
                        parseFloat(paymentDetails.cashTendered) >= calc.grandTotal && (
                          <p className="text-xs text-success">
                            Change: ₹
                            {(
                              parseFloat(paymentDetails.cashTendered) - calc.grandTotal
                            ).toFixed(2)}
                          </p>
                        )}
                    </TabsContent>
                  </Tabs>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleGenerate}
                  disabled={sellMut.isPending || cart.length === 0}
                >
                  <Receipt className="mr-1.5 h-4 w-4" />
                  {sellMut.isPending
                    ? "Processing…"
                    : `Generate invoice • ₹${calc.grandTotal.toFixed(2)}`}
                </Button>
              </>
            )}

            {lastBill && (
              <div className="mt-2 rounded-lg border border-success/30 bg-success/5 p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-success">
                      ✓ Invoice {lastBill.invoiceNo}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {lastBill.at.toLocaleString()} •{" "}
                      {lastBill.method.toUpperCase()}
                      {lastBill.customer.name && ` • ${lastBill.customer.name}`}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => window.print()}>
                    <Printer className="mr-1 h-3 w-3" /> Print
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-7 px-1 text-[11px]">Item</TableHead>
                      <TableHead className="h-7 px-1 text-right text-[11px]">Qty</TableHead>
                      <TableHead className="h-7 px-1 text-right text-[11px]">Amt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lastBill.lines.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="px-1 py-1 text-xs">{l.name}</TableCell>
                        <TableCell className="px-1 py-1 text-right text-xs tabular-nums">
                          {l.qty}
                        </TableCell>
                        <TableCell className="px-1 py-1 text-right text-xs tabular-nums">
                          ₹{(l.qty * l.price).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-2 space-y-0.5 text-[11px]">
                  <Row small label="Subtotal" value={lastBill.subtotal} />
                  {lastBill.discount > 0 && (
                    <Row small label="Discount" value={-lastBill.discount} negative />
                  )}
                  {lastBill.igst > 0 ? (
                    <Row small label="IGST" value={lastBill.igst} muted />
                  ) : (
                    <>
                      <Row small label="CGST" value={lastBill.cgst} muted />
                      <Row small label="SGST" value={lastBill.sgst} muted />
                    </>
                  )}
                  <Row small label="Grand Total" value={lastBill.grandTotal} bold />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <MedicineInfoDialog
        open={infoOpen}
        onOpenChange={setInfoOpen}
        medicineName={infoMed?.name ?? null}
        category={infoMed?.category ?? null}
      />
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  negative,
  bold,
  small,
}: {
  label: string;
  value: number;
  muted?: boolean;
  negative?: boolean;
  bold?: boolean;
  small?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${
        small ? "text-[11px]" : "text-sm"
      } ${muted ? "text-muted-foreground" : "text-foreground"} ${bold ? "font-semibold" : ""}`}
    >
      <span>{label}</span>
      <span className="tabular-nums">
        {negative ? "-" : ""}₹{Math.abs(value).toFixed(2)}
      </span>
    </div>
  );
}
