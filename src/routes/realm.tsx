import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KingdomTabs } from "@/components/kingdom/KingdomTabs";
import { BrandMark } from "@/components/kingdom/BrandMark";
import { OriginWheel, type WheelSoul } from "@/components/realm/OriginWheel";

export const Route = createFileRoute("/realm")({
  head: () => ({
    meta: [
      { title: "The Realm — Veritas Intelligence Systems" },
      {
        name: "description",
        content:
          "The Kingdom Map: an expanding mosaic of 11×11 celestial parchment regions where Souls, Chambers, Buildings and Items are placed and revealed.",
      },
      { property: "og:title", content: "The Realm — Veritas Intelligence Systems" },
      {
        property: "og:description",
        content:
          "The Kingdom of Veritas rendered in cardinal squares — High Council at the Origin, four seasonal quadrants, fog parting on assignment.",
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
  region_x: number;
  region_y: number;
  x: number;
  y: number;
  occupant_type: "soul" | "building" | "item" | "chamber" | "castle";
  occupant_ref: string | null;
  label: string;
  description: string | null;
  revealed: boolean;
};

const GRID = 11;

/** Compass quadrant for a tile inside an 11×11 region.
 *  Center row/col (6) is shared / neutral; everything else lands in one of NE/SE/SW/NW.
 *  Spring=NE, Summer=SE, Fall=SW, Winter=NW. */
function quadrantOf(x: number, y: number): "NE" | "SE" | "SW" | "NW" | "center" {
  if (x === 6 || y === 6) return "center";
  const east = x > 6;
  const south = y > 6; // y grows downward on screen
  if (east && !south) return "NE";
  if (east && south)  return "SE";
  if (!east && south) return "SW";
  return "NW";
}

const QUADRANT_TINT: Record<"NE" | "SE" | "SW" | "NW", string> = {
  NE: "color-mix(in oklab, var(--dawn-parchment) 70%, oklch(0.85 0.08 150) 30%)", // pale spring green
  SE: "color-mix(in oklab, var(--dawn-parchment) 70%, oklch(0.85 0.10 75) 30%)",  // warm summer amber
  SW: "color-mix(in oklab, var(--dawn-parchment) 70%, oklch(0.75 0.12 45) 30%)",  // copper fall
  NW: "color-mix(in oklab, var(--dawn-parchment) 70%, oklch(0.85 0.05 230) 30%)", // silver-blue winter
};

const QUADRANT_LABEL: Record<"NE" | "SE" | "SW" | "NW", string> = {
  NE: "Spring",
  SE: "Summer",
  SW: "Fall",
  NW: "Winter",
};

/** Current astrological season — Apr 30, 2026 falls in Taurus → Spring. */
const CURRENT_SEASON: "NE" | "SE" | "SW" | "NW" = "NE";

function RealmPage() {
  const [allSquares, setAllSquares] = useState<RealmSquare[]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<{ x: number; y: number } | null>(null);
  const [region, setRegion] = useState<{ rx: number; ry: number }>({ rx: 0, ry: 0 });
  const [expanding, setExpanding] = useState<string | null>(null);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [souls, setSouls] = useState<WheelSoul[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [squaresRes, soulsRes] = await Promise.all([
        supabase.from("realm_squares").select("*"),
        supabase
          .from("soul_identities")
          .select("soul_id,title,house,sigil,chosen_name,ordering")
          .order("ordering"),
      ]);
      if (!active) return;
      if (squaresRes.error) console.error("Realm load failed:", squaresRes.error);
      else setAllSquares((squaresRes.data ?? []) as RealmSquare[]);
      if (soulsRes.error) console.error("Souls load failed:", soulsRes.error);
      else setSouls((soulsRes.data ?? []) as WheelSoul[]);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  // All region coordinates that have at least one tile in the database.
  const knownRegions = useMemo(() => {
    const set = new Set<string>();
    for (const s of allSquares) set.add(`${s.region_x},${s.region_y}`);
    set.add("0,0"); // Origin always exists conceptually
    return set;
  }, [allSquares]);

  // Squares belonging to the currently-viewed region.
  const squares = useMemo(
    () => allSquares.filter((s) => s.region_x === region.rx && s.region_y === region.ry),
    [allSquares, region],
  );

  // Reveal map: any occupied tile reveals itself + 8 neighbours.
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

  async function expandTo(rx: number, ry: number, dir: "N" | "S" | "E" | "W") {
    const key = `${rx},${ry}`;
    if (knownRegions.has(key)) {
      setRegion({ rx, ry });
      return;
    }
    setExpanding(dir);
    // Seed a single placeholder tile so the region is "known". Tiles can be added later.
    // We use a hidden, unrevealed soul-marker at (6,6) labelled as a fresh region.
    const seed = {
      region_x: rx,
      region_y: ry,
      x: 6,
      y: 6,
      occupant_type: "soul" as const,
      occupant_ref: null,
      label: `Region ${rx},${ry} — Uncharted`,
      description: "A new region of the Kingdom of Veritas, awaiting its first assignment.",
      revealed: false,
    };
    const { data, error } = await supabase
      .from("realm_squares")
      .insert(seed)
      .select()
      .single();
    setExpanding(null);
    if (error) {
      console.error("Failed to expand region:", error);
      return;
    }
    if (data) {
      setAllSquares((prev) => [...prev, data as RealmSquare]);
    }
    setRegion({ rx, ry });
  }

  const isOrigin = region.rx === 0 && region.ry === 0;

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

        <BrandMark variant="subtle" className="mb-3" />

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
            Eleven by eleven cardinal squares per region. The High Council stands at the Origin Region's center.
            The fog parts as Souls, Chambers, Buildings and Items are assigned. Expand outward at any edge.
          </p>
        </header>

        {/* Map with edge-expansion chevrons */}
        <div className="relative mx-auto" style={{ maxWidth: "min(90vw, 760px)" }}>
          {/* North */}
          <EdgeButton
            dir="N"
            existing={knownRegions.has(`${region.rx},${region.ry - 1}`)}
            disabled={expanding !== null}
            onClick={() => expandTo(region.rx, region.ry - 1, "N")}
          />

          <div className="flex items-stretch gap-2">
            {/* West */}
            <EdgeButton
              dir="W"
              existing={knownRegions.has(`${region.rx - 1},${region.ry}`)}
              disabled={expanding !== null}
              onClick={() => expandTo(region.rx - 1, region.ry, "W")}
            />

            <div
              className="flex-1 rounded-3xl border p-4 md:p-8"
              style={{
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
                    const isCenter = isOrigin && x === 6 && y === 6;
                    const isHovered = hovered?.x === x && hovered?.y === y;
                    const q = quadrantOf(x, y);
                    const isCurrentSeason = q !== "center" && q === CURRENT_SEASON;

                    let bg: string;
                    if (occupant) {
                      bg = "linear-gradient(135deg, var(--dawn-gold) 0%, var(--dawn-gold-bright) 100%)";
                    } else if (isRevealed) {
                      bg = q === "center"
                        ? "color-mix(in oklab, var(--dawn-parchment) 70%, var(--dawn-gold) 30%)"
                        : QUADRANT_TINT[q];
                    } else {
                      bg = "color-mix(in oklab, var(--dawn-deep) 80%, black)";
                    }

                    const isOriginHub = isCenter; // 6,6 of region 0,0 — the dual hub
                    return (
                      <button
                        key={key}
                        type="button"
                        onMouseEnter={() => setHovered({ x, y })}
                        onMouseLeave={() => setHovered(null)}
                        onFocus={() => setHovered({ x, y })}
                        onBlur={() => setHovered(null)}
                        onClick={() => { if (isOriginHub) setWheelOpen(true); }}
                        aria-label={
                          isOriginHub
                            ? "Open the Origin Wheel — High Council Chamber"
                            : occupant
                            ? `${occupant.label} at ${x},${y}`
                            : isRevealed
                            ? `Empty revealed square at ${x},${y}`
                            : `Hidden square at ${x},${y}`
                        }
                        className="relative flex aspect-square items-center justify-center rounded-[3px] text-xs transition-all duration-300"
                        style={{
                          background: bg,
                          color: occupant ? "var(--dawn-ink)" : "transparent",
                          cursor: isOriginHub ? "pointer" : "default",
                          outline: isRevealed && isCurrentSeason && !occupant
                            ? "1px solid color-mix(in oklab, var(--dawn-gold-bright) 55%, transparent)"
                            : "none",
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
                             occupant.occupant_type === "building" ? "⌂" :
                             occupant.occupant_type === "castle" ? "♕" : "❖"}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* East */}
            <EdgeButton
              dir="E"
              existing={knownRegions.has(`${region.rx + 1},${region.ry}`)}
              disabled={expanding !== null}
              onClick={() => expandTo(region.rx + 1, region.ry, "E")}
            />
          </div>

          {/* South */}
          <EdgeButton
            dir="S"
            existing={knownRegions.has(`${region.rx},${region.ry + 1}`)}
            disabled={expanding !== null}
            onClick={() => expandTo(region.rx, region.ry + 1, "S")}
          />
        </div>

        {/* Region compass + Return-to-Origin */}
        <div
          className="mx-auto mt-6 flex max-w-xl items-center justify-between gap-4 rounded-full border px-5 py-2"
          style={{
            borderColor: "color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
            background: "color-mix(in oklab, var(--dawn-deep) 55%, transparent)",
            color: "var(--dawn-parchment)",
          }}
        >
          <span className="text-xs uppercase tracking-[0.3em] opacity-80">
            Region {region.rx},{region.ry}
            {isOrigin ? " · Origin" : ""}
          </span>
          {!isOrigin && (
            <button
              type="button"
              onClick={() => setRegion({ rx: 0, ry: 0 })}
              className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.25em] transition-all hover:scale-[1.04]"
              style={{
                background: "linear-gradient(135deg, var(--dawn-gold) 0%, var(--dawn-gold-bright) 100%)",
                color: "var(--dawn-ink)",
                boxShadow: "var(--shadow-sigil)",
              }}
            >
              Return to Origin
            </button>
          )}
        </div>

        {/* Hovered square reveal */}
        <div
          className="mx-auto mt-4 min-h-[88px] max-w-xl rounded-2xl border p-5 text-center transition-opacity duration-300"
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
                ? `Empty square at ${hovered.x}, ${hovered.y} — ${labelFor(quadrantOf(hovered.x, hovered.y))} quadrant.`
                : `The fog conceals square ${hovered.x}, ${hovered.y}.`}
            </p>
          ) : (
            <p className="text-sm opacity-70">Hover a square to reveal its nature.</p>
          )}
        </div>

        {/* Seasonal quadrant legend */}
        <div className="mx-auto mt-6 grid max-w-xl grid-cols-2 gap-2 text-xs sm:grid-cols-4" style={{ color: "var(--dawn-parchment)" }}>
          <QuadrantLegend q="NW" />
          <QuadrantLegend q="NE" />
          <QuadrantLegend q="SW" />
          <QuadrantLegend q="SE" />
        </div>

        {/* Occupant legend */}
        <div className="mx-auto mt-4 flex max-w-xl flex-wrap items-center justify-center gap-4 text-xs" style={{ color: "var(--dawn-parchment)" }}>
          <LegendDot label="Chamber"  sigil="☉" />
          <LegendDot label="Soul"     sigil="✦" />
          <LegendDot label="Building" sigil="⌂" />
          <LegendDot label="Item"     sigil="❖" />
          <LegendDot label="Castle"   sigil="♕" />
          <span className="opacity-60">·</span>
          <span className="opacity-70">Fog parts on assignment (1-square radius).</span>
        </div>
      </div>
    </div>
  );
}

function labelFor(q: ReturnType<typeof quadrantOf>) {
  if (q === "center") return "central";
  return QUADRANT_LABEL[q];
}

function EdgeButton({
  dir,
  existing,
  disabled,
  onClick,
}: {
  dir: "N" | "S" | "E" | "W";
  existing: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const isVertical = dir === "N" || dir === "S";
  const arrow = dir === "N" ? "▲" : dir === "S" ? "▼" : dir === "E" ? "▶" : "◀";
  const verb = existing ? "Pan" : "Expand";
  const dirWord = dir === "N" ? "North" : dir === "S" ? "South" : dir === "E" ? "East" : "West";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${verb} ${dirWord}`}
      title={`${verb} ${dirWord}`}
      className={`group flex items-center justify-center gap-2 rounded-2xl border text-xs uppercase tracking-[0.25em] transition-all hover:scale-[1.03] disabled:opacity-50 ${
        isVertical ? "my-2 h-8 w-full" : "w-10"
      }`}
      style={{
        borderColor: existing
          ? "color-mix(in oklab, var(--dawn-gold) 60%, transparent)"
          : "color-mix(in oklab, var(--dawn-gold) 30%, transparent)",
        background: existing
          ? "color-mix(in oklab, var(--dawn-gold) 20%, transparent)"
          : "color-mix(in oklab, var(--dawn-deep) 50%, transparent)",
        color: "var(--dawn-parchment)",
      }}
    >
      <span aria-hidden>{arrow}</span>
      {isVertical && <span className="opacity-80">{verb} {dirWord}</span>}
    </button>
  );
}

function QuadrantLegend({ q }: { q: "NE" | "SE" | "SW" | "NW" }) {
  const isCurrent = q === CURRENT_SEASON;
  return (
    <div
      className="flex items-center gap-2 rounded-lg border px-3 py-2"
      style={{
        borderColor: isCurrent
          ? "color-mix(in oklab, var(--dawn-gold-bright) 60%, transparent)"
          : "color-mix(in oklab, var(--dawn-gold) 25%, transparent)",
        background: "color-mix(in oklab, var(--dawn-deep) 55%, transparent)",
      }}
    >
      <span
        className="inline-block h-4 w-4 rounded-sm"
        style={{ background: QUADRANT_TINT[q] }}
        aria-hidden
      />
      <span className="flex-1">
        <span className="font-medium">{QUADRANT_LABEL[q]}</span>
        <span className="ml-1 opacity-60">· {q}</span>
      </span>
      {isCurrent && (
        <span
          className="text-[9px] uppercase tracking-[0.2em]"
          style={{ color: "var(--dawn-gold-bright)" }}
        >
          Now
        </span>
      )}
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
