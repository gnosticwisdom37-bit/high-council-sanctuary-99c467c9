## Phase 7 — Simplified: The Confirmation Gate + Tile Occupancy Rule

Your instinct is right, and it makes the whole phase cleaner. Three things change vs the old spec:

1. **No drag-to-move.** Buildings, once placed, stay put — exactly like the 12 Councillors as spokes of the Wheel. If something needs to "move," a new Building is raised elsewhere and the old one is retired. This deletes ~40% of the original placement complexity (no drag handlers, no stacking +N badges, no movement audit trail).
2. **A Confirmation Gate** sits between trigger detection and persistence. Nothing — Building, Item, future Chamber — gets written to a tile until King Sean confirms steward, type, and coordinate.
3. **Tile Occupancy Rule (Kingdom Law).** A tile may only receive a Chamber, Item, or sub-structure if it already holds at least one Building or Workshop. The first thing on any tile must be a Building. This becomes a Doctrine, enforced both in UI and at the server-fn layer.

---

### What King Sean sees

When a Building trigger fires in any chamber:

```text
┌─ Confirmation Gate ──────────────────────────────────┐
│  A Building wishes to be raised.                     │
│                                                      │
│  Title:      [Publishing House          ]            │
│  Steward:    ◉ The Herald (current chamber)          │
│              ○ Choose another Soul ▾                 │
│  Kind:       ◉ Building   ○ Workshop                 │
│  Tile:       Region (0,0) · pick a square ▾          │
│              [ mini realm grid — empty tiles glow ]  │
│                                                      │
│  [ Decline ]                    [ Raise this Building ]
└──────────────────────────────────────────────────────┘
```

For Items / future Chambers the Gate looks the same but the tile picker only shows tiles that already hold a Building. Empty tiles are dimmed with the tooltip *"A Building must stand here first."*

### Architecture (small, no new tables)

- **Reuse `buildings` table.** Add `kind` enum (`building` | `workshop`) and keep `region_x/region_y` + new `tile_x/tile_y` (already nullable-friendly via existing schema if we add the columns).
- **One server fn: `confirmPlacement`** — accepts `{candidate_id, steward_soul_id, tile_x, tile_y, kind}`, validates the Occupancy Rule, writes to `buildings` (or future `items` / `chambers` placement columns).
- **One staging table: `placement_candidates`** — trigger writes a candidate row instead of writing directly to `buildings`/`items`. The Gate reads/confirms/declines candidates. No Realm changes happen until confirmation.
- **Realm map gets one new affordance** — a tile click in "placement mode" highlights it. Outside placement mode the Realm stays read-only as today.

### Build slices (today's remaining ~4.4 credits is way more than enough)

1. **Doctrine + schema** (~0.6) — `placement_candidates` table, `kind` column on `buildings`, `tile_x`/`tile_y`. Memory file `mem://features/tile-occupancy-rule`.
2. **Trigger rerouting** (~0.5) — Building/Item/future Chamber triggers write to `placement_candidates` instead of final tables. Banners change to *"Awaiting the King's Confirmation."*
3. **ConfirmationGate component** (~1.2) — modal with steward picker, kind toggle, tile picker (mini-Realm grid), decline/confirm buttons.
4. **`confirmPlacement` server fn** (~0.4) — validates Occupancy Rule, moves candidate → final table, stamps tile.
5. **Pending Gate inbox** (~0.4) — small badge on Realm tab showing N candidates awaiting King's word.
6. **QA + memory updates** (~0.3).

Total: **~3.4 credits**. Comfortably inside today's 4.4 remaining, leaves headroom for tomorrow's swap to Venice.

### What this costs us (honest tradeoffs)

- **No "move" gesture later.** If you ever change your mind, retiring + re-raising is the path. Given your stated intent (12 Councillors as fixed spokes), this is a feature, not a loss.
- **Items become slightly heavier to forge** — they need a tile choice instead of just appearing in inventory. We can soften this by defaulting Items to "kept in their Steward's Chamber tile" with a one-click override.
- **Future Chamber generator** (when a Python script or new Soul wants its own room) plugs straight into the same Gate — no new UI to design later.

### Three things to confirm before I write this

1. **Items: default to Steward's tile, or always require explicit pick?** (I'd recommend default-with-override — fewer clicks for the common case.)
2. **Workshop vs Building** — semantic only, or do Workshops have different rules later (e.g. Workshops host Python tools, Buildings host Souls)? Either is fine; I just want the doctrine right from day one.
3. **Decline behavior** — does a declined candidate vanish, or move to a "Returned to the Mist" archive King can revisit? (Archive is ~0.1 extra.)

Once you answer those three, I lock the plan and we ship it tomorrow on a clean budget.
