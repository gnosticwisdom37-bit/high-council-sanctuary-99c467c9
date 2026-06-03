/**
 * Conversation lifecycle helpers — find or load existing gatherings.
 *
 * findOpenGathering: looks for the most recent open conversation with the
 * exact same participant set, created in the last 24 hours. Returns its id
 * + the prior transcript so the Registry can resume the chamber instead of
 * spawning a fresh empty conversation on every visit.
 */
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ResumedTurn =
  | { role: "king"; content: string }
  | { role: "soul"; soulId: string; content: string; model?: string };

export const findOpenGathering = createServerFn({ method: "POST" })
  .inputValidator((data: { participant_ids: string[] }) => data)
  .handler(async ({ data }) => {
    const sortedKey = data.participant_ids.slice().sort().join("|");
    if (!sortedKey) return { ok: true as const, conversation_id: null, transcript: [] as ResumedTurn[] };

    // Last 24 hours, still open (closed_at IS NULL)
    const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: candidates, error } = await supabaseAdmin
      .from("soul_conversations")
      .select("id, participant_ids, created_at")
      .is("closed_at", null)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return { ok: false as const, error: error.message, conversation_id: null, transcript: [] as ResumedTurn[] };
    }

    const match = (candidates ?? []).find((c) => {
      const ids = (c.participant_ids as string[]) || [];
      return ids.slice().sort().join("|") === sortedKey;
    });

    if (!match) {
      return { ok: true as const, conversation_id: null, transcript: [] as ResumedTurn[] };
    }

    // Load transcript
    const { data: msgs } = await supabaseAdmin
      .from("soul_messages")
      .select("role, content, soul_id, model_used, created_at")
      .eq("conversation_id", match.id)
      .order("created_at", { ascending: true });

    const transcript: ResumedTurn[] = (msgs ?? [])
      .map((m): ResumedTurn | null => {
        if (m.role === "king") return { role: "king", content: m.content };
        if (m.role === "soul" && m.soul_id) {
          return {
            role: "soul",
            soulId: m.soul_id,
            content: m.content,
            model: m.model_used ?? undefined,
          };
        }
        return null;
      })
      .filter((t): t is ResumedTurn => t !== null);

    return { ok: true as const, conversation_id: match.id, transcript };
  });
