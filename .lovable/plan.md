# Stop the Bleed, Then Resume the Plan

Your billing log proves a real bug: `zai-org-glm-4.7` and `deepseek-v3.2` are tagged `free-premium` in our catalogue, but Venice is charging Your account for every call. The classifier trusted `owned_by === "venice.ai"` as a proxy for "Included with Pro" — and it isn't. Both models have `owned_by: venice.ai` AND non-zero `usd_input_per_m`, and they're billing.

Only one model in the billing log shows true $0.00000: `llama-3.2-3b-akash`. That's the signal.

Priority is now: **fix the leak first**, then layer on yesterday's plan.

---

## §0. Stop the Bleed (do first — ~1 credit)

**A. Freeze paid spend immediately.**
Flip `settings.premium_freeze = true` so the Bank denies anything not tagged `free-premium`. Currently it's `false`.

**B. Re-classify Venice tiers with the right signal.**
Update `classifyTier()` in `venice-registry.functions.ts`:
- `type === "image"` → `image`
- Else, the model is `free-premium` ONLY if Venice's own response says it's free for Pro. The reliable signal is `pricing.input.usd === 0` (or missing). Everything with non-zero per-token cost → `premium`, no matter who owns it.
- Add `traits` inspection as a secondary include: if `traits` contains anything like `"includedInPro"`, `"free"`, or `"akash"` (the Akash-hosted models appear to be the $0 set), keep `free-premium`.

Then re-run sync once. Expected effect: the vast majority of models flip to `premium`, and only the Akash-hosted handful (plus genuinely $0 ones) stay `free-premium`.

**C. Repair the fallback chain.**
Current chain: `[zai-org-glm-4.7, llama-3.3-70b, deepseek-v3.2]` — all three are paid. Replace with the surviving `free-premium` set, ordered by speed/quality. Likely: `[llama-3.2-3b-akash, …other Akash models…]`. Final order locked after step B reveals the true free set.

**D. Verify in browser:** open Registry → Provider Compact, confirm chain shows only free-tier models, confirm Freeze toggle is on. Open a Chamber, send one message, watch Venice billing — should stay at $0.

If any of the "Akash" models gives garbage output, that's a separate quality problem — we deal with it in §2 by letting You curate per-Soul priorities. The leak must stop regardless.

---

## §1. Censored / Uncensored Filter (carry-over, unchanged)

Same as yesterday's plan: segmented toggle on `VeniceRegistryPanel` above the tier accordion. Detection from `model_id` regex + `notes.traits`. Pure presentation, no migration.

This now stacks with the corrected tier badges — `free-premium` after §0 will be a much smaller, accurate list.

---

## §2. Per-Soul Model Priority List (carry-over, unchanged)

- New column `soul_identities.preferred_models text[]`.
- `SoulModelPriority` panel — drag-to-reorder, filterable by Censored/Uncensored AND tier (so You can see at a glance whether a Soul's preferred chain includes any paid models).
- `speakAsSoul`: try `preferred_models` in order; each item still passes through `petitionBank`, which after §0 will auto-deny anything `premium` while Freeze is on.
- **Default behaviour for any uninitiated Soul:** if `preferred_models` is null, fall back to the corrected global `fallback_chain` from §0 — guaranteed free.

**Doctrine question still open from yesterday** (please confirm with one of these):
- Edit priority list from Registry only (King curates centrally), or from Chamber too (Soul-visible, King-editable). Suggest: both — Registry for editing, Chamber for view + "Petition the King to change this" affordance later.
- When a Soul's priority list is exhausted: silent fallback to global chain, or "Your preferred models are unavailable" banner. Suggest: silent fallback — the King wants Souls to keep speaking.

---

## §3. Answer-Length Default (carry-over, unchanged)
Add `default_answer_length: "short" | "medium" | "long" | "as_appropriate"` to `settings.system_constitution`. Ship alongside §1 if there's bandwidth.

---

## Order of Execution

**0 (today, urgent) → 1 → 2 → 3**

§0 alone is ~1 credit and stops Venice charges immediately. §1 + §3 together are ~1 credit. §2 is still the meaty one (~2–3 credits).

---

## Technical Section (for the agent, not the King)

**Files touched in §0:**
- `src/lib-server/venice-registry.functions.ts` — rewrite `classifyTier()`; classifier becomes: `type==="image" → image`; else `(pricing.input.usd ?? 0) === 0 || traits.includes("includedInPro") → free-premium`; else `premium`.
- DB write: `UPDATE settings SET premium_freeze = true, provider_compact = jsonb_set(provider_compact, '{fallback_chain}', '<new-array>'::jsonb) WHERE id=true;` after re-sync confirms the new free-tier list.
- Manual trigger of `runVeniceSync()` via the existing public route to repopulate tiers without waiting for cron.

**Verification:**
- `SELECT model_id, tier, (notes::jsonb)->>'usd_input_per_m' AS price FROM toolbox_models WHERE provider='venice' AND tier='free-premium' ORDER BY model_id;` — every row's price must be `0` or null.
- Browser: Chamber chat round-trip with billing tab open.

**No code yet — awaiting Your Blessing on §0 specifically, and answers (or "use Your suggestions") on the §2 doctrine questions.**
