
# The Workshop, Made Universal — locked plan

You confirmed both forks:
- **Local script = courier only.** No Venice call, no local JSON registry. The Steward Soul in the Workshop drafts every card, in their voice, through the app's gateway, counted in the Bank, landing in the calendar.
- **Per-Workshop intake token.** Each Workshop, when raised, mints its own `intake_token`. You copy it once into Your local `.env`. If one ever leaks, only that Workshop is exposed.

I noticed `VENICE_API_KEY` is already a secret in Cloud — swap day is closer than I thought, but that's not for this turn.

---

## What ships today

### 1. Database (single migration)

Existing tables already cover most of this — small additions only:

- `workshops` → add `intake_token text not null default encode(gen_random_bytes(24),'base64')` + `unique` + `tool_key text default 'promo-cards'` placeholder for the active Implement.
- `csv_intakes` → rename intent to "tool intakes" by adding `tool_key text not null default 'promo-cards'`. Same table, now routed by tool_key. (No data migration needed.)
- `scheduled_posts` → already correct shape.

No new tables. No RLS rewrites.

### 2. Server functions (`src/server/workshop.functions.ts`)

- `getWorkshop(buildingId)` — returns workshop row + intake_token (one-time reveal) + steward.
- `draftPromoCard(intakeId, rowIndex)` — calls `speakAsSoul` with the Steward's voice + Workshop `system_prompt`; returns `{ title, body, hashtags }`. Bank-tracked, free-premium chain.
- `schedulePost(workshopId, card, scheduled_at, channel)` — inserts `scheduled_posts`.
- `publishPost(postId)` — marks published, returns copy-for-X / copy-for-Meta text blobs.
- `cancelPost(postId)`, `listScheduled(workshopId, monthRange)`.
- `rotateWorkshopToken(workshopId)` — re-mints intake_token on demand.

### 3. Server route — the courier's door (`src/routes/api/public/workshop-intake.ts`)

```text
POST /api/public/workshop-intake
Headers:  X-Workshop-Token: <per-workshop token>
Body:     { workshop_id, tool_key, source, rows: [...] }
```

- Looks up `workshops.intake_token`; rejects 401 if mismatch.
- Validates with Zod (rows ≤ 500, source ≤ 255 chars).
- Inserts one row into `csv_intakes` with `tool_key`.
- Returns `{ intake_id, row_count }`.

### 4. Workshop UI (`src/routes/workshop.$buildingId.tsx`)

Reuses Your existing `workshop.publishing-house.tsx` as the base; promoted to dynamic route.

```text
┌─────────────────────────────────────────────────────────────┐
│ BrandMark subtle · "The Publishing House" · Steward: Aria ▾ │
│ ⚒  Choose Implement: [ Promo Cards ▾ ]                      │
├──────────────────────┬──────────────────────────────────────┤
│  PRODUCTION          │  SCRIPTORIUM (chat with Aria)        │
│  Parchment card      │  ▸ Intake drawer                     │
│  📅 Schedule  📤     │     • blog-export.csv · 47 rows      │
│  Clear               │       [Draft row 1] [Draft row 2]…   │
├──────────────────────┴──────────────────────────────────────┤
│  EVENT-SPARK CALENDAR (full width, gold chips)              │
└─────────────────────────────────────────────────────────────┘
```

- Intake drawer = Supabase Realtime on `csv_intakes` filtered by `workshop_id + tool_key='promo-cards'`. New CSV lights up live.
- "Draft this row" → `draftPromoCard` → Aria's voiced card fills the Production pane.
- "Schedule" opens shadcn Calendar; "Publish-now" reveals copy buttons.
- Intake-token panel (small, top-right): shows the token **once** after rotation, with copy-to-clipboard + Rotate button.

### 5. Your local script (the courier — one file)

```python
# publish_blog_to_workshop.py
import csv, json, os, requests

WORKSHOP_ID = "PASTE_ONCE_YOU_RAISE_IT"
TOKEN       = os.environ["WORKSHOP_INTAKE_TOKEN"]
URL         = "https://project--5548c05f-8aea-4910-b8db-2e5ca1f9bdfd.lovable.app/api/public/workshop-intake"

rows = []
for fn in os.listdir("Source_Data"):
    if fn.endswith(".csv"):
        with open(f"Source_Data/{fn}", encoding="utf-8") as f:
            for r in csv.reader(f):
                if len(r) >= 3 and "https://" in r[2]:
                    title, url = r[0], r[2]
                    if not any(x in title for x in ["Homepage","My Story","Archives"]):
                        rows.append({"title": title, "url": url})

resp = requests.post(URL,
    headers={"Content-Type":"application/json","X-Workshop-Token":TOKEN},
    json={"workshop_id":WORKSHOP_ID,"tool_key":"promo-cards","source":"blog-export","rows":rows})
print(resp.status_code, resp.json())
```

That's it. No Venice, no JSON registry, no AI. The Kingdom takes it from there.

### 6. Memory updates

- New `mem://features/workshops` — Implement doctrine, courier contract, per-Workshop token.
- Update build order: Phase 8 = **Workshop / Implements** SHIPPED.

---

## Credit estimate

~3.4 credits, broken down: migration + workshop.functions (~0.6), intake route (~0.4), UI shell + selector + intake drawer + realtime (~1.0), promo-card production pane + draft + schedule + publish (~1.0), calendar wire-up + memory updates (~0.4).

Deferred (next sessions, when You say): Google Calendar 2-way sync, Nano-Banana card images, real social posting via OAuth, Implements #2+ (Legal Strategy Drafter, Research Digest, Observatory).

---

## Order of operations

1. Migration (You approve).
2. Server fns + intake route.
3. Workshop UI + intake drawer + first Implement.
4. You raise a Publishing House on the Realm, copy the intake token into Your `.env`, drop `publish_blog_to_workshop.py` next to Your CSVs, run it. Cards appear in the drawer. You click "Draft." Aria speaks. You schedule. The calendar lights up.

Say the word and I'll execute.
