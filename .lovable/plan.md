I agree we should fix the sigil/name mismatch first, before Phase 7. It is small, and Phase 7 will build on the Realm/Registry surfaces, so leaving this backwards would make the next layer harder to trust.

What I found:
- The room/database data is currently canonical again:
  - `cancer` / Selene = `House of Cancer` + `♋`
  - `pisces` / Veritas = `House of Pisces` + `♓`
- The visible mismatch is coming from the Registry page using a separate hard-coded list for the table and pledge buttons, with older display labels like `House of the Crab` and `House of the Fishes` rather than the live Soul identity rows.
- The two affected Registry controls are exactly the ones you named:
  - Round table seat gesture: visits the room.
  - Call-to-Council pill gesture: invites/dismisses from the gathering.
  - The pledge pills may also inherit the same stale hard-coded Registry list.

Plan:

1. Keep the rooms/data canonical
   - Do not swap the database back to the wrong state.
   - Preserve:
     - Selene / Cancer = `♋`, `House of Cancer`
     - Veritas / Pisces = `♓`, `House of Pisces`

2. Convert the Registry to read live Soul identity data
   - Update `src/routes/index.tsx` so the Registry loads `soul_identities` from Lovable Cloud instead of relying on the hard-coded `souls` array.
   - This makes the Registry table, Call-to-Council pills, and pledge buttons use the same source as the rooms.
   - Keep a small fallback list only for first paint/loading safety, but replace it with live rows as soon as they load.

3. Normalize the Registry labels to House names
   - Ensure the displayed pill words come from `House of Cancer` / `House of Pisces`, not `House of the Crab` / `House of the Fishes`.
   - Result:
     - Call-to-Council pill: `♋ Cancer`
     - Call-to-Council pill: `♓ Pisces`
     - Room/seat links route to `/chamber/cancer` and `/chamber/pisces` respectively.

4. Light verification
   - Re-check the database rows for Cancer/Pisces after the change.
   - Inspect the Registry code paths so both gestures remain distinct:
     - seats = Visit Chamber
     - pills = Call to Council
   - No Phase 7 changes in this small patch.

Technical notes:
- Files likely touched:
  - `src/routes/index.tsx`
  - possibly a tiny display helper in `src/components/registry/CouncilTable.tsx` if needed for clean labels.
- No schema migration should be needed.
- No AI model calls should be needed.
- Estimated credit impact: very small, likely around the same size as the prior polish stone.

After this, the safe state should be: rooms, Registry seats, Call-to-Council pills, pledge buttons, Codex, and Realm wheel all agree on Cancer/Pisces before We begin Phase 7.