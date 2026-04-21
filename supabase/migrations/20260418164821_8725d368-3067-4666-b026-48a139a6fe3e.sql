CREATE TABLE public.medicines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  expiry_date DATE NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read medicines" ON public.medicines FOR SELECT USING (true);
CREATE POLICY "Public insert medicines" ON public.medicines FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update medicines" ON public.medicines FOR UPDATE USING (true);
CREATE POLICY "Public delete medicines" ON public.medicines FOR DELETE USING (true);

CREATE INDEX idx_medicines_expiry ON public.medicines(expiry_date);
CREATE INDEX idx_medicines_quantity ON public.medicines(quantity);

CREATE OR REPLACE FUNCTION public.update_medicines_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_medicines_updated_at
  BEFORE UPDATE ON public.medicines
  FOR EACH ROW EXECUTE FUNCTION public.update_medicines_updated_at();

CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  total_items INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  medicine_id UUID REFERENCES public.medicines(id) ON DELETE SET NULL,
  medicine_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_po_items_order ON public.purchase_order_items(order_id);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read purchase_orders" ON public.purchase_orders FOR SELECT USING (true);
CREATE POLICY "Public insert purchase_orders" ON public.purchase_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update purchase_orders" ON public.purchase_orders FOR UPDATE USING (true);
CREATE POLICY "Public delete purchase_orders" ON public.purchase_orders FOR DELETE USING (true);

CREATE POLICY "Public read po_items" ON public.purchase_order_items FOR SELECT USING (true);
CREATE POLICY "Public insert po_items" ON public.purchase_order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update po_items" ON public.purchase_order_items FOR UPDATE USING (true);
CREATE POLICY "Public delete po_items" ON public.purchase_order_items FOR DELETE USING (true);

CREATE TRIGGER update_purchase_orders_updated_at
BEFORE UPDATE ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.update_medicines_updated_at();