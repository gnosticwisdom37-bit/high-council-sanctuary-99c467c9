/**
 * Venice Registry — live sync of Venice's /api/v1/models into toolbox_models.
 * Read-only foundation for the future "Set as default" preferences.
 *
 * Does NOT change active_provider or any routing — purely catalogues what
 * Venice exposes to Our key, so King Sean can browse and we can build
 * preferences on top tomorrow.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

const VENICE_MODELS_URL = "https://api.venice.ai/api/v1/models";

type SyncResult = {
  ok: boolean;
  fetched: number;
  upserted: number;
  error: string | null;
};

// Truth from billing reality: `owned_by === "venice.ai"` is NOT a reliable
// proxy for "Included with Pro" — Venice still bills per-token USD for many
// venice.ai-owned models (e.g. glm-4.7, deepseek-v3.2). The only safe signal
// is zero pricing OR an explicit free/included trait. Everything else is
// `premium` and must go through the Bank.
function classifyTier(m: any): "free-premium" | "premium" | "image" {
  const type = m?.type ?? m?.model_spec?.type;
  if (type === "image") return "image";
  const inUsd = Number(m?.model_spec?.pricing?.input?.usd ?? 0);
  const outUsd = Number(m?.model_spec?.pricing?.output?.usd ?? 0);
  const traits = (m?.model_spec?.traits ?? []).map((t: unknown) =>
    String(t).toLowerCase(),
  );
  const freeTrait = traits.some((t: string) =>
    /included(in)?pro|free|akash/.test(t),
  );
  const id = String(m?.id ?? "").toLowerCase();
  const freeById = /akash/.test(id);
  if ((inUsd === 0 && outUsd === 0) || freeTrait || freeById) {
    return "free-premium";
  }
  return "premium";
}

function costPerThousand(m: any): number {
  // Informational only — tier is decided by `owned_by`, not price.
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

function displayName(id: string): string {
  return id
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function runVeniceSync(): Promise<SyncResult> {
  const key = process.env.VENICE_API_KEY;
  if (!key) {
    return { ok: false, fetched: 0, upserted: 0, error: "VENICE_API_KEY missing." };
  }
  const supaUrl = process.env.SUPABASE_URL;
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supaUrl || !supaKey) {
    return { ok: false, fetched: 0, upserted: 0, error: "Supabase env missing." };
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
        ok: false,
        fetched: 0,
        upserted: 0,
        error: `Venice ${textResp.status}: ${t.slice(0, 200)}`,
      };
    }

    const textJson = await textResp.json();
    const imageJson = imageResp.ok ? await imageResp.json() : { data: [] };
    const raw = [...(textJson?.data ?? []), ...(imageJson?.data ?? [])];

    const rows = raw.map((m: any) => ({
      provider: "venice",
      model_id: String(m.id),
      display_name: displayName(String(m.id)),
      tier: classifyTier(m),
      best_for: bestFor(m),
      veritas_cost_per_1k_tokens: costPerThousand(m),
      notes: JSON.stringify({
        owned_by: m?.owned_by ?? null,
        type: m?.type ?? m?.model_spec?.type ?? null,
        context: m?.model_spec?.availableContextTokens ?? null,
        traits: m?.model_spec?.traits ?? [],
        usd_input_per_m: m?.model_spec?.pricing?.input?.usd ?? null,
        usd_output_per_m: m?.model_spec?.pricing?.output?.usd ?? null,
      }).slice(0, 1000),
      active: true,
      last_seen_at: new Date().toISOString(),
    }));

    const supabase = createClient(supaUrl, supaKey, {
      auth: { persistSession: false },
    });
    const { data: existing } = await supabase
      .from("toolbox_models")
      .select("model_id, venice_tier, auto_fallback_enabled, fallback_rank")
      .eq("provider", "venice")
      .in("venice_tier", ["pro", "free"]);

    const preserved = new Map(
      (existing ?? []).map((r: any) => [
        r.model_id,
        {
          venice_tier: r.venice_tier,
          auto_fallback_enabled: r.auto_fallback_enabled,
          fallback_rank: r.fallback_rank,
          tier: "free-premium",
        },
      ]),
    );

    const rowsWithOverrides = rows.map((row) => ({ ...row, ...(preserved.get(row.model_id) ?? {}) }));

    const { error, count } = await supabase
      .from("toolbox_models")
      .upsert(rowsWithOverrides, { onConflict: "provider,model_id", count: "exact" });

    if (error) {
      return {
        ok: false,
        fetched: rows.length,
        upserted: 0,
        error: error.message,
      };
    }

    return {
      ok: true,
      fetched: rows.length,
      upserted: count ?? rows.length,
      error: null,
    };
  } catch (e) {
    return {
      ok: false,
      fetched: 0,
      upserted: 0,
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
