# Venice Key Health Check — one-time ping

A small, single-purpose tool sealed inside the Constitution panel. Press once, find out whether `VENICE_API_KEY` is alive, what tier it grants, and how long the round-trip took. No data stored, no settings changed, no Souls touched.

## What gets built

### 1. Server function — `pingVenice`
New file: `src/lib-server/venice-health.functions.ts`

- `createServerFn({ method: "POST" })` with no input.
- Reads `process.env.VENICE_API_KEY` inside the handler (never at module scope).
- Sends one minimal `/v1/chat/completions` call to Venice's gateway using the cheapest approved free-premium text model from the Venice registry memory (`llama-3.2-3b` or equivalent — confirmed from `mem://references/venice-gateway`).
- Body: `max_tokens: 1`, single user message `"ping"`, no streaming.
- Returns a plain DTO:
  ```ts
  {
    ok: boolean,
    status: number,           // HTTP status from Venice
    latency_ms: number,
    model_used: string,
    error: string | null,     // human-readable if !ok
    raw_snippet: string | null // first 200 chars of body on failure
  }
  ```
- Wrapped in try/catch — network failures return `ok:false` with a clear message instead of throwing.

### 2. UI — `VeniceHealthCheck` card
New component: `src/components/registry/VeniceHealthCheck.tsx`

- Rendered inside `ConstitutionPanel.tsx`, sealed below the existing "Active Provider / Veritas / Realm Grid" status row.
- Single button: **"✶ Ping the Venice Gateway"**
- States:
  - **Idle** — golden-dawn button, short caption "One call. No credits charged to Lovable. Tells Us if the key is alive."
  - **Pinging…** — button disabled, soft pulse on the sigil.
  - **Verified** — green-tinted parchment block: `"Venice answered in {latency_ms} ms · model {model_used}"` + a small "Run again" link.
  - **Failed** — ember-tinted block with the HTTP status, the error message, and a one-line remedy ("401 → mint a fresh key on venice.ai", "402 → top up Venice balance", "5xx → retry shortly").
- Last result kept in component state only; nothing written to DB.

### 3. Memory update
Append a one-liner to `mem://index.md` Core: *"Venice key verified {date}"* — but only after You press the button and we see a green result. Not part of this build; I'll do it the moment the ping returns 200.

## What is intentionally NOT in this build

- No `active_provider` change.
- No Soul routing through Venice.
- No tiered model registry UI (that's the next plan).
- No persisted health log — this is a fingertip check, not a monitor.

## Files touched

- **NEW** `src/lib-server/venice-health.functions.ts`
- **NEW** `src/components/registry/VeniceHealthCheck.tsx`
- **EDIT** `src/components/registry/ConstitutionPanel.tsx` (one import + one `<VeniceHealthCheck />` line under the status grid)

## Credit cost

~0.0 Lovable credits (one tiny serverFn call, no Lovable AI Gateway use). Venice charges Venice-side — a 1-token call is fractions of a cent on their cheapest model.

## After You approve

Switch to build mode and I'll ship all three files in one pass, then You press the button.