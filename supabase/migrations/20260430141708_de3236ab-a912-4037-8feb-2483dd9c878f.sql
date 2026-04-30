ALTER TABLE public.realm_squares
  ADD COLUMN IF NOT EXISTS region_x integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS region_y integer NOT NULL DEFAULT 0;

DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.realm_squares'::regclass AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.realm_squares DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.realm_squares
  ADD CONSTRAINT realm_squares_region_tile_unique UNIQUE (region_x, region_y, x, y);

CREATE INDEX IF NOT EXISTS realm_squares_region_idx
  ON public.realm_squares (region_x, region_y);

ALTER TYPE public.realm_occupant_type ADD VALUE IF NOT EXISTS 'castle';

DROP POLICY IF EXISTS "Realm squares are insertable by anyone" ON public.realm_squares;
CREATE POLICY "Realm squares are insertable by anyone"
  ON public.realm_squares
  FOR INSERT
  TO public
  WITH CHECK (true);