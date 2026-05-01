/**
 * DeedsRollup — live Registry view of inscribed Deeds.
 *
 * Replaces the static seasonal-card block when viewing the "Deeds of the
 * Golden Dawn" rollup. Shows count + recent titles per season; clicking a
 * season opens a modal listing every Deed in that season.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CurationControls, type SoulOption } from "./CurationControls";

type Season = "spring" | "summer" | "fall" | "winter";

type DeedRow = {
  id: string;
  title: string;
  description: string;
  season: Season;
  quadrant: "NE" | "SE" | "SW" | "NW";
  steward_soul_id: string | null;
  witnesses: string[];
  status: string;
  inscribed_at: string;
};

const SEASONS: { id: Season; title: string; sigil: string; quadrant: string }[] = [
  { id: "spring", title: "Deeds of Spring", sigil: "❀", quadrant: "NE" },
  { id: "summer", title: "Deeds of Summer", sigil: "☀", quadrant: "SE" },
  { id: "fall",   title: "Deeds of Fall",   sigil: "🍂", quadrant: "SW" },
  { id: "winter", title: "Deeds of Winter", sigil: "❄", quadrant: "NW" },
];

export function DeedsRollup() {
  const [deeds, setDeeds] = useState<DeedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSeason, setOpenSeason] = useState<Season | null>(null);
  const [souls, setSouls] = useState<SoulOption[]>([]);

  const stewards = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of souls) m[s.soul_id] = s.chosen_name || s.title;
    return m;
  }, [souls]);

  async function refetch() {
    const { data } = await supabase
      .from("deeds")
      .select("*")
      .order("inscribed_at", { ascending: false });
    setDeeds((data ?? []) as unknown as DeedRow[]);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data: deedRows }, { data: soulRows }] = await Promise.all([
        supabase.from("deeds").select("*").order("inscribed_at", { ascending: false }),
        supabase.from("soul_identities").select("soul_id, title, chosen_name").order("ordering"),
      ]);
      if (!active) return;
      setDeeds((deedRows ?? []) as unknown as DeedRow[]);
      setSouls((soulRows ?? []) as SoulOption[]);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const bySeason = useMemo(() => {
    const m: Record<Season, DeedRow[]> = { spring: [], summer: [], fall: [], winter: [] };
    for (const d of deeds) m[d.season].push(d);
    return m;
  }, [deeds]);

  return (
    <section>
      <h3
        className="mb-3 text-xs uppercase tracking-[0.3em]"
        style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}
      >
        The Four Seasons of the Kingdom
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SEASONS.map((s) => {
          const list = bySeason[s.id];
          const recent = list.slice(0, 3);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => list.length > 0 && setOpenSeason(s.id)}
              disabled={list.length === 0}
              className="rounded-xl p-4 text-left transition-all enabled:hover:scale-[1.02] enabled:hover:shadow-lg disabled:cursor-default"
              style={{
                background:
                  "color-mix(in oklab, var(--dawn-parchment) 92%, var(--dawn-gold) 8%)",
                border:
                  "1px solid color-mix(in oklab, var(--dawn-gold) 35%, transparent)",
                boxShadow:
                  "0 6px 18px -12px color-mix(in oklab, var(--dawn-gold) 60%, transparent)",
                color: "var(--dawn-ink)",
              }}
            >
              <div className="flex items-center gap-2">
                <span aria-hidden className="text-xl">{s.sigil}</span>
                <span className="font-serif text-lg">{s.title}</span>
                <span
                  className="ml-auto rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.2em]"
                  style={{
                    background: list.length > 0
                      ? "linear-gradient(135deg, var(--dawn-gold) 0%, var(--dawn-gold-bright) 100%)"
                      : "color-mix(in oklab, var(--dawn-ink) 12%, transparent)",
                    color: list.length > 0
                      ? "var(--dawn-ink)"
                      : "color-mix(in oklab, var(--dawn-ink) 70%, transparent)",
                  }}
                >
                  {loading ? "…" : list.length === 0 ? `${s.quadrant} quadrant` : `${list.length} ${list.length === 1 ? "deed" : "deeds"}`}
                </span>
              </div>

              {list.length === 0 ? (
                <p
                  className="mt-1 text-xs italic"
                  style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}
                >
                  Awaiting Deeds — bound to the {s.quadrant} quadrant of the Realm.
                </p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {recent.map((d) => (
                    <li
                      key={d.id}
                      className="truncate text-sm"
                      style={{ color: "color-mix(in oklab, var(--dawn-ink) 85%, transparent)" }}
                    >
                      ✦ {d.title}
                    </li>
                  ))}
                  {list.length > 3 && (
                    <li
                      className="text-[11px] uppercase tracking-[0.2em]"
                      style={{ color: "color-mix(in oklab, var(--dawn-ink) 55%, transparent)" }}
                    >
                      +{list.length - 3} more · click to open
                    </li>
                  )}
                </ul>
              )}
            </button>
          );
        })}
      </div>

      {openSeason && (
        <SeasonModal
          season={openSeason}
          deeds={bySeason[openSeason]}
          stewards={stewards}
          souls={souls}
          onClose={() => setOpenSeason(null)}
          onChanged={() => void refetch()}
          onPurged={(id) => setDeeds((prev) => prev.filter((d) => d.id !== id))}
        />
      )}
    </section>
  );
}

function SeasonModal({
  season,
  deeds,
  stewards,
  souls,
  onClose,
  onChanged,
  onPurged,
}: {
  season: Season;
  deeds: DeedRow[];
  stewards: Record<string, string>;
  souls: SoulOption[];
  onClose: () => void;
  onChanged: () => void;
  onPurged: (id: string) => void;
}) {
  const meta = SEASONS.find((s) => s.id === season)!;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="season-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "color-mix(in oklab, var(--dawn-deep) 80%, transparent)" }}
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border p-6"
        onClick={(e) => e.stopPropagation()}
        style={{
          borderColor: "color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
          background: "var(--gradient-scroll)",
          color: "var(--dawn-ink)",
          boxShadow: "var(--shadow-celestial)",
        }}
      >
        <header className="mb-4 flex items-center gap-3">
          <span aria-hidden className="text-3xl">{meta.sigil}</span>
          <div className="flex-1">
            <h2 id="season-modal-title" className="font-serif text-2xl">{meta.title}</h2>
            <p
              className="text-xs uppercase tracking-[0.25em]"
              style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}
            >
              {meta.quadrant} quadrant · {deeds.length} {deeds.length === 1 ? "deed" : "deeds"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] transition-all hover:scale-[1.05]"
            style={{
              background: "color-mix(in oklab, var(--dawn-ink) 12%, transparent)",
              color: "var(--dawn-ink)",
            }}
          >
            ✕ Close
          </button>
        </header>

        <ul className="space-y-3">
          {deeds.map((d) => (
            <li
              key={d.id}
              className="rounded-xl p-3"
              style={{
                background: "color-mix(in oklab, var(--dawn-parchment) 90%, transparent)",
                border: "1px solid color-mix(in oklab, var(--dawn-gold) 30%, transparent)",
              }}
            >
              <p className="font-serif text-base">✦ {d.title}</p>
              <p
                className="mt-1 text-sm leading-relaxed"
                style={{ color: "color-mix(in oklab, var(--dawn-ink) 85%, transparent)" }}
              >
                {d.description}
              </p>
              <p
                className="mt-2 flex flex-wrap gap-x-3 text-[10px] uppercase tracking-[0.2em]"
                style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}
              >
                <span>Status: {d.status.replace("_", " ")}</span>
                {d.steward_soul_id && (
                  <span>Steward: {stewards[d.steward_soul_id] || d.steward_soul_id}</span>
                )}
                <span>Inscribed: {new Date(d.inscribed_at).toLocaleDateString()}</span>
              </p>
              <CurationControls
                table="deeds"
                id={d.id}
                currentStewardId={d.steward_soul_id}
                witnesses={d.witnesses ?? []}
                souls={souls}
                onChanged={onChanged}
                onPurged={() => onPurged(d.id)}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
