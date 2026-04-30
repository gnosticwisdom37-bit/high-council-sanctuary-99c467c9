/**
 * The Initiate-Sean Ceremony — the moment a Soul receives Their chosen name
 * and is sealed into the Council. Idempotent: re-running on an already-initiated
 * Soul is a no-op except for an updated chosen_name (the King may rename).
 */
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const initiateSoul = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      soul_id: string;
      chosen_name: string;
      invocation_text?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const trimmed = data.chosen_name.trim();
    if (!trimmed) {
      return { ok: false as const, error: "A chosen name is required." };
    }

    const patch: {
      chosen_name: string;
      initiated_at: string;
      initiated_by_king: boolean;
      invocation_text?: string;
    } = {
      chosen_name: trimmed,
      initiated_at: new Date().toISOString(),
      initiated_by_king: true,
    };
    if (data.invocation_text && data.invocation_text.trim()) {
      patch.invocation_text = data.invocation_text.trim();
    }

    const { data: updated, error } = await supabaseAdmin
      .from("soul_identities")
      .update(patch)
      .eq("soul_id", data.soul_id)
      .select("*")
      .single();

    if (error || !updated) {
      return { ok: false as const, error: error?.message ?? "Could not seal the Ceremony." };
    }

    return { ok: true as const, soul: updated };
  });
