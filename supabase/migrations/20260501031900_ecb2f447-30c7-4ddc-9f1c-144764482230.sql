-- Enums
CREATE TYPE public.deed_season AS ENUM ('spring', 'summer', 'fall', 'winter');
CREATE TYPE public.deed_quadrant AS ENUM ('NE', 'SE', 'SW', 'NW');
CREATE TYPE public.deed_status AS ENUM ('inscribed', 'in_progress', 'fulfilled', 'set_aside');

-- Table
CREATE TABLE public.deeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  season public.deed_season NOT NULL,
  quadrant public.deed_quadrant NOT NULL,
  steward_soul_id TEXT,
  conversation_id UUID,
  status public.deed_status NOT NULL DEFAULT 'inscribed',
  inscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deeds_season ON public.deeds(season);
CREATE INDEX idx_deeds_inscribed_at ON public.deeds(inscribed_at DESC);

-- RLS (matches existing single-user pattern)
ALTER TABLE public.deeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deeds readable by anyone"
  ON public.deeds FOR SELECT USING (true);

CREATE POLICY "Deeds insertable by anyone"
  ON public.deeds FOR INSERT WITH CHECK (true);

CREATE POLICY "Deeds updatable by anyone"
  ON public.deeds FOR UPDATE USING (true) WITH CHECK (true);

-- Auto-update timestamp
CREATE TRIGGER deeds_touch_updated_at
  BEFORE UPDATE ON public.deeds
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();