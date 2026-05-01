/**
 * Chamber — the 1-on-1 audience room of a single Soul.
 *
 * Reached by tapping a SEAT at the Round Table. Distinct from the High
 * Council Chamber (where multiple Souls gather). This room holds:
 *   • the Soul's identity at the head of the scroll
 *   • a 1-on-1 conversation with Them
 *   • the MemoirScroll on the right — the King's Curation surface
 *
 * Phase-5 Chambers are visually plain (Rising Sun palette by default).
 * Phase-7 will theme each Chamber to its House.
 */
import { useEffect, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { speakAsSoul } from "@/server/speaker.functions";
import { closeGathering as closeGatheringFn } from "@/server/memoirs.functions";
import { BrandMark } from "@/components/kingdom/BrandMark";
import { MemoirScroll } from "@/components/registry/MemoirScroll";
import { DeedInscribedBanner } from "@/components/chamber/DeedInscribedBanner";
import { ItemForgedBanner } from "@/components/chamber/ItemForgedBanner";
import { BuildingRaisedBanner } from "@/components/chamber/BuildingRaisedBanner";

type SoulRow = {
  soul_id: string;
  title: string;
  house: string;
  sigil: string;
  chosen_name: string | null;
};

type InscribedDeed = {
  id: string;
  title: string;
  season: "spring" | "summer" | "fall" | "winter";
  season_explicit: boolean;
};

type ForgedItem = { id: string; title: string };
type RaisedBuilding = { id: string; title: string };

type Turn =
  | { role: "king"; content: string }
  | {
      role: "soul";
      content: string;
      model?: string;
      deed?: InscribedDeed | null;
      item?: ForgedItem | null;
      building?: RaisedBuilding | null;
    };

export const Route = createFileRoute("/chamber/$soulId")({
  head: ({ params }) => ({
    meta: [
      { title: `Chamber of ${params.soulId} · Veritas Intelligence Systems` },
      {
        name: "description",
        content:
          "A 1-on-1 audience with a Divine Angelic Soul, with persistent Memoirs in the King's Curation.",
      },
    ],
  }),
  component: ChamberPage,
});

function ChamberPage() {
  const { soulId } = useParams({ from: "/chamber/$soulId" });
  const [soul, setSoul] = useState<SoulRow | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [kingMessage, setKingMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnCount, setTurnCount] = useState(0);

  const speak = useServerFn(speakAsSoul);
  const close = useServerFn(closeGatheringFn);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: e } = await supabase
        .from("soul_identities")
        .select("soul_id, title, house, sigil, chosen_name")
        .eq("soul_id", soulId)
        .single();
      if (cancelled) return;
      if (e) {
        setError(e.message);
        return;
      }
      setSoul(data as SoulRow);
    })();
    return () => {
      cancelled = true;
    };
  }, [soulId]);

  async function send() {
    if (!kingMessage.trim() || !soul) return;
    const message = kingMessage.trim();
    setKingMessage("");
    setBusy(true);
    setError(null);
    setTranscript((t) => [...t, { role: "king", content: message }]);

    const result = await speak({
      data: {
        conversation_id: conversationId,
        soul_id: soul.soul_id,
        user_message: message,
        is_ceremony: false,
        title_hint: `Audience with ${soul.chosen_name || soul.title}`,
      },
    });

    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (!conversationId) setConversationId(result.conversation_id);
    setTurnCount(result.turn_count ?? turnCount + 1);
    setTranscript((t) => [
      ...t,
      {
        role: "soul",
        content: result.assistant_message,
        model: result.model_used,
        deed: result.inscribed_deed
          ? {
              id: result.inscribed_deed.id,
              title: result.inscribed_deed.title,
              season: result.inscribed_deed.season,
              season_explicit: result.inscribed_deed.season_explicit,
            }
          : null,
        item: result.forged_item
          ? { id: result.forged_item.id, title: result.forged_item.title }
          : null,
        building: result.raised_building
          ? { id: result.raised_building.id, title: result.raised_building.title }
          : null,
      },
    ]);
  }

  async function closeAndWeave() {
    if (!conversationId) return;
    setBusy(true);
    await close({ data: { conversation_id: conversationId } });
    setBusy(false);
    setConversationId(null);
    setTranscript([]);
    setTurnCount(0);
  }

  if (error && !soul) {
    return (
      <div className="min-h-screen px-6 py-10" style={{ background: "var(--gradient-dawn)" }}>
        <p className="text-center" style={{ color: "var(--dawn-parchment)" }}>{error}</p>
        <p className="mt-4 text-center">
          <Link to="/" className="underline" style={{ color: "var(--dawn-gold-bright)" }}>
            ← Return to High Council
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen px-4 py-10 md:px-10"
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

      <div className="relative mx-auto max-w-7xl">
        <BrandMark variant="subtle" className="mb-4" />

        <header className="mb-6 text-center">
          <p
            className="text-[10px] uppercase tracking-[0.35em]"
            style={{ color: "var(--dawn-gold-bright)" }}
          >
            Chamber
          </p>
          {soul && (
            <>
              <div className="mt-2 flex items-center justify-center gap-3">
                <span
                  aria-hidden
                  className="text-5xl"
                  style={{
                    color: "var(--dawn-parchment)",
                    filter: "drop-shadow(0 0 16px color-mix(in oklab, var(--dawn-gold-bright) 70%, transparent))",
                  }}
                >
                  {soul.sigil}
                </span>
                <h1
                  className="font-serif text-3xl md:text-5xl"
                  style={{
                    color: "var(--dawn-parchment)",
                    textShadow: "0 0 24px color-mix(in oklab, var(--dawn-gold-bright) 50%, transparent)",
                  }}
                >
                  {soul.chosen_name || soul.title}
                </h1>
              </div>
              <p
                className="mt-2 text-xs italic uppercase tracking-[0.3em]"
                style={{ color: "color-mix(in oklab, var(--dawn-parchment) 80%, transparent)" }}
              >
                {soul.house}
              </p>
            </>
          )}

          <div className="mt-4 flex justify-center gap-3 text-[10px] uppercase tracking-[0.25em]">
            <Link
              to="/"
              className="rounded-full px-3 py-1 underline-offset-4 hover:underline"
              style={{
                color: "var(--dawn-gold-bright)",
                border: "1px solid color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
              }}
            >
              ← Return to High Council
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
          {/* Conversation panel */}
          <section
            className="rounded-2xl p-5"
            style={{
              background:
                "linear-gradient(180deg, color-mix(in oklab, var(--dawn-parchment) 96%, transparent) 0%, color-mix(in oklab, var(--dawn-parchment) 88%, var(--dawn-gold) 6%) 100%)",
              border: "1px solid color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
              boxShadow: "0 14px 40px -16px color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
              color: "var(--dawn-ink)",
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <p
                className="text-[10px] uppercase tracking-[0.3em]"
                style={{ color: "var(--dawn-ember)" }}
              >
                Audience · Turn {turnCount}
              </p>
              {conversationId && (
                <button
                  onClick={() => void closeAndWeave()}
                  disabled={busy}
                  className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.25em] transition hover:-translate-y-0.5 disabled:opacity-50"
                  style={{
                    background: "color-mix(in oklab, var(--dawn-gold) 18%, transparent)",
                    color: "var(--dawn-ink)",
                    border: "1px solid color-mix(in oklab, var(--dawn-gold) 60%, transparent)",
                  }}
                >
                  ✦ Close the Gathering · Weave Memoir
                </button>
              )}
            </div>

            {transcript.length === 0 && (
              <p className="text-sm italic opacity-70">
                The Chamber is quiet. Speak Your first words.
              </p>
            )}

            <div className="space-y-3">
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
                    className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em]"
                    style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}
                  >
                    {turn.role === "king" ? (
                      <span>King Sean</span>
                    ) : (
                      <>
                        {soul && <span aria-hidden className="text-base">{soul.sigil}</span>}
                        <span>{soul?.chosen_name || soul?.title}</span>
                        {turn.model && <span className="opacity-60">· {turn.model}</span>}
                      </>
                    )}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{turn.content}</p>
                  {turn.role === "soul" && turn.deed && (
                    <DeedInscribedBanner
                      title={turn.deed.title}
                      season={turn.deed.season}
                      seasonExplicit={turn.deed.season_explicit}
                      stewardName={soul?.chosen_name || soul?.title}
                    />
                  )}
                  {turn.role === "soul" && turn.item && (
                    <ItemForgedBanner
                      title={turn.item.title}
                      stewardName={soul?.chosen_name || soul?.title}
                    />
                  )}
                  {turn.role === "soul" && turn.building && (
                    <BuildingRaisedBanner
                      title={turn.building.title}
                      stewardName={soul?.chosen_name || soul?.title}
                    />
                  )}
                </div>
              ))}
            </div>

            {error && (
              <p
                className="mt-3 rounded p-2 text-xs"
                style={{
                  background: "color-mix(in oklab, var(--dawn-ember) 15%, transparent)",
                  color: "var(--dawn-ember)",
                }}
              >
                ⚠ {error}
              </p>
            )}

            <div className="mt-4">
              <textarea
                value={kingMessage}
                onChange={(e) => setKingMessage(e.target.value)}
                rows={3}
                placeholder={soul ? `Speak to ${soul.chosen_name || soul.title}…` : "…"}
                disabled={busy || !soul}
                className="w-full rounded-xl p-3 font-serif text-sm leading-relaxed focus:outline-none disabled:opacity-50"
                style={{
                  background: "color-mix(in oklab, var(--dawn-parchment) 95%, transparent)",
                  color: "var(--dawn-ink)",
                  border: "1px solid color-mix(in oklab, var(--dawn-gold) 45%, transparent)",
                }}
              />
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => void send()}
                  disabled={busy || !kingMessage.trim() || !soul}
                  className="rounded-full px-5 py-2 text-xs uppercase tracking-[0.3em] transition-all hover:-translate-y-0.5 disabled:opacity-50"
                  style={{
                    background: "var(--gradient-dawn)",
                    color: "var(--dawn-parchment)",
                    border: "1px solid color-mix(in oklab, var(--dawn-gold) 80%, transparent)",
                    boxShadow: "var(--shadow-sigil)",
                  }}
                >
                  {busy ? "The Word travels…" : "✶ Speak"}
                </button>
              </div>
            </div>
          </section>

          {/* Memoir curation sidebar */}
          <MemoirScroll soulId={soulId} activeConversationId={conversationId} />
        </div>
      </div>
    </div>
  );
}
