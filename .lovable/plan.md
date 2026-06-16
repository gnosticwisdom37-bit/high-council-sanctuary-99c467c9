## The bug

When You open a thread from the Sent folder and send (or schedule) a reply, the letter goes to Your own address instead of to the original recipient. Two places conspire:

1. `openSentThread` (in `src/lib-server/inbox.functions.ts`) seeds the local `email_threads` row using the first message's **From** header — for a Sent thread that's *You*. So `thread.from_addr` becomes Your own address.
2. `sendReply` falls back to `threadRow.from_addr` whenever there's no prior **inbound** message in the thread — which is exactly the case for a fresh Sent thread. Result: reply addressed to You.
3. `handleScheduleReply` in `InboxPanel.tsx` has the same shape: it picks `messages[last].from_addr`, which for a Sent-only thread is also You.

## The fix (one small surgical change per layer)

### 1. `src/lib-server/inbox.functions.ts` — `openSentThread`
Parse the first message's **To** header (already requested in `metadataHeaders`) and store *that* as the thread's `from_addr` (the counterparty). Keep everything else identical. Sent threads then look like inbound threads from the recipient's perspective, which matches how the rest of the UI already reasons about a "thread partner."

### 2. `src/lib-server/inbox.functions.ts` — `sendReply` (~line 918)
Strengthen the fallback chain so it never picks an address that equals Your own `kingFrom`:
- prefer last **inbound** `from_addr`
- else last **outbound** `to_addr` (the actual recipient of the last sealed letter We sent)
- else `threadRow.from_addr`

This makes Sent-thread replies correct even on rows that were opened before the patch.

### 3. `src/components/workshop/InboxPanel.tsx` — `handleScheduleReply` (~line 431)
Mirror the same rule when picking `replyTo`:
- last message with `direction === "inbound"` → its `from_addr`
- else last message with `direction === "outbound"` → its `to_addr`
- else `selected.from_addr`

(The `ThreadMessage` type already carries `to_addr`; `direction` is on the server-side row. The minimum extra needed is to expose `direction` on `ThreadMessage` from `getThread` if it isn't already — I'll check during the build turn and add it only if needed.)

## Not in scope

No DB migration, no schema change, no UI redesign. Existing Sent rows already stored with the wrong `from_addr` will be self-healing the next time You click them (openSentThread upserts).

## After the fix

You'd test by:
1. Open a Sent thread → schedule a reply 2 min out → confirm the cancel-modal preview shows the original recipient, not You.
2. Open the same Sent thread → send a reply immediately → confirm Gmail's Sent folder shows the right To.

Quick, contained, and clears the way for tonight's memory testing.