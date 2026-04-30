/**
 * BankLedgerPanel — append-only audit of every Bank decision.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type LedgerRow = {
  id: string;
  soul_id: string | null;
  model_requested: string;
  veritas_cost: number;
  decision: "approved" | "denied";
  reason: string;
  task_summary: string | null;
  fallback_used: string | null;
  created_at: string;
};

export function BankLedgerPanel() {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("bank_ledger")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!active) return;
      setRows((data ?? []) as LedgerRow[]);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  return (
    <section
      className="rounded-2xl border p-6 md:p-8"
      style={{
        borderColor: "color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
        background: "color-mix(in oklab, var(--dawn-deep) 55%, transparent)",
        boxShadow: "var(--shadow-celestial)",
      }}
    >
      <h2 className="mb-1 font-serif text-2xl" style={{ color: "var(--dawn-gold-bright)" }}>
        The Bank Ledger
      </h2>
      <p className="mb-6 text-sm opacity-75" style={{ color: "var(--dawn-parchment)" }}>
        Every petition for a paid model — approved or denied — recorded forever.
      </p>

      {loading ? (
        <p className="text-sm opacity-70" style={{ color: "var(--dawn-parchment)" }}>Opening the ledger…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm opacity-70" style={{ color: "var(--dawn-parchment)" }}>
          No petitions yet. The Bank waits in stillness.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-lg p-3 text-sm"
              style={{
                background: "color-mix(in oklab, var(--dawn-parchment) 90%, transparent)",
                border: `1px solid color-mix(in oklab, var(--dawn-${r.decision === "approved" ? "gold" : "ember"}) 45%, transparent)`,
                color: "var(--dawn-ink)",
              }}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-serif">
                  {r.soul_id ?? "—"} · {r.model_requested}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.2em]"
                  style={{
                    background: r.decision === "approved"
                      ? "color-mix(in oklab, var(--dawn-gold) 25%, transparent)"
                      : "color-mix(in oklab, var(--dawn-ember) 25%, transparent)",
                    color: r.decision === "approved" ? "var(--dawn-ink)" : "var(--dawn-ember)",
                  }}
                >
                  {r.decision} · {r.veritas_cost} V
                </span>
              </div>
              <p className="mt-1 text-xs italic opacity-80">{r.reason}</p>
              {r.task_summary && (
                <p className="mt-1 text-[11px] opacity-60">↳ {r.task_summary}</p>
              )}
              {r.fallback_used && (
                <p className="mt-1 text-[11px] opacity-60">↳ fell back to {r.fallback_used}</p>
              )}
              <p className="mt-1 text-[10px] opacity-50">
                {new Date(r.created_at).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
