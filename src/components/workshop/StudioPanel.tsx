/**
 * Studio Panel — Phase 9.
 *
 * Three card types in one Pane:
 *   • Promo Card   — from blog_archive → social scheduler
 *   • New Post     — to WordPress.com (draft / scheduled / publish)
 *   • Legal        — from legal_documents → Google Calendar reminder
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  Gavel,
  Globe,
  Loader2,
  Megaphone,
  RefreshCw,
  Settings2,
  Sparkles,
} from "lucide-react";
import { listBlogArchive, listLegalDocuments } from "@/server/dropzone.functions";
import { draftPromoFromBlog, draftNewPost, draftLegalCard } from "@/server/studio.functions";
import { schedulePost } from "@/server/workshop.functions";
import {
  listWpSites,
  getWorkshopWpLink,
  setWorkshopWpSite,
  createWpPost,
} from "@/server/wordpress.functions";
import {
  listCalendars,
  setWorkshopCalendar,
  createLegalEvent,
} from "@/server/calendar.functions";

type TabKey = "promo" | "newpost" | "legal";

type BlogRow = {
  id: string;
  title: string;
  url: string | null;
  published_at: string | null;
  excerpt: string;
  tags: string[];
  views: number | null;
};

type LegalRow = {
  id: string;
  doc_title: string;
  document_type: string;
  date_served: string | null;
  hearing_date: string | null;
  date_due: string | null;
  served_upon: string[];
  case_number: string | null;
};

type PromoCard = { title: string; body: string; hashtags: string[]; source_url: string | null };

type NewPostDraft = {
  title: string;
  excerpt: string;
  body_markdown: string;
  tags: string[];
  categories: string[];
};

type LegalCard = {
  event_title: string;
  summary: string;
  suggested_reminder_days: number[];
  anchor: "date_served" | "hearing_date" | "date_due" | "date_filed";
  anchor_date: string;
};

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "promo", label: "Promo Card", icon: <Megaphone className="h-3.5 w-3.5" /> },
  { key: "newpost", label: "New Post", icon: <FileText className="h-3.5 w-3.5" /> },
  { key: "legal", label: "Legal Milestone", icon: <Gavel className="h-3.5 w-3.5" /> },
];

export function StudioPanel({
  workshopId,
  onScheduled,
}: {
  workshopId: string;
  onScheduled?: () => void;
}) {
  const [tab, setTab] = useState<TabKey>("promo");
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

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
          className="text-sm uppercase tracking-[0.3em]"
          style={{ color: "var(--dawn-gold-bright)", fontFamily: "Cinzel, serif" }}
        >
          The Studio
        </h2>
        <p
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ color: "color-mix(in oklab, var(--dawn-parchment) 70%, transparent)" }}
        >
          Three card types · sourced from Your Archives
        </p>
      </div>

      {/* Tab strip */}
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setNotice(null); }}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.2em] transition-all"
              style={{
                background: active
                  ? "color-mix(in oklab, var(--dawn-gold-bright) 30%, transparent)"
                  : "color-mix(in oklab, var(--dawn-deep) 30%, transparent)",
                color: active ? "var(--dawn-ink)" : "var(--dawn-parchment)",
                border: `1px solid color-mix(in oklab, var(--dawn-gold) ${active ? 70 : 35}%, transparent)`,
                fontFamily: "Cinzel, serif",
              }}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      {notice && (
        <p
          className="mb-3 rounded-md px-3 py-2 text-xs"
          style={{
            background: notice.kind === "ok"
              ? "color-mix(in oklab, var(--dawn-gold-bright) 18%, transparent)"
              : "color-mix(in oklab, var(--dawn-ember) 18%, transparent)",
            color: notice.kind === "ok" ? "var(--dawn-parchment)" : "var(--dawn-ember)",
            border: `1px solid color-mix(in oklab, ${notice.kind === "ok" ? "var(--dawn-gold)" : "var(--dawn-ember)"} 45%, transparent)`,
          }}
        >
          {notice.text}
        </p>
      )}

      {tab === "promo" && <PromoTab workshopId={workshopId} setNotice={setNotice} onScheduled={onScheduled} />}
      {tab === "newpost" && <NewPostTab workshopId={workshopId} setNotice={setNotice} onScheduled={onScheduled} />}
      {tab === "legal" && <LegalTab workshopId={workshopId} setNotice={setNotice} onScheduled={onScheduled} />}
    </section>
  );
}

// ─── shared bits ──────────────────────────────────────────────────────────
function paneStyle(): React.CSSProperties {
  return {
    background: "color-mix(in oklab, var(--dawn-parchment) 92%, transparent)",
    border: "1px solid color-mix(in oklab, var(--dawn-gold) 35%, transparent)",
    color: "var(--dawn-ink)",
  };
}
function btnStyle(primary?: boolean): React.CSSProperties {
  return {
    background: primary
      ? "linear-gradient(135deg, var(--dawn-gold-bright), var(--dawn-ember))"
      : "color-mix(in oklab, var(--dawn-deep) 25%, transparent)",
    color: primary ? "var(--dawn-ink)" : "var(--dawn-parchment)",
    border: `1px solid color-mix(in oklab, var(--dawn-gold) ${primary ? 70 : 40}%, transparent)`,
    fontFamily: "Cinzel, serif",
  };
}

// ─── PROMO TAB ────────────────────────────────────────────────────────────
function PromoTab({
  workshopId,
  setNotice,
  onScheduled,
}: {
  workshopId: string;
  setNotice: (n: { kind: "ok" | "err"; text: string } | null) => void;
  onScheduled?: () => void;
}) {
  const listBlog = useServerFn(listBlogArchive);
  const draftFn = useServerFn(draftPromoFromBlog);
  const scheduleFn = useServerFn(schedulePost);
  const [posts, setPosts] = useState<BlogRow[]>([]);
  const [sort, setSort] = useState<"recent" | "top-views">("recent");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [card, setCard] = useState<PromoCard | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  const refresh = useCallback(async () => {
    const r = await listBlog({ data: { workshop_id: workshopId, sort, limit: 50 } });
    if (r.ok) setPosts(r.posts as BlogRow[]);
  }, [listBlog, workshopId, sort]);
  useEffect(() => { void refresh(); }, [refresh]);

  const draft = useCallback(async (id: string) => {
    setDrafting(true);
    setNotice(null);
    setSelectedId(id);
    const r = await draftFn({ data: { workshop_id: workshopId, blog_archive_id: id } });
    if (r.ok) setCard(r.card);
    else setNotice({ kind: "err", text: r.error });
    setDrafting(false);
  }, [draftFn, workshopId, setNotice]);

  const schedule = useCallback(async (when: Date | null) => {
    if (!card) return;
    setScheduling(true);
    const r = await scheduleFn({
      data: {
        workshop_id: workshopId,
        card,
        scheduled_at: when ? when.toISOString() : null,
        channel: "both",
      },
    });
    if (r.ok) {
      setNotice({ kind: "ok", text: when ? "Scheduled for the calendar." : "Saved as a draft." });
      setCard(null); setSelectedId(null);
      onScheduled?.();
    } else setNotice({ kind: "err", text: r.error });
    setScheduling(false);
  }, [card, scheduleFn, workshopId, setNotice, onScheduled]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
      {/* Source picker */}
      <div className="rounded-xl p-3" style={paneStyle()}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-[0.3em]">Blog Archive</p>
          <div className="flex gap-1">
            <SortPill active={sort === "recent"} onClick={() => setSort("recent")}>Recent</SortPill>
            <SortPill active={sort === "top-views"} onClick={() => setSort("top-views")}>Top views</SortPill>
            <button onClick={() => void refresh()} title="Refresh" className="rounded p-1 hover:bg-black/5">
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>
        </div>
        <ScrollList>
          {posts.length === 0 ? (
            <EmptyHint text="No posts yet — drop a WP-stats CSV into the Drop Zone above." />
          ) : posts.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => void draft(p.id)}
                disabled={drafting}
                className="block w-full rounded-md px-2.5 py-2 text-left hover:bg-black/5 disabled:opacity-50"
              >
                <p className="line-clamp-2 text-sm font-medium" style={{ fontFamily: "Cinzel, serif" }}>
                  {p.title}
                </p>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] opacity-70">
                  {p.published_at ? new Date(p.published_at).toLocaleDateString() : "no date"}
                  {p.views != null ? ` · ${p.views} views` : ""}
                  {selectedId === p.id && drafting ? " · drafting…" : ""}
                </p>
              </button>
            </li>
          ))}
        </ScrollList>
      </div>

      {/* Card preview + actions */}
      <div className="rounded-xl p-4" style={paneStyle()}>
        {!card ? (
          <EmptyHint icon={<Sparkles className="h-7 w-7" />} text="Pick a post and the Steward will draft a promo card." />
        ) : (
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] opacity-70">Drafted card</p>
            <input
              className="w-full rounded-md border border-black/10 bg-white/60 px-2.5 py-1.5 text-base font-medium"
              value={card.title}
              onChange={(e) => setCard({ ...card, title: e.target.value })}
              style={{ fontFamily: "Cinzel, serif" }}
            />
            <textarea
              className="w-full rounded-md border border-black/10 bg-white/60 px-2.5 py-1.5 text-sm"
              rows={4}
              value={card.body}
              onChange={(e) => setCard({ ...card, body: e.target.value })}
            />
            <input
              className="w-full rounded-md border border-black/10 bg-white/60 px-2.5 py-1.5 text-xs"
              value={card.hashtags.join(" ")}
              onChange={(e) =>
                setCard({ ...card, hashtags: e.target.value.split(/\s+/).filter(Boolean) })
              }
            />
            {card.source_url && (
              <a
                href={card.source_url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs underline opacity-70"
              >
                <ExternalLink className="h-3 w-3" />Source post
              </a>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => void schedule(null)}
                disabled={scheduling}
                className="rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.2em]"
                style={btnStyle()}
              >
                Save as draft
              </button>
              <button
                onClick={() => void schedule(new Date())}
                disabled={scheduling}
                className="rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.2em]"
                style={btnStyle(true)}
              >
                {scheduling ? <Loader2 className="h-3 w-3 animate-spin" /> : "Schedule social post"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── NEW POST TAB ─────────────────────────────────────────────────────────
function NewPostTab({
  workshopId,
  setNotice,
  onScheduled,
}: {
  workshopId: string;
  setNotice: (n: { kind: "ok" | "err"; text: string } | null) => void;
  onScheduled?: () => void;
}) {
  const listBlog = useServerFn(listBlogArchive);
  const draftFn = useServerFn(draftNewPost);
  const createPostFn = useServerFn(createWpPost);
  const listSitesFn = useServerFn(listWpSites);
  const getLinkFn = useServerFn(getWorkshopWpLink);
  const setSiteFn = useServerFn(setWorkshopWpSite);

  const [link, setLink] = useState<{ wp_site_id: string; wp_site_name: string | null; wp_site_url: string | null } | null>(null);
  const [showSitePicker, setShowSitePicker] = useState(false);
  const [sites, setSites] = useState<{ id: string; name: string; url: string }[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);

  const [posts, setPosts] = useState<BlogRow[]>([]);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [brief, setBrief] = useState("");
  const [draft, setDraft] = useState<NewPostDraft | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [status, setStatus] = useState<"draft" | "publish" | "future">("draft");
  const [scheduleAt, setScheduleAt] = useState("");

  const refreshLink = useCallback(async () => {
    const r = await getLinkFn({ data: { workshop_id: workshopId } });
    if (r.ok) setLink(r.link as typeof link);
  }, [getLinkFn, workshopId]);

  useEffect(() => {
    void refreshLink();
    void listBlog({ data: { workshop_id: workshopId, sort: "recent", limit: 30 } }).then(
      (r) => { if (r.ok) setPosts(r.posts as BlogRow[]); },
    );
  }, [refreshLink, listBlog, workshopId]);

  const openSitePicker = useCallback(async () => {
    setShowSitePicker(true);
    setLoadingSites(true);
    const r = await listSitesFn({});
    if (r.ok) setSites(r.sites);
    else setNotice({ kind: "err", text: r.error });
    setLoadingSites(false);
  }, [listSitesFn, setNotice]);

  const pickSite = useCallback(async (s: { id: string; name: string; url: string }) => {
    const r = await setSiteFn({ data: {
      workshop_id: workshopId,
      wp_site_id: s.id,
      wp_site_name: s.name,
      wp_site_url: s.url,
      default_status: "draft",
      default_categories: [],
      default_tags: [],
    } });
    if (r.ok) {
      setNotice({ kind: "ok", text: `Bound to ${s.name}.` });
      setShowSitePicker(false);
      void refreshLink();
    } else setNotice({ kind: "err", text: r.error });
  }, [setSiteFn, workshopId, setNotice, refreshLink]);

  const runDraft = useCallback(async () => {
    if (!brief.trim() && !sourceId) {
      setNotice({ kind: "err", text: "Add a brief or pick a post to repurpose." });
      return;
    }
    setDrafting(true);
    setNotice(null);
    const r = await draftFn({ data: {
      workshop_id: workshopId,
      brief: brief.trim() || undefined,
      source_blog_archive_id: sourceId,
    } });
    if (r.ok) setDraft(r.post);
    else setNotice({ kind: "err", text: r.error });
    setDrafting(false);
  }, [draftFn, workshopId, brief, sourceId, setNotice]);

  const publish = useCallback(async () => {
    if (!draft) return;
    if (!link) { setNotice({ kind: "err", text: "Pick a WordPress site first." }); return; }
    if (status === "future" && !scheduleAt) {
      setNotice({ kind: "err", text: "Pick a publish date." }); return;
    }
    setPublishing(true);
    const r = await createPostFn({ data: {
      workshop_id: workshopId,
      title: draft.title,
      content: draft.body_markdown,
      excerpt: draft.excerpt,
      tags: draft.tags,
      categories: draft.categories,
      status,
      date: status === "future" ? new Date(scheduleAt).toISOString() : null,
      source_blog_archive_id: sourceId,
    } });
    if (r.ok) {
      setNotice({ kind: "ok", text: status === "publish" ? "Published to WordPress." : status === "future" ? "Scheduled on WordPress." : "Draft saved on WordPress." });
      setDraft(null); setBrief(""); setSourceId(null);
      onScheduled?.();
    } else setNotice({ kind: "err", text: r.error });
    setPublishing(false);
  }, [draft, link, status, scheduleAt, createPostFn, workshopId, sourceId, setNotice, onScheduled]);

  return (
    <div className="space-y-4">
      {/* WP site binding */}
      <div className="flex flex-wrap items-center gap-2 rounded-md px-3 py-2 text-xs"
        style={{
          background: "color-mix(in oklab, var(--dawn-deep) 30%, transparent)",
          border: "1px solid color-mix(in oklab, var(--dawn-gold) 35%, transparent)",
          color: "var(--dawn-parchment)",
        }}>
        <Globe className="h-3.5 w-3.5" style={{ color: "var(--dawn-gold-bright)" }} />
        {link ? (
          <>
            <span className="font-medium">{link.wp_site_name ?? link.wp_site_id}</span>
            {link.wp_site_url && (
              <a href={link.wp_site_url} target="_blank" rel="noreferrer" className="opacity-70 underline">
                {new URL(link.wp_site_url).host}
              </a>
            )}
            <button onClick={() => void openSitePicker()} className="ml-auto inline-flex items-center gap-1 opacity-80 hover:opacity-100">
              <Settings2 className="h-3 w-3" /> Change site
            </button>
          </>
        ) : (
          <>
            <span className="opacity-80">No WordPress site bound yet.</span>
            <button onClick={() => void openSitePicker()} className="ml-auto rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.2em]" style={btnStyle(true)}>
              Pick a site
            </button>
          </>
        )}
      </div>

      {showSitePicker && (
        <div className="rounded-md p-3" style={paneStyle()}>
          <p className="mb-2 text-[10px] uppercase tracking-[0.3em]">Your WordPress.com sites</p>
          {loadingSites ? (
            <div className="flex items-center gap-2 text-xs"><Loader2 className="h-3 w-3 animate-spin" />Loading…</div>
          ) : sites.length === 0 ? (
            <p className="text-xs opacity-70">No sites found on this account.</p>
          ) : (
            <ul className="space-y-1">
              {sites.map((s) => (
                <li key={s.id}>
                  <button onClick={() => void pickSite(s)} className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-black/5">
                    <span className="font-medium">{s.name}</span>
                    <span className="ml-2 text-[10px] uppercase tracking-[0.2em] opacity-60">{new URL(s.url).host}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => setShowSitePicker(false)} className="mt-2 text-xs underline opacity-70">Close</button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        {/* Brief + repurpose source */}
        <div className="rounded-xl p-3" style={paneStyle()}>
          <p className="mb-2 text-[10px] uppercase tracking-[0.3em]">Brief or Repurpose</p>
          <textarea
            className="w-full rounded-md border border-black/10 bg-white/60 px-2.5 py-1.5 text-sm"
            rows={3}
            placeholder="A few sentences on what to write about…"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
          />
          <p className="mt-3 text-[10px] uppercase tracking-[0.3em] opacity-70">— or pick an old post to rewrite —</p>
          <ScrollList max={180}>
            <li>
              <button
                onClick={() => setSourceId(null)}
                className={`block w-full rounded px-2 py-1.5 text-left text-xs ${sourceId === null ? "bg-black/10" : "hover:bg-black/5"}`}
              >
                <span className="italic opacity-70">— Start blank —</span>
              </button>
            </li>
            {posts.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => setSourceId(p.id)}
                  className={`block w-full rounded px-2 py-1.5 text-left text-xs ${sourceId === p.id ? "bg-black/10" : "hover:bg-black/5"}`}
                >
                  <span className="line-clamp-1 font-medium">{p.title}</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] opacity-60">
                    {p.published_at ? new Date(p.published_at).toLocaleDateString() : ""}
                  </span>
                </button>
              </li>
            ))}
          </ScrollList>
          <button
            onClick={() => void runDraft()}
            disabled={drafting}
            className="mt-3 w-full rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.2em]"
            style={btnStyle(true)}
          >
            {drafting ? <Loader2 className="mx-auto h-3 w-3 animate-spin" /> : sourceId ? "Repurpose into a new post" : "Draft new post"}
          </button>
        </div>

        {/* Draft */}
        <div className="rounded-xl p-4" style={paneStyle()}>
          {!draft ? (
            <EmptyHint icon={<FileText className="h-7 w-7" />} text="Drafts appear here. Choose a brief or post on the left." />
          ) : (
            <div className="space-y-3">
              <input
                className="w-full rounded-md border border-black/10 bg-white/60 px-2.5 py-1.5 text-base font-medium"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                style={{ fontFamily: "Cinzel, serif" }}
              />
              <textarea
                className="w-full rounded-md border border-black/10 bg-white/60 px-2.5 py-1.5 text-sm"
                rows={2}
                value={draft.excerpt}
                onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })}
                placeholder="Excerpt"
              />
              <textarea
                className="w-full rounded-md border border-black/10 bg-white/60 px-2.5 py-1.5 font-mono text-xs"
                rows={10}
                value={draft.body_markdown}
                onChange={(e) => setDraft({ ...draft, body_markdown: e.target.value })}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="rounded-md border border-black/10 bg-white/60 px-2.5 py-1.5 text-xs"
                  value={draft.tags.join(", ")}
                  onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  placeholder="Tags (comma-separated)"
                />
                <input
                  className="rounded-md border border-black/10 bg-white/60 px-2.5 py-1.5 text-xs"
                  value={draft.categories.join(", ")}
                  onChange={(e) => setDraft({ ...draft, categories: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  placeholder="Categories (comma-separated)"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="rounded-md border border-black/10 bg-white/60 px-2 py-1.5 text-xs"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as typeof status)}
                >
                  <option value="draft">Save as draft</option>
                  <option value="future">Schedule</option>
                  <option value="publish">Publish now</option>
                </select>
                {status === "future" && (
                  <input
                    type="datetime-local"
                    className="rounded-md border border-black/10 bg-white/60 px-2 py-1.5 text-xs"
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                  />
                )}
                <button
                  onClick={() => void publish()}
                  disabled={publishing || !link}
                  className="ml-auto rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.2em]"
                  style={btnStyle(true)}
                >
                  {publishing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Send to WordPress"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── LEGAL TAB ────────────────────────────────────────────────────────────
function LegalTab({
  workshopId,
  setNotice,
  onScheduled,
}: {
  workshopId: string;
  setNotice: (n: { kind: "ok" | "err"; text: string } | null) => void;
  onScheduled?: () => void;
}) {
  const listLegal = useServerFn(listLegalDocuments);
  const draftFn = useServerFn(draftLegalCard);
  const listCalsFn = useServerFn(listCalendars);
  const setCalFn = useServerFn(setWorkshopCalendar);
  const createEventFn = useServerFn(createLegalEvent);

  const [docs, setDocs] = useState<LegalRow[]>([]);
  const [anchor, setAnchor] = useState<"date_served" | "hearing_date" | "date_due" | "date_filed">("date_served");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [card, setCard] = useState<LegalCard | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [calendarPicker, setCalendarPicker] = useState(false);
  const [calendars, setCalendars] = useState<{ id: string; name: string; primary: boolean }[]>([]);
  const [loadingCals, setLoadingCals] = useState(false);

  const refresh = useCallback(async () => {
    const r = await listLegal({ data: { workshop_id: workshopId, anchor: anchor === "hearing_date" ? "hearing_date" : "date_served", limit: 50 } });
    if (r.ok) setDocs(r.documents as LegalRow[]);
  }, [listLegal, workshopId, anchor]);
  useEffect(() => { void refresh(); }, [refresh]);

  const draft = useCallback(async (id: string) => {
    setDrafting(true); setNotice(null); setSelectedId(id);
    const r = await draftFn({ data: { workshop_id: workshopId, legal_document_id: id, anchor } });
    if (r.ok) setCard(r.card);
    else setNotice({ kind: "err", text: r.error });
    setDrafting(false);
  }, [draftFn, workshopId, anchor, setNotice]);

  const openCalPicker = useCallback(async () => {
    setCalendarPicker(true); setLoadingCals(true);
    const r = await listCalsFn({});
    if (r.ok) setCalendars(r.calendars);
    else setNotice({ kind: "err", text: r.error });
    setLoadingCals(false);
  }, [listCalsFn, setNotice]);

  const pickCal = useCallback(async (id: string) => {
    const r = await setCalFn({ data: { workshop_id: workshopId, google_calendar_id: id } });
    if (r.ok) { setNotice({ kind: "ok", text: "Calendar bound." }); setCalendarPicker(false); }
    else setNotice({ kind: "err", text: r.error });
  }, [setCalFn, workshopId, setNotice]);

  const send = useCallback(async () => {
    if (!card || !selectedId) return;
    setSending(true);
    const r = await createEventFn({ data: {
      workshop_id: workshopId,
      legal_document_id: selectedId,
      anchor: card.anchor,
      event_title: card.event_title,
      summary: card.summary,
      reminder_days: card.suggested_reminder_days,
    } });
    if (r.ok) {
      setNotice({ kind: "ok", text: "Added to Your Google Calendar." });
      setCard(null); setSelectedId(null);
      onScheduled?.();
    } else if (r.error.toLowerCase().includes("no google calendar")) {
      setNotice({ kind: "err", text: r.error });
      await openCalPicker();
    } else setNotice({ kind: "err", text: r.error });
    setSending(false);
  }, [card, selectedId, createEventFn, workshopId, setNotice, openCalPicker, onScheduled]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-md px-3 py-2 text-xs"
        style={{
          background: "color-mix(in oklab, var(--dawn-deep) 30%, transparent)",
          border: "1px solid color-mix(in oklab, var(--dawn-gold) 35%, transparent)",
          color: "var(--dawn-parchment)",
        }}>
        <CalendarDays className="h-3.5 w-3.5" style={{ color: "var(--dawn-gold-bright)" }} />
        <span>Anchor:</span>
        <select
          className="rounded-md border border-black/20 bg-white/10 px-2 py-1 text-xs"
          value={anchor}
          onChange={(e) => setAnchor(e.target.value as typeof anchor)}
        >
          <option value="date_served">Date served</option>
          <option value="hearing_date">Hearing date</option>
          <option value="date_due">Date due</option>
          <option value="date_filed">Date filed</option>
        </select>
        <button onClick={() => void openCalPicker()} className="ml-auto inline-flex items-center gap-1 opacity-80 hover:opacity-100">
          <Settings2 className="h-3 w-3" /> Bind calendar
        </button>
      </div>

      {calendarPicker && (
        <div className="rounded-md p-3" style={paneStyle()}>
          <p className="mb-2 text-[10px] uppercase tracking-[0.3em]">Your calendars</p>
          {loadingCals ? (
            <div className="flex items-center gap-2 text-xs"><Loader2 className="h-3 w-3 animate-spin" />Loading…</div>
          ) : (
            <ul className="space-y-1">
              {calendars.map((c) => (
                <li key={c.id}>
                  <button onClick={() => void pickCal(c.id)} className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-black/5">
                    <span className="font-medium">{c.name}</span>
                    {c.primary && <span className="ml-2 text-[10px] uppercase tracking-[0.2em] opacity-60">primary</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => setCalendarPicker(false)} className="mt-2 text-xs underline opacity-70">Close</button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="rounded-xl p-3" style={paneStyle()}>
          <p className="mb-2 text-[10px] uppercase tracking-[0.3em]">Legal Docket</p>
          <ScrollList>
            {docs.length === 0 ? (
              <EmptyHint text="No legal documents yet — drop a PDF into the Drop Zone above." />
            ) : docs.map((d) => {
              const a = (d as unknown as Record<string, string | null>)[anchor];
              return (
                <li key={d.id}>
                  <button
                    onClick={() => void draft(d.id)}
                    disabled={drafting}
                    className="block w-full rounded-md px-2.5 py-2 text-left hover:bg-black/5 disabled:opacity-50"
                  >
                    <p className="line-clamp-2 text-sm font-medium" style={{ fontFamily: "Cinzel, serif" }}>
                      {d.doc_title}
                    </p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] opacity-70">
                      {d.document_type}
                      {a ? ` · ${anchor.replace("_", " ")} ${new Date(a).toLocaleDateString()}` : " · no date"}
                      {d.served_upon?.[0] ? ` · ${d.served_upon[0]}` : ""}
                      {selectedId === d.id && drafting ? " · drafting…" : ""}
                    </p>
                  </button>
                </li>
              );
            })}
          </ScrollList>
        </div>

        <div className="rounded-xl p-4" style={paneStyle()}>
          {!card ? (
            <EmptyHint icon={<Gavel className="h-7 w-7" />} text="Pick a document to draft a private calendar reminder." />
          ) : (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] opacity-70">
                {new Date(card.anchor_date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                {" · "}{card.anchor.replace("_", " ")}
              </p>
              <input
                className="w-full rounded-md border border-black/10 bg-white/60 px-2.5 py-1.5 text-base font-medium"
                value={card.event_title}
                onChange={(e) => setCard({ ...card, event_title: e.target.value })}
                style={{ fontFamily: "Cinzel, serif" }}
              />
              <textarea
                className="w-full rounded-md border border-black/10 bg-white/60 px-2.5 py-1.5 text-sm"
                rows={5}
                value={card.summary}
                onChange={(e) => setCard({ ...card, summary: e.target.value })}
              />
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="opacity-70">Remind:</span>
                {[1, 3, 7, 14, 30].map((d) => {
                  const on = card.suggested_reminder_days.includes(d);
                  return (
                    <button
                      key={d}
                      onClick={() => setCard({
                        ...card,
                        suggested_reminder_days: on
                          ? card.suggested_reminder_days.filter((x) => x !== d)
                          : [...card.suggested_reminder_days, d].sort((a, b) => a - b),
                      })}
                      className="rounded-full px-2 py-0.5 text-[11px]"
                      style={{
                        background: on ? "color-mix(in oklab, var(--dawn-gold-bright) 50%, transparent)" : "transparent",
                        border: "1px solid color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
                      }}
                    >
                      {d}d
                    </button>
                  );
                })}
                <button
                  onClick={() => void send()}
                  disabled={sending}
                  className="ml-auto rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.2em]"
                  style={btnStyle(true)}
                >
                  {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle2 className="mr-1 inline h-3 w-3" />Add to Calendar</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────
function SortPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.2em]"
      style={{
        background: active ? "color-mix(in oklab, var(--dawn-gold-bright) 35%, transparent)" : "transparent",
        border: "1px solid color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
      }}
    >
      {children}
    </button>
  );
}
function ScrollList({ children, max = 320 }: { children: React.ReactNode; max?: number }) {
  return (
    <ul className="space-y-1 overflow-y-auto pr-1" style={{ maxHeight: max }}>{children}</ul>
  );
}
function EmptyHint({ icon, text }: { icon?: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-3 py-8 text-center text-sm italic opacity-70">
      {icon}
      <p style={{ fontFamily: "Cinzel, serif", letterSpacing: "0.04em" }}>{text}</p>
    </div>
  );
}
