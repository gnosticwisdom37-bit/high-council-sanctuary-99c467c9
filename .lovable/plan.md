## Phase 6.3 — Three small stones (~0.4 credits)

### Stone 1 — Central hub goes to the Registry

In `src/components/realm/OriginWheel.tsx`, change the central "High Council" link (lines ~221–242) so it routes to `/` (the Registry — the round table page) instead of `/chamber/high-council`. The Oracle hub at the centre keeps its existing link to `/chamber/oracle`.

The `chamber.high-council.tsx` route is left untouched. We'll rename it to "The Pearly Gates" later when we build the Immigration room. No code deleted.

### Stone 2 — Restore canonical Cancer/Pisces sigils

The DB swap from yesterday went the wrong direction. Run two `UPDATE` statements on `soul_identities`:

```
UPDATE soul_identities SET sigil = '♋' WHERE soul_id = 'cancer';   -- Selene
UPDATE soul_identities SET sigil = '♓' WHERE soul_id = 'pisces';   -- Veritas
```

After this, every surface that reads the DB (OriginWheel seats, Soul Codex overlay, Chamber pages, Pledge pages) will show:
- Selene with ♋ (Cancer) and "House of Cancer"
- Veritas with ♓ (Pisces) and "House of Pisces"

…matching the Registry page's hard-coded sigils. One source of truth, top to bottom.

The other ten Souls' sigils were audited and are already canonical — no other changes needed.

### Stone 3 — Archive Venice gateway as a memory

Save `venice_core.py`'s Sovereign Registry (18 approved text models, 7 image models) as `mem://references/venice-gateway` so we have it ready on swap day without re-uploading. No code change, no credits — just a memory file.

### Files touched
- `src/components/realm/OriginWheel.tsx` — one Link target change
- `soul_identities` rows for `cancer` and `pisces` — sigil column only (data UPDATE, requires migration)
- `mem://references/venice-gateway` — new memory file

### Not in scope today
- Phase 7 (Building placement gesture on tiles) — full session needed
- Venice key swap — waiting until you give the word
- Chamber theming for the 12 Houses — Phase 8
