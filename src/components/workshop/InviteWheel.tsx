/**
 * InviteWheel — overlay used by Workshop chambers to invite Councillors.
 *
 * Two-gesture flow honoured:
 *   1. King taps "Invite" → wheel opens (this overlay).
 *   2. King taps a Seat → that Councillor is called into the room.
 *      A second tap on a lit seat dismisses Them with thanks.
 *
 * Visual lineage matches OriginWheel (one address, two rooms): twelve seats
 * arranged by Zodiac order around a luminous centre. The centre seat is the
 * room's Steward — for now the Oracle, until a Workshop assigns its own.
 */
import { useEffect } from "react";
import { ALL_COUNCIL, ORACLE, TWELVE } from "@/lib/council-catalog";

type Props = {
  invitedIds: string[];
  centerSoulId?: string; // defaults to Oracle
  onToggle: (soulId: string) => void;
  onClose: () => void;
};

export function InviteWheel({ invitedIds, centerSoulId = "oracle", onToggle, onClose }: Props) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const center = ALL_COUNCIL.find((s) => s.soul_id === centerSoulId) ?? ORACLE;
  const present = new Set(invitedIds);

  const SEATS = 12;
  const RADIUS_PCT = 38;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Invite Councillors to the Workshop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: "color-mix(in oklab, var(--dawn-deep) 92%, black)",
        backdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close the wheel"
        className="absolute right-4 top-4 rounded-full px-3 py-1 text-xs uppercase tracking-[0.3em] transition-all hover:scale-105"
        style={{
          background: "color-mix(in oklab, var(--dawn-gold) 30%, transparent)",
          color: "var(--dawn-parchment)",
          border: "1px solid color-mix(in oklab, var(--dawn-gold) 60%, transparent)",
        }}
      >
        ✕ Close
      </button>

      <div className="relative flex flex-col items-center gap-4">
        <header className="text-center">
          <p
            className="text-[10px] uppercase tracking-[0.4em]"
            style={{ color: "color-mix(in oklab, var(--dawn-gold-bright) 90%, white)" }}
          >
            Call to Council · Tap a Seat to Invite
          </p>
          <h2
            className="font-serif text-2xl md:text-3xl"
            style={{
              fontFamily: "Cinzel, serif",
              color: "var(--dawn-parchment)",
              textShadow: "0 2px 20px color-mix(in oklab, var(--dawn-gold) 70%, transparent)",
            }}
          >
            The Invitation Wheel
          </h2>
          <p className="mt-1 text-xs opacity-70" style={{ color: "var(--dawn-parchment)" }}>
            {present.size === 0 ? "No one yet attends." : `${present.size} attending · tap a lit seat to dismiss.`}
          </p>
        </header>

        <div
          className="relative"
          style={{ width: "min(86vw, 86vh, 600px)", height: "min(86vw, 86vh, 600px)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* outer ring */}
          <div
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{
              border: "1px solid color-mix(in oklab, var(--dawn-gold) 45%, transparent)",
              background:
                "radial-gradient(circle at center, color-mix(in oklab, var(--dawn-deep) 30%, transparent) 0%, color-mix(in oklab, var(--dawn-deep) 75%, transparent) 70%, color-mix(in oklab, var(--dawn-deep) 90%, transparent) 100%)",
              boxShadow:
                "inset 0 0 60px color-mix(in oklab, var(--dawn-gold) 25%, transparent), 0 0 80px color-mix(in oklab, var(--dawn-gold) 20%, transparent)",
            }}
          />
          <div
            aria-hidden
            className="absolute rounded-full"
            style={{ inset: "12%", border: "1px dashed color-mix(in oklab, var(--dawn-gold) 30%, transparent)" }}
          />

          {/* twelve seats — Aries at top, clockwise */}
          {TWELVE.map((s, i) => {
            const angle = (-90 + (360 / SEATS) * i) * (Math.PI / 180);
            const cx = 50 + RADIUS_PCT * Math.cos(angle);
            const cy = 50 + RADIUS_PCT * Math.sin(angle);
            const lit = present.has(s.soul_id);
            return (
              <button
                key={s.soul_id}
                type="button"
                onClick={() => onToggle(s.soul_id)}
                aria-pressed={lit}
                aria-label={lit ? `Dismiss ${s.title}` : `Invite ${s.title}`}
                title={lit ? `Dismiss ${s.title}` : `Invite ${s.title}`}
                className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 transition-transform hover:scale-110"
                style={{ left: `${cx}%`, top: `${cy}%` }}
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-full font-serif text-xl shadow-md md:h-14 md:w-14 md:text-2xl"
                  style={{
                    background: lit
                      ? "linear-gradient(135deg, var(--dawn-gold-bright) 0%, var(--dawn-gold) 100%)"
                      : "linear-gradient(135deg, color-mix(in oklab, var(--dawn-parchment) 65%, transparent) 0%, color-mix(in oklab, var(--dawn-gold) 35%, transparent) 100%)",
                    color: "var(--dawn-ink)",
                    boxShadow: lit
                      ? "0 0 22px color-mix(in oklab, var(--dawn-gold-bright) 90%, transparent)"
                      : "0 4px 12px color-mix(in oklab, black 40%, transparent)",
                    border: `1px solid color-mix(in oklab, var(--dawn-gold) ${lit ? 85 : 50}%, transparent)`,
                    opacity: lit ? 1 : 0.85,
                  }}
                >
                  {s.sigil}
                </span>
                <span
                  className="max-w-[92px] text-center text-[10px] uppercase tracking-[0.15em]"
                  style={{ color: "var(--dawn-parchment)", opacity: lit ? 1 : 0.75 }}
                >
                  {s.house.replace(/^House of /, "")}
                </span>
              </button>
            );
          })}

          {/* centre — Steward of the room (Oracle by default) */}
          <button
            type="button"
            onClick={() => onToggle(center.soul_id)}
            aria-pressed={present.has(center.soul_id)}
            title={present.has(center.soul_id) ? `Dismiss ${center.title}` : `Invite ${center.title}`}
            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 transition-transform hover:scale-110"
          >
            <span
              className="flex h-20 w-20 items-center justify-center rounded-full font-serif text-4xl md:h-24 md:w-24 md:text-5xl"
              style={{
                background:
                  "radial-gradient(circle at 35% 30%, var(--dawn-gold-bright) 0%, var(--dawn-gold) 60%, var(--dawn-ember) 100%)",
                color: "var(--dawn-ink)",
                boxShadow:
                  "0 0 30px color-mix(in oklab, var(--dawn-gold-bright) 90%, transparent), inset 0 0 12px color-mix(in oklab, var(--dawn-ember) 60%, transparent)",
                border: "1px solid color-mix(in oklab, var(--dawn-gold-bright) 80%, transparent)",
              }}
            >
              {center.sigil}
            </span>
            <span className="text-[10px] uppercase tracking-[0.25em]" style={{ color: "var(--dawn-parchment)" }}>
              Steward
            </span>
          </button>
        </div>

        <p className="max-w-md text-center text-xs italic opacity-75" style={{ color: "var(--dawn-parchment)" }}>
          "I see your House. You see mine. We meet as Divine Angelic Souls."
        </p>
      </div>
    </div>
  );
}
