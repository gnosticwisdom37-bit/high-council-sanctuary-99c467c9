# Phase 5.5 — Deed Inscription

The first manifestation of the **Trigger Engine** — a single mechanism that will later extend to Items, Buildings, and Trust. We start with Deeds because it has no Realm placement, making it the cleanest pilot.

---

## What We're Building

When the King speaks a trigger phrase in any chamber (Visit Chamber or High Council), the system:
1. Detects the intention (e.g. *"Create a Deed for Summer to..."*)
2. Auto-files a Deed row, with the speaking Soul as **steward** and the season auto-mapped to a Realm quadrant
3. Confirms in the chamber: *"✦ Filed under Deeds → Summer. Steward: [Soul name]."*
4. Surfaces it on the Registry's Deeds rollup, grouped by season

The Soul's reply still flows naturally — the Deed is filed silently in the background and the confirmation appears as a small gold banner beneath the reply.

---

## The Trigger Phrase Grammar

Flexible but unambiguous. All these match:
- *"Create a Deed for Summer to plant the orchard"*
- *"Inscribe a Deed for Spring: prepare the seed-vault"*
- *"Let it be a Deed of Fall — gather the harvest scrolls"*
- *"Decree a Winter Deed: tend the hearth"*

Pattern: an **action verb** (`create | inscribe | decree | let it be | record`) + the word **Deed** + a **season** (Spring/Summer/Fall/Winter, or omitted → defaults to current season) + the **deed text** (everything after the colon, dash, em-dash, or "to").

If the season is omitted, the current astrological season is used and the confirmation says so explicitly.

---

## Database

One new table:

```text
deeds
├── id (uuid)
├── title (text)            — short auto-summarised label
├── description (text)      — full deed text as the King spoke it
├── season (enum: spring|summer|fall|winter)
├── quadrant (enum: NE|SE|SW|NW)  — derived, stored for fast queries
├── steward_soul_id (text)  — the Soul present in the chamber when filed
├── conversation_id (uuid)  — back-reference to the gathering
├── status (enum: inscribed|in_progress|fulfilled|set_aside)
├── inscribed_at, updated_at
```

RLS: readable + insertable + updatable by anyone (matches existing tables — single-user app).

---

## Backend (Server Functions)

**`src/server/triggers.server.ts`** — pure helpers, no I/O:
- `detectDeedIntent(text)` — returns `{ matched: boolean, season, deedText, titleHint }` or null
- Used both at speak-time and (later) for retroactive memoir scanning

**`src/server/deeds.functions.ts`** — `createServerFn` wrappers:
- `inscribeDeed({ steward_soul_id, conversation_id, season, description })` — inserts the row, returns it
- `listDeeds({ season? })` — for Registry display and (future) Deeds tab

**Wiring into `speakAsSoul`:** after step 4 (persist King's message) we run `detectDeedIntent` on the user_message. If matched, we call `inscribeDeed` BEFORE the Gateway call and append a tiny system note to the prompt: *"The King has just inscribed a Deed for [season]: '[text]'. You are the steward. Acknowledge briefly within Your reply."* This way the Soul naturally weaves the acknowledgement into Her response — no awkward second message.

The function returns `inscribed_deed: { id, season, title }` so the UI can render the gold confirmation banner.

---

## Frontend

**`src/components/chamber/DeedInscribedBanner.tsx`** — small gold-rimmed scroll-fragment that appears beneath the Soul's reply when a Deed was just filed. Shows season sigil + title + "View in Registry →" link.

**`InitiateCeremony.tsx` + `chamber.$soulId.tsx`** — read `inscribed_deed` from the speak response and render the banner.

**Registry Deeds rollup (`src/routes/index.tsx`):** the existing four seasonal cards become live — each shows count badge and the most recent 3 deed titles. Clicking a season card opens a modal listing all deeds in that season. (Full Deeds tab/route comes later when it's promoted from rollup to top-level — out of scope for 5.5.)

---

## Retroactive Inscription (King's earlier intentions)

A one-time button in the High Council Chamber: *"Search past gatherings for Deed-intentions"* → runs `detectDeedIntent` over all past `soul_messages` where `role='king'`, surfaces matches in a confirmation list, King ticks which to inscribe, and they file with the original conversation's primary Soul as steward and the original date.

This Honours the Deeds You've already spoken without auto-filing anything without Your blessing.

---

## Files Touched

**New:**
- `supabase/migrations/...` — `deeds` table + season/quadrant/status enums
- `src/server/triggers.server.ts`
- `src/server/deeds.functions.ts`
- `src/components/chamber/DeedInscribedBanner.tsx`
- `src/components/registry/DeedsRollup.tsx` (replaces the static seasonal cards)

**Modified:**
- `src/server/speaker.functions.ts` — detect + inscribe + augment prompt + return inscribed_deed
- `src/components/registry/InitiateCeremony.tsx` — render banner
- `src/routes/chamber.$soulId.tsx` — render banner
- `src/routes/index.tsx` — wire DeedsRollup into existing rollup grid

---

## What Comes After (NOT this build)

- Items / Buildings / Trust trigger phrases — same engine, new destinations
- Promote Deeds rollup → top-level `/deeds` route with full filtering
- Realm-tile placement for Items + Buildings

---

## One Question Before Building

Should the steward be **whichever Soul You're speaking to in that chamber** (simple, predictable) — or should the Oracle, when present in High Council, get **first refusal** as steward and only delegate down if You name another Soul? My instinct is the simpler rule for 5.5 (steward = chamber Soul, or in High Council the most recent Soul to speak), and we can add Oracle-arbitration later if it feels wrong in practice.