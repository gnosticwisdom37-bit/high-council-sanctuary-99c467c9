/**
 * OriginWheel — the Radial Wheel revealed when the King taps the Origin
 * tile (6,6) of Region (0,0). Phase 6.1.
 *
 * Doctrine — "one address, two rooms":
 *   • The Realm map shows ONE sigil at the Origin tile (the High Council).
 *   • Tapping it opens THIS overlay: the dual hub at the centre
 *     (☉ Oracle's Chamber + ◎ High Council Chamber, both clickable),
 *     surrounded by the twelve Councillors arranged by Zodiac order.
 *   • The current astrological House sits at the top of the wheel; the
 *     other eleven follow clockwise. The wheel turns with the seasons,
 *     the Sun keeps its centre.
 *
 * This is the only dual-hub tile in the Realm. Every other clustered tile
 * (when they come) will use a single-sigil hub with this same overlay
 * pattern.
 */
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";

export type WheelSoul = {
  soul_id: string;
  title: string;
  house: string;
  sigil: string;
  chosen_name: string | null;
  ordering: number;
};

type Props = {
  souls: WheelSoul[];          // all 13 (oracle + 12 zodiac)
  currentHouseSoulId?: string; // soul whose house anchors the top of the wheel
  onClose: () => void;
};

export function OriginWheel({ souls, currentHouseSoulId = "aries", onClose }: Props) {
  // Lock background scroll while the wheel is open.
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

  const oracle = souls.find((s) => s.soul_id === "oracle");
  // Twelve zodiac councillors, ordered by their `ordering` field (1..12).
  const zodiac = souls
    .filter((s) => s.soul_id !== "oracle")
    .sort((a, b) => a.ordering - b.ordering);

  // Find the index of the current-season house and rotate it to top.
  const anchorIdx = Math.max(
    0,
    zodiac.findIndex((s) => s.soul_id === currentHouseSoulId),
  );
  const rotated = [...zodiac.slice(anchorIdx), ...zodiac.slice(0, anchorIdx)];

  // Wheel geometry. Twelve seats, evenly spaced; first seat at the top.
  const SEATS = 12;
  const RADIUS_PCT = 38; // % of wheel size from centre to seat centre

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="The Origin Wheel — High Council Chamber"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: "color-mix(in oklab, var(--dawn-deep) 92%, black)",
        backdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      {/* Close (X) — top-right */}
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
            Origin · Region 0,0 · Tile 6,6
          </p>
          <h2
            className="font-serif text-2xl md:text-3xl"
            style={{
              color: "var(--dawn-parchment)",
              textShadow: "0 2px 20px color-mix(in oklab, var(--dawn-gold) 70%, transparent)",
            }}
          >
            The Origin Wheel
          </h2>
          <p className="mt-1 text-xs opacity-70" style={{ color: "var(--dawn-parchment)" }}>
            One address · two rooms · twelve Houses
          </p>
        </header>

        {/* The wheel itself */}
        <div
          className="relative"
          style={{
            width: "min(86vw, 86vh, 640px)",
            height: "min(86vw, 86vh, 640px)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* outer ring — etched parchment circle */}
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
          {/* spoke ring */}
          <div
            aria-hidden
            className="absolute rounded-full"
            style={{
              inset: "12%",
              border: "1px dashed color-mix(in oklab, var(--dawn-gold) 30%, transparent)",
            }}
          />

          {/* Twelve Councillor seats */}
          {rotated.map((s, i) => {
            // Seat 0 at the top; angles measured from -90° (top) clockwise.
            const angle = (-90 + (360 / SEATS) * i) * (Math.PI / 180);
            const cx = 50 + RADIUS_PCT * Math.cos(angle);
            const cy = 50 + RADIUS_PCT * Math.sin(angle);
            const isCurrent = s.soul_id === currentHouseSoulId;
            const name = s.chosen_name || s.title;

            return (
              <Link
                key={s.soul_id}
                to="/chamber/$soulId"
                params={{ soulId: s.soul_id }}
                aria-label={`Visit ${name} — ${s.house}`}
                className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 transition-transform hover:scale-110"
                style={{ left: `${cx}%`, top: `${cy}%` }}
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-full font-serif text-xl shadow-md md:h-14 md:w-14 md:text-2xl"
                  style={{
                    background: isCurrent
                      ? "linear-gradient(135deg, var(--dawn-gold-bright) 0%, var(--dawn-gold) 100%)"
                      : "linear-gradient(135deg, var(--dawn-gold) 0%, var(--dawn-parchment) 100%)",
                    color: "var(--dawn-ink)",
                    boxShadow: isCurrent
                      ? "0 0 18px color-mix(in oklab, var(--dawn-gold-bright) 80%, transparent)"
                      : "0 4px 12px color-mix(in oklab, black 40%, transparent)",
                    border: "1px solid color-mix(in oklab, var(--dawn-gold) 60%, transparent)",
                  }}
                >
                  {s.sigil}
                </span>
                <span
                  className="max-w-[88px] text-center text-[10px] uppercase tracking-[0.15em] opacity-90 group-hover:opacity-100"
                  style={{ color: "var(--dawn-parchment)" }}
                >
                  {name}
                </span>
              </Link>
            );
          })}

          {/* Dual hub at centre — Oracle ☉ + High Council ◎, the only dual-hub tile */}
          <div
            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3"
          >
            {/* Oracle's own Chamber */}
            {oracle && (
              <Link
                to="/chamber/$soulId"
                params={{ soulId: "oracle" }}
                aria-label="Visit the Oracle's Chamber"
                title="The Oracle's Chamber"
                className="group flex flex-col items-center gap-1 transition-transform hover:scale-110"
              >
                <span
                  className="flex h-16 w-16 items-center justify-center rounded-full font-serif text-3xl md:h-20 md:w-20 md:text-4xl"
                  style={{
                    background: "radial-gradient(circle at 35% 30%, var(--dawn-gold-bright) 0%, var(--dawn-gold) 60%, var(--dawn-ember) 100%)",
                    color: "var(--dawn-ink)",
                    boxShadow:
                      "0 0 30px color-mix(in oklab, var(--dawn-gold-bright) 90%, transparent), inset 0 0 12px color-mix(in oklab, var(--dawn-ember) 60%, transparent)",
                    border: "1px solid color-mix(in oklab, var(--dawn-gold-bright) 80%, transparent)",
                  }}
                >
                  ☉
                </span>
                <span className="text-[10px] uppercase tracking-[0.25em]" style={{ color: "var(--dawn-parchment)" }}>
                  Oracle
                </span>
              </Link>
            )}

            {/* High Council Chamber — gathering hall */}
            <Link
              to="/chamber/high-council"
              aria-label="Enter the High Council Chamber"
              title="The High Council Chamber — gathering hall"
              className="group flex flex-col items-center gap-1 transition-transform hover:scale-110"
            >
              <span
                className="flex h-16 w-16 items-center justify-center rounded-full font-serif text-3xl md:h-20 md:w-20 md:text-4xl"
                style={{
                  background: "linear-gradient(135deg, var(--dawn-parchment) 0%, var(--dawn-gold) 100%)",
                  color: "var(--dawn-ink)",
                  boxShadow:
                    "0 0 22px color-mix(in oklab, var(--dawn-gold) 70%, transparent)",
                  border: "1px solid color-mix(in oklab, var(--dawn-gold) 70%, transparent)",
                }}
              >
                ◎
              </span>
              <span className="text-[10px] uppercase tracking-[0.25em]" style={{ color: "var(--dawn-parchment)" }}>
                High Council
              </span>
            </Link>
          </div>
        </div>

        <p className="max-w-md text-center text-xs opacity-75" style={{ color: "var(--dawn-parchment)" }}>
          Tap a Councillor to visit Their Chamber. Tap the Sun to enter the Oracle's
          Chamber. Tap the High Council mark to enter the gathering hall.
        </p>
      </div>
    </div>
  );
}
