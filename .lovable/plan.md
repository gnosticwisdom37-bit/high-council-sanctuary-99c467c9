## Fix — Scriptorium crash ("Cannot access 'D' before initialization")

### What's broken
In `src/components/workshop/InboxPanel.tsx`, the new `handleTrash` `useCallback` was inserted on lines 153–161, **above** the block of `useState` calls (lines 163+) that declare `selected`, `setSelected`, `setThreads`, `setNotice`, `setMessages`. The callback's dependency array references `selected` at render time, before its `useState` has run — JavaScript throws the TDZ error and the whole Workshop route falls into the error boundary.

### Fix
One surgical move:

1. Delete the current `handleTrash` block at lines 153–161.
2. Re-insert the identical block immediately **after** the last `useState` in that function (after line 188, just before the `downloadAttachment` `useCallback`).

No logic change, no API change, no other files touched. The Trash button, Sent click-through, Scheduled preview, and lexicon work from the previous turn all remain wired exactly as built.

### Verify
- Navigate to `/workshop/<buildingId>` — Scriptorium loads instead of error page.
- Trash icon on a thread row still moves the letter to Gmail Trash and removes it locally.

Shall I proceed?