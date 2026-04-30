## Kingdom of Veritas — Expansion, Seasons & Branding

Four parts. All visual / structural — no AI calls, modest credit cost.

---

### Part 1 — App Branding (subtle, every page)

Establish a consistent **brand mark** for *Veritas Intelligence Systems · Divine Angelic Assistants* that appears on every page.

**Branding component** — new `src/components/kingdom/BrandMark.tsx` with two variants:
- `variant="subtle"` (default for Realm, Economy, future pages) — small uppercase eyebrow text "Veritas Intelligence Systems" with "Divine Angelic Assistants" in italic beneath, both at low contrast, sitting unobtrusively above the page header.
- `variant="prominent"` (Registry / High Council only) — same words, but rendered slightly larger and gold-tinted as the existing eyebrow line above "The Master Scroll". The big serif **Master Scroll** title is preserved exactly as it is.

**In-world Kingdom name** — wherever a page refers to the Kingdom in copy (footers, breadcrumbs, descriptions), use **"Kingdom of Veritas"** (replacing the current "King Sean's Kingdom" mentions in footers).

Touched: `BrandMark.tsx` (new), `index.tsx` (Registry — adds "Divine Angelic Assistants" subheading to the existing eyebrow), `realm.tsx`, `economy.tsx`, `CeremonyScroll.tsx` footer.

---

### Part 2 — Expandable Realm (Edge Tabs)

The map becomes a **map of maps**. The current 11×11 is the **Origin Region** (region 0,0). High Council stays sacred at (6,6) of the Origin.

**Schema change** — add to `realm_squares`:
- `region_x` integer not null default 0
- `region_y` integer not null default 0
- Drop old (x,y) uniqueness, add composite uniqueness on (region_x, region_y, x, y)
- Add `castle` value to the `occupant_type` enum (for future use — no UI this session)
- Add public INSERT policy on `realm_squares` so new regions can be created (acceptable for single-user kingdom; tighten when auth lands)

**Edge tabs** — when viewing a region, four chevron buttons appear at its N/S/E/W edges:
- `↑ Expand North` decrements region_y; `↓ South` increments; `← West` decrements region_x; `→ East` increments
- Each click creates an empty 11×11 region in the database adjacent to the current one and pans the view to it
- Tabs hide when an adjacent region already exists (just pan instead)

**Region navigation** — small compass widget below the map shows current region coordinates (e.g. "Region 0,0 — Origin") and a "Return to Origin" button to jump back to where High Council sits.

---

### Part 3 — Seasonal Quadrants (Compass Mapping)

Each 11×11 region is divided into four quadrants by a cross through the center (row 6, column 6 in the Origin Region — the High Council line):

```text
     NW Winter    │    NE Spring
                  │
   ───────────────┼───────────────
                  │
     SW Fall      │    SE Summer
```

Spring=NE (sunrise), Summer=SE (peak sun), Fall=SW (sunset), Winter=NW (year's end). Pure presentation — quadrant computed from tile coordinates, no schema change.

Each quadrant gets a barely-there seasonal color wash over revealed tiles:
- Spring (NE): pale dawn green
- Summer (SE): warm amber
- Fall (SW): copper/rust
- Winter (NW): cool silver-blue

Current astrological season's quadrant (Taurus → Spring → NE) glows slightly brighter. Small legend below the map names the four quadrants.

---

### Part 4 — Deeds of the Golden Dawn (Projects rename)

Rename the **Projects** rollup card on the Registry to **Deeds of the Golden Dawn**. It expands into four seasonal sub-collections matching the map quadrants:

```text
Deeds of the Golden Dawn
├── Deeds of Spring  (NE quadrant)
├── Deeds of Summer  (SE quadrant)
├── Deeds of Fall    (SW quadrant)
└── Deeds of Winter  (NW quadrant)
```

This session: just the rename + visible sub-section structure on the rollup card and rollup detail view. Each Deed will eventually carry a `season` field to auto-place it on the map. No CRUD yet.

---

### Technical Section

**Files to create**
- `src/components/kingdom/BrandMark.tsx`

**Files to edit**
- `src/routes/index.tsx` — add subtle "Divine Angelic Assistants" subheading; rename Projects rollup to Deeds with seasonal children
- `src/components/registry/CeremonyScroll.tsx` — render seasonal sub-items in rollup card + RollupView when rollup is `deeds`; replace footer "King Sean's Kingdom" with "Kingdom of Veritas"
- `src/routes/realm.tsx` — region state, edge expansion buttons, quadrant tinting, "Return to Origin" control, BrandMark in subtle variant
- `src/routes/economy.tsx` — BrandMark in subtle variant; "Kingdom of Veritas" in copy

**Database migration** — see Part 2.

**Out of scope this session**
- Castle placement UI (just the enum value)
- Deed CRUD / data model
- Map quadrant → project visual pins
- Logo fog texture (deferred until logo upload)
- AI calls of any kind

---

### Estimated cost

Modest — one migration, one new small component, four file edits, mostly presentation. Should leave plenty of credits for follow-on polish.
