## Phase 9 — The Studio: Three Card Types

Turn the Workshop's Production pane into a true Studio with **three distinct card types**, each sourced from the typed Phase 8.2 stores. WordPress.com (OAuth connector) publishes posts; Google Calendar holds private Legal reminders.

---

### 1. The three card types

| Type | Source | Steward drafts | Lands on |
|---|---|---|---|
| **Promo Card** | a row from `blog_archive` | short social blurb + hashtags, links to the existing WP `url` | X / Meta scheduler (existing `scheduled_posts`, channel = `social`) |
| **New Post** | empty brief OR a row from `blog_archive` (Repurpose mode) | full WP post body (title, excerpt, body markdown, tags, categories) | WordPress.com draft → optional scheduled publish |
| **Legal Milestone** | a row from `legal_documents` | one-line summary (who served whom, what's due, when) | Google Calendar event on `date_served` (or `hearing_date` / `date_due` if picked); private, no social |

The active card type is a tab in the Production pane, replacing today's single "promo-cards" view. `workshops.active_tool_key` now accepts `promo-cards | new-post | legal-milestone` and the Studio remembers the King's last choice per Workshop.

---

### 2. UI — `src/routes/workshop.$buildingId.tsx`

Production pane gets:

- **Top tab strip**: `Promo · New Post · Legal Milestone` (matches the three card types above).
- **Source picker** under the tabs:
  - Promo / New Post → "Pick from Blog Archive" drawer using `listBlogArchive({ sort: 'recent' | 'top-views' })`. Shows title, date, views; click pre-fills the draft.
  - New Post also has a "Start blank" affordance for original content.
  - Legal Milestone → "Pick from Legal Docket" drawer using `listLegalDocuments({ anchor })`. Shows doc_title, document_type chip, date_served, served_upon[0].
- **Draft card** (parchment, existing look) with type-specific fields:
  - Promo: title, body (≤280), hashtags
  - New Post: title, excerpt, body (markdown textarea), tags, categories, WP status (draft / scheduled / publish)
  - Legal: event_title, summary, anchor_date (defaults to `date_served`), reminder offset (1 day / 1 week / both)
- **Action button** changes by type: "Schedule social post" / "Save to WordPress" / "Add to Calendar".

Scriptorium drawer (right column) stays — it still surfaces the `legal-review` queue (PDFs missing `date_served`) and the `unrecognized` queue.

---

### 3. WordPress.com — connector wiring

1. Call `standard_connectors--connect` with `connector_id: wordpress_com` to link the OAuth account. Adds `WORDPRESS_COM_API_KEY` to server env.
2. New table `workshop_wp_links` (one row per workshop): `workshop_id`, `wp_site_id` (the WP.com site ID the user picks once), `default_status`, `default_categories[]`, `default_tags[]`.
3. New server fns in `src/server/wordpress.functions.ts`:
   - `listWpSites()` — `GET /rest/v1.1/me/sites` through the gateway, returns `[{ id, name, url }]` for a one-time picker.
   - `setWorkshopWpSite({ workshop_id, wp_site_id, defaults })`.
   - `createWpPost({ workshop_id, title, content, excerpt, tags, categories, status, date? })` — `POST /rest/v1.1/sites/{site_id}/posts/new`. `status` ∈ `draft | publish | future`; when `future`, pass `date` (ISO). Returns the new `wp_post_id` + `url`.
   - `listWpPosts({ workshop_id, search?, limit })` — for the "edit existing" path later.
4. Posts created via the Studio are mirrored back into `blog_archive` with `wp_post_id` so they appear alongside CSV-imported history.

All requests go through `https://connector-gateway.lovable.dev/wordpress_com/...` with the two required headers — never the WP REST API directly.

---

### 4. Google Calendar — private reminders for Legal

1. `standard_connectors--connect` with `connector_id: google_calendar`.
2. `workshops.google_calendar_id` already exists; keep it. Add a one-time calendar picker (`GET /users/me/calendarList`) on first use.
3. New server fns in `src/server/calendar.functions.ts`:
   - `listCalendars()` — picker source.
   - `createLegalEvent({ workshop_id, legal_document_id, anchor: 'date_served'|'hearing_date'|'date_due', summary, reminderDays[] })` — `POST /calendars/{calendarId}/events`. Stores returned `google_event_id` on a new `legal_calendar_events` row (`legal_document_id`, `google_event_id`, `anchor_used`, `event_at`).
   - `cancelLegalEvent({ legal_document_id })` — `DELETE` upstream + clear the row.
4. Legal Milestone card has no path to social. The connector authenticates the workspace owner's account (King Sean's) — fine for private reminders.

---

### 5. Card-type-aware AI drafters

Three new server fns (or one with a `kind` discriminator) in `src/server/studio.functions.ts`:

- `draftPromoFromBlog({ workshop_id, blog_archive_id })` — same shape as today's `draftPromoCard` but reads from the typed `blog_archive` row, includes `views` as a "this post is loved by X readers" hint.
- `draftNewPost({ workshop_id, brief?, source_blog_archive_id? })` — if `source_blog_archive_id` is set, the Steward is told to **rewrite** that post for a new audience (Repurpose). Output is structured: `{ title, excerpt, body_markdown, tags[], categories[] }`. JSON-only response, same fallback chain.
- `draftLegalCard({ workshop_id, legal_document_id, anchor })` — pulls the typed fields (served_upon, served_by, parties, case_number) and returns `{ event_title, summary, suggested_reminder_days[] }`. No hashtags, no social tone — neutral, Steward-voiced.

All three use the existing One Key, Many Souls gateway + Credit Hierarchy (free-premium chain first, Bank petition only if the King opts in for a premium model).

---

### 6. `scheduled_posts` reuse vs. new tables

- **Promo** keeps using `scheduled_posts` (`channel: 'social'`, body/hashtags) — no schema change.
- **New Post** uses `scheduled_posts` with a new `channel: 'wordpress'` value + `wp_post_id` column (nullable until published).
- **Legal Milestone** does NOT use `scheduled_posts`. It uses the new `legal_calendar_events` table because it's a calendar event, not a publishable post.

Migration adds:
- `legal_calendar_events` (new)
- `workshop_wp_links` (new)
- `scheduled_posts.channel` enum extension to include `wordpress`
- `scheduled_posts.wp_post_id text`, `scheduled_posts.wp_url text` (nullable)

All four with same permissive RLS as the other curated stores (Lovable Cloud, single-tenant for now).

---

### 7. What's NOT in this phase

- X / Meta auto-publish (still manual copy-out for now — `scheduled_posts.status` is the source of truth; we'll wire a Buffer-style connector in a follow-up).
- WordPress.com → blog_archive backfill (one-time importer can come later; today's CSV path is enough).
- Per-card editor for Legal docs missing `date_served` (Scriptorium "legal-review" chip is the placeholder; full editor is its own phase).
- Bulk operations (one-card-at-a-time only).

---

### 8. Build order

1. Migration: `legal_calendar_events`, `workshop_wp_links`, `scheduled_posts` columns + enum.
2. Connect WordPress.com + Google Calendar (calls `standard_connectors--connect` — the King picks the accounts).
3. `wordpress.functions.ts` + site picker UI.
4. `calendar.functions.ts` + calendar picker UI.
5. `studio.functions.ts` — three drafters.
6. Studio UI: tab strip + source-picker drawers + type-specific draft fields + actions.
7. Verify against a real `blog_archive` row and a real `legal_documents` row.

Ready to build on approval.
