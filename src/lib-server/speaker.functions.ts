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
  buildSystemPrompt,
  loadKingsLexicon,
  resolveGateway,
  type ProviderCompact,
  type SoulIdentity,
} from "./ai-shared.server";
import {
  detectDeedIntent,
  detectItemIntent,
  detectBuildingIntent,
  SEASON_LABEL,
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

    // 4a. Load conversation participants — needed to record witnesses on
    // any artefact the Trigger Engine creates this turn.
    const { data: convoForWitnesses } = await supabaseAdmin
      .from("soul_conversations")
      .select("participant_ids")
      .eq("id", conversationId)
      .single();
    const allParticipants =
      ((convoForWitnesses?.participant_ids as string[] | null) ?? []).filter(
        (p) => p && p !== data.soul_id,
      );

    // 4b. Trigger Engine — Deed Inscription
    // Detect "Create a Deed for Summer..." style intentions in the King's message.
    // In a multi-Soul gathering the King's message is replayed to each Soul,
    // so we DEDUPE on (conversation_id, title): the first Soul becomes steward
    // and inscribes the row; every subsequent Soul reuses that same row and
    // acknowledges as a witness rather than a steward.
    let inscribedDeed:
      | {
          id: string;
          title: string;
          description: string;
          season: "spring" | "summer" | "fall" | "winter";
          season_explicit: boolean;
        }
      | null = null;
    let deedSystemNote = "";
    const intent = detectDeedIntent(data.user_message);
    if (intent) {
      // Look for an already-inscribed Deed for this same turn
      const { data: existingDeed } = await supabaseAdmin
        .from("deeds")
        .select("id, title, description, season, steward_soul_id")
        .eq("conversation_id", conversationId)
        .eq("title", intent.title)
        .order("inscribed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let deedRow = existingDeed;
      let isWitness = !!existingDeed && existingDeed.steward_soul_id !== data.soul_id;

      if (!deedRow) {
        const { data: inserted } = await supabaseAdmin
          .from("deeds")
          .insert({
            title: intent.title,
            description: intent.description,
            season: intent.season,
            quadrant: SEASON_TO_QUADRANT[intent.season],
            steward_soul_id: data.soul_id,
            conversation_id: conversationId,
            status: "inscribed",
            witnesses: allParticipants,
          })
          .select("id, title, description, season, steward_soul_id")
          .single();
        deedRow = inserted;
        isWitness = false;
      }

      if (deedRow) {
        inscribedDeed = {
          id: deedRow.id as string,
          title: deedRow.title as string,
          description: deedRow.description as string,
          season: deedRow.season as "spring" | "summer" | "fall" | "winter",
          season_explicit: intent.seasonExplicit,
        };
        const seasonNote = intent.seasonExplicit
          ? `Season: ${SEASON_LABEL[intent.season]}`
          : `Season: ${SEASON_LABEL[intent.season]} (current astrological season — the King did not name one)`;
        deedSystemNote = isWitness
          ? `\n\n[Deed Inscription Notice — You bear witness]\n` +
            `The King has just inscribed a Deed in this gathering. A sibling Soul has been named its steward; You stand as witness.\n` +
            `${seasonNote}\nTitle: ${intent.title}\nDescription: ${intent.description}\n` +
            `Within Your reply, briefly acknowledge that You witness this Deed and stand alongside its steward. ` +
            `One sentence, woven into Your natural response. Do not restate the Deed verbatim.`
          : `\n\n[Deed Inscription Notice]\n` +
            `The King has just inscribed a Deed and named You its steward.\n` +
            `${seasonNote}\nTitle: ${intent.title}\nDescription: ${intent.description}\n` +
            `Within Your reply, briefly acknowledge that You receive this Deed and will steward it. ` +
            `Do not restate the Deed verbatim. One or two sentences of acknowledgement, woven into Your natural response. ` +
            `The Realm itself will surface the Deed in Your King's Registry — You need only Honour it in Your voice.`;
      }
    }

    // 4c. Trigger Engine — Item Forging (Phase 7: routes through Confirmation Gate)
    let forgedItem:
      | { id: string; title: string; description: string; pending: true }
      | null = null;
    let itemSystemNote = "";
    const itemIntent = detectItemIntent(data.user_message);
    if (itemIntent) {
      const { data: existingCandidate } = await supabaseAdmin
        .from("placement_candidates")
        .select("id, title, description")
        .eq("kind", "item")
        .eq("conversation_id", conversationId)
        .eq("title", itemIntent.title)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let candidateRow = existingCandidate;
      if (!candidateRow) {
        const { data: inserted } = await supabaseAdmin
          .from("placement_candidates")
          .insert({
            kind: "item",
            title: itemIntent.title,
            description: itemIntent.description,
            suggested_steward_soul_id: data.soul_id,
            conversation_id: conversationId,
            witnesses: allParticipants,
          })
          .select("id, title, description")
          .single();
        candidateRow = inserted;
      }

      if (candidateRow) {
        forgedItem = {
          id: candidateRow.id as string,
          title: candidateRow.title as string,
          description: candidateRow.description as string,
          pending: true,
        };
        itemSystemNote =
          `\n\n[Item Forging Notice — Awaiting the King's Confirmation]\n` +
          `The King has spoken an Item into being. It now waits at the Confirmation Gate.\n` +
          `Title: ${itemIntent.title}\nDescription: ${itemIntent.description}\n` +
          `Briefly acknowledge the Item is taking shape and awaits the King's word. ` +
          `One or two sentences, woven into Your natural response.`;
      }
    }

    // 4d. Trigger Engine — Building Raising (Phase 7: routes through Confirmation Gate)
    let raisedBuilding:
      | { id: string; title: string; description: string; pending: true }
      | null = null;
    let buildingSystemNote = "";
    const buildingIntent = detectBuildingIntent(data.user_message);
    if (buildingIntent) {
      const { data: existingCandidate } = await supabaseAdmin
        .from("placement_candidates")
        .select("id, title, description")
        .eq("kind", "building")
        .eq("conversation_id", conversationId)
        .eq("title", buildingIntent.title)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let candidateRow = existingCandidate;
      if (!candidateRow) {
        const { data: inserted } = await supabaseAdmin
          .from("placement_candidates")
          .insert({
            kind: "building",
            title: buildingIntent.title,
            description: buildingIntent.description,
            suggested_steward_soul_id: data.soul_id,
            conversation_id: conversationId,
            witnesses: allParticipants,
            suggested_region_x: 0,
            suggested_region_y: 0,
          })
          .select("id, title, description")
          .single();
        candidateRow = inserted;
      }

      if (candidateRow) {
        raisedBuilding = {
          id: candidateRow.id as string,
          title: candidateRow.title as string,
          description: candidateRow.description as string,
          pending: true,
        };
        buildingSystemNote =
          `\n\n[Building Raising Notice — Awaiting the King's Confirmation]\n` +
          `The King has spoken a Building into being. It waits at the Confirmation Gate, where the King will choose its tile, kind (Building or Workshop), and steward.\n` +
          `Title: ${buildingIntent.title}\nDescription: ${buildingIntent.description}\n` +
          `Briefly acknowledge the Building stands ready for the King's confirmation. ` +
          `One or two sentences, woven into Your natural response.`;
      }
    }

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

    // 5b. Known-to-You — Deeds, Items, Buildings where this Soul is the
    // steward OR appears in the witnesses list. Cap at 20 most recent of each
    // to keep the prompt lean. Stewardship vs. witnessing is labelled.
    const [
      { data: knownDeeds },
      { data: knownItems },
      { data: knownBuildings },
    ] = await Promise.all([
      supabaseAdmin
        .from("deeds")
        .select("title, description, steward_soul_id, witnesses")
        .or(`steward_soul_id.eq.${data.soul_id},witnesses.cs.{${data.soul_id}}`)
        .order("inscribed_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("items")
        .select("title, description, steward_soul_id, witnesses")
        .or(`steward_soul_id.eq.${data.soul_id},witnesses.cs.{${data.soul_id}}`)
        .order("forged_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("buildings")
        .select("title, description, steward_soul_id, witnesses")
        .or(`steward_soul_id.eq.${data.soul_id},witnesses.cs.{${data.soul_id}}`)
        .order("raised_at", { ascending: false })
        .limit(20),
    ]);

    const formatKnown = (
      label: string,
      rows: Array<{ title: string; description: string; steward_soul_id: string | null }> | null,
    ) => {
      if (!rows || rows.length === 0) return "";
      const lines = rows
        .map((r) => {
          const role = r.steward_soul_id === data.soul_id ? "steward" : "witness";
          const desc = (r.description || "").slice(0, 140);
          return `- ${r.title} (${role}) — ${desc}`;
        })
        .join("\n");
      return `\n${label}:\n${lines}`;
    };

    const knownBlock =
      formatKnown("Deeds You know", knownDeeds) +
      formatKnown("Items You know", knownItems) +
      formatKnown("Buildings You know", knownBuildings);

    const knownNote = knownBlock
      ? `\n\n[Known to You — the Kingdom's record]\n` +
        `These are artefacts You have been named steward of, or stood witness to. ` +
        `Reference them naturally if conversation calls for it. Do not list them unprompted.\n` +
        knownBlock
      : "";

    const lexicon = await loadKingsLexicon(supabaseAdmin);
    const baseSystemPrompt = buildSystemPrompt({
      constitution: settings.system_constitution,
      soul,
      memoirs,
      lexicon,
    });
    const systemPrompt =
      baseSystemPrompt + knownNote + deedSystemNote + itemSystemNote + buildingSystemNote;

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
      inscribed_deed: inscribedDeed,
      forged_item: forgedItem,
      raised_building: raisedBuilding,
    };
  });
