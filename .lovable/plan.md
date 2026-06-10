## What I found

Venice's API does **not** expose a Pro-vs-Free flag. I checked `/models`, `/models/traits`, and `/api_keys/rate_limits` — none of them return membership tier. That split only lives on venice.ai's UI, so it has to live in this repo as a curated list. Good news: You've already given me both lists.

## What I'll do

### 1. Save Your lists in the repo (the "safe" place)
Two committed files become the single source of truth:

- `src/data/venice-pro-models.txt` — the 25 names from `Pro Models Venice.txt`
- `src/data/venice-free-models.txt` — the 11 names from `Free Models.txt`

Plain text, one display name per line, comments allowed with `#`. You can open either file in the editor (or paste-replace) when Venice changes the lineup — no migrations, no DB writes by hand.

### 2. Build a name→ID matcher
A small helper (`src/lib-server/venice-tier-map.ts`) loads both files at import time and converts each name to a normalised key (lowercase, drop punctuation, collapse spaces). It then matches against:
- Venice's live `display_name` from `/api/v1/models`
- Venice's `model_id`
- A couple of curated aliases for cases where Venice's display string differs from the brochure name (e.g. "Qwen3.6 35B A3B Uncensored" ↔ `e2ee-qwen3-6-35b-a3b-uncensored-p`).

Result: a function `tierFor(modelId, displayName) → "pro" | "free" | "paid" | "image"`.

### 3. Re-apply the tiers on every sync
In `runVeniceSync()` (`venice-registry.functions.ts`), replace the current "preserve manual overrides" block with: every row gets `venice_tier` from the matcher. Models in the Pro list also get `auto_fallback_enabled = true` with `fallback_rank` based on their order in the file (so the file IS the priority ordering). Free-list models get rank starting at 100 so they always fall after the Pro chain. Anything not in either list and not `type === "image"` is tagged `paid` and excluded from fallback — Claude/GPT/Grok stay blocked, exactly as You want.

### 4. Daily refresh already exists
`pg_cron` already hits `/api/public/sync-venice-registry` every day at ~04:00 UTC. Once the matcher is in place, that same cron picks up any Venice catalogue changes automatically. No new schedule needed.

### 5. Rebuild the Compact's fallback chain
After the sync runs, repopulate `settings.provider_compact.fallback_chain` from `toolbox_models` ordered by `fallback_rank` — the chain becomes "26 Pro models, then 11 Free models" in the exact order Your two files specify.

### 6. Log unmatched names
If any name from either .txt file fails to match a live Venice model (Venice renamed it, You typoed it, etc.), the sync writes them to `settings.tier_map_unmatched` (jsonb) and the Registry panel shows a small "⚠ 2 names didn't match" notice with the list, so You know to fix the file.

### 7. UI changes (small)
- `VeniceRegistryPanel` shows the unmatched warning if any.
- `ProviderCompactPanel` adds a "↻ Rebuild chain from tier files" button that re-runs step 5 without waiting for the daily cron.

## What does NOT change
- The Trigger Engine, Trust doctrine, Chambers, Workshop, Studio — all untouched.
- The "Test model fallback" simulator stays as-is.
- Premium Freeze and Bank guardrails stay enforced — paid models still need an explicit petition.

## Technical section (for the agent)

Files created/edited:
- **new** `src/data/venice-pro-models.txt` (25 lines, in order from upload)
- **new** `src/data/venice-free-models.txt` (11 lines, in order from upload)
- **new** `src/lib-server/venice-tier-map.ts` — `normalise(name)`, `tierFor(modelId, displayName)`, `rankFor(modelId)`, exports parsed arrays
- **edit** `src/lib-server/venice-registry.functions.ts` — replace the `preserved`/`rowsWithOverrides` block; compute `venice_tier`/`auto_fallback_enabled`/`fallback_rank` from `tierFor`; collect unmatched names; write `settings.tier_map_unmatched` and rebuild `settings.provider_compact.fallback_chain` (ordered: pro rank ASC, then free rank ASC)
- **edit** `src/components/registry/VeniceRegistryPanel.tsx` — render unmatched warning from `settings.tier_map_unmatched`
- **edit** `src/components/registry/ProviderCompactPanel.tsx` — add "↻ Rebuild chain from tier files" button calling a new `rebuildFallbackChain` server fn (thin wrapper that re-runs the chain-build step without re-fetching Venice)
- **migration** add `tier_map_unmatched jsonb default '[]'` to `settings` (one column)

Matcher rules:
- `normalise(s) = s.toLowerCase().replace(/[^a-z0-9]+/g, "")`
- Match priority: exact normalised display_name → exact normalised model_id → alias table → unmatched
- Alias seed (curated from Your two lists vs. live API IDs): `"venice uncensored 1 2" → "venice-uncensored-1-2"`, `"qwen3 6 35b a3b uncensored" → "e2ee-qwen3-6-35b-a3b-uncensored-p"`, `"gemma 4 26b a4b uncensored" → "e2ee-gemma-4-26b-a4b-uncensored-p"`, `"glm 5 1" (TEE entry) → "e2ee-glm-5-1"`, `"glm 5 1" (Private entry) → "zai-org-glm-5-1"`, `"gemma 4 31b instruct" (TEE entry, Free) → "e2ee-gemma-4-31b"`, `"qwen 3 6 35b a3b fp8" → "e2ee-qwen3-6-35b-a3b"`. Aliases live in `venice-tier-map.ts`.
- Duplicate names in the Pro file (e.g. two "GLM 5.1" lines, one TEE one Private) are resolved by position — the first occurrence aliases to the TEE variant, the second to the non-TEE variant.

Verification:
- After approval, run the sync, then `SELECT venice_tier, count(*) FROM toolbox_models WHERE provider='venice' GROUP BY 1;` — expect ~25 pro, ~11 free, rest paid+image.
- Open Registry → confirm groups show correct counts and no unmatched warning (or, if any, fix the file/alias and re-sync).
- Open Compact → confirm chain is 36 entries Pro→Free in Your file order, Claude is absent.
