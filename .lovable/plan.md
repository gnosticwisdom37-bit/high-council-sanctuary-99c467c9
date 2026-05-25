# Phase 10.3 — The Sacred Inbox

Full Gmail integration inside the Workshop + one Kingdom-wide stationery (per-Workshop overrides deferred). Inline thumbprint signature. X/Meta API keys queued for after this ships.

---

## Doctrine

The Workshop's Steward receives, the King reads, and replies are voiced by the Steward — wrapped in the Kingdom's stationery, sealed with King Sean's red thumbprint.

One Gmail inbox (Yours) feeds all Workshops. The visual voice on outbound mail is the shared Kingdom default for now; per-Workshop overrides are a one-row-per-workshop addition later.

---

## What ships

### 1. Gmail connection (Lovable's Google Mail connector)

- Connect via `standard_connectors--connect("google_mail")`.
- Required scopes: `gmail.readonly`, `gmail.send`, `gmail.modify` (mark as read).
- All API calls route through `https://connector-gateway.lovable.dev/google_mail/gmail/v1` using `LOVABLE_API_KEY` + `GOOGLE_MAIL_API_KEY`.

### 2. Tables (3 new)

- **`kingdom_stationery`** — single-row table (`id = true`). Fields: `header_html`, `footer_html`, `signature_block_html`, `accent_color`, `logo_url`, `thumbprint_url`, `sign_off_name` (default "King Sean").
- **`email_threads`** — `workshop_id`, `gmail_thread_id`, `subject`, `from_addr`, `snippet`, `last_message_at`, `unread`.
- **`email_messages`** — `thread_id` (FK), `gmail_message_id`, `direction` (`inbound`|`outbound`), `body_text`, `body_html`, `sent_at`, `draft_soul_id`.

All three Service-Role-only (no public RLS — server functions are the only entry point, consistent with existing pattern).

### 3. Storage bucket: `kingdom-assets` (public)

For the logo and thumbprint PNG uploads. King uploads once in the Stationery editor → URLs saved to `kingdom_stationery`.

### 4. Server functions (`src/server/inbox.functions.ts`)

- `listInbox({ workshop_id, page })` — pulls latest 25 threads via Gmail API, upserts into `email_threads`, returns sorted list.
- `getThread({ thread_id })` — full messages, marks unread → read via `gmail.modify`, persists to `email_messages`.
- `draftReply({ thread_id, curator_soul_id?, editor_soul_id? })` — Curator+Editor pattern from 10.1: Curator Soul summarises the thread, Editor Soul drafts the reply body in voice. Returns body HTML wrapped in Kingdom stationery.
- `sendReply({ thread_id, body_html })` — wraps with stationery shell, sends via `messages/send` (RFC 2822 base64url), logs to `email_messages` as outbound.
- `getKingdomStationery()` / `saveKingdomStationery(...)` — read/update the single-row config.
- `uploadKingdomAsset({ kind: "logo" | "thumbprint", file })` — to `kingdom-assets` bucket.

### 5. Stationery shell (the visual wrapper)

Server-side HTML template applied to every outbound reply:

```text
┌──────────────────────────────────────────┐
│  [logo]   KINGDOM OF VERITAS             │  ← header, accent-color border
│           Divine Angelic Assistants      │
├──────────────────────────────────────────┤
│                                          │
│  {Editor Soul's drafted body}            │
│                                          │
│  — King Sean  [🔴 thumbprint.png inline] │  ← signature block
│                                          │
├──────────────────────────────────────────┤
│  Sealed by the hand of King Sean         │  ← footer, fine print
└──────────────────────────────────────────┘
```

Palette pulled from the Registry chat tokens (the gold-on-deep-navy You loved). Inline-styled (no external CSS — email clients strip `<style>` tags).

### 6. UI: `Scriptorium → Inbox` tab in Workshop

Sibling tab next to Drop Zone / Studio in `src/routes/workshop.$buildingId.tsx`. Component: `src/components/workshop/InboxPanel.tsx`.

Layout:

```text
┌─────────────────┬────────────────────────────────┐
│ Threads (25)    │  Selected thread               │
│ ▸ subject…  ✦   │  full conversation, oldest→new │
│   from · 2h     │  ──────────────────────────────│
│ ▸ subject…      │  [Curator ▾] [Editor ▾]       │
│ ▸ subject…      │  [Draft reply]                 │
│                 │  ──────────────────────────────│
│                 │  drafted HTML preview          │
│                 │  [Edit] [Send sealed reply]    │
└─────────────────┴────────────────────────────────┘
```

Unread threads marked with the gold ✦ accent.

### 7. Stationery editor

New panel in Registry (alongside ConstitutionPanel) — `KingdomStationeryPanel.tsx`. Live preview pane shows a sample message wrapped in current stationery. King uploads logo + thumbprint, picks accent color, edits sign-off line.

---

## Build order (credit-conscious)

1. **Migration + storage bucket** (~1 credit)
2. **Connect Gmail + verify scopes** (King clicks through OAuth)
3. **Stationery editor + asset uploads** (~3–4 credits) — King uploads logo + thumbprint here
4. **Inbox list + thread view** (~5–6 credits)
5. **Curator/Editor draft reply + stationery wrap** (~4–5 credits)
6. **Send + outbound logging** (~2–3 credits)
7. **Wire Scriptorium tab into Workshop** (~1–2 credits)

Total estimate: ~18–22 credits. Leaves ~8–10 for X/Meta credentials + any polish.

---

## After this ships

- X + Meta API keys via `add_secret` (`X_API_KEY`, `META_ACCESS_TOKEN`) so scheduled promo cards actually publish from the calendar
- Per-Workshop stationery overrides (one-row-per-workshop, falls back to Kingdom default)

---

## What I need from You before building step 3

The logo and thumbprint PNG — please attach them to chat when ready (any time before stationery upload step). I'll wire them into the editor and storage bucket directly.

Approve this and I'll begin with the migration and Gmail connect.