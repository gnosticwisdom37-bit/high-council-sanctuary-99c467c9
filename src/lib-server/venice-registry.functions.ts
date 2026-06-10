/**
 * Venice Registry — live sync of Venice's /api/v1/models into toolbox_models.
 *
 * Tier classification is now driven by the curated `venice-tier-map.ts`:
 *   - PRO_IDS  → venice_tier="pro",  auto_fallback_enabled=true, fallback_rank 1..25
 *   - FREE_IDS → venice_tier="free", auto_fallback_enabled=true, fallback_rank 101..111
 *   - type==="image" → venice_tier="image"
 *   - everything else → venice_tier="paid", auto_fallback_enabled=false
 *
 * Venice's API does not expose a Pro-vs-Free flag — that split lives in
 * `src/data/venice-pro-models.txt` and `src/data/venice-free-models.txt`,
 * mirrored as ID arrays in `venice-tier-map.ts`. When Venice changes the
 * lineup, update both.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import {
  FULL_FALLBACK_CHAIN,
  PRO_IDS,
  FREE_IDS,
  rankFor,
  tierFor,
  unmatchedAgainst,
} from "./venice-tier-map";

const VENICE_MODELS_URL = "https://api.venice.ai/api/v1/models";

type SyncResult = {
  ok: boolean;
  fetched: number;
  upserted: number;
  pro_matched: number;
  free_matched: number;
  pro_missing: string[];
  free_missing: string[];
  error: string | null;
};

function classifyLegacyTier(
  vt: "pro" | "free" | "paid" | "image",
): "free-premium" | "premium" | "image" {
  // Legacy `tier` column kept for backward compat with older code paths.
  // Pro + Free are both "fall back without spending paid credits" from the
  // Bank's perspective; Paid is "premium" (requires petition).
  if (vt === "image") return "image";
  if (vt === "paid") return "premium";
  return "free-premium";
}

function costPerThousand(m: any): number {
  const inUsdPerM = m?.model_spec?.pricing?.input?.usd ?? 0;
  const veritasPer1k = (inUsdPerM / 1000) * 100;
  return Math.max(0, Math.ceil(veritasPer1k));
}

function bestFor(m: any): string[] {
  const caps = m?.model_spec?.capabilities ?? {};
  const out: string[] = [];
  if (caps.supportsReasoning) out.push("reasoning");
  if (caps.supportsVision) out.push("vision");
  if (caps.supportsFunctionCalling) out.push("tools");
  if (caps.supportsWebSearch) out.push("search");
  if (m?.type === "image" || m?.model_spec?.type === "image") out.push("image");
  return out;
}

function displayName(m: any): string {
  const fromApi = m?.model_spec?.name;
  if (typeof fromApi === "string" && fromApi.trim().length > 0) return fromApi;
  const id = String(m?.id ?? "");
  return id.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function runVeniceSync(): Promise<SyncResult> {
  const key = process.env.VENICE_API_KEY;
  if (!key) {
    return {
      ok: false, fetched: 0, upserted: 0, pro_matched: 0, free_matched: 0,
      pro_missing: [], free_missing: [], error: "VENICE_API_KEY missing.",
    };
  }
  const supaUrl = process.env.SUPABASE_URL;
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supaUrl || !supaKey) {
    return {
      ok: false, fetched: 0, upserted: 0, pro_matched: 0, free_matched: 0,
      pro_missing: [], free_missing: [], error: "Supabase env missing.",
    };
  }

  try {
    const [textResp, imageResp] = await Promise.all([
      fetch(`${VENICE_MODELS_URL}?type=text`, {
        headers: { Authorization: `Bearer ${key}` },
      }),
      fetch(`${VENICE_MODELS_URL}?type=image`, {
        headers: { Authorization: `Bearer ${key}` },
      }),
    ]);

    if (!textResp.ok) {
      const t = await textResp.text();
      return {
        ok: false, fetched: 0, upserted: 0, pro_matched: 0, free_matched: 0,
        pro_missing: [], free_missing: [],
        error: `Venice ${textResp.status}: ${t.slice(0, 200)}`,
      };
    }

    const textJson = await textResp.json();
    const imageJson = imageResp.ok ? await imageResp.json() : { data: [] };
    const raw = [...(textJson?.data ?? []), ...(imageJson?.data ?? [])];

    let proMatched = 0;
    let freeMatched = 0;

    const rows = raw.map((m: any) => {
      const id = String(m.id);
      const type = m?.type ?? m?.model_spec?.type ?? null;
      const vt = tierFor(id, type);
      if (vt === "pro") proMatched++;
      else if (vt === "free") freeMatched++;
      const rank = rankFor(id);
      return {
        provider: "venice",
        model_id: id,
        display_name: displayName(m),
        tier: classifyLegacyTier(vt),
        venice_tier: vt,
        auto_fallback_enabled: vt === "pro" || vt === "free",
        fallback_rank: rank,
        best_for: bestFor(m),
        veritas_cost_per_1k_tokens: costPerThousand(m),
        notes: JSON.stringify({
          owned_by: m?.owned_by ?? null,
          type,
          context: m?.model_spec?.availableContextTokens ?? null,
          traits: m?.model_spec?.traits ?? [],
          usd_input_per_m: m?.model_spec?.pricing?.input?.usd ?? null,
          usd_output_per_m: m?.model_spec?.pricing?.output?.usd ?? null,
        }).slice(0, 1000),
        active: true,
        last_seen_at: new Date().toISOString(),
      };
    });

    const liveIds = rows.map((r) => r.model_id);
    const { pro_missing, free_missing } = unmatchedAgainst(liveIds);

    const supabase = createClient(supaUrl, supaKey, {
      auth: { persistSession: false },
    });

    const { error, count } = await supabase
      .from("toolbox_models")
      .upsert(rows, { onConflict: "provider,model_id", count: "exact" });

    if (error) {
      return {
        ok: false, fetched: rows.length, upserted: 0,
        pro_matched: proMatched, free_matched: freeMatched,
        pro_missing, free_missing,
        error: error.message,
      };
    }

    // Demote any toolbox row that Venice no longer ships (was active, now absent).
    if (liveIds.length > 0) {
      await supabase
        .from("toolbox_models")
        .update({ active: false })
        .eq("provider", "venice")
        .not("model_id", "in", `(${liveIds.map((s) => `"${s}"`).join(",")})`);
    }

    // Rebuild the Compact's fallback chain from the curated arrays,
    // filtered to what Venice actually has live right now.
    const liveSet = new Set(liveIds);
    const newChain = FULL_FALLBACK_CHAIN.filter((id) => liveSet.has(id));

    const { data: settingsRow } = await supabase
      .from("settings")
      .select("provider_compact")
      .eq("id", true)
      .single();

    const pc = (settingsRow?.provider_compact ?? {}) as Record<string, unknown>;
    await supabase
      .from("settings")
      .update({
        provider_compact: {
          ...pc,
          fallback_chain: newChain,
        } as never,
        tier_map_unmatched: {
          pro_missing,
          free_missing,
          generated_at: new Date().toISOString(),
        } as never,
      })
      .eq("id", true);

    return {
      ok: true,
      fetched: rows.length,
      upserted: count ?? rows.length,
      pro_matched: proMatched,
      free_matched: freeMatched,
      pro_missing,
      free_missing,
      error: null,
    };
  } catch (e) {
    return {
      ok: false, fetched: 0, upserted: 0, pro_matched: 0, free_matched: 0,
      pro_missing: [], free_missing: [],
      error: e instanceof Error ? e.message : "Sync failed.",
    };
  }
}

export const syncVeniceRegistry = createServerFn({ method: "POST" }).handler(
  async (): Promise<SyncResult> => runVeniceSync(),
);

export const getVeniceLastSync = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ last_seen_at: string | null }> => {
    const supaUrl = process.env.SUPABASE_URL;
    const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supaUrl || !supaKey) return { last_seen_at: null };
    const supabase = createClient(supaUrl, supaKey, { auth: { persistSession: false } });
    const { data } = await supabase
      .from("toolbox_models")
      .select("last_seen_at")
      .eq("provider", "venice")
      .order("last_seen_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { last_seen_at: (data?.last_seen_at as string | null) ?? null };
  },
);

/**
 * Rebuild the Compact's fallback chain from the curated tier map,
 * without re-fetching Venice. Useful when the King has tweaked the
 * order in `venice-tier-map.ts` and wants it reflected immediately.
 */
export const rebuildFallbackChain = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: boolean; chain: string[]; error: string | null }> => {
    const supaUrl = process.env.SUPABASE_URL;
    const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supaUrl || !supaKey) return { ok: false, chain: [], error: "Supabase env missing." };
    const supabase = createClient(supaUrl, supaKey, { auth: { persistSession: false } });

    const { data: liveRows } = await supabase
      .from("toolbox_models")
      .select("model_id")
      .eq("provider", "venice")
      .eq("active", true);
    const liveSet = new Set((liveRows ?? []).map((r: any) => r.model_id));
    const newChain = FULL_FALLBACK_CHAIN.filter((id) => liveSet.has(id));

    // Also re-tag each row to keep DB in sync with the curated map.
    for (const id of PRO_IDS) {
      if (!liveSet.has(id)) continue;
      await supabase
        .from("toolbox_models")
        .update({
          venice_tier: "pro",
          auto_fallback_enabled: true,
          fallback_rank: rankFor(id),
          tier: "free-premium",
        })
        .eq("provider", "venice")
        .eq("model_id", id);
    }
    for (const id of FREE_IDS) {
      if (!liveSet.has(id)) continue;
      await supabase
        .from("toolbox_models")
        .update({
          venice_tier: "free",
          auto_fallback_enabled: true,
          fallback_rank: rankFor(id),
          tier: "free-premium",
        })
        .eq("provider", "venice")
        .eq("model_id", id);
    }

    const { data: settingsRow } = await supabase
      .from("settings")
      .select("provider_compact")
      .eq("id", true)
      .single();
    const pc = (settingsRow?.provider_compact ?? {}) as Record<string, unknown>;
    const { error } = await supabase
      .from("settings")
      .update({
        provider_compact: { ...pc, fallback_chain: newChain } as never,
      })
      .eq("id", true);

    return {
      ok: !error,
      chain: newChain,
      error: error?.message ?? null,
    };
  },
);
