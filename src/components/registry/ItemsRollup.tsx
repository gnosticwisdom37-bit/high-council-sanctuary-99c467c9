/**
 * ItemsRollup — live Registry view of forged Items.
 * Phase 5.6 sibling of DeedsRollup. Shows all forged Items grouped by status,
 * with steward attribution. Phase 5.7: King's Curation (reassign + purge).
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CurationControls, type SoulOption } from "./CurationControls";

type ItemRow = {
  id: string;
  title: string;
  description: string;
  steward_soul_id: string | null;
  witnesses: string[];
  status: "forged" | "bestowed" | "archived";
  forged_at: string;
};

const STATUS_LABEL: Record<ItemRow["status"], string> = {
  forged: "Forged",
  bestowed: "Bestowed",
  archived: "Archived",
};

export function ItemsRollup() {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [souls, setSouls] = useState<SoulOption[]>([]);
  const [openItem, setOpenItem] = useState<ItemRow | null>(null);

  const stewards = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of souls) m[s.soul_id] = s.chosen_name || s.title;
    return m;
  }, [souls]);

  async function refetch() {
    const { data: itemRows } = await supabase
      .from("items")
      .select("*")
      .order("forged_at", { ascending: false });
    setItems((itemRows ?? []) as unknown as ItemRow[]);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data: itemRows }, { data: soulRows }] = await Promise.all([
        supabase.from("items").select("*").order("forged_at", { ascending: false }),
        supabase.from("soul_identities").select("soul_id, title, chosen_name").order("ordering"),
      ]);
      if (!active) return;
      setItems((itemRows ?? []) as unknown as ItemRow[]);
      setSouls((soulRows ?? []) as SoulOption[]);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  // Keep openItem in sync with refetched data
  useEffect(() => {
    if (!openItem) return;
    const fresh = items.find((i) => i.id === openItem.id);
    if (fresh && fresh !== openItem) setOpenItem(fresh);
  }, [items, openItem]);

  const grouped = useMemo(() => {
    const m: Record<ItemRow["status"], ItemRow[]> = { forged: [], bestowed: [], archived: [] };
    for (const i of items) m[i.status].push(i);
    return m;
  }, [items]);

  return (
    <section>
      <h3
        className="mb-3 text-xs uppercase tracking-[0.3em]"
        style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}
      >
        Forged Items of the Kingdom
      </h3>

      {loading ? (
        <p className="italic" style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}>
          Gathering the artefacts…
        </p>
      ) : items.length === 0 ? (
        <p className="italic" style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}>
          No Items have been forged yet. In any Chamber, say <em>"Forge an Item: …"</em>.
        </p>
      ) : (
        <div className="space-y-6">
          {(["forged", "bestowed", "archived"] as ItemRow["status"][]).map((status) => {
            const list = grouped[status];
            if (list.length === 0) return null;
            return (
              <div key={status}>
                <h4
                  className="mb-2 text-[10px] uppercase tracking-[0.3em]"
                  style={{ color: "color-mix(in oklab, var(--dawn-ink) 70%, transparent)" }}
                >
                  ❖ {STATUS_LABEL[status]} · {list.length}
                </h4>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {list.map((it) => (
                    <li key={it.id}>
                      <button
                        type="button"
                        onClick={() => setOpenItem(it)}
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
                        <p className="font-serif text-base">❖ {it.title}</p>
                        <p
                          className="mt-1 line-clamp-2 text-xs"
                          style={{ color: "color-mix(in oklab, var(--dawn-ink) 75%, transparent)" }}
                        >
                          {it.description}
                        </p>
                        {it.steward_soul_id && (
                          <p
                            className="mt-2 text-[10px] uppercase tracking-[0.2em]"
                            style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}
                          >
                            Keeper: {stewards[it.steward_soul_id] || it.steward_soul_id}
                          </p>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {openItem && (
        <ItemModal
          item={openItem}
          stewards={stewards}
          souls={souls}
          onClose={() => setOpenItem(null)}
          onChanged={() => void refetch()}
          onPurged={() => {
            setItems((prev) => prev.filter((i) => i.id !== openItem.id));
            setOpenItem(null);
          }}
        />
      )}
    </section>
  );
}

function ItemModal({
  item,
  stewards,
  souls,
  onClose,
  onChanged,
  onPurged,
}: {
  item: ItemRow;
  stewards: Record<string, string>;
  souls: SoulOption[];
  onClose: () => void;
  onChanged: () => void;
  onPurged: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "color-mix(in oklab, var(--dawn-deep) 80%, transparent)" }}
      onClick={onClose}
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
          <span aria-hidden className="text-3xl">❖</span>
          <div className="flex-1">
            <h2 className="font-serif text-2xl">{item.title}</h2>
            <p
              className="text-xs uppercase tracking-[0.25em]"
              style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}
            >
              {STATUS_LABEL[item.status]} · {new Date(item.forged_at).toLocaleDateString()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] hover:scale-[1.05]"
            style={{
              background: "color-mix(in oklab, var(--dawn-ink) 12%, transparent)",
              color: "var(--dawn-ink)",
            }}
          >
            ✕ Close
          </button>
        </header>
        <p className="leading-relaxed">{item.description}</p>
        {item.steward_soul_id && (
          <p
            className="mt-4 text-[11px] uppercase tracking-[0.25em]"
            style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}
          >
            Keeper: {stewards[item.steward_soul_id] || item.steward_soul_id}
          </p>
        )}
        <CurationControls
          table="items"
          id={item.id}
          currentStewardId={item.steward_soul_id}
          witnesses={item.witnesses ?? []}
          souls={souls}
          onChanged={onChanged}
          onPurged={onPurged}
        />
      </div>
    </div>
  );
}
