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