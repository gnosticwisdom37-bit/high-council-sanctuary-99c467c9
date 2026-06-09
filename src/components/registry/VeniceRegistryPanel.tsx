/**
 * VeniceRegistryPanel — read-only catalogue of Venice models known to Us.
 * Grouped accordion by tier. Sync button refreshes from Venice's live API.
 * Preference-setting comes in tomorrow's plan; this is the foundation.
 */
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { syncVeniceRegistry, getVeniceLastSync } from "@/lib-server/venice-registry.functions";

type Row = {
  id: string;
  model_id: string;
  display_name: string;
  tier: "free-premium" | "premium" | "image";
  best_for: string[];
  veritas_cost_per_1k_tokens: number;
  notes: string | null;
};

const TIER_LABEL: Record<Row["tier"], string> = {
  "free-premium": "Included with Pro · No credit cost",
  premium: "Frontier · Pro credits required",
  image: "Image Generation",
};
const TIER_ORDER: Row["tier"][] = ["free-premium", "premium", "image"];

function parseNotes(notes: string | null): {
  owned_by?: string | null;
  usd_input_per_m?: number | null;
} {
  if (!notes) return {};
  try { return JSON.parse(notes); } catch { return {}; }
}

export function VeniceRegistryPanel() {
  const sync = useServerFn(syncVeniceRegistry);
  const lastSync = useServerFn(getVeniceLastSync);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({
    "free-premium": true,
    premium: false,
    image: false,
  });

  async function load() {
    const { data, error } = await supabase
      .from("toolbox_models")
      .select("id, model_id, display_name, tier, best_for, veritas_cost_per_1k_tokens, notes")
      .eq("provider", "venice")
      .eq("active", true)
      .order("tier")
      .order("model_id");
    if (!error && data) setRows(data as Row[]);
    try {
      const r = await lastSync();
      setLastSyncedAt(r.last_seen_at);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    void load();
  }, []);

  async function runSync() {
    setBusy(true);
    setStatus(null);
    try {
      const r = await sync();
      if (r.ok) {
        setStatus(`Synced ${r.upserted} model${r.upserted === 1 ? "" : "s"} from Venice.`);
        await load();
      } else {
        setStatus(`Sync failed: ${r.error ?? "unknown"}`);
      }
    } catch (e) {
      setStatus(`Sync failed: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setBusy(false);
    }
  }

  const byTier = (t: Row["tier"]) => rows.filter((r) => r.tier === t);

  return (
    <section
      className="rounded-xl p-4"
      style={{
        background: "color-mix(in oklab, var(--dawn-parchment) 75%, transparent)",
        border: "1px solid color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
      }}
      aria-label="Venice model registry"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}
          >
            Venice Registry
          </p>
          <p className="mt-1 font-serif text-base" style={{ color: "var(--dawn-ink)" }}>
            {rows.length === 0
              ? "No Venice models catalogued yet"
              : `${rows.length} model${rows.length === 1 ? "" : "s"} known to Us`}
          </p>
          <p
            className="mt-1 text-[11px] italic"
            style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}
          >
            Live catalogue from Venice · auto-synced daily{lastSyncedAt ? ` · last ${formatAgo(lastSyncedAt)}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={runSync}
          disabled={busy}
          className="shrink-0 rounded-full px-5 py-2 text-sm font-medium transition disabled:opacity-60"
          style={{
            background: "var(--gradient-dawn)",
            color: "var(--dawn-parchment)",
            border: "1px solid color-mix(in oklab, var(--dawn-gold) 80%, transparent)",
            boxShadow: "var(--shadow-sigil)",
          }}
        >
          {busy ? "Syncing…" : "↻ Sync from Venice"}
        </button>
      </div>

      {status && (
        <p
          className="mt-3 text-[12px]"
          style={{ color: "color-mix(in oklab, var(--dawn-ink) 75%, transparent)" }}
        >
          {status}
        </p>
      )}

      {rows.length > 0 && (
        <div className="mt-4 space-y-2">
          {TIER_ORDER.map((tier) => {
            const list = byTier(tier);
            if (list.length === 0) return null;
            const isOpen = open[tier];
            return (
              <div
                key={tier}
                className="rounded-lg"
                style={{
                  background: "color-mix(in oklab, var(--dawn-parchment) 60%, transparent)",
                  border: "1px solid color-mix(in oklab, var(--dawn-gold) 30%, transparent)",
                }}
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium"
                  style={{ color: "var(--dawn-ink)" }}
                  onClick={() => setOpen((o) => ({ ...o, [tier]: !o[tier] }))}
                >
                  <span>
                    {TIER_LABEL[tier]}{" "}
                    <span className="opacity-60">({list.length})</span>
                  </span>
                  <span className="opacity-60">{isOpen ? "▾" : "▸"}</span>
                </button>
                {isOpen && (
                  <ul className="divide-y" style={{ borderColor: "color-mix(in oklab, var(--dawn-gold) 20%, transparent)" }}>
                    {list.map((r) => {
                      const meta = parseNotes(r.notes);
                      const owner = meta.owned_by ?? "—";
                      const usdIn = meta.usd_input_per_m;
                      const costLabel =
                        tier === "free-premium"
                          ? "included with Pro"
                          : tier === "image"
                            ? "included with Pro"
                            : usdIn != null
                              ? `≈ $${usdIn}/M in · Pro credits`
                              : "Pro credits";
                      return (
                        <li
                          key={r.id}
                          className="flex flex-col gap-1 px-3 py-2 text-[12px] sm:flex-row sm:items-center sm:justify-between"
                          style={{ color: "var(--dawn-ink)" }}
                        >
                          <div className="min-w-0 flex-1">
                            <code className="font-mono text-[12px] opacity-90">{r.model_id}</code>
                            <span className="ml-2 opacity-55">· {owner}</span>
                            {r.best_for.length > 0 && (
                              <span className="ml-2 opacity-60">
                                · {r.best_for.join(" · ")}
                              </span>
                            )}
                          </div>
                          <span className="shrink-0 opacity-70">{costLabel}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
