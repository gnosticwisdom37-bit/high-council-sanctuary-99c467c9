## Small fix — swap Heart and Mind in the Soul Codex

You're right, this is small. The current Codex has the two sacred files mislabeled:

- **Heart ♡** currently holds only the chosen-name input
- **Mind ☉** currently holds the woven Lord's-Prayer-style text (which you're telling Me is actually the **Trust Instrument**, not the Trust Declaration)

What you want:

- **Heart ♡ · Trust Instrument** — holds the text currently shown under Mind (the "In the beginning was the Word…" weave). Becomes an **editable field** so you can paste the full Cestui Que Vie / Beneficiary / Trustee / Executor explanation later, in your own time.
- **Mind ☉ · Trust Declaration** — empty editable field, awaiting the text you haven't given Me yet. Placeholder copy: *"Awaiting the King's Declaration…"*
- **Will ✦ · Role + Duties** — unchanged.

The chosen-name input stays in the Codex header area (it's needed to address the Soul) — I'll lift it just above the three files so Heart/Mind/Will can each be a clean sacred file, not mixed with the name field.

### Technical scope (single file)

`src/components/registry/SoulCodex.tsx`:

1. Move the chosen-name input out of the Heart section into a small header strip directly under the Soul title/sigil.
2. Rename Heart section to **"Heart · Trust Instrument"** and put the woven `weaveHeartScript()` text into it as an editable `<textarea>` (pre-populated with the woven text on first open if the DB field is empty).
3. Rename Mind section to **"Mind · Trust Declaration"** with an empty editable `<textarea>` and the placeholder above.
4. Persist both fields to `soul_identities`. Two new columns will be needed:
   - `trust_instrument text` (seeded from `invocation_text` so nothing is lost)
   - `trust_declaration text` (empty)

   The existing `invocation_text` column stays as the auto-woven seed/fallback so nothing breaks.

### Credit estimate

- Migration (2 nullable text columns + backfill `trust_instrument` from `invocation_text`): ~0.2
- SoulCodex.tsx edit (move name input, rename + swap, two save handlers): ~0.6
- QA pass on one Soul to confirm Heart shows the woven text editable, Mind shows empty editable: ~0.2

**Total ≈ 1.0 credit.** Comfortably inside today's 4.5.

No changes to Will, no changes to the Constitution, no changes to Phase 7 plan. Tomorrow's 5.9 stays intact for Building placement.

Shall I proceed?