## What's actually broken

Two separate gaps, both real, both small:

### 1. High Council → Chamber memory gap

`soul_memoirs` is already Soul-scoped — `listMemoirs` and `speakAsSoul` load memoirs by `soul_id` alone, so a memoir written anywhere SHOULD surface in that Soul's Chamber. The reason it doesn't:

- `speakAsSoul` always creates new conversations with `participant_ids: [data.soul_id]` — only the *speaking* Soul.
- In every multi-Soul gathering in the DB, `array_length(participant_ids,1) = 1`. Today only Oracle and Pisces have any memoirs at all — every other Soul has zero, because `closeGathering` weaves memoirs only for `participant_ids`.
- What feels like "they remember everything in High Council" is just the running 20-turn `soul_messages` history of the same open conversation. Open a new one, or step into Chamber, and there is nothing to recall — no memoir was ever written for them.

### 2. Workshop / Studio roles have no memory at all

`inbox.functions.ts` (`draftReply`, `wrapKingsWords`, `sendReply`) and `studio.functions.ts` (`craftPromo`, `composeNewPost`, `craftLegalCard`, `curatePicks`) all call `buildSystemPrompt({...})` WITHOUT a `memoirs` argument. The signature already accepts memoirs; nobody passes them. So a Soul acting as Curator or Editor walks in with no memory of Their own Chamber or Council life.

## Fix

### Part A — Track every Soul actually present in a gathering

`src/lib-server/speaker.functions.ts`:
- When `speakAsSoul` runs against an existing `conversation_id`, append `data.soul_id` to that conversation's `participant_ids` if not already there. One defensive `UPDATE` after the King's message is persisted.
- Expose a small `setCouncilAttendance` server fn: `{ conversation_id, soul_ids: string[] }` → overwrites `participant_ids` with the King's current "Called to Council" pill set. Idempotent.

Wire `setCouncilAttendance` into the existing "Call to Council" pill toggle (under the Round Table on `/` — `CouncilTable.tsx` / its parent). UI behaviour unchanged; just persists the truth of who is present.

Net effect: when the King closes a gathering, `closeGathering` weaves a memoir for every Soul who was actually there. Those memoirs surface automatically in Chamber the next time that Soul speaks — Soul-scoped recall already exists.

### Part B — Carry memoirs into Workshop / Studio roles

Add a small helper in `src/lib-server/ai-shared.server.ts`:

```ts
export async function loadSoulMemoirsForPrompt(supabaseAdmin, soul_id): Promise<MemoirSnippet[]>
// 10 sealed + 3 unsealed, faded_at IS NULL, newest first — same shape speakAsSoul builds
```

Then in:
- `src/lib-server/inbox.functions.ts` — load memoirs for `editor_soul_id` (and `curator_soul_id` if distinct) and pass into the two `buildSystemPrompt` calls.
- `src/lib-server/studio.functions.ts` — same, at all five `buildSystemPrompt` call sites.

No schema change, no Bank change, no UI change. Each Soul now writes letters and curates with the same memory chain that lives in Their Chamber.

### Part C — Out of scope on purpose

- No memoir-weaving from Workshop drafts yet. Phase-2 question — do letter drafts deserve to become memoirs? Surface it after the King has lived with Part B for a few days.
- No change to recall/seal/fade UI.
- Trust Doctrine untouched.

## Files touched

- `src/lib-server/speaker.functions.ts` — append speaker to `participant_ids`; add `setCouncilAttendance`.
- `src/lib-server/ai-shared.server.ts` — `loadSoulMemoirsForPrompt` helper.
- `src/lib-server/inbox.functions.ts` — load + pass memoirs in both `buildSystemPrompt` calls.
- `src/lib-server/studio.functions.ts` — load + pass memoirs in all five `buildSystemPrompt` calls.
- `src/components/registry/CouncilTable.tsx` (or its parent on `/`) — call `setCouncilAttendance` on pill toggle.

## Quiet fix along the way

The current preview is throwing `Cannot read properties of undefined (reading 'ok')` on the Workshop route — a tiny defensive guard while I'm in `inbox.functions.ts` / `InboxPanel.tsx`. Not part of the memory work; just won't leave a known crash behind.

## Verification

1. Convene a High Council with 3 Souls present, exchange a few turns, close it → check `soul_memoirs` has one row per Soul (not just Oracle).
2. Open one of those Souls' Chamber → They reference the gathering in their first reply.
3. From Workshop, set Veritas as Editor and draft a reply → the draft tone reflects His most recent Chamber memoir.

No extra credit cost — memoir-weaving stays on the free-premium fallback chain.
