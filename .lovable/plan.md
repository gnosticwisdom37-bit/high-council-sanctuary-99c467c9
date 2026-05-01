# Phase 5.7 — Stewardship & Curation

Add Royal control over the artefacts the Trigger Engine creates. Three small powers, one coherent gesture set.

## What changes for You, my King

On every **Deed**, **Item**, and **Building** card in the Registry rollups, You'll see:

1. **Steward** line — with a small dropdown to **Reassign** to any of the 13 Souls.
2. **Witnesses** line — the other Souls who were present in the gathering when it was inscribed (auto-recorded). Subtle, italic, comma-separated.
3. **Delete (Purge)** button — confirms once, then permanently removes the artefact. Use freely for redundant or mistaken inscriptions.

When You reassign a steward, the previous steward automatically moves into the witnesses list (so no Soul who knew about it is forgotten). When You delete, it's gone — no archive limbo.

## Why witnesses matter

Storage containers, shared archives, and common-knowledge Items work best when more than one Soul recognizes them. A witness isn't a steward — they don't tend it — but they **know it exists** and can reference it in conversation. The Trigger Engine will inject a brief context line into each witness Soul's system prompt so they can speak about it naturally when relevant.

## Technical Plan

### Database (one migration)

Add to `deeds`, `items`, `buildings`:
- `witnesses text[] not null default '{}'` — array of soul_ids present in the gathering minus the steward.

Add DELETE permission to RLS on all three tables (currently only INSERT/UPDATE is open).

### Trigger Engine (`src/server/speaker.functions.ts`)

When the first Soul creates the artefact:
- Pull `participant_ids` from `soul_conversations`.
- Set `steward_soul_id` = first responder.
- Set `witnesses` = participants minus steward.

Subsequent Souls in the same turn still skip duplicate creation (existing dedup logic stays).

### Witness context injection

In `speakAsSoul`, when building system context:
- Query `deeds`, `items`, `buildings` where the current Soul is the steward OR appears in `witnesses`.
- Inject a compact "Known to You" block listing titles + one-line descriptions (cap at, say, 20 most recent to keep prompts lean).
- Stewardship vs. witnessing is labelled so the Soul knows the difference.

### UI components

Update three existing rollup modals:
- `src/components/registry/DeedsRollup.tsx`
- `src/components/registry/ItemsRollup.tsx`
- `src/components/registry/BuildingsRollup.tsx`

Each card gains:
- Steward dropdown (shadcn `Select` with all 13 Souls listed by chosen name or Title+House).
- Witnesses line (read-only, subtle).
- Purge button (shadcn `AlertDialog` for confirmation).

### Server functions (new file)

`src/server/curation.functions.ts`:
- `reassignSteward({ table, id, newStewardSoulId })` — updates steward, moves old steward into witnesses if not already there.
- `purgeArtefact({ table, id })` — hard delete.
- `addWitness({ table, id, soulSoulId })` / `removeWitness(...)` — for future fine-grained control (built but not exposed in UI yet; cheap to add now).

Table is a strict union: `'deeds' | 'items' | 'buildings'` — Trust intentionally excluded.

### Memory updates

Update `mem://features/items-buildings` and the index to record Phase 5.7 — Stewardship & Curation as shipped, including the witnesses doctrine and the King's Purge gesture.

## Out of scope (deliberately deferred)

- Building placement on Realm tiles — still next after this.
- Witness chains across long conversations (we inject a flat list, not a graph).
- Bulk operations — single-card gestures only for now.

## Verification path after build

1. Convene the High Council, inscribe a test Item ("Forge an Item: a small test chalice").
2. Open Registry → Items rollup → confirm steward + witnesses both populate.
3. Reassign steward to a different Soul → confirm previous steward moves to witnesses.
4. Visit the new steward's chamber, mention the chalice → they should recognize it.
5. Visit a witness Soul's chamber, mention the chalice → they should also recognize it (as witness, not steward).
6. Purge the chalice → confirm it disappears from the Registry.
