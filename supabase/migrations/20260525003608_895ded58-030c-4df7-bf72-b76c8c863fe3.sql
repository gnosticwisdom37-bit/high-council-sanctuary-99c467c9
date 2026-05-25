
-- Kingdom-wide stationery (single row)
CREATE TABLE public.kingdom_stationery (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  header_html text NOT NULL DEFAULT '',
  footer_html text NOT NULL DEFAULT '',
  signature_block_html text NOT NULL DEFAULT '',
  accent_color text NOT NULL DEFAULT '#c9a84c',
  logo_url text,
  thumbprint_url text,
  sign_off_name text NOT NULL DEFAULT 'King Sean',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kingdom_stationery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stationery readable by anyone" ON public.kingdom_stationery
  FOR SELECT USING (true);
CREATE POLICY "Stationery updatable by anyone" ON public.kingdom_stationery
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Stationery insertable by anyone" ON public.kingdom_stationery
  FOR INSERT WITH CHECK (true);

CREATE TRIGGER tr_kingdom_stationery_touch
  BEFORE UPDATE ON public.kingdom_stationery
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed the single row
INSERT INTO public.kingdom_stationery (id) VALUES (true);

-- Email threads (per-Workshop view of the King's shared inbox)
CREATE TABLE public.email_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL,
  gmail_thread_id text NOT NULL,
  subject text NOT NULL DEFAULT '',
  from_addr text NOT NULL DEFAULT '',
  snippet text NOT NULL DEFAULT '',
  last_message_at timestamptz,
  unread boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workshop_id, gmail_thread_id)
);

ALTER TABLE public.email_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Threads readable by anyone" ON public.email_threads
  FOR SELECT USING (true);
CREATE POLICY "Threads insertable by anyone" ON public.email_threads
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Threads updatable by anyone" ON public.email_threads
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Threads deletable by anyone" ON public.email_threads
  FOR DELETE USING (true);

CREATE INDEX idx_email_threads_workshop_last ON public.email_threads (workshop_id, last_message_at DESC);

CREATE TRIGGER tr_email_threads_touch
  BEFORE UPDATE ON public.email_threads
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Email messages
CREATE TYPE email_direction AS ENUM ('inbound', 'outbound');

CREATE TABLE public.email_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.email_threads(id) ON DELETE CASCADE,
  gmail_message_id text NOT NULL,
  direction email_direction NOT NULL,
  from_addr text NOT NULL DEFAULT '',
  to_addr text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  body_text text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  sent_at timestamptz,
  draft_soul_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, gmail_message_id)
);

ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Messages readable by anyone" ON public.email_messages
  FOR SELECT USING (true);
CREATE POLICY "Messages insertable by anyone" ON public.email_messages
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_email_messages_thread ON public.email_messages (thread_id, sent_at);

-- Storage bucket for kingdom assets (logo, thumbprint)
INSERT INTO storage.buckets (id, name, public) VALUES ('kingdom-assets', 'kingdom-assets', true);

CREATE POLICY "Kingdom assets public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'kingdom-assets');
CREATE POLICY "Kingdom assets public write" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'kingdom-assets');
CREATE POLICY "Kingdom assets public update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'kingdom-assets') WITH CHECK (bucket_id = 'kingdom-assets');
CREATE POLICY "Kingdom assets public delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'kingdom-assets');
