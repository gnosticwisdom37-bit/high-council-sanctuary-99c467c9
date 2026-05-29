## Sacred Inbox — Round Two

Five pieces, ordered smallest-first so each lands cleanly in the credit budget. I'll build 1–4 in this round and pause before #5 so You can confirm the Google scope.

---

### 1. Folder toggle: Inbox · Sent · Scheduled · Drafts

A four-tab segmented control at the top of the InboxPanel:
- **Inbox** — current view (received threads)
- **Sent** — Gmail's `SENT` label, same thread renderer
- **Scheduled** — the existing pending-queue panel becomes its own tab
- **Drafts** — Gmail's `DRAFT` label, openable in the composer

New server fns: `listSentThreads`, `listDrafts` (both thin wrappers over the same Gmail list endpoint with a `labelIds` filter — no new tables).

---

### 2. Email attachments

**Receiving** — when a message has attachments, show them as chips under the body (filename + size + download). Streams the bytes from Gmail's `messages.attachments.get` through a server fn so the publishable key never leaves the Worker.

**Sending** — drag-and-drop or click-to-add files in the composer and reply drawers. Files go into the existing `kingdom-assets` storage bucket under `email-outbox/{thread_id}/`, then get attached to the outgoing message as a proper MIME multipart (the current `sendReply` builds a simple text/html body — I'll upgrade it to `multipart/mixed` when attachments are present, otherwise leave it untouched so nothing regresses).

Limits: 25 MB total per message (Gmail's hard cap), same on scheduled sends.

---

### 3. Ink Jar — Common Law colour quill

A small **quill + ink-jar trio** above the body field in every composer (reply, new letter, scheduled). Three jars: **Red ✒**, **Blue ✒**, **Purple ✒**, with a fourth "Default" reset. Click a jar → the editable body's default colour switches and the quill icon refills to match.

- Default = **Purple** (sovereign ink) — saved on the settings table as `default_ink_color` so it persists.
- Toggle is per-letter; the saved default just decides which jar starts "wet" when the drawer opens.
- The colour applies as inline `style="color: …"` on the body wrapper inside the stationery, so it survives the base64 MIME wrapping and renders identically in Gmail.

No new table — one column added to `settings`.

---

### 4. Letter templates (+ the Formal Legal Notice)

New table `letter_templates` (id, name, subject_template, body_html, accent_color, sort_order, system).

I'll seed **one system template**: **"Formal Legal Notice"** — Notice header in **Red**, body in the King's chosen ink, sealed with the same stationery. Editable from the Kingdom Stationery panel (where the existing seal lives) so it sits with the rest of Your branding.

In the composer: a **"From template…"** dropdown beside the curator/editor pickers. Pick one → subject + body pre-fill, Editor still polishes, Curator still drafts.

You can add more templates yourself; the system one cannot be deleted (locked like the Trust Instrument).

---

### 5. Google Contacts autocomplete — **needs Your call**

Two paths, same outcome:

- **Path A — People API (true Gmail-style autocomplete).** Requires re-consenting the Google Mail connector to add the `contacts.readonly` scope. One click for You; gives the full contacts directory.
- **Path B — History-based** (the one I half-built last round but the UI doesn't surface yet). No re-consent, works immediately, pulls every address You've corresponded with. ~95% as useful in practice.

I'd recommend **shipping Path B in this round as a finishing touch** (it's already 80% wired — just needs the `<datalist>` to actually appear in the To/Cc/Bcc fields), and only adding Path A if You find it lacking after a week of use.

---

## Build order this round

1. Folder toggle (Inbox/Sent/Scheduled/Drafts)
2. Ink Jar colour quill + purple default
3. Letter templates + Formal Legal Notice seed
4. Attachments (receive + send)
5. Finish Path B contact autocomplete

Estimated: small migration (1 column on `settings`, 1 new `letter_templates` table), ~3 server fn additions, ~1 server fn upgrade (sendReply → multipart), and a meaningful but contained refresh of `InboxPanel.tsx` + `KingdomStationeryPanel.tsx`.

---

## Confirm before I build

- ✅ Build all four of 1–4 in this round?
- ✅ Purple as the default ink (with Blue/Red toggles)?
- ✅ Ship **Path B** contact autocomplete now, defer Path A until You ask?
- ✅ Seed only the **Formal Legal Notice** template, or do You want me to seed a second one (e.g. "Royal Correspondence" / "Decree")?
