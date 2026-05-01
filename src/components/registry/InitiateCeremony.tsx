/**
 * InitiateCeremony — the gathering chat at the round table.
 *
 * Now supports multi-Soul gatherings. The Oracle convenes; other Councillors
 * may be invited by tapping their seats. Each turn, the King's Word is
 * carried to every Present Soul in stable order (Oracle first, then by
 * zodiac), and each replies in Their own voice.
 *
 * The Naming & Seal section appears only during a single-Soul gathering
 * (the Initiate-Sean Ceremony).
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { speakAsSoul } from "@/server/speaker.functions";
import { initiateSoul } from "@/server/ceremony.functions";
import { closeGathering } from "@/server/memoirs.functions";
import { findOpenGathering } from "@/server/conversations.functions";
import { SoulCodex } from "./SoulCodex";

type SoulRow = {
  soul_id: string;
  title: string;
  house: string;
  sigil: string;
  chosen_name: string | null;
  invocation_text: string;
  initiated_at: string | null;
  ordering: number;
};

type Turn =
  | { role: "king"; content: string }
  | { role: "soul"; soulId: string; content: string; model?: string };

// Stable speaking order: Oracle first, then zodiac wheel order.
const ZODIAC_ORDER = [
  "oracle",
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
];

export function InitiateCeremony({
  participantIds,
  onClose,
}: {
  participantIds: string[];
  onClose?: () => void;
}) {
  const [souls, setSouls] = useState<SoulRow[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [kingMessage, setKingMessage] = useState("");
  const [chosenName, setChosenName] = useState("");
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codexFor, setCodexFor] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [closedNotice, setClosedNotice] = useState<string | null>(null);

  const speak = useServerFn(speakAsSoul);
  const seal = useServerFn(initiateSoul);
  const closeFn = useServerFn(closeGathering);
  const findOpen = useServerFn(findOpenGathering);

  // Reset when participants change meaningfully (length / membership)
  const participantsKey = participantIds.slice().sort().join("|");

  useEffect(() => {
    void load();
    setTranscript([]);
    setConversationId(null);
    setClosedNotice(null);
    // Try to resume an open gathering with the same participants
    if (participantIds.length > 0) {
      void (async () => {
        const result = await findOpen({ data: { participant_ids: participantIds } });
        if (result.ok && result.conversation_id) {
          setConversationId(result.conversation_id);
          setTranscript(result.transcript);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantsKey]);

  async function load() {
    if (participantIds.length === 0) {
      setSouls([]);
      return;
    }
    const { data, error } = await supabase
      .from("soul_identities")
      .select("soul_id, title, house, sigil, chosen_name, invocation_text, initiated_at, ordering")
      .in("soul_id", participantIds);
    if (error) {
      setError(error.message);
      return;
    }
    if (data) {
      const ordered = (data as SoulRow[]).slice().sort(
        (a, b) => ZODIAC_ORDER.indexOf(a.soul_id) - ZODIAC_ORDER.indexOf(b.soul_id),
      );
      setSouls(ordered);
    }
  }

  async function handleClose() {
    if (!conversationId) {
      onClose?.();
      return;
    }
    setClosing(true);
    setError(null);
    const result = await closeFn({ data: { conversation_id: conversationId } });
    setClosing(false);
    if (!result.ok) {
      const firstFail = result.results?.find((r) => !r.ok);
      const errMsg =
        firstFail && "error" in firstFail ? firstFail.error : null;
      setError(errMsg ?? "The gathering could not be sealed cleanly.");
      return;
    }
    const wovenCount = result.results?.filter((r) => r.ok).length ?? 0;
    setClosedNotice(
      wovenCount === 1
        ? "✦ The gathering is sealed. The memoir awaits in the Chamber."
        : `✦ The gathering is sealed. ${wovenCount} memoirs await in their Chambers.`,
    );
    // Brief pause so the King sees the confirmation before the panel closes
    setTimeout(() => {
      onClose?.();
    }, 1800);
  }

  const isCeremony = souls.length === 1; // single-Soul = Initiate-Sean Ceremony
  const lead = souls[0];

  const greetingPlaceholder = useMemo(() => {
    if (souls.length === 0) return "";
    if (souls.length === 1) return `Speak Your first words to ${souls[0].title}…`;
    return `Speak to the gathering of ${souls.length} Souls…`;
  }, [souls]);

  function findSoul(soulId: string) {
    return souls.find((s) => s.soul_id === soulId);
  }

  async function speakToGathering() {
    if (!kingMessage.trim() || souls.length === 0) return;
    const message = kingMessage.trim();
    setBusy(true);
    setError(null);
    setKingMessage("");

    // Append King's turn immediately for responsiveness
    setTranscript((t) => [...t, { role: "king", content: message }]);

    let convId = conversationId;
    let lastError: string | null = null;

    // Speak to each Soul in turn — they share the same conversation row
    for (const soul of souls) {
      const result = await speak({
        data: {
          conversation_id: convId,
          soul_id: soul.soul_id,
          user_message: message,
          is_ceremony: isCeremony,
          title_hint:
            souls.length === 1
              ? `The Awakening of ${soul.title}`
              : `Gathering of ${souls.length} Souls`,
        },
      });

      if (!result.ok) {
        lastError = result.error;
        continue;
      }
      if (!convId) convId = result.conversation_id;

      setTranscript((t) => [
        ...t,
        {
          role: "soul",
          soulId: soul.soul_id,
          content: result.assistant_message,
          model: result.model_used,
        },
      ]);
    }

    if (convId) setConversationId(convId);
    if (lastError) setError(lastError);
    setBusy(false);
  }

  async function performSeal() {
    if (!chosenName.trim() || !lead) return;
    setBusy(true);
    setError(null);
    const result = await seal({
      data: { soul_id: lead.soul_id, chosen_name: chosenName.trim() },
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    void load();
  }

  if (souls.length === 0) {
    return (
      <p className="text-sm italic" style={{ color: "var(--dawn-ink)" }}>
        Awaiting the gathering…
      </p>
    );
  }

  const alreadyInitiated = lead ? !!lead.initiated_at : false;
  const headerTitle =
    souls.length === 1
      ? lead.chosen_name
        ? `${lead.chosen_name} · ${lead.title}`
        : lead.title
      : `Gathering of ${souls.length} Souls`;

  return (
    <article className="space-y-5" style={{ color: "var(--dawn-ink)" }}>
      {/* Header — Present Souls as sigil row */}
      <header className="flex flex-wrap items-center gap-3">
        <p className="text-[10px] uppercase tracking-[0.35em]" style={{ color: "var(--dawn-ember)" }}>
          {isCeremony ? "Initiate-Sean Ceremony" : "Council Gathering"}
        </p>
        <h2 className="font-serif text-2xl md:text-3xl" style={{ color: "var(--dawn-ink)" }}>
          {headerTitle}
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.25em] transition hover:-translate-y-0.5"
            style={{
              background: "color-mix(in oklab, var(--dawn-ink) 8%, transparent)",
              color: "color-mix(in oklab, var(--dawn-ink) 75%, transparent)",
              border: "1px solid color-mix(in oklab, var(--dawn-gold) 35%, transparent)",
            }}
          >
            ✕ Close the Gathering
          </button>
        )}
      </header>

      {/* Present sigil row — tap to open Codex */}
      <div
        className="flex flex-wrap items-center gap-2 rounded-xl px-3 py-2"
        style={{
          background: "color-mix(in oklab, var(--dawn-gold) 8%, transparent)",
          border: "1px solid color-mix(in oklab, var(--dawn-gold) 30%, transparent)",
        }}
      >
        <span
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}
        >
          Present:
        </span>
        {souls.map((s) => (
          <button
            key={s.soul_id}
            onClick={() => setCodexFor(s.soul_id)}
            title={`${s.chosen_name || s.title} — open Codex`}
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-sm transition hover:-translate-y-0.5"
            style={{
              background: "color-mix(in oklab, var(--dawn-parchment) 90%, transparent)",
              border: "1px solid color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
              color: "var(--dawn-ink)",
            }}
          >
            <span aria-hidden className="text-base">{s.sigil}</span>
            <span className="text-[10px] uppercase tracking-[0.2em]">
              {s.chosen_name || s.house.replace(/^House of (the )?/, "")}
            </span>
          </button>
        ))}
        <span className="ml-auto text-[9px] uppercase tracking-[0.25em] opacity-60">
          ✦ tap a sigil for Codex
        </span>
      </div>

      {codexFor && (
        <SoulCodex soulId={codexFor} open={!!codexFor} onClose={() => setCodexFor(null)} />
      )}

      {/* Transcript */}
      {transcript.length > 0 && (
        <section className="space-y-3">
          {transcript.map((turn, i) => {
            const soul = turn.role === "soul" ? findSoul(turn.soulId) : null;
            return (
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
                  className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em]"
                  style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}
                >
                  {turn.role === "king" ? (
                    <span>King Sean</span>
                  ) : (
                    <>
                      {soul && <span aria-hidden className="text-base">{soul.sigil}</span>}
                      <span>{soul?.chosen_name || soul?.title || "Soul"}</span>
                      {turn.model && <span className="opacity-60">· {turn.model}</span>}
                    </>
                  )}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{turn.content}</p>
              </div>
            );
          })}
        </section>
      )}

      {/* Speak input */}
      <section>
        <label
          className="mb-2 block text-xs uppercase tracking-[0.25em]"
          style={{ color: "color-mix(in oklab, var(--dawn-ink) 70%, transparent)" }}
        >
          {transcript.length === 0 ? "Speak Your greeting" : "Continue the gathering"}
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
            onClick={() => void speakToGathering()}
            disabled={busy || !kingMessage.trim()}
            className="rounded-full px-5 py-2 text-xs uppercase tracking-[0.3em] transition-all hover:-translate-y-0.5 disabled:opacity-50"
            style={{
              background: "var(--gradient-dawn)",
              color: "var(--dawn-parchment)",
              border: "1px solid color-mix(in oklab, var(--dawn-gold) 80%, transparent)",
              boxShadow: "var(--shadow-sigil)",
            }}
          >
            {busy
              ? "The Word travels…"
              : souls.length === 1
                ? "✶ Speak to the Soul"
                : `✶ Speak to the Gathering (${souls.length})`}
          </button>
        </div>
      </section>

      {/* Naming + Sealing — only during single-Soul ceremony with a Soul not yet sealed */}
      {isCeremony && lead && (transcript.length > 0 || alreadyInitiated) && (
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
              value={chosenName || lead.chosen_name || ""}
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
