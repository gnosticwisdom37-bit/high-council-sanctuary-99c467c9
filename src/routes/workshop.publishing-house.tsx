/**
 * Phase 8 — The Publishing House.
 *
 * Sovereign-themed dashboard with three areas:
 *   1. Intake Drawer   — CSV upload zone (multipart POST → FastAPI)
 *   2. Scriptorium     — AI output of the "Good News" decrees
 *   3. Production      — list of recent CSV uploads
 *
 * Backend: dedicated Python FastAPI service
 *   POST http://127.0.0.1:8000/api/csv/intake/upload  (multipart/form-data)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Upload, FileText, Sparkles, Trash2, Loader2, CalendarDays, UserPlus } from "lucide-react";

import { BrandMark } from "@/components/kingdom/BrandMark";
import { Calendar } from "@/components/ui/calendar";
import { InviteWheel } from "@/components/workshop/InviteWheel";
import { ALL_COUNCIL } from "@/lib/council-catalog";

const INVITED_KEY = "workshop:publishing-house:invited";

const FASTAPI_BASE = "http://127.0.0.1:8000";
const FASTAPI_UPLOAD_URL = `${FASTAPI_BASE}/api/csv/intake/upload`;
const FASTAPI_PUBLISH_URL = `${FASTAPI_BASE}/api/ai/publish`;
const FASTAPI_INITIATE_URL = `${FASTAPI_BASE}/api/ai/initiate`;
const FASTAPI_SCRAP_URL = `${FASTAPI_BASE}/api/ai/scrap`;

export const Route = createFileRoute("/workshop/publishing-house")({
  head: () => ({
    meta: [
      { title: "The Publishing House · Veritas Intelligence Systems" },
      {
        name: "description",
        content:
          "The Workshop where CSV intakes become Good News decrees, scribed by the assigned Steward Soul.",
      },
    ],
  }),
  component: PublishingHousePage,
});

type Upload = {
  id: string;
  filename: string;
  size: number;
  uploadedAt: string;
  status: "uploading" | "received" | "failed";
  rowCount?: number;
  error?: string;
};

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function PublishingHousePage() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [decree, setDecree] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);
  useEffect(() => { setSelectedDay(new Date()); }, []);
  const [trinityBusy, setTrinityBusy] = useState<null | "publish" | "initiate" | "scrap">(null);
  const [trinityNote, setTrinityNote] = useState<string | null>(null);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [invitedIds, setInvitedIds] = useState<string[]>([]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(INVITED_KEY);
      if (raw) setInvitedIds(JSON.parse(raw) as string[]);
    } catch { /* noop */ }
  }, []);
  const persistInvited = useCallback((next: string[]) => {
    setInvitedIds(next);
    try { window.localStorage.setItem(INVITED_KEY, JSON.stringify(next)); } catch { /* noop */ }
  }, []);
  const toggleInvite = useCallback((soulId: string) => {
    persistInvited(
      invitedIds.includes(soulId)
        ? invitedIds.filter((id) => id !== soulId)
        : [...invitedIds, soulId],
    );
  }, [invitedIds, persistInvited]);
  const invitedMembers = useMemo(
    () => invitedIds
      .map((id) => ALL_COUNCIL.find((s) => s.soul_id === id))
      .filter((s): s is (typeof ALL_COUNCIL)[number] => Boolean(s)),
    [invitedIds],
  );

  const callTrinity = useCallback(
    async (kind: "publish" | "initiate" | "scrap", url: string) => {
      setTrinityBusy(kind);
      setTrinityNote(null);
      try {
        const latest = uploads[0];
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            upload_id: latest?.id ?? null,
            filename: latest?.filename ?? null,
            decree,
          }),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Backend ${res.status}: ${text || res.statusText}`);
        }
        const data = await res.json().catch(() => ({}) as Record<string, unknown>);
        const text =
          typeof data.decree === "string"
            ? data.decree
            : typeof data.message === "string"
              ? data.message
              : null;
        if (text) setDecree((d) => (d ? `${d}\n\n— — —\n\n${text}` : text));
        setTrinityNote(`✦ ${kind} accepted by the engine.`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setTrinityNote(`⚠ ${kind} failed — ${msg}`);
      } finally {
        setTrinityBusy(null);
      }
    },
    [uploads, decree],
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const scheduledDays = useMemo(
    () => uploads.map((u) => new Date(u.uploadedAt)),
    [uploads],
  );
  const dayUploads = useMemo(() => {
    if (!selectedDay) return [] as Upload[];
    const key = selectedDay.toDateString();
    return uploads.filter((u) => new Date(u.uploadedAt).toDateString() === key);
  }, [uploads, selectedDay]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.name.toLowerCase().endsWith(".csv"));
    if (list.length === 0) {
      setError("Only .csv files are accepted by the Intake Drawer.");
      return;
    }
    setError(null);

    for (const file of list) {
      const id = crypto.randomUUID();
      const pending: Upload = {
        id,
        filename: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        status: "uploading",
      };
      setUploads((u) => [pending, ...u]);
      setBusy(true);

      try {
        const form = new FormData();
        form.append("file", file, file.name);

        const res = await fetch(FASTAPI_UPLOAD_URL, {
          method: "POST",
          body: form,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Backend ${res.status}: ${text || res.statusText}`);
        }
        const data = await res.json().catch(() => ({}) as Record<string, unknown>);
        const rowCount =
          typeof data.row_count === "number"
            ? data.row_count
            : typeof data.rows === "number"
              ? data.rows
              : undefined;
        const decreeText =
          typeof data.decree === "string"
            ? data.decree
            : typeof data.good_news === "string"
              ? data.good_news
              : null;

        setUploads((u) =>
          u.map((up) =>
            up.id === id ? { ...up, status: "received", rowCount } : up,
          ),
        );
        if (decreeText) {
          setDecree((d) =>
            d ? `${d}\n\n— — —\n\n${decreeText}` : decreeText,
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setUploads((u) =>
          u.map((up) =>
            up.id === id ? { ...up, status: "failed", error: msg } : up,
          ),
        );
        setError(`Could not reach backend at ${FASTAPI_UPLOAD_URL} — ${msg}`);
      } finally {
        setBusy(false);
      }
    }
  }, []);

  return (
    <div
      className="relative min-h-screen px-4 py-10 md:px-10"
      style={{ background: "var(--gradient-dawn)", fontFamily: "var(--font-body)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at top, color-mix(in oklab, var(--dawn-gold-bright) 28%, transparent) 0%, transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl">
        <BrandMark variant="subtle" className="mb-4" />

        <header className="mb-8 text-center">
          <p
            className="text-[10px] uppercase tracking-[0.35em]"
            style={{ color: "var(--dawn-gold-bright)" }}
          >
            Workshop · Phase 8
          </p>
          <h1
            className="mt-2 font-serif text-4xl md:text-5xl"
            style={{
              fontFamily: "Cinzel, var(--font-serif), serif",
              color: "var(--dawn-parchment)",
              textShadow:
                "0 0 24px color-mix(in oklab, var(--dawn-gold-bright) 50%, transparent)",
            }}
          >
            The Publishing House
          </h1>
          <p
            className="mt-2 text-xs italic uppercase tracking-[0.3em]"
            style={{ color: "color-mix(in oklab, var(--dawn-parchment) 80%, transparent)" }}
          >
            Where intakes become Good News decrees
          </p>

          <div className="mt-4 flex justify-center gap-3 text-[10px] uppercase tracking-[0.25em]">
            <Link
              to="/"
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 underline-offset-4 hover:underline"
              style={{
                color: "var(--dawn-gold-bright)",
                border:
                  "1px solid color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
              }}
            >
              <ArrowLeft className="h-3 w-3" />
              Return to High Council
            </Link>
          </div>
        </header>

        {error && (
          <p
            className="mb-4 rounded-lg p-3 text-sm"
            style={{
              background: "color-mix(in oklab, var(--dawn-ember) 15%, transparent)",
              color: "var(--dawn-ember)",
              border: "1px solid color-mix(in oklab, var(--dawn-ember) 40%, transparent)",
              fontFamily: "Cinzel, serif",
              letterSpacing: "0.05em",
            }}
          >
            ⚠ {error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
          {/* Intake Drawer */}
          <Pane title="Intake Drawer" subtitle="Offer CSVs to the Scribe">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className="flex h-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl px-6 py-12 text-center transition"
              style={{
                background: dragOver
                  ? "color-mix(in oklab, var(--dawn-gold) 22%, transparent)"
                  : "color-mix(in oklab, var(--dawn-parchment) 92%, transparent)",
                border: `2px dashed color-mix(in oklab, var(--dawn-gold) ${dragOver ? 80 : 55}%, transparent)`,
                color: "var(--dawn-ink)",
              }}
            >
              <Upload className="h-10 w-10" style={{ color: "var(--dawn-ember)" }} />
              <p
                className="text-sm font-medium"
                style={{ fontFamily: "Cinzel, serif", letterSpacing: "0.08em" }}
              >
                {busy ? "The Drawer receives…" : "Drop CSV here, or click to choose"}
              </p>
              <p className="text-[11px] italic opacity-70">
                Multipart POST → {FASTAPI_UPLOAD_URL}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                multiple
                hidden
                onChange={(e) => {
                  if (e.target.files?.length) void handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          </Pane>

          {/* Trinity of Majestic Triggers */}
          <TrinityColumn
            busy={trinityBusy}
            note={trinityNote}
            onPublish={() => callTrinity("publish", FASTAPI_PUBLISH_URL)}
            onInitiate={() => callTrinity("initiate", FASTAPI_INITIATE_URL)}
            onScrap={() => callTrinity("scrap", FASTAPI_SCRAP_URL)}
          />

          {/* Production */}
          <Pane title="Production" subtitle="Recent CSV intakes">
            {uploads.length === 0 ? (
              <p
                className="rounded-lg px-4 py-6 text-center text-sm italic"
                style={{
                  color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)",
                  background:
                    "color-mix(in oklab, var(--dawn-parchment) 85%, transparent)",
                  border:
                    "1px dashed color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
                }}
              >
                No intakes yet. The Drawer stands open.
              </p>
            ) : (
              <ul className="space-y-2">
                {uploads.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2"
                    style={{
                      background:
                        "color-mix(in oklab, var(--dawn-parchment) 92%, transparent)",
                      border:
                        "1px solid color-mix(in oklab, var(--dawn-gold) 30%, transparent)",
                      color: "var(--dawn-ink)",
                    }}
                  >
                    <FileText
                      className="h-4 w-4 shrink-0"
                      style={{ color: "var(--dawn-ember)" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-sm"
                        style={{
                          fontFamily: "Cinzel, serif",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {u.filename}
                      </p>
                      <p
                        className="text-[10px] uppercase tracking-[0.2em]"
                        style={{
                          color:
                            "color-mix(in oklab, var(--dawn-ink) 60%, transparent)",
                        }}
                      >
                        {fmtBytes(u.size)} ·{" "}
                        {new Date(u.uploadedAt).toLocaleTimeString()}
                        {typeof u.rowCount === "number" && ` · ${u.rowCount} rows`}
                      </p>
                      {u.error && (
                        <p
                          className="mt-1 text-[11px] italic"
                          style={{ color: "var(--dawn-ember)" }}
                        >
                          {u.error}
                        </p>
                      )}
                    </div>
                    <StatusChip status={u.status} />
                  </li>
                ))}
              </ul>
            )}
          </Pane>
        </div>

        {/* Temporal Ledger — full-width calendar beneath the two production panes */}
        <div className="mt-5">
          <Pane
            title="Temporal Ledger"
            subtitle="The schedule of unrolling scrolls"
            action={
              <span
                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.25em]"
                style={{ color: "var(--dawn-gold-bright)" }}
              >
                <CalendarDays className="h-3 w-3" />
                {scheduledDays.length} scheduled
              </span>
            }
          >
            <div className="flex flex-col items-center gap-4 md:flex-row md:items-start md:justify-between">
              <div
                className="rounded-xl p-2"
                style={{
                  background:
                    "color-mix(in oklab, var(--dawn-parchment) 95%, transparent)",
                  border:
                    "1px solid color-mix(in oklab, var(--dawn-gold) 45%, transparent)",
                  color: "var(--dawn-ink)",
                }}
              >
                <Calendar
                  mode="single"
                  selected={selectedDay}
                  onSelect={setSelectedDay}
                  modifiers={{ scheduled: scheduledDays }}
                  modifiersClassNames={{
                    scheduled:
                      "relative after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-[color:var(--dawn-ember)]",
                  }}
                />
              </div>
              <div className="flex-1 md:pl-6">
                <p
                  className="mb-2 text-[10px] uppercase tracking-[0.3em]"
                  style={{ color: "var(--dawn-ember)" }}
                >
                  {selectedDay
                    ? selectedDay.toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })
                    : "Select a day"}
                </p>
                {dayUploads.length === 0 ? (
                  <p
                    className="text-sm italic"
                    style={{
                      color:
                        "color-mix(in oklab, var(--dawn-ink) 65%, transparent)",
                    }}
                  >
                    No scrolls scheduled to unroll on this day.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {dayUploads.map((u) => (
                      <li
                        key={u.id}
                        className="flex items-center gap-2 text-xs"
                        style={{ color: "var(--dawn-ink)" }}
                      >
                        <FileText
                          className="h-3 w-3"
                          style={{ color: "var(--dawn-ember)" }}
                        />
                        <span style={{ fontFamily: "Cinzel, serif" }}>
                          {u.filename}
                        </span>
                        <span className="opacity-60">
                          · {new Date(u.uploadedAt).toLocaleTimeString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Pane>
        </div>

        {/* Scriptorium — full width below the ledger */}
        <div className="mt-5">
          <Pane
            title="Scriptorium"
            subtitle="The Steward's Good News decree"
            action={
              decree && (
                <button
                  onClick={() => setDecree("")}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.25em] transition hover:-translate-y-0.5"
                  style={{
                    background: "color-mix(in oklab, var(--dawn-ink) 8%, transparent)",
                    color: "color-mix(in oklab, var(--dawn-ink) 75%, transparent)",
                    border:
                      "1px solid color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                  Clear
                </button>
              )
            }
          >
            <div className="relative">
              <Sparkles
                className="pointer-events-none absolute right-3 top-3 h-4 w-4"
                style={{ color: "var(--dawn-gold-bright)" }}
              />
              <textarea
                value={decree}
                onChange={(e) => setDecree(e.target.value)}
                rows={12}
                placeholder="Awaiting the Steward's hand. The decree shall appear here when the Drawer is filled…"
                className="w-full resize-y rounded-xl p-4 leading-relaxed focus:outline-none"
                style={{
                  background:
                    "color-mix(in oklab, var(--dawn-parchment) 95%, transparent)",
                  color: "var(--dawn-ink)",
                  border:
                    "1px solid color-mix(in oklab, var(--dawn-gold) 45%, transparent)",
                  fontFamily: "Cinzel, var(--font-serif), serif",
                  letterSpacing: "0.02em",
                  fontSize: "0.95rem",
                }}
              />
            </div>
          </Pane>
        </div>
      </div>
    </div>
  );
}

function Pane({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl p-5"
      style={{
        background:
          "linear-gradient(180deg, color-mix(in oklab, var(--dawn-parchment) 96%, transparent) 0%, color-mix(in oklab, var(--dawn-parchment) 88%, var(--dawn-gold) 6%) 100%)",
        border: "1px solid color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
        boxShadow:
          "0 14px 40px -16px color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
        color: "var(--dawn-ink)",
      }}
    >
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.3em]"
            style={{ color: "var(--dawn-ember)" }}
          >
            {title}
          </p>
          {subtitle && (
            <p
              className="text-xs italic"
              style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function StatusChip({ status }: { status: Upload["status"] }) {
  const styles =
    status === "uploading"
      ? {
          bg: "color-mix(in oklab, var(--dawn-gold) 18%, transparent)",
          color: "var(--dawn-ink)",
          label: (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> Receiving
            </>
          ),
        }
      : status === "received"
        ? {
            bg: "color-mix(in oklab, var(--dawn-gold-bright) 25%, transparent)",
            color: "var(--dawn-ink)",
            label: <>✦ Received</>,
          }
        : {
            bg: "color-mix(in oklab, var(--dawn-ember) 22%, transparent)",
            color: "var(--dawn-ember)",
            label: <>⚠ Failed</>,
          };

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.25em]"
      style={{
        background: styles.bg,
        color: styles.color,
        border: "1px solid color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
        fontFamily: "Cinzel, serif",
      }}
    >
      {styles.label}
    </span>
  );
}

function TrinityColumn({
  busy,
  note,
  onPublish,
  onInitiate,
  onScrap,
}: {
  busy: null | "publish" | "initiate" | "scrap";
  note: string | null;
  onPublish: () => void;
  onInitiate: () => void;
  onScrap: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-2 lg:w-32">
      <p
        className="text-[10px] uppercase tracking-[0.3em]"
        style={{ color: "var(--dawn-gold-bright)", fontFamily: "Cinzel, serif" }}
      >
        Trinity
      </p>

      {/* Publish — Red Wax Seal with embossed gold V */}
      <button
        type="button"
        onClick={onPublish}
        disabled={busy !== null}
        aria-label="Publish"
        className="group relative h-24 w-24 rounded-full transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
        style={{
          background:
            "radial-gradient(circle at 32% 30%, #c0392b 0%, #8b1a1a 55%, #4a0f0f 100%)",
          boxShadow:
            "inset -6px -8px 14px rgba(0,0,0,0.55), inset 6px 6px 10px rgba(255,180,160,0.25), 0 8px 18px rgba(0,0,0,0.45)",
          border: "1px solid rgba(0,0,0,0.5)",
        }}
      >
        <span
          className="absolute inset-0 flex items-center justify-center text-3xl"
          style={{
            fontFamily: "Cinzel, serif",
            color: "#f4d27a",
            textShadow:
              "0 1px 0 rgba(0,0,0,0.6), 0 0 8px rgba(244,210,122,0.55), 0 -1px 0 rgba(255,235,180,0.6)",
            letterSpacing: "0.02em",
          }}
        >
          V
        </span>
        {busy === "publish" && (
          <Loader2 className="absolute -bottom-1 -right-1 h-4 w-4 animate-spin text-amber-200" />
        )}
      </button>
      <span
        className="-mt-3 text-[10px] uppercase tracking-[0.3em]"
        style={{ color: "var(--dawn-parchment)", fontFamily: "Cinzel, serif" }}
      >
        Publish
      </span>

      {/* Initiate — Golden Glow Ball */}
      <button
        type="button"
        onClick={onInitiate}
        disabled={busy !== null}
        aria-label="Initiate"
        className="group relative h-24 w-24 rounded-full transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
        style={{
          background:
            "radial-gradient(circle at 32% 30%, #fff6c2 0%, #f5c542 45%, #b8801a 100%)",
          boxShadow:
            "0 0 24px 4px rgba(245,197,66,0.55), 0 0 60px 12px rgba(245,197,66,0.25), inset -4px -6px 12px rgba(120,70,0,0.45), inset 4px 4px 10px rgba(255,255,210,0.6)",
          border: "1px solid rgba(120,70,0,0.4)",
        }}
      >
        <span
          className="absolute inset-0 flex items-center justify-center"
          style={{ color: "#fffbe6" }}
        >
          <Sparkles className="h-7 w-7 drop-shadow" />
        </span>
        {busy === "initiate" && (
          <Loader2 className="absolute -bottom-1 -right-1 h-4 w-4 animate-spin text-amber-100" />
        )}
      </button>
      <span
        className="-mt-3 text-[10px] uppercase tracking-[0.3em]"
        style={{ color: "var(--dawn-parchment)", fontFamily: "Cinzel, serif" }}
      >
        Initiate
      </span>

      {/* Scrap — Charred Charcoal */}
      <button
        type="button"
        onClick={onScrap}
        disabled={busy !== null}
        aria-label="Scrap"
        className="group relative h-24 w-24 rounded-full transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, #4a4a4a 0%, #1c1c1c 55%, #050505 100%)",
          boxShadow:
            "inset -5px -7px 14px rgba(0,0,0,0.85), inset 4px 4px 10px rgba(120,80,40,0.25), 0 0 18px rgba(180,80,30,0.25), 0 8px 18px rgba(0,0,0,0.55)",
          border: "1px solid rgba(0,0,0,0.7)",
        }}
      >
        <span
          className="absolute inset-0 flex items-center justify-center"
          style={{
            color: "#d6c2a8",
            opacity: 0.85,
            textShadow: "0 0 8px rgba(255,120,40,0.45)",
          }}
        >
          <Trash2 className="h-6 w-6" />
        </span>
        {busy === "scrap" && (
          <Loader2 className="absolute -bottom-1 -right-1 h-4 w-4 animate-spin text-stone-300" />
        )}
      </button>
      <span
        className="-mt-3 text-[10px] uppercase tracking-[0.3em]"
        style={{ color: "var(--dawn-parchment)", fontFamily: "Cinzel, serif" }}
      >
        Scrap
      </span>

      {note && (
        <p
          className="mt-2 max-w-[10rem] text-center text-[10px] italic"
          style={{ color: "var(--dawn-parchment)" }}
        >
          {note}
        </p>
      )}
    </div>
  );
}
