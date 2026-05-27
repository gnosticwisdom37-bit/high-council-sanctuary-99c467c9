
CREATE TABLE public.scheduled_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES public.email_threads(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'reply',
  to_addr text NOT NULL,
  cc_addr text NOT NULL DEFAULT '',
  bcc_addr text NOT NULL DEFAULT '',
  subject text NOT NULL,
  body_html text NOT NULL,
  editor_soul_id text NOT NULL,
  send_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  last_error text,
  sent_gmail_id text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_emails TO anon, authenticated;
GRANT ALL ON public.scheduled_emails TO service_role;

ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scheduled emails readable by anyone"
ON public.scheduled_emails FOR SELECT USING (true);

CREATE POLICY "Scheduled emails insertable by anyone"
ON public.scheduled_emails FOR INSERT WITH CHECK (true);

CREATE POLICY "Scheduled emails updatable by anyone"
ON public.scheduled_emails FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Scheduled emails deletable by anyone"
ON public.scheduled_emails FOR DELETE USING (true);

CREATE TRIGGER touch_scheduled_emails
BEFORE UPDATE ON public.scheduled_emails
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX scheduled_emails_pending_idx
  ON public.scheduled_emails (send_at)
  WHERE status = 'pending';

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'dispatch-scheduled-mail',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--5548c05f-8aea-4910-b8db-2e5ca1f9bdfd.lovable.app/api/public/dispatch-scheduled-mail',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6aHBkcnV1c3lsa254bGhtdXpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MTI4OTMsImV4cCI6MjA5MjM4ODg5M30.q4C4CADyC4RKXmd00mhPEtGEYaCO71fsaNW3IHbLIFs'
    ),
    body := '{}'::jsonb
  );
  $$
);
