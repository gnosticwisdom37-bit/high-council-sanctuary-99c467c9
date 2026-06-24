# Map Fix + Cumulative Stats

## 1. Why the map looks empty (the actual bug)

The `world-atlas` topojson I used does **not** carry `iso_a2` on its country features — each feature only has `properties.name` and a numeric `id` (the UN M49 code, e.g. `156` for China, `840` for US, `124` for Canada).

My current code asks for `geo.properties.iso_a2`, finds `undefined`, and paints every country the default ink color. That's why China / US / Canada don't light up even though the data is sitting right there in the right-hand list.

**Fix:** match by numeric M49 code instead.
- Extend `src/lib/country-iso.ts` to also return `m49` for each country (small static table — same ~80 entries already there).
- In `BlogStatsPanel.tsx`, build the choropleth lookup keyed by M49 code, and read `geo.id` from each geography (that's what world-atlas exposes).
- As a safety net, also fall back to matching by `properties.name` (lowercased) so any country I haven't tagged with an M49 still gets colored.
- Bump the minimum fill from 18% → 30% and the max from 80% → 95% so even single-visit countries are clearly visible against the dark ink background.

After this, China, US, Canada, and every other country in your CSV will light up in gold proportional to their views.

## 2. Cumulative / time-series view (the Jetpack-style "over time" feel)

Right now every upload is summed together into one number per post / country / file. To get the "today vs. first upload" comparison you described, the data is already there — each row knows its `upload_id`, and each upload has a `period_start` / `period_end` parsed from the filename. I just need to surface it.

**Add a fourth tab: "Over Time"** to the BlogStatsPanel:
- Horizontal stacked bar per upload period (oldest → newest), one row per period showing total post views, downloads, and unique countries for that period.
- Below it, a sparkline-style mini chart of cumulative post views across all periods so you can see the trend at a glance.
- A small "Compare" toggle on the **Top Posts** and **Downloads** tabs: when on, each row shows two numbers — earliest-period total vs. latest-period total — with a delta arrow (↑ / ↓ / —) in dawn-gold.

No new tables needed. One new server function `getStatsOverTime` that returns `[{ period_start, period_end, post_views, downloads, countries }]` aggregated by `upload_id`. Front-end renders with the same dawn-themed bar style already in the panel (no new chart library).

## 3. Why nothing showed up until you sent an email

That's the panel mounting before the workshop's initial server-fn calls have any data — `useEffect` fires once on mount, and if the workshop id arrived a tick later (which happens on cold navigation), the fetches resolved with empty arrays and never re-ran. Already handled by the `useCallback` dep array, but I'll also key the panel on `workshopId` so a late-arriving id forces a clean refetch. That's why a full page reload (after sending the email) "magically" fixed it.

## Files touched

- `src/lib/country-iso.ts` — add `m49` numeric code to each entry.
- `src/components/workshop/BlogStatsPanel.tsx` — switch map keying to M49 + name fallback, brighten fill scale, add "Over Time" tab + Compare toggle.
- `src/lib-server/wp-stats.functions.ts` — add `getStatsOverTime` server fn.

No DB migration, no new dependency, no change to ingestion. Cost: well under a credit.
