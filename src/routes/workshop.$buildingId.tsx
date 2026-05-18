/**
 * The Workshop — universal Tool host (Phase 8).
 *
 * One room, one Steward, many Implements. Today's Implement is
 * "Promo Cards" — the Steward Soul drafts a short card from each
 * row delivered by the King's local courier script.
 *
 * Two-pane top: Production (parchment card preview) + Scriptorium
 * (intake drawer). Event-Spark calendar full-width below.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  CalendarDays,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { BrandMark } from "@/components/kingdom/BrandMark";
import { DropZone } from "@/components/workshop/DropZone";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import {
  getWorkshop,
  listIntakes,
  draftPromoCard,
  schedulePost,
  publishPost,
  cancelPost,
  listScheduled,
  rotateWorkshopToken,
} from "@/server/workshop.functions";
import { listUnrecognized } from "@/server/dropzone.functions";

export const Route = createFileRoute("/workshop/$buildingId")({
  head: () => ({
    meta: [
      { title: "The Workshop · Veritas Intelligence Systems" },
      {
        name: "description",
        content:
          "A Steward Soul wields an Implement to draft, schedule and publish for the Kingdom.",
      },
    ],
  }),
  component: WorkshopPage,
});

type WorkshopRow = {
  id: string;
  building_id: string;
  building_title: string;
  steward_soul_id: string | null;
  active_tool_key: string;
  intake_token: string;
  system_prompt: string;
  hashtag_presets: string[];
};

type StewardRow = {
  soul_id: string;
  title: string;
  house: string;
  chosen_name: string | null;
};

type IntakeRow = {
  id: string;
  source: string;
  rows: Array<Record<string, unknown>>;
  row_count: number;
  status: string;
  created_at: string;
};

type UnrecognizedRow = {
  id: string;
  source: string;
  created_at: string;
  rows: Array<{ filename?: string; extension?: string; size_bytes?: number }>;
};

type Card = {
  title: string;
  body: string;
  hashtags: string[];
  source_url: string | null;
};

type ScheduledPost = {
  id: string;
  title: string;
  body: string;
  hashtags: string[];
  channel: string;
  scheduled_at: string | null;
  status: string;
  created_at: string;
};

const IMPLEMENTS = [
  { key: "promo-cards", label: "Promo Cards", icon: "✦", available: true },
  { key: "legal-strategy", label: "Legal Strategy", icon: "⚖", available: false },
  { key: "research-digest", label: "Research Digest", icon: "📜", available: false },
] as const;

function WorkshopPage() {
  const { buildingId } = Route.useParams();
  const router = useRouter();

  const getWorkshopFn = useServerFn(getWorkshop);
  const listIntakesFn = useServerFn(listIntakes);
  const draftPromoCardFn = useServerFn(draftPromoCard);
  const schedulePostFn = useServerFn(schedulePost);
  const publishPostFn = useServerFn(publishPost);
  const cancelPostFn = useServerFn(cancelPost);
  const listScheduledFn = useServerFn(listScheduled);
  const rotateTokenFn = useServerFn(rotateWorkshopToken);
  const listUnrecognizedFn = useServerFn(listUnrecognized);

  const [workshop, setWorkshop] = useState<WorkshopRow | null>(null);
  const [steward, setSteward] = useState<StewardRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [intakes, setIntakes] = useState<IntakeRow[]>([]);
  const [card, setCard] = useState<Card | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [publishCopy, setPublishCopy] = useState<{ x: string; meta: string } | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [activeIntake, setActiveIntake] = useState<{ id: string; rowIndex: number } | null>(null);
  const [tokenVisible, setTokenVisible] = useState(false);
  const [unrecognized, setUnrecognized] = useState<UnrecognizedRow[]>([]);

  // ─── load workshop + steward
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getWorkshopFn({ data: { building_id: buildingId } });
    if (!res.ok) {
      setError(res.error);
    } else {
      setWorkshop(res.workshop);
      setSteward(res.steward);
    }
    setLoading(false);
  }, [buildingId, getWorkshopFn]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // ─── load intakes + scheduled posts
  const refreshIntakes = useCallback(async () => {
    if (!workshop) return;
    const res = await listIntakesFn({
      data: { workshop_id: workshop.id, tool_key: workshop.active_tool_key, limit: 20 },
    });
    if (res.ok) setIntakes(res.intakes as IntakeRow[]);
  }, [workshop, listIntakesFn]);

  const refreshScheduled = useCallback(async () => {
    if (!workshop) return;
    const res = await listScheduledFn({ data: { workshop_id: workshop.id } });
    if (res.ok) setPosts(res.posts as ScheduledPost[]);
  }, [workshop, listScheduledFn]);

  const refreshUnrecognized = useCallback(async () => {
    if (!workshop) return;
    const res = await listUnrecognizedFn({ data: { workshop_id: workshop.id } });
    if (res.ok) setUnrecognized(res.items as UnrecognizedRow[]);
  }, [workshop, listUnrecognizedFn]);

  useEffect(() => {
    void refreshIntakes();
    void refreshScheduled();
    void refreshUnrecognized();
  }, [refreshIntakes, refreshScheduled, refreshUnrecognized]);

  // ─── realtime intake drawer
  useEffect(() => {
    if (!workshop) return;
    const channel = supabase
      .channel(`workshop-intakes-${workshop.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "csv_intakes",
          filter: `workshop_id=eq.${workshop.id}`,
        },
        () => {
          void refreshIntakes();
          void refreshUnrecognized();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [workshop, refreshIntakes]);

  // ─── set today (client-only)
  useEffect(() => {
    setSelectedDay(new Date());
  }, []);

  // ─── handlers
  const handleDraftRow = useCallback(
    async (intake: IntakeRow, rowIndex: number) => {
      if (!workshop) return;
      setDrafting(true);
      setPublishCopy(null);
      setActiveIntake({ id: intake.id, rowIndex });
      const res = await draftPromoCardFn({
        data: { workshop_id: workshop.id, intake_id: intake.id, row_index: rowIndex },
      });
      if (res.ok) {
        setCard(res.card);
      } else {
        setError(res.error);
      }
      setDrafting(false);
    },
    [workshop, draftPromoCardFn],
  );

  const handleSchedule = useCallback(
    async (when: Date | null) => {
      if (!workshop || !card) return;
      setScheduling(true);
      const res = await schedulePostFn({
        data: {
          workshop_id: workshop.id,
          card,
          scheduled_at: when ? when.toISOString() : null,
          channel: "both",
          source_intake_id: activeIntake?.id ?? null,
          source_row_index: activeIntake?.rowIndex ?? null,
        },
      });
      if (res.ok) {
        await refreshScheduled();
        setCard(null);
        setActiveIntake(null);
      } else {
        setError(res.error);
      }
      setScheduling(false);
    },
    [workshop, card, activeIntake, schedulePostFn, refreshScheduled],
  );

  const handlePublishNow = useCallback(async () => {
    if (!workshop || !card) return;
    setScheduling(true);
    const sched = await schedulePostFn({
      data: {
        workshop_id: workshop.id,
        card,
        scheduled_at: new Date().toISOString(),
        channel: "both",
        source_intake_id: activeIntake?.id ?? null,
        source_row_index: activeIntake?.rowIndex ?? null,
      },
    });
    if (!sched.ok) {
      setError(sched.error);
      setScheduling(false);
      return;
    }
    const pub = await publishPostFn({ data: { post_id: sched.post_id } });
    if (pub.ok) {
      setPublishCopy(pub.copy);
      await refreshScheduled();
    } else {
      setError(pub.error);
    }
    setScheduling(false);
  }, [workshop, card, activeIntake, schedulePostFn, publishPostFn, refreshScheduled]);

  const handleCancel = useCallback(
    async (postId: string) => {
      await cancelPostFn({ data: { post_id: postId } });
      await refreshScheduled();
    },
    [cancelPostFn, refreshScheduled],
  );

  const handleRotate = useCallback(async () => {
    if (!workshop) return;
    if (!confirm("Mint a new intake token? The old one will stop working immediately.")) return;
    const res = await rotateTokenFn({ data: { workshop_id: workshop.id } });
    if (res.ok) {
      setWorkshop({ ...workshop, intake_token: res.intake_token });
      setTokenVisible(true);
    }
  }, [workshop, rotateTokenFn]);

  // ─── calendar marker days
  const scheduledDays = useMemo(
    () =>
      posts
        .filter((p) => p.scheduled_at && p.status !== "cancelled")
        .map((p) => new Date(p.scheduled_at as string)),
    [posts],
  );

  const dayPosts = useMemo(() => {
    if (!selectedDay) return [];
    const key = selectedDay.toDateString();
    return posts.filter(
      (p) => p.scheduled_at && new Date(p.scheduled_at).toDateString() === key,
    );
  }, [posts, selectedDay]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center" style={{ background: "var(--gradient-dawn)" }}>
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: "var(--dawn-gold-bright)" }} />
      </div>
    );
  }

  if (!workshop) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center" style={{ background: "var(--gradient-dawn)" }}>
        <div>
          <p style={{ color: "var(--dawn-parchment)" }}>{error ?? "Workshop could not be raised."}</p>
          <Link to="/realm" className="mt-4 inline-block underline" style={{ color: "var(--dawn-gold-bright)" }}>
            Return to the Realm
          </Link>
        </div>
      </div>
    );
  }

  const stewardName = steward?.chosen_name ?? steward?.title ?? "No Steward yet";

  return (
    <div
      className="relative min-h-screen px-4 py-10 md:px-8"
      style={{ background: "var(--gradient-dawn)", fontFamily: "var(--font-body)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at top, color-mix(in oklab, var(--dawn-gold-bright) 22%, transparent) 0%, transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl">
        <BrandMark variant="subtle" className="mb-4" />

        <header className="mb-6 text-center">
          <p
            className="text-[10px] uppercase tracking-[0.35em]"
            style={{ color: "var(--dawn-gold-bright)" }}
          >
            Workshop · Phase 8 · Implements
          </p>
          <h1
            className="mt-2 font-serif text-3xl md:text-4xl"
            style={{
              fontFamily: "Cinzel, var(--font-serif), serif",
              color: "var(--dawn-parchment)",
              textShadow:
                "0 0 24px color-mix(in oklab, var(--dawn-gold-bright) 50%, transparent)",
            }}
          >
            {workshop.building_title}
          </h1>
          <p
            className="mt-2 text-xs italic uppercase tracking-[0.3em]"
            style={{ color: "color-mix(in oklab, var(--dawn-parchment) 80%, transparent)" }}
          >
            Steward: {stewardName}
            {steward?.house ? ` · ${steward.house}` : ""}
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-3 text-[10px] uppercase tracking-[0.25em]">
            <button
              onClick={() => router.history.back()}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 hover:underline"
              style={{
                color: "var(--dawn-gold-bright)",
                border: "1px solid color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
              }}
            >
              <ArrowLeft className="h-3 w-3" />
              Back
            </button>
          </div>
        </header>

        {error && (
          <p
            className="mb-4 rounded-lg p-3 text-sm"
            style={{
              background: "color-mix(in oklab, var(--dawn-ember) 15%, transparent)",
              color: "var(--dawn-ember)",
              border: "1px solid color-mix(in oklab, var(--dawn-ember) 40%, transparent)",
            }}
          >
            ⚠ {error}
          </p>
        )}

        {/* Implement selector + Intake token */}
        <div className="mb-6 grid gap-3 md:grid-cols-[1fr_auto]">
          <ImplementSelector activeKey={workshop.active_tool_key} />
          <IntakeTokenPanel
            token={workshop.intake_token}
            workshopId={workshop.id}
            visible={tokenVisible}
            onToggle={() => setTokenVisible((v) => !v)}
            onRotate={handleRotate}
          />
        </div>

        {/* Production + Scriptorium */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Pane title="Production" subtitle="Parchment card preview">
            {!card ? (
              <EmptyPane
                icon={<Sparkles className="h-8 w-8" style={{ color: "var(--dawn-ember)" }} />}
                text="Choose a row in the Intake Drawer and tap Draft."
              />
            ) : (
              <CardPreview
                card={card}
                scheduling={scheduling}
                drafting={drafting}
                publishCopy={publishCopy}
                onSchedule={handleSchedule}
                onPublishNow={handlePublishNow}
                onClear={() => {
                  setCard(null);
                  setPublishCopy(null);
                  setActiveIntake(null);
                }}
              />
            )}
          </Pane>

          <Pane title="Scriptorium · Intake Drawer" subtitle={`${intakes.length} delivery${intakes.length === 1 ? "" : "s"}`}>
            {intakes.length === 0 ? (
              <EmptyPane
                icon={<Wand2 className="h-8 w-8" style={{ color: "var(--dawn-ember)" }} />}
                text="No rows yet. Run Your courier script to deliver a CSV."
              />
            ) : (
              <ul className="space-y-3">
                {intakes.map((intake) => (
                  <IntakeRowList
                    key={intake.id}
                    intake={intake}
                    drafting={drafting}
                    activeIntake={activeIntake}
                    onDraft={handleDraftRow}
                  />
                ))}
              </ul>
            )}
          </Pane>
        </div>

        {/* Event-Spark Calendar */}
        <div className="mt-8">
          <Pane
            title="Event-Spark Calendar"
            subtitle={`${posts.filter((p) => p.status === "scheduled").length} scheduled`}
            wide
          >
            <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-start">
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDay}
                  onSelect={setSelectedDay}
                  modifiers={{ scheduled: scheduledDays }}
                  modifiersStyles={{
                    scheduled: {
                      background:
                        "color-mix(in oklab, var(--dawn-gold-bright) 50%, transparent)",
                      color: "var(--dawn-ink)",
                      fontWeight: 700,
                    },
                  }}
                />
              </div>
              <div>
                <p
                  className="mb-3 text-[10px] uppercase tracking-[0.3em]"
                  style={{ color: "var(--dawn-gold-bright)" }}
                >
                  {selectedDay
                    ? selectedDay.toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })
                    : "Select a day"}
                </p>
                {dayPosts.length === 0 ? (
                  <p
                    className="rounded-lg px-3 py-4 text-center text-sm italic"
                    style={{
                      color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)",
                      background: "color-mix(in oklab, var(--dawn-parchment) 85%, transparent)",
                      border: "1px dashed color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
                    }}
                  >
                    No scrolls scheduled this day.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {dayPosts.map((p) => (
                      <li
                        key={p.id}
                        className="rounded-lg px-3 py-2"
                        style={{
                          background:
                            "color-mix(in oklab, var(--dawn-parchment) 92%, transparent)",
                          border:
                            "1px solid color-mix(in oklab, var(--dawn-gold) 30%, transparent)",
                          color: "var(--dawn-ink)",
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p
                              className="truncate text-sm font-medium"
                              style={{ fontFamily: "Cinzel, serif", letterSpacing: "0.04em" }}
                            >
                              {p.title}
                            </p>
                            <p
                              className="text-[10px] uppercase tracking-[0.2em]"
                              style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}
                            >
                              {p.scheduled_at
                                ? new Date(p.scheduled_at).toLocaleTimeString()
                                : "draft"}{" "}
                              · {p.status}
                            </p>
                          </div>
                          {p.status !== "cancelled" && (
                            <button
                              onClick={() => handleCancel(p.id)}
                              className="rounded-full p-1 hover:bg-[color-mix(in_oklab,var(--dawn-ember)_15%,transparent)]"
                              title="Cancel"
                            >
                              <Trash2 className="h-3.5 w-3.5" style={{ color: "var(--dawn-ember)" }} />
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Pane>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Components

function Pane({
  title,
  subtitle,
  wide,
  children,
}: {
  title: string;
  subtitle?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl p-5"
      style={{
        background: "color-mix(in oklab, var(--dawn-deep) 50%, transparent)",
        border: "1px solid color-mix(in oklab, var(--dawn-gold) 35%, transparent)",
        boxShadow: "var(--shadow-celestial)",
        minHeight: wide ? undefined : 320,
      }}
    >
      <div className="mb-4">
        <h2
          className="text-sm uppercase tracking-[0.3em]"
          style={{
            color: "var(--dawn-gold-bright)",
            fontFamily: "Cinzel, serif",
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className="mt-1 text-[10px] uppercase tracking-[0.25em]"
            style={{ color: "color-mix(in oklab, var(--dawn-parchment) 70%, transparent)" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyPane({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-xl px-6 py-12 text-center"
      style={{
        background: "color-mix(in oklab, var(--dawn-parchment) 88%, transparent)",
        border: "1px dashed color-mix(in oklab, var(--dawn-gold) 45%, transparent)",
        color: "var(--dawn-ink)",
        minHeight: 220,
      }}
    >
      {icon}
      <p className="text-sm italic" style={{ fontFamily: "Cinzel, serif", letterSpacing: "0.04em" }}>
        {text}
      </p>
    </div>
  );
}

function ImplementSelector({ activeKey }: { activeKey: string }) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-2xl px-4 py-3"
      style={{
        background: "color-mix(in oklab, var(--dawn-deep) 55%, transparent)",
        border: "1px solid color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
      }}
    >
      <span
        className="mr-2 text-[10px] uppercase tracking-[0.3em]"
        style={{ color: "var(--dawn-gold-bright)" }}
      >
        ⚒ Choose Implement
      </span>
      {IMPLEMENTS.map((imp) => {
        const active = imp.key === activeKey;
        return (
          <button
            key={imp.key}
            disabled={!imp.available}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em] transition disabled:opacity-40"
            style={{
              background: active
                ? "var(--dawn-gold-bright)"
                : "color-mix(in oklab, var(--dawn-parchment) 10%, transparent)",
              color: active ? "var(--dawn-ink)" : "var(--dawn-parchment)",
              border: `1px solid color-mix(in oklab, var(--dawn-gold) ${active ? 90 : 50}%, transparent)`,
              fontFamily: "Cinzel, serif",
              cursor: imp.available ? "pointer" : "not-allowed",
            }}
            title={imp.available ? imp.label : `${imp.label} — coming soon`}
          >
            <span aria-hidden>{imp.icon}</span>
            {imp.label}
          </button>
        );
      })}
    </div>
  );
}

function IntakeTokenPanel({
  token,
  workshopId,
  visible,
  onToggle,
  onRotate,
}: {
  token: string;
  workshopId: string;
  visible: boolean;
  onToggle: () => void;
  onRotate: () => void;
}) {
  const masked = `${token.slice(0, 4)}${"•".repeat(Math.max(0, token.length - 8))}${token.slice(-4)}`;
  return (
    <div
      className="flex items-center gap-2 rounded-2xl px-3 py-2 text-[10px]"
      style={{
        background: "color-mix(in oklab, var(--dawn-deep) 60%, transparent)",
        border: "1px solid color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
        color: "var(--dawn-parchment)",
        fontFamily: "monospace",
      }}
      title={`Workshop ID: ${workshopId}`}
    >
      <KeyRound className="h-3.5 w-3.5" style={{ color: "var(--dawn-gold-bright)" }} />
      <span className="select-all">{visible ? token : masked}</span>
      <button onClick={onToggle} title={visible ? "Hide" : "Reveal"}>
        {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
      <button
        onClick={() => {
          void navigator.clipboard.writeText(token);
        }}
        title="Copy"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
      <button onClick={onRotate} title="Rotate">
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function IntakeRowList({
  intake,
  drafting,
  activeIntake,
  onDraft,
}: {
  intake: IntakeRow;
  drafting: boolean;
  activeIntake: { id: string; rowIndex: number } | null;
  onDraft: (intake: IntakeRow, rowIndex: number) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <li
      className="rounded-xl px-3 py-2"
      style={{
        background: "color-mix(in oklab, var(--dawn-parchment) 90%, transparent)",
        border: "1px solid color-mix(in oklab, var(--dawn-gold) 30%, transparent)",
        color: "var(--dawn-ink)",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span
          className="truncate text-sm"
          style={{ fontFamily: "Cinzel, serif", letterSpacing: "0.04em" }}
        >
          {intake.source}
        </span>
        <span
          className="shrink-0 text-[10px] uppercase tracking-[0.2em]"
          style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}
        >
          {intake.row_count} rows · {new Date(intake.created_at).toLocaleString()}
        </span>
      </button>

      {open && (
        <ul className="mt-2 space-y-1">
          {intake.rows.slice(0, 20).map((r, i) => {
            const title = String((r as { title?: unknown }).title ?? `Row ${i + 1}`);
            const isActive = activeIntake?.id === intake.id && activeIntake.rowIndex === i;
            return (
              <li key={i} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-xs">{title}</span>
                <button
                  onClick={() => onDraft(intake, i)}
                  disabled={drafting}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] disabled:opacity-50"
                  style={{
                    background: isActive
                      ? "var(--dawn-gold-bright)"
                      : "color-mix(in oklab, var(--dawn-gold) 30%, transparent)",
                    color: "var(--dawn-ink)",
                    border: "1px solid color-mix(in oklab, var(--dawn-gold) 60%, transparent)",
                  }}
                >
                  {drafting && isActive ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Wand2 className="h-3 w-3" />
                  )}
                  Draft
                </button>
              </li>
            );
          })}
          {intake.rows.length > 20 && (
            <li className="pt-1 text-[10px] italic opacity-70">
              + {intake.rows.length - 20} more rows…
            </li>
          )}
        </ul>
      )}
    </li>
  );
}

function CardPreview({
  card,
  scheduling,
  drafting,
  publishCopy,
  onSchedule,
  onPublishNow,
  onClear,
}: {
  card: Card;
  scheduling: boolean;
  drafting: boolean;
  publishCopy: { x: string; meta: string } | null;
  onSchedule: (when: Date | null) => void;
  onPublishNow: () => void;
  onClear: () => void;
}) {
  const [picker, setPicker] = useState(false);
  const [pickedDay, setPickedDay] = useState<Date | undefined>(undefined);
  return (
    <div className="space-y-3">
      <div
        className="rounded-xl p-5"
        style={{
          background:
            "linear-gradient(160deg, color-mix(in oklab, var(--dawn-parchment) 96%, transparent) 0%, color-mix(in oklab, var(--dawn-parchment) 85%, transparent) 100%)",
          border: "1px solid color-mix(in oklab, var(--dawn-gold) 55%, transparent)",
          color: "var(--dawn-ink)",
          boxShadow: "var(--shadow-sigil)",
        }}
      >
        <h3
          className="text-lg"
          style={{ fontFamily: "Cinzel, serif", letterSpacing: "0.06em" }}
        >
          {card.title}
        </h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{card.body}</p>
        {card.hashtags.length > 0 && (
          <p
            className="mt-3 text-[11px] uppercase tracking-[0.15em]"
            style={{ color: "color-mix(in oklab, var(--dawn-ember) 90%, transparent)" }}
          >
            {card.hashtags.join(" ")}
          </p>
        )}
        {card.source_url && (
          <a
            href={card.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-[10px] uppercase tracking-[0.2em] underline"
            style={{ color: "var(--dawn-ember)" }}
          >
            Read the Scroll →
          </a>
        )}
      </div>

      {!publishCopy ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setPicker((v) => !v)}
            disabled={scheduling || drafting}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em] disabled:opacity-50"
            style={{
              background: "color-mix(in oklab, var(--dawn-gold) 30%, transparent)",
              color: "var(--dawn-parchment)",
              border: "1px solid color-mix(in oklab, var(--dawn-gold) 60%, transparent)",
            }}
          >
            <CalendarDays className="h-3 w-3" />
            Schedule
          </button>
          <button
            onClick={onPublishNow}
            disabled={scheduling || drafting}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em] disabled:opacity-50"
            style={{
              background: "var(--dawn-gold-bright)",
              color: "var(--dawn-ink)",
              border: "1px solid color-mix(in oklab, var(--dawn-gold) 80%, transparent)",
            }}
          >
            {scheduling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Publish now
          </button>
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em]"
            style={{
              color: "var(--dawn-ember)",
              border: "1px solid color-mix(in oklab, var(--dawn-ember) 50%, transparent)",
            }}
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </button>
        </div>
      ) : (
        <div
          className="rounded-xl p-4 text-xs"
          style={{
            background: "color-mix(in oklab, var(--dawn-deep) 50%, transparent)",
            border: "1px solid color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
            color: "var(--dawn-parchment)",
          }}
        >
          <p
            className="mb-2 text-[10px] uppercase tracking-[0.25em]"
            style={{ color: "var(--dawn-gold-bright)" }}
          >
            Published · Copy to channel
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(publishCopy.x)}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 uppercase tracking-[0.2em]"
              style={{
                background: "color-mix(in oklab, var(--dawn-gold) 30%, transparent)",
                color: "var(--dawn-parchment)",
                border: "1px solid color-mix(in oklab, var(--dawn-gold) 60%, transparent)",
              }}
            >
              <Copy className="h-3 w-3" />
              Copy for X
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(publishCopy.meta)}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 uppercase tracking-[0.2em]"
              style={{
                background: "color-mix(in oklab, var(--dawn-gold) 30%, transparent)",
                color: "var(--dawn-parchment)",
                border: "1px solid color-mix(in oklab, var(--dawn-gold) 60%, transparent)",
              }}
            >
              <Copy className="h-3 w-3" />
              Copy for Meta
            </button>
            <button
              onClick={onClear}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 uppercase tracking-[0.2em]"
              style={{
                color: "var(--dawn-ember)",
                border: "1px solid color-mix(in oklab, var(--dawn-ember) 50%, transparent)",
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {picker && (
        <div
          className="rounded-xl p-3"
          style={{
            background: "color-mix(in oklab, var(--dawn-parchment) 92%, transparent)",
            border: "1px solid color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
          }}
        >
          <Calendar mode="single" selected={pickedDay} onSelect={setPickedDay} />
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => setPicker(false)}
              className="text-[10px] uppercase tracking-[0.2em]"
              style={{ color: "var(--dawn-ink)" }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (pickedDay) {
                  const when = new Date(pickedDay);
                  when.setHours(9, 0, 0, 0);
                  onSchedule(when);
                  setPicker(false);
                }
              }}
              disabled={!pickedDay}
              className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] disabled:opacity-50"
              style={{
                background: "var(--dawn-gold-bright)",
                color: "var(--dawn-ink)",
              }}
            >
              Confirm 9 AM
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
