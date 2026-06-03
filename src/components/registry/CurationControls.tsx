/**
 * CurationControls — the King's gestures over a single Deed/Item/Building.
 *
 * Renders inside an artefact modal. Three things, in order:
 *   • Steward + witnesses display
 *   • Reassign Steward (dropdown of all 13 Souls)
 *   • Purge (two-tap confirm, final)
 *
 * Wired to the curation server functions written in Phase 5.7.
 */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { reassignSteward, purgeArtefact } from "@/lib-server/curation.functions";

export type CurableTable = "deeds" | "items" | "buildings";

export type SoulOption = {
  soul_id: string;
  title: string;
  chosen_name: string | null;
};

type Props = {
  table: CurableTable;
  id: string;
  currentStewardId: string | null;
  witnesses: string[];
  souls: SoulOption[];
  onChanged: () => void;
  onPurged: () => void;
};

function nameOf(s: SoulOption): string {
  return s.chosen_name || s.title;
}

export function CurationControls({
  table,
  id,
  currentStewardId,
  witnesses,
  souls,
  onChanged,
  onPurged,
}: Props) {
  const reassignFn = useServerFn(reassignSteward);
  const purgeFn = useServerFn(purgeArtefact);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingPurge, setConfirmingPurge] = useState(false);

  const stewardName = currentStewardId
    ? souls.find((s) => s.soul_id === currentStewardId)
      ? nameOf(souls.find((s) => s.soul_id === currentStewardId)!)
      : currentStewardId
    : "—";

  const witnessNames = witnesses
    .map((w) => {
      const found = souls.find((s) => s.soul_id === w);
      return found ? nameOf(found) : w;
    })
    .filter((n) => n.length > 0);

  async function handleReassign(newStewardId: string) {
    if (newStewardId === currentStewardId) return;
    setBusy(true);
    setError(null);
    const res = await reassignFn({
      data: { table, id, new_steward_soul_id: newStewardId },
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onChanged();
  }

  async function handlePurge() {
    if (!confirmingPurge) {
      setConfirmingPurge(true);
      // auto-cancel confirm after 4s
      setTimeout(() => setConfirmingPurge(false), 4000);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await purgeFn({ data: { table, id } });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      setConfirmingPurge(false);
      return;
    }
    onPurged();
  }

  return (
    <div
      className="mt-5 rounded-xl p-3"
      style={{
        background: "color-mix(in oklab, var(--dawn-parchment) 88%, var(--dawn-gold) 6%)",
        border: "1px solid color-mix(in oklab, var(--dawn-gold) 35%, transparent)",
      }}
    >
      <p
        className="mb-2 text-[10px] uppercase tracking-[0.3em]"
        style={{ color: "color-mix(in oklab, var(--dawn-ink) 60%, transparent)" }}
      >
        ✦ The King's Curation
      </p>

      {witnessNames.length > 0 && (
        <p
          className="mb-3 text-[11px] italic"
          style={{ color: "color-mix(in oklab, var(--dawn-ink) 65%, transparent)" }}
        >
          Witnesses: {witnessNames.join(" · ")}
        </p>
      )}

      <label
        className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.25em]"
        style={{ color: "color-mix(in oklab, var(--dawn-ink) 70%, transparent)" }}
      >
        Reassign Steward
        <select
          value={currentStewardId ?? ""}
          disabled={busy || souls.length === 0}
          onChange={(e) => void handleReassign(e.target.value)}
          className="rounded-md px-2 py-1.5 font-serif text-sm normal-case tracking-normal disabled:opacity-50"
          style={{
            background: "color-mix(in oklab, var(--dawn-parchment) 96%, transparent)",
            border: "1px solid color-mix(in oklab, var(--dawn-gold) 50%, transparent)",
            color: "var(--dawn-ink)",
          }}
        >
          {!currentStewardId && <option value="">— No steward —</option>}
          {souls.map((s) => (
            <option key={s.soul_id} value={s.soul_id}>
              {nameOf(s)} · {s.title}
            </option>
          ))}
        </select>
      </label>
      <p
        className="mt-1 text-[10px] italic"
        style={{ color: "color-mix(in oklab, var(--dawn-ink) 55%, transparent)" }}
      >
        The previous Steward joins the witnesses — no Soul is forgotten.
      </p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p
          className="text-[10px] italic"
          style={{ color: "color-mix(in oklab, var(--dawn-ember) 80%, transparent)" }}
        >
          {confirmingPurge ? "Tap again to confirm — this is final." : "Redundant or mistaken?"}
        </p>
        <button
          type="button"
          onClick={() => void handlePurge()}
          disabled={busy}
          className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.25em] transition-all hover:-translate-y-0.5 disabled:opacity-50"
          style={{
            background: confirmingPurge
              ? "color-mix(in oklab, var(--dawn-ember) 80%, transparent)"
              : "color-mix(in oklab, var(--dawn-ember) 22%, transparent)",
            color: confirmingPurge ? "var(--dawn-parchment)" : "var(--dawn-ink)",
            border: "1px solid color-mix(in oklab, var(--dawn-ember) 60%, transparent)",
          }}
        >
          {confirmingPurge ? "✕ Confirm Purge" : "✕ Purge"}
        </button>
      </div>

      {error && (
        <p
          className="mt-3 rounded p-2 text-[11px]"
          style={{
            background: "color-mix(in oklab, var(--dawn-ember) 15%, transparent)",
            color: "var(--dawn-ember)",
          }}
        >
          ⚠ {error}
        </p>
      )}
    </div>
  );
}
