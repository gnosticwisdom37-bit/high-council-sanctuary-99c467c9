-- Add ink color preference to settings
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS default_ink_color text NOT NULL DEFAULT '#5b21b6';

-- Letter templates (system-seeded + king-authored)
CREATE TABLE IF NOT EXISTS public.letter_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  subject_template text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  accent_color text NOT NULL DEFAULT '#5b21b6',
  notice_header_html text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.letter_templates TO anon, authenticated;
GRANT ALL ON public.letter_templates TO service_role;

ALTER TABLE public.letter_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates readable by anyone"
  ON public.letter_templates FOR SELECT USING (true);
CREATE POLICY "Templates insertable by anyone"
  ON public.letter_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Templates updatable by anyone"
  ON public.letter_templates FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Templates deletable when not system"
  ON public.letter_templates FOR DELETE USING (system = false);

CREATE TRIGGER touch_letter_templates
  BEFORE UPDATE ON public.letter_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed the Formal Legal Notice
INSERT INTO public.letter_templates (name, description, subject_template, body_html, accent_color, notice_header_html, sort_order, system)
VALUES (
  'Formal Legal Notice',
  'Sealed legal correspondence. Notice header in red, body in the King''s chosen ink.',
  'NOTICE — {{matter}}',
  '<p>To Whom It May Concern,</p><p>Take notice that…</p><p>Without prejudice. All Rights Reserved.</p>',
  '#b91c1c',
  '<div style="font-family:Georgia,serif;font-size:18px;font-weight:700;letter-spacing:0.18em;color:#b91c1c;text-transform:uppercase;border-top:2px solid #b91c1c;border-bottom:2px solid #b91c1c;padding:10px 0;margin:0 0 20px 0;text-align:center;">⚖ Formal Legal Notice ⚖</div>',
  0,
  true
)
ON CONFLICT DO NOTHING;