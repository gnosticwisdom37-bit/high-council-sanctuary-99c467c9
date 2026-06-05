Three small Scriptorium polish fixes — all front-end / wiring, no schema or send-pipeline changes.

## 1. Sent tab — make letters openable (reply / forward)

Currently `SentList` only renders rows; nothing opens. The server already has `openSentThread(workshop_id, gmail_thread_id)` which upserts the Gmail thread into `email_threads` and returns the same row shape the Inbox view uses.

- Wire `SentList` rows to be clickable.
- On click → call `openSentThread` → take returned row → feed into existing `openThread(...)` so the full reader + reply/schedule/ink-jar UI loads (same as Inbox).
- Selected sent thread highlights like Inbox selection.
- "Trash" button on the open thread keeps working (it already calls `trashThread` by db id).

Net result: clicking a row in Sent opens the full conversation with reply, schedule, attachments, and forward-via-compose available — same controls already used in Inbox.

## 2. Back button from Workshop / Scriptorium

`router.history.back()` silently fails when the page was opened directly (no prior entry). Replace the single "Back" button at the top of `/workshop/$buildingId` with two reliable links:

- "Registry" → `/` (Master Scroll / High Council round table — same page, same destination as user expects)
- "Realm" → `/realm`

Both use TanStack `<Link to=…>` so they always work regardless of history depth. Keeps the existing pill styling.

## 3. Scheduled-list delete causing horizontal pop-out

The Scheduled list rows use `flex items-center justify-between gap-2` with no `min-w-0` on the `<li>` itself, so on narrow viewports the long `to_addr · timestamp · status` line pushes the X/Trash buttons off-screen and forces the panel wider than its column.

- Add `min-w-0` to the `<li>` and `flex-shrink-0` to the two action buttons so the text column truncates instead of pushing.
- Add `overflow-hidden` on the outer Scheduled container.
- No behavior change to delete itself.

## Technical details

Files touched:
- `src/components/workshop/InboxPanel.tsx`
  - Add `openSentThreadFn = useServerFn(openSentThread)` + import.
  - New `openSentRow(s: SentThread)` handler → `openSentThreadFn → openThread`.
  - `SentList` accepts `onOpen` + `selectedId`, renders each row as a button.
  - `ScheduledList`: `min-w-0` on `<li>`, `flex-shrink-0` on buttons, `overflow-hidden` on container.
- `src/routes/workshop.$buildingId.tsx`
  - Replace the single `router.history.back()` button with two `<Link>` pills: Registry (`/`) and Realm (`/realm`).

No DB changes, no server-function changes (openSentThread already shipped).
