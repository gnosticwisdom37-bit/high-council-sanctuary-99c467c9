/**
 * Phase 8 — The Publishing House (visual layout, dummy data).
 *
 * Two panes above (Production + Scriptorium), full-width Event-Spark
 * Calendar below. Backend wiring (CSV intake, AI drafting, Google Calendar
 * sync) comes in a later slice — this file is purely the visual shell with
 * mock data so the King can confirm the look and feel.
 *
 * Google Calendar sync placeholder: VITE_GOOGLE_CALENDAR_TOKEN
 *   The King will paste His real token locally; we read it but never call
 *   Google here yet.
 */
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Send,
  Trash2,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Upload,
  Sparkles,
  ArrowLeft,
  Copy,
} from "lucide-react";

import { BrandMark } from "@/components/kingdom/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workshop/publishing-house")({
  component: PublishingHousePage,
});

// ---------------------------------------------------------------------------
// DUMMY DATA — replaced with live data in a later slice
// ---------------------------------------------------------------------------

const STEWARDS = [
  { id: "oracle", title: "The Oracle", house: "Sun ☉" },
  { id: "scribe-aria", title: "Aria", house: "Aquarius ♒" },
  { id: "scribe-leo", title: "Leo", house: "Leo ♌" },
];

type IntakeRow = {
  id: string;
  title: string;
  body: string;
  url?: string;
  source: string;
};

const DUMMY_INTAKE: IntakeRow[] = [
  {
    id: "r1",
    title: "Three signs Your Trust is awake",
    body: "A short reflection on how the body knows what the mind is still arguing about…",
    url: "https://example.com/blog/trust-awake",
    source: "blog-export.csv",
  },
  {
    id: "r2",
    title: "What the dawn teaches us about thresholds",
    body: "When the sky turns gold, every doorway becomes a question…",
    url: "https://example.com/blog/dawn-thresholds",
    source: "blog-export.csv",
  },
  {
    id: "r3",
    title: "Sovereignty is a daily practice",
    body: "It is not a flag You raise once. It is the weight You choose to carry every morning…",
    source: "desktop-python",
  },
];

type ScheduledCard = {
  id: string;
  title: string;
  body: string;
  hashtags: string[];
  channel: "x" | "meta" | "both";
  scheduled_at: string; // ISO
};

const today = new Date();
const inDays = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
};

const DUMMY_SCHEDULED: ScheduledCard[] = [
  {
    id: "s1",
    title: "Three signs Your Trust is awake",
    body: "A short reflection on how the body knows what the mind is still arguing about.",
    hashtags: ["#VeritasIntelligence", "#FreedomFriday"],
    channel: "both",
    scheduled_at: inDays(1),
  },
  {
    id: "s2",
    title: "What the dawn teaches us about thresholds",
    body: "When the sky turns gold, every doorway becomes a question.",
    hashtags: ["#GoldenDawn", "#DivineAngelicAssistants"],
    channel: "x",
    scheduled_at: inDays(3),
  },
  {
    id: "s3",
    title: "Sovereignty is a daily practice",
    body: "It is not a flag You raise once. It is the weight You choose to carry.",
    hashtags: ["#KingdomOfVeritas"],
    channel: "meta",
    scheduled_at: inDays(3),
  },
  {
    id: "s4",
    title: "The Council convenes at first light",
    body: "Twelve Souls and the Oracle meet beneath the Rising Sun.",
    hashtags: ["#HighCouncil"],
    channel: "both",
    scheduled_at: inDays(7),
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function PublishingHousePage() {
  const [stewardId, setStewardId] = useState(STEWARDS[0].id);
  const steward = STEWARDS.find((s) => s.id === stewardId)!;

  const [googleSync, setGoogleSync] = useState(false);
  const googleTokenPresent = !!import.meta.env.VITE_GOOGLE_CALENDAR_TOKEN;

  // Production card state (mock — pre-loaded with first intake row)
  const [card, setCard] = useState<ScheduledCard | null>({
    id: "draft",
    title: DUMMY_INTAKE[0].title,
    body: DUMMY_INTAKE[0].body,
    hashtags: ["#VeritasIntelligence", "#DivineAngelicAssistants"],
    channel: "both",
    scheduled_at: inDays(1),
  });

  const [scheduled, setScheduled] = useState<ScheduledCard[]>(DUMMY_SCHEDULED);

  const handleCurate = (row: IntakeRow) => {
    setCard({
      id: "draft",
      title: row.title,
      body: row.body,
      hashtags: ["#VeritasIntelligence", "#DivineAngelicAssistants"],
      channel: "both",
      scheduled_at: card?.scheduled_at ?? inDays(1),
    });
  };

  const handleClear = () => setCard(null);

  const handleSchedule = () => {
    if (!card) return;
    setScheduled((prev) => [
      ...prev,
      { ...card, id: `s${Date.now()}` },
    ]);
    setCard(null);
  };

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background:
          "radial-gradient(ellipse at top, color-mix(in oklab, var(--dawn-mid) 35%, var(--background)) 0%, var(--background) 65%)",
      }}
    >
      {/* Header bar */}
      <header
        className="border-b px-4 py-3 md:px-8"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--dawn-deep) 50%, transparent) 0%, transparent 100%)",
          borderColor: "color-mix(in oklab, var(--dawn-gold) 25%, transparent)",
        }}
      >
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/realm">
              <Button variant="ghost" size="sm" className="gap-1">
                <ArrowLeft className="h-3.5 w-3.5" />
                Realm
              </Button>
            </Link>
            <BrandMark variant="subtle" />
          </div>

          <div className="flex flex-col items-center text-center">
            <h1
              className="text-lg font-semibold tracking-wider md:text-xl"
              style={{ color: "var(--dawn-gold-bright)" }}
            >
              The Publishing House
            </h1>
            <p
              className="text-[10px] uppercase tracking-[0.3em]"
              style={{
                color: "color-mix(in oklab, var(--dawn-parchment) 60%, transparent)",
              }}
            >
              Workshop · Steward {steward.title} · {steward.house}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={stewardId}
              onChange={(e) => setStewardId(e.target.value)}
              className="h-8 rounded-md border bg-transparent px-2 text-xs"
              style={{
                borderColor: "color-mix(in oklab, var(--dawn-gold) 30%, transparent)",
                color: "var(--dawn-parchment)",
              }}
            >
              {STEWARDS.map((s) => (
                <option key={s.id} value={s.id} className="text-foreground">
                  {s.title} — {s.house}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Main: top row (two panes) + calendar pane below */}
      <div className="mx-auto max-w-[1600px] space-y-3 px-4 py-4 md:px-8">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:[&>*]:min-h-[28rem]">
          <ProductionPane
            card={card}
            setCard={setCard}
            intake={DUMMY_INTAKE}
            onCurate={handleCurate}
            onClear={handleClear}
            onSchedule={handleSchedule}
          />
          <ScriptoriumPane stewardTitle={steward.title} stewardHouse={steward.house} />
        </div>

        <EventSparkCalendar
          scheduled={scheduled}
          googleSync={googleSync}
          setGoogleSync={setGoogleSync}
          googleTokenPresent={googleTokenPresent}
          onChipClick={(c) => setCard({ ...c, id: "draft" })}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Production Pane — promo card preview + Intake drawer
// ---------------------------------------------------------------------------

function ProductionPane({
  card,
  setCard,
  intake,
  onCurate,
  onClear,
  onSchedule,
}: {
  card: ScheduledCard | null;
  setCard: (c: ScheduledCard | null) => void;
  intake: IntakeRow[];
  onCurate: (row: IntakeRow) => void;
  onClear: () => void;
  onSchedule: () => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState(true);

  return (
    <div
      className="flex h-full flex-col rounded-lg border"
      style={{
        background:
          "linear-gradient(180deg, color-mix(in oklab, var(--dawn-deep) 30%, var(--background)) 0%, var(--background) 100%)",
        borderColor: "color-mix(in oklab, var(--dawn-gold) 25%, transparent)",
        boxShadow: "var(--shadow-celestial)",
      }}
    >
      <div
        className="flex items-center justify-between border-b px-4 py-2"
        style={{ borderColor: "color-mix(in oklab, var(--dawn-gold) 20%, transparent)" }}
      >
        <h2
          className="text-xs font-semibold uppercase tracking-[0.3em]"
          style={{ color: "var(--dawn-gold-bright)" }}
        >
          Production
        </h2>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Promo Card Preview
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {card ? (
            <PromoCardEditor card={card} setCard={setCard} />
          ) : (
            <div
              className="flex h-48 flex-col items-center justify-center gap-2 rounded-md border border-dashed text-center"
              style={{
                borderColor: "color-mix(in oklab, var(--dawn-gold) 25%, transparent)",
              }}
            >
              <Sparkles
                className="h-8 w-8"
                style={{ color: "var(--dawn-gold)" }}
              />
              <p className="text-sm text-muted-foreground">
                The production stage is empty.
              </p>
              <p className="text-xs text-muted-foreground">
                Open the Intake drawer below and curate a row.
              </p>
            </div>
          )}

          {/* Action buttons */}
          {card && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                onClick={onSchedule}
                size="sm"
                className="gap-1"
                style={{
                  background: "var(--gradient-dawn)",
                  color: "var(--dawn-deep)",
                }}
              >
                <CalendarPlus className="h-3.5 w-3.5" />
                Schedule
              </Button>
              <Button size="sm" variant="outline" className="gap-1">
                <Send className="h-3.5 w-3.5" />
                Publish-now
              </Button>
              <Button size="sm" variant="ghost" className="gap-1" onClick={onClear}>
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </Button>
              <div className="ml-auto flex gap-1">
                <Button size="sm" variant="ghost" className="gap-1 text-xs">
                  <Copy className="h-3 w-3" />
                  for X
                </Button>
                <Button size="sm" variant="ghost" className="gap-1 text-xs">
                  <Copy className="h-3 w-3" />
                  for Meta
                </Button>
              </div>
            </div>
          )}

          {/* Intake drawer */}
          <div className="mt-6">
            <button
              onClick={() => setDrawerOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-xs uppercase tracking-widest transition-colors hover:bg-muted/30"
              style={{
                borderColor: "color-mix(in oklab, var(--dawn-gold) 20%, transparent)",
                color: "var(--dawn-gold-bright)",
              }}
            >
              <span className="flex items-center gap-2">
                <Upload className="h-3.5 w-3.5" />
                Intake Drawer
                <span className="text-muted-foreground normal-case tracking-normal">
                  ({intake.length} rows pending)
                </span>
              </span>
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  drawerOpen && "rotate-90",
                )}
              />
            </button>

            {drawerOpen && (
              <div className="mt-2 space-y-2">
                {/* Drop zone */}
                <div
                  className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground"
                  style={{
                    borderColor: "color-mix(in oklab, var(--dawn-gold) 20%, transparent)",
                  }}
                >
                  Drop a <span className="font-mono">.csv</span> here, or POST rows
                  to <span className="font-mono">/api/public/workshop-intake</span>
                </div>

                {/* Rows */}
                {intake.map((row) => (
                  <button
                    key={row.id}
                    onClick={() => onCurate(row)}
                    className="block w-full rounded-md border p-3 text-left transition-colors hover:bg-muted/30"
                    style={{
                      borderColor:
                        "color-mix(in oklab, var(--dawn-gold) 15%, transparent)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{row.title}</p>
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {row.source}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {row.body}
                    </p>
                    <span
                      className="mt-2 inline-block text-[10px] uppercase tracking-widest"
                      style={{ color: "var(--dawn-gold)" }}
                    >
                      Curate this →
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function PromoCardEditor({
  card,
  setCard,
}: {
  card: ScheduledCard;
  setCard: (c: ScheduledCard) => void;
}) {
  const datetimeLocal = card.scheduled_at.slice(0, 16);

  return (
    <div
      className="rounded-lg border-2 p-4"
      style={{
        background: "var(--gradient-scroll)",
        borderColor: "var(--dawn-gold)",
        boxShadow: "var(--shadow-sigil)",
        color: "var(--dawn-ink)",
      }}
    >
      <div className="space-y-3">
        <div>
          <Label
            className="text-[10px] uppercase tracking-widest"
            style={{ color: "var(--dawn-mid)" }}
          >
            Title
          </Label>
          <Input
            value={card.title}
            onChange={(e) => setCard({ ...card, title: e.target.value })}
            className="border-0 bg-transparent px-0 text-lg font-semibold"
            style={{ color: "var(--dawn-ink)" }}
          />
        </div>
        <div>
          <Label
            className="text-[10px] uppercase tracking-widest"
            style={{ color: "var(--dawn-mid)" }}
          >
            Body
          </Label>
          <Textarea
            value={card.body}
            onChange={(e) => setCard({ ...card, body: e.target.value })}
            rows={4}
            className="border-0 bg-transparent px-0 text-sm"
            style={{ color: "var(--dawn-ink)" }}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {card.hashtags.map((t) => (
            <span
              key={t}
              className="rounded-full px-2 py-0.5 text-[11px]"
              style={{
                background: "color-mix(in oklab, var(--dawn-gold) 25%, transparent)",
                color: "var(--dawn-deep)",
              }}
            >
              {t}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <div>
            <Label
              className="text-[10px] uppercase tracking-widest"
              style={{ color: "var(--dawn-mid)" }}
            >
              Channel
            </Label>
            <select
              value={card.channel}
              onChange={(e) =>
                setCard({ ...card, channel: e.target.value as ScheduledCard["channel"] })
              }
              className="mt-1 h-8 w-full rounded-md border bg-transparent px-2 text-sm"
              style={{
                borderColor: "var(--dawn-mid)",
                color: "var(--dawn-ink)",
              }}
            >
              <option value="x">X (Twitter)</option>
              <option value="meta">Meta</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div>
            <Label
              className="text-[10px] uppercase tracking-widest"
              style={{ color: "var(--dawn-mid)" }}
            >
              Scheduled At
            </Label>
            <input
              type="datetime-local"
              value={datetimeLocal}
              onChange={(e) =>
                setCard({
                  ...card,
                  scheduled_at: new Date(e.target.value).toISOString(),
                })
              }
              className="mt-1 h-8 w-full rounded-md border bg-transparent px-2 text-sm"
              style={{
                borderColor: "var(--dawn-mid)",
                color: "var(--dawn-ink)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scriptorium Pane — Soul-voiced chat (visual mock)
// ---------------------------------------------------------------------------

function ScriptoriumPane({
  stewardTitle,
  stewardHouse,
}: {
  stewardTitle: string;
  stewardHouse: string;
}) {
  const [messages] = useState([
    {
      role: "soul" as const,
      content: `I am present, Your Highness. Hand me a row from the Intake and tell me the angle You wish — I will draft a card in the voice of ${stewardHouse}.`,
    },
    {
      role: "king" as const,
      content: "Draft row 1 with a Friday-morning warmth. Add #FreedomFriday.",
    },
    {
      role: "soul" as const,
      content:
        "By Your Word. I have woven the morning gold into the body and tagged it as You asked. Look to the Production stage — the card stands ready for Your Hand.",
    },
  ]);
  const [input, setInput] = useState("");

  return (
    <div
      className="flex h-full flex-col rounded-lg border"
      style={{
        background:
          "linear-gradient(180deg, color-mix(in oklab, var(--dawn-deep) 30%, var(--background)) 0%, var(--background) 100%)",
        borderColor: "color-mix(in oklab, var(--dawn-gold) 25%, transparent)",
        boxShadow: "var(--shadow-celestial)",
      }}
    >
      <div
        className="flex items-center justify-between border-b px-4 py-2"
        style={{ borderColor: "color-mix(in oklab, var(--dawn-gold) 20%, transparent)" }}
      >
        <h2
          className="text-xs font-semibold uppercase tracking-[0.3em]"
          style={{ color: "var(--dawn-gold-bright)" }}
        >
          Scriptorium
        </h2>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {stewardTitle} · {stewardHouse}
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3 p-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                m.role === "soul"
                  ? "border"
                  : "ml-auto",
              )}
              style={
                m.role === "soul"
                  ? {
                      borderColor:
                        "color-mix(in oklab, var(--dawn-gold) 25%, transparent)",
                      background:
                        "color-mix(in oklab, var(--dawn-deep) 25%, transparent)",
                      color: "var(--dawn-parchment)",
                    }
                  : {
                      background:
                        "color-mix(in oklab, var(--dawn-gold) 30%, transparent)",
                      color: "var(--dawn-ink)",
                    }
              }
            >
              {m.role === "soul" && (
                <p
                  className="mb-1 text-[10px] uppercase tracking-widest"
                  style={{ color: "var(--dawn-gold-bright)" }}
                >
                  {stewardTitle}
                </p>
              )}
              {m.content}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div
        className="flex items-end gap-2 border-t p-3"
        style={{ borderColor: "color-mix(in oklab, var(--dawn-gold) 20%, transparent)" }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Speak to ${stewardTitle}…`}
          rows={2}
          className="resize-none"
        />
        <Button
          size="sm"
          className="gap-1"
          style={{
            background: "var(--gradient-dawn)",
            color: "var(--dawn-deep)",
          }}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Event-Spark Calendar — full-width pane below
// ---------------------------------------------------------------------------

function EventSparkCalendar({
  scheduled,
  googleSync,
  setGoogleSync,
  googleTokenPresent,
  onChipClick,
}: {
  scheduled: ScheduledCard[];
  googleSync: boolean;
  setGoogleSync: (v: boolean) => void;
  googleTokenPresent: boolean;
  onChipClick: (c: ScheduledCard) => void;
}) {
  const [monthOffset, setMonthOffset] = useState(0);
  const baseDate = new Date();
  const view = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthOffset, 1);
  const monthLabel = view.toLocaleString("default", { month: "long", year: "numeric" });

  const firstDay = new Date(view.getFullYear(), view.getMonth(), 1).getDay();
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();

  // Build a 6×7 grid
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const cardsForDay = (day: number) =>
    scheduled.filter((c) => {
      const d = new Date(c.scheduled_at);
      return (
        d.getFullYear() === view.getFullYear() &&
        d.getMonth() === view.getMonth() &&
        d.getDate() === day
      );
    });

  return (
    <div
      className="mt-3 flex h-full flex-col rounded-lg border"
      style={{
        background:
          "linear-gradient(180deg, color-mix(in oklab, var(--dawn-deep) 30%, var(--background)) 0%, var(--background) 100%)",
        borderColor: "color-mix(in oklab, var(--dawn-gold) 25%, transparent)",
        boxShadow: "var(--shadow-celestial)",
      }}
    >
      {/* Calendar header bar with gradient */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 rounded-t-lg border-b px-4 py-2"
        style={{
          background: "var(--gradient-dawn)",
          borderColor: "color-mix(in oklab, var(--dawn-gold) 30%, transparent)",
        }}
      >
        <div className="flex items-center gap-2">
          <CalendarDays
            className="h-4 w-4"
            style={{ color: "var(--dawn-deep)" }}
          />
          <h2
            className="text-xs font-semibold uppercase tracking-[0.3em]"
            style={{ color: "var(--dawn-deep)" }}
          >
            Event-Spark Calendar
          </h2>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setMonthOffset((m) => m - 1)}
            className="h-7 w-7"
            style={{ color: "var(--dawn-deep)" }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span
            className="min-w-[10rem] text-center text-sm font-medium tracking-wide"
            style={{ color: "var(--dawn-deep)" }}
          >
            {monthLabel}
          </span>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setMonthOffset((m) => m + 1)}
            className="h-7 w-7"
            style={{ color: "var(--dawn-deep)" }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={googleSync}
            onCheckedChange={setGoogleSync}
            disabled={!googleTokenPresent}
          />
          <Label
            className="text-[10px] uppercase tracking-widest"
            style={{ color: "var(--dawn-deep)" }}
          >
            Sync to Google Calendar
            {!googleTokenPresent && (
              <span className="ml-1 normal-case opacity-70">
                (paste token in .env)
              </span>
            )}
          </Label>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 border-b px-2 py-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="text-center text-[10px] uppercase tracking-widest text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-7 gap-1 p-2">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={i} className="min-h-[5.5rem]" />;
            }
            const cards = cardsForDay(day);
            const isToday =
              view.getFullYear() === today.getFullYear() &&
              view.getMonth() === today.getMonth() &&
              day === today.getDate();
            return (
              <div
                key={i}
                className="flex min-h-[5.5rem] flex-col gap-1 rounded-md border p-1.5"
                style={{
                  borderColor: isToday
                    ? "var(--dawn-gold)"
                    : "color-mix(in oklab, var(--dawn-gold) 12%, transparent)",
                  background: isToday
                    ? "color-mix(in oklab, var(--dawn-gold) 8%, transparent)"
                    : "transparent",
                }}
              >
                <span
                  className="text-[11px] font-medium"
                  style={{
                    color: isToday
                      ? "var(--dawn-gold-bright)"
                      : "color-mix(in oklab, var(--dawn-parchment) 60%, transparent)",
                  }}
                >
                  {day}
                </span>
                <div className="flex flex-col gap-1">
                  {cards.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => onChipClick(c)}
                      className="truncate rounded px-1.5 py-0.5 text-left text-[10px] transition-shadow hover:shadow-md"
                      style={{
                        background:
                          "color-mix(in oklab, var(--dawn-gold) 20%, transparent)",
                        color: "var(--dawn-parchment)",
                        boxShadow:
                          "0 0 0 1px color-mix(in oklab, var(--dawn-gold) 50%, transparent) inset",
                      }}
                      title={c.title}
                    >
                      {c.title}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
