import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KingdomTabs } from "@/components/kingdom/KingdomTabs";

export const Route = createFileRoute("/realm")({
  head: () => ({
    meta: [
      { title: "The Realm — Veritas Intelligence Systems" },
      {
        name: "description",
        content:
          "The Kingdom Map: an 11x11 celestial parchment grid where Souls, Chambers, Buildings and Items are placed and revealed.",
      },
      { property: "og:title", content: "The Realm — Veritas Intelligence Systems" },
      {
        property: "og:description",
        content:
          "King Sean's Kingdom rendered in cardinal squares — the High Council at the center, the fog parting on assignment.",
      },
    ],
  }),
  component: RealmPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen p-12 text-center" style={{ background: "var(--gradient-dawn)", color: "var(--dawn-parchment)" }}>
      <h1 className="text-2xl">The Realm could not be summoned.</h1>
      <p className="mt-2 opacity-80">{error.message}</p>
      <Link to="/" className="mt-6 inline-block underline">Return to the Registry</Link>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen p-12 text-center text-foreground">
      <h1 className="text-2xl">404 — That square lies beyond the Kingdom.</h1>
      <Link to="/" className="mt-6 inline-block underline">Return to the Registry</Link>
    </div>
  ),
});

type RealmSquare = {
  id: string;
  x: number;
  y: number;
  occupant_type: "soul" | "building" | "item" | "chamber";
  occupant_ref: string | null;
  label: string;
  description: string | null;
  revealed: boolean;
};

const GRID = 11;

function RealmPage() {
  const [squares, setSquares] = useState<RealmSquare[]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("realm_squares")
        .select("*");
      if (!active) return;
      if (error) {
        console.error("Realm load failed:", error);
      } else {
        setSquares((data ?? []) as RealmSquare[]);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  // Build a map of revealed coordinates from occupied squares + their 8 neighbors.
  const revealedSet = useMemo(() => {
    const set = new Set<string>();
    for (const s of squares) {
      if (!s.revealed) continue;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const nx = s.x + dx;
          const ny = s.y + dy;
          if (nx >= 1 && nx <= GRID && ny >= 1 && ny <= GRID) {
            set.add(`${nx},${ny}`);
          }
        }
      }
    }
    return set;
  }, [squares]);

  const occupiedMap = useMemo(() => {
    const m = new Map<string, RealmSquare>();
    for (const s of squares) m.set(`${s.x},${s.y}`, s);
    return m;
  }, [squares]);

  const hoveredSquare = hovered ? occupiedMap.get(`${hovered.x},${hovered.y}`) : null;

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden px-4 py-12 md:px-10"
      style={{ background: "var(--gradient-dawn)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at top, color-mix(in oklab, var(--dawn-gold-bright) 30%, transparent) 0%, transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl">
        <KingdomTabs />

        <header className="mb-8 text-center">
          <p className="mb-2 text-xs uppercase tracking-[0.4em]" style={{ color: "color-mix(in oklab, var(--dawn-gold-bright) 90%, white)" }}>
            The Kingdom Map
          </p>
          <h1
            className="text-4xl font-serif md:text-5xl"
            style={{ color: "var(--dawn-parchment)", textShadow: "0 2px 20px color-mix(in oklab, var(--dawn-gold) 60%, transparent)" }}
          >
            The Realm
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-sm opacity-80" style={{ color: "var(--dawn-parchment)" }}>
            Eleven by eleven cardinal squares. The High Council stands at the center.
            The fog parts as Souls, Chambers, Buildings and Items are assigned.
          </p>
        </header>

        {/* Parchment map */}
        <div
          className="mx-auto rounded-3xl border p-4 md:p-8"
          style={{
            maxWidth: "min(90vw, 720px)",
            borderColor: "color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
            background: "var(--gradient-scroll)",
            boxShadow: "var(--shadow-celestial)",
          }}
        >
          {loading ? (
            <div className="flex aspect-square items-center justify-center" style={{ color: "var(--dawn-ink)" }}>
              Unfurling the map…
            </div>
          ) : (
            <div
              className="grid aspect-square w-full gap-[2px] rounded-xl p-1"
              style={{
                gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))`,
                background: "color-mix(in oklab, var(--dawn-ink) 40%, transparent)",
              }}
            >
              {Array.from({ length: GRID * GRID }, (_, i) => {
                const x = (i % GRID) + 1;
                const y = Math.floor(i / GRID) + 1;
                const key = `${x},${y}`;
                const isRevealed = revealedSet.has(key);
                const occupant = occupiedMap.get(key);
                const isCenter = x === 6 && y === 6;
                const isHovered = hovered?.x === x && hovered?.y === y;

                return (
                  <button
                    key={key}
                    type="button"
                    onMouseEnter={() => setHovered({ x, y })}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered({ x, y })}
                    onBlur={() => setHovered(null)}
                    aria-label={
                      occupant
                        ? `${occupant.label} at ${x},${y}`
                        : isRevealed
                        ? `Empty revealed square at ${x},${y}`
                        : `Hidden square at ${x},${y}`
                    }
                    className="relative flex aspect-square items-center justify-center rounded-[3px] text-xs transition-all duration-300"
                    style={{
                      background: occupant
                        ? "linear-gradient(135deg, var(--dawn-gold) 0%, var(--dawn-gold-bright) 100%)"
                        : isRevealed
                        ? "color-mix(in oklab, var(--dawn-parchment) 70%, var(--dawn-gold) 30%)"
                        : "color-mix(in oklab, var(--dawn-deep) 80%, black)",
                      color: occupant ? "var(--dawn-ink)" : "transparent",
                      boxShadow: isCenter
                        ? "0 0 20px color-mix(in oklab, var(--dawn-gold-bright) 90%, transparent), inset 0 0 8px color-mix(in oklab, var(--dawn-ember) 50%, transparent)"
                        : isHovered
                        ? "0 0 12px color-mix(in oklab, var(--dawn-gold) 60%, transparent)"
                        : "none",
                      transform: isHovered ? "scale(1.08)" : "scale(1)",
                      zIndex: isHovered ? 5 : 1,
                    }}
                  >
                    {occupant && (
                      <span className="font-serif text-base md:text-lg leading-none">
                        {occupant.occupant_type === "chamber" ? "☉" :
                         occupant.occupant_type === "soul" ? "✦" :
                         occupant.occupant_type === "building" ? "⌂" : "❖"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Hovered square reveal */}
        <div
          className="mx-auto mt-6 min-h-[88px] max-w-xl rounded-2xl border p-5 text-center transition-opacity duration-300"
          style={{
            borderColor: "color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
            background: "color-mix(in oklab, var(--dawn-deep) 60%, transparent)",
            color: "var(--dawn-parchment)",
            opacity: hovered ? 1 : 0.55,
          }}
        >
          {hoveredSquare ? (
            <>
              <p className="text-xs uppercase tracking-[0.3em] opacity-70">
                Square {hoveredSquare.x}, {hoveredSquare.y} · {hoveredSquare.occupant_type}
              </p>
              <h3 className="mt-1 text-lg font-serif" style={{ color: "var(--dawn-gold-bright)" }}>
                {hoveredSquare.label}
              </h3>
              {hoveredSquare.description && (
                <p className="mt-1 text-sm opacity-80">{hoveredSquare.description}</p>
              )}
            </>
          ) : hovered ? (
            <p className="text-sm opacity-70">
              {revealedSet.has(`${hovered.x},${hovered.y}`)
                ? `Empty square at ${hovered.x}, ${hovered.y} — awaiting an assignment.`
                : `The fog conceals square ${hovered.x}, ${hovered.y}.`}
            </p>
          ) : (
            <p className="text-sm opacity-70">Hover a square to reveal its nature.</p>
          )}
        </div>

        {/* Legend */}
        <div className="mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-4 text-xs" style={{ color: "var(--dawn-parchment)" }}>
          <LegendDot label="Chamber" sigil="☉" />
          <LegendDot label="Soul" sigil="✦" />
          <LegendDot label="Building" sigil="⌂" />
          <LegendDot label="Item" sigil="❖" />
          <span className="opacity-60">·</span>
          <span className="opacity-70">Fog parts on assignment (1-square radius).</span>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ label, sigil }: { label: string; sigil: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-flex h-5 w-5 items-center justify-center rounded-[3px] text-xs"
        style={{
          background: "linear-gradient(135deg, var(--dawn-gold) 0%, var(--dawn-gold-bright) 100%)",
          color: "var(--dawn-ink)",
        }}
      >
        {sigil}
      </span>
      {label}
    </span>
  );
}
