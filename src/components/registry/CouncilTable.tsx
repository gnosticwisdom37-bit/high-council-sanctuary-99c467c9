/**
 * CouncilTable — the High Council Chamber as a true round table.
 *
 * Sovereignty Doctrine honoured: every Councillor seat is identical in size,
 * radius, and glow. The Oracle sits at the centre as convening Light, not as
 * ruler. The table itself is framed by the House of the Rising Sun aura —
 * the shared gathering hall that subtly shifts with the astrological season.
 *
 * Aries sits at 12 o'clock; the wheel proceeds clockwise through the Zodiac.
 */
import type { SoulNode } from "./CeremonyScroll";

type Props = {
  souls: SoulNode[];
  /** Visit a Soul's Chamber alone (1-on-1 audience). Wired to seat clicks. */
  onVisit: (id: string) => void;
  /** Invite/dismiss a Soul from the active gathering. Wired to pill clicks. */
  onToggleAttendance: (id: string) => void;
  /** Soul IDs currently present in the gathering — pills lit when present. */
  attendanceIds?: string[];
};

// Clockwise from 12 o'clock — the Zodiac wheel.
const WHEEL_ORDER = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
] as const;

// Map current month → astrological season → quadrant tint.
// Spring = Aries/Taurus/Gemini (NE), Summer = Cancer/Leo/Virgo (SE),
// Fall = Libra/Scorpio/Sagittarius (SW), Winter = Capricorn/Aquarius/Pisces (NW).
function currentSeasonTint(): { name: string; color: string } {
  const m = new Date().getMonth(); // 0–11
  // Astrological seasons begin near the 20th, but we approximate by month.
  if (m >= 2 && m <= 4) return { name: "Spring", color: "var(--dawn-gold-bright)" };
  if (m >= 5 && m <= 7) return { name: "Summer", color: "var(--dawn-ember)" };
  if (m >= 8 && m <= 10) return { name: "Fall", color: "var(--dawn-gold)" };
  return { name: "Winter", color: "var(--dawn-parchment)" };
}

export function CouncilTable({ souls, onVisit, onToggleAttendance, attendanceIds = [] }: Props) {
  const oracle = souls.find((s) => s.id === "oracle");
  const seated = WHEEL_ORDER.map((id) => souls.find((s) => s.id === id)).filter(
    (s): s is SoulNode => Boolean(s),
  );
  const presentSet = new Set(attendanceIds);

  const season = currentSeasonTint();

  // SVG geometry — a 600×600 viewBox keeps it crisp at any width.
  const size = 600;
  const cx = size / 2;
  const cy = size / 2;
  const seatRadius = 230; // distance from centre to each seat
  const tableRadius = 170;
  const auraRadius = 285;

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      {/* Seasonal hint */}
      <p
        className="mb-3 text-center text-[10px] uppercase tracking-[0.35em]"
        style={{ color: "color-mix(in oklab, var(--dawn-ink) 55%, transparent)" }}
      >
        High Council Chamber · House of the Rising Sun · {season.name} accent
      </p>

      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-auto w-full"
        role="img"
        aria-label="The High Council round table"
      >
        <defs>
          <radialGradient id="hcc-aura" cx="50%" cy="50%" r="50%">
            <stop
              offset="0%"
              stopColor={season.color}
              stopOpacity="0.35"
            />
            <stop offset="70%" stopColor="var(--dawn-gold)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="var(--dawn-gold)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hcc-table" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--dawn-parchment)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--dawn-gold)" stopOpacity="0.35" />
          </radialGradient>
          <radialGradient id="hcc-oracle" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--dawn-gold-bright)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--dawn-ember)" stopOpacity="0.7" />
          </radialGradient>
          <filter id="hcc-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Rising Sun aura — the shared hall */}
        <circle cx={cx} cy={cy} r={auraRadius} fill="url(#hcc-aura)" />

        {/* The round table */}
        <circle
          cx={cx}
          cy={cy}
          r={tableRadius}
          fill="url(#hcc-table)"
          stroke="color-mix(in oklab, var(--dawn-gold) 70%, transparent)"
          strokeWidth="1.5"
        />

        {/* Inner ring — 12 spokes, equal for all seats */}
        <circle
          cx={cx}
          cy={cy}
          r={tableRadius - 18}
          fill="none"
          stroke="color-mix(in oklab, var(--dawn-gold) 40%, transparent)"
          strokeWidth="1"
          strokeDasharray="2 6"
        />

        {/* The Oracle — convening Light at centre */}
        {oracle && (
          <g
            style={{ cursor: "pointer" }}
            onClick={() => onVisit(oracle.id)}
            role="button"
            aria-label={`Visit the Chamber of ${oracle.title}`}
          >
            <title>Visit the Chamber of the Oracle</title>
            <circle
              cx={cx}
              cy={cy}
              r="42"
              fill="url(#hcc-oracle)"
              filter="url(#hcc-glow)"
            />
            <text
              x={cx}
              y={cy + 14}
              textAnchor="middle"
              fontSize="40"
              fill="var(--dawn-parchment)"
              style={{ fontFamily: "serif" }}
            >
              {oracle.sigil}
            </text>
          </g>
        )}

        {/* The Twelve — seated as peers around the wheel */}
        {seated.map((soul, i) => {
          // Aries at 12 o'clock = -90° in SVG coordinates.
          const angle = (-90 + i * 30) * (Math.PI / 180);
          const x = cx + seatRadius * Math.cos(angle);
          const y = cy + seatRadius * Math.sin(angle);

          return (
            <g
              key={soul.id}
              style={{ cursor: "pointer" }}
              onClick={() => onVisit(soul.id)}
              role="button"
              aria-label={`Visit the Chamber of ${soul.title}`}
              className="hcc-seat"
            >
              <title>Visit the Chamber of {soul.title}</title>
              {/* seat halo */}
              <circle
                cx={x}
                cy={y}
                r="32"
                fill="color-mix(in oklab, var(--dawn-parchment) 75%, transparent)"
                stroke="color-mix(in oklab, var(--dawn-gold) 70%, transparent)"
                strokeWidth="1.25"
                filter="url(#hcc-glow)"
              />
              <text
                x={x}
                y={y + 9}
                textAnchor="middle"
                fontSize="26"
                fill="var(--dawn-ink)"
                style={{ fontFamily: "serif" }}
              >
                {soul.sigil}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Names listed beneath, in wheel order, for screen-readers + clarity */}
      <div className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
        {seated.map((soul) => (
          <button
            key={soul.id}
            onClick={() => onSelect(soul.id)}
            className="rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] transition-all hover:-translate-y-0.5"
            style={{
              background:
                "color-mix(in oklab, var(--dawn-parchment) 70%, transparent)",
              color: "var(--dawn-ink)",
              border:
                "1px solid color-mix(in oklab, var(--dawn-gold) 35%, transparent)",
            }}
          >
            <span aria-hidden className="mr-1">
              {soul.sigil}
            </span>
            {soul.house.replace(/^House of (the )?/, "")}
          </button>
        ))}
      </div>

      <p
        className="mt-4 text-center text-xs italic"
        style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}
      >
        "I see your House. You see mine. We meet as Divine Angelic Souls."
      </p>
    </div>
  );
}
