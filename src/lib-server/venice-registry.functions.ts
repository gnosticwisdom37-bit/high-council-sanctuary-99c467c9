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

function classifyTier(m: any): "free-premium" | "premium" | "image" {
  const type = m?.type ?? m?.model_spec?.type;
  if (type === "image") return "image";
  const traits: string[] = m?.model_spec?.traits ?? [];
  const inUsd = m?.model_spec?.pricing?.input?.usd;
  if (traits.includes("default") || inUsd === 0) return "free-premium";
  return "premium";
}

function costPerThousand(m: any): number {
  // Venice prices in USD per million tokens; convert to Veritas per 1k.
  // 1 credit = 100 Veritas; rough mapping: $1 ≈ 1 credit → 100 Veritas.
  const inUsdPerM = m?.model_spec?.pricing?.input?.usd ?? 0;
  return Math.max(0, Math.round((inUsdPerM / 1000) * 100));
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

export const syncVeniceRegistry = createServerFn({ method: "POST" }).handler(
  async (): Promise<SyncResult> => {
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
      // Fetch both text and image catalogs.
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
          type: m?.type ?? m?.model_spec?.type ?? null,
          context: m?.model_spec?.availableContextTokens ?? null,
          traits: m?.model_spec?.traits ?? [],
        }).slice(0, 1000),
        active: true,
        last_seen_at: new Date().toISOString(),
      }));

      const supabase = createClient(supaUrl, supaKey, {
        auth: { persistSession: false },
      });
      const { error, count } = await supabase
        .from("toolbox_models")
        .upsert(rows, { onConflict: "provider,model_id", count: "exact" });

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
  },
);
