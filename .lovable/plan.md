# Two small additions

## 1. WordPress site binding (Workshop → Studio "Add website")

The gateway plumbing already exists (`src/lib-server/wordpress.functions.ts`: `listWpSites`, `getWorkshopWpLink`, `setWorkshopWpSite`, `createWpPost`). The "Add website" button in the Studio just isn't wired to a picker yet.

**Build:**
- Add a `WordPressSiteBinding` panel (small dialog) that:
  - Calls `listWpSites` and shows the King's WP.com sites (name + URL).
  - Lets King pick one site, optional default categories/tags, default status (`draft` recommended).
  - Saves via `setWorkshopWpSite` keyed to the current Workshop.
  - Shows current binding (site name + URL) once set, with a "Change site" affordance.
- Wire the existing "Add website" button in `StudioPanel.tsx` to open this dialog.
- If `WORDPRESS_COM_API_KEY` is missing, the panel shows a single inline "Connect WordPress.com" message (no fake values, no dashboard links) — connector linking is handled outside this flow.

**Result:** New Post tab can publish drafts/scheduled/published posts to the bound site; Studio Blog Archive list reflects mirrored posts on next sync.

## 2. Sent-folder attachments (Scriptorium)

Today, attachments only attach during *compose*. Add an "Add attachment" affordance on **sent letters** for today's date.

**Build (frontend-only where possible):**
- In the Sent folder letter view, when `sent_at` is today (King's local day), show an "Attach file" button.
- Reuse the existing compose attachment uploader (same bucket, same size limits, same UI affordance).
- Append uploaded attachment refs to the existing `email_messages.attachments` jsonb array for that message via a small server fn `appendSentAttachment({ message_id, attachments[] })` that:
  - Verifies the message is owned by the King, is in Sent, and `sent_at >= start_of_today_local`.
  - Appends rather than replaces; never mutates the original send.
- These appear inline in the letter view alongside original attachments, labeled "Added [time]" so the King can see they were appended after send.

**Why "today only":** matches your intent — a same-day addition (e.g. forgot to attach the PDF), without rewriting historical sent mail.

**No changes** to: send/reply recipient resolution, threading, scheduling, drafting gateway (just shipped), or self-curation.

## Technical notes (for me)
- New file: `src/components/workshop/WordPressSiteBinding.tsx`.
- Edits: `src/components/workshop/StudioPanel.tsx` (wire button), `src/components/workshop/InboxPanel.tsx` or wherever Sent letter view lives (add attach button + handler), `src/lib-server/inbox.functions.ts` (`appendSentAttachment` server fn with `requireSupabaseAuth` + same-day guard).
- No schema migration needed — `email_messages.attachments` jsonb already holds the array.

Shall I build both, or want WordPress first and Sent-attachments next?
