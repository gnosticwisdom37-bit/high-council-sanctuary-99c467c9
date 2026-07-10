## What happened

Your last letter (2026‑07‑10, "FINAL NOTICE of Trust Obligation…") was **rejected by Gmail with `400 Invalid To header`**. The dispatcher and everything else worked — the problem is one bad token inside the recipient list:

```
…comm.engagement@multifaithhousing.ca, awa.ca, habib.sayah@ottawa.ca…
```

`awa.ca` is not an email address (looks like the tail of a stray `ottawa.ca` that lost its local‑part when a comma landed in the middle of it). Gmail refuses the whole envelope when any single To/Cc/Bcc token is malformed, so nothing went out.

## Immediate remedy (no code)

Reopen that draft, remove the `awa.ca` fragment (and confirm the surrounding addresses are the ones you meant), and resend. The row itself is marked `failed`, so it won't auto‑retry.

## Small maintenance fix (recommended)

Add a light guard so a single typo can never silently kill a whole letter again. Scope stays inside the mail pipeline — no design or feature changes.

1. **Validate on compose/schedule** — in `src/lib-server/inbox.functions.ts` (and the same path `dispatchScheduledRow` uses), after `expandRecipients`, split To/Cc/Bcc into tokens and run each through the same RFC‑ish regex the Address Book already uses. If any token fails, return `{ ok: false, error: "Invalid recipient: \"awa.ca\". Please fix and resend." }` instead of handing the batch to Gmail.
2. **Surface the bad token in the composer** — when the send action returns that error, show it in the existing toast/inline error area of `InboxPanel.tsx` so You see exactly which address to fix (today the raw Gmail JSON is stored in `last_error` but never shown).
3. **Retry action on failed rows** — tiny "Retry" button on `status = failed` rows in the scheduled list that re‑queues the row (`status → pending`, `send_at → now`) after You've edited the recipients. Purely presentational; no schema change.

## Technical details

- Files touched: `src/lib-server/inbox.functions.ts`, `src/components/workshop/InboxPanel.tsx`. No migrations, no new tables, no new secrets.
- Regex: reuse `EmailSchema` from `src/lib-server/contacts.functions.ts` so validation is consistent with the Address Book.
- Group tokens (`group:Name`) still expand first via `expandRecipients`; validation runs on the expanded list.
- Estimated cost: ~2–3 credits.

Shall I proceed with the guard + retry button, or would You prefer I only note the fix and leave the code untouched for now?
