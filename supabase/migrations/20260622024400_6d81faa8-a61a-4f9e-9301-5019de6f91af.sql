
CREATE TABLE public.wp_stats_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('posts','downloads','countries')),
  source_filename TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  row_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wp_stats_uploads TO authenticated;
GRANT ALL ON public.wp_stats_uploads TO service_role;
ALTER TABLE public.wp_stats_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read wp_stats_uploads" ON public.wp_stats_uploads FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write wp_stats_uploads" ON public.wp_stats_uploads FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.wp_post_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.wp_stats_uploads(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  position INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX wp_post_views_workshop_idx ON public.wp_post_views(workshop_id);
CREATE INDEX wp_post_views_upload_idx ON public.wp_post_views(upload_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wp_post_views TO authenticated;
GRANT ALL ON public.wp_post_views TO service_role;
ALTER TABLE public.wp_post_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read wp_post_views" ON public.wp_post_views FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write wp_post_views" ON public.wp_post_views FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.wp_file_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.wp_stats_uploads(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  filename TEXT,
  downloads INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX wp_file_downloads_workshop_idx ON public.wp_file_downloads(workshop_id);
CREATE INDEX wp_file_downloads_upload_idx ON public.wp_file_downloads(upload_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wp_file_downloads TO authenticated;
GRANT ALL ON public.wp_file_downloads TO service_role;
ALTER TABLE public.wp_file_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read wp_file_downloads" ON public.wp_file_downloads FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write wp_file_downloads" ON public.wp_file_downloads FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.wp_country_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.wp_stats_uploads(id) ON DELETE CASCADE,
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  country TEXT NOT NULL,
  iso_a2 TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX wp_country_views_workshop_idx ON public.wp_country_views(workshop_id);
CREATE INDEX wp_country_views_upload_idx ON public.wp_country_views(upload_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wp_country_views TO authenticated;
GRANT ALL ON public.wp_country_views TO service_role;
ALTER TABLE public.wp_country_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read wp_country_views" ON public.wp_country_views FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write wp_country_views" ON public.wp_country_views FOR ALL TO authenticated USING (true) WITH CHECK (true);
