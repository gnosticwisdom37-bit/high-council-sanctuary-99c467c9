## Goal

When You draft a **New Letter** from the Scriptorium (or a reply), there should be an "Attach files" affordance — and any files You attach should travel with the letter whether it sends now or on a schedule. Reply already supports this; Compose does not.

WordPress scope error is a separate piece — I'll address it next turn after this lands.

## Scope of this change

Frontend (Compose Drawer) + one server fn (scheduled mail) + the cron dispatcher. No new tables, no schema migration for live sends — `composeAndSend` already accepts `attachments`. Scheduled letters need one column to remember the files until send time.

## Changes

### 1. `src/components/workshop/InboxPanel.tsx` — ComposeDrawer
- Add `composeAttachments` state (mirrors the reply flow's `replyAttachments`).
- Render the existing `<AttachmentPicker>` under the "Edit body HTML before sending" details block, same styling as in the reply view.
- Pass `attachments: composeAttachments.map(({filename, mime_type, data_base64}) => …)` into both:
  - `composeAndSendFn` (send now) — already supported server-side.
  - `scheduleEmailFn` (schedule for later) — newly supported (see #2).
- Reset `composeAttachments` after a successful send / schedule, same as reply does.

### 2. `src/lib-server/inbox.functions.ts` — `scheduleEmail`
- Extend the Zod input with the existing `outgoingAttachmentsSchema` (optional).
- Persist into a new `attachments` jsonb column on `scheduled_emails` (array of `{filename, mime_type, data_base64}`).
- No change to how recipients are resolved or how the row is claimed.

### 3. `src/routes/api/public/dispatch-scheduled-mail.ts` — cron dispatcher
- Select `attachments` along with the other fields.
- Pass it into `dispatchScheduledRow({ data: { …, attachments } })`.

### 4. `dispatchScheduledRow` (same file as #2)
- Accept optional `attachments` in its input schema.
- Forward to the existing RFC 2822 builder, which already handles attachments for `composeAndSend` / `sendReply`.

### 5. Migration — `scheduled_emails.attachments`
- Add nullable `jsonb` column (default `null`); no backfill needed.
- No RLS/grant changes (table policies already exist).

## What I am NOT touching

- Reply attachment flow (already works).
- `appendSentAttachment` (today-only sent additions — already shipped).
- Recipient resolution, threading, stationery wrap, drafting gateway.
- WordPress scope issue (separate turn).

## Notes for me

- Cap stays at the existing `outgoingAttachmentsSchema` limits (≤10 MB raw / file, ≤5 files) for both send-now and scheduled.
- Data is stored as base64 in the jsonb cell — fine for the existing 5-file × 10 MB cap; the dispatcher decodes and uploads to Gmail at send time, identical to the live send path.
- After this ships, the next turn will tackle the WP `authorization_required` scope error by reconnecting the WordPress.com connection with the `posts` scope (and showing a friendly reconnect prompt in `WordPressSiteBinding` when the gateway returns 400/authorization_required).
