import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createMedicine } from "@/server/medicines.functions";
import {
  MEDICINE_CATALOG,
  CATALOG_CATEGORIES,
  defaultExpiryDate,
  type CatalogItem,
} from "@/lib/medicine-catalog";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  existingNames: string[];
};

export function QuickAddDialog({ open, onOpenChange, existingNames }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("All");
  const [adding, setAdding] = useState<string | null>(null);

  const existingSet = useMemo(
    () => new Set(existingNames.map((n) => n.toLowerCase())),
    [existingNames]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MEDICINE_CATALOG.filter((it) => {
      if (activeCat !== "All" && it.category !== activeCat) return false;
      if (q && !it.name.toLowerCase().includes(q) && !it.category.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [search, activeCat]);

  const addMut = useMutation({
    mutationFn: (it: CatalogItem) =>
      createMedicine({
        data: {
          name: it.name,
          quantity: it.defaultQty,
          expiry_date: defaultExpiryDate(it.defaultExpiryMonths),
          category: it.category,
        },
      }),
    onSuccess: (_d, it) => {
      qc.invalidateQueries({ queryKey: ["medicines"] });
      toast.success(`${it.name} added`);
      setAdding(null);
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setAdding(null);
    },
  });

  function handleAdd(it: CatalogItem) {
    setAdding(it.name);
    addMut.mutate(it);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Quick add from catalog</DialogTitle>
          <DialogDescription>
            Common dispensary medicines — one-tap add with sensible defaults. You can edit
            quantity and expiry afterwards.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search catalog…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {["All", ...CATALOG_CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setActiveCat(c)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                activeCat === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-accent"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <ScrollArea className="h-[360px] pr-3">
          <div className="space-y-1.5">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No catalog items match.
              </p>
            ) : (
              filtered.map((it) => {
                const already = existingSet.has(it.name.toLowerCase());
                const busy = adding === it.name;
                return (
                  <div
                    key={it.name}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{it.name}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {it.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Default: {it.defaultQty} units • exp ~{it.defaultExpiryMonths}mo
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={already ? "secondary" : "default"}
                      disabled={busy || already}
                      onClick={() => handleAdd(it)}
                    >
                      {already ? (
                        <>
                          <Check className="mr-1 h-3.5 w-3.5" /> In stock
                        </>
                      ) : busy ? (
                        "Adding…"
                      ) : (
                        <>
                          <Plus className="mr-1 h-3.5 w-3.5" /> Add
                        </>
                      )}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
