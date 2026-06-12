/**
 * Bank logic as a plain server-side helper — callable from other server functions.
 * The createServerFn wrapper lives in bank.functions.ts and just delegates here.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type BankDecision = {
  decision: "approved" | "denied";
  reason: string;
  approved_model?: string;
  fallback_model?: string;
  veritas_cost: number;
};

export async function petitionBankImpl(data: {
  soul_id: string;
  model_id: string;
  est_tokens: number;
  task_summary: string;
}): Promise<BankDecision> {
  const { soul_id, model_id, est_tokens, task_summary } = data;

  // 0. Free default short-circuit — the baseline voice. No ledger row, no debit.
  const { data: settingsForDefault } = await supabaseAdmin
    .from("settings")
    .select("default_model_id")
    .eq("id", true)
    .single();
  const defaultModelId = settingsForDefault?.default_model_id ?? "venice-uncensored-1-2";
  if (model_id === defaultModelId) {
    return {
      decision: "approved",
      reason: "Free default voice — no decision to log.",
      approved_model: model_id,
      veritas_cost: 0,
    };
  }

  const { data: model, error: modelErr } = await supabaseAdmin
    .from("toolbox_models")
    .select("tier, venice_tier, auto_fallback_enabled, active, king_enabled, veritas_cost_per_1k_tokens, model_id")
    .eq("model_id", model_id)
    .maybeSingle();


  if (modelErr || !model) {
    const reason = `Unknown model: ${model_id}`;
    await writeLedger({ soul_id, model_id, veritas_cost: 0, decision: "denied", reason, task_summary, fallback_used: null });
    return { decision: "denied", reason, veritas_cost: 0, fallback_model: await firstFreeFallback() };
  }

  // King's curation gate — if the King has not enabled this model, refuse.
  if (!model.king_enabled) {
    const reason = `Model ${model_id} is not enabled by the King.`;
    const fallback = await firstFreeFallback();
    await writeLedger({ soul_id, model_id, veritas_cost: 0, decision: "denied", reason, task_summary, fallback_used: fallback });
    return { decision: "denied", reason, veritas_cost: 0, fallback_model: fallback };
  }


  if (!model.active || !model.auto_fallback_enabled || !["pro", "free"].includes(model.venice_tier ?? "paid")) {
    const reason = `Model ${model_id} is not approved for automatic fallback.`;
    const fallback = await firstFreeFallback();
    await writeLedger({ soul_id, model_id, veritas_cost: 0, decision: "denied", reason, task_summary, fallback_used: fallback });
    return { decision: "denied", reason, veritas_cost: 0, fallback_model: fallback };
  }

  if (model.venice_tier === "pro" || model.venice_tier === "free") {
    await writeLedger({
      soul_id,
      model_id,
      veritas_cost: 0,
      decision: "approved",
      reason: `Venice ${model.venice_tier === "pro" ? "Pro" : "Free"} model — no paid-credit debit required.`,
      task_summary,
      fallback_used: null,
    });
    return {
      decision: "approved",
      reason: `Venice ${model.venice_tier === "pro" ? "Pro" : "Free"} — passes the Bank without debit.`,
      approved_model: model_id,
      veritas_cost: 0,
    };
  }

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
}

async function firstFreeFallback(): Promise<string> {
  // Always prefer the configured free default model.
  const { data: s } = await supabaseAdmin
    .from("settings")
    .select("default_model_id")
    .eq("id", true)
    .single();
  if (s?.default_model_id) return s.default_model_id;
  return "venice-uncensored-1-2";
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
