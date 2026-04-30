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

    // 5. Load conversation history (last 20 turns)
    const { data: history } = await supabaseAdmin
      .from("soul_messages")
      .select("role, content, soul_id")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    const systemPrompt = buildSystemPrompt({
      constitution: settings.system_constitution,
      soul,
    });

    const messages: Msg[] = [{ role: "system", content: systemPrompt }];
    for (const m of history ?? []) {
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

    return {
      ok: true as const,
      conversation_id: conversationId,
      assistant_message: assistantText,
      model_used: chosenModel,
      veritas_spent: veritasSpent,
      message_id: insertedMsg?.id ?? null,
    };
  });
