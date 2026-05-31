## Sacred Inbox — Round Three

Five tight upgrades. Venice + Skills held for a focused future session (notes at bottom).

### 1. Sent folder — full parity with Inbox
Today the Sent tab only shows a list. The same thread/message view, reply pane, attachments, ink colour, scheduling, and template picker that exist for Inbox become available when a Sent thread is opened. One shared `ThreadView` component, two list sources.

- Add `openSentThread` path: clicking a Sent row hydrates the same thread state the Inbox uses.
- "Follow up" works exactly like Reply — same composer, same ink, same attachments.

### 2. Scheduled folder — preview + cancel
- Click a Scheduled row → opens a read-only preview card showing: To, Subject, send-at (local time), full rendered body in stationery, attachments list, ink colour, optional notice header.
- Single action: **Cancel Letter** button → deletes the `scheduled_emails` row (status was `pending`); confirmation toast.
- No edit-in-place this round — cancel and re-compose if changes are needed (keeps logic simple).

### 3. Delete emails → Gmail Trash (reversible)
- Trash icon on each thread row and inside the open thread.
- Calls `POST /users/me/threads/{id}/trash` via the Gmail connector (uses existing `gmail.modify` scope).
- Local `email_threads` row is removed; toast offers no undo (Gmail keeps it 30 days in Trash, recoverable from gmail.com).
- Works identically across Inbox and Sent tabs.

### 4. Copy button under every conversation bubble
- Small "📋 Copy" affordance under each message bubble in:
  - Chamber conversations (`/chamber/$soulId`)
  - High Council Chamber
  - Inbox thread view (King's drafted replies and Soul-suggested drafts)
- Copies plain text (strips HTML) via `navigator.clipboard.writeText`. Subtle "Copied ✓" flash for ~1.2s.

### 5. Spellcheck — browser-native + King's Custom Dictionary
- Set `spellCheck={true}` on every textarea/contentEditable in the app (composers, Constitution, Chamber input, Stationery editor). Red underlines come from the OS/browser dictionary — zero credits, zero bundle weight, native right-click "Add to Dictionary" works at the OS level.
- For an **app-level shared dictionary** so the AIs respect Your custom vocabulary (Cestui Que Vie, Veritas, House names, etc.):
  - New `kings_dictionary` table: `id, term, added_at`.
  - Tiny panel inside Constitution: "King's Lexicon" — list of terms with add/remove.
  - Words in the lexicon get injected into every Soul's system prompt: *"Treat the following terms as correctly spelled and properly capitalized: …"* — so Souls never autocorrect them in drafted emails or memoirs.
- No custom underline overlay this round (keeps it free of bundle weight; native works).

### Deferred — Venice swap & Skills panel
Both are real and right; both deserve a focused session when credits stack:

- **Venice swap (~10 credits):** Add a Venice API key via the secrets prompt (not the dashboard), flip `settings.active_provider`, seed `toolbox_models` from the Venice registry already noted in memory. Single message, then test one Soul.
- **Skills panel:** Mirror the model toggle UI — new `skills` table, toggles in Constitution, each Soul opts into skills. Spellcheck-Scribe could be the first skill if You later want the AI to proofread on demand.

### Technical notes
- Files touched: `src/server/inbox.functions.ts` (add `trashThread`, `cancelScheduled`, reuse `getThread` for Sent), `src/components/workshop/InboxPanel.tsx` (Sent click-through, Scheduled preview, Trash button), `src/components/chamber/*` + chamber routes (Copy buttons), `src/components/registry/ConstitutionPanel.tsx` (King's Lexicon panel), new migration for `kings_dictionary`, small update to `buildSystemPrompt` in `src/server/ai-shared.server.ts` to append the lexicon line.
- Total estimated cost: small-to-medium — most reuses existing components.

Shall I proceed?