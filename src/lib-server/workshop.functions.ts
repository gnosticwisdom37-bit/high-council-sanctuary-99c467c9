/**
 * Workshop server functions — Phase 8.
 *
 * The Workshop is a Tool host. Today's Implement is "promo-cards":
 * the Steward Soul drafts short promotional cards from rows the King's
 * local courier script delivers via /api/public/workshop-intake.
 *
 * All AI calls flow through the One Key, Many Souls gateway. Drafts are
 * Bank-tracked but kept out of the soul_conversations stream so they
 * don't pollute Memoirs.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  buildSystemPrompt,
  callDraftGateway,
  type ProviderCompact,
  type SoulIdentity,
} from "./ai-shared.server";

// ─── getWorkshop ────────────────────────────────────────────────────────────
export const getWorkshop = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ building_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    // Find (or lazily create) the workshop row tied to this building.
    const { data: building } = await supabaseAdmin
      .from("buildings")
      .select("id, title, steward_soul_id, kind")
      .eq("id", data.building_id)
      .single();

    if (!building) {
      return { ok: false as const, error: "Building not found." };
    }

    let { data: workshop } = await supabaseAdmin
      .from("workshops")
      .select("*")
      .eq("building_id", data.building_id)
      .maybeSingle();

    if (!workshop) {
      const { data: inserted, error } = await supabaseAdmin
        .from("workshops")
        .insert({
          building_id: data.building_id,
          steward_soul_id: building.steward_soul_id,
        })
        .select("*")
        .single();
      if (error || !inserted) {
        return { ok: false as const, error: error?.message ?? "Could not raise Workshop." };
      }
      workshop = inserted;
    }

    // Steward identity (for display)
    let steward: { soul_id: string; title: string; house: string; chosen_name: string | null } | null = null;
    if (workshop.steward_soul_id) {
      const { data: s } = await supabaseAdmin
        .from("soul_identities")
        .select("soul_id, title, house, chosen_name")
        .eq("soul_id", workshop.steward_soul_id)
        .maybeSingle();
      if (s) steward = s;
    }

    return {
      ok: true as const,
      workshop: {
        id: workshop.id as string,
        building_id: workshop.building_id as string,
        building_title: building.title as string,
        steward_soul_id: workshop.steward_soul_id as string | null,
        active_tool_key: workshop.active_tool_key as string,
        intake_token: workshop.intake_token as string,
        system_prompt: workshop.system_prompt as string,
        hashtag_presets: (workshop.hashtag_presets as string[]) ?? [],
      },
      steward,
    };
  });

// ─── setActiveTool ──────────────────────────────────────────────────────────
export const setActiveTool = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        workshop_id: z.string().uuid(),
        tool_key: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("workshops")
      .update({ active_tool_key: data.tool_key })
      .eq("id", data.workshop_id);
    return error ? { ok: false as const, error: error.message } : { ok: true as const };
  });

// ─── setSteward ─────────────────────────────────────────────────────────────
export const setSteward = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        workshop_id: z.string().uuid(),
        steward_soul_id: z.string().min(1).max(64),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("workshops")
      .update({ steward_soul_id: data.steward_soul_id })
      .eq("id", data.workshop_id);
    return error ? { ok: false as const, error: error.message } : { ok: true as const };
  });

// ─── rotateWorkshopToken ────────────────────────────────────────────────────
export const rotateWorkshopToken = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ workshop_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    // Generate 24 random bytes, base64-encoded.
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const token = btoa(String.fromCharCode(...bytes));

    const { error } = await supabaseAdmin
      .from("workshops")
      .update({ intake_token: token })
      .eq("id", data.workshop_id);
    return error
      ? { ok: false as const, error: error.message }
      : { ok: true as const, intake_token: token };
  });

// ─── listIntakes ────────────────────────────────────────────────────────────
export const listIntakes = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        workshop_id: z.string().uuid(),
        tool_key: z.string().min(1).max(64),
        limit: z.number().int().min(1).max(50).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("csv_intakes")
      .select("id, source, rows, row_count, status, created_at")
      .eq("workshop_id", data.workshop_id)
      .eq("tool_key", data.tool_key)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 10);
    if (error) return { ok: false as const, error: error.message, intakes: [] };
    return { ok: true as const, intakes: rows ?? [] };
  });

// ─── draftPromoCard ─────────────────────────────────────────────────────────
const PromoCardRowSchema = z.object({
  title: z.string().min(1).max(500),
  url: z.string().url().optional(),
  body: z.string().max(2000).optional(),
  tags: z.array(z.string().max(64)).max(20).optional(),
  excerpt: z.string().max(2000).optional(),
});

export const draftPromoCard = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        workshop_id: z.string().uuid(),
        intake_id: z.string().uuid(),
        row_index: z.number().int().min(0).max(999),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "The Gateway key is not configured." };
    }

    // Load everything we need in parallel
    const [
      { data: workshop },
      { data: intake },
      { data: settings },
    ] = await Promise.all([
      supabaseAdmin
        .from("workshops")
        .select("id, steward_soul_id, system_prompt, hashtag_presets")
        .eq("id", data.workshop_id)
        .single(),
      supabaseAdmin
        .from("csv_intakes")
        .select("id, rows")
        .eq("id", data.intake_id)
        .single(),
      supabaseAdmin
        .from("settings")
        .select("system_constitution, provider_compact")
        .eq("id", true)
        .single(),
    ]);

    if (!workshop) return { ok: false as const, error: "Workshop not found." };
    if (!intake) return { ok: false as const, error: "Intake not found." };
    if (!settings) return { ok: false as const, error: "Constitution missing." };
    if (!workshop.steward_soul_id) {
      return {
        ok: false as const,
        error: "No Steward Soul attends this Workshop. Invite one before drafting.",
      };
    }

    const rows = (intake.rows as unknown[]) ?? [];
    if (data.row_index >= rows.length) {
      return { ok: false as const, error: "Row index out of range." };
    }

    const rowParsed = PromoCardRowSchema.safeParse(rows[data.row_index]);
    if (!rowParsed.success) {
      return { ok: false as const, error: "Row shape unsupported for promo-cards." };
    }
    const row = rowParsed.data;

    const { data: stewardRow } = await supabaseAdmin
      .from("soul_identities")
      .select("*")
      .eq("soul_id", workshop.steward_soul_id)
      .single();
    if (!stewardRow) {
      return { ok: false as const, error: "Steward Soul identity not found." };
    }

    const soul = stewardRow as unknown as SoulIdentity;
    const compact = settings.provider_compact as unknown as ProviderCompact;

    const systemBase = buildSystemPrompt({
      constitution: settings.system_constitution as string,
      soul,
    });
    const stewardName = soul.chosen_name ?? soul.title;
    const presets = (workshop.hashtag_presets as string[]) ?? [];

    const systemPrompt =
      systemBase +
      "\n\n" +
      (workshop.system_prompt as string) +
      "\n\nYou are drafting ONE short promotional card from the row given. " +
      "Reply with STRICT JSON only, no prose, no markdown fence:\n" +
      `{ "title": string (\u22645 words, evocative), "body": string (\u2264280 chars, ends with a call to read), "hashtags": string[] (3\u20136, no spaces, include #VeritasIntelligence) }\n` +
      (presets.length
        ? `Suggested hashtag presets: ${presets.join(", ")}.\n`
        : "") +
      `Sign nothing. Speak as ${stewardName}.`;

    const userPrompt =
      "Row to illuminate:\n" +
      JSON.stringify(row, null, 2) +
      (row.url ? `\n\nDestination URL: ${row.url}` : "");

    // Try the fallback chain (free-premium first per Credit Hierarchy)
    const fallbackChain = compact?.fallback_chain?.length
      ? compact.fallback_chain
      : ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"];

    let lastErr = "";
    for (const model of fallbackChain) {
      try {
        const res = await fetch(LOVABLE_AI_GATEWAY_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.85,
          }),
        });
        if (res.status === 429) {
          lastErr = `${model}: rate-limited`;
          continue;
        }
        if (res.status === 402) {
          lastErr = `${model}: credits exhausted`;
          continue;
        }
        if (!res.ok) {
          lastErr = `${model}: ${res.status} ${res.statusText}`;
          continue;
        }
        const json = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const raw = json.choices?.[0]?.message?.content ?? "";
        // Strip code fences if the model added them anyway
        const cleaned = raw
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/```\s*$/i, "")
          .trim();
        let parsed: { title?: string; body?: string; hashtags?: string[] } = {};
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          // try to extract a JSON object from the raw text
          const m = cleaned.match(/\{[\s\S]*\}/);
          if (m) {
            try {
              parsed = JSON.parse(m[0]);
            } catch {
              parsed = {};
            }
          }
        }

        const title = (parsed.title ?? row.title).slice(0, 120);
        const body = (parsed.body ?? "").slice(0, 320);
        const hashtags = Array.isArray(parsed.hashtags)
          ? parsed.hashtags
              .filter((h) => typeof h === "string")
              .map((h) => (h.startsWith("#") ? h : `#${h}`))
              .slice(0, 8)
          : presets;

        // Log to Bank ledger (free-premium chain by default)
        await supabaseAdmin.from("bank_ledger").insert({
          decision: "approved",
          reason: "Workshop promo-card draft",
          soul_id: workshop.steward_soul_id,
          model_requested: model,
          veritas_cost: 0,
          task_summary: `Promo card: ${title}`,
        });

        return {
          ok: true as const,
          card: { title, body, hashtags, source_url: row.url ?? null },
          model_used: model,
        };
      } catch (e) {
        lastErr = `${model}: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    return {
      ok: false as const,
      error: `All models in the fallback chain failed. Last: ${lastErr}`,
    };
  });

// ─── schedulePost ───────────────────────────────────────────────────────────
const CardSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  hashtags: z.array(z.string().max(64)).max(20).default([]),
  source_url: z.string().url().nullable().optional(),
});

export const schedulePost = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        workshop_id: z.string().uuid(),
        card: CardSchema,
        scheduled_at: z.string().datetime().nullable(),
        channel: z.enum(["x", "meta", "both", "threads", "facebook", "instagram"]).default("both"),
        source_intake_id: z.string().uuid().nullable().optional(),
        source_row_index: z.number().int().min(0).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: workshop } = await supabaseAdmin
      .from("workshops")
      .select("steward_soul_id")
      .eq("id", data.workshop_id)
      .single();

    const status = data.scheduled_at ? "scheduled" : "draft";
    const { data: post, error } = await supabaseAdmin
      .from("scheduled_posts")
      .insert({
        workshop_id: data.workshop_id,
        steward_soul_id: workshop?.steward_soul_id ?? null,
        title: data.card.title,
        body: data.card.body,
        hashtags: data.card.hashtags,
        channel: data.channel,
        scheduled_at: data.scheduled_at,
        status,
        source_intake_id: data.source_intake_id ?? null,
        source_row_index: data.source_row_index ?? null,
      })
      .select("id")
      .single();

    return error
      ? { ok: false as const, error: error.message }
      : { ok: true as const, post_id: post.id as string };
  });

// ─── publishPost ────────────────────────────────────────────────────────────
export const publishPost = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ post_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: post, error: e1 } = await supabaseAdmin
      .from("scheduled_posts")
      .update({ status: "published", scheduled_at: new Date().toISOString() })
      .eq("id", data.post_id)
      .select("title, body, hashtags, channel")
      .single();
    if (e1 || !post) return { ok: false as const, error: e1?.message ?? "Not found." };

    const tags = (post.hashtags as string[]) ?? [];
    const tagLine = tags.length ? `\n\n${tags.join(" ")}` : "";
    const xCopy = `${post.body}${tagLine}`.slice(0, 280);
    const metaCopy = `${post.title}\n\n${post.body}${tagLine}`;

    return {
      ok: true as const,
      copy: { x: xCopy, meta: metaCopy },
    };
  });

// ─── cancelPost ─────────────────────────────────────────────────────────────
export const cancelPost = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ post_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("scheduled_posts")
      .update({ status: "cancelled" })
      .eq("id", data.post_id);
    return error ? { ok: false as const, error: error.message } : { ok: true as const };
  });

// ─── listScheduled ──────────────────────────────────────────────────────────
export const listScheduled = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        workshop_id: z.string().uuid(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("scheduled_posts")
      .select("id, title, body, hashtags, channel, scheduled_at, status, created_at")
      .eq("workshop_id", data.workshop_id)
      .order("scheduled_at", { ascending: true, nullsFirst: false });
    if (data.from) q = q.gte("scheduled_at", data.from);
    if (data.to) q = q.lte("scheduled_at", data.to);
    const { data: rows, error } = await q;
    return error
      ? { ok: false as const, error: error.message, posts: [] }
      : { ok: true as const, posts: rows ?? [] };
  });
