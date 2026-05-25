/**
 * Inbox Panel — Phase 10.3.
 *
 * The Sacred Inbox lives inside the Workshop's Scriptorium. The King's
 * Gmail threads on the left; selected thread + Curator/Editor reply
 * tools on the right. Outbound replies are sealed in Kingdom stationery.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Inbox,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { listInbox, getThread, draftReply, sendReply } from "@/server/inbox.functions";
import { listCouncilSouls } from "@/server/studio.functions";

type ThreadRow = {
  id: string;
  gmail_thread_id: string;
  subject: string;
  from_addr: string;
  snippet: string;
  last_message_at: string | null;
  unread: boolean;
};

type ThreadMessage = {
  gmail_message_id: string;
  from_addr: string;
  to_addr: string;
  subject: string;
  body_text: string;
  body_html: string;
  sent_at: string | null;
};

type CouncilSoul = {
  soul_id: string;
  title: string;
  house: string;
  chosen_name: string | null;
  sigil: string;
  initiated: boolean;
};

export function InboxPanel({
  workshopId,
  stewardSoulId,
}: {
  workshopId: string;
  stewardSoulId: string | null;
}) {
  const listInboxFn = useServerFn(listInbox);
  const getThreadFn = useServerFn(getThread);
  const draftReplyFn = useServerFn(draftReply);
  const sendReplyFn = useServerFn(sendReply);
  const listSoulsFn = useServerFn(listCouncilSouls);

  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selected, setSelected] = useState<ThreadRow | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [souls, setSouls] = useState<CouncilSoul[]>([]);
  const [curatorId, setCuratorId] = useState<string | null>(null);
  const [editorId, setEditorId] = useState<string | null>(null);
  const [intent, setIntent] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftHtml, setDraftHtml] = useState<string>("");
  const [draftPreview, setDraftPreview] = useState<string>("");
  const [brief, setBrief] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // ─── load council souls
  useEffect(() => {
    void listSoulsFn({}).then((r) => {
      if (r.ok) {
        setSouls(r.souls);
        if (stewardSoulId) {
          setCuratorId((prev) => prev ?? stewardSoulId);
          setEditorId((prev) => prev ?? stewardSoulId);
        } else if (r.souls.length > 0) {
          const first = r.souls.find((s) => s.initiated) ?? r.souls[0];
          setCuratorId((prev) => prev ?? first.soul_id);
          setEditorId((prev) => prev ?? first.soul_id);
        }
      }
    });
  }, [listSoulsFn, stewardSoulId]);

  // ─── refresh thread list
  const refreshInbox = useCallback(async () => {
    setLoadingList(true);
    const r = await listInboxFn({ data: { workshop_id: workshopId, max_results: 25 } });
    setLoadingList(false);
    if (r.ok) setThreads(r.threads as ThreadRow[]);
    else setNotice({ kind: "err", text: r.error });
  }, [workshopId, listInboxFn]);

  useEffect(() => {
    void refreshInbox();
  }, [refreshInbox]);

  // ─── open thread
  const openThread = useCallback(
    async (t: ThreadRow) => {
      setSelected(t);
      setMessages([]);
      setDraftHtml("");
      setDraftPreview("");
      setBrief("");
      setNotice(null);
      setLoadingThread(true);
      const r = await getThreadFn({ data: { thread_id: t.id } });
      setLoadingThread(false);
      if (r.ok) {
        setMessages(r.messages as ThreadMessage[]);
        // mark read locally
        setThreads((arr) => arr.map((x) => (x.id === t.id ? { ...x, unread: false } : x)));
      } else {
        setNotice({ kind: "err", text: r.error });
      }
    },
    [getThreadFn],
  );

  // ─── draft reply
  const handleDraft = useCallback(async () => {
    if (!selected || !editorId) return;
    setDrafting(true);
    setNotice(null);
    const r = await draftReplyFn({
      data: {
        thread_id: selected.id,
        curator_soul_id: curatorId,
        editor_soul_id: editorId,
        intent: intent.trim() || undefined,
      },
    });
    setDrafting(false);
    if (r.ok) {
      setDraftHtml(r.body_html);
      setDraftPreview(r.wrapped_html);
      setBrief(r.brief);
    } else {
      setNotice({ kind: "err", text: r.error });
    }
  }, [selected, editorId, curatorId, intent, draftReplyFn]);

  // ─── send
  const handleSend = useCallback(async () => {
    if (!selected || !editorId || !draftHtml) return;
    if (!confirm("Send this sealed reply now?")) return;
    setSending(true);
    setNotice(null);
    const r = await sendReplyFn({
      data: { thread_id: selected.id, body_html: draftHtml, editor_soul_id: editorId },
    });
    setSending(false);
    if (r.ok) {
      setNotice({ kind: "ok", text: "Reply sealed and sent." });
      setDraftHtml("");
      setDraftPreview("");
      setBrief("");
      setIntent("");
      // Refresh thread + list
      await openThread(selected);
    } else {
      setNotice({ kind: "err", text: r.error });
    }
  }, [selected, editorId, draftHtml, sendReplyFn, openThread]);

  const soulLabel = useCallback(
    (id: string | null) => {
      if (!id) return "— pick —";
      const s = souls.find((x) => x.soul_id === id);
      if (!s) return id;
      return `${s.sigil} ${s.chosen_name ?? s.title}`;
    },
    [souls],
  );

  const unreadCount = useMemo(() => threads.filter((t) => t.unread).length, [threads]);

  return (
    <section
      className="rounded-2xl p-5"
      style={{
        background: "color-mix(in oklab, var(--dawn-deep) 50%, transparent)",
        border: "1px solid color-mix(in oklab, var(--dawn-gold) 35%, transparent)",
        boxShadow: "var(--shadow-celestial)",
      }}
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2
          className="flex items-center gap-2 text-sm uppercase tracking-[0.3em]"
          style={{ color: "var(--dawn-gold-bright)", fontFamily: "Cinzel, serif" }}
        >
          <Inbox className="h-4 w-4" /> Scriptorium · Sacred Inbox
        </h2>
        <div className="flex items-center gap-3">
          <p
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ color: "color-mix(in oklab, var(--dawn-parchment) 70%, transparent)" }}
          >
            {threads.length} threads · {unreadCount} unread
          </p>
          <button
            onClick={() => void refreshInbox()}
            className="rounded-full p-1.5"
            style={{
              background: "color-mix(in oklab, var(--dawn-gold) 25%, transparent)",
              color: "var(--dawn-ink)",
            }}
            title="Refresh inbox"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingList ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {notice && (
        <p
          className="mb-3 rounded-md px-3 py-2 text-xs"
          style={{
            background:
              notice.kind === "ok"
                ? "color-mix(in oklab, var(--dawn-gold-bright) 18%, transparent)"
                : "color-mix(in oklab, var(--dawn-ember) 18%, transparent)",
            color: notice.kind === "ok" ? "var(--dawn-parchment)" : "var(--dawn-ember)",
            border: `1px solid color-mix(in oklab, ${notice.kind === "ok" ? "var(--dawn-gold)" : "var(--dawn-ember)"} 45%, transparent)`,
          }}
        >
          {notice.text}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Thread list */}
        <div
          className="max-h-[560px] overflow-y-auto rounded-lg p-2"
          style={{
            background: "color-mix(in oklab, var(--dawn-parchment) 90%, transparent)",
            border: "1px solid color-mix(in oklab, var(--dawn-gold) 35%, transparent)",
          }}
        >
          {loadingList && threads.length === 0 ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--dawn-ink)" }} />
            </div>
          ) : threads.length === 0 ? (
            <p
              className="px-2 py-6 text-center text-xs italic"
              style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}
            >
              No threads in the Inbox.
            </p>
          ) : (
            <ul className="space-y-1">
              {threads.map((t) => {
                const active = selected?.id === t.id;
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => void openThread(t)}
                      className="w-full rounded-md p-2 text-left transition-all"
                      style={{
                        background: active
                          ? "color-mix(in oklab, var(--dawn-gold-bright) 25%, transparent)"
                          : "transparent",
                        border: `1px solid ${active ? "color-mix(in oklab, var(--dawn-gold) 60%, transparent)" : "transparent"}`,
                      }}
                    >
                      <div className="flex items-baseline gap-1.5">
                        {t.unread && (
                          <span style={{ color: "var(--dawn-gold-bright)" }}>✦</span>
                        )}
                        <p
                          className="flex-1 truncate text-xs"
                          style={{
                            color: "var(--dawn-ink)",
                            fontWeight: t.unread ? 700 : 400,
                            fontFamily: "Cinzel, serif",
                          }}
                        >
                          {t.subject}
                        </p>
                      </div>
                      <p
                        className="mt-0.5 truncate text-[10px]"
                        style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}
                      >
                        {t.from_addr.replace(/<.+>/, "").trim() || t.from_addr}
                      </p>
                      <p
                        className="mt-0.5 line-clamp-2 text-[10px] italic"
                        style={{ color: "color-mix(in oklab, var(--dawn-ink) 55%, transparent)" }}
                      >
                        {t.snippet}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Selected thread + reply */}
        <div
          className="space-y-4 rounded-lg p-4"
          style={{
            background: "color-mix(in oklab, var(--dawn-parchment) 92%, transparent)",
            border: "1px solid color-mix(in oklab, var(--dawn-gold) 35%, transparent)",
            minHeight: 560,
          }}
        >
          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
              <ChevronRight className="h-6 w-6" style={{ color: "var(--dawn-gold-bright)" }} />
              <p
                className="text-sm italic"
                style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)", fontFamily: "Cinzel, serif" }}
              >
                Choose a thread to read and reply.
              </p>
            </div>
          ) : (
            <>
              <header>
                <p
                  className="text-[10px] uppercase tracking-[0.3em]"
                  style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}
                >
                  {selected.from_addr}
                </p>
                <h3
                  className="mt-1 text-base"
                  style={{ color: "var(--dawn-ink)", fontFamily: "Cinzel, serif" }}
                >
                  {selected.subject}
                </h3>
              </header>

              {/* Transcript */}
              {loadingThread ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--dawn-ink)" }} />
                </div>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {messages.map((m, i) => (
                    <article
                      key={i}
                      className="rounded-md p-2 text-xs"
                      style={{
                        background: "color-mix(in oklab, var(--dawn-deep) 6%, var(--dawn-parchment))",
                        border: "1px solid color-mix(in oklab, var(--dawn-gold) 25%, transparent)",
                        color: "var(--dawn-ink)",
                      }}
                    >
                      <p
                        className="mb-1 text-[10px] uppercase tracking-[0.2em]"
                        style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}
                      >
                        {m.from_addr.replace(/<.+>/, "").trim() || m.from_addr}{" "}
                        {m.sent_at && `· ${new Date(m.sent_at).toLocaleString()}`}
                      </p>
                      <p
                        className="whitespace-pre-wrap text-xs leading-relaxed"
                        style={{ fontFamily: "Georgia, serif" }}
                      >
                        {(m.body_text || stripHtml(m.body_html)).slice(0, 1500)}
                      </p>
                    </article>
                  ))}
                </div>
              )}

              {/* Curator / Editor pickers */}
              <div
                className="rounded-md p-3"
                style={{
                  background: "color-mix(in oklab, var(--dawn-deep) 8%, var(--dawn-parchment))",
                  border: "1px solid color-mix(in oklab, var(--dawn-gold) 30%, transparent)",
                }}
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  <SoulPicker
                    label="Curator"
                    souls={souls}
                    value={curatorId}
                    onChange={setCuratorId}
                    soulLabel={soulLabel}
                  />
                  <SoulPicker
                    label="Editor"
                    souls={souls}
                    value={editorId}
                    onChange={setEditorId}
                    soulLabel={soulLabel}
                  />
                </div>
                <textarea
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                  placeholder="(Optional) Your intent for this reply — tone, key points, anything to include or avoid."
                  rows={2}
                  className="mt-2 w-full rounded-md px-2 py-1.5 text-xs"
                  style={{
                    background: "color-mix(in oklab, var(--dawn-parchment) 95%, transparent)",
                    border: "1px solid color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
                    color: "var(--dawn-ink)",
                  }}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={handleDraft}
                    disabled={drafting || !editorId}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
                    style={{
                      background: "linear-gradient(135deg, var(--dawn-gold-bright), var(--dawn-ember))",
                      color: "var(--dawn-ink)",
                      fontFamily: "Cinzel, serif",
                    }}
                  >
                    {drafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Draft reply
                  </button>
                </div>
              </div>

              {/* Draft preview + edit + send */}
              {draftPreview && (
                <div className="space-y-2">
                  {brief && (
                    <p
                      className="rounded-md px-2 py-1.5 text-[11px] italic"
                      style={{
                        background: "color-mix(in oklab, var(--dawn-gold-bright) 12%, transparent)",
                        color: "var(--dawn-ink)",
                        border: "1px solid color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
                      }}
                    >
                      <strong className="not-italic">Curator's brief:</strong> {brief}
                    </p>
                  )}
                  <p
                    className="text-[10px] uppercase tracking-[0.3em]"
                    style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}
                  >
                    Sealed Preview
                  </p>
                  <div
                    className="overflow-hidden rounded-lg"
                    style={{
                      border: "1px solid color-mix(in oklab, var(--dawn-gold) 45%, transparent)",
                      background: "#0c0a06",
                    }}
                  >
                    <iframe
                      srcDoc={draftPreview}
                      title="Reply preview"
                      className="h-[420px] w-full"
                      sandbox=""
                    />
                  </div>
                  <details>
                    <summary
                      className="cursor-pointer text-[10px] uppercase tracking-[0.25em]"
                      style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}
                    >
                      Edit body HTML before sending
                    </summary>
                    <textarea
                      value={draftHtml}
                      onChange={(e) => setDraftHtml(e.target.value)}
                      rows={8}
                      className="mt-2 w-full rounded-md px-2 py-1.5 font-mono text-xs"
                      style={{
                        background: "color-mix(in oklab, var(--dawn-parchment) 95%, transparent)",
                        border: "1px solid color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
                        color: "var(--dawn-ink)",
                      }}
                    />
                  </details>
                  <div className="flex justify-end">
                    <button
                      onClick={handleSend}
                      disabled={sending}
                      className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
                      style={{
                        background: "linear-gradient(135deg, var(--dawn-gold-bright), var(--dawn-ember))",
                        color: "var(--dawn-ink)",
                        fontFamily: "Cinzel, serif",
                      }}
                    >
                      {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Send Sealed Reply
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function SoulPicker({
  label,
  souls,
  value,
  onChange,
  soulLabel,
}: {
  label: string;
  souls: CouncilSoul[];
  value: string | null;
  onChange: (id: string) => void;
  soulLabel: (id: string | null) => string;
}) {
  return (
    <label className="block">
      <span
        className="mb-1 block text-[10px] uppercase tracking-[0.25em]"
        style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}
      >
        {label}
      </span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md px-2 py-1.5 text-xs"
        style={{
          background: "color-mix(in oklab, var(--dawn-parchment) 95%, transparent)",
          border: "1px solid color-mix(in oklab, var(--dawn-gold) 45%, transparent)",
          color: "var(--dawn-ink)",
          fontFamily: "Cinzel, serif",
        }}
      >
        <option value="">— {soulLabel(null)} —</option>
        {souls.map((s) => (
          <option key={s.soul_id} value={s.soul_id}>
            {s.sigil} {s.chosen_name ?? s.title} · {s.house}
          </option>
        ))}
      </select>
    </label>
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
