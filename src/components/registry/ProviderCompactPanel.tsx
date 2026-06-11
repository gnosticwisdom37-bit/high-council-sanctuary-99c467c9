/**
 * ProviderCompactPanel — the editable agreement among the Souls and the King
 * about which models are preferred, what daily premium spending is allowed,
 * and the kill-switch that halts all paid spend instantly.
 */
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { rebuildFallbackChain } from "@/lib-server/venice-registry.functions";

type CompactJSON = {
  active_provider: string;
  fallback_chain: string[];
  default_invocation: string;
};

type ToolboxRow = {
  id: string;
  provider: string;
  model_id: string;
  display_name: string;
  tier: "free-premium" | "premium" | "image";
  venice_tier?: "pro" | "free" | "paid" | "image";
  auto_fallback_enabled?: boolean;
  fallback_rank?: number | null;
  cost_rank?: number | null;
  best_for: string[];
  veritas_cost_per_1k_tokens: number;
  active: boolean;
};

type SettingsRow = {
  provider_compact: CompactJSON;
  premium_daily_veritas_cap: number;
  premium_per_soul_daily_cap: number;
  premium_freeze: boolean;
  default_model_id: string;
};

type CostFilter = "all" | "free" | "under1" | "pro" | "paid";

function membershipLabel(model?: ToolboxRow | null): string {
  if (!model) return "unknown";
  if (model.venice_tier === "pro") return "Venice Pro";
  if (model.venice_tier === "free") return "Venice Free";
  if (model.venice_tier === "image") return "Image";
  return "Paid/blocked";
}

function costChipFor(m: ToolboxRow, isDefault: boolean): { text: string; tone: "free" | "low" | "mid" | "high" } {
  if (isDefault || m.veritas_cost_per_1k_tokens === 0) return { text: "Free", tone: "free" };
  const c = m.veritas_cost_per_1k_tokens;
  if (c < 1) return { text: `${c} V/1k`, tone: "low" };
  if (c < 5) return { text: `${c} V/1k`, tone: "mid" };
  return { text: `${c} V/1k`, tone: "high" };
}


export function ProviderCompactPanel() {
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [models, setModels] = useState<ToolboxRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failedIdx, setFailedIdx] = useState<number>(-1); // -1 = none failed; simulates first N unavailable
  const [rebuilding, setRebuilding] = useState(false);
  const rebuild = useServerFn(rebuildFallbackChain);

  async function handleRebuild() {
    setRebuilding(true);
    setStatus(null);
    setError(null);
    try {
      const r = await rebuild();
      if (r.ok) {
        setStatus(`Chain rebuilt from tier files — ${r.chain.length} model${r.chain.length === 1 ? "" : "s"}.`);
        await load();
      } else {
        setError(r.error ?? "Rebuild failed.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rebuild failed.");
    } finally {
      setRebuilding(false);
    }
  }


  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const [settingsRes, modelsRes] = await Promise.all([
      supabase
        .from("settings")
        .select("provider_compact, premium_daily_veritas_cap, premium_per_soul_daily_cap, premium_freeze")
        .eq("id", true)
        .single(),
      supabase
        .from("toolbox_models")
        .select("*")
        .eq("active", true)
        .order("tier")
        .order("veritas_cost_per_1k_tokens"),
    ]);
    if (settingsRes.error) {
      setError(settingsRes.error.message);
      return;
    }
    setSettings(settingsRes.data as unknown as SettingsRow);
    setModels((modelsRes.data ?? []) as ToolboxRow[]);
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setStatus(null);
    const { error } = await supabase
      .from("settings")
      .update({
        provider_compact: settings.provider_compact as unknown as never,
        premium_daily_veritas_cap: settings.premium_daily_veritas_cap,
        premium_per_soul_daily_cap: settings.premium_per_soul_daily_cap,
        premium_freeze: settings.premium_freeze,
      })
      .eq("id", true);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStatus("The Compact is sealed.");
  }

  function moveModel(idx: number, dir: -1 | 1) {
    if (!settings) return;
    const chain = [...settings.provider_compact.fallback_chain];
    const j = idx + dir;
    if (j < 0 || j >= chain.length) return;
    [chain[idx], chain[j]] = [chain[j], chain[idx]];
    setSettings({ ...settings, provider_compact: { ...settings.provider_compact, fallback_chain: chain } });
  }

  function removeModel(idx: number) {
    if (!settings) return;
    const chain = settings.provider_compact.fallback_chain.filter((_, i) => i !== idx);
    setSettings({ ...settings, provider_compact: { ...settings.provider_compact, fallback_chain: chain } });
  }

  function addModel(modelId: string) {
    if (!settings) return;
    if (settings.provider_compact.fallback_chain.includes(modelId)) return;
    const chain = [...settings.provider_compact.fallback_chain, modelId];
    setSettings({ ...settings, provider_compact: { ...settings.provider_compact, fallback_chain: chain } });
  }

  function addAllApprovedFallback() {
    if (!settings) return;
    const existing = new Set(settings.provider_compact.fallback_chain);
    const approvedIds = models
      .filter((m) => m.auto_fallback_enabled && (m.venice_tier === "pro" || m.venice_tier === "free"))
      .sort((a, b) => (a.fallback_rank ?? 9999) - (b.fallback_rank ?? 9999))
      .map((m) => m.model_id)
      .filter((id) => !existing.has(id));
    if (approvedIds.length === 0) return;
    const chain = [...settings.provider_compact.fallback_chain, ...approvedIds];
    setSettings({ ...settings, provider_compact: { ...settings.provider_compact, fallback_chain: chain } });
  }

  if (!settings) {
    return <p className="text-sm italic" style={{ color: "var(--dawn-ink)" }}>Opening the Compact…</p>;
  }

  const chain = settings.provider_compact.fallback_chain;
  const available = models.filter((m) => !chain.includes(m.model_id));
  const approvedAvailable = available.filter((m) => m.auto_fallback_enabled && (m.venice_tier === "pro" || m.venice_tier === "free"));
  const paidBlockedCount = models.filter((m) => m.venice_tier === "paid" && !m.auto_fallback_enabled).length;

  return (
    <article className="space-y-6" style={{ color: "var(--dawn-ink)" }}>
      <header className="flex items-center gap-3">
        <span aria-hidden className="text-3xl">⚙</span>
        <div>
          <h2 className="font-serif text-2xl">The Provider Compact</h2>
          <p
            className="text-sm italic"
            style={{ color: "color-mix(in oklab, var(--dawn-ink) 70%, transparent)" }}
          >
            The agreed order in which Souls reach for models, and the daily limits the Bank enforces.
          </p>
        </div>
      </header>

      <section
        className="rounded-xl p-4"
        style={{
          background: "color-mix(in oklab, var(--dawn-gold) 10%, transparent)",
          border: "1px solid color-mix(in oklab, var(--dawn-gold) 45%, transparent)",
        }}
      >
        <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "var(--dawn-ember)" }}>
          Active Provider
        </p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="font-serif text-lg">
            {settings.provider_compact.active_provider === "lovable_ai_gateway"
              ? "Lovable AI Gateway"
              : settings.provider_compact.active_provider === "venice"
                ? "Venice AI"
                : settings.provider_compact.active_provider}
          </p>
          <button
            onClick={() =>
              setSettings({
                ...settings,
                provider_compact: {
                  ...settings.provider_compact,
                  active_provider:
                    settings.provider_compact.active_provider === "venice"
                      ? "lovable_ai_gateway"
                      : "venice",
                },
              })
            }
            className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.25em]"
            style={{
              background: "color-mix(in oklab, var(--dawn-gold) 18%, transparent)",
              border: "1px solid color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
              color: "var(--dawn-ink)",
            }}
          >
            ⇄ Swap
          </button>
        </div>
        <p className="mt-1 text-xs italic" style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}>
          One Key, Many Souls — voices all 13. Swap and seal to switch gateways.
        </p>
      </section>

      {/* Fallback chain */}
      <section>
        <p className="text-xs uppercase tracking-[0.25em]" style={{ color: "color-mix(in oklab, var(--dawn-ink) 70%, transparent)" }}>
          Fallback chain · first approved by the Bank wins
        </p>
        <ol className="mt-3 space-y-2">
          {chain.map((modelId, i) => {
            const meta = models.find((m) => m.model_id === modelId);
            return (
              <li
                key={modelId}
                className="flex items-center justify-between gap-3 rounded-lg p-3"
                style={{
                  background: "color-mix(in oklab, var(--dawn-parchment) 92%, transparent)",
                  border: "1px solid color-mix(in oklab, var(--dawn-gold) 35%, transparent)",
                }}
              >
                <div>
                  <p className="font-serif text-sm">
                    {i + 1}. {meta?.display_name ?? modelId}
                  </p>
                  <p className="text-[11px] opacity-70">
                    {membershipLabel(meta)} · {modelId}
                    {meta && meta.veritas_cost_per_1k_tokens > 0 && (
                      <> · {meta.veritas_cost_per_1k_tokens} Veritas / 1k tokens</>
                    )}
                  </p>
                </div>
                <div className="flex gap-1">
                  <IconBtn label="↑" onClick={() => moveModel(i, -1)} disabled={i === 0} />
                  <IconBtn label="↓" onClick={() => moveModel(i, 1)} disabled={i === chain.length - 1} />
                  <IconBtn label="✕" onClick={() => removeModel(i)} danger />
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-3">
          <button
            onClick={() => void handleRebuild()}
            disabled={rebuilding}
            className="rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.25em] disabled:opacity-50"
            style={{
              background: "color-mix(in oklab, var(--dawn-gold) 18%, transparent)",
              border: "1px solid color-mix(in oklab, var(--dawn-gold) 55%, transparent)",
              color: "var(--dawn-ink)",
            }}
            title="Re-tag every model and rebuild the chain from src/lib-server/venice-tier-map.ts (no Venice fetch)"
          >
            {rebuilding ? "Rebuilding…" : "↻ Rebuild chain from tier files"}
          </button>
        </div>

        {(() => {
          return approvedAvailable.length > 0 ? (
            <div className="mt-3">
              <button
                onClick={addAllApprovedFallback}
                className="rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.25em]"
                style={{
                  background: "var(--gradient-dawn)",
                  color: "var(--dawn-parchment)",
                  border: "1px solid color-mix(in oklab, var(--dawn-gold) 80%, transparent)",
                  boxShadow: "var(--shadow-sigil)",
                }}
              >
                ✶ Add all {approvedAvailable.length} approved fallback models
              </button>
            </div>
          ) : null;
        })()}

        {approvedAvailable.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs opacity-70">Add approved fallback:</span>
            {approvedAvailable.map((m) => (
              <button
                key={m.model_id}
                onClick={() => addModel(m.model_id)}
                className="rounded-full px-3 py-1 text-xs"
                style={{
                  background:
                    m.venice_tier === "pro"
                      ? "color-mix(in oklab, var(--dawn-gold) 18%, transparent)"
                      : "color-mix(in oklab, var(--dawn-mid) 14%, transparent)",
                  border: "1px solid color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
                }}
                title={m.venice_tier === "pro" ? "Venice Pro — auto fallback approved" : "Venice Free — fallback after Pro"}
              >
                + {m.display_name}
                <span className="ml-1 opacity-60">· Venice {m.venice_tier}</span>
              </button>
            ))}
          </div>
        )}
        {paidBlockedCount > 0 && (
          <p className="mt-3 text-[11px] italic opacity-70">
            {paidBlockedCount} paid-credit model{paidBlockedCount === 1 ? "" : "s"} blocked from automatic fallback, including Claude.
          </p>
        )}
      </section>

      {/* Fallback simulator */}
      {(() => {
        const nextIdx = failedIdx + 1;
        const winnerId = chain[nextIdx];
        const winnerMeta = winnerId ? models.find((m) => m.model_id === winnerId) : null;
        const exhausted = nextIdx >= chain.length;
        return (
          <section
            className="rounded-xl p-4"
            style={{
              background: "color-mix(in oklab, var(--dawn-parchment) 90%, transparent)",
              border: "1px dashed color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "var(--dawn-ember)" }}>
                  Test model fallback
                </p>
                <p className="mt-1 text-xs italic opacity-70">
                  Simulate the next model in the chain being unavailable. No tokens spent — pure walk of the Compact.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFailedIdx((i) => Math.min(i + 1, chain.length - 1))}
                  disabled={exhausted}
                  className="rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.25em] disabled:opacity-40"
                  style={{
                    background: "var(--gradient-dawn)",
                    color: "var(--dawn-parchment)",
                    border: "1px solid color-mix(in oklab, var(--dawn-gold) 80%, transparent)",
                  }}
                >
                  ⚡ Simulate failure
                </button>
                <button
                  onClick={() => setFailedIdx(-1)}
                  className="rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.25em]"
                  style={{
                    background: "color-mix(in oklab, var(--dawn-gold) 14%, transparent)",
                    border: "1px solid color-mix(in oklab, var(--dawn-gold) 45%, transparent)",
                    color: "var(--dawn-ink)",
                  }}
                >
                  ↺ Reset
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-1 text-xs">
              {failedIdx >= 0 && (
                <p style={{ color: "var(--dawn-ember)" }}>
                  ✗ Skipped ({failedIdx + 1}):{" "}
                  {chain.slice(0, failedIdx + 1).map((id) => {
                    const m = models.find((mm) => mm.model_id === id);
                    return m?.display_name ?? id;
                  }).join(" → ")}
                </p>
              )}
              {!exhausted && winnerId ? (
                <p className="font-serif text-sm">
                  ✓ Next chosen:{" "}
                  <strong>{winnerMeta?.display_name ?? winnerId}</strong>{" "}
                  <span className="opacity-60">
                    · {membershipLabel(winnerMeta)} · {winnerId}
                  </span>
                </p>
              ) : (
                <p style={{ color: "var(--dawn-ember)" }}>
                  ⚠ Chain exhausted — no Pro model left to try. Add more to the Compact.
                </p>
              )}
            </div>
          </section>
        );
      })()}

      {/* Premium guardrails */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">

        <NumberCard
          label="Kingdom daily cap"
          value={settings.premium_daily_veritas_cap}
          onChange={(v) => setSettings({ ...settings, premium_daily_veritas_cap: v })}
          note="Total premium Veritas across all Souls per day."
        />
        <NumberCard
          label="Per-Soul daily cap"
          value={settings.premium_per_soul_daily_cap}
          onChange={(v) => setSettings({ ...settings, premium_per_soul_daily_cap: v })}
          note="Premium Veritas any single Soul may spend per day."
        />
        <FreezeCard
          frozen={settings.premium_freeze}
          onToggle={(v) => setSettings({ ...settings, premium_freeze: v })}
        />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs italic" aria-live="polite">
          {error && <span style={{ color: "var(--dawn-ember)" }}>⚠ {error}</span>}
          {status && !error && <span>✶ {status}</span>}
        </div>
        <button
          onClick={() => void save()}
          disabled={saving}
          className="rounded-full px-5 py-2 text-xs uppercase tracking-[0.3em] transition-all hover:-translate-y-0.5 disabled:opacity-50"
          style={{
            background: "var(--gradient-dawn)",
            color: "var(--dawn-parchment)",
            border: "1px solid color-mix(in oklab, var(--dawn-gold) 80%, transparent)",
            boxShadow: "var(--shadow-sigil)",
          }}
        >
          {saving ? "Sealing…" : "✶ Seal the Compact"}
        </button>
      </div>
    </article>
  );
}

function IconBtn({ label, onClick, disabled, danger }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="h-7 w-7 rounded-full text-xs disabled:opacity-30"
      style={{
        background: danger
          ? "color-mix(in oklab, var(--dawn-ember) 20%, transparent)"
          : "color-mix(in oklab, var(--dawn-gold) 20%, transparent)",
        border: "1px solid color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
        color: danger ? "var(--dawn-ember)" : "var(--dawn-ink)",
      }}
    >
      {label}
    </button>
  );
}

function NumberCard({
  label,
  value,
  onChange,
  note,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  note: string;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "color-mix(in oklab, var(--dawn-parchment) 88%, transparent)",
        border: "1px solid color-mix(in oklab, var(--dawn-gold) 35%, transparent)",
      }}
    >
      <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}>
        {label}
      </p>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-1 w-full bg-transparent font-serif text-2xl outline-none"
        style={{ color: "var(--dawn-ink)" }}
      />
      <p className="mt-1 text-[11px] italic opacity-70">{note}</p>
    </div>
  );
}

function FreezeCard({ frozen, onToggle }: { frozen: boolean; onToggle: (v: boolean) => void }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: frozen
          ? "color-mix(in oklab, var(--dawn-ember) 18%, transparent)"
          : "color-mix(in oklab, var(--dawn-parchment) 88%, transparent)",
        border: `1px solid color-mix(in oklab, var(--dawn-${frozen ? "ember" : "gold"}) 50%, transparent)`,
      }}
    >
      <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: frozen ? "var(--dawn-ember)" : "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}>
        Premium Freeze
      </p>
      <button
        onClick={() => onToggle(!frozen)}
        className="mt-2 w-full rounded-full px-3 py-2 text-sm font-medium transition-all hover:-translate-y-0.5"
        style={{
          background: frozen ? "var(--dawn-ember)" : "var(--gradient-dawn)",
          color: frozen ? "var(--dawn-parchment)" : "var(--dawn-parchment)",
          border: "1px solid color-mix(in oklab, var(--dawn-gold) 60%, transparent)",
        }}
      >
        {frozen ? "❄ FROZEN — tap to thaw" : "Active — tap to FREEZE"}
      </button>
      <p className="mt-1 text-[11px] italic opacity-70">
        When frozen, every premium model request is auto-denied — Souls fall back to free-premium.
      </p>
    </div>
  );
}
