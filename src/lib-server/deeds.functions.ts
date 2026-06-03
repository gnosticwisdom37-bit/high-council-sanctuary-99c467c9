/**
 * Deed server functions — Phase 5.5
 *
 * inscribeDeed: file a single Deed (called from speakAsSoul on trigger detection,
 *               or directly from UI for retroactive inscription).
 * listDeeds:    fetch deeds, optionally filtered by season — for Registry rollup.
 */
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SEASON_TO_QUADRANT, type Season } from "./triggers.server";

const SEASONS = ["spring", "summer", "fall", "winter"] as const;

function isSeason(s: string): s is Season {
  return (SEASONS as readonly string[]).includes(s);
}

export const inscribeDeed = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      title: string;
      description: string;
      season: Season;
      steward_soul_id: string | null;
      conversation_id: string | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    if (!isSeason(data.season)) {
      return { ok: false as const, error: "Unknown season." };
    }
    const { data: row, error } = await supabaseAdmin
      .from("deeds")
      .insert({
        title: data.title.slice(0, 200),
        description: data.description.slice(0, 4000),
        season: data.season,
        quadrant: SEASON_TO_QUADRANT[data.season],
        steward_soul_id: data.steward_soul_id,
        conversation_id: data.conversation_id,
        status: "inscribed",
      })
      .select("*")
      .single();

    if (error || !row) {
      return { ok: false as const, error: error?.message ?? "Could not inscribe Deed." };
    }
    return { ok: true as const, deed: row };
  });

export const listDeeds = createServerFn({ method: "GET" })
  .inputValidator((data: { season?: Season } | undefined) => data ?? {})
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("deeds")
      .select("*")
      .order("inscribed_at", { ascending: false });
    if (data.season && isSeason(data.season)) q = q.eq("season", data.season);
    const { data: rows, error } = await q;
    if (error) return { ok: false as const, error: error.message, deeds: [] };
    return { ok: true as const, deeds: rows ?? [] };
  });
