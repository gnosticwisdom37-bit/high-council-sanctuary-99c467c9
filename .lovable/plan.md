# Sacred Inbox — Full Gmail Parity

Four pieces, smallest-fix-first so each lands cleanly inside the Pro credit budget.

---

## 1. Fix the "send strips formatting" bug *(highest priority — 1 small edit)*

**What you're seeing:**
- Preview shows the full sealed letter with header, body, signature, thumbprint.
- Received message shows only the last paragraph, with `Ã¢Â€Â—` instead of `—`.

**Root cause:** in `sendReply` the RFC-2822 message is built like this:

```
Content-Type: text/html; charset="UTF-8"
<blank line>
<entire HTML on one giant line, no transfer encoding>
```

Two problems with that:
- No `Content-Transfer-Encoding`, so the UTF-8 bytes are treated as 7-bit ASCII → em-dashes mojibake on the receiving end.
- The HTML is one ~5KB line. Gmail's renderer applies its "trim quoted text" heuristic aggressively and collapses everything above the signature line into a hidden block — which is exactly the "only one sentence shown" symptom.

**Fix:** in `src/server/inbox.functions.ts` → `sendReply`, base64-encode the HTML body, declare it properly, and add `Content-Transfer-Encoding: base64` (plus `MIME-Version`, which is already there). Also include a `From:` header matching the King's address so Gmail doesn't auto-strip the seal block as "your own previous signature".

That single change restores the full stationery in the received email and kills the mojibake.

---

## 2. Compose from scratch *(new feature)*

Add a **"New Letter"** button at the top of the Inbox panel. Opens a composer drawer with:
- **To / Cc / Bcc** fields (Cc/Bcc collapsed by default, same as Gmail)
- **Subject**
- **Curator + Editor** Soul pickers (same as reply)
- **Intent** textarea
- **Draft** button → calls a new `draftLetter` server fn (same Curator→Editor chain as `draftReply`, but with no prior thread — uses subject + intent as the brief input)
- **Sealed preview** + **Edit body HTML** + **Send / Schedule** buttons

New server fn: `composeAndSend` — same body as `sendReply` but writes a brand-new thread (no `In-Reply-To` / `References`, new `email_threads` row created on send).

---

## 3. Scheduled send *(matches Gmail's "Schedule send")*

Two parts:

**a) UI** — next to the **Send Sealed Reply** button, add a small chevron that opens a popover with:
- "Send now" (existing behavior)
- "Tomorrow morning, 8:00"
- "Tomorrow afternoon, 1:00"
- "Monday morning, 8:00"
- "Pick a date & time…" (datetime-local input)

**b) Backend** — Gmail's API does **not** expose scheduled-send (it's a Gmail UI feature only). Two clean options:

- **Recommended:** queue it ourselves. New table `scheduled_emails` (thread_id, body_html, send_at, editor_soul_id, status). A pg_cron job hits a `/api/public/dispatch-scheduled-mail` endpoint every minute and sends anything past `send_at` via the same `sendReply` path. Cancellable from the UI before it fires.
- **Alternative:** create the message as a Gmail **Draft** instead and tell you "I've put it in your Gmail Drafts — schedule it from Gmail's UI." Less elegant, no DB needed.

I recommend the cron-queue approach so scheduling lives entirely inside Veritas.

---

## 4. Google Contacts autocomplete

Gmail's compose autocomplete pulls from the **People API** (separate scope from Gmail). Two paths:

- **Path A — extend the existing Google Mail connector** if its scope list includes `contacts.readonly`. Quick check + one `reconnect` if missing the scope, then a `listContacts` server fn that hits `https://people.googleapis.com/v1/people/me/connections` through the gateway and feeds a typeahead on To/Cc/Bcc fields.
- **Path B — derive from inbox history.** Build a `known_addresses` view from everyone you've corresponded with in `email_messages`. No new scope, works immediately, ~95% as useful as Gmail's autocomplete in practice.

I suggest we ship **Path B in this same round** (free, instant), then add Path A only if you find it lacking. Path A may require you to re-consent to the Google connection for the extra scope.

---

## Build order this round (credit-aware)

1. **The send bug fix** — one small edit to `sendReply`. Test by sending yourself another letter; the full seal should arrive intact.
2. **Compose from scratch** — new composer + `composeAndSend` server fn.
3. **Path B contact autocomplete** — view + lightweight `<input list="…">` typeahead.
4. **Scheduled send** — `scheduled_emails` table + cron dispatcher + UI popover.
5. (Optional, deferred) Path A People-API autocomplete + reconnect.

Steps 1–3 are very low risk. Step 4 adds one table + one cron job + one public endpoint.

---

## Confirm before I build

- ✅ Fix the send-formatting bug **(yes/no — assumed yes)**
- ✅ Compose-from-scratch in this same round?
- ✅ Schedule-send via our own cron queue (recommended) vs. just save-to-Gmail-drafts?
- ✅ Contact autocomplete: ship **Path B (history-based)** now, decide Path A later?

Once you confirm, I'll do all four in build mode.
