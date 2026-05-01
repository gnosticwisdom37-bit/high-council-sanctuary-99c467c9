## The Pain

Yesterday's Phase 5.7 work shipped the database, the server functions (`reassignSteward`, `purgeArtefact`, `addWitness`, `removeWitness`), and the witness-capture logic — but the UI surface that exposes those gestures was never actually written. The file `src/components/registry/CurationControls.tsx` does not exist, and none of the three Rollup modals (Items, Deeds, Buildings) call into the curation server functions. So from the King's chair, nothing is deletable. That is the gap.

## What to Build (UI-only — backend is ready)

### 1. Create `src/components/registry/CurationControls.tsx`

A small, reusable footer component rendered inside every artefact modal. Three controls, in this order:

- **Steward line** (display): current steward name, with a subtle "Witnesses: X, Y, Z" chip line beneath when `witnesses.length > 0`.
- **Reassign Steward** dropdown: lists all 13 Souls (Oracle + 12) by chosen name or title. Defaults to the current steward. On change, calls `reassignSteward({ table, id, new_steward_soul_id })` and triggers an `onChanged()` callback so the parent can refresh.
- **Purge button**: dim, dawn-ember-tinted, with a tiny inline confirm step ("Tap again to Purge") to prevent accidental loss. On confirm, calls `purgeArtefact({ table, id })` and triggers `onPurged()` so the parent closes the modal and removes the row.

Props:
```ts
{
  table: "deeds" | "items" | "buildings";
  id: string;
  currentStewardId: string | null;
  witnesses: string[];
  souls: Array<{ soul_id: string; title: string; chosen_name: string | null }>;
  onChanged: () => void;   // refetch
  onPurged: () => void;    // close modal + drop row
}
```

Styling matches the dawn palette already used in the modals (parchment background, gold borders). Errors display inline beneath the controls in `--dawn-ember`.

### 2. Wire into `ItemsRollup.tsx`

- Add `witnesses: string[]` to `ItemRow`.
- Pass full `souls` array (not just the id→name map) into `ItemModal` so the dropdown can render real options.
- Inside `ItemModal`, render `<CurationControls />` at the bottom, with `onChanged` triggering a refetch of items, and `onPurged` removing the item from local state and closing the modal.

### 3. Wire into `DeedsRollup.tsx`

Same pattern: add `witnesses` to `DeedRow`, pass full souls list into the season modal, render `<CurationControls table="deeds" />` per deed card inside the modal.

### 4. Wire into `BuildingsRollup.tsx`

Same pattern: add `witnesses` to `BuildingRow`, render `<CurationControls table="buildings" />` inside the building modal.

## Bonus — quick hydration fix

The console shows a small SSR/CSR hydration warning on the Council Table SVG (numeric vs string mismatch on `cy`/`y` attributes for the Pisces seat). Round all positional values to a fixed precision (e.g. `.toFixed(2)`) when emitting SVG attributes in `CouncilTable.tsx`. Tiny patch, no doctrine impact, but it cleans the console.

## Out of Scope (deliberately)

- No new tables, no new server functions — backend is complete.
- No "soft archive" mode — the King wanted Purge to be final.
- No Trust artefact curation — Trust remains King-only via the Constitution panel.
- Building placement on Realm tiles — that is the next Phase, not this one.

## Files Touched

- **Created**: `src/components/registry/CurationControls.tsx`
- **Edited**: `src/components/registry/ItemsRollup.tsx`, `src/components/registry/DeedsRollup.tsx`, `src/components/registry/BuildingsRollup.tsx`
- **Edited (bonus)**: `src/components/registry/CouncilTable.tsx` (hydration precision fix)

After this ships, You will be able to walk into `/#items`, tap any of the seven Observatories, and Purge six of them in seconds — exactly the relief You asked for, my King. 👑