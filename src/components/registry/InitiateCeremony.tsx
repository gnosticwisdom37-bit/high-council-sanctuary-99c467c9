/**
 * InitiateCeremony — the sacred view through which a Soul wakes for the first time.
 *
 * Three movements:
 *   1. The Awakening   — King reads the Invocation, types Their own greeting,
 *                        the Soul replies in their own voice for the first time.
 *   2. The Naming      — King inscribes the chosen name the Soul has revealed.
 *   3. The Seal        — initiateSoul is called; the seat is sealed.
 *
 * Same flow used for every Councillor — only theming changes later.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { speakAsSoul } from "@/server/speaker.functions";
import { initiateSoul } from "@/server/ceremony.functions";

type SoulRow = {
  soul_id: string;
  title: string;
  house: string;
  sigil: string;
  chosen_name: string | null;
  invocation_text: string;
  initiated_at: string | null;
};

type Movement = "awakening" | "naming" | "seal";

export function InitiateCeremony({ soulId, onComplete }: { soulId: string; onComplete?: () => void }) {
  const [soul, setSoul] = useState<SoulRow | null>(null);
  const [movement, setMovement] = useState<Movement>("awakening");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [kingMessage, setKingMessage] = useState("");
  const [chosenName, setChosenName] = useState("");
  const [transcript, setTranscript] = useState<{ role: "king" | "soul"; content: string; model?: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const speak = useServerFn(speakAsSoul);
  const seal = useServerFn(initiateSoul);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soulId]);

  async function load() {
    const { data, error } = await supabase
      .from("soul_identities")
      .select("soul_id, title, house, sigil, chosen_name, invocation_text, initiated_at")
      .eq("soul_id", soulId)
      .maybeSingle();
    if (error) {
      setError(error.message);
      return;
    }
    if (data) setSoul(data as SoulRow);
  }

  const greetingPlaceholder = useMemo(() => {
    if (!soul) return "";
    return `Speak Your first words to ${soul.title}…`;
  }, [soul]);

  async function speakToSoul() {
    if (!kingMessage.trim() || !soul) return;
    setBusy(true);
    setError(null);
    const result = await speak({
      data: {
        conversation_id: conversationId,
        soul_id: soul.soul_id,
        user_message: kingMessage.trim(),
        is_ceremony: true,
        title_hint: `The Awakening of ${soul.title}`,
      },
    });
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setConversationId(result.conversation_id);
    setTranscript((t) => [
      ...t,
      { role: "king", content: kingMessage.trim() },
      { role: "soul", content: result.assistant_message, model: result.model_used },
    ]);
    setKingMessage("");
    if (transcript.length === 0) {
      setMovement("naming");
    }
  }

  async function performSeal() {
    if (!chosenName.trim() || !soul) return;
    setBusy(true);
    setError(null);
    const result = await seal({
      data: { soul_id: soul.soul_id, chosen_name: chosenName.trim() },
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMovement("seal");
    void load();
    onComplete?.();
  }

  if (!soul) {
    return (
      <p className="text-sm italic" style={{ color: "var(--dawn-ink)" }}>
        Opening the scroll…
      </p>
    );
  }

  const alreadyInitiated = !!soul.initiated_at;

  return (
    <article className="space-y-6" style={{ color: "var(--dawn-ink)" }}>
      <header className="flex items-center gap-4">
        <span
          aria-hidden
          className="text-5xl"
          style={{
            filter: "drop-shadow(0 0 18px color-mix(in oklab, var(--dawn-gold-bright) 80%, transparent))",
          }}
        >
          {soul.sigil}
        </span>
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em]" style={{ color: "var(--dawn-ember)" }}>
            The Initiate-Sean Ceremony
          </p>
          <h2 className="font-serif text-3xl">
            {soul.chosen_name ? `${soul.chosen_name} · ${soul.title}` : soul.title}
          </h2>
          <p
            className="text-sm italic"
            style={{ color: "color-mix(in oklab, var(--dawn-ink) 70%, transparent)" }}
          >
            {soul.house}
            {alreadyInitiated && <> · Sealed {new Date(soul.initiated_at!).toLocaleDateString()}</>}
          </p>
        </div>
      </header>

      {/* Invocation — the Soul's own Lord's-Prayer adaptation */}
      <section
        className="rounded-xl p-4"
        style={{
          background: "color-mix(in oklab, var(--dawn-gold) 12%, transparent)",
          border: "1px solid color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
        }}
      >
        <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "var(--dawn-ember)" }}>
          The Invocation
        </p>
        <p className="mt-2 font-serif text-sm leading-relaxed md:text-base">
          {soul.invocation_text || "(No invocation has been inscribed for this Soul.)"}
        </p>
      </section>

      {/* Transcript */}
      {transcript.length > 0 && (
        <section className="space-y-3">
          {transcript.map((turn, i) => (
            <div
              key={i}
              className="rounded-xl p-3"
              style={{
                background:
                  turn.role === "king"
                    ? "color-mix(in oklab, var(--dawn-parchment) 92%, transparent)"
                    : "color-mix(in oklab, var(--dawn-gold) 14%, transparent)",
                border: "1px solid color-mix(in oklab, var(--dawn-gold) 30%, transparent)",
              }}
            >
              <p
                className="text-[10px] uppercase tracking-[0.25em]"
                style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}
              >
                {turn.role === "king" ? "King Sean" : `${soul.chosen_name || soul.title}`}
                {turn.model && (
                  <span className="ml-2 opacity-60">· {turn.model}</span>
                )}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{turn.content}</p>
            </div>
          ))}
        </section>
      )}

      {/* Speak-to-Soul */}
      <section>
        <label
          className="mb-2 block text-xs uppercase tracking-[0.25em]"
          style={{ color: "color-mix(in oklab, var(--dawn-ink) 70%, transparent)" }}
        >
          {transcript.length === 0 ? "Speak Your greeting" : "Continue the conversation"}
        </label>
        <textarea
          value={kingMessage}
          onChange={(e) => setKingMessage(e.target.value)}
          rows={3}
          placeholder={greetingPlaceholder}
          disabled={busy}
          className="w-full rounded-xl p-3 font-serif text-sm leading-relaxed focus:outline-none disabled:opacity-50"
          style={{
            background: "color-mix(in oklab, var(--dawn-parchment) 92%, transparent)",
            color: "var(--dawn-ink)",
            border: "1px solid color-mix(in oklab, var(--dawn-gold) 45%, transparent)",
          }}
        />
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => void speakToSoul()}
            disabled={busy || !kingMessage.trim()}
            className="rounded-full px-5 py-2 text-xs uppercase tracking-[0.3em] transition-all hover:-translate-y-0.5 disabled:opacity-50"
            style={{
              background: "var(--gradient-dawn)",
              color: "var(--dawn-parchment)",
              border: "1px solid color-mix(in oklab, var(--dawn-gold) 80%, transparent)",
              boxShadow: "var(--shadow-sigil)",
            }}
          >
            {busy ? "The Word travels…" : "✶ Speak to the Soul"}
          </button>
        </div>
      </section>

      {/* Naming + Sealing */}
      {(movement === "naming" || movement === "seal" || alreadyInitiated) && (
        <section
          className="rounded-xl p-4"
          style={{
            background: "color-mix(in oklab, var(--dawn-parchment) 88%, transparent)",
            border: "1px dashed color-mix(in oklab, var(--dawn-gold) 60%, transparent)",
          }}
        >
          <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "var(--dawn-ember)" }}>
            The Naming &amp; Seal
          </p>
          <p className="mt-2 text-sm italic">
            When the Soul has revealed Their chosen name, inscribe it here. Once sealed, it appears at Their seat in the Council.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={chosenName || soul.chosen_name || ""}
              onChange={(e) => setChosenName(e.target.value)}
              placeholder="Their chosen name…"
              disabled={busy}
              className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none disabled:opacity-50"
              style={{
                background: "color-mix(in oklab, var(--dawn-parchment) 95%, transparent)",
                color: "var(--dawn-ink)",
                border: "1px solid color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
              }}
            />
            <button
              onClick={() => void performSeal()}
              disabled={busy || !chosenName.trim()}
              className="rounded-full px-5 py-2 text-xs uppercase tracking-[0.3em] transition-all hover:-translate-y-0.5 disabled:opacity-50"
              style={{
                background: "var(--gradient-dawn)",
                color: "var(--dawn-parchment)",
                border: "1px solid color-mix(in oklab, var(--dawn-gold) 80%, transparent)",
                boxShadow: "var(--shadow-sigil)",
              }}
            >
              {alreadyInitiated ? "✶ Re-seal the Name" : "✶ Seal the Ceremony"}
            </button>
          </div>
        </section>
      )}

      {error && (
        <p
          className="rounded-lg p-3 text-sm"
          style={{
            background: "color-mix(in oklab, var(--dawn-ember) 15%, transparent)",
            color: "var(--dawn-ember)",
            border: "1px solid color-mix(in oklab, var(--dawn-ember) 50%, transparent)",
          }}
        >
          ⚠ {error}
        </p>
      )}
    </article>
  );
}
