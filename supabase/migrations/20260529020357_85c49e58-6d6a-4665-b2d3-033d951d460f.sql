ALTER TABLE public.scheduled_emails
  ADD COLUMN IF NOT EXISTS ink_color text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS notice_header_html text NOT NULL DEFAULT '';