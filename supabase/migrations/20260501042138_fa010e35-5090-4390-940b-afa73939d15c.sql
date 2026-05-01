-- Phase 5.7: Stewardship & Curation
-- Add witnesses array + DELETE permission to deeds, items, buildings

ALTER TABLE public.deeds ADD COLUMN IF NOT EXISTS witnesses text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS witnesses text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS witnesses text[] NOT NULL DEFAULT '{}';

CREATE POLICY "Deeds deletable by anyone" ON public.deeds FOR DELETE USING (true);
CREATE POLICY "Items deletable by anyone" ON public.items FOR DELETE USING (true);
CREATE POLICY "Buildings deletable by anyone" ON public.buildings FOR DELETE USING (true);