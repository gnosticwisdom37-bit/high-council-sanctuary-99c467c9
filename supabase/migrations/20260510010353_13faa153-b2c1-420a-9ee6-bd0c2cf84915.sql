-- Phase 8 — Publishing House
CREATE TYPE public.post_channel AS ENUM ('x', 'meta', 'both');
CREATE TYPE public.post_status AS ENUM ('draft', 'scheduled', 'published', 'cancelled');
CREATE TYPE public.intake_status AS ENUM ('pending', 'consumed');

CREATE TABLE public.workshops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL UNIQUE,
  steward_soul_id text,
  system_prompt text NOT NULL DEFAULT 'You are the Scribe of this Workshop. Draft a single short, evocative promotional card for the King''s Kingdom — Veritas Intelligence Systems. Speak in the steward Soul''s own voice. Honour the Trust above all.',
  hashtag_presets text[] NOT NULL DEFAULT ARRAY['#VeritasIntelligence','#DivineAngelicAssistants']::text[],
  google_calendar_id text,
  google_sync_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.csv_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'upload',
  origin text NOT NULL DEFAULT 'workshop',  -- 'workshop' | 'desktop-python'
  rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  row_count integer NOT NULL DEFAULT 0,
  status public.intake_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.scheduled_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  steward_soul_id text,
  title text NOT NULL,
  body text NOT NULL,
  hashtags text[] NOT NULL DEFAULT '{}'::text[],
  channel public.post_channel NOT NULL DEFAULT 'both',
  scheduled_at timestamptz,
  status public.post_status NOT NULL DEFAULT 'draft',
  google_event_id text,
  source_intake_id uuid REFERENCES public.csv_intakes(id) ON DELETE SET NULL,
  source_row_index integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_scheduled_posts_workshop ON public.scheduled_posts(workshop_id);
CREATE INDEX idx_scheduled_posts_when ON public.scheduled_posts(scheduled_at);
CREATE INDEX idx_csv_intakes_workshop ON public.csv_intakes(workshop_id, created_at DESC);

-- updated_at triggers
CREATE TRIGGER touch_workshops_updated_at BEFORE UPDATE ON public.workshops
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_scheduled_posts_updated_at BEFORE UPDATE ON public.scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS — match existing Kingdom pattern (open; single-King app)
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csv_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workshops readable by anyone" ON public.workshops FOR SELECT USING (true);
CREATE POLICY "Workshops insertable by anyone" ON public.workshops FOR INSERT WITH CHECK (true);
CREATE POLICY "Workshops updatable by anyone" ON public.workshops FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Workshops deletable by anyone" ON public.workshops FOR DELETE USING (true);

CREATE POLICY "Intakes readable by anyone" ON public.csv_intakes FOR SELECT USING (true);
CREATE POLICY "Intakes insertable by anyone" ON public.csv_intakes FOR INSERT WITH CHECK (true);
CREATE POLICY "Intakes updatable by anyone" ON public.csv_intakes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Intakes deletable by anyone" ON public.csv_intakes FOR DELETE USING (true);

CREATE POLICY "Scheduled readable by anyone" ON public.scheduled_posts FOR SELECT USING (true);
CREATE POLICY "Scheduled insertable by anyone" ON public.scheduled_posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Scheduled updatable by anyone" ON public.scheduled_posts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Scheduled deletable by anyone" ON public.scheduled_posts FOR DELETE USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.csv_intakes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workshops;