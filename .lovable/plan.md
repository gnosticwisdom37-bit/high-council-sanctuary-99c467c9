## Phase 8.2 — Two Curated Stores for Event-Spark

Split the single `curated_outputs` table into two purpose-built stores with typed columns, so the Studio and the Google-integrated Event-Spark calendar can filter, rank, and schedule directly from the database — no JSON spelunking.

---

### 1. New tables

**`blog_archive`** — one row per WordPress post (from `.csv`)

Typed columns: `title`, `url`, `published_at`, `excerpt`, `tags[]`, `categories[]`, `views`, `comments`, `wp_post_id`, plus `workshop_id`, `source_filename`, `raw` (jsonb for any extra WP columns we don't promote).

Index: `(workshop_id, published_at desc)`, `(views desc)`.

**`legal_documents`** — one row per PDF

Typed columns:
- `doc_title`, `document_type` (affidavit / notice / summons / motion / order / other — enum, Soul-corrigible)
- **`date_served`** ← calendar anchor (your choice)
- `date_filed`, `date_due`, `hearing_date` (all nullable)
- `served_upon` (text[] — recipients), `served_by` (text), `parties` (text[])
- `email_addresses` (text[]), `phone_numbers` (text[]), `addresses` (text[])
- `case_number`, `jurisdiction`
- `page_count`, `extracted_clauses` (text[])
- `workshop_id`, `source_filename`, `source_bytes`
- `raw` (jsonb — full page texts + anything the heuristic isn't sure about)

Index: `(workshop_id, date_served desc nulls last)`, `(document_type)`.

Both tables get the same permissive RLS as the existing curated stores.

`curated_outputs` stays in the schema for now (Phase 8.1 rows live there) — new writes go to the split tables; we can retire it once the old rows are migrated or aged out.

---

### 2. Parser upgrades (`src/server/dropzone.functions.ts`)

**CSV → `blog_archive`:** widen the header detector to also surface `views / hits / visits`, `comments`, `category / categories`, `post_id`. Anything unmapped lands in `raw`. Still mirror rows into `csv_intakes` (`tool_key: 'promo-cards'`) so the Steward Soul has the Scriptorium queue.

**PDF → `legal_documents`:** keep `unpdf` for text + page count, then add deterministic extractors (all regex/heuristic, no extra AI cost):
- **emails:** standard email regex, dedupe.
- **phone numbers:** NANP + international common forms.
- **addresses:** street-line heuristic (number + street-type keyword).
- **dates:** match `Served on …`, `Date of Service:`, `Filed:`, `Hearing:`, `Due:`; parse into ISO. `date_served` is required for the calendar — if not found, leave null and surface a "needs review" badge in the Scriptorium.
- **served_upon / served_by:** capture phrase windows around "served upon", "to:", "by:".
- **case_number / jurisdiction:** match `Case No.`, `Docket`, court-name keywords.
- **document_type:** keyword classifier over the first page (Affidavit / Notice / Summons / Motion / Order / Other).

Return shape from `processDroppedFile` gains `legal_document_id` or `blog_archive_id` so the UI can deep-link.

---

### 3. Studio reads (Event-Spark integration)

Add two server functions:
- `listBlogArchive({ workshop_id, sort: 'recent'|'top-views', limit })`
- `listLegalDocuments({ workshop_id, anchor: 'date_served'|'hearing_date', from, to })`

In the Workshop production pane (`src/routes/workshop.$buildingId.tsx`), the Implement selector gets two new sources: **"Blog Archive → Promo Card"** and **"Legal Docket → Milestone Card"**. Picking a row pre-fills the Steward Soul's draft with the row's typed fields (title, date, recipients) so the card writes itself in a sentence or two.

`scheduled_posts` already exists — when a Legal Milestone card is scheduled, default `scheduled_at` = `date_served` (or `hearing_date` if the King chose that anchor at draft time).

---

### 4. Migration & cleanup

- Migration: create the two enums (`legal_doc_type`), two tables, indexes, RLS.
- No data migration of existing `curated_outputs` rows (small sample set from Phase 8.1 testing — fine to leave or re-drop the files).
- `listCuratedOutputs` / `listUnrecognized` stay; we just stop writing new `blog-archive` / `legal-document` rows into `curated_outputs`.

---

### 5. Out of scope (next phases, not now)

- The actual Google Calendar push — `scheduled_posts.google_event_id` is already in place; we'll wire the OAuth + insert in a follow-up.
- A "needs review" editor for legal docs with missing `date_served` — for now we surface them in the Scriptorium with a chip; full editor is its own phase.
- Re-parsing old `curated_outputs` rows into the new tables.

---

### Technical notes

- All extractors run in TS on the Worker — no Python server-side, consistent with Phase 8.1.
- All heuristic extractors are pure functions in `src/server/legal-extractors.ts` so they're unit-testable later.
- `raw` jsonb on both tables is the escape hatch — anything the heuristics miss is still recoverable; the Steward Soul can fish it out at draft time.

Ready to build on approval.