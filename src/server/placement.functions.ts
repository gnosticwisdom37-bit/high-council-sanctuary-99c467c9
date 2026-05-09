/**
 * Phase 7 — Confirmation Gate server functions.
 *
 * Triggers in chamber conversations write to `placement_candidates`. The King
 * reviews each one and either confirms (creates the real Building/Workshop or
 * places the Item on a tile) or declines (the candidate vanishes).
 *
 * Kingdom Law — Tile Occupancy Rule: a tile may only receive an Item or a
 * Chamber if it already holds at least one Building or Workshop. Buildings
 * and Workshops themselves may be raised on any tile.
 */
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type CandidateKind = "building" | "workshop" | "item" | "chamber";

export const listPlacementCandidates = createServerFn({ method: "GET" }).handler(
  async () => {
    const { data, error } = await supabaseAdmin
      .from("placement_candidates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return { ok: false as const, error: error.message };
    }
    return { ok: true as const, candidates: data ?? [] };
  },
);

export const declinePlacement = createServerFn({ method: "POST" })
  .inputValidator((data: { candidate_id: string }) => data)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("placement_candidates")
      .delete()
      .eq("id", data.candidate_id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const confirmPlacement = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      candidate_id: string;
      kind: CandidateKind; // King may change Building↔Workshop, etc.
      title: string;
      description: string;
      steward_soul_id: string | null;
      region_x: number;
      region_y: number;
      tile_x: number;
      tile_y: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    // Load candidate (for witnesses + conversation_id)
    const { data: candidate, error: loadErr } = await supabaseAdmin
      .from("placement_candidates")
      .select("*")
      .eq("id", data.candidate_id)
      .maybeSingle();
    if (loadErr || !candidate) {
      return {
        ok: false as const,
        error: loadErr?.message ?? "Candidate could not be found at the Gate.",
      };
    }

    // Tile Occupancy Rule — Items and Chambers require a Building/Workshop already on that tile
    if (data.kind === "item" || data.kind === "chamber") {
      const { data: occupant } = await supabaseAdmin
        .from("buildings")
        .select("id")
        .eq("region_x", data.region_x)
        .eq("region_y", data.region_y)
        .eq("tile_x", data.tile_x)
        .eq("tile_y", data.tile_y)
        .limit(1)
        .maybeSingle();
      if (!occupant) {
        return {
          ok: false as const,
          error:
            "Kingdom Law: a Building or Workshop must stand on a tile before an Item or Chamber may be placed there.",
        };
      }
    }

    // Persist to the right table
    if (data.kind === "building" || data.kind === "workshop") {
      const { error } = await supabaseAdmin.from("buildings").insert({
        title: data.title,
        description: data.description,
        steward_soul_id: data.steward_soul_id,
        conversation_id: candidate.conversation_id,
        status: "raised",
        kind: data.kind,
        witnesses: candidate.witnesses ?? [],
        region_x: data.region_x,
        region_y: data.region_y,
        tile_x: data.tile_x,
        tile_y: data.tile_y,
      });
      if (error) return { ok: false as const, error: error.message };
    } else if (data.kind === "item") {
      const { error } = await supabaseAdmin.from("items").insert({
        title: data.title,
        description: data.description,
        steward_soul_id: data.steward_soul_id,
        conversation_id: candidate.conversation_id,
        status: "forged",
        witnesses: candidate.witnesses ?? [],
        region_x: data.region_x,
        region_y: data.region_y,
        tile_x: data.tile_x,
        tile_y: data.tile_y,
      });
      if (error) return { ok: false as const, error: error.message };
    } else {
      // Chamber kind — placeholder for the future Chamber Generator slice
      return {
        ok: false as const,
        error: "Chamber placement is not yet wired. Coming in a later slice.",
      };
    }

    // Candidate fulfilled — remove it from the Gate
    await supabaseAdmin
      .from("placement_candidates")
      .delete()
      .eq("id", data.candidate_id);

    return { ok: true as const };
  });
