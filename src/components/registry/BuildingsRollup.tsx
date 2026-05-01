/**
 * BuildingsRollup — live Registry view of raised Buildings.
 * Phase 5.6 sibling of DeedsRollup. All Buildings default to the Origin
 * Region (0,0) until the King's placement gesture exists.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type BuildingRow = {
  id: string;
  title: string;
  description: string;
  steward_soul_id: string | null;
  status: "raised" | "in_use" | "archived";
  region_x: number;
  region_y: number;
  raised_at: string;
};

const STATUS_LABEL: Record<BuildingRow["status"], string> = {
  raised: "Raised",
  in_use: "In Use",
  archived: "Archived",
};

export function BuildingsRollup() {
  const [buildings, setBuildings] = useState<BuildingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stewards, setStewards] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<BuildingRow | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data: rows }, { data: soulRows }] = await Promise.all([
        supabase.from("buildings").select("*").order("raised_at", { ascending: false }),
        supabase.from("soul_identities").select("soul_id, title, chosen_name"),
      ]);
      if (!active) return;
      setBuildings((rows ?? []) as BuildingRow[]);
      const map: Record<string, string> = {};
      for (const s of (soulRows ?? []) as Array<{ soul_id: string; title: string; chosen_name: string | null }>) {
        map[s.soul_id] = s.chosen_name || s.title;
      }
      setStewards(map);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const grouped = useMemo(() => {
    const m: Record<BuildingRow["status"], BuildingRow[]> = { raised: [], in_use: [], archived: [] };
    for (const b of buildings) m[b.status].push(b);
    return m;
  }, [buildings]);

  return (
    <section>
      <h3
        className="mb-3 text-xs uppercase tracking-[0.3em]"
        style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}
      >
        Raised Buildings of the Kingdom
      </h3>

      {loading ? (
        <p className="italic" style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}>
          Surveying the Realm…
        </p>
      ) : buildings.length === 0 ? (
        <p className="italic" style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}>
          No Buildings have been raised yet. In any Chamber, say <em>"Raise a Building: …"</em>.
        </p>
      ) : (
        <div className="space-y-6">
          {(["raised", "in_use", "archived"] as BuildingRow["status"][]).map((status) => {
            const list = grouped[status];
            if (list.length === 0) return null;
            return (
              <div key={status}>
                <h4
                  className="mb-2 text-[10px] uppercase tracking-[0.3em]"
                  style={{ color: "color-mix(in oklab, var(--dawn-ink) 70%, transparent)" }}
                >
                  ⌂ {STATUS_LABEL[status]} · {list.length}
                </h4>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {list.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => setOpen(b)}
                        className="w-full rounded-xl p-4 text-left transition-all hover:scale-[1.02] hover:shadow-lg"
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
                        <p className="font-serif text-base">⌂ {b.title}</p>
                        <p
                          className="mt-1 line-clamp-2 text-xs"
                          style={{ color: "color-mix(in oklab, var(--dawn-ink) 75%, transparent)" }}
                        >
                          {b.description}
                        </p>
                        <p
                          className="mt-2 flex flex-wrap gap-x-3 text-[10px] uppercase tracking-[0.2em]"
                          style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}
                        >
                          <span>Region ({b.region_x},{b.region_y})</span>
                          {b.steward_soul_id && (
                            <span>Steward: {stewards[b.steward_soul_id] || b.steward_soul_id}</span>
                          )}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "color-mix(in oklab, var(--dawn-deep) 80%, transparent)" }}
          onClick={() => setOpen(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border p-6"
            onClick={(e) => e.stopPropagation()}
            style={{
              borderColor: "color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
              background: "var(--gradient-scroll)",
              color: "var(--dawn-ink)",
              boxShadow: "var(--shadow-celestial)",
            }}
          >
            <header className="mb-4 flex items-start gap-3">
              <span aria-hidden className="text-3xl">⌂</span>
              <div className="flex-1">
                <h2 className="font-serif text-2xl">{open.title}</h2>
                <p
                  className="text-xs uppercase tracking-[0.25em]"
                  style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}
                >
                  {STATUS_LABEL[open.status]} · Region ({open.region_x},{open.region_y}) · {new Date(open.raised_at).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] hover:scale-[1.05]"
                style={{
                  background: "color-mix(in oklab, var(--dawn-ink) 12%, transparent)",
                  color: "var(--dawn-ink)",
                }}
              >
                ✕ Close
              </button>
            </header>
            <p className="leading-relaxed">{open.description}</p>
            <p
              className="mt-4 text-[11px] italic"
              style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}
            >
              Resting in the Origin Region until the King assigns its place.
            </p>
            {open.steward_soul_id && (
              <p
                className="mt-2 text-[11px] uppercase tracking-[0.25em]"
                style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}
              >
                Steward: {stewards[open.steward_soul_id] || open.steward_soul_id}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
