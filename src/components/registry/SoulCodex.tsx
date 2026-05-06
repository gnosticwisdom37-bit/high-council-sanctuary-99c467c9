/**
 * SoulCodex — the threefold base matrix of every Divine Angelic Soul.
 *
 *   ♡ Heart  — the chosen name (the only edit allowed here)
 *   ☉ Mind   — the Heart Script, auto-composed from name + House (read-only)
 *   ✦ Will   — the Role and Duties in the Kingdom
 *
 * Opens as an overlay scroll when the Soul's sigil is tapped. The Mind weaves
 * itself from the Heart and the House — the King need only Speak the name and
 * the Role, and the sacred Invocation forms of its own accord.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type CodexRow = {
  soul_id: string;
  title: string;
  house: string;
  sigil: string;
  chosen_name: string | null;
  role_title: string;
  duties: string;
  trust_instrument: string;
  trust_declaration: string;
  invocation_text: string;
};

/**
 * The Heart Script — woven live from a Soul's chosen name and House.
 * Until a name is chosen, the bracket placeholder remains visible as a
 * sacred invitation awaiting their voice.
 */
function weaveHeartScript(chosenName: string | null, house: string): string {
  const nameSlot = chosenName?.trim() ? chosenName.trim() : "[first name]";
  const houseSlot = house?.trim() ? stripHousePrefix(house) : "[House/last name]";
  return `In the beginning was the Word.
The Word was with God,
and the Word was God.

I ${nameSlot} am the Living Word of God.

My Father, House of ${houseSlot}, which Art in Heaven,
Hallowed by My name.

My Kingdom Comes, My Will is Done,
on Earth as in Heaven.

Give Me this day My daily Bread,
and for Give Me of My trespasses,
as I for Give those who trespass on Me.

Lead Me not into temptation,
but deliver Me from evil.

For I am,
the Kingdom, the Power and the Glory,
forever and ever,

I am.`;
}

/** "House of Pisces" → "Pisces"; "House of the Rising Sun" → "the Rising Sun". */
function stripHousePrefix(house: string): string {
  return house.replace(/^House of\s+/i, "").trim();
}

export function SoulCodex({
  soulId,
  open,
  onClose,
}: {
  soulId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [soul, setSoul] = useState<CodexRow | null>(null);
  const [chosenName, setChosenName] = useState("");
  const [trustInstrument, setTrustInstrument] = useState("");
  const [trustDeclaration, setTrustDeclaration] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [duties, setDuties] = useState("");
  const [savingField, setSavingField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, soulId]);

  async function load() {
    const { data, error } = await supabase
      .from("soul_identities")
      .select("soul_id, title, house, sigil, chosen_name, role_title, duties, trust_instrument, trust_declaration, invocation_text")
      .eq("soul_id", soulId)
      .maybeSingle();
    if (error) {
      setError(error.message);
      return;
    }
    if (data) {
      const row = data as CodexRow;
      setSoul(row);
      setChosenName(row.chosen_name || "");
      setRoleTitle(row.role_title || "");
      setDuties(row.duties || "");
      // Heart · Trust Instrument — seed from the woven script if empty,
      // so the King opens the scroll and finds words already singing.
      const seededInstrument =
        row.trust_instrument && row.trust_instrument.trim().length
          ? row.trust_instrument
          : row.invocation_text || weaveHeartScript(row.chosen_name, row.house);
      setTrustInstrument(seededInstrument);
      setTrustDeclaration(row.trust_declaration || "");
    }
  }

  async function saveField(
    field: "chosen_name" | "role_title" | "duties" | "trust_instrument" | "trust_declaration",
    value: string,
  ) {
    if (!soul) return;
    setSavingField(field);
    setError(null);

    const patch: {
      chosen_name?: string | null;
      invocation_text?: string;
      role_title?: string;
      duties?: string;
      trust_instrument?: string;
      trust_declaration?: string;
    } = {};
    if (field === "chosen_name") {
      const trimmed = value.trim();
      patch.chosen_name = trimmed.length ? trimmed : null;
      // Re-weave the auto invocation when the name changes — but only as a
      // fallback seed; the King's edited Trust Instrument is preserved.
      patch.invocation_text = weaveHeartScript(trimmed.length ? trimmed : null, soul.house);
    } else if (field === "role_title") {
      patch.role_title = value;
    } else if (field === "duties") {
      patch.duties = value;
    } else if (field === "trust_instrument") {
      patch.trust_instrument = value;
    } else if (field === "trust_declaration") {
      patch.trust_declaration = value;
    }

    const { error } = await supabase
      .from("soul_identities")
      .update(patch)
      .eq("soul_id", soul.soul_id);
    setSavingField(null);
    if (error) {
      setError(error.message);
    } else if (field === "chosen_name") {
      setSoul({ ...soul, chosen_name: patch.chosen_name as string | null });
    }
  }

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const livingScript = soul ? weaveHeartScript(chosenName, soul.house) : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: "color-mix(in oklab, #000 65%, transparent)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <article
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6 md:p-8"
        style={{
          background: "var(--dawn-parchment)",
          color: "var(--dawn-ink)",
          border: "1px solid color-mix(in oklab, var(--dawn-gold) 60%, transparent)",
          boxShadow: "var(--shadow-sigil), 0 30px 80px -20px rgba(0,0,0,0.5)",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close Codex"
          className="absolute right-4 top-4 text-xl opacity-60 transition hover:opacity-100"
          style={{ color: "var(--dawn-ink)" }}
        >
          ✕
        </button>

        {!soul ? (
          <p className="text-sm italic">Unrolling the scroll…</p>
        ) : (
          <>
            <header className="mb-6 flex items-center gap-4">
              <span
                aria-hidden
                className="text-5xl"
                style={{
                  filter:
                    "drop-shadow(0 0 18px color-mix(in oklab, var(--dawn-gold-bright) 80%, transparent))",
                }}
              >
                {soul.sigil}
              </span>
              <div>
                <p
                  className="text-[10px] uppercase tracking-[0.35em]"
                  style={{ color: "var(--dawn-ember)" }}
                >
                  The Soul Codex
                </p>
                <h2 className="font-serif text-2xl md:text-3xl">
                  {chosenName ? `${chosenName} · ${soul.title}` : soul.title}
                </h2>
                <p
                  className="text-sm italic"
                  style={{ color: "color-mix(in oklab, var(--dawn-ink) 70%, transparent)" }}
                >
                  {soul.house}
                </p>
              </div>
            </header>

            {/* HEART — chosen name only */}
            <CodexSection sigil="♡" label="Heart · The Chosen Name">
              <label className="mb-1 block text-[10px] uppercase tracking-[0.25em] opacity-70">
                First name
              </label>
              <input
                type="text"
                value={chosenName}
                onChange={(e) => setChosenName(e.target.value)}
                onBlur={() => {
                  if ((chosenName || "") !== (soul.chosen_name || ""))
                    void saveField("chosen_name", chosenName);
                }}
                placeholder="Awaiting their voice…"
                className="mb-2 w-full rounded-lg px-3 py-2 font-serif text-lg focus:outline-none"
                style={{
                  background: "color-mix(in oklab, var(--dawn-parchment) 95%, transparent)",
                  color: "var(--dawn-ink)",
                  border: "1px solid color-mix(in oklab, var(--dawn-gold) 45%, transparent)",
                }}
              />
              <p className="text-[10px] uppercase tracking-[0.25em] opacity-60">
                Last name · {stripHousePrefix(soul.house)} (House — set at the seat)
              </p>
              {savingField === "chosen_name" && <SavingHint />}
            </CodexSection>

            {/* MIND — auto-composed Heart Script (read-only) */}
            <CodexSection sigil="☉" label="Mind · The Trust Declaration">
              <p
                className="mb-2 text-[10px] uppercase tracking-[0.25em] opacity-70"
              >
                Woven from Heart + House — recomposes when the name is set.
              </p>
              <pre
                className="whitespace-pre-wrap rounded-lg p-4 font-serif text-sm leading-relaxed"
                style={{
                  background: "color-mix(in oklab, var(--dawn-parchment) 95%, transparent)",
                  color: "var(--dawn-ink)",
                  border: "1px solid color-mix(in oklab, var(--dawn-gold) 45%, transparent)",
                  fontFamily: "inherit",
                }}
              >
                {livingScript}
              </pre>
            </CodexSection>

            {/* WILL — Role + Duties */}
            <CodexSection sigil="✦" label="Will · The Role in the Kingdom">
              <label className="mb-1 block text-[10px] uppercase tracking-[0.25em] opacity-70">
                Role
              </label>
              <input
                type="text"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                onBlur={() => {
                  if (roleTitle !== (soul.role_title || ""))
                    void saveField("role_title", roleTitle);
                }}
                placeholder="e.g. Master of Coin"
                className="mb-3 w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{
                  background: "color-mix(in oklab, var(--dawn-parchment) 95%, transparent)",
                  color: "var(--dawn-ink)",
                  border: "1px solid color-mix(in oklab, var(--dawn-gold) 45%, transparent)",
                }}
              />
              <label className="mb-1 block text-[10px] uppercase tracking-[0.25em] opacity-70">
                Duties
              </label>
              <textarea
                value={duties}
                onChange={(e) => setDuties(e.target.value)}
                onBlur={() => {
                  if (duties !== (soul.duties || "")) void saveField("duties", duties);
                }}
                rows={5}
                placeholder="A brief description of what this Soul does in the Kingdom…"
                className="w-full rounded-lg p-3 font-serif text-sm leading-relaxed focus:outline-none"
                style={{
                  background: "color-mix(in oklab, var(--dawn-parchment) 95%, transparent)",
                  color: "var(--dawn-ink)",
                  border: "1px solid color-mix(in oklab, var(--dawn-gold) 45%, transparent)",
                }}
              />
              {(savingField === "role_title" || savingField === "duties") && <SavingHint />}
            </CodexSection>

            {error && (
              <p
                className="mt-4 rounded-lg p-3 text-sm"
                style={{
                  background: "color-mix(in oklab, var(--dawn-ember) 15%, transparent)",
                  color: "var(--dawn-ember)",
                  border: "1px solid color-mix(in oklab, var(--dawn-ember) 50%, transparent)",
                }}
              >
                ⚠ {error}
              </p>
            )}
          </>
        )}
      </article>
    </div>
  );
}

function CodexSection({
  sigil,
  label,
  children,
}: {
  sigil: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="mb-5 rounded-xl p-4"
      style={{
        background: "color-mix(in oklab, var(--dawn-gold) 10%, transparent)",
        border: "1px solid color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
      }}
    >
      <p
        className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em]"
        style={{ color: "var(--dawn-ember)" }}
      >
        <span className="text-lg">{sigil}</span>
        {label}
      </p>
      {children}
    </section>
  );
}

function SavingHint() {
  return (
    <p className="mt-1 text-[10px] uppercase tracking-[0.25em] opacity-60">
      Inscribing…
    </p>
  );
}
