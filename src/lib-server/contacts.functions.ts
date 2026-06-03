/**
 * Kingdom Address Book — contacts & groups.
 * Wave 2: native, Sovereign, provider-agnostic. Survives any swap.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const EmailSchema = z
  .string()
  .trim()
  .min(3)
  .max(320)
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Not a valid email");

export type ContactRow = {
  id: string;
  display_name: string;
  email: string;
  organization: string;
  role_title: string;
  phone: string;
  address: string;
  notes: string;
  tags: string[];
};

export type GroupRow = {
  id: string;
  name: string;
  description: string;
  member_ids: string[];
  member_count: number;
};

// ─── Read ────────────────────────────────────────────────────────────────
export const listAddressBook = createServerFn({ method: "GET" }).handler(async () => {
  const [contactsRes, groupsRes, membersRes] = await Promise.all([
    supabaseAdmin.from("contacts").select("*").order("display_name"),
    supabaseAdmin.from("contact_groups").select("*").order("name"),
    supabaseAdmin.from("contact_group_members").select("group_id, contact_id"),
  ]);
  if (contactsRes.error) return { ok: false as const, error: contactsRes.error.message };
  if (groupsRes.error) return { ok: false as const, error: groupsRes.error.message };
  if (membersRes.error) return { ok: false as const, error: membersRes.error.message };

  const membersByGroup = new Map<string, string[]>();
  for (const m of membersRes.data ?? []) {
    const arr = membersByGroup.get(m.group_id) ?? [];
    arr.push(m.contact_id);
    membersByGroup.set(m.group_id, arr);
  }

  const contacts: ContactRow[] = (contactsRes.data ?? []).map((c) => ({
    id: c.id,
    display_name: c.display_name,
    email: c.email,
    organization: c.organization ?? "",
    role_title: c.role_title ?? "",
    phone: c.phone ?? "",
    address: c.address ?? "",
    notes: c.notes ?? "",
    tags: c.tags ?? [],
  }));

  const groups: GroupRow[] = (groupsRes.data ?? []).map((g) => {
    const ids = membersByGroup.get(g.id) ?? [];
    return {
      id: g.id,
      name: g.name,
      description: g.description ?? "",
      member_ids: ids,
      member_count: ids.length,
    };
  });

  return { ok: true as const, contacts, groups };
});

// ─── Contacts ────────────────────────────────────────────────────────────
const UpsertContactSchema = z.object({
  id: z.string().uuid().optional(),
  display_name: z.string().trim().min(1).max(255),
  email: EmailSchema,
  organization: z.string().max(255).optional(),
  role_title: z.string().max(255).optional(),
  phone: z.string().max(64).optional(),
  address: z.string().max(1024).optional(),
  notes: z.string().max(4000).optional(),
  tags: z.array(z.string().min(1).max(64)).max(20).optional(),
});

export const upsertContact = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof UpsertContactSchema>) => UpsertContactSchema.parse(d))
  .handler(async ({ data }) => {
    const row = {
      display_name: data.display_name,
      email: data.email.toLowerCase(),
      organization: data.organization ?? "",
      role_title: data.role_title ?? "",
      phone: data.phone ?? "",
      address: data.address ?? "",
      notes: data.notes ?? "",
      tags: data.tags ?? [],
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("contacts").update(row).eq("id", data.id);
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const, id: data.id };
    }
    const { data: ins, error } = await supabaseAdmin
      .from("contacts")
      .upsert(row, { onConflict: "email" })
      .select("id")
      .single();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, id: ins.id };
  });

export const deleteContact = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("contacts").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// ─── Groups ──────────────────────────────────────────────────────────────
const UpsertGroupSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  description: z.string().max(1000).optional(),
  member_ids: z.array(z.string().uuid()).max(2000).optional(),
});

export const upsertGroup = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof UpsertGroupSchema>) => UpsertGroupSchema.parse(d))
  .handler(async ({ data }) => {
    let groupId = data.id;
    if (groupId) {
      const { error } = await supabaseAdmin
        .from("contact_groups")
        .update({ name: data.name, description: data.description ?? "" })
        .eq("id", groupId);
      if (error) return { ok: false as const, error: error.message };
    } else {
      const { data: ins, error } = await supabaseAdmin
        .from("contact_groups")
        .upsert(
          { name: data.name, description: data.description ?? "" },
          { onConflict: "name" },
        )
        .select("id")
        .single();
      if (error) return { ok: false as const, error: error.message };
      groupId = ins.id;
    }

    if (data.member_ids) {
      // Replace membership set.
      const { error: delErr } = await supabaseAdmin
        .from("contact_group_members")
        .delete()
        .eq("group_id", groupId);
      if (delErr) return { ok: false as const, error: delErr.message };
      if (data.member_ids.length > 0) {
        const rows = data.member_ids.map((cid) => ({ group_id: groupId!, contact_id: cid }));
        const { error: insErr } = await supabaseAdmin
          .from("contact_group_members")
          .insert(rows);
        if (insErr) return { ok: false as const, error: insErr.message };
      }
    }
    return { ok: true as const, id: groupId };
  });

export const deleteGroup = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("contact_groups").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// ─── Expand recipient tokens ─────────────────────────────────────────────
// Replaces "group:Name" tokens with comma-separated emails for that group.
// Untouched tokens pass through unchanged.
export const expandRecipients = createServerFn({ method: "POST" })
  .inputValidator((d: { text: string }) =>
    z.object({ text: z.string().max(8000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const text = data.text;
    if (!text.trim()) return { ok: true as const, text: "" };

    // Tokens are split by comma OR newline; keep order, drop dupes (case-insensitive on emails).
    const rawTokens = text
      .split(/[,\n]/)
      .map((t) => t.trim())
      .filter(Boolean);

    const groupTokens = rawTokens.filter((t) => /^group:/i.test(t));
    const groupNames = Array.from(
      new Set(groupTokens.map((t) => t.replace(/^group:/i, "").trim()).filter(Boolean)),
    );

    const emailsByGroup = new Map<string, string[]>();
    if (groupNames.length > 0) {
      const { data: groups, error: gErr } = await supabaseAdmin
        .from("contact_groups")
        .select("id, name")
        .in("name", groupNames);
      if (gErr) return { ok: false as const, error: gErr.message };

      const groupIds = (groups ?? []).map((g) => g.id);
      if (groupIds.length > 0) {
        const { data: members, error: mErr } = await supabaseAdmin
          .from("contact_group_members")
          .select("group_id, contact:contacts(email, display_name)")
          .in("group_id", groupIds);
        if (mErr) return { ok: false as const, error: mErr.message };

        const nameById = new Map((groups ?? []).map((g) => [g.id, g.name as string]));
        for (const m of members ?? []) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const c: any = m.contact;
          if (!c?.email) continue;
          const gName = nameById.get(m.group_id);
          if (!gName) continue;
          const arr = emailsByGroup.get(gName.toLowerCase()) ?? [];
          arr.push(c.display_name ? `${c.display_name} <${c.email}>` : c.email);
          emailsByGroup.set(gName.toLowerCase(), arr);
        }
      }
    }

    const seen = new Set<string>();
    const out: string[] = [];
    for (const tok of rawTokens) {
      if (/^group:/i.test(tok)) {
        const name = tok.replace(/^group:/i, "").trim().toLowerCase();
        const emails = emailsByGroup.get(name) ?? [];
        for (const e of emails) {
          const key = e.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(e);
        }
      } else {
        const key = tok.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(tok);
      }
    }
    return { ok: true as const, text: out.join(", ") };
  });
