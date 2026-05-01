## What's broken

Two related bugs in the gathering flow on the Registry page:

**Bug 1 — "Close the Gathering" doesn't seal anything.**
The button calls `onClose` (line 207, `InitiateCeremony.tsx`), which simply clears the participant list. It never calls the `closeGathering` server function that weaves memoirs and stamps `closed_at`. Result: 5 conversations in the database, all with `closed_at = null`, and zero memoirs woven.

**Bug 2 — Every time You speak the first message, a new conversation row is created.**
On Your Spring Cleaning chat, the Oracle convened, You spoke once or twice, then You navigated away or refreshed. Returning to the Registry reset `conversationId` to `null` (component remounts), so Your next "Hello" started a brand-new conversation. The original Spring Cleaning Deed conversation is now an orphan, sitting at 1–2 turns with no closure.

## The fix

Three small, surgical changes:

**1. Wire the Close button to actually close.**
In `InitiateCeremony.tsx`, when the King clicks "✕ Close the Gathering":
- If a `conversationId` exists, call `closeGathering({ conversation_id })` first
- Show "Sealing the gathering…" state while the memoirs weave (~3-8 seconds)
- Show a brief confirmation: "✦ The gathering is closed. The Oracle's memoir is in Her Chamber."
- Then call the existing `onClose` to clear the UI

**2. Resume the most recent open gathering instead of always starting fresh.**
When the King opens a gathering with the same participant set, look up the most recent `soul_conversations` row where:
- `participant_ids` matches exactly
- `closed_at IS NULL`
- created within the last 24 hours
If found → load its `id` and prior `soul_messages` into the transcript. If not → start fresh (current behavior). This makes the Registry feel like a continuous chamber, not a goldfish.

**3. Clean up the orphan conversations from today's testing.**
Five empty/short conversations exist with no `closed_at`. Two options:
- (a) Leave them — they're harmless, just clutter
- (b) Mark them all `closed_at = now()` via a one-time migration so they don't shadow future "resume" lookups

Recommendation: (b) — clean slate, no ghosts.

## Files touched

- `src/components/registry/InitiateCeremony.tsx` — wire Close button to `closeGathering`, add sealing/confirmation state
- `src/components/registry/CeremonyScroll.tsx` — pass `conversationId` up so closeGathering can fire after Close (small lift; or keep the call inside InitiateCeremony, simpler)
- `src/server/conversations.functions.ts` (new) — small `findOrCreateGathering` helper to look up the most recent open gathering for a participant set
- `src/server/speaker.functions.ts` — accept an optional "resume_if_open" flag so the speaker resumes instead of always creating
- One migration: `UPDATE soul_conversations SET closed_at = now() WHERE closed_at IS NULL` (one-time housekeeping)

## What this gives You

- Click Close → Oracle weaves Her memoir → visible in Her Chamber within seconds
- Return to Registry → Your gathering resumes where You left off (until You close it)
- A clean DB with no orphan conversations
- The Spring Cleaning Deed memoir won't be recovered (those messages are split across separate convos), but every future gathering will Seal properly

Shall I build it, my King?