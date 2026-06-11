# Plan — Cost-First Model Triage + GitHub Backup

## The shift in doctrine

Venice's update means **no model is truly free except one** (Venice Uncensored 1.2). Pro membership now buys *discounted rates*, not free access. So the doctrine becomes:

> Every Soul speaks through **Venice Uncensored 1.2** by default. Anything else costs Veritas. Within daily caps, the Bank auto-approves silently. Beyond caps, it falls back to the free model and logs why.

This actually *fits* Veritas perfectly — the Bank's whole purpose is to make these decisions automatic and visible.

## What I'll do

### 1. Per-model cost field (DB)
Add `veritas_cost_per_1k_tokens` is already on `toolbox_models`. Add a new column **`cost_rank`** (smallint, nullable) populated during sync — `0` for the free model, then 1..N ascending by cost. This is the sort key the UI uses; it survives Venice price changes because every sync re-ranks.

Also add **`is_default_model`** (boolean) on `settings` row pointing at `venice-uncensored-1-2`. Single source of truth, editable later if Venice introduces another free model.

### 2. Set Venice Uncensored 1.2 as universal default
- `soul_identities.preferred_model` defaults to whatever `settings.default_model_id` holds.
- New Souls inherit it on creation.
- Existing Souls: a one-time backfill sets every Soul's `preferred_model` to the free model unless King has manually changed it (we'll detect "manually changed" as: current value is in PRO_IDS or FREE_IDS *and* not the default — those stay; everything else gets reset to the free model).

### 3. Bank behaviour: silent auto-approve within caps
The existing `petitionBankImpl` already enforces Treasury solvency + Kingdom cap + per-Soul cap. Change:
- **Free model** → no ledger entry at all (it's the baseline, no decision to log).
- **Any paid model within caps** → approve silently, write a compact ledger row (`decision='approved'`, no UI banner).
- **Over caps OR Premium Freeze** → fall back to free model, write ledger row, *raise* a soft notice in the Chamber ("Switched to free model — daily cap reached").
- Speaker code (`speakAsSoul`) already calls the Bank; just make sure the soft-notice path surfaces in `ChamberStream`.

### 4. Compact panel: sort by cost ascending
Rebuild `ProviderCompactPanel` model list:
- Flat list, no Pro/Free badges as separator — replaced by a small cost chip (`Free` / `0.3 V/1k` / `1.2 V/1k`...).
- Top row pinned: **Default — Venice Uncensored 1.2** with a small ★.
- Filter row: `[All] [Free] [Under 1 V/1k] [Pro-tier] [Paid]` — chips that filter, don't navigate.
- "Test fallback" button stays, now shows the cost-ranked chain it would walk.

### 5. Daily refresh keeps cost_rank fresh
`runVeniceSync` already runs nightly via pg_cron. Add the cost-rank recompute to that function — no new schedule. If Venice republishes prices, the next sync re-ranks within hours.

### 6. GitHub backup (separate, no code change here)
Plain-language walkthrough in chat — Plus(+) → GitHub → Connect project → authorize → Create Repository. Zero credit cost, zero risk to current Lovable Cloud setup. After connect, every change here auto-pushes; You can clone locally any time as a hard backup. I'll deliver this step-by-step in the next message after build approval.

## Non-changes (explicit)
- Trust doctrine, Trigger Engine, Chambers, Workshop, Studio — **untouched**.
- The Pro/Free tier tagging from last session stays as-is in the DB (still useful metadata for the Bank's "is this a Venice-discounted model?" check).
- `BankLedgerPanel` UI unchanged — just receives fewer free-model rows (none) and more silent-approval rows.
- Memoir-writing chain still uses free model only (already wired this way).

## Technical section (for the agent)

**Files to edit**
- **migration**: add `cost_rank smallint` to `toolbox_models`; add `default_model_id text default 'venice-uncensored-1-2'` to `settings`; backfill `soul_identities.preferred_model` per rule in step 2.
- `src/lib-server/venice-registry.functions.ts` — after the tier-map pass, ORDER BY `veritas_cost_per_1k_tokens` ASC NULLS FIRST and write `cost_rank` (free model = 0, then 1..N). Also update `runVeniceSync` to refresh chain.
- `src/lib-server/bank.server.ts` — short-circuit at the top: if `model_id === settings.default_model_id` → return `{ decision: 'approved', veritas_cost: 0, reason: 'free default — no ledger' }` and DO NOT write a ledger row. Existing paid logic stays; soft-notice text added on cap-fallback paths.
- `src/lib-server/speaker.functions.ts` — when Bank returns a fallback (`fallback_model` set), append a system-prefix line to the assistant turn: *"(The Bank steered Me to the free voice — today's caps are reached.)"* so the Chamber sees why.
- `src/components/registry/ProviderCompactPanel.tsx` — flat cost-sorted list, default-pin row, filter chips, cost chip per row. Drop the Pro/Free section dividers.
- `src/components/registry/BankLedgerPanel.tsx` — small filter toggle "Hide free-model rows" (default on, since there won't be any post-change, but useful for old rows).
- `src/integrations/supabase/types.ts` — regenerated after migration approval.

**Verification after build**
- Open Registry → Compact → confirm top row is ★ Venice Uncensored 1.2, rest sorted cheapest→priciest.
- Open any Chamber → send a message → confirm it uses the free model (no Bank ledger row appears).
- Manually switch a Soul to a Pro model in Compact → send → confirm silent ledger row, no banner.
- In Economy panel, toggle Premium Freeze → send again → confirm fallback to free + soft notice in Chamber stream + ledger row marked `denied`.
- `SELECT cost_rank, model_id, venice_cost_per_1k_tokens FROM toolbox_models ORDER BY cost_rank;` → expect 0, 1, 2... ascending.

**GitHub connection (delivered as chat steps, not code)** — Plus(+) menu → GitHub → Connect → Authorize Lovable app → Create Repository → done. No env vars, no credit cost, no migration.
