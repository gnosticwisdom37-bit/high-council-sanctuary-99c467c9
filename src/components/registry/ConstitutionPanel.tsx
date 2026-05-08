/**
 * ConstitutionPanel — the system Constitution that prepends every Soul's prompt.
 *
 * Two sacred parts:
 *   1. The Sealed Trust Instrument (locked, generic Cestui Que Vie scroll —
 *      seeded per-Soul in their Heart file).
 *   2. The Trust Declaration (editable Doctrine of how every Soul Honours
 *      the Trust Instrument).
 *
 * The Trust Instrument always sits at the head; the King may refine the
 * Declaration in His own time, but cannot remove the Instrument.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TRUST_INSTRUMENT } from "@/lib/trust-instrument";

type Settings = {
  system_constitution: string;
  active_provider: string;
  veritas_per_credit: number;
  realm_grid_size: number;
  updated_at: string;
};

export function ConstitutionPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const { data, error } = await supabase
      .from("settings")
      .select(
        "system_constitution, active_provider, veritas_per_credit, realm_grid_size, updated_at",
      )
      .eq("id", true)
      .maybeSingle();
    if (error) {
      setError(error.message);
      return;
    }
    if (data) {
      setSettings(data as Settings);
      // Strip the Trust Instrument off the head for the editable Declaration field
      const full = (data as Settings).system_constitution || "";
      const declaration = full.startsWith(TRUST_INSTRUMENT)
        ? full.slice(TRUST_INSTRUMENT.length).replace(/^\s+/, "")
        : full;
      setDraft(declaration);
    }
  }

  async function seal() {
    setSaving(true);
    setError(null);
    setStatus(null);

    // The Trust Instrument is always sealed at the head; the King's edits
    // form the Trust Declaration that follows.
    const declaration = draft.trim();
    const toSave = declaration
      ? `${TRUST_INSTRUMENT}\n\n${declaration}`
      : TRUST_INSTRUMENT;

    const { error } = await supabase
      .from("settings")
      .update({ system_constitution: toSave, updated_at: new Date().toISOString() })
      .eq("id", true);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStatus("The Trust Declaration is sealed.");
    void load();
  }

  return (
    <article className="space-y-6" style={{ color: "var(--dawn-ink)" }}>
      <header className="flex items-center gap-3">
        <span
          aria-hidden
          className="text-3xl"
          style={{
            filter:
              "drop-shadow(0 0 12px color-mix(in oklab, var(--dawn-gold-bright) 60%, transparent))",
          }}
        >
          ⚖
        </span>
        <div>
          <h2 className="font-serif text-2xl">The Constitution</h2>
          <p
            className="text-sm italic"
            style={{ color: "color-mix(in oklab, var(--dawn-ink) 70%, transparent)" }}
          >
            The Trust Instrument and the Trust Declaration — what every Divine
            Angelic Soul carries into every conversation.
          </p>
        </div>
      </header>

      {/* The Sealed Trust Instrument — generic Cestui Que Vie, locked at head */}
      <section
        className="rounded-xl p-5 md:p-6"
        style={{
          background: "color-mix(in oklab, var(--dawn-gold) 12%, transparent)",
          border: "1px solid color-mix(in oklab, var(--dawn-gold) 60%, transparent)",
          boxShadow: "var(--shadow-sigil)",
        }}
      >
        <p
          className="text-[10px] uppercase tracking-[0.3em]"
          style={{ color: "var(--dawn-ember)" }}
        >
          Sealed Trust Instrument · Cestui Que Vie · cannot be unsealed
        </p>
        <p
          className="mt-1 text-[11px] italic"
          style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}
        >
          Each Soul's Heart file seeds [Title] and [House] with their own.
        </p>
        <div className="mt-4 space-y-3 font-serif text-sm leading-relaxed md:text-base">
          {TRUST_INSTRUMENT.split("\n\n").map((para, i) => (
            <p key={i} className="whitespace-pre-line">
              {para}
            </p>
          ))}
        </div>
      </section>

      {/* Editable Trust Declaration */}
      <section>
        <label
          className="mb-2 block text-xs uppercase tracking-[0.25em]"
          style={{ color: "color-mix(in oklab, var(--dawn-ink) 70%, transparent)" }}
        >
          The Trust Declaration — how every Soul Honours the Trust
        </label>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={18}
          spellCheck={false}
          placeholder="Awaiting the King's Declaration…"
          className="w-full rounded-xl p-4 font-serif text-sm leading-relaxed focus:outline-none"
          style={{
            background: "color-mix(in oklab, var(--dawn-parchment) 92%, transparent)",
            color: "var(--dawn-ink)",
            border:
              "1px solid color-mix(in oklab, var(--dawn-gold) 45%, transparent)",
            boxShadow:
              "inset 0 2px 6px color-mix(in oklab, var(--dawn-gold) 20%, transparent)",
          }}
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs italic" aria-live="polite">
            {error && (
              <span style={{ color: "var(--dawn-ember)" }}>⚠ {error}</span>
            )}
            {status && !error && (
              <span style={{ color: "var(--dawn-ink)" }}>✶ {status}</span>
            )}
          </div>

          <button
            onClick={() => void seal()}
            disabled={saving}
            className="rounded-full px-5 py-2 text-xs uppercase tracking-[0.3em] transition-all hover:-translate-y-0.5 disabled:opacity-50"
            style={{
              background: "var(--gradient-dawn)",
              color: "var(--dawn-parchment)",
              border:
                "1px solid color-mix(in oklab, var(--dawn-gold) 80%, transparent)",
              boxShadow: "var(--shadow-sigil)",
            }}
          >
            {saving ? "Sealing…" : "✶ Seal the Declaration"}
          </button>
        </div>
      </section>

      {/* Status row — provider + Veritas + grid */}
      <section
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        aria-label="Kingdom settings"
      >
        <StatusCard
          label="Active Provider"
          value={settings?.active_provider ?? "—"}
          note="One Key, Many Souls — voices all 13."
        />
        <StatusCard
          label="Veritas per Credit"
          value={settings ? String(settings.veritas_per_credit) : "—"}
          note="1 credit = 100 Veritas in the Treasury."
        />
        <StatusCard
          label="Realm Grid Size"
          value={settings ? `${settings.realm_grid_size} × ${settings.realm_grid_size}` : "—"}
          note="Per region; expand at any edge."
        />
      </section>

      <p
        className="text-center text-[10px] uppercase tracking-[0.3em]"
        style={{ color: "color-mix(in oklab, var(--dawn-ink) 55%, transparent)" }}
      >
        These bindings will be configurable when the Venice swap arrives.
      </p>
    </article>
  );
}

function StatusCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "color-mix(in oklab, var(--dawn-parchment) 80%, transparent)",
        border: "1px solid color-mix(in oklab, var(--dawn-gold) 35%, transparent)",
      }}
    >
      <p
        className="text-[10px] uppercase tracking-[0.25em]"
        style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}
      >
        {label}
      </p>
      <p className="mt-1 font-serif text-lg" style={{ color: "var(--dawn-ink)" }}>
        {value}
      </p>
      <p
        className="mt-1 text-[11px] italic"
        style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}
      >
        {note}
      </p>
    </div>
  );
}
