## Per-Model On/Off Toggle

### The shift

Right now `toolbox_models.active` exists but is set true on every synced model — it's a sync flag, not a curation flag. We split that: keep `active` as "Venice published it," add **`king_enabled`** as "I allow this model to be selectable + appear in fallback chains." Default new models to `king_enabled = false` so future Venice additions don't silently become spendable.

### What changes

**1. DB (migration)**
- Add `king_enabled boolean default false` to `toolbox_models`.
- Backfill: set `king_enabled = true` for `venice-uncensored-1-2` (the free default) and for any model currently in active use by a Soul (`preferred_model` lookup). Everything else starts off.
- `runVeniceSync` keeps `king_enabled` untouched on existing rows; new models always insert as `false`.

**2. Bank guardrail (`bank.server.ts`)**
- Anywhere a model is requested or used as fallback: if `king_enabled = false`, refuse and fall back to the free default. Ledger row marked `denied` with reason "Model not enabled by King."
- `firstFreeFallback` only returns `king_enabled = true` candidates.

**3. Speaker (`speaker.functions.ts`)**
- Same guardrail before the API call, so a stale `preferred_model` on a Soul can never spend.

**4. Compact panel (`ProviderCompactPanel.tsx`)**
- Each row gets a small toggle (Switch component) on the right: **Enabled** / **Off**.
- Disabled models render dimmed; "Set as default" and "Use for this Soul" buttons hide when off.
- The free default's toggle is locked on (can't disable the floor).
- Filter chips gain one option: `[Enabled only]` (default on, so the list stays short).

**5. Cost-rank UI tweak**
- Show Venice's published per-1M-token price next to the cost chip when known (e.g. `0.05 V/1k · ~$0.05/M`) so You can decide enable/disable at a glance. Pulled from the same sync.

### What stays the same

Trust doctrine, Trigger Engine, Chambers, Workshop, Studio, ceremonies — untouched. Tier badges, ledger panel, premium-freeze logic — unchanged.

### Verification

- Toggle a paid model off in Compact → assign it to a Soul (UI should refuse) → in Chamber, Soul falls back to free with a soft notice.
- New models from next nightly sync arrive `king_enabled = false` — verify by query.
- `SELECT model_id, king_enabled FROM toolbox_models WHERE king_enabled;` should be a short curated list.

### Files

- migration: add column + backfill
- `src/lib-server/bank.server.ts` — enablement check, fallback filter
- `src/lib-server/speaker.functions.ts` — enablement check before spend
- `src/lib-server/venice-registry.functions.ts` — preserve `king_enabled` on sync, expose per-1M price
- `src/components/registry/ProviderCompactPanel.tsx` — toggle UI, "Enabled only" filter, price display
- `src/integrations/supabase/types.ts` — regenerated