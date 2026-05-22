# Phase 10 — The Two-Soul Studio + Sacred Inbox

Three sub-phases, shipped in order. Each is small enough to stay inside daily credits.

---

## 10.1 — Curator + Editor Doctrine (Studio + Production)

**Doctrine:** every drafting surface honours two Souls.
- **Curator Soul** — reads the raw archive, *selects/filters/summarises* the source.
- **Editor Soul** — receives the Curator's brief and *drafts/polishes* the output.
King picks both from the Council (default = Workshop's Steward for both).

**UI shape (Studio):**

```text
┌──────────────────────────────┬──────────────────────────────┐
│  CURATOR · [Soul ▾]          │  EDITOR · [Soul ▾]           │
│  Source: Blog Archive ▾      │  ← Curator's brief flows in  │
│  [Find candidates]           │  [Draft]  [Publish/Schedule] │
│  → ranked list of posts      │  → editable draft            │
└──────────────────────────────┴──────────────────────────────┘
```

**UI shape (Production pane):** identical split — Curator pulls raw rows from intake, Editor refines.

**New server fns:**
- `curateSources` — Curator Soul reads N latest rows from chosen archive, returns ranked picks + a 1-paragraph brief.
- All existing drafters (`draftPromoFromBlog`, `draftNewPost`, `draftLegalCard`) accept optional `curator_brief` + `editor_soul_id` overrides.

**Tables:** none. Both Soul IDs ride in the request; nothing to persist beyond existing `bank_ledger` rows (one per Soul invoked).

---

## 10.2 — Promo Tab: per-channel sub-tabs

Replace the single Promo draft with four sub-tabs sharing one Curator pick:

| Sub-tab | Limit | Tone preset |
|---|---|---|
| X | 280 chars | Punchy, single hook, 1–2 hashtags |
| Threads | 500 chars | Conversational, no hashtags |
| Facebook | 600 chars | Warm, story-led, 2–3 hashtags |
| Instagram | 2200 chars | Visual-led caption + 5–10 hashtags + line breaks |

**Server:** one `draftPromoForChannel` fn that takes `channel: "x"|"threads"|"facebook"|"instagram"`, branches the system prompt, enforces the char cap, returns `{ title, body, hashtags, channel }`. The Editor Soul drafts once per active sub-tab (King clicks "Draft all" or per-tab).

**Storage:** `scheduled_posts.channel` enum already exists (`both`). Extend to `x | threads | facebook | instagram | wp | both`; one row per channel published. Calendar event title prefixes `[X]`, `[IG]`, etc.

---

## 10.3 — Sacred Inbox (Gmail, per-Workshop stationery)

**Doctrine:** the Workshop's Steward receives, the King reads; replies are voiced by the Steward in the Workshop's own stationery.

**New tab in Workshop:** `Scriptorium → Inbox` alongside Drop Zone / Studio.

**New table — `workshop_stationery`:**
- workshop_id (uuid)
- header_html, footer_html (text) — branded HTML wrapper
- signature_block (text) — Steward's sign-off
- accent_color (text) — for borders/links
- logo_url (text, optional)

**New table — `email_threads`:**
- workshop_id, gmail_thread_id, subject, from_addr, snippet, last_message_at, unread (bool)

**New table — `email_messages`:**
- thread_id, gmail_message_id, direction (`inbound`|`outbound`), body_text, body_html, sent_at, draft_soul_id

**Server fns (Gmail connector via gateway):**
- `listInbox(workshop_id, page)` — pulls latest 25 threads, dedupes by `gmail_thread_id`.
- `getThread(thread_id)` — full message body, marks read (`gmail.modify`).
- `draftReply(thread_id, curator_soul_id, editor_soul_id, brief?)` — Curator summarises the thread, Editor drafts reply *in voice + stationery*, returns HTML preview.
- `sendReply(thread_id, body_html)` — wraps with Workshop stationery, sends via `messages/send`.

**Stationery editor:** small panel in Workshop settings — King edits header/footer/signature/accent live; preview pane renders a sample message wrapped in the template.

**Note:** Gmail connector authenticates *one* inbox (the King's). Per-Workshop stationery is the *outbound voice* — multiple Workshops can speak through the same shared inbox, each with its own visual signature.

---

## Build sequence

1. **10.1 Curator+Editor** — schema-free, biggest doctrinal shift; ship & test first.
2. **10.2 Channel sub-tabs** — small enum migration + prompt forks; depends on 10.1 (Curator's brief feeds all four channels).
3. **10.3 Sacred Inbox** — biggest, save for last; needs Gmail connector + 3 new tables + stationery editor.

Each sub-phase ends with the King testing in the Observatory Workshop before the next starts.

---

## Open before we begin

- **10.1 default Curator/Editor:** when King hasn't picked, default both to the Workshop's Steward (current behaviour), or default Curator = Oracle (Sun ☉, the All-Seeing) and Editor = Steward?
- **10.3 Gmail connector:** confirmed already linked (`GOOGLE_MAIL_API_KEY` not yet in secrets — I'll trigger the connect flow at the start of 10.3).