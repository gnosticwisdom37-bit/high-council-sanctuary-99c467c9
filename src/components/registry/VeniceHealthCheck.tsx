/**
 * VeniceHealthCheck — one-press ping to confirm VENICE_API_KEY is alive.
 * No DB writes, no provider switch. Just a fingertip check.
 */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { pingVenice, type VeniceHealthResult } from "@/lib-server/venice-health.functions";

function remedy(status: number): string | null {
  if (status === 401 || status === 403) return "Mint a fresh key on venice.ai and update the secret.";
  if (status === 402) return "Top up the Venice balance.";
  if (status === 429) return "Rate-limited — wait a moment, then ping again.";
  if (status >= 500) return "Venice is having a moment — retry shortly.";
  if (status === 0) return "Could not reach Venice — check network or key presence.";
  return null;
}

export function VeniceHealthCheck() {
  const ping = useServerFn(pingVenice);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VeniceHealthResult | null>(null);

  async function run() {
    setBusy(true);
    try {
      const r = await ping();
      setResult(r);
    } catch (e) {
      setResult({
        ok: false,
        status: 0,
        latency_ms: 0,
        model_used: "—",
        error: e instanceof Error ? e.message : "Unexpected error.",
        raw_snippet: null,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="rounded-xl p-4"
      style={{
        background: "color-mix(in oklab, var(--dawn-parchment) 75%, transparent)",
        border: "1px solid color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
      }}
      aria-label="Venice health check"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}
          >
            Venice Gateway
          </p>
          <p className="mt-1 font-serif text-base" style={{ color: "var(--dawn-ink)" }}>
            Verify the key before the swap
          </p>
          <p
            className="mt-1 text-[11px] italic"
            style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}
          >
            One call. No Lovable credits. Tells Us if VENICE_API_KEY is alive.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="shrink-0 rounded-full px-5 py-2 text-sm font-medium transition disabled:opacity-60"
          style={{
            background: "var(--gradient-dawn)",
            color: "var(--dawn-parchment)",
            border: "1px solid color-mix(in oklab, var(--dawn-gold) 80%, transparent)",
            boxShadow: "var(--shadow-sigil)",
          }}
        >
          {busy ? "Pinging…" : "✶ Ping the Venice Gateway"}
        </button>
      </div>

      {result && (
        <div
          className="mt-4 rounded-lg p-3 text-sm"
          style={{
            background: result.ok
              ? "color-mix(in oklab, #4ade80 18%, transparent)"
              : "color-mix(in oklab, #f97316 18%, transparent)",
            border: `1px solid ${
              result.ok
                ? "color-mix(in oklab, #16a34a 50%, transparent)"
                : "color-mix(in oklab, #ea580c 50%, transparent)"
            }`,
            color: "var(--dawn-ink)",
          }}
          role="status"
        >
          {result.ok ? (
            <p>
              <strong>Verified.</strong> Venice answered in {result.latency_ms} ms ·
              model <code>{result.model_used}</code>.
            </p>
          ) : (
            <div className="space-y-1">
              <p>
                <strong>Failed</strong>{" "}
                {result.status > 0 ? `(HTTP ${result.status})` : "(no response)"} —{" "}
                {result.error}
              </p>
              {remedy(result.status) && (
                <p className="italic opacity-80">{remedy(result.status)}</p>
              )}
              {result.raw_snippet && (
                <pre className="mt-2 max-h-24 overflow-auto rounded bg-black/10 p-2 text-[11px]">
                  {result.raw_snippet}
                </pre>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={run}
            disabled={busy}
            className="mt-2 text-[11px] underline opacity-75 hover:opacity-100"
          >
            Run again
          </button>
        </div>
      )}
    </section>
  );
}
