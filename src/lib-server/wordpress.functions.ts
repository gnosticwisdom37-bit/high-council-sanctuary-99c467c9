/**
 * WordPress.com gateway — Phase 9.
 *
 * All calls flow through the Lovable connector gateway, never the WP.com
 * REST API directly. Each Workshop binds to a single WP site (id picked once
 * by the King) and publishes drafts/scheduled/published posts from there.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/wordpress_com";

function headers() {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const WP_KEY = process.env.WORDPRESS_COM_API_KEY;
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
  if (!WP_KEY) throw new Error("WORDPRESS_COM_API_KEY is not configured — link WordPress.com first.");
  return {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": WP_KEY,
    "Content-Type": "application/json",
  };
}

async function wpFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`WordPress [${res.status}]: ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : null;
}

// ─── listWpSites ───────────────────────────────────────────────────────────
export const listWpSites = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      const data = (await wpFetch("/rest/v1.1/me/sites")) as {
        sites?: Array<{ ID: number; name: string; URL: string }>;
      };
      const sites = (data?.sites ?? []).map((s) => ({
        id: String(s.ID),
        name: s.name,
        url: s.URL,
      }));
      return { ok: true as const, sites };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e), sites: [] };
    }
  });

// ─── getWorkshopWpLink ─────────────────────────────────────────────────────
export const getWorkshopWpLink = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ workshop_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: link, error } = await supabaseAdmin
      .from("workshop_wp_links")
      .select("*")
      .eq("workshop_id", data.workshop_id)
      .maybeSingle();
    if (error) return { ok: false as const, error: error.message, link: null };
    return { ok: true as const, link };
  });

// ─── setWorkshopWpSite ─────────────────────────────────────────────────────
export const setWorkshopWpSite = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      workshop_id: z.string().uuid(),
      wp_site_id: z.string().min(1).max(64),
      wp_site_url: z.string().url().optional(),
      wp_site_name: z.string().max(255).optional(),
      default_status: z.enum(["draft", "publish", "future"]).default("draft"),
      default_categories: z.array(z.string().max(64)).max(20).default([]),
      default_tags: z.array(z.string().max(64)).max(20).default([]),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("workshop_wp_links")
      .upsert({
        workshop_id: data.workshop_id,
        wp_site_id: data.wp_site_id,
        wp_site_url: data.wp_site_url ?? null,
        wp_site_name: data.wp_site_name ?? null,
        default_status: data.default_status,
        default_categories: data.default_categories,
        default_tags: data.default_tags,
      }, { onConflict: "workshop_id" });
    return error ? { ok: false as const, error: error.message } : { ok: true as const };
  });

// ─── createWpPost ──────────────────────────────────────────────────────────
export const createWpPost = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      workshop_id: z.string().uuid(),
      title: z.string().min(1).max(500),
      content: z.string().min(1).max(200000),
      excerpt: z.string().max(2000).optional(),
      tags: z.array(z.string().max(64)).max(20).default([]),
      categories: z.array(z.string().max(64)).max(20).default([]),
      status: z.enum(["draft", "publish", "future"]).default("draft"),
      date: z.string().datetime().nullable().optional(),
      source_blog_archive_id: z.string().uuid().nullable().optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: link } = await supabaseAdmin
      .from("workshop_wp_links")
      .select("wp_site_id, wp_site_url")
      .eq("workshop_id", data.workshop_id)
      .maybeSingle();
    if (!link) {
      return { ok: false as const, error: "No WordPress site bound to this Workshop. Pick one first." };
    }
    if (data.status === "future" && !data.date) {
      return { ok: false as const, error: "Scheduled posts require a date." };
    }

    const body: Record<string, unknown> = {
      title: data.title,
      content: data.content,
      status: data.status,
    };
    if (data.excerpt) body.excerpt = data.excerpt;
    if (data.tags.length) body.tags = data.tags.join(",");
    if (data.categories.length) body.categories = data.categories.join(",");
    if (data.date) body.date = data.date;

    try {
      const res = (await wpFetch(
        `/rest/v1.1/sites/${encodeURIComponent(link.wp_site_id)}/posts/new`,
        { method: "POST", body: JSON.stringify(body) },
      )) as { ID: number; URL: string; title?: string; date?: string };

      const wpPostId = String(res.ID);
      const wpUrl = res.URL;

      // Mirror into blog_archive so this post appears in the Studio sources next time.
      await supabaseAdmin.from("blog_archive").insert({
        workshop_id: data.workshop_id,
        source_filename: "studio-newpost",
        title: data.title,
        url: wpUrl,
        published_at: res.date ?? new Date().toISOString(),
        excerpt: data.excerpt ?? "",
        tags: data.tags,
        categories: data.categories,
        views: null,
        comments: null,
        wp_post_id: wpPostId,
        raw: { source: "studio", source_blog_archive_id: data.source_blog_archive_id ?? null } as never,
      });

      // Track in scheduled_posts with channel='wordpress'
      await supabaseAdmin.from("scheduled_posts").insert({
        workshop_id: data.workshop_id,
        title: data.title,
        body: data.excerpt || data.content.slice(0, 500),
        hashtags: data.tags,
        channel: "wordpress",
        scheduled_at: data.date ?? new Date().toISOString(),
        status: data.status === "publish" ? "published" : data.status === "future" ? "scheduled" : "draft",
        wp_post_id: wpPostId,
        wp_url: wpUrl,
      });

      return { ok: true as const, wp_post_id: wpPostId, wp_url: wpUrl };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
    }
  });
