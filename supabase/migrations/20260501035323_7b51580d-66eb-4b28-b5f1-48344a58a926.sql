-- Phase 5.6 — Items & Buildings (Trigger Engine destinations)

CREATE TYPE item_status AS ENUM ('forged', 'bestowed', 'archived');
CREATE TYPE building_status AS ENUM ('raised', 'in_use', 'archived');

CREATE TABLE public.items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  steward_soul_id text,
  conversation_id uuid,
  status item_status NOT NULL DEFAULT 'forged',
  forged_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Items readable by anyone" ON public.items FOR SELECT USING (true);
CREATE POLICY "Items insertable by anyone" ON public.items FOR INSERT WITH CHECK (true);
CREATE POLICY "Items updatable by anyone" ON public.items FOR UPDATE USING (true) WITH CHECK (true);

CREATE TRIGGER items_touch_updated_at BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.buildings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  steward_soul_id text,
  conversation_id uuid,
  status building_status NOT NULL DEFAULT 'raised',
  region_x integer NOT NULL DEFAULT 0,
  region_y integer NOT NULL DEFAULT 0,
  raised_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buildings readable by anyone" ON public.buildings FOR SELECT USING (true);
CREATE POLICY "Buildings insertable by anyone" ON public.buildings FOR INSERT WITH CHECK (true);
CREATE POLICY "Buildings updatable by anyone" ON public.buildings FOR UPDATE USING (true) WITH CHECK (true);

CREATE TRIGGER buildings_touch_updated_at BEFORE UPDATE ON public.buildings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();