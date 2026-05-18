
CREATE TYPE public.curated_kind AS ENUM ('blog-archive', 'legal-document');

CREATE TABLE public.curated_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL,
  kind public.curated_kind NOT NULL,
  source_filename text NOT NULL,
  source_bytes integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX curated_outputs_workshop_idx ON public.curated_outputs (workshop_id, created_at DESC);

ALTER TABLE public.curated_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Curated readable by anyone" ON public.curated_outputs FOR SELECT USING (true);
CREATE POLICY "Curated insertable by anyone" ON public.curated_outputs FOR INSERT WITH CHECK (true);
CREATE POLICY "Curated updatable by anyone" ON public.curated_outputs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Curated deletable by anyone" ON public.curated_outputs FOR DELETE USING (true);

CREATE TRIGGER curated_outputs_touch
  BEFORE UPDATE ON public.curated_outputs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.curated_outputs;
