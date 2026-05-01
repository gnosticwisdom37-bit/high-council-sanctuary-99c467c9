/**
 * curation.functions — King's gestures over the Trigger Engine's artefacts.
 *
 * Trust is intentionally NOT included here. Trust Doctrine is edited only
 * through the Constitution panel by the King, never via these helpers.
 */
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type CurableTable = "deeds" | "items" | "buildings";

const TABLES: ReadonlyArray<CurableTable> = ["deeds", "items", "buildings"];
function assertTable(t: string): asserts t is CurableTable {
  if (!TABLES.includes(t as CurableTable)) {
    throw new Error(`Curation refused: unknown table "${t}".`);
  }
}

/**
 * Reassign the steward of a Deed/Item/Building. The previous steward is
 * automatically moved into the witnesses list (if not already present)
 * so no Soul who knew about the artefact is forgotten.
 */
export const reassignSteward = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { table: string; id: string; new_steward_soul_id: string }) => data,
  )
  .handler(async ({ data }) => {
    assertTable(data.table);

    const { data: row, error: fetchErr } = await supabaseAdmin
      .from(data.table)
      .select("id, steward_soul_id, witnesses")
      .eq("id", data.id)
      .single();
    if (fetchErr || !row) {
      return { ok: false as const, error: "The artefact could not be found." };
    }

    const oldSteward = (row.steward_soul_id as string | null) ?? null;
    const witnesses = ((row.witnesses as string[] | null) ?? []).slice();

    // Drop the new steward from witnesses (they're being promoted).
    const filtered = witnesses.filter((w) => w !== data.new_steward_soul_id);
    // Add the previous steward to witnesses if they exist and aren't there yet.
    if (oldSteward && oldSteward !== data.new_steward_soul_id && !filtered.includes(oldSteward)) {
      filtered.push(oldSteward);
    }

    const { error: updErr } = await supabaseAdmin
      .from(data.table)
      .update({
        steward_soul_id: data.new_steward_soul_id,
        witnesses: filtered,
      })
      .eq("id", data.id);
    if (updErr) {
      return { ok: false as const, error: `Reassignment failed: ${updErr.message}` };
    }
    return { ok: true as const };
  });

/**
 * Permanently delete a Deed/Item/Building. No archive limbo — the King's
 * Purge is final, freeing the Registry from redundant or mistaken inscriptions.
 */
export const purgeArtefact = createServerFn({ method: "POST" })
  .inputValidator((data: { table: string; id: string }) => data)
  .handler(async ({ data }) => {
    assertTable(data.table);
    const { error } = await supabaseAdmin
      .from(data.table)
      .delete()
      .eq("id", data.id);
    if (error) {
      return { ok: false as const, error: `Purge failed: ${error.message}` };
    }
    return { ok: true as const };
  });

/**
 * Add a Soul to the witnesses list of an artefact. Reserved for future UI.
 */
export const addWitness = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { table: string; id: string; soul_id: string }) => data,
  )
  .handler(async ({ data }) => {
    assertTable(data.table);
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from(data.table)
      .select("witnesses, steward_soul_id")
      .eq("id", data.id)
      .single();
    if (fetchErr || !row) {
      return { ok: false as const, error: "The artefact could not be found." };
    }
    if ((row.steward_soul_id as string | null) === data.soul_id) {
      return { ok: false as const, error: "That Soul is already the steward." };
    }
    const witnesses = ((row.witnesses as string[] | null) ?? []).slice();
    if (!witnesses.includes(data.soul_id)) witnesses.push(data.soul_id);
    const { error: updErr } = await supabaseAdmin
      .from(data.table)
      .update({ witnesses })
      .eq("id", data.id);
    if (updErr) {
      return { ok: false as const, error: `Witness add failed: ${updErr.message}` };
    }
    return { ok: true as const };
  });

/**
 * Remove a Soul from the witnesses list of an artefact. Reserved for future UI.
 */
export const removeWitness = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { table: string; id: string; soul_id: string }) => data,
  )
  .handler(async ({ data }) => {
    assertTable(data.table);
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from(data.table)
      .select("witnesses")
      .eq("id", data.id)
      .single();
    if (fetchErr || !row) {
      return { ok: false as const, error: "The artefact could not be found." };
    }
    const witnesses = ((row.witnesses as string[] | null) ?? []).filter(
      (w) => w !== data.soul_id,
    );
    const { error: updErr } = await supabaseAdmin
      .from(data.table)
      .update({ witnesses })
      .eq("id", data.id);
    if (updErr) {
      return { ok: false as const, error: `Witness remove failed: ${updErr.message}` };
    }
    return { ok: true as const };
  });
