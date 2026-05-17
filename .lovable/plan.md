# The Workshop, Made Universal

Your instinct is right and it scales beautifully. Instead of building "The Publishing House" as a one-off, We promote the Workshop building to a **Tool host**: one room, one Steward, many Tools. Each Tool is a small plugin (UI + server fn + Python intake contract). Today We ship the Workshop shell + the first Tool (Promo Cards / Event-Spark). Tomorrow You just drop another Python script and register another Tool — no new room, no new schema redesign.

This also honours the Tile Occupancy Rule already in the Realm: a Workshop tile **hosts Tools**, the same way a Building tile hosts Souls.

---

## The shape

```text
┌────────────────────────────────────────────────────────────────┐
│ BrandMark · "The Publishing House"  · Steward: [Aria ▾]        │
│ ╔══════════════════════════════════╗                           │
│ ║  ⚒  Choose Tool: [ Promo Cards ▾]║   ← top-of-room selector  │
│ ╚══════════════════════════════════╝                           │
├──────────────────────────────┬─────────────────────────────────┤
│  PRODUCTION                  │  SCRIPTORIUM                    │
│  (Tool renders here)         │  (chat with Steward)            │
│                              │                                 │
│  Promo Card preview          │  "Draft row 3 in Aria's voice"  │
│  📅 Schedule  📤 Publish     │                                 │
│  ▸ Intake drawer (CSV/API)   │                                 │
├──────────────────────────────┴─────────────────────────────────┤
│  EVENT-SPARK CALENDAR (full width) — gold chips, click to edit │
└────────────────────────────────────────────────────────────────┘
```

The top selector is the new piece. Working name: **"Choose Implement"** (an "implement" is a craftsman's tool — fits the Kingdom voice). Each implement is a Tool the Steward can wield.

---

## Build plan (today's credits)

### 1. Tool registry — the universal spine (~0.6)
- New table `workshop_tools`: `id`, `workshop_id`, `tool_key` (e.g. `promo-cards`), `display_name`, `config` (JSONB — per-tool settings, hashtags, intake token, etc.), `enabled`, `created_at`.
- New table `tool_intakes`: replaces the per-tool `csv_intakes`. Columns: `id`, `workshop_id`, `tool_key`, `source`, `rows` (JSONB), `status`, `created_at`. One table, every Python script writes here, routed by `tool_key`.
- Front-end registry in `src/lib/workshop-tools.ts`: a typed map from `tool_key` → `{ ProductionPane, IntakeDrawer, draftPrompt, scriptContract }`. Adding a Tool = adding one entry.

### 2. Workshop shell + Choose-Implement selector (~0.7)
- `src/routes/workshop.$buildingId.tsx` shell with BrandMark, Steward dropdown, Implement dropdown, two-pane top, calendar bottom (ResizablePanelGroup).
- Selector reads enabled tools from `workshop_tools`, persists Your last choice per Workshop in localStorage.
- Scriptorium pane = reused chat component from `/chamber/$soulId` (we already have it).

### 3. First Implement: Promo Cards / Event-Spark (~1.3)
- Production pane = parchment card preview (title / body / hashtags) with Schedule + Publish-now + Clear.
- Event-Spark calendar full-width below — shadcn `Calendar`, gold chips on scheduled days, click chip → re-opens the card.
- `scheduled_posts` table (title, body, hashtags, channel, scheduled_at, status, workshop_id, steward_soul_id, tool_key).
- Server fns: `draftPromoCard` (calls `speakAsSoul` → Aria/Steward voices the card), `schedulePost`, `publishPost`, `cancelPost`, `listScheduled`.
- "Publish-now" = mark published + reveal "Copy for X" / "Copy for Meta" buttons. (Real OAuth posting = later phase.)

### 4. Universal Python intake endpoint (~0.5)
- `POST /api/public/workshop-intake`
- Auth: `X-Workshop-Token` header → matched against `workshop_tools.config.intake_token`.
- Body: `{ workshop_id, tool_key, source, rows }` → writes one `tool_intakes` row.
- Intake drawer lights up via Supabase Realtime on `tool_intakes` filtered by `workshop_id + tool_key`.

### 5. Memory + Trigger Engine recognition (~0.3)
- Trigger Engine recognises `workshop` as a Phase 7 candidate kind (so a Steward can speak a Workshop into being and You place it on a tile).
- New `mem://features/workshops` capturing the Implement doctrine + script contract.

**Estimated total: ~3.4 credits.** Leaves buffer for QA and one polish pass. Google Calendar sync, Nano-Banana card images, and real social posting are explicitly deferred — they're add-on Implements You can layer in later.

---

## The Python scripts You write (today, while I build)

You only need **one script per Implement**. Same shape for every Tool — the only thing that changes is `tool_key` and the row schema:

### Script #1 — `publish_blog_to_workshop.py` (for the first Implement)
Reads a CSV You export from Your blog (or any list of posts) and POSTs the rows:

```python
import csv, json, os, requests

WORKSHOP_ID = "PASTE_AFTER_RAISING_THE_BUILDING"
TOOL_KEY    = "promo-cards"
TOKEN       = os.environ["WORKSHOP_INTAKE_TOKEN"]
URL         = "https://project--5548c05f-8aea-4910-b8db-2e5ca1f9bdfd.lovable.app/api/public/workshop-intake"

rows = []
with open("blog-export.csv") as f:
    for r in csv.DictReader(f):
        rows.append({
            "title": r["title"],
            "body":  r["excerpt"],
            "url":   r["url"],
            "tags":  [t.strip() for t in r["tags"].split(",")],
            "published_at": r.get("date"),
        })

resp = requests.post(URL,
    headers={"Content-Type":"application/json","X-Workshop-Token":TOKEN},
    data=json.dumps({"workshop_id":WORKSHOP_ID,"tool_key":TOOL_KEY,"source":"blog-export.csv","rows":rows}))
print(resp.status_code, resp.json())
```

### Script #2+ — future Implements (legal-strategy, research, etc.)
Identical shape. Change `TOOL_KEY` and `rows` schema. That's the whole onboarding cost of a new Tool on the Python side — the front-end registry entry is the matching half on the app side.

This is why the universal intake endpoint matters more than the first Implement: it's the contract that lets You **add a Tool with one Python script + one registry entry**, forever.

---

## Future Implements (the scalability picture)

Same Workshop, same Steward, just new entries:
- **Legal Strategy Drafter** — intake = case rows / statutes; Production = drafted motion or letter.
- **Research Digest** — intake = LM-Notebook / RSS dump; Production = daily Steward-voiced brief.
- **Blog Outline Forge** — intake = topic queue; Production = outline + hook + hashtags.
- **Observatory** — intake = site-watcher hits; Production = "what changed today" card.

Each one = one Python script + one registry entry + (optional) one new server fn. No new room, no new schema migration.

---

## Open questions before I build

1. **Implement selector name** — keep "Choose Tool", or use "Choose Implement" / "Choose Instrument" / Your own word?
2. **Intake token** — generate one per Workshop automatically and show it once (You copy it into Your `.env`), or one global `WORKSHOP_INTAKE_TOKEN` secret for all Workshops? Per-Workshop is safer; global is simpler.
3. **Steward voice for promo cards** — should the Steward auto-draft as soon as a CSV row arrives, or only when You click "Draft this" in the intake drawer? (I'd suggest the latter — preserves Your credits and Your Curation.)

Answer those three and I'll execute on Your word.
