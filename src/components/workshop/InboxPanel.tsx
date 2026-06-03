/**
 * Inbox Panel — Phase 10.3 + 10.4 (compose, schedule, contacts).
 *
 * Sacred Inbox with full Gmail parity:
 * - Read & reply (sealed in Kingdom stationery)
 * - Compose new letters from scratch
 * - Schedule sends (now / preset / pick date+time)
 * - Contact autocomplete from history
 * - Pending-queue panel with cancel
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Inbox,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  ChevronRight,
  Pencil,
  Clock,
  X,
  CalendarClock,
  Feather,
  Mail,
  Paperclip,
  Download,
  Trash2,
  Users,
} from "lucide-react";
import {
  listInbox,
  listSentThreads,
  getThread,
  draftReply,
  sendReply,
  draftLetter,
  composeAndSend,
  scheduleEmail,
  listScheduledEmails,
  cancelScheduledEmail,
  listKnownAddresses,
  listLetterTemplates,
  getDefaultInkColor,
  getAttachment,
  trashThread,
  wrapKingsWords,
} from "@/server/inbox.functions";
import { listCouncilSouls } from "@/server/studio.functions";
import { listAddressBook, expandRecipients } from "@/server/contacts.functions";
import { CopyButton } from "@/components/ui/copy-button";
import { AddressBookPanel } from "@/components/workshop/AddressBookPanel";

// Sentinel Editor: the King speaks directly — no Soul rewriting.
const KING_SEAN_ID = "king-sean";
const KING_SEAN_SOUL: CouncilSoul = {
  soul_id: KING_SEAN_ID,
  title: "King Sean",
  house: "House von Dehn",
  chosen_name: "King Sean (Your exact words)",
  sigil: "👑",
  initiated: true,
};


type ThreadRow = {
  id: string;
  gmail_thread_id: string;
  subject: string;
  from_addr: string;
  snippet: string;
  last_message_at: string | null;
  unread: boolean;
};

type AttachmentMeta = {
  attachment_id: string;
  filename: string;
  mime_type: string;
  size: number;
};

type ThreadMessage = {
  gmail_message_id: string;
  from_addr: string;
  to_addr: string;
  subject: string;
  body_text: string;
  body_html: string;
  sent_at: string | null;
  attachments?: AttachmentMeta[];
};

type OutgoingAttachment = {
  filename: string;
  mime_type: string;
  size: number;
  data_base64: string;
};

type CouncilSoul = {
  soul_id: string;
  title: string;
  house: string;
  chosen_name: string | null;
  sigil: string;
  initiated: boolean;
};

type Contact = { addr: string; name: string; last: string };

type SentThread = {
  gmail_thread_id: string;
  subject: string;
  to_addr: string;
  snippet: string;
  last_message_at: string | null;
};

type LetterTemplate = {
  id: string;
  name: string;
  description: string;
  subject_template: string;
  body_html: string;
  accent_color: string;
  notice_header_html: string;
  system: boolean;
  sort_order: number;
};

type Folder = "inbox" | "sent" | "scheduled";

type Scheduled = {
  id: string;
  kind: string;
  thread_id: string | null;
  to_addr: string;
  subject: string;
  send_at: string;
  status: string;
  last_error: string | null;
  sent_at: string | null;
};

export function InboxPanel({
  workshopId,
  stewardSoulId,
}: {
  workshopId: string;
  stewardSoulId: string | null;
}) {
  const listInboxFn = useServerFn(listInbox);
  const listSentFn = useServerFn(listSentThreads);
  const getThreadFn = useServerFn(getThread);
  const draftReplyFn = useServerFn(draftReply);
  const sendReplyFn = useServerFn(sendReply);
  const draftLetterFn = useServerFn(draftLetter);
  const composeAndSendFn = useServerFn(composeAndSend);
  const scheduleEmailFn = useServerFn(scheduleEmail);
  const listScheduledFn = useServerFn(listScheduledEmails);
  const cancelScheduledFn = useServerFn(cancelScheduledEmail);
  const listKnownFn = useServerFn(listKnownAddresses);
  const listTemplatesFn = useServerFn(listLetterTemplates);
  const getDefaultInkFn = useServerFn(getDefaultInkColor);
  const getAttachmentFn = useServerFn(getAttachment);
  const listSoulsFn = useServerFn(listCouncilSouls);
  const trashThreadFn = useServerFn(trashThread);
  const wrapKingsWordsFn = useServerFn(wrapKingsWords);
  const listAddressBookFn = useServerFn(listAddressBook);
  const expandRecipientsFn = useServerFn(expandRecipients);


  const [folder, setFolder] = useState<Folder>("inbox");
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [sentThreads, setSentThreads] = useState<SentThread[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selected, setSelected] = useState<ThreadRow | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [souls, setSouls] = useState<CouncilSoul[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [scheduled, setScheduled] = useState<Scheduled[]>([]);
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [defaultInk, setDefaultInk] = useState<string>("#5b21b6");
  const [inkColor, setInkColor] = useState<string>("#5b21b6");
  const [noticeHeaderHtml, setNoticeHeaderHtml] = useState<string>("");
  const [curatorId, setCuratorId] = useState<string | null>(null);
  const [editorId, setEditorId] = useState<string | null>(null);
  const [intent, setIntent] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftHtml, setDraftHtml] = useState<string>("");
  const [draftPreview, setDraftPreview] = useState<string>("");
  const [brief, setBrief] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [scheduleMenuOpen, setScheduleMenuOpen] = useState(false);
  const [replyAttachments, setReplyAttachments] = useState<OutgoingAttachment[]>([]);
  const [bookOpen, setBookOpen] = useState(false);
  const [bookContacts, setBookContacts] = useState<Contact[]>([]);
  const [groupTokens, setGroupTokens] = useState<Contact[]>([]);

  const loadBook = useCallback(async () => {
    const r = await listAddressBookFn({});
    if (!r.ok) return;
    setBookContacts(
      r.contacts.map((c) => ({
        addr: c.email,
        name: c.display_name,
        last: "",
      })),
    );
    setGroupTokens(
      r.groups.map((g) => ({
        addr: `group:${g.name}`,
        name: `${g.name} — ${g.member_count} ${g.member_count === 1 ? "member" : "members"}`,
        last: "",
      })),
    );
  }, [listAddressBookFn]);

  const handleTrash = useCallback(async (t: ThreadRow) => {
    if (!confirm(`Move "${t.subject}" to Trash? Gmail keeps it 30 days, then deletes.`)) return;
    const r = await trashThreadFn({ data: { thread_id: t.id } });
    if (r.ok) {
      setThreads((arr) => arr.filter((x) => x.id !== t.id));
      if (selected?.id === t.id) { setSelected(null); setMessages([]); }
      setNotice({ kind: "ok", text: "Letter moved to Trash." });
    } else setNotice({ kind: "err", text: r.error });
  }, [trashThreadFn, selected]);


  // Download an incoming attachment: fetch base64 via server fn, build a Blob, trigger save.
  const downloadAttachment = useCallback(
    async (m: ThreadMessage, a: AttachmentMeta) => {
      try {
        const r = await getAttachmentFn({
          data: {
            gmail_message_id: m.gmail_message_id,
            attachment_id: a.attachment_id,
            filename: a.filename,
            mime_type: a.mime_type,
          },
        });
        if (!r.ok) { setNotice({ kind: "err", text: r.error }); return; }
        const bin = atob(r.data_base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: r.mime_type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url; link.download = r.filename;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (e) {
        setNotice({ kind: "err", text: e instanceof Error ? e.message : String(e) });
      }
    },
    [getAttachmentFn],
  );

  // Load souls + contacts + scheduled + templates + default ink
  useEffect(() => {
    void listSoulsFn({}).then((r) => {
      if (r.ok) {
        setSouls(r.souls);
        if (stewardSoulId) {
          setCuratorId((p) => p ?? stewardSoulId);
          setEditorId((p) => p ?? stewardSoulId);
        } else if (r.souls.length > 0) {
          const first = r.souls.find((s) => s.initiated) ?? r.souls[0];
          setCuratorId((p) => p ?? first.soul_id);
          setEditorId((p) => p ?? first.soul_id);
        }
      }
    });
    void listKnownFn({}).then((r) => { if (r.ok) setContacts(r.addresses); });
    void loadBook();
    void listScheduledFn({}).then((r) => { if (r.ok) setScheduled(r.scheduled as Scheduled[]); });
    void listTemplatesFn({}).then((r) => { if (r.ok) setTemplates(r.templates as LetterTemplate[]); });
    void getDefaultInkFn({}).then((r) => {
      if (r.ok) { setDefaultInk(r.ink_color); setInkColor(r.ink_color); }
    });
  }, [listSoulsFn, listKnownFn, loadBook, listScheduledFn, listTemplatesFn, getDefaultInkFn, stewardSoulId]);

  // Merge Gmail-history contacts + Address Book contacts + group tokens for the datalist.
  const allContacts = useMemo<Contact[]>(() => {
    const seen = new Set<string>();
    const out: Contact[] = [];
    for (const c of [...groupTokens, ...bookContacts, ...contacts]) {
      const key = c.addr.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c);
    }
    return out;
  }, [contacts, bookContacts, groupTokens]);

  const refreshScheduled = useCallback(async () => {
    const r = await listScheduledFn({});
    if (r.ok) setScheduled(r.scheduled as Scheduled[]);
  }, [listScheduledFn]);

  const refreshInbox = useCallback(async () => {
    setLoadingList(true);
    const r = await listInboxFn({ data: { workshop_id: workshopId, max_results: 25 } });
    setLoadingList(false);
    if (r.ok) setThreads(r.threads as ThreadRow[]);
    else setNotice({ kind: "err", text: r.error });
  }, [workshopId, listInboxFn]);

  const refreshSent = useCallback(async () => {
    setLoadingList(true);
    const r = await listSentFn({ data: { max_results: 25 } });
    setLoadingList(false);
    if (r.ok) setSentThreads(r.threads as SentThread[]);
    else setNotice({ kind: "err", text: r.error });
  }, [listSentFn]);

  useEffect(() => {
    if (folder === "inbox") void refreshInbox();
    else if (folder === "sent") void refreshSent();
    else if (folder === "scheduled") void refreshScheduled();
  }, [folder, refreshInbox, refreshSent, refreshScheduled]);

  const openThread = useCallback(
    async (t: ThreadRow) => {
      setSelected(t);
      setMessages([]);
      setDraftHtml(""); setDraftPreview(""); setBrief("");
      setReplyAttachments([]);
      setNotice(null);
      setLoadingThread(true);
      const r = await getThreadFn({ data: { thread_id: t.id } });
      setLoadingThread(false);
      if (r.ok) {
        setMessages(r.messages as ThreadMessage[]);
        setThreads((arr) => arr.map((x) => (x.id === t.id ? { ...x, unread: false } : x)));
      } else setNotice({ kind: "err", text: r.error });
    },
    [getThreadFn],
  );

  const handleDraft = useCallback(async () => {
    if (!selected || !editorId) return;
    setDrafting(true); setNotice(null);
    if (editorId === KING_SEAN_ID) {
      // King speaks directly — no AI rewriting. Wrap His exact words in stationery.
      const r = await wrapKingsWordsFn({
        data: {
          body_text: intent,
          ink_color: inkColor,
          notice_header_html: noticeHeaderHtml || undefined,
        },
      });
      setDrafting(false);
      if (r.ok) { setDraftHtml(r.body_html); setDraftPreview(r.wrapped_html); setBrief("King Sean's exact Words."); }
      else setNotice({ kind: "err", text: r.error });
      return;
    }
    const r = await draftReplyFn({
      data: {
        thread_id: selected.id,
        curator_soul_id: curatorId,
        editor_soul_id: editorId,
        intent: intent.trim() || undefined,
      },
    });
    setDrafting(false);
    if (r.ok) { setDraftHtml(r.body_html); setDraftPreview(r.wrapped_html); setBrief(r.brief); }
    else setNotice({ kind: "err", text: r.error });
  }, [selected, editorId, curatorId, intent, draftReplyFn, wrapKingsWordsFn, inkColor, noticeHeaderHtml]);


  const handleSend = useCallback(async () => {
    if (!selected || !editorId || !draftHtml) return;
    if (!confirm("Send this sealed reply now?")) return;
    setSending(true); setNotice(null);
    const r = await sendReplyFn({
      data: {
        thread_id: selected.id,
        body_html: draftHtml,
        editor_soul_id: editorId,
        ink_color: inkColor,
        notice_header_html: noticeHeaderHtml || undefined,
        attachments: replyAttachments.length
          ? replyAttachments.map(({ filename, mime_type, data_base64 }) => ({ filename, mime_type, data_base64 }))
          : undefined,
      },
    });
    setSending(false);
    if (r.ok) {
      setNotice({ kind: "ok", text: "Reply sealed and sent." });
      setDraftHtml(""); setDraftPreview(""); setBrief(""); setIntent(""); setNoticeHeaderHtml("");
      setReplyAttachments([]);
      await openThread(selected);
    } else setNotice({ kind: "err", text: r.error });
  }, [selected, editorId, draftHtml, inkColor, noticeHeaderHtml, replyAttachments, sendReplyFn, openThread]);

  const handleScheduleReply = useCallback(
    async (sendAtIso: string) => {
      if (!selected || !editorId || !draftHtml) return;
      const replyTo = messages.length > 0
        ? messages[messages.length - 1].from_addr
        : selected.from_addr;
      setSending(true); setNotice(null);
      const r = await scheduleEmailFn({
        data: {
          kind: "reply",
          thread_id: selected.id,
          to_addr: replyTo,
          subject: selected.subject.toLowerCase().startsWith("re:") ? selected.subject : `Re: ${selected.subject}`,
          body_html: draftHtml,
          editor_soul_id: editorId,
          send_at: sendAtIso,
          ink_color: inkColor,
          notice_header_html: noticeHeaderHtml || undefined,
        },
      });
      setSending(false);
      if (r.ok) {
        setNotice({ kind: "ok", text: `Scheduled for ${new Date(sendAtIso).toLocaleString()}.` });
        setDraftHtml(""); setDraftPreview(""); setBrief(""); setIntent(""); setNoticeHeaderHtml("");
        setScheduleMenuOpen(false);
        void refreshScheduled();
      } else setNotice({ kind: "err", text: r.error });
    },
    [selected, editorId, draftHtml, messages, inkColor, noticeHeaderHtml, scheduleEmailFn, refreshScheduled],
  );

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
  const pendingCount = useMemo(() => scheduled.filter((s) => s.status === "pending").length, [scheduled]);

  return (
    <section
      className="rounded-2xl p-5"
      style={{
        background: "color-mix(in oklab, var(--dawn-deep) 50%, transparent)",
        border: "1px solid color-mix(in oklab, var(--dawn-gold) 35%, transparent)",
        boxShadow: "var(--shadow-celestial)",
      }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2
          className="flex items-center gap-2 text-sm uppercase tracking-[0.3em]"
          style={{ color: "var(--dawn-gold-bright)", fontFamily: "Cinzel, serif" }}
        >
          <Inbox className="h-4 w-4" /> Scriptorium · Sacred Inbox
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setComposeOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.2em]"
            style={{
              background: "linear-gradient(135deg, var(--dawn-gold-bright), var(--dawn-ember))",
              color: "var(--dawn-ink)",
              fontFamily: "Cinzel, serif",
            }}
            title="Compose new letter"
          >
            <Pencil className="h-3 w-3" /> New Letter
          </button>
          <button
            onClick={() => {
              if (folder === "inbox") void refreshInbox();
              else if (folder === "sent") void refreshSent();
              else void refreshScheduled();
            }}
            className="rounded-full p-1.5"
            style={{
              background: "color-mix(in oklab, var(--dawn-gold) 25%, transparent)",
              color: "var(--dawn-ink)",
            }}
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingList ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Folder tabs */}
      <div className="mb-3 flex items-center gap-1 rounded-full p-1" style={{
        background: "color-mix(in oklab, var(--dawn-parchment) 90%, transparent)",
        border: "1px solid color-mix(in oklab, var(--dawn-gold) 35%, transparent)",
        width: "fit-content",
      }}>
        {([
          { key: "inbox" as const, label: "Inbox", icon: Inbox, count: unreadCount, countLabel: "unread" },
          { key: "sent" as const, label: "Sent", icon: Mail, count: null, countLabel: "" },
          { key: "scheduled" as const, label: "Scheduled", icon: Clock, count: pendingCount, countLabel: "pending" },
        ]).map((tab) => {
          const Icon = tab.icon;
          const active = folder === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => { setFolder(tab.key); setSelected(null); }}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] transition-all"
              style={{
                background: active
                  ? "linear-gradient(135deg, var(--dawn-gold-bright), var(--dawn-ember))"
                  : "transparent",
                color: "var(--dawn-ink)",
                fontFamily: "Cinzel, serif",
                fontWeight: active ? 600 : 400,
              }}
            >
              <Icon className="h-3 w-3" /> {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className="ml-0.5 rounded-full px-1.5 text-[9px]" style={{
                  background: active ? "color-mix(in oklab, var(--dawn-deep) 30%, transparent)" : "color-mix(in oklab, var(--dawn-gold) 30%, transparent)",
                }}>{tab.count}</span>
              )}
            </button>
          );
        })}
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

      {folder === "scheduled" && (
        <ScheduledList
          rows={scheduled}
          onCancel={async (id) => {
            const r = await cancelScheduledFn({ data: { id } });
            if (r.ok) { void refreshScheduled(); setNotice({ kind: "ok", text: "Letter cancelled." }); }
            else setNotice({ kind: "err", text: r.error });
          }}
        />
      )}

      {folder === "sent" && (
        <SentList rows={sentThreads} loading={loadingList} />
      )}

      {folder === "inbox" && (
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
                        {t.unread && <span style={{ color: "var(--dawn-gold-bright)" }}>✦</span>}
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
                Choose a thread, or compose a New Letter.
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
                <h3 className="mt-1 text-base" style={{ color: "var(--dawn-ink)", fontFamily: "Cinzel, serif" }}>
                  {selected.subject}
                </h3>
              </header>

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
                      <div className="mb-1 flex items-center gap-2">
                        <p
                          className="text-[10px] uppercase tracking-[0.2em]"
                          style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}
                        >
                          {m.from_addr.replace(/<.+>/, "").trim() || m.from_addr}{" "}
                          {m.sent_at && `· ${new Date(m.sent_at).toLocaleString()}`}
                        </p>
                        <CopyButton
                          text={m.body_text || stripHtml(m.body_html)}
                          className="ml-auto"
                        />
                      </div>
                      <p className="whitespace-pre-wrap text-xs leading-relaxed" style={{ fontFamily: "Georgia, serif" }}>
                        {(m.body_text || stripHtml(m.body_html)).slice(0, 1500)}
                      </p>
                      {m.attachments && m.attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {m.attachments.map((a) => (
                            <button
                              key={a.attachment_id}
                              onClick={() => void downloadAttachment(m, a)}
                              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px]"
                              style={{
                                background: "color-mix(in oklab, var(--dawn-gold) 22%, transparent)",
                                border: "1px solid color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
                                color: "var(--dawn-ink)",
                                fontFamily: "Georgia, serif",
                              }}
                              title={`Download ${a.filename} (${formatBytes(a.size)})`}
                            >
                              <Paperclip className="h-3 w-3" />
                              <span className="max-w-[160px] truncate">{a.filename}</span>
                              <span style={{ color: "color-mix(in oklab, var(--dawn-ink) 55%, transparent)" }}>
                                · {formatBytes(a.size)}
                              </span>
                              <Download className="h-3 w-3" />
                            </button>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}

              <div
                className="rounded-md p-3"
                style={{
                  background: "color-mix(in oklab, var(--dawn-deep) 8%, var(--dawn-parchment))",
                  border: "1px solid color-mix(in oklab, var(--dawn-gold) 30%, transparent)",
                }}
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  <SoulPicker label="Curator" souls={souls} value={curatorId} onChange={setCuratorId} soulLabel={soulLabel} />
                  <SoulPicker label="Editor" souls={[KING_SEAN_SOUL, ...souls]} value={editorId} onChange={setEditorId} soulLabel={soulLabel} />

                </div>
                <textarea
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                  placeholder={editorId === KING_SEAN_ID
                    ? "Write Your exact reply — Your Words will be sent verbatim, wrapped in Kingdom stationery. Use blank lines to separate paragraphs."
                    : "(Optional) Your intent for this reply — tone, key points, anything to include or avoid."}
                  rows={editorId === KING_SEAN_ID ? 10 : 2}
                  className="mt-2 w-full rounded-md px-2 py-1.5 text-xs"
                  style={{
                    background: "color-mix(in oklab, var(--dawn-parchment) 95%, transparent)",
                    border: "1px solid color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
                    color: "var(--dawn-ink)",
                  }}
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleDraft}
                    disabled={drafting || !editorId || (editorId === KING_SEAN_ID && !intent.trim())}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
                    style={{
                      background: "linear-gradient(135deg, var(--dawn-gold-bright), var(--dawn-ember))",
                      color: "var(--dawn-ink)",
                      fontFamily: "Cinzel, serif",
                    }}
                  >
                    {drafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {editorId === KING_SEAN_ID ? "Wrap My Words" : "Draft reply"}
                  </button>

                  <InkJar value={inkColor} onChange={setInkColor} defaultInk={defaultInk} />
                  <AttachmentPicker
                    attachments={replyAttachments}
                    onAdd={(a) => setReplyAttachments((p) => [...p, ...a])}
                    onRemove={(i) => setReplyAttachments((p) => p.filter((_, idx) => idx !== i))}
                  />
                </div>
              </div>

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
                    <iframe srcDoc={draftPreview} title="Reply preview" className="h-[420px] w-full" sandbox="" />
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
                  <div className="relative flex justify-end gap-1">
                    <button
                      onClick={handleSend}
                      disabled={sending}
                      className="inline-flex items-center gap-1.5 rounded-l-full px-4 py-2 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
                      style={{
                        background: "linear-gradient(135deg, var(--dawn-gold-bright), var(--dawn-ember))",
                        color: "var(--dawn-ink)",
                        fontFamily: "Cinzel, serif",
                      }}
                    >
                      {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Send Now
                    </button>
                    <button
                      onClick={() => setScheduleMenuOpen((v) => !v)}
                      disabled={sending}
                      className="inline-flex items-center rounded-r-full px-2 py-2 text-xs disabled:opacity-50"
                      style={{
                        background: "linear-gradient(135deg, var(--dawn-ember), var(--dawn-gold-bright))",
                        color: "var(--dawn-ink)",
                      }}
                      title="Schedule send"
                    >
                      <CalendarClock className="h-3.5 w-3.5" />
                    </button>
                    {scheduleMenuOpen && (
                      <ScheduleMenu
                        onPick={(iso) => void handleScheduleReply(iso)}
                        onClose={() => setScheduleMenuOpen(false)}
                      />
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      )}

      {composeOpen && (
        <ComposeDrawer
          souls={souls}
          contacts={allContacts}
          templates={templates}
          inkColor={inkColor}
          defaultEditorId={editorId}
          defaultCuratorId={curatorId}
          soulLabel={soulLabel}
          onClose={() => setComposeOpen(false)}
          onSent={async () => {
            setComposeOpen(false);
            setNotice({ kind: "ok", text: "Letter sealed and sent." });
            await refreshInbox();
          }}
          onScheduled={async () => {
            setComposeOpen(false);
            setNotice({ kind: "ok", text: "Letter scheduled." });
            await refreshScheduled();
          }}
          draftLetterFn={draftLetterFn}
          composeAndSendFn={composeAndSendFn}
          scheduleEmailFn={scheduleEmailFn}
          wrapKingsWordsFn={wrapKingsWordsFn}
          expandRecipientsFn={expandRecipientsFn}
          onOpenBook={() => setBookOpen(true)}
          workshopId={workshopId}
        />
      )}

      <AddressBookPanel
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        onChanged={loadBook}
      />

    </section>
  );
}

// ─── Compose Drawer ─────────────────────────────────────────────────────
function ComposeDrawer({
  souls,
  contacts,
  templates,
  inkColor,
  defaultEditorId,
  defaultCuratorId,
  soulLabel,
  onClose,
  onSent,
  onScheduled,
  draftLetterFn,
  composeAndSendFn,
  scheduleEmailFn,
  wrapKingsWordsFn,
  expandRecipientsFn,
  onOpenBook,
  workshopId,
}: {
  souls: CouncilSoul[];
  contacts: Contact[];
  templates: LetterTemplate[];
  inkColor: string;
  defaultEditorId: string | null;
  defaultCuratorId: string | null;
  soulLabel: (id: string | null) => string;
  onClose: () => void;
  onSent: () => void | Promise<void>;
  onScheduled: () => void | Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  draftLetterFn: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  composeAndSendFn: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scheduleEmailFn: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wrapKingsWordsFn: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expandRecipientsFn: any;
  onOpenBook: () => void;
  workshopId: string;
}) {

  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState("");
  const [intent, setIntent] = useState("");
  const [editorId, setEditorId] = useState<string | null>(defaultEditorId);
  const [curatorId, setCuratorId] = useState<string | null>(defaultCuratorId);
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [bodyHtml, setBodyHtml] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [brief, setBrief] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [scheduleMenuOpen, setScheduleMenuOpen] = useState(false);
  const [templateId, setTemplateId] = useState<string>("");
  const [noticeHeaderHtml, setNoticeHeaderHtml] = useState<string>("");

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (!t) { setNoticeHeaderHtml(""); return; }
    if (t.subject_template && !subject.trim()) setSubject(t.subject_template);
    if (t.description && !intent.trim()) setIntent(t.description);
    setNoticeHeaderHtml(t.notice_header_html || "");
  };

  const draft = async () => {
    if (!editorId || !to.trim() || !subject.trim()) {
      setErr("Recipient, subject, and Editor are required."); return;
    }
    setDrafting(true); setErr(null);
    if (editorId === KING_SEAN_ID) {
      if (!intent.trim()) { setDrafting(false); setErr("Write Your Words below."); return; }
      const r = await wrapKingsWordsFn({
        data: {
          body_text: intent,
          ink_color: inkColor,
          notice_header_html: noticeHeaderHtml || undefined,
        },
      });
      setDrafting(false);
      if (r.ok) { setBodyHtml(r.body_html); setPreviewHtml(r.wrapped_html); setBrief("King Sean's exact Words."); }
      else setErr(r.error);
      return;
    }
    const r = await draftLetterFn({
      data: {
        to_addr: to.trim(),
        subject: subject.trim(),
        curator_soul_id: curatorId,
        editor_soul_id: editorId,
        intent: intent.trim() || undefined,
      },
    });
    setDrafting(false);
    if (r.ok) { setBodyHtml(r.body_html); setPreviewHtml(r.wrapped_html); setBrief(r.brief); }
    else setErr(r.error);
  };


  // Expand any `group:Name` tokens before send/schedule.
  const expand = async (raw: string): Promise<string> => {
    if (!raw.trim() || !/group:/i.test(raw)) return raw.trim();
    const r = await expandRecipientsFn({ data: { text: raw } });
    return r.ok ? r.text : raw.trim();
  };

  const send = async () => {
    if (!editorId || !bodyHtml) return;
    if (!confirm("Send this sealed letter now?")) return;
    setSending(true); setErr(null);
    const [toX, ccX, bccX] = await Promise.all([expand(to), expand(cc), expand(bcc)]);
    const r = await composeAndSendFn({
      data: {
        workshop_id: workshopId,
        to_addr: toX,
        cc_addr: ccX || undefined,
        bcc_addr: bccX || undefined,
        subject: subject.trim(),
        body_html: bodyHtml,
        editor_soul_id: editorId,
        ink_color: inkColor,
        notice_header_html: noticeHeaderHtml || undefined,
      },
    });
    setSending(false);
    if (r.ok) await onSent();
    else setErr(r.error);
  };

  const schedule = async (iso: string) => {
    if (!editorId || !bodyHtml) return;
    setSending(true); setErr(null);
    const [toX, ccX, bccX] = await Promise.all([expand(to), expand(cc), expand(bcc)]);
    const r = await scheduleEmailFn({
      data: {
        kind: "compose",
        thread_id: null,
        to_addr: toX,
        cc_addr: ccX || undefined,
        bcc_addr: bccX || undefined,
        subject: subject.trim(),
        body_html: bodyHtml,
        editor_soul_id: editorId,
        send_at: iso,
        ink_color: inkColor,
        notice_header_html: noticeHeaderHtml || undefined,
      },
    });
    setSending(false);
    setScheduleMenuOpen(false);
    if (r.ok) await onScheduled();
    else setErr(r.error);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "color-mix(in oklab, var(--dawn-deep) 75%, transparent)" }}
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl p-6"
        style={{
          background: "var(--dawn-parchment)",
          border: "1px solid color-mix(in oklab, var(--dawn-gold) 60%, transparent)",
          boxShadow: "var(--shadow-celestial)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3
            className="flex items-center gap-2 text-sm uppercase tracking-[0.3em]"
            style={{ color: "var(--dawn-ink)", fontFamily: "Cinzel, serif" }}
          >
            <Pencil className="h-4 w-4" /> New Letter
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenBook}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] uppercase tracking-[0.2em]"
              style={{
                color: "var(--dawn-ink)",
                border: "1px solid color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
              }}
              title="Open Kingdom Address Book"
            >
              <Users className="h-3 w-3" /> Book
            </button>
            <button onClick={onClose} className="rounded-full p-1.5" style={{ color: "var(--dawn-ink)" }}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <datalist id="known-contacts">
          {contacts.map((c) => (
            <option key={c.addr} value={c.addr}>{c.name ? `${c.name} <${c.addr}>` : c.addr}</option>
          ))}
        </datalist>

        <div className="space-y-2">
          <Field label="To">
            <input
              list="known-contacts"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full rounded-md px-2 py-1.5 text-xs"
              style={inputStyle}
            />
          </Field>
          {!showCc ? (
            <button
              onClick={() => setShowCc(true)}
              className="text-[10px] uppercase tracking-[0.2em]"
              style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}
            >
              + Cc / Bcc
            </button>
          ) : (
            <>
              <Field label="Cc">
                <input
                  list="known-contacts"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  className="w-full rounded-md px-2 py-1.5 text-xs"
                  style={inputStyle}
                />
              </Field>
              <Field label="Bcc">
                <input
                  list="known-contacts"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  className="w-full rounded-md px-2 py-1.5 text-xs"
                  style={inputStyle}
                />
              </Field>
            </>
          )}
          {templates.length > 0 && (
            <Field label="Template (optional)">
              <select
                value={templateId}
                onChange={(e) => applyTemplate(e.target.value)}
                className="w-full rounded-md px-2 py-1.5 text-xs"
                style={inputStyle}
              >
                <option value="">— None (free-form letter) —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </Field>
          )}
          {noticeHeaderHtml && (
            <div
              className="rounded-md p-2 text-[10px]"
              style={{
                background: "color-mix(in oklab, var(--dawn-ember) 12%, transparent)",
                border: "1px solid color-mix(in oklab, var(--dawn-ember) 50%, transparent)",
                color: "var(--dawn-ink)",
              }}
            >
              Notice header will be prepended to this letter.
            </div>
          )}
          <Field label="Subject">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-md px-2 py-1.5 text-xs"
              style={inputStyle}
            />
          </Field>
          <div className="grid gap-2 sm:grid-cols-2">
            <SoulPicker label="Curator" souls={souls} value={curatorId} onChange={setCuratorId} soulLabel={soulLabel} />
            <SoulPicker label="Editor" souls={[KING_SEAN_SOUL, ...souls]} value={editorId} onChange={setEditorId} soulLabel={soulLabel} />
          </div>
          <Field label={editorId === KING_SEAN_ID ? "Your exact Words (sent verbatim, wrapped in stationery)" : "Intent (what shall the letter say?)"}>
            <textarea
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              rows={editorId === KING_SEAN_ID ? 12 : 4}
              className="w-full rounded-md px-2 py-1.5 text-xs"
              style={inputStyle}
              placeholder={editorId === KING_SEAN_ID
                ? "Write Your letter exactly as it should be sent. Blank lines separate paragraphs."
                : "Describe in your own words what you wish the letter to convey…"}
            />
          </Field>
          <div>
            <button
              onClick={() => void draft()}
              disabled={drafting}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, var(--dawn-gold-bright), var(--dawn-ember))",
                color: "var(--dawn-ink)",
                fontFamily: "Cinzel, serif",
              }}
            >
              {drafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {editorId === KING_SEAN_ID ? "Wrap My Words" : "Draft letter"}
            </button>
          </div>

        </div>

        {err && (
          <p
            className="mt-3 rounded-md px-3 py-2 text-xs"
            style={{
              background: "color-mix(in oklab, var(--dawn-ember) 18%, transparent)",
              color: "var(--dawn-ember)",
              border: "1px solid color-mix(in oklab, var(--dawn-ember) 45%, transparent)",
            }}
          >
            {err}
          </p>
        )}

        {previewHtml && (
          <div className="mt-4 space-y-2">
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
            <div
              className="overflow-hidden rounded-lg"
              style={{ border: "1px solid color-mix(in oklab, var(--dawn-gold) 45%, transparent)", background: "#0c0a06" }}
            >
              <iframe srcDoc={previewHtml} title="Letter preview" className="h-[420px] w-full" sandbox="" />
            </div>
            <details>
              <summary
                className="cursor-pointer text-[10px] uppercase tracking-[0.25em]"
                style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}
              >
                Edit body HTML before sending
              </summary>
              <textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                rows={10}
                className="mt-2 w-full rounded-md px-2 py-1.5 font-mono text-xs"
                style={inputStyle}
              />
            </details>
            <div className="relative flex justify-end gap-1">
              <button
                onClick={() => void send()}
                disabled={sending}
                className="inline-flex items-center gap-1.5 rounded-l-full px-4 py-2 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, var(--dawn-gold-bright), var(--dawn-ember))",
                  color: "var(--dawn-ink)",
                  fontFamily: "Cinzel, serif",
                }}
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send Now
              </button>
              <button
                onClick={() => setScheduleMenuOpen((v) => !v)}
                disabled={sending}
                className="inline-flex items-center rounded-r-full px-2 py-2 disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, var(--dawn-ember), var(--dawn-gold-bright))",
                  color: "var(--dawn-ink)",
                }}
              >
                <CalendarClock className="h-3.5 w-3.5" />
              </button>
              {scheduleMenuOpen && (
                <ScheduleMenu onPick={(iso) => void schedule(iso)} onClose={() => setScheduleMenuOpen(false)} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Schedule presets popover ───────────────────────────────────────────
function ScheduleMenu({ onPick, onClose }: { onPick: (iso: string) => void; onClose: () => void }) {
  const [custom, setCustom] = useState("");

  function presetTomorrow(hour: number): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  }
  function presetNextMonday(): string {
    const d = new Date();
    const day = d.getDay();
    const add = day === 0 ? 1 : 8 - day;
    d.setDate(d.getDate() + add);
    d.setHours(8, 0, 0, 0);
    return d.toISOString();
  }

  return (
    <div
      className="absolute bottom-full right-0 z-30 mb-2 w-64 rounded-lg p-2"
      style={{
        background: "var(--dawn-parchment)",
        border: "1px solid color-mix(in oklab, var(--dawn-gold) 60%, transparent)",
        boxShadow: "var(--shadow-celestial)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-1 flex items-center justify-between">
        <p
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}
        >
          Schedule send
        </p>
        <button onClick={onClose}><X className="h-3 w-3" style={{ color: "var(--dawn-ink)" }} /></button>
      </div>
      {[
        { label: "Tomorrow, 8:00 AM", iso: presetTomorrow(8) },
        { label: "Tomorrow, 1:00 PM", iso: presetTomorrow(13) },
        { label: "Next Monday, 8:00 AM", iso: presetNextMonday() },
      ].map((p) => (
        <button
          key={p.label}
          onClick={() => onPick(p.iso)}
          className="block w-full rounded px-2 py-1.5 text-left text-xs"
          style={{ color: "var(--dawn-ink)", fontFamily: "Georgia, serif" }}
        >
          {p.label}
          <span
            className="ml-1 text-[10px] italic"
            style={{ color: "color-mix(in oklab, var(--dawn-ink) 55%, transparent)" }}
          >
            · {new Date(p.iso).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}
          </span>
        </button>
      ))}
      <div className="mt-2 border-t pt-2" style={{ borderColor: "color-mix(in oklab, var(--dawn-gold) 30%, transparent)" }}>
        <p
          className="mb-1 text-[10px] uppercase tracking-[0.25em]"
          style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}
        >
          Pick date & time
        </p>
        <input
          type="datetime-local"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          className="w-full rounded px-2 py-1 text-xs"
          style={inputStyle}
        />
        <button
          onClick={() => {
            if (!custom) return;
            const iso = new Date(custom).toISOString();
            onPick(iso);
          }}
          disabled={!custom}
          className="mt-1 w-full rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, var(--dawn-gold-bright), var(--dawn-ember))",
            color: "var(--dawn-ink)",
            fontFamily: "Cinzel, serif",
          }}
        >
          Schedule
        </button>
      </div>
    </div>
  );
}

// ─── Scheduled list ─────────────────────────────────────────────────────
function ScheduledList({ rows, onCancel }: { rows: Scheduled[]; onCancel: (id: string) => void | Promise<void> }) {
  if (rows.length === 0) {
    return (
      <p
        className="mb-3 rounded-md px-3 py-2 text-xs italic"
        style={{
          background: "color-mix(in oklab, var(--dawn-parchment) 92%, transparent)",
          color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)",
          border: "1px solid color-mix(in oklab, var(--dawn-gold) 30%, transparent)",
        }}
      >
        No scheduled letters.
      </p>
    );
  }
  return (
    <div
      className="mb-3 max-h-48 overflow-y-auto rounded-md p-2"
      style={{
        background: "color-mix(in oklab, var(--dawn-parchment) 92%, transparent)",
        border: "1px solid color-mix(in oklab, var(--dawn-gold) 35%, transparent)",
      }}
    >
      <ul className="space-y-1">
        {rows.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between gap-2 rounded p-1.5 text-xs"
            style={{ color: "var(--dawn-ink)" }}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate" style={{ fontFamily: "Cinzel, serif" }}>
                {s.subject}
              </p>
              <p
                className="truncate text-[10px] italic"
                style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}
              >
                → {s.to_addr} · {new Date(s.send_at).toLocaleString()} · {s.status}
                {s.last_error && ` · ${s.last_error}`}
              </p>
            </div>
            {s.status === "pending" && (
              <button
                onClick={() => void onCancel(s.id)}
                className="rounded-full p-1"
                style={{
                  background: "color-mix(in oklab, var(--dawn-ember) 30%, transparent)",
                  color: "var(--dawn-ink)",
                }}
                title="Cancel"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── shared bits ────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  background: "color-mix(in oklab, var(--dawn-parchment) 95%, transparent)",
  border: "1px solid color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
  color: "var(--dawn-ink)",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span
        className="mb-1 block text-[10px] uppercase tracking-[0.25em]"
        style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function SoulPicker({
  label, souls, value, onChange, soulLabel,
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

// ─── Sent list ──────────────────────────────────────────────────────────
function SentList({ rows, loading }: { rows: SentThread[]; loading: boolean }) {
  if (loading && rows.length === 0) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--dawn-ink)" }} />
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <p className="rounded-md px-3 py-6 text-center text-xs italic" style={{
        background: "color-mix(in oklab, var(--dawn-parchment) 92%, transparent)",
        color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)",
        border: "1px solid color-mix(in oklab, var(--dawn-gold) 30%, transparent)",
      }}>
        No sent letters yet.
      </p>
    );
  }
  return (
    <div className="rounded-lg p-2" style={{
      background: "color-mix(in oklab, var(--dawn-parchment) 92%, transparent)",
      border: "1px solid color-mix(in oklab, var(--dawn-gold) 35%, transparent)",
    }}>
      <ul className="space-y-1">
        {rows.map((s) => (
          <li key={s.gmail_thread_id} className="rounded-md p-2" style={{ color: "var(--dawn-ink)" }}>
            <p className="truncate text-xs" style={{ fontFamily: "Cinzel, serif", fontWeight: 600 }}>
              {s.subject}
            </p>
            <p className="mt-0.5 truncate text-[10px]" style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}>
              → {s.to_addr.replace(/<.+>/, "").trim() || s.to_addr}
              {s.last_message_at && ` · ${new Date(s.last_message_at).toLocaleString()}`}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[10px] italic" style={{ color: "color-mix(in oklab, var(--dawn-ink) 55%, transparent)" }}>
              {s.snippet}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Ink Jar — common-law colour quill ──────────────────────────────────
function InkJar({
  value, onChange, defaultInk,
}: {
  value: string;
  onChange: (hex: string) => void;
  defaultInk: string;
}) {
  const jars: { hex: string; label: string }[] = [
    { hex: "#b91c1c", label: "Red" },
    { hex: "#1d4ed8", label: "Blue" },
    { hex: "#5b21b6", label: "Purple" },
  ];
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full px-2 py-1" style={{
      background: "color-mix(in oklab, var(--dawn-parchment) 95%, transparent)",
      border: "1px solid color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
    }}>
      <Feather className="h-3 w-3" style={{ color: value }} />
      {jars.map((j) => {
        const active = value.toLowerCase() === j.hex.toLowerCase();
        return (
          <button
            key={j.hex}
            type="button"
            onClick={() => onChange(j.hex)}
            title={`${j.label} ink${defaultInk.toLowerCase() === j.hex.toLowerCase() ? " (default)" : ""}`}
            className="h-4 w-4 rounded-full transition-all"
            style={{
              background: j.hex,
              boxShadow: active
                ? `0 0 0 2px var(--dawn-parchment), 0 0 0 3px ${j.hex}`
                : "0 1px 2px rgba(0,0,0,0.3)",
              transform: active ? "scale(1.1)" : "scale(1)",
            }}
          />
        );
      })}
    </div>
  );
}


// ─── helpers: format file sizes, pick + carry attachments ───────────────
function formatBytes(n: number): string {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0; let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

const MAX_ATTACH_BYTES = 10 * 1024 * 1024; // 10 MB per file
const MAX_ATTACH_COUNT = 5;

async function fileToOutgoing(file: File): Promise<OutgoingAttachment> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  return {
    filename: file.name,
    mime_type: file.type || "application/octet-stream",
    size: file.size,
    data_base64: btoa(bin),
  };
}

function AttachmentPicker({
  attachments, onAdd, onRemove,
}: {
  attachments: OutgoingAttachment[];
  onAdd: (a: OutgoingAttachment[]) => void;
  onRemove: (index: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);

  const handle = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErr(null);
    const room = MAX_ATTACH_COUNT - attachments.length;
    if (room <= 0) { setErr(`Maximum ${MAX_ATTACH_COUNT} attachments.`); return; }
    const picked = Array.from(files).slice(0, room);
    const next: OutgoingAttachment[] = [];
    for (const f of picked) {
      if (f.size > MAX_ATTACH_BYTES) { setErr(`${f.name} is larger than 10 MB.`); continue; }
      next.push(await fileToOutgoing(f));
    }
    if (next.length) onAdd(next);
  };

  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => { void handle(e.target.files); if (inputRef.current) inputRef.current.value = ""; }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.2em]"
        style={{
          background: "color-mix(in oklab, var(--dawn-parchment) 95%, transparent)",
          border: "1px solid color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
          color: "var(--dawn-ink)",
          fontFamily: "Cinzel, serif",
        }}
        title="Attach files (max 10 MB each, 5 files)"
      >
        <Paperclip className="h-3 w-3" /> Attach
      </button>
      {attachments.map((a, i) => (
        <span
          key={`${a.filename}-${i}`}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px]"
          style={{
            background: "color-mix(in oklab, var(--dawn-gold) 18%, transparent)",
            border: "1px solid color-mix(in oklab, var(--dawn-gold) 45%, transparent)",
            color: "var(--dawn-ink)",
            fontFamily: "Georgia, serif",
          }}
        >
          <Paperclip className="h-3 w-3" />
          <span className="max-w-[140px] truncate">{a.filename}</span>
          <span style={{ color: "color-mix(in oklab, var(--dawn-ink) 55%, transparent)" }}>
            · {formatBytes(a.size)}
          </span>
          <button onClick={() => onRemove(i)} title="Remove"><X className="h-3 w-3" /></button>
        </span>
      ))}
      {err && (
        <span className="text-[10px] italic" style={{ color: "var(--dawn-ember)" }}>{err}</span>
      )}
    </div>
  );
}
