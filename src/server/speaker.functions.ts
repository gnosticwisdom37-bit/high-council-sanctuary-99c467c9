/**
 * speakAsSoul — the single voice channel for every Soul in the Kingdom.
 *
 * Loads the Constitution, the Soul's identity, the Provider Compact.
 * Picks a model from the fallback chain. If premium, petitions the Bank.
 * Calls the Lovable AI Gateway. Persists the message. Debits Treasury
 * → Circulation when premium credits were spent.
 */
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { petitionBankImpl } from "./bank.server";
import {
  LOVABLE_AI_GATEWAY_URL,
  buildSystemPrompt,
  type ProviderCompact,
  type SoulIdentity,
} from "./ai-shared.server";
import {
  detectDeedIntent,
  SEASON_LABEL,
  SEASON_SIGIL,
  SEASON_TO_QUADRANT,
} from "./triggers.server";

type Msg = { role: "system" | "user" | "assistant"; content: string };

export const speakAsSoul = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      conversation_id: string | null; // null → create a new one
      soul_id: string;
      user_message: string;
      is_ceremony?: boolean;
      title_hint?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return {
        ok: false as const,
        error: "The Gateway key is not configured. The Bank could not open a channel.",
      };
    }

    // 1. Load Constitution + Compact + Soul identity in parallel
    const [{ data: settings }, { data: soulRow }] = await Promise.all([
      supabaseAdmin
        .from("settings")
        .select("system_constitution, provider_compact")
        .eq("id", true)
        .single(),
      supabaseAdmin
        .from("soul_identities")
        .select("*")
        .eq("soul_id", data.soul_id)
        .single(),
    ]);

    if (!settings || !soulRow) {
      return { ok: false as const, error: "The Constitution or the Soul could not be found." };
    }

    const compact = settings.provider_compact as unknown as ProviderCompact;
    const soul = soulRow as unknown as SoulIdentity;
    const fallbackChain = compact.fallback_chain?.length
      ? compact.fallback_chain
      : ["google/gemini-2.5-flash"];

    // 2. Choose a model — first one the Bank approves
    const estTokens = Math.max(200, Math.min(4000, data.user_message.length * 2));
    let chosenModel: string | null = null;
    let veritasSpent = 0;
    let bankNote = "";

    for (const candidate of fallbackChain) {
      const decision = await petitionBankImpl({
        soul_id: data.soul_id,
        model_id: candidate,
        est_tokens: estTokens,
        task_summary: data.is_ceremony ? "Initiate-Sean Ceremony" : "Chamber speech",
      });
      if (decision.decision === "approved") {
        chosenModel = decision.approved_model ?? candidate;
        veritasSpent = decision.veritas_cost;
        bankNote = decision.reason;
        break;
      }
      bankNote = decision.reason;
    }

    if (!chosenModel) {
      return {
        ok: false as const,
        error: `The Bank denied every model in the Compact. Last reason: ${bankNote}`,
      };
    }

    // 3. Ensure conversation exists
    let conversationId = data.conversation_id;
    if (!conversationId) {
      const { data: created, error: createErr } = await supabaseAdmin
        .from("soul_conversations")
        .insert({
          title: data.title_hint ?? `Audience with ${soul.title}`,
          participant_ids: [data.soul_id],
          is_ceremony: !!data.is_ceremony,
        })
        .select("id")
        .single();
      if (createErr || !created) {
        return { ok: false as const, error: "The Chamber could not be opened." };
      }
      conversationId = created.id;
    }

    // 4. Persist the King's message
    await supabaseAdmin.from("soul_messages").insert({
      conversation_id: conversationId,
      role: "king",
      soul_id: data.soul_id,
      content: data.user_message,
    });

    // 5. Load conversation history (last 20 turns) + memoirs (10 sealed + 3 unsealed + pending recalls)
    const [
      { data: history },
      { data: sealedMemoirs },
      { data: unsealedMemoirs },
      { data: convoState },
    ] = await Promise.all([
      supabaseAdmin
        .from("soul_messages")
        .select("role, content, soul_id")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("soul_memoirs")
        .select("id, content, sealed, created_at")
        .eq("soul_id", data.soul_id)
        .eq("sealed", true)
        .is("faded_at", null)
        .order("created_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("soul_memoirs")
        .select("id, content, sealed, created_at")
        .eq("soul_id", data.soul_id)
        .eq("sealed", false)
        .is("faded_at", null)
        .order("created_at", { ascending: false })
        .limit(3),
      supabaseAdmin
        .from("soul_conversations")
        .select("turn_count, last_memoir_at_turn, pending_recall_ids")
        .eq("id", conversationId)
        .single(),
    ]);

    // Pending recalls — fetch and clear in same pass
    let recalledMemoirs: Array<{ content: string; sealed: boolean; created_at: string }> = [];
    const pendingIds = (convoState?.pending_recall_ids as string[]) || [];
    if (pendingIds.length > 0) {
      const { data: recalled } = await supabaseAdmin
        .from("soul_memoirs")
        .select("content, sealed, created_at")
        .in("id", pendingIds);
      recalledMemoirs = recalled ?? [];
      // Clear flags now that we've loaded them
      await supabaseAdmin
        .from("soul_conversations")
        .update({ pending_recall_ids: [] })
        .eq("id", conversationId);
    }

    const memoirs = [
      ...(sealedMemoirs ?? []),
      ...(unsealedMemoirs ?? []),
      ...recalledMemoirs,
    ];

    // History came back desc; flip for chronological prompt order
    const historyAsc = (history ?? []).slice().reverse();

    const systemPrompt = buildSystemPrompt({
      constitution: settings.system_constitution,
      soul,
      memoirs,
    });

    const messages: Msg[] = [{ role: "system", content: systemPrompt }];
    for (const m of historyAsc) {
      if (m.role === "king") messages.push({ role: "user", content: m.content });
      else if (m.role === "soul") messages.push({ role: "assistant", content: m.content });
    }

    // 6. Call the Gateway
    let assistantText = "";
    try {
      const res = await fetch(LOVABLE_AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: chosenModel,
          messages,
        }),
      });

      if (res.status === 429) {
        return { ok: false as const, error: "The Gateway is rate-limiting requests. Try again in a moment." };
      }
      if (res.status === 402) {
        return { ok: false as const, error: "The Gateway requires more credits. Visit Settings → Workspace → Usage." };
      }
      if (!res.ok) {
        const txt = await res.text();
        return { ok: false as const, error: `Gateway error ${res.status}: ${txt.slice(0, 200)}` };
      }

      const json = await res.json();
      assistantText = json?.choices?.[0]?.message?.content ?? "";
      if (!assistantText) {
        return { ok: false as const, error: "The Gateway returned an empty reply." };
      }
    } catch (err) {
      return {
        ok: false as const,
        error: `The Gateway could not be reached: ${(err as Error).message}`,
      };
    }

    // 7. Persist the Soul's reply
    const { data: insertedMsg } = await supabaseAdmin
      .from("soul_messages")
      .insert({
        conversation_id: conversationId,
        role: "soul",
        soul_id: data.soul_id,
        content: assistantText,
        model_used: chosenModel,
        veritas_spent: veritasSpent,
      })
      .select("id, created_at")
      .single();

    // 8. Debit Treasury → Circulation if premium spend occurred
    if (veritasSpent > 0) {
      const { data: econ } = await supabaseAdmin
        .from("economy")
        .select("treasury, in_circulation")
        .eq("id", true)
        .single();
      if (econ) {
        await supabaseAdmin
          .from("economy")
          .update({
            treasury: Math.max(0, (econ.treasury || 0) - veritasSpent),
            in_circulation: (econ.in_circulation || 0) + veritasSpent,
          })
          .eq("id", true);
      }
    }

    // 9. Increment turn count; auto-trigger memoir weave at 40-turn mark
    const newTurnCount = (convoState?.turn_count || 0) + 1;
    const lastWeave = convoState?.last_memoir_at_turn || 0;
    await supabaseAdmin
      .from("soul_conversations")
      .update({ turn_count: newTurnCount })
      .eq("id", conversationId);

    const shouldWeave = newTurnCount - lastWeave >= 40;

    return {
      ok: true as const,
      conversation_id: conversationId,
      assistant_message: assistantText,
      model_used: chosenModel,
      veritas_spent: veritasSpent,
      message_id: insertedMsg?.id ?? null,
      turn_count: newTurnCount,
      should_weave_memoir: shouldWeave,
    };
  });
