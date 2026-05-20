
-- workshop_wp_links: which WP.com site does this workshop publish to?
CREATE TABLE public.workshop_wp_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL UNIQUE,
  wp_site_id text NOT NULL,
  wp_site_url text,
  wp_site_name text,
  default_status text NOT NULL DEFAULT 'draft',
  default_categories text[] NOT NULL DEFAULT '{}',
  default_tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workshop_wp_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "WP links readable by anyone" ON public.workshop_wp_links FOR SELECT USING (true);
CREATE POLICY "WP links insertable by anyone" ON public.workshop_wp_links FOR INSERT WITH CHECK (true);
CREATE POLICY "WP links updatable by anyone" ON public.workshop_wp_links FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "WP links deletable by anyone" ON public.workshop_wp_links FOR DELETE USING (true);
CREATE TRIGGER touch_workshop_wp_links BEFORE UPDATE ON public.workshop_wp_links
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- legal_calendar_events: Google Calendar reminders for legal docs
CREATE TABLE public.legal_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL,
  legal_document_id uuid NOT NULL,
  google_calendar_id text NOT NULL,
  google_event_id text NOT NULL,
  anchor_used text NOT NULL,
  event_at timestamptz NOT NULL,
  summary text NOT NULL DEFAULT '',
  reminder_days integer[] NOT NULL DEFAULT '{1,7}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX legal_calendar_events_doc_idx ON public.legal_calendar_events(legal_document_id);
CREATE INDEX legal_calendar_events_workshop_idx ON public.legal_calendar_events(workshop_id, event_at DESC);
ALTER TABLE public.legal_calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Legal events readable by anyone" ON public.legal_calendar_events FOR SELECT USING (true);
CREATE POLICY "Legal events insertable by anyone" ON public.legal_calendar_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Legal events updatable by anyone" ON public.legal_calendar_events FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Legal events deletable by anyone" ON public.legal_calendar_events FOR DELETE USING (true);
CREATE TRIGGER touch_legal_calendar_events BEFORE UPDATE ON public.legal_calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Extend scheduled_posts: add wordpress channel + WP refs
ALTER TYPE public.post_channel ADD VALUE IF NOT EXISTS 'wordpress';
ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS wp_post_id text;
ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS wp_url text;
