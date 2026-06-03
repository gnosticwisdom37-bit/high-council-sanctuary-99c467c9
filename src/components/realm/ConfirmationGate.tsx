import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  listPlacementCandidates,
  confirmPlacement,
  declinePlacement,
} from "@/lib-server/placement.functions";

type Candidate = {
  id: string;
  kind: "building" | "workshop" | "item" | "chamber";
  title: string;
  description: string;
  suggested_steward_soul_id: string | null;
  suggested_region_x: number | null;
  suggested_region_y: number | null;
  suggested_tile_x: number | null;
  suggested_tile_y: number | null;
  witnesses: string[] | null;
  created_at: string;
};

type SoulLite = {
  soul_id: string;
  title: string;
  house: string;
  chosen_name: string | null;
};

type BuildingTile = {
  region_x: number;
  region_y: number;
  tile_x: number;
  tile_y: number;
};

const KIND_LABEL: Record<Candidate["kind"], string> = {
  building: "Building (hosts Souls)",
  workshop: "Workshop (hosts Tools)",
  item: "Item",
  chamber: "Chamber",
};

const KIND_SIGIL: Record<Candidate["kind"], string> = {
  building: "⌂",
  workshop: "⚒",
  item: "❖",
  chamber: "☉",
};

export function ConfirmationGate() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [souls, setSouls] = useState<SoulLite[]>([]);
  const [buildings, setBuildings] = useState<BuildingTile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const list = useServerFn(listPlacementCandidates);
  const confirm = useServerFn(confirmPlacement);
  const decline = useServerFn(declinePlacement);

  async function refresh() {
    setLoading(true);
    const [candRes, soulsRes, buildingsRes] = await Promise.all([
      list(),
      supabase
        .from("soul_identities")
        .select("soul_id,title,house,chosen_name")
        .order("ordering"),
      supabase
        .from("buildings")
        .select("region_x,region_y,tile_x,tile_y")
        .not("tile_x", "is", null)
        .not("tile_y", "is", null),
    ]);
    if (candRes.ok) setCandidates(candRes.candidates as Candidate[]);
    setSouls((soulsRes.data ?? []) as SoulLite[]);
    setBuildings((buildingsRes.data ?? []) as BuildingTile[]);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  if (loading) {
    return (
      <SectionShell>
        <p className="text-sm opacity-70">Reading the Gate…</p>
      </SectionShell>
    );
  }

  if (candidates.length === 0) {
    return (
      <SectionShell>
        <p className="text-sm opacity-70">
          The Gate is quiet. Nothing awaits the King's confirmation.
        </p>
      </SectionShell>
    );
  }

  return (
    <SectionShell badge={candidates.length}>
      {error && (
        <p className="mb-3 rounded-md border px-3 py-2 text-xs"
          style={{
            borderColor: "color-mix(in oklab, var(--dawn-ember) 60%, transparent)",
            background: "color-mix(in oklab, var(--dawn-ember) 10%, transparent)",
            color: "var(--dawn-parchment)",
          }}>
          {error}
        </p>
      )}
      <div className="flex flex-col gap-3">
        {candidates.map((c) => (
          <CandidateRow
            key={c.id}
            candidate={c}
            souls={souls}
            buildings={buildings}
            busy={busyId === c.id}
            onDecline={async () => {
              setBusyId(c.id);
              setError(null);
              const res = await decline({ data: { candidate_id: c.id } });
              setBusyId(null);
              if (!res.ok) setError(res.error);
              else await refresh();
            }}
            onConfirm={async (form) => {
              setBusyId(c.id);
              setError(null);
              const res = await confirm({
                data: {
                  candidate_id: c.id,
                  kind: form.kind,
                  title: form.title,
                  description: form.description,
                  steward_soul_id: form.steward_soul_id,
                  region_x: form.region_x,
                  region_y: form.region_y,
                  tile_x: form.tile_x,
                  tile_y: form.tile_y,
                },
              });
              setBusyId(null);
              if (!res.ok) setError(res.error);
              else await refresh();
            }}
          />
        ))}
      </div>
    </SectionShell>
  );
}

function SectionShell({
  children,
  badge,
}: {
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <section
      className="mx-auto mt-8 w-full max-w-3xl rounded-3xl border p-5 md:p-6"
      style={{
        borderColor: "color-mix(in oklab, var(--dawn-gold-bright) 50%, transparent)",
        background: "color-mix(in oklab, var(--dawn-deep) 55%, transparent)",
        color: "var(--dawn-parchment)",
        boxShadow: "var(--shadow-sigil)",
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2
          className="text-sm uppercase tracking-[0.3em]"
          style={{ color: "var(--dawn-gold-bright)" }}
        >
          ✦ The Confirmation Gate
        </h2>
        {badge && badge > 0 ? (
          <span
            className="inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-semibold"
            style={{
              background: "linear-gradient(135deg, var(--dawn-gold) 0%, var(--dawn-gold-bright) 100%)",
              color: "var(--dawn-ink)",
            }}
          >
            {badge}
          </span>
        ) : null}
      </div>
      <p className="mb-4 text-xs opacity-70">
        Buildings, Workshops, Items and Chambers spoken into being by the King wait here for His word
        before they enter the Realm.
      </p>
      {children}
    </section>
  );
}

function soulLabel(s: SoulLite | undefined) {
  if (!s) return "Unknown Soul";
  return s.chosen_name ?? `${s.title} of ${s.house}`;
}

function CandidateRow({
  candidate,
  souls,
  buildings,
  busy,
  onConfirm,
  onDecline,
}: {
  candidate: Candidate;
  souls: SoulLite[];
  buildings: BuildingTile[];
  busy: boolean;
  onConfirm: (form: {
    kind: Candidate["kind"];
    title: string;
    description: string;
    steward_soul_id: string | null;
    region_x: number;
    region_y: number;
    tile_x: number;
    tile_y: number;
  }) => void;
  onDecline: () => void;
}) {
  const [kind, setKind] = useState<Candidate["kind"]>(candidate.kind);
  const [title, setTitle] = useState(candidate.title);
  const [description, setDescription] = useState(candidate.description);
  const [stewardId, setStewardId] = useState<string | null>(
    candidate.suggested_steward_soul_id,
  );
  const [regionX, setRegionX] = useState(candidate.suggested_region_x ?? 0);
  const [regionY, setRegionY] = useState(candidate.suggested_region_y ?? 0);
  // Default tile: Origin centre (6,6) for Buildings/Workshops
  const [tileX, setTileX] = useState(candidate.suggested_tile_x ?? 6);
  const [tileY, setTileY] = useState(candidate.suggested_tile_y ?? 6);

  const occupiedTiles = useMemo(() => {
    const set = new Set<string>();
    for (const b of buildings) {
      set.add(`${b.region_x},${b.region_y},${b.tile_x},${b.tile_y}`);
    }
    return set;
  }, [buildings]);

  const tileKey = `${regionX},${regionY},${tileX},${tileY}`;
  const tileOccupied = occupiedTiles.has(tileKey);
  const requiresOccupant = kind === "item" || kind === "chamber";
  const ruleViolation = requiresOccupant && !tileOccupied;

  const sigil = KIND_SIGIL[kind];

  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: "color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
        background: "color-mix(in oklab, var(--dawn-deep) 70%, transparent)",
      }}
    >
      <div className="mb-3 flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-full text-lg"
          style={{
            background: "linear-gradient(135deg, var(--dawn-gold) 0%, var(--dawn-gold-bright) 100%)",
            color: "var(--dawn-ink)",
          }}
        >
          {sigil}
        </span>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-[0.3em] opacity-70">
            {KIND_LABEL[candidate.kind]} · spoken into being
          </p>
          <p className="mt-0.5 font-serif text-base leading-tight">{candidate.title}</p>
          <p className="mt-1 text-xs opacity-70">{candidate.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Title */}
        <Field label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border bg-transparent px-2 py-1 text-sm"
            style={{ borderColor: "color-mix(in oklab, var(--dawn-gold) 35%, transparent)" }}
          />
        </Field>

        {/* Kind toggle (only meaningful for building candidates → toggle to workshop) */}
        {(candidate.kind === "building" || candidate.kind === "workshop") && (
          <Field label="Kind">
            <div className="flex gap-2">
              <KindButton
                active={kind === "building"}
                onClick={() => setKind("building")}
                label="⌂ Building"
                hint="hosts Souls"
              />
              <KindButton
                active={kind === "workshop"}
                onClick={() => setKind("workshop")}
                label="⚒ Workshop"
                hint="hosts Tools"
              />
            </div>
          </Field>
        )}

        {/* Steward */}
        <Field label="Steward">
          <select
            value={stewardId ?? ""}
            onChange={(e) => setStewardId(e.target.value || null)}
            className="w-full rounded-md border bg-transparent px-2 py-1 text-sm"
            style={{
              borderColor: "color-mix(in oklab, var(--dawn-gold) 35%, transparent)",
              color: "var(--dawn-parchment)",
            }}
          >
            <option value="" style={{ color: "black" }}>(unassigned)</option>
            {souls.map((s) => (
              <option key={s.soul_id} value={s.soul_id} style={{ color: "black" }}>
                {soulLabel(s)}
              </option>
            ))}
          </select>
        </Field>

        {/* Region */}
        <Field label="Region (x, y)">
          <div className="flex gap-2">
            <NumberInput value={regionX} onChange={setRegionX} />
            <NumberInput value={regionY} onChange={setRegionY} />
          </div>
        </Field>

        {/* Tile */}
        <Field label="Tile within region (1–11)">
          <div className="flex gap-2">
            <NumberInput value={tileX} onChange={setTileX} min={1} max={11} />
            <NumberInput value={tileY} onChange={setTileY} min={1} max={11} />
          </div>
        </Field>

        {/* Description */}
        <Field label="Description" wide>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-md border bg-transparent px-2 py-1 text-sm"
            style={{ borderColor: "color-mix(in oklab, var(--dawn-gold) 35%, transparent)" }}
          />
        </Field>
      </div>

      {/* Tile occupancy rule notice */}
      <div className="mt-3 text-[11px] opacity-80">
        {requiresOccupant ? (
          tileOccupied ? (
            <span style={{ color: "var(--dawn-gold-bright)" }}>
              ✓ A Building or Workshop already stands on this tile.
            </span>
          ) : (
            <span style={{ color: "var(--dawn-ember, oklch(0.7 0.18 30))" }}>
              Kingdom Law: a Building or Workshop must stand on this tile first.
              Place one before this {kind} can take its place.
            </span>
          )
        ) : tileOccupied ? (
          <span className="opacity-70">
            Note: another Building already stands on this tile. Both will share it.
          </span>
        ) : (
          <span className="opacity-70">
            This tile is empty. The {kind} will be the first to stand here.
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onDecline}
          disabled={busy}
          className="rounded-full border px-4 py-1 text-xs uppercase tracking-[0.25em] transition-all hover:scale-[1.04] disabled:opacity-50"
          style={{
            borderColor: "color-mix(in oklab, var(--dawn-gold) 40%, transparent)",
            color: "var(--dawn-parchment)",
            background: "transparent",
          }}
        >
          Decline
        </button>
        <button
          type="button"
          disabled={busy || ruleViolation || !title.trim()}
          onClick={() =>
            onConfirm({
              kind,
              title: title.trim(),
              description: description.trim(),
              steward_soul_id: stewardId,
              region_x: regionX,
              region_y: regionY,
              tile_x: tileX,
              tile_y: tileY,
            })
          }
          className="rounded-full px-4 py-1 text-xs uppercase tracking-[0.25em] transition-all hover:scale-[1.04] disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, var(--dawn-gold) 0%, var(--dawn-gold-bright) 100%)",
            color: "var(--dawn-ink)",
            boxShadow: "var(--shadow-sigil)",
          }}
        >
          {busy ? "Working…" : `Raise this ${KIND_LABEL[kind].split(" ")[0]}`}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1 text-xs ${wide ? "sm:col-span-2" : ""}`}>
      <span className="uppercase tracking-[0.2em] opacity-70">{label}</span>
      {children}
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-md border bg-transparent px-2 py-1 text-sm"
      style={{ borderColor: "color-mix(in oklab, var(--dawn-gold) 35%, transparent)" }}
    />
  );
}

function KindButton({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 rounded-md border px-2 py-1 text-left transition-all"
      style={{
        borderColor: active
          ? "color-mix(in oklab, var(--dawn-gold-bright) 80%, transparent)"
          : "color-mix(in oklab, var(--dawn-gold) 25%, transparent)",
        background: active
          ? "color-mix(in oklab, var(--dawn-gold) 25%, transparent)"
          : "transparent",
        color: "var(--dawn-parchment)",
      }}
    >
      <span className="text-xs font-semibold">{label}</span>
      <span className="block text-[10px] opacity-60">{hint}</span>
    </button>
  );
}
