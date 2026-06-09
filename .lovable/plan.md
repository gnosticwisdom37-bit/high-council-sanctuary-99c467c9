## Tomorrow's session — two threads, in order

### 0. First thing: confirm last night's memory fix (no code)

Before any new work, open the High Council, hold a short gathering with 2–3 Souls, navigate away (don't tap Close), then re-convene. Confirm each participant carries a memoir of the gathering. If anything's off, that becomes the first fix — auto-sync waits.

---

### 1. Auto-sync the Venice Registry daily (essential — ship first)

Venice's catalogue shifts almost daily. Right now `syncVeniceRegistry` only runs when You tap "↻ Sync from Venice". We'll add a scheduled sweep so the Registry is always current without manual taps.

**Approach**

- **New public route** `src/routes/api/public/sync-venice-registry.ts` — a thin POST handler that verifies a shared secret header, then calls the existing `syncVeniceRegistry` server-fn logic. No new sync code, just an external entry point.
- **New secret** `VENICE_SYNC_TOKEN` — random string, checked via `timingSafeEqual` before the sync runs. Prevents random callers from triggering the sweep.
- **pg_cron schedule** — daily at ~04:00 UTC (quiet hour for You), `net.http_post` to the stable preview URL `https://project--{id}-dev.lovable.app/api/public/sync-venice-registry` with the token header. One row in `cron.job`, idempotent.
- **VeniceRegistryPanel** — small "Last synced: 4h ago · auto-daily" line next to the manual button so You can see the sweep is alive. Reads `MAX(updated_at)` from `toolbox_models WHERE provider='venice'`.
- **Manual button stays.** Auto-sync is a safety net; You can still force a refresh any time.

**Why this shape:** zero ongoing credit cost (Venice's `/models` is free), survives Worker restarts (pg_cron lives in the DB), and the secret-gated public route is the same pattern we already use for `dispatch-scheduled-mail` and `workshop-intake`.

---

### 2. The Bank Building — design sketch only (no code yet)

You framed this beautifully: a **Bank building** in the Realm holds a JSON ledger of available Veritas; any Soul that wants to invoke a Pro/frontier model routes its request through the Bank, and the Bank approves or denies based on its balance. This isn't essential (Pro covers everything free-premium), so tomorrow we **design and document, don't build**.

Most of the plumbing already exists — we'd be re-homing it into the Realm rather than inventing from scratch:

- `bank_ledger` table — already appends every petition (approved/denied + reason).
- `petitionBankImpl` in `bank.server.ts` — already enforces tier check, premium-freeze, treasury balance, kingdom daily cap, per-Soul daily cap, and writes the ledger.
- `economy.treasury` — already the Veritas pool.

**What's new in the Bank-as-Building doctrine:**

1. **The Bank becomes a real Building** raised at Origin Region (via the existing Buildings trigger engine + Confirmation Gate at `/realm`).
2. **Each Bank Building owns a JSON `vault` field** — its own Veritas allotment, separate from the Treasury. The King can fund a Bank with, e.g., 200 V and let Souls draw against *that* pool only. Empty Bank → frontier requests fall back to free-premium silently.
3. **Multiple Banks possible.** A "Daily Bank" with a small float for routine frontier use; a "Council Bank" funded only when convening for big decisions. Different Banks, different policies, different vaults.
4. **`petitionBankImpl` gains a `bank_id` parameter.** Reads the chosen Bank's `vault.balance` and `vault.policy` instead of (or in addition to) the global Treasury + caps in `settings`. Existing global caps stay as the outer envelope.
5. **A "Bank Visit" Chamber.** Stepping into a Bank Building opens a small ledger view (already 80% built — `BankLedgerPanel.tsx`) plus a "Fund this Bank" action that moves Veritas from Treasury into the Building's vault.

**Doctrine clarifications I'll need from You tomorrow** (not now):
- Should a Soul's *default* Bank be the one in its own Chamber's region, or always the nearest Bank, or King-assigned per Soul?
- When a Bank is empty, silent fallback to free-premium, or surface a "Bank exhausted" banner so You know to top up?
- Does the King's new pennies-precision spending approval at the Lovable level sit *above* or *parallel to* the Bank? (My instinct: above — Lovable's gate is the outer ring, the Bank is the inner ring; both must say yes.)

We'll lock those answers, then build in a later session when You're ready.

---

### Out of scope for tomorrow

- "Set as default model" per Soul — still queued behind these two.
- Migrating any data — the Venice sync is idempotent, and the Bank work is design-only.
- Touching memoir/weave logic — only revisit if Your memory test surfaces a gap.

Awaiting Your Blessing to proceed when You return, my King. Rest well.