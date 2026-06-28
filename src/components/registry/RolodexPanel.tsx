/**
 * RolodexPanel — Universal Rolodex review panel for the King.
 *
 * Pending / Confirmed / Declined sections.
 * Souls propose pending entries when the King speaks "remember/track <Name>: context".
 * The King confirms (optionally editing), declines, or leaves pending here.
 */
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listRolodex,
  confirmContact,
  declineContact,
  type RolodexRow,
} from "@/lib-server/rolodex.functions";

type Lists = { pending: RolodexRow[]; confirmed: RolodexRow[]; declined: RolodexRow[] };

export function RolodexPanel() {
  const list = useServerFn(listRolodex);
  const confirmFn = useServerFn(confirmContact);
  const declineFn = useServerFn(declineContact);

  const [lists, setLists] = useState<Lists>({ pending: [], confirmed: [], declined: [] });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [open, setOpen] = useState<"pending" | "confirmed" | "declined">("pending");

  const refresh = useCallback(async () => {
    const r = await list({});
    if (r.ok) setLists({ pending: r.pending, confirmed: r.confirmed, declined: r.declined });
  }, [list]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onConfirm = async (id: string) => {
    setBusyId(id);
    await confirmFn({ data: { id } });
    await refresh();
    setBusyId(null);
  };
  const onDecline = async (id: string) => {
    setBusyId(id);
    await declineFn({ data: { id } });
    await refresh();
    setBusyId(null);
  };

  const tabBtn = (key: "pending" | "confirmed" | "declined", label: string, count: number) => (
    <button
      key={key}
      type="button"
      onClick={() => setOpen(key)}
      className="rounded-full px-4 py-1 text-[10px] uppercase tracking-[0.3em] transition-all"
      style={{
        background:
          open === key
            ? "linear-gradient(135deg, var(--dawn-gold) 0%, var(--dawn-gold-bright) 100%)"
            : "color-mix(in oklab, var(--dawn-deep) 35%, transparent)",
        color: open === key ? "var(--dawn-ink)" : "var(--dawn-parchment)",
        border: "1px solid color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
      }}
    >
      {label} · {count}
    </button>
  );

  const rows =
    open === "pending" ? lists.pending : open === "confirmed" ? lists.confirmed : lists.declined;

  return (
    <section
      className="mx-auto mt-10 max-w-5xl rounded-3xl border p-6 backdrop-blur-md"
      style={{
        borderColor: "color-mix(in oklab, var(--dawn-gold) 35%, transparent)",
        background: "color-mix(in oklab, var(--dawn-deep) 55%, transparent)",
        boxShadow: "var(--shadow-sigil)",
        color: "var(--dawn-parchment)",
      }}
    >
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.4em]"
            style={{ color: "var(--dawn-gold-bright)" }}
          >
            Universal Rolodex
          </p>
          <h2 className="font-serif text-2xl" style={{ color: "var(--dawn-parchment)" }}>
            The People of the King's Microcosm
          </h2>
          <p className="mt-1 max-w-2xl text-xs opacity-75">
            Souls propose new entries when You name someone in conversation
            (e.g. <em>"Remember Jane Doe — she's my notary"</em>). Confirm or
            decline below. Confirmed names are visible to every Soul.
          </p>
        </div>
        <div className="flex gap-2">
          {tabBtn("pending", "Pending", lists.pending.length)}
          {tabBtn("confirmed", "Confirmed", lists.confirmed.length)}
          {tabBtn("declined", "Declined", lists.declined.length)}
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm italic opacity-70">
          {open === "pending"
            ? "No pending proposals. Speak a name to a Soul and one will appear here for Your review."
            : open === "confirmed"
              ? "No confirmed contacts yet."
              : "Nothing declined."}
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
              style={{
                borderColor: "color-mix(in oklab, var(--dawn-gold) 25%, transparent)",
                background: "color-mix(in oklab, var(--dawn-deep) 30%, transparent)",
              }}
            >
              <div className="min-w-0">
                <p className="font-serif text-base" style={{ color: "var(--dawn-parchment)" }}>
                  {r.display_name}
                  {r.role_title && (
                    <span className="ml-2 text-xs opacity-70">· {r.role_title}</span>
                  )}
                  {r.organization && (
                    <span className="ml-2 text-xs opacity-60">@ {r.organization}</span>
                  )}
                </p>
                {r.mention_context && (
                  <p className="mt-0.5 text-xs italic opacity-80">"{r.mention_context}"</p>
                )}
                <p className="mt-1 text-[10px] uppercase tracking-[0.25em] opacity-55">
                  {r.mentioned_by_soul ? `proposed by ${r.mentioned_by_soul}` : "added directly"}
                </p>
              </div>
              {open === "pending" && (
                <div className="flex flex-none gap-2 self-end sm:self-start">
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => onConfirm(r.id)}
                    className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.25em] transition-all hover:scale-[1.05] disabled:opacity-50"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--dawn-gold) 0%, var(--dawn-gold-bright) 100%)",
                      color: "var(--dawn-ink)",
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => onDecline(r.id)}
                    className="rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.25em] transition-all hover:scale-[1.05] disabled:opacity-50"
                    style={{
                      borderColor: "color-mix(in oklab, var(--dawn-ember) 60%, transparent)",
                      color: "var(--dawn-parchment)",
                    }}
                  >
                    Decline
                  </button>
                </div>
              )}
              {open === "declined" && (
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => onConfirm(r.id)}
                  className="self-end rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.25em] transition-all hover:scale-[1.05] disabled:opacity-50 sm:self-start"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--dawn-gold) 0%, var(--dawn-gold-bright) 100%)",
                    color: "var(--dawn-ink)",
                  }}
                >
                  Restore
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
