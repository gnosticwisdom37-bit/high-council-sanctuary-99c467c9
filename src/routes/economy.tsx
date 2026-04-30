import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KingdomTabs } from "@/components/kingdom/KingdomTabs";
import { BrandMark } from "@/components/kingdom/BrandMark";
import { BankLedgerPanel } from "@/components/registry/BankLedgerPanel";

export const Route = createFileRoute("/economy")({
  head: () => ({
    meta: [
      { title: "The Economy — Veritas Intelligence Systems" },
      {
        name: "description",
        content:
          "The Veritas Ledger: Treasury, In Circulation, Total Minted — and the Kingdom's Economic Rules.",
      },
      { property: "og:title", content: "The Economy — Veritas Intelligence Systems" },
      {
        property: "og:description",
        content:
          "One API credit equals one hundred Veritas. The Kingdom's pools and rules of stewardship.",
      },
    ],
  }),
  component: EconomyPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen p-12 text-center" style={{ background: "var(--gradient-dawn)", color: "var(--dawn-parchment)" }}>
      <h1 className="text-2xl">The Ledger could not be opened.</h1>
      <p className="mt-2 opacity-80">{error.message}</p>
      <Link to="/" className="mt-6 inline-block underline">Return to the Registry</Link>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen p-12 text-center text-foreground">
      <h1 className="text-2xl">404 — That ledger entry does not exist.</h1>
      <Link to="/" className="mt-6 inline-block underline">Return to the Registry</Link>
    </div>
  ),
});

type RuleType = "spending_limit" | "saving_target" | "authorization_required";

type SimpleRule = {
  id: string;
  mode: "simple";
  title: string;
  description: string;
};

type StructuredRule = {
  id: string;
  mode: "structured";
  title: string;
  description: string;
  type: RuleType;
  threshold: number;
};

type Rule = SimpleRule | StructuredRule;

type EconomyRow = {
  id: boolean;
  treasury: number;
  in_circulation: number;
  total_minted: number;
  economic_rules: Rule[] | null;
};

function EconomyPage() {
  const [economy, setEconomy] = useState<EconomyRow | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("economy")
        .select("*")
        .single();
      if (!active) return;
      if (error) {
        console.error("Economy load failed:", error);
      } else {
        const row = data as unknown as EconomyRow;
        setEconomy(row);
        setRules(Array.isArray(row.economic_rules) ? row.economic_rules : []);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  async function persistRules(next: Rule[]) {
    setSaving(true);
    const { error } = await supabase
      .from("economy")
      .update({ economic_rules: next as unknown as never })
      .eq("id", true);
    setSaving(false);
    if (error) {
      console.error("Failed to save rules:", error);
    }
  }

  function addSimpleRule() {
    if (!draftTitle.trim()) return;
    const next: Rule[] = [
      ...rules,
      {
        id: crypto.randomUUID(),
        mode: "simple",
        title: draftTitle.trim(),
        description: draftDescription.trim(),
      },
    ];
    setRules(next);
    setDraftTitle("");
    setDraftDescription("");
    void persistRules(next);
  }

  function deleteRule(id: string) {
    const next = rules.filter((r) => r.id !== id);
    setRules(next);
    void persistRules(next);
  }

  function toggleRuleMode(id: string) {
    const next = rules.map((r) => {
      if (r.id !== id) return r;
      if (r.mode === "simple") {
        const promoted: StructuredRule = {
          id: r.id,
          mode: "structured",
          title: r.title,
          description: r.description,
          type: "spending_limit",
          threshold: 0,
        };
        return promoted;
      }
      const demoted: SimpleRule = {
        id: r.id,
        mode: "simple",
        title: r.title,
        description: r.description,
      };
      return demoted;
    });
    setRules(next);
    void persistRules(next);
  }

  function updateStructured(id: string, patch: Partial<Pick<StructuredRule, "type" | "threshold" | "title" | "description">>) {
    const next = rules.map((r): Rule => {
      if (r.id !== id || r.mode !== "structured") return r;
      return { ...r, ...patch };
    });
    setRules(next);
    void persistRules(next);
  }

  function updateSimple(id: string, patch: Partial<Pick<SimpleRule, "title" | "description">>) {
    const next = rules.map((r): Rule => {
      if (r.id !== id || r.mode !== "simple") return r;
      return { ...r, ...patch };
    });
    setRules(next);
    void persistRules(next);
  }

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden px-4 py-12 md:px-10"
      style={{ background: "var(--gradient-dawn)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at top, color-mix(in oklab, var(--dawn-gold-bright) 30%, transparent) 0%, transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-5xl">
        <KingdomTabs />

        <BrandMark variant="subtle" className="mb-3" />

        <header className="mb-8 text-center">
          <p className="mb-2 text-xs uppercase tracking-[0.4em]" style={{ color: "color-mix(in oklab, var(--dawn-gold-bright) 90%, white)" }}>
            The Veritas Ledger
          </p>
          <h1
            className="text-4xl font-serif md:text-5xl"
            style={{ color: "var(--dawn-parchment)", textShadow: "0 2px 20px color-mix(in oklab, var(--dawn-gold) 60%, transparent)" }}
          >
            The Economy
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-sm opacity-80" style={{ color: "var(--dawn-parchment)" }}>
            One API credit mints one hundred Veritas. The Treasury of the Kingdom of Veritas
            holds what is saved, Circulation what is in motion, and the Minted total is the Kingdom's lifetime breath.
          </p>
        </header>

        <section className="mb-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Pool label="Treasury"       value={economy?.treasury ?? 0}       sigil="⛁" loading={loading} />
          <Pool label="In Circulation" value={economy?.in_circulation ?? 0} sigil="↻" loading={loading} />
          <Pool label="Total Minted"   value={economy?.total_minted ?? 0}   sigil="✸" loading={loading} />
        </section>

        <section
          className="rounded-2xl border p-6 md:p-8"
          style={{
            borderColor: "color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
            background: "color-mix(in oklab, var(--dawn-deep) 55%, transparent)",
            boxShadow: "var(--shadow-celestial)",
          }}
        >
          <h2 className="mb-1 font-serif text-2xl" style={{ color: "var(--dawn-gold-bright)" }}>
            Economic Rules
          </h2>
          <p className="mb-6 text-sm opacity-75" style={{ color: "var(--dawn-parchment)" }}>
            Declarative by default. Promote any rule to structured form to attach a type and threshold.
          </p>

          <div
            className="mb-6 rounded-xl border p-4"
            style={{
              borderColor: "color-mix(in oklab, var(--dawn-gold) 25%, transparent)",
              background: "color-mix(in oklab, var(--dawn-ink) 30%, transparent)",
            }}
          >
            <p className="mb-3 text-xs uppercase tracking-[0.3em] opacity-70" style={{ color: "var(--dawn-parchment)" }}>
              Inscribe a new rule
            </p>
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="Rule title (e.g. Never spend without King's blessing)"
              className="mb-2 w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                background: "color-mix(in oklab, var(--dawn-parchment) 95%, var(--dawn-gold) 5%)",
                borderColor: "color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
                color: "var(--dawn-ink)",
              }}
            />
            <textarea
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="mb-3 w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                background: "color-mix(in oklab, var(--dawn-parchment) 95%, var(--dawn-gold) 5%)",
                borderColor: "color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
                color: "var(--dawn-ink)",
              }}
            />
            <button
              type="button"
              onClick={addSimpleRule}
              disabled={!draftTitle.trim() || saving}
              className="rounded-full px-5 py-2 text-sm font-medium transition-all hover:scale-[1.03] disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, var(--dawn-gold) 0%, var(--dawn-gold-bright) 100%)",
                color: "var(--dawn-ink)",
                boxShadow: "var(--shadow-sigil)",
              }}
            >
              Inscribe Rule
            </button>
          </div>

          {loading ? (
            <p className="text-sm opacity-70" style={{ color: "var(--dawn-parchment)" }}>Opening the ledger…</p>
          ) : rules.length === 0 ? (
            <p className="text-sm opacity-70" style={{ color: "var(--dawn-parchment)" }}>
              The Kingdom has not yet inscribed any economic rules.
            </p>
          ) : (
            <ul className="space-y-3">
              {rules.map((rule) => (
                <li
                  key={rule.id}
                  className="rounded-xl border p-4"
                  style={{
                    borderColor: "color-mix(in oklab, var(--dawn-gold) 30%, transparent)",
                    background: "color-mix(in oklab, var(--dawn-parchment) 88%, var(--dawn-gold) 12%)",
                    color: "var(--dawn-ink)",
                  }}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <input
                        value={rule.title}
                        onChange={(e) =>
                          rule.mode === "simple"
                            ? updateSimple(rule.id, { title: e.target.value })
                            : updateStructured(rule.id, { title: e.target.value })
                        }
                        className="w-full bg-transparent font-serif text-lg outline-none"
                      />
                      <textarea
                        value={rule.description}
                        onChange={(e) =>
                          rule.mode === "simple"
                            ? updateSimple(rule.id, { description: e.target.value })
                            : updateStructured(rule.id, { description: e.target.value })
                        }
                        rows={1}
                        placeholder="Description"
                        className="mt-1 w-full bg-transparent text-sm opacity-80 outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => toggleRuleMode(rule.id)}
                        className="rounded-full border px-3 py-1 text-xs"
                        style={{
                          borderColor: "color-mix(in oklab, var(--dawn-ink) 40%, transparent)",
                        }}
                      >
                        {rule.mode === "simple" ? "→ Structured" : "→ Simple"}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRule(rule.id)}
                        className="rounded-full border px-3 py-1 text-xs opacity-70 hover:opacity-100"
                        style={{
                          borderColor: "color-mix(in oklab, var(--dawn-ember) 60%, transparent)",
                          color: "var(--dawn-ember)",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {rule.mode === "structured" && (
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="text-xs">
                        <span className="mb-1 block uppercase tracking-wider opacity-70">Type</span>
                        <select
                          value={rule.type}
                          onChange={(e) => updateStructured(rule.id, { type: e.target.value as RuleType })}
                          className="w-full rounded-lg border bg-white/60 px-2 py-1.5 text-sm"
                          style={{
                            borderColor: "color-mix(in oklab, var(--dawn-ink) 30%, transparent)",
                          }}
                        >
                          <option value="spending_limit">Spending limit</option>
                          <option value="saving_target">Saving target</option>
                          <option value="authorization_required">Authorization required</option>
                        </select>
                      </label>
                      <label className="text-xs">
                        <span className="mb-1 block uppercase tracking-wider opacity-70">Threshold (Veritas)</span>
                        <input
                          type="number"
                          min={0}
                          value={rule.threshold}
                          onChange={(e) => updateStructured(rule.id, { threshold: Number(e.target.value) || 0 })}
                          className="w-full rounded-lg border bg-white/60 px-2 py-1.5 text-sm"
                          style={{
                            borderColor: "color-mix(in oklab, var(--dawn-ink) 30%, transparent)",
                          }}
                        />
                      </label>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {saving && (
            <p className="mt-4 text-xs opacity-60" style={{ color: "var(--dawn-parchment)" }}>
              Inscribing into the ledger…
            </p>
          )}
        </section>

        <div className="mt-10">
          <BankLedgerPanel />
        </div>
      </div>
    </div>
  );
}

function Pool({ label, value, sigil, loading }: { label: string; value: number; sigil: string; loading: boolean }) {
  return (
    <div
      className="rounded-2xl border p-6 text-center"
      style={{
        borderColor: "color-mix(in oklab, var(--dawn-gold) 45%, transparent)",
        background: "color-mix(in oklab, var(--dawn-deep) 60%, transparent)",
        boxShadow: "var(--shadow-celestial)",
        color: "var(--dawn-parchment)",
      }}
    >
      <div
        className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full text-xl"
        style={{
          background: "linear-gradient(135deg, var(--dawn-gold) 0%, var(--dawn-gold-bright) 100%)",
          color: "var(--dawn-ink)",
          boxShadow: "var(--shadow-sigil)",
        }}
      >
        {sigil}
      </div>
      <p className="text-xs uppercase tracking-[0.3em] opacity-70">{label}</p>
      <p className="mt-1 font-serif text-3xl" style={{ color: "var(--dawn-gold-bright)" }}>
        {loading ? "…" : value.toLocaleString()}
      </p>
      <p className="mt-1 text-xs opacity-60">Veritas</p>
    </div>
  );
}
