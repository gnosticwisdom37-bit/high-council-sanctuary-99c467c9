## Goal

Drop any of the three Jetpack-style CSVs into the Workshop and get a clean stats view: top posts, top document downloads, and a world map of visitors — cross-referenceable across uploads and time periods.

## The three CSV shapes (auto-detected by columns, not filename)

1. **Posts & pages** — `title, views, url?` (url optional; e.g. "Homepage (Latest posts)")
2. **File downloads** — `path, downloads` (path begins with `/`, ends in a file extension like `.pdf`)
3. **Locations / country** — `country, views` (2 cols, first col is a country name)

The current "blog_archive" CSV path assumes a richer WP export. We'll add a smarter detector that routes these three Jetpack shapes to their own typed stores, and leave the existing blog_archive flow intact as a fallback.

## Data model (3 new tables)

- `wp_stats_uploads` — one row per CSV drop: workshop_id, kind (`posts`|`downloads`|`countries`), source_filename, period_start, period_end (parsed from filename `…-day-MM_DD_YYYY-MM_DD_YYYY.csv`), row_count, created_at.
- `wp_post_views` — upload_id, title, url (nullable), views, position.
- `wp_file_downloads` — upload_id, path, filename (derived), downloads.
- `wp_country_views` — upload_id, country, iso_a2 (looked up from a static name→ISO map), views.

Standard RLS + GRANTs per project conventions.

## Drop Zone changes

In `dropzone.functions.ts`, before the existing blog_archive branch:

- Parse CSV, sniff header/first rows:
  - 2 cols + first col country-like → `countries`
  - 2 cols + first col starts with `/` and looks like a file path → `downloads`
  - 2–3 cols + numeric second col + optional url third col → `posts`
- If matched, insert into `wp_stats_uploads` + the matching child table, return a friendly summary ("42 posts catalogued · period Jun 18 2026").
- If not matched, fall back to existing blog_archive logic, then unrecognized queue.

Filename period parser: regex `-day-(\d{2})_(\d{2})_(\d{4})-(\d{2})_(\d{2})_(\d{4})\.csv` → period_start/end. Also supports `-month-…` and `-year-…` Jetpack variants.

## Studio: new "Blog Stats" panel

New component `src/components/workshop/BlogStatsPanel.tsx` inside the existing Studio, tabbed:

1. **Top Posts** — bar list of titles by total views across all selected uploads, click-through to URL. Search box. Last-period vs all-time toggle.
2. **Top Downloads** — same shape, grouped by file path; derives a friendly filename and links to the live PDF on `vondehnvisuals.com`.
3. **Visitors Map** — world choropleth using `react-simple-maps` + the bundled `world-110m` topojson (pure JS, Worker-safe; no native deps). Country name → ISO via a small static map (`src/lib/country-iso.ts`). Below the map: ranked country list with view counts.
4. **Cross-Reference** — for any selected post URL, show the matching download rows (by slug match between post URL and `/YYYY/MM/...pdf` path components) and the top countries during the same period. This is the "who's reading what, from where, and what they downloaded" view.

Period filter at the top: All time · Last upload · custom date range (drawn from `wp_stats_uploads.period_*`).

Server functions in a new `src/lib-server/wp-stats.functions.ts`:
- `listWpStatsUploads({ workshop_id })`
- `getTopPosts({ workshop_id, from?, to?, limit })`
- `getTopDownloads({ workshop_id, from?, to?, limit })`
- `getCountryViews({ workshop_id, from?, to? })`
- `crossReferencePost({ workshop_id, post_url })`

All aggregate with SUM(views/downloads) GROUP BY title/path/country across uploads in the period.

## Soul involvement

Out of scope for this pass — King's analytics view only. A Council read-only hook can be added later by exposing the same server fns to the speaker tool.

## Technical notes

- `react-simple-maps` + `d3-geo` are pure JS, Worker-safe; topojson committed under `src/assets/world-110m.json`.
- Country name normalization handles "Hong Kong SAR China" → HK, "United States" → US, etc.; unknowns shown in the ranked list but not on the map.
- Charts use existing `src/components/ui/chart.tsx` (Recharts) — no new dep beyond `react-simple-maps`.
- No changes to existing blog_archive table; old rows keep working.

## Out of scope

- WordPress.com OAuth stats pull (the connector lacks scope; CSV upload is the path forward).
- Soul-authored commentary on stats.
- Time-series line charts (every CSV is already pre-aggregated per period; can add if you upload many periods).

## Build order

1. Migration: 3 tables + GRANTs + RLS.
2. Detector + writer in `dropzone.functions.ts`.
3. Read-side server fns.
4. `BlogStatsPanel` with the four tabs, mounted in the Studio.
5. Drop your three sample CSVs, verify, iterate.