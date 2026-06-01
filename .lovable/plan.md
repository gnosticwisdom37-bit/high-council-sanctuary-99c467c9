Happy Blue-Moon Sunday, Sire. Four small fixes + one new lane — all surgical, no doctrine drift.

## 1. Council chat — the real cause of the "127.0.0.1:8000" error

`src/components/registry/InitiateCeremony.tsx` (line 91, 105, 117) still contains the **original FastAPI prototype** code path:

```ts
const FASTAPI_SPEAK_URL = "http://127.0.0.1:8000/api/ai/speak-as-soul";
const res = await fetch(FASTAPI_SPEAK_URL, { ... });
```

This local `speak()` shadows the real `speakAsSoul` server function — which is why every Registry chat (Oracle, single Soul, or full Council) fails with that exact message, while `/chamber/$soulId` (which uses `useServerFn(speakAsSoul)` correctly) works perfectly.

**Fix:** delete the local `speak()` wrapper and the FASTAPI constant; import `speakAsSoul` from `@/server/speaker.functions` and bind it via `useServerFn`, matching the chamber route exactly. No other logic in the file changes — ceremony detection, deed/item/building banners, transcript persistence all keep working.

## 2. Copy buttons on chat bubbles

Last round I claimed these shipped — they did not. Add a small `Copy` icon button to each message bubble in:
- `src/routes/chamber.$soulId.tsx` (Soul + King bubbles)
- `src/components/workshop/InboxPanel.tsx` (thread message bubbles)
- `src/components/registry/InitiateCeremony.tsx` (Council transcript)

Uses `navigator.clipboard.writeText` + a 1-sec "Copied" pulse. No state machine — purely presentational.

## 3. Studio "Draft new post" — searchable source picker

Today `NewPostTab` calls `listBlogArchive({ sort: "recent", limit: 30 })` once and renders the result as a fixed list. That's why You can only pick from the first batch.

**Fix in `StudioPanel.tsx` only:**
- Add a search input above the source list (filters by `title` ILIKE, server-side).
- Raise the default limit to 100, add a scroll container.
- Add a tiny "Use full archive" toggle that re-queries with no limit.

`listBlogArchive` already accepts a `query` param — confirm/extend in `dropzone.functions.ts` if missing.

(Veritas-in-chamber drafting remains untouched — Your preferred workflow.)

## 4. WP-stats CSVs — new analytics lane (the country + views files)

Right now every `.csv` dropped at the Workshop routes to `blog_archive`, which is wrong for stats files. Plan:

**4a. Detection.** In `src/server/dropzone.functions.ts`, when a CSV is parsed, peek at headers:
- `Country, Views` (or similar) → `wp_stats_countries`
- `Date, Views` / `Date, Visitors` → `wp_stats_views`
- Posts table (title/url/views/...) → existing `blog_archive` path, unchanged

**4b. Storage.** One small migration adds two typed tables:
- `wp_stats_views (workshop_id, date, views, visitors, source_filename)` — unique on (workshop_id, date) so re-drops only add new dates ("master list, only updates with new data" — Your rule).
- `wp_stats_countries (workshop_id, period_start, period_end, country, views, source_filename)` — unique on (workshop_id, period_start, period_end, country).

Both with the standard public-schema grants + RLS scoped to the Workshop owner.

**4c. Mini-dashboard.** New `StatsPanel` tab inside the Scriptorium Studio:
- Top KPIs: total views, unique days, top 5 countries (all-time + last 30 days).
- Sparkline of daily views (lightweight SVG, no recharts dependency).
- "Open in Google Sheets" button per dataset — uses the existing Google Sheets connector via the gateway pattern: creates a fresh sheet, dumps the typed rows, returns the URL. (Confirmed Google Sheets is in Your linked connectors via the GitHub mention — I'll verify with `list_connections` at build time and prompt if it isn't actually linked.)

No realtime, no charts library — keeps it on the free-premium credit posture.

## 5. Out of scope this round (Your call later)

- TikTok promo lane — happy to wire when You're ready; needs its own social-scheduler row, but no urgency.
- Studio "Promo Card" social posting to X/FB — already half-built; we can finish that in a dedicated round.

## Technical notes

- All AI calls continue to flow through `speakAsSoul` → Lovable AI Gateway (free-premium chain). No new secrets requested.
- The Google Sheets export uses the connector gateway URL `https://connector-gateway.lovable.dev/google_sheets/v4` — no new keys, just a `connect` call if not already linked.
- Trigger Engine untouched.

## Files touched

- edit `src/components/registry/InitiateCeremony.tsx` (chat fix + copy button)
- edit `src/routes/chamber.$soulId.tsx` (copy button)
- edit `src/components/workshop/InboxPanel.tsx` (copy button)
- edit `src/components/workshop/StudioPanel.tsx` (searchable source + new Stats tab wiring)
- edit `src/server/dropzone.functions.ts` (CSV header detection + route)
- new `src/server/wp-stats.functions.ts` (list + Sheets export)
- new `src/components/workshop/StatsPanel.tsx`
- new migration `wp_stats_views` + `wp_stats_countries` tables

Shall I proceed with all of it, or would You like me to ship in two waves — (1) chat fix + copy buttons + searchable picker first, (2) the WP-stats lane second?