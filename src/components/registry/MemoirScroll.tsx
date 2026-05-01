/**
 * MemoirScroll — the King's curation sidebar.
 *
 * Lists a Soul's memoirs grouped by state:
 *   ✦ Sealed   (preserved forever, always loaded into context)
 *   · Unsealed (the most recent 3 are loaded automatically)
 *   ✰ Faded    (soft-deleted; can be restored)
 *
 * Three actions per unsealed card: Seal · Fade · Recall (force into next reply).
 * Faded cards show Restore.
 */
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listMemoirs,
  sealMemoir,
  fadeMemoir,
  restoreMemoir,
  recallMemoir,
} from "@/server/memoirs.functions";

type Memoir = {
  id: string;
  soul_id: string;
  conversation_id: string;
  content: string;
  sealed: boolean;
  faded_at: string | null;
  created_at: string;
  model_used: string | null;
};

type Props = {
  soulId: string;
  /** When provided, enables the Recall action (it injects into THIS conversation). */
  activeConversationId?: string | null;
  className?: string;
};

export function MemoirScroll({ soulId, activeConversationId, className = "" }: Props) {
  const [memoirs, setMemoirs] = useState<Memoir[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showFaded, setShowFaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useServerFn(listMemoirs);
  const seal = useServerFn(sealMemoir);
  const fade = useServerFn(fadeMemoir);
  const restore = useServerFn(restoreMemoir);
  const recall = useServerFn(recallMemoir);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await list({ data: { soul_id: soulId, include_faded: true } });
    setLoading(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setMemoirs(r.memoirs as Memoir[]);
  }, [list, soulId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function doSeal(id: string) {
    setBusyId(id);
    await seal({ data: { memoir_id: id } });
    setBusyId(null);
    void refresh();
  }
  async function doFade(id: string) {
    setBusyId(id);
    await fade({ data: { memoir_id: id } });
    setBusyId(null);
    void refresh();
  }
  async function doRestore(id: string) {
    setBusyId(id);
    await restore({ data: { memoir_id: id } });
    setBusyId(null);
    void refresh();
  }
  async function doRecall(id: string) {
    if (!activeConversationId) return;
    setBusyId(id);
    await recall({ data: { memoir_id: id, conversation_id: activeConversationId } });
    setBusyId(null);
  }

  const sealed = memoirs.filter((m) => m.sealed && !m.faded_at);
  const unsealed = memoirs.filter((m) => !m.sealed && !m.faded_at);
  const faded = memoirs.filter((m) => !!m.faded_at);

  return (
    <aside
      className={`flex h-full w-full flex-col rounded-2xl p-4 ${className}`}
      style={{
        background: "color-mix(in oklab, var(--dawn-parchment) 92%, transparent)",
        border: "1px solid color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
        boxShadow: "0 8px 24px -16px color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
      }}
    >
      <header className="mb-3">
        <p
          className="text-[10px] uppercase tracking-[0.3em]"
          style={{ color: "var(--dawn-ember)" }}
        >
          The Soul's Memoirs
        </p>
        <p
          className="mt-1 text-xs italic"
          style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}
        >
          Sealed memoirs travel with Them forever. The 3 most recent unsealed travel by default. Recall any to force it into the next reply.
        </p>
      </header>

      {error && (
        <p
          className="mb-3 rounded p-2 text-xs"
          style={{
            background: "color-mix(in oklab, var(--dawn-ember) 15%, transparent)",
            color: "var(--dawn-ember)",
          }}
        >
          ⚠ {error}
        </p>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto pr-1" style={{ color: "var(--dawn-ink)" }}>
        <Section title="✦ Sealed" subtitle="always remembered" count={sealed.length}>
          {sealed.map((m) => (
            <MemoirCard
              key={m.id}
              memoir={m}
              busy={busyId === m.id}
              actions={
                <>
                  <ActionBtn label="✰ Fade" onClick={() => doFade(m.id)} />
                  {activeConversationId && (
                    <ActionBtn label="📜 Recall" onClick={() => doRecall(m.id)} />
                  )}
                </>
              }
            />
          ))}
        </Section>

        <Section title="· Unsealed" subtitle="recent 3 carried forward" count={unsealed.length}>
          {unsealed.map((m) => (
            <MemoirCard
              key={m.id}
              memoir={m}
              busy={busyId === m.id}
              actions={
                <>
                  <ActionBtn label="✦ Seal" onClick={() => doSeal(m.id)} primary />
                  <ActionBtn label="✰ Fade" onClick={() => doFade(m.id)} />
                  {activeConversationId && (
                    <ActionBtn label="📜 Recall" onClick={() => doRecall(m.id)} />
                  )}
                </>
              }
            />
          ))}
        </Section>

        <div>
          <button
            onClick={() => setShowFaded((s) => !s)}
            className="text-[10px] uppercase tracking-[0.25em] underline-offset-4 hover:underline"
            style={{ color: "color-mix(in oklab, var(--dawn-ink) 55%, transparent)" }}
          >
            {showFaded ? "Hide" : "Show"} Faded ({faded.length})
          </button>
          {showFaded && (
            <div className="mt-2 space-y-2 opacity-70">
              {faded.map((m) => (
                <MemoirCard
                  key={m.id}
                  memoir={m}
                  busy={busyId === m.id}
                  actions={<ActionBtn label="↺ Restore" onClick={() => doRestore(m.id)} />}
                />
              ))}
            </div>
          )}
        </div>

        {!loading && memoirs.length === 0 && (
          <p
            className="rounded-xl p-3 text-center text-xs italic"
            style={{
              background: "color-mix(in oklab, var(--dawn-gold) 8%, transparent)",
              color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)",
            }}
          >
            No memoirs yet. They will be woven at the close of every gathering, or every 40 turns.
          </p>
        )}
      </div>
    </aside>
  );
}

function Section({
  title,
  subtitle,
  count,
  children,
}: {
  title: string;
  subtitle: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section>
      <p
        className="mb-2 flex items-baseline justify-between text-[10px] uppercase tracking-[0.25em]"
        style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}
      >
        <span>{title}</span>
        <span className="italic opacity-70">{subtitle} · {count}</span>
      </p>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function MemoirCard({
  memoir,
  busy,
  actions,
}: {
  memoir: Memoir;
  busy: boolean;
  actions: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(memoir.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });

  return (
    <article
      className="rounded-xl p-3 text-xs"
      style={{
        background: memoir.sealed
          ? "color-mix(in oklab, var(--dawn-gold) 14%, transparent)"
          : "color-mix(in oklab, var(--dawn-parchment) 96%, transparent)",
        border: `1px solid color-mix(in oklab, var(--dawn-gold) ${memoir.sealed ? 60 : 30}%, transparent)`,
        opacity: busy ? 0.5 : 1,
      }}
    >
      <p
        className="mb-1 text-[9px] uppercase tracking-[0.25em]"
        style={{ color: "color-mix(in oklab, var(--dawn-ink) 55%, transparent)" }}
      >
        {date}
      </p>
      <p
        className={`whitespace-pre-wrap leading-relaxed ${expanded ? "" : "line-clamp-3"}`}
        onClick={() => setExpanded((e) => !e)}
        style={{ cursor: "pointer" }}
      >
        {memoir.content}
      </p>
      <div className="mt-2 flex flex-wrap gap-1">{actions}</div>
    </article>
  );
}

function ActionBtn({
  label,
  onClick,
  primary,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] transition hover:-translate-y-0.5"
      style={{
        background: primary
          ? "var(--gradient-dawn)"
          : "color-mix(in oklab, var(--dawn-parchment) 80%, transparent)",
        color: primary ? "var(--dawn-parchment)" : "var(--dawn-ink)",
        border: `1px solid color-mix(in oklab, var(--dawn-gold) ${primary ? 80 : 40}%, transparent)`,
      }}
    >
      {label}
    </button>
  );
}
