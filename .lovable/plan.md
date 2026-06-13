## Where the toggles actually are (and why You can't see them)

I added `● On / ○ Off` chips inside the **Provider Compact panel** (the "All models · sorted by cost" subsection nested inside the Ceremony Scroll). The list You're looking at — the big grouped catalogue with "Venice Pro · Included in membership" / "Venice Free · Fallback after Pro" headers and a `↻ Sync from Venice` button — is a **different** component (`VeniceRegistryPanel`, rendered inside the Constitution panel). It was built earlier as a read-only catalogue and never got the toggle treatment.

Two reasonable fixes, You pick:

### Option A — add toggles to the catalogue (recommended)

Put the same `● On / ○ Off` chip on every row of the `VeniceRegistryPanel` tier accordions, where Your eyes already are. Wire it to the same `king_enabled` column the Bank already enforces — so toggling here has the exact same effect as toggling in the Compact. Default model stays locked on. Dim Off rows. Add a tiny `N enabled` counter in the header.

This is the smallest, clearest fix. One file touched: `src/components/registry/VeniceRegistryPanel.tsx`.

### Option B — direct You to the Compact

Leave the catalogue read-only and add a small breadcrumb at the top of `VeniceRegistryPanel` saying *"Toggle models in the Provider Compact below ↓"*. Cheaper but means You have to scroll past this list every time to actually flip a switch — which is the exact friction You just hit.

### My recommendation

**Option A.** The catalogue is where the eye lands; that's where the control belongs. The Compact's toggle list stays as a secondary "by cost" view for when You want to sort by spend.

No database changes, no Bank changes — `king_enabled`, the denial logic, the fallback chain, the ledger entries are all already wired. This is purely surfacing the control in the second place You're already looking.

### Files

- `src/components/registry/VeniceRegistryPanel.tsx` — add `king_enabled` to the row type + select, render the toggle chip per row, wire the same Supabase update + optimistic state pattern, dim Off rows, header counter.
