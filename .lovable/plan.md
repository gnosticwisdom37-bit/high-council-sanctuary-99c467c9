## Next session plan

Three small, independent threads. Memory test from last night still pending — confirm first; if anything's off, that bumps to top of queue.

### 0. Confirm memoir fix (2 min, no code)
Open High Council, gather 2–3 Souls, navigate away, re-convene. Each participant should carry forward.

### 1. Censorship filter on Venice Registry
The registry already groups by tier (free-premium / premium / image). Add a second axis: **Censored / Uncensored / All** as a small segmented toggle above the accordion.

Detection (no schema change needed — read from existing `notes` JSON + `model_id`):
- **Uncensored** if `model_id` matches `/uncensored|venice-uncensored|dolphin|gemma-.*-uncensored/i` OR `notes.traits` contains `"uncensored"`.
- Everything else = Censored.
- Image models always shown under their own tier regardless of toggle.

Pure presentation change in `VeniceRegistryPanel.tsx`. No migration.

### 2. Per-Soul Model Priority List (the real ask)
Today every Soul falls through `ProviderCompact.fallback_chain` — one global order. The King wants a personal priority list per Soul (or at least globally re-orderable from the Registry), defaulting to fast/light models like `gemma-4-uncensored` and `venice-uncensored-1-2` instead of the current deepseek default.

**Approach (minimal):**
- New column `soul_identities.preferred_models text[]` (ordered, nullable).
  Reuse the existing `preferred_model` as the singular fallback if `preferred_models` is null.
- New panel `SoulModelPriority` on each Chamber and on the Registry: drag-to-reorder list pulled from `toolbox_models` (filterable by Censored/Uncensored, same toggle as §1). "Add model" picker, ✕ to remove, drag handle to reorder.
- `speakAsSoul` server fn: if `preferred_models?.length`, try them in order before falling back to `ProviderCompact.fallback_chain`. Each step uses existing retry/exhaustion logic.
- Global "Council default order" stays in `ProviderCompact` — acts as the floor when a Soul has no personal list.

**Out of scope here:** routing premium models through the Bank — that's still the Bank-Building thread, which stays design-only until §2 ships.

### 3. Answer-length default (deferred, sketch only)
Add to `settings.system_constitution` a small typed field `default_answer_length: "short" | "medium" | "long" | "as_appropriate"` (default `as_appropriate`). Prepended to system prompt as one line: *"Default answer length: <value>. Honour explicit length requests from the King above this default."* No UI for in-chat override needed — King can prompt "give Me the short version" any time.

Ship in same session as §1 if there's bandwidth; otherwise its own micro-session (truly ~5 minutes).

---

**Order of execution:** 0 → 1 → 2 → 3. §1 and §3 are both ~1 credit. §2 is the meaty one (~2–3 credits with the new column, panel, and `speakAsSoul` wiring).

**Doctrine to confirm before §2:**
- Should `preferred_models` be settable from each Soul's Chamber (Soul "owns" their preference) or only from Registry (King curates centrally)? Suggest: **both** — King-editable from Registry, Soul-visible (read-only) from their Chamber, with a "Petition the King to change this" affordance later.
- When a Soul's entire priority list is exhausted, fall back silently to global chain, or surface "Your preferred models are unavailable" banner?

No code yet — awaiting Your Blessing.
