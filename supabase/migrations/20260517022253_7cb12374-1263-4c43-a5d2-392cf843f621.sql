-- 1. Workshops: per-Workshop intake token + active tool key
ALTER TABLE public.workshops
  ADD COLUMN IF NOT EXISTS intake_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'base64'),
  ADD COLUMN IF NOT EXISTS active_tool_key text NOT NULL DEFAULT 'promo-cards';

CREATE UNIQUE INDEX IF NOT EXISTS workshops_intake_token_key ON public.workshops(intake_token);

-- 2. csv_intakes: route by tool_key
ALTER TABLE public.csv_intakes
  ADD COLUMN IF NOT EXISTS tool_key text NOT NULL DEFAULT 'promo-cards';

CREATE INDEX IF NOT EXISTS csv_intakes_workshop_tool_idx
  ON public.csv_intakes(workshop_id, tool_key, created_at DESC);

-- 3. Realtime publication for the intake drawer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'csv_intakes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.csv_intakes;
  END IF;
END $$;

ALTER TABLE public.csv_intakes REPLICA IDENTITY FULL;