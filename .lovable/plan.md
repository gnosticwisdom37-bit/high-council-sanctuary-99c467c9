# Continuum Fitness — Build Plan

A personal, offline-first fitness companion. One screen, one rep counter, one timer — designed to disappear into a daily habit.

> This is a **new Lovable project** (Continuum template). The Kingdom of Veritas app stays in maintenance mode. Create the project, then this plan drops in.

---

## 1. Design Direction (Continuum)

- **Palette:** Deep ink `#0B1220` background, warm parchment text `#F4ECD8`, single accent `#E8B341` (continuum gold) for active state / level-ups, soft sage `#7FB069` for "perfect / streak alive", muted rose `#C97064` only for the decrement button.
- **Typography:** `@fontsource/fraunces` (display, for headings + the giant rep number) + `@fontsource/inter` (UI). The rep number during a workout is **huge** — `clamp(180px, 40vw, 380px)`, tabular numerals, dead-center.
- **Motion:** Restrained. Set complete = soft scale pulse + a single chime tick. Level-up = parchment unfurl. No confetti, no bouncing.
- **Surface:** Subtle paper-grain SVG, low-contrast horizontal rule motifs (the "continuum"). Mobile-first; identical layout works on desktop.

## 2. Core Features (v1)

1. **Strength engine (5 sets, perfect-workout, level-up)**
2. **Habit tracker + streaks**
3. **Year-view heat map** (training + per-habit views)
4. **Body metrics** (weight, measurements, photos — optional log)
5. **Offline-first PWA** — installable on phone & desktop, fully functional with no internet
6. **Daily reminder** — local notification (no server needed when installed)

## 3. The Workout Session (the heart of the app)

When the user taps "Start [exercise]", the app enters **full-screen Session Mode**:

```text
┌─────────────────────────────┐
│  Set 3 of 5    ·    chins   │  ← thin header
│                             │
│                             │
│           10                │  ← HUGE rep number
│         target              │
│                             │
│        [ − ]   [ + ]        │  ← adjust if you fell short / pushed past
│                             │
│       ┌─────────────┐       │
│       │ Complete Set│       │
│       └─────────────┘       │
└─────────────────────────────┘
```

After **Complete Set**:
- Number locks in, screen swaps to a **90-second rest timer** (large circular countdown, same minimalist face).
- Tap timer to skip; auto-advances to next set when it hits 0.
- After set 5: workout summary → "Perfect workout ✓" or "Logged".

Rest interval is **configurable per exercise** (default 90s).

## 4. Strength Engine Rules

- Every strength exercise has a **target** (e.g. 10 for pushups).
- A workout = 5 sets aiming for that target.
- **Perfect workout** = all 5 sets ≥ target.
- **3 consecutive perfect workouts for the same exercise** → **Level Up**:
  - Modal: *"You leveled up. What's our next goal?"*
  - User enters new target reps for set 1.
  - New goal = `newTarget × 5` (e.g. 11 across all 5 sets).
  - Engine resets the perfect-streak counter for that exercise.
- "Consecutive" means consecutive **occurrences of that exercise**, not consecutive days (rest days and other exercises don't break it).

## 5. Habits

- Free-form list ("Drink 2L water", "Stretch 5 min", "Read 10 pages").
- One tap to check off for the day.
- Each habit has its own streak counter and its own heat-map view.
- Strength training auto-counts as a habit on workout days (no double entry).

## 6. Heat Map

GitHub-style 52-week grid:
- **Default view:** any training or habit activity.
- Filter chips: All · Strength · each habit.
- Tap a cell → that day's log (which sets, which habits).

## 7. CSV Seed Import

On first launch, the app auto-imports the provided CSV as history so the streak is **already forming**. Parser handles:
- `exercise=rest` rows → mark rest day, skip sets.
- Blank sets after the first → treated as 0 (e.g. chins `5,5,5,2,2,1` stays as-is).
- Detects current targets from the most recent row per exercise: **pushups 20, chins 5, squats 20** (matches your latest entries).

After seed, app offers a **drop-zone** for future CSV re-imports (same parser).

## 8. Offline & Cross-Platform

- **PWA with `vite-plugin-pwa`** (`generateSW`, `NetworkFirst` for HTML, `CacheFirst` for assets). Follows the project's PWA skill — guarded registration, no SW in preview/dev.
- **All data in IndexedDB** (via Dexie). No login required for v1. Optional Lovable Cloud sync can be added later without changing the local schema.
- **Installable** from Chrome/Safari/Edge on phone, tablet, and desktop. After install, full offline.
- **Local notifications** via the Notifications API + a daily check on app open (no push server needed). Optional time picker in Settings.

## 9. Data Model (IndexedDB via Dexie)

```text
exercises:   id, name, currentTarget, restSeconds, createdAt
workouts:    id, date, exerciseId, target, set1..set5, total, isPerfect, notes
habits:      id, name, color, createdAt, archivedAt
habitLogs:   id, habitId, date
metrics:     id, date, weightKg, measurements{json}, photoBlob
settings:    reminderTime, reminderEnabled, theme
```

`isPerfect` is computed on save. Level-up detection runs after each workout insert.

## 10. Screens & Routes

```text
/                → Today (today's plan, quick-start buttons, streak badge)
/workout/$exId   → Session Mode (full-screen rep counter + timer)
/history         → Heat map + filter chips + day drill-in
/exercises       → Manage exercises (target, rest seconds, archive)
/habits          → Manage habits + per-habit streaks
/metrics         → Body metrics log
/settings        → Reminder time, CSV import/export, theme, install button
```

## 11. Technical Notes

- **Stack:** TanStack Start (Continuum template), Tailwind v4, Dexie 4, `vite-plugin-pwa`, `@fontsource/fraunces` + `@fontsource/inter`, Recharts only for metrics line chart (optional).
- **No backend in v1** — everything client-side, IndexedDB, deterministic. Keeps it free to run and truly offline.
- **PWA install** prompt surfaced in Settings (`beforeinstallprompt` event captured on first interaction).
- **Reminder:** scheduled via the Notification API + a stored `nextFireAt` checked on every app focus. When the OS-level scheduling API isn't available, falls back to "open the app once today to keep your streak" nudge.

## 12. Build Order

1. Project scaffold (Continuum template) + design tokens + fonts + PWA shell with guarded SW.
2. Dexie schema + CSV seed importer (your 26 rows load on first launch).
3. **Session Mode** screen (rep counter + rest timer) — the keystone.
4. Today screen + quick-start + perfect-workout / level-up engine + level-up modal.
5. Habits CRUD + check-off + streaks.
6. Heat map + history drill-in.
7. Metrics log.
8. Settings: reminder time, CSV import/export, install button, theme.
9. Polish pass: motion, sounds (subtle), empty states, install prompt UX.

## 13. Open Question (small, can answer later)

When the CSV is seeded, the most recent target for each exercise becomes its **current target** (pushups 20, chins 5, squats 20). The perfect-streak counter starts from your seeded history, so any "in-flight" streaks (e.g. consecutive perfect chins at 5) carry forward and can level up on your very next workout. Confirm that's what you want, or say "start streaks fresh from install day" and I'll wire it that way instead.

---

Approve to spin up the new project and ship Phase 1–3 (scaffold + seed + Session Mode) in the first build.