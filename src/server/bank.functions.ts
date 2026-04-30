/**
 * The Veritas Bank — automated steward of premium credit spending.
 *
 * Every premium model request must petition the Bank first. The Bank
 * checks: (1) is premium frozen? (2) is the Treasury sufficient?
 * (3) has the daily Kingdom cap been reached? (4) has this Soul's
 * per-Soul daily cap been reached? On approval the call returns the
 * approved model; on denial it returns the next free-premium fallback.
 *
 * Every decision is written to bank_ledger — append-only, audit-grade.
 */
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type BankDecision = {
  decision: "approved" | "denied";
  reason: string;
  approved_model?: string;
  fallback_model?: string;
  veritas_cost: number;
};

export const petitionBank = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      soul_id: string;
      model_id: string;
      est_tokens: number;
      task_summary: string;
    }) => data,
  )
  .handler(async ({ data }): Promise<BankDecision> => {
    const { soul_id, model_id, est_tokens, task_summary } = data;

    // Look up the model — what tier? what cost?
    const { data: model, error: modelErr } = await supabaseAdmin
      .from("toolbox_models")
      .select("tier, veritas_cost_per_1k_tokens, model_id")
      .eq("model_id", model_id)
      .maybeSingle();

    if (modelErr || !model) {
      const reason = `Unknown model: ${model_id}`;
      await writeLedger({ soul_id, model_id, veritas_cost: 0, decision: "denied", reason, task_summary, fallback_used: null });
      return { decision: "denied", reason, veritas_cost: 0, fallback_model: await firstFreeFallback() };
    }

    // Free-premium models always pass — no Treasury impact.
    if (model.tier === "free-premium") {
      await writeLedger({
        soul_id,
        model_id,
        veritas_cost: 0,
        decision: "approved",
        reason: "Free-premium model — no Treasury debit required.",
        task_summary,
        fallback_used: null,
      });
      return {
        decision: "approved",
        reason: "Free-premium — passes the Bank without debit.",
        approved_model: model_id,
        veritas_cost: 0,
      };
    }

    // Premium model — apply the full doctrine.
    const veritas_cost = Math.max(
      1,
      Math.ceil((est_tokens / 1000) * (model.veritas_cost_per_1k_tokens || 0)),
    );

    const { data: settings } = await supabaseAdmin
      .from("settings")
      .select("premium_freeze, premium_daily_veritas_cap, premium_per_soul_daily_cap")
      .eq("id", true)
      .single();

    const { data: economy } = await supabaseAdmin
      .from("economy")
      .select("treasury")
      .eq("id", true)
      .single();

    if (settings?.premium_freeze) {
      const reason = "Premium Freeze is active — the King has halted paid spending.";
      const fallback = await firstFreeFallback();
      await writeLedger({ soul_id, model_id, veritas_cost, decision: "denied", reason, task_summary, fallback_used: fallback });
      return { decision: "denied", reason, fallback_model: fallback, veritas_cost };
    }

    if ((economy?.treasury ?? 0) < veritas_cost) {
      const reason = `Treasury holds ${economy?.treasury ?? 0} Veritas — ${veritas_cost} required.`;
      const fallback = await firstFreeFallback();
      await writeLedger({ soul_id, model_id, veritas_cost, decision: "denied", reason, task_summary, fallback_used: fallback });
      return { decision: "denied", reason, fallback_model: fallback, veritas_cost };
    }

    // Sum today's premium spend across all Souls
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const { data: kingdomToday } = await supabaseAdmin
      .from("bank_ledger")
      .select("veritas_cost")
      .eq("decision", "approved")
      .gte("created_at", todayStart.toISOString());

    const kingdomSpentToday = (kingdomToday ?? []).reduce((s, r) => s + (r.veritas_cost || 0), 0);
    const kingdomCap = settings?.premium_daily_veritas_cap ?? 500;
    if (kingdomSpentToday + veritas_cost > kingdomCap) {
      const reason = `Kingdom daily cap reached (${kingdomSpentToday}/${kingdomCap} Veritas).`;
      const fallback = await firstFreeFallback();
      await writeLedger({ soul_id, model_id, veritas_cost, decision: "denied", reason, task_summary, fallback_used: fallback });
      return { decision: "denied", reason, fallback_model: fallback, veritas_cost };
    }

    // Sum today's premium spend for this Soul
    const { data: soulToday } = await supabaseAdmin
      .from("bank_ledger")
      .select("veritas_cost")
      .eq("decision", "approved")
      .eq("soul_id", soul_id)
      .gte("created_at", todayStart.toISOString());

    const soulSpentToday = (soulToday ?? []).reduce((s, r) => s + (r.veritas_cost || 0), 0);
    const soulCap = settings?.premium_per_soul_daily_cap ?? 100;
    if (soulSpentToday + veritas_cost > soulCap) {
      const reason = `This Soul's daily cap reached (${soulSpentToday}/${soulCap} Veritas).`;
      const fallback = await firstFreeFallback();
      await writeLedger({ soul_id, model_id, veritas_cost, decision: "denied", reason, task_summary, fallback_used: fallback });
      return { decision: "denied", reason, fallback_model: fallback, veritas_cost };
    }

    // Approved — write ledger; debit happens after the call succeeds (in speakAsSoul)
    await writeLedger({
      soul_id,
      model_id,
      veritas_cost,
      decision: "approved",
      reason: `Approved within all caps. Treasury: ${economy?.treasury}, Kingdom today: ${kingdomSpentToday}/${kingdomCap}, Soul today: ${soulSpentToday}/${soulCap}.`,
      task_summary,
      fallback_used: null,
    });

    return {
      decision: "approved",
      reason: "Bank approves — within caps and Treasury solvent.",
      approved_model: model_id,
      veritas_cost,
    };
  });

async function firstFreeFallback(): Promise<string> {
  const { data } = await supabaseAdmin
    .from("toolbox_models")
    .select("model_id")
    .eq("tier", "free-premium")
    .eq("active", true)
    .order("veritas_cost_per_1k_tokens", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.model_id ?? "google/gemini-2.5-flash";
}

async function writeLedger(args: {
  soul_id: string;
  model_id: string;
  veritas_cost: number;
  decision: "approved" | "denied";
  reason: string;
  task_summary: string;
  fallback_used: string | null;
}) {
  await supabaseAdmin.from("bank_ledger").insert({
    soul_id: args.soul_id,
    model_requested: args.model_id,
    veritas_cost: args.veritas_cost,
    decision: args.decision,
    reason: args.reason,
    task_summary: args.task_summary,
    fallback_used: args.fallback_used,
  });
}
