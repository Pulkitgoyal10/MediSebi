import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Handshake,
  MapPin,
  Star,
  PackageCheck,
  PackageSearch,
  RefreshCw,
  Sparkles,
  Search,
  ArrowRight,
  Clock,
  Megaphone,
  TrendingUp,
  Phone,
  Mail,
  User,
  Hourglass,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  generateMarketplace,
  suggestOffersFromInventory,
  matchRequests,
  aggregateDemandForWholesalers,
  timeAgo,
  timeUntil,
  type TradeOffer,
  type WholesalerDemand,
} from "@/lib/friendly-trade";
import { listMedicines } from "@/server/medicines.functions";
import { daysUntilExpiry, type Medicine } from "@/lib/medicine-logic";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Friendly Trade — MediSebi" },
      {
        name: "description",
        content:
          "Trade surplus stock with nearby pharmacies to avoid expiry and fulfill shortages.",
      },
    ],
  }),
  component: MarketplacePage,
});

function MarketplacePage() {
  const { data } = useQuery({ queryKey: ["medicines"], queryFn: () => listMedicines() });
  const meds: Medicine[] = data?.medicines ?? [];

  const [market, setMarket] = useState<TradeOffer[]>(() => generateMarketplace(16));
  const [search, setSearch] = useState("");
  const [showWholesaler, setShowWholesaler] = useState(false);

  // Refresh marketplace every 10s
  useEffect(() => {
    const id = setInterval(() => setMarket(generateMarketplace(16)), 10_000);
    return () => clearInterval(id);
  }, []);

  const wholesalerDemand = useMemo(() => aggregateDemandForWholesalers(market), [market]);

  const offers = useMemo(
    () => market.filter((m) => m.kind === "offer"),
    [market]
  );
  const requests = useMemo(
    () => market.filter((m) => m.kind === "request"),
    [market]
  );
  const myOffers = useMemo(() => suggestOffersFromInventory(meds), [meds]);
  const matches = useMemo(() => matchRequests(meds, market), [meds, market]);

  const filterFn = (o: TradeOffer) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.medicine.toLowerCase().includes(q) ||
      o.category.toLowerCase().includes(q) ||
      o.pharmacy.name.toLowerCase().includes(q) ||
      o.pharmacy.city.toLowerCase().includes(q)
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="rounded-2xl border border-border p-6 text-primary-foreground shadow-sm"
        style={{ background: "var(--gradient-primary)" }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm/6 opacity-90">
              <Handshake className="h-4 w-4" /> Friendly trade
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
              Trade stock with nearby pharmacies
            </h2>
            <p className="mt-2 max-w-xl text-sm opacity-90">
              Reduce waste from expiry and cover shortages instantly by exchanging
              medicines with verified pharmacies in your area.
            </p>
          </div>
          <Badge variant="secondary" className="gap-1.5 self-start text-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
            Live • updates every 10s
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Open offers" value={offers.filter((o) => o.status === "open").length} icon={PackageCheck} tone="success" />
        <Stat label="Open requests" value={requests.filter((o) => o.status === "open").length} icon={PackageSearch} tone="warning" />
        <Stat label="Suggested matches" value={matches.length} icon={Sparkles} tone="primary" />
        <Stat label="Your offerable items" value={myOffers.length} icon={Handshake} tone="primary" />
      </div>

      {/* Wholesaler demand CTA */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Megaphone className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Aggregate shopkeeper demand for wholesalers
              </p>
              <p className="text-xs text-muted-foreground">
                {wholesalerDemand.length} medicines requested across {market.filter((m) => m.kind === "request").length} pharmacies — share with your distributor.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant={showWholesaler ? "secondary" : "default"}
            onClick={() => setShowWholesaler((v) => !v)}
          >
            {showWholesaler ? "Hide" : "Show wholesaler demand"}
          </Button>
        </CardContent>
      </Card>

      {showWholesaler && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Wholesaler demand summary
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Aggregated open requests across all shopkeepers — sorted by total quantity needed.
              Share this list with your wholesaler to source efficiently.
            </p>
          </CardHeader>
          <CardContent>
            {wholesalerDemand.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No active demand right now.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {wholesalerDemand.map((d) => (
                  <DemandCard key={d.medicine} d={d} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {matches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Smart matches for your shortages
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              We found nearby pharmacies offering what you're running out of.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {matches.map(({ need, offer }, i) => (
              <div
                key={i}
                className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center"
              >
                <div className="flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    You need
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">{need.name}</p>
                  <p className="text-xs text-muted-foreground">Only {need.quantity} left</p>
                </div>
                <ArrowRight className="hidden h-5 w-5 text-primary sm:block" />
                <div className="flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Available from
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">
                    {offer.pharmacy.name}
                  </p>
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {offer.pharmacy.city} • {offer.pharmacy.distance_km} km •{" "}
                    {offer.quantity} units
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() =>
                    toast.success(`Trade request sent to ${offer.pharmacy.name}`)
                  }
                >
                  Request trade
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* My offerable inventory */}
      {myOffers.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <PackageCheck className="h-4 w-4 text-success" />
                Your inventory you can offer
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Excess or approaching-expiry items — list them to avoid waste.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {myOffers.map((o) => {
                const days = daysUntilExpiry(o.expiry_date);
                return (
                  <div
                    key={o.id}
                    className="flex flex-col gap-2 rounded-lg border border-success/30 bg-success/5 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {o.medicine}
                        </p>
                        <p className="text-xs text-muted-foreground">{o.category}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        {o.quantity} units
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{o.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      Expires in {days}d
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1"
                      onClick={() => toast.success(`${o.medicine} listed on marketplace`)}
                    >
                      List for trade
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search + Tabs */}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Live marketplace</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search medicine, city…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMarket(generateMarketplace(16))}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="offers">
            <TabsList>
              <TabsTrigger value="offers">
                Offers ({offers.filter(filterFn).length})
              </TabsTrigger>
              <TabsTrigger value="requests">
                Requests ({requests.filter(filterFn).length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="offers" className="mt-4 space-y-2.5">
              {offers.filter(filterFn).length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No matching offers.
                </p>
              ) : (
                offers.filter(filterFn).map((o) => <OfferCard key={o.id} o={o} />)
              )}
            </TabsContent>

            <TabsContent value="requests" className="mt-4 space-y-2.5">
              {requests.filter(filterFn).length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No matching requests.
                </p>
              ) : (
                requests.filter(filterFn).map((o) => <OfferCard key={o.id} o={o} />)
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function OfferCard({ o }: { o: TradeOffer }) {
  const days = daysUntilExpiry(o.expiry_date);
  const isOffer = o.kind === "offer";
  const action = isOffer ? "Request" : "Fulfill";
  const validLeft = timeUntil(o.valid_until);
  const isExpired = validLeft === "expired";
  const isUrgent = !isExpired && +new Date(o.valid_until) - Date.now() < 6 * 3_600_000;
  const [contactShared, setContactShared] = useState(false);

  const statusTone =
    isExpired
      ? "bg-muted text-muted-foreground"
      : o.status === "open"
      ? "bg-success/15 text-success"
      : o.status === "matched"
      ? "bg-warning/15 text-warning-foreground"
      : "bg-muted text-muted-foreground";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{o.medicine}</p>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {o.category}
          </Badge>
          <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium uppercase ${statusTone}`}>
            {isExpired ? "expired" : o.status}
          </span>
          <span
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium ${
              isUrgent
                ? "bg-destructive/15 text-destructive"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Hourglass className="h-2.5 w-2.5" />
            {validLeft}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{o.reason}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {o.pharmacy.name} • {o.pharmacy.city} • {o.pharmacy.distance_km} km
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-warning text-warning" />
            {o.pharmacy.rating}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo(o.posted_at)}
          </span>
        </div>

        {contactShared && (
          <div className="mt-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
            <p className="mb-1 font-semibold text-primary">Contact details</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" /> {o.pharmacy.contact_name}
              </span>
              <a href={`tel:${o.pharmacy.phone}`} className="flex items-center gap-1 hover:text-primary">
                <Phone className="h-3 w-3" /> {o.pharmacy.phone}
              </a>
              <a href={`mailto:${o.pharmacy.email}`} className="flex items-center gap-1 hover:text-primary">
                <Mail className="h-3 w-3" /> {o.pharmacy.email}
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1.5">
        <div className="text-right">
          <p className="text-sm font-semibold text-foreground tabular-nums">
            {o.quantity} units
          </p>
          <p className="text-xs text-muted-foreground">
            ₹{o.unit_price.toFixed(2)} • exp in {days}d
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="outline"
            disabled={isExpired || contactShared}
            onClick={() => {
              setContactShared(true);
              toast.success(`Contact shared with ${o.pharmacy.name}`);
            }}
          >
            {contactShared ? "Shared" : "Share contact"}
          </Button>
          <Button
            size="sm"
            disabled={o.status !== "open" || isExpired}
            variant={isOffer ? "default" : "outline"}
            onClick={() =>
              toast.success(`${action} sent to ${o.pharmacy.name} for ${o.medicine}`)
            }
          >
            {action} <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "warning" | "success";
}) {
  const toneClasses = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/15 text-warning-foreground",
    success: "bg-success/15 text-success",
  }[tone];
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${toneClasses}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-0.5 text-2xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DemandCard({ d }: { d: WholesalerDemand }) {
  const tone =
    d.urgency === "high"
      ? "border-destructive/40 bg-destructive/5"
      : d.urgency === "medium"
      ? "border-warning/40 bg-warning/5"
      : "border-border";
  const badgeTone =
    d.urgency === "high"
      ? "bg-destructive/15 text-destructive"
      : d.urgency === "medium"
      ? "bg-warning/15 text-warning-foreground"
      : "bg-muted text-muted-foreground";
  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{d.medicine}</p>
          <p className="text-xs text-muted-foreground">{d.category}</p>
        </div>
        <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium uppercase ${badgeTone}`}>
          {d.urgency}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-base font-bold tabular-nums text-foreground">{d.total_quantity}</p>
          <p className="text-[10px] uppercase text-muted-foreground">units</p>
        </div>
        <div>
          <p className="text-base font-bold tabular-nums text-foreground">{d.shopkeepers}</p>
          <p className="text-[10px] uppercase text-muted-foreground">shops</p>
        </div>
        <div>
          <p className="text-base font-bold tabular-nums text-foreground">
            ₹{d.avg_price.toFixed(0)}
          </p>
          <p className="text-[10px] uppercase text-muted-foreground">avg/unit</p>
        </div>
      </div>
      <p className="mt-2 truncate text-[11px] text-muted-foreground">
        {d.cities.slice(0, 3).join(", ")}
        {d.cities.length > 3 ? ` +${d.cities.length - 3}` : ""}
      </p>
    </div>
  );
}
