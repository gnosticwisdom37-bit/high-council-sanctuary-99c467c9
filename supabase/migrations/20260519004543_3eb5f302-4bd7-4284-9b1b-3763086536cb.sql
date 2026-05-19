
-- ── enums ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.legal_doc_type AS ENUM (
    'affidavit', 'notice', 'summons', 'motion', 'order', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── blog_archive ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blog_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL,
  source_filename text NOT NULL,
  title text NOT NULL,
  url text,
  published_at timestamptz,
  excerpt text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  categories text[] NOT NULL DEFAULT '{}',
  views integer,
  comments integer,
  wp_post_id text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_archive_workshop_published
  ON public.blog_archive (workshop_id, published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_blog_archive_views
  ON public.blog_archive (workshop_id, views DESC NULLS LAST);

ALTER TABLE public.blog_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Blog archive readable by anyone"
  ON public.blog_archive FOR SELECT USING (true);
CREATE POLICY "Blog archive insertable by anyone"
  ON public.blog_archive FOR INSERT WITH CHECK (true);
CREATE POLICY "Blog archive updatable by anyone"
  ON public.blog_archive FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Blog archive deletable by anyone"
  ON public.blog_archive FOR DELETE USING (true);

CREATE TRIGGER trg_blog_archive_touch
  BEFORE UPDATE ON public.blog_archive
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── legal_documents ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL,
  source_filename text NOT NULL,
  source_bytes integer NOT NULL DEFAULT 0,
  doc_title text NOT NULL,
  document_type public.legal_doc_type NOT NULL DEFAULT 'other',
  date_served timestamptz,
  date_filed timestamptz,
  date_due timestamptz,
  hearing_date timestamptz,
  served_upon text[] NOT NULL DEFAULT '{}',
  served_by text,
  parties text[] NOT NULL DEFAULT '{}',
  email_addresses text[] NOT NULL DEFAULT '{}',
  phone_numbers text[] NOT NULL DEFAULT '{}',
  addresses text[] NOT NULL DEFAULT '{}',
  case_number text,
  jurisdiction text,
  page_count integer NOT NULL DEFAULT 0,
  extracted_clauses text[] NOT NULL DEFAULT '{}',
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_docs_workshop_served
  ON public.legal_documents (workshop_id, date_served DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_legal_docs_workshop_hearing
  ON public.legal_documents (workshop_id, hearing_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_legal_docs_type
  ON public.legal_documents (document_type);

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Legal docs readable by anyone"
  ON public.legal_documents FOR SELECT USING (true);
CREATE POLICY "Legal docs insertable by anyone"
  ON public.legal_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Legal docs updatable by anyone"
  ON public.legal_documents FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Legal docs deletable by anyone"
  ON public.legal_documents FOR DELETE USING (true);

CREATE TRIGGER trg_legal_documents_touch
  BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
