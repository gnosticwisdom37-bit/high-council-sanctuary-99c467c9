/**
 * Universal Rolodex — Phase 9.
 *
 * Reuses the `contacts` table with three extra columns:
 *   - status ∈ ('pending','confirmed','declined')
 *   - mentioned_by_soul (text, the Soul who proposed the entry)
 *   - mention_context   (text, why the Soul thought You'd want to remember them)
 *   - relationship      (text, optional shorthand)
 *
 * Doctrine: auto-add with King review. Souls propose pending entries when the
 * King speaks "remember/track/note <Name>: <context>". The King reviews them
 * in the Rolodex panel and confirms, edits, or declines.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type RolodexRow = {
  id: string;
  display_name: string;
  email: string | null;
  organization: string;
  role_title: string;
  relationship: string;
  notes: string;
  status: "pending" | "confirmed" | "declined";
  mentioned_by_soul: string | null;
  mention_context: string;
  created_at: string;
};

// ─── Read ────────────────────────────────────────────────────────────────
export const listRolodex = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select(
      "id, display_name, email, organization, role_title, relationship, notes, status, mentioned_by_soul, mention_context, created_at",
    )
    .order("status")
    .order("created_at", { ascending: false });
  if (error) return { ok: false as const, error: error.message };
  const rows = (data ?? []) as RolodexRow[];
  return {
    ok: true as const,
    pending: rows.filter((r) => r.status === "pending"),
    confirmed: rows.filter((r) => r.status === "confirmed"),
    declined: rows.filter((r) => r.status === "declined"),
  };
});

// ─── Propose (Soul-spoken, pending) ──────────────────────────────────────
const ProposeSchema = z.object({
  name: z.string().trim().min(1).max(255),
  context: z.string().trim().min(1).max(1000),
  mentioned_by_soul: z.string().trim().min(1).max(64),
});

export const proposeContactImpl = async (data: z.infer<typeof ProposeSchema>) => {
  const parsed = ProposeSchema.parse(data);
  // Rate-limit per Soul per day: 20 pending entries.
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const { count } = await supabaseAdmin
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("mentioned_by_soul", parsed.mentioned_by_soul)
    .eq("status", "pending")
    .gte("created_at", todayStart.toISOString());
  if ((count ?? 0) >= 20) {
    return { ok: false as const, error: "Daily propose limit reached for this Soul." };
  }

  // De-dupe: same name + same proposer + still pending → skip.
  const { data: dup } = await supabaseAdmin
    .from("contacts")
    .select("id")
    .eq("display_name", parsed.name)
    .eq("mentioned_by_soul", parsed.mentioned_by_soul)
    .eq("status", "pending")
    .maybeSingle();
  if (dup) return { ok: true as const, id: dup.id, deduped: true };

  const { data: ins, error } = await supabaseAdmin
    .from("contacts")
    .insert({
      display_name: parsed.name,
      email: null,
      mention_context: parsed.context,
      mentioned_by_soul: parsed.mentioned_by_soul,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, id: ins.id, deduped: false };
};

export const proposeContact = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof ProposeSchema>) => ProposeSchema.parse(d))
  .handler(async ({ data }) => proposeContactImpl(data));

// ─── Confirm / Decline / Edit ────────────────────────────────────────────
const ConfirmSchema = z.object({
  id: z.string().uuid(),
  edits: z
    .object({
      display_name: z.string().trim().min(1).max(255).optional(),
      email: z.string().trim().max(320).optional().nullable(),
      organization: z.string().max(255).optional(),
      role_title: z.string().max(255).optional(),
      relationship: z.string().max(255).optional(),
      notes: z.string().max(4000).optional(),
    })
    .optional(),
});

export const confirmContact = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof ConfirmSchema>) => ConfirmSchema.parse(d))
  .handler(async ({ data }) => {
    const patch: Record<string, unknown> = { status: "confirmed" };
    if (data.edits) {
      for (const [k, v] of Object.entries(data.edits)) {
        if (v !== undefined) patch[k] = v;
      }
    }
    const { error } = await supabaseAdmin.from("contacts").update(patch).eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const declineContact = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("contacts")
      .update({ status: "declined" })
      .eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// ─── Lookup (used by Souls when the King names someone) ──────────────────
export const lookupRolodex = createServerFn({ method: "POST" })
  .inputValidator((d: { query: string }) =>
    z.object({ query: z.string().trim().min(1).max(255) }).parse(d),
  )
  .handler(async ({ data }) => {
    const q = data.query.toLowerCase();
    const { data: rows, error } = await supabaseAdmin
      .from("contacts")
      .select("display_name, role_title, organization, relationship, notes")
      .eq("status", "confirmed")
      .or(
        `display_name.ilike.%${q}%,role_title.ilike.%${q}%,organization.ilike.%${q}%,notes.ilike.%${q}%`,
      )
      .limit(10);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, matches: rows ?? [] };
  });
