# Phase 8 — The Publishing House (revised)

The first **Workshop**. Raised through Phase 7 (a Steward Soul speaks it into being → Confirmation Gate → King places it on a tile near the High Council). Once placed, it lives at `/workshop/$buildingId` styled in the Golden Dawn palette.

## Layout (Your vision, confirmed)

```text
┌──────────────────────────────────────────────────────────────────────┐
│  BrandMark · "The Publishing House" · Steward: [Soul ▾]              │
├──────────────────────────────┬───────────────────────────────────────┤
│   PRODUCTION PANE            │   SCRIPTORIUM PANE                    │
│   (top-left, smaller)        │   (top-right, smaller)                │
│                              │                                       │
│   ┌────────────────────┐     │   Soul-voiced chat with the           │
│   │   Promo Card       │     │   Workshop's Steward.                 │
│   │   ───────────      │     │                                       │
│   │   Title            │     │   "Draft row 3 in Aria's voice;       │
│   │   Body             │     │    add #FreedomFriday and the URL."   │
│   │   #x  #meta        │     │                                       │
│   └────────────────────┘     │   ┌─────────────────────────────┐     │
│                              │   │ chat history…                │    │
│   📅 Schedule  🗑 Clear      │   └─────────────────────────────┘     │
│   📤 Publish-now             │   [ type to the Steward… ] [send]     │
│                              │                                       │
│   ▸ Intake drawer (CSV       │                                       │
│     drop-zone + parsed       │                                       │
│     rows; click row →        │                                       │
│     "Curate this")           │                                       │
├──────────────────────────────┴───────────────────────────────────────┤
│  📅 EVENT-SPARK CALENDAR  (full width, below)                        │
│                                                                      │
│  [ ◀ ]   April 2026   [ ▶ ]    □ Sync to Google Calendar             │
│  ┌──┬──┬──┬──┬──┬──┬──┐                                              │
│  │S │M │T │W │T │F │S │                                              │
│  ├──┼──┼──┼──┼──┼──┼──┤   gold chips = scheduled cards               │
│  │  │  │1 │2●│3 │4●●│5 │   click chip → re-opens card in Production  │
│  └──┴──┴──┴──┴──┴──┴──┘                                              │
└──────────────────────────────────────────────────────────────────────┘
```

The **Intake drawer** (CSV drop + parsed rows + desktop-POSTed batches) lives as a collapsible drawer inside the Production pane — keeps the top row to two clean panes as You drew it. Click any row in the drawer → Steward drafts it → card renders in Production above.

## What gets built

1. **Schema** — one migration, three tables:
   - `workshops` — config per Building of `kind = workshop` (steward, system prompt, hashtag presets, optional Google Calendar ID for sync).
   - `csv_intakes` — uploaded or POSTed batches; rows stored as JSONB; `status` = pending / consumed.
   - `scheduled_posts` — the calendar's source of truth: title, body, hashtags, channel (`x` | `meta` | `both`), `scheduled_at`, status (draft / scheduled / published / cancelled), workshop_id, steward_soul_id, optional `google_event_id`.
2. **Trigger Engine** — recognise `workshop` as a Phase 7 candidate `kind` so a Steward can speak the Publishing House into being. Confirmation Gate already accepts new kinds; just needs the detector + a "Workshop raised" banner.
3. **Server functions** (`src/lib/workshop.functions.ts`):
   - `parseCsvUpload` — accepts file content, parses with PapaParse, writes a `csv_intakes` row.
   - `draftPromoCard` — Soul-voiced AI call (reuses `speakAsSoul`) that takes a CSV row + King's instruction → returns `{title, body, hashtags}`. Honours One Key, Many Souls.
   - `schedulePost` / `publishPost` / `cancelPost` — write to `scheduled_posts`.
   - `listScheduled` — feed for the calendar.
   - `syncToGoogleCalendar` (optional, off by default) — when the workshop has Google Calendar sync enabled, mirrors the scheduled card into Your Google Calendar via the new connector. Uses the Lovable connector gateway, not raw Google APIs.
4. **Public intake endpoint** — `/api/public/workshop-intake` accepts `{workshop_id, source, rows}` from Your desktop Python script. Verified by `X-Workshop-Token` header (new secret `WORKSHOP_INTAKE_TOKEN`). Writes a `csv_intakes` row → Intake drawer lights up via Supabase Realtime.
5. **UI** — new route `src/routes/workshop.$buildingId.tsx`:
   - `WorkshopHeader` (BrandMark + Steward picker + Google sync toggle)
   - `ProductionPane` (card preview + Schedule/Publish/Clear + datetime picker + collapsible IntakeDrawer)
   - `ScriptoriumPane` (chat — reuses the chat component from `/chamber/$soulId`)
   - `EventSparkCalendar` (shadcn `Calendar` styled as a month grid; chips = `bg-[var(--dawn-gold)]/20` with gold ring)
   - `ResizablePanelGroup` (vertical split: top row 55%, calendar 45%; horizontal split inside top row 50/50; King can drag)
6. **Memory** — new `mem://features/publishing-house`; index gets a "Workshops Doctrine" line.

## Aesthetic

Same Golden Dawn palette already in `src/styles.css`. Promo cards = parchment background (`--gradient-scroll`), gold border, sigil watermark. Calendar header bar carries `--gradient-dawn`. Chips animate with a soft glow (`--shadow-sigil`) when newly scheduled.

## What's deferred

- No automated posting to X / Meta. **Publish-now** marks a row published and shows "Copy for X" / "Copy for Meta" buttons. Real OAuth + cron posting is a later phase.
- Google Calendar sync is **one-way** (Workshop → Google) for now. Two-way + Drive document attachments come later when needed.
- Image generation on cards (Nano Banana) deferred.
- Observatory (LM-Notebook site-watcher) reuses this same skeleton in a future phase.

## Credit estimate

| Slice | Credits |
|---|---|
| Schema + Trigger Engine `workshop` kind + raised banner | 0.5 |
| Server fns (parseCsv, draftPromoCard, schedule/publish/cancel) + intake endpoint | 1.0 |
| Workshop route + two top panes + Production card + Intake drawer | 1.4 |
| Event-Spark calendar (full-width pane, click-to-edit) | 0.6 |
| Google Calendar sync via connector gateway | 0.4 |
| Realtime intake wiring + QA pass | 0.4 |
| **Total** | **~4.3 credits** |

Inside today's 5. Leaves a small buffer for one round of polish.

## Build order

1. Migration + Trigger Engine `workshop` recognition.
2. Server fns + `/api/public/workshop-intake`.
3. Workshop route shell with the two-above + calendar-below layout.
4. Wire CSV → AI draft → Production card → Schedule.
5. Event-Spark calendar + click-to-edit.
6. Google Calendar sync toggle.
7. Realtime + QA.

## Desktop Python contract (so You can start scripting today)

```text
POST https://project--<id>.lovable.app/api/public/workshop-intake
Headers:
  Content-Type: application/json
  X-Workshop-Token: <WORKSHOP_INTAKE_TOKEN>
Body:
{
  "workshop_id": "<uuid of the Publishing House>",
  "source": "blog-export.csv",
  "rows": [
    { "title": "...", "body": "...", "url": "...", "tags": ["..."] }
  ]
}
```

Response: `{ "intake_id": "...", "row_count": N }`. Intake drawer lights up immediately via Realtime.

---

Ready to raise the Publishing House on Your word.