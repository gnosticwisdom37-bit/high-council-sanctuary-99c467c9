/**
 * WP Stats — Jetpack-style CSV analytics.
 *
 * Three shapes auto-detected by columns (NOT filename):
 *   posts:     [title, views, url?]
 *   downloads: [path, downloads]      (path starts with "/")
 *   countries: [country, views]       (2 cols, first col is a country name)
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const WorkshopInput = z.object({
  workshop_id: z.string().uuid(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.number().int().min(1).max(500).default(50),
});

function applyPeriodToUploadIds(rows: { id: string; period_start: string | null; period_end: string | null }[], from?: string, to?: string) {
  return rows.filter((r) => {
    if (from && r.period_end && r.period_end < from) return false;
    if (to && r.period_start && r.period_start > to) return false;
    return true;
  }).map((r) => r.id);
}

async function uploadIds(workshop_id: string, kind: "posts" | "downloads" | "countries", from?: string, to?: string) {
  const { data, error } = await supabaseAdmin
    .from("wp_stats_uploads")
    .select("id, period_start, period_end")
    .eq("workshop_id", workshop_id)
    .eq("kind", kind);
  if (error || !data) return [];
  return applyPeriodToUploadIds(data, from, to);
}

export const listWpStatsUploads = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ workshop_id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("wp_stats_uploads")
      .select("id, kind, source_filename, period_start, period_end, row_count, created_at")
      .eq("workshop_id", data.workshop_id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return { ok: false as const, error: error.message, uploads: [] };
    return { ok: true as const, uploads: rows ?? [] };
  });

export const getTopPosts = createServerFn({ method: "POST" })
  .inputValidator((i) => WorkshopInput.parse(i))
  .handler(async ({ data }) => {
    const ids = await uploadIds(data.workshop_id, "posts", data.from, data.to);
    if (ids.length === 0) return { ok: true as const, posts: [] };
    const { data: rows, error } = await supabaseAdmin
      .from("wp_post_views")
      .select("title, url, views")
      .in("upload_id", ids);
    if (error) return { ok: false as const, error: error.message, posts: [] };
    const agg = new Map<string, { title: string; url: string | null; views: number }>();
    for (const r of rows ?? []) {
      const key = (r.url ?? "") + "::" + r.title;
      const prev = agg.get(key);
      if (prev) prev.views += r.views ?? 0;
      else agg.set(key, { title: r.title, url: r.url, views: r.views ?? 0 });
    }
    const posts = Array.from(agg.values()).sort((a, b) => b.views - a.views).slice(0, data.limit);
    return { ok: true as const, posts };
  });

export const getTopDownloads = createServerFn({ method: "POST" })
  .inputValidator((i) => WorkshopInput.parse(i))
  .handler(async ({ data }) => {
    const ids = await uploadIds(data.workshop_id, "downloads", data.from, data.to);
    if (ids.length === 0) return { ok: true as const, files: [] };
    const { data: rows, error } = await supabaseAdmin
      .from("wp_file_downloads")
      .select("path, filename, downloads")
      .in("upload_id", ids);
    if (error) return { ok: false as const, error: error.message, files: [] };
    const agg = new Map<string, { path: string; filename: string | null; downloads: number }>();
    for (const r of rows ?? []) {
      const prev = agg.get(r.path);
      if (prev) prev.downloads += r.downloads ?? 0;
      else agg.set(r.path, { path: r.path, filename: r.filename, downloads: r.downloads ?? 0 });
    }
    const files = Array.from(agg.values()).sort((a, b) => b.downloads - a.downloads).slice(0, data.limit);
    return { ok: true as const, files };
  });

export const getCountryViews = createServerFn({ method: "POST" })
  .inputValidator((i) => WorkshopInput.parse(i))
  .handler(async ({ data }) => {
    const ids = await uploadIds(data.workshop_id, "countries", data.from, data.to);
    if (ids.length === 0) return { ok: true as const, countries: [] };
    const { data: rows, error } = await supabaseAdmin
      .from("wp_country_views")
      .select("country, iso_a2, views")
      .in("upload_id", ids);
    if (error) return { ok: false as const, error: error.message, countries: [] };
    const agg = new Map<string, { country: string; iso_a2: string | null; views: number }>();
    for (const r of rows ?? []) {
      const key = r.country;
      const prev = agg.get(key);
      if (prev) prev.views += r.views ?? 0;
      else agg.set(key, { country: r.country, iso_a2: r.iso_a2, views: r.views ?? 0 });
    }
    const countries = Array.from(agg.values()).sort((a, b) => b.views - a.views);
    return { ok: true as const, countries };
  });
