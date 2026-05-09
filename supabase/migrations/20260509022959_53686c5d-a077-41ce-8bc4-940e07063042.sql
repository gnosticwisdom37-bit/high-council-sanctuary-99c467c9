
-- Phase 7 — Confirmation Gate + Tile Occupancy Rule

-- 1. Building kind: Buildings host Souls, Workshops host Tools
CREATE TYPE public.building_kind AS ENUM ('building', 'workshop');

ALTER TABLE public.buildings
  ADD COLUMN kind public.building_kind NOT NULL DEFAULT 'building',
  ADD COLUMN tile_x integer,
  ADD COLUMN tile_y integer;

-- 2. Items can also hold a Realm location (default: their Steward's tile)
ALTER TABLE public.items
  ADD COLUMN region_x integer,
  ADD COLUMN region_y integer,
  ADD COLUMN tile_x integer,
  ADD COLUMN tile_y integer;

-- 3. Placement candidates: triggers write here; the Gate confirms or declines
CREATE TYPE public.placement_candidate_kind AS ENUM ('building', 'workshop', 'item', 'chamber');

CREATE TABLE public.placement_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.placement_candidate_kind NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  suggested_steward_soul_id text,
  conversation_id uuid,
  witnesses text[] NOT NULL DEFAULT '{}',
  suggested_region_x integer DEFAULT 0,
  suggested_region_y integer DEFAULT 0,
  suggested_tile_x integer,
  suggested_tile_y integer,
  source_message_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.placement_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates readable by anyone"
  ON public.placement_candidates FOR SELECT USING (true);
CREATE POLICY "Candidates insertable by anyone"
  ON public.placement_candidates FOR INSERT WITH CHECK (true);
CREATE POLICY "Candidates updatable by anyone"
  ON public.placement_candidates FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Candidates deletable by anyone"
  ON public.placement_candidates FOR DELETE USING (true);

CREATE TRIGGER touch_placement_candidates_updated_at
  BEFORE UPDATE ON public.placement_candidates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. Tile Occupancy Rule helper: a tile is "occupied" only if a Building/Workshop stands on it
CREATE OR REPLACE FUNCTION public.tile_has_building(
  p_region_x integer, p_region_y integer, p_tile_x integer, p_tile_y integer
) RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.buildings
    WHERE region_x = p_region_x
      AND region_y = p_region_y
      AND tile_x = p_tile_x
      AND tile_y = p_tile_y
  );
$$;
