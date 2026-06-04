/**
 * The Sacred Inbox — Phase 10.3.
 *
 * Gmail integration through Lovable's connector gateway. The King's one
 * inbox is surfaced inside each Workshop's Scriptorium; the Workshop's
 * Steward (or any chosen Editor Soul) drafts replies in their own voice,
 * wrapped in the Kingdom's stationery and sealed with King Sean's
 * red thumbprint.
 *
 * One Key, Many Souls — same Lovable AI Gateway voices the Curator and
 * Editor; same Gmail connection serves all Workshops.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  LOVABLE_AI_GATEWAY_URL,
  buildSystemPrompt,
  loadKingsLexicon,
  type ProviderCompact,
  type SoulIdentity,
} from "./ai-shared.server";

const GMAIL_GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

// ─── small Gmail helpers ──────────────────────────────────────────────────
function gmailHeaders() {
  const lov = process.env.LOVABLE_API_KEY;
  const gm = process.env.GOOGLE_MAIL_API_KEY;
  if (!lov || !gm) return null;
  return {
    Authorization: `Bearer ${lov}`,
    "X-Connection-Api-Key": gm,
    "Content-Type": "application/json",
  } as Record<string, string>;
}

// Fetch the connected Gmail address (cached per-request via module scope)
let _kingAddress: string | null = null;
async function getKingAddress(headers: Record<string, string>): Promise<string | null> {
  if (_kingAddress) return _kingAddress;
  try {
    const r = await fetch(`${GMAIL_GATEWAY}/users/me/profile`, { headers });
    if (!r.ok) return null;
    const j = (await r.json()) as { emailAddress?: string };
    _kingAddress = j.emailAddress ?? null;
    return _kingAddress;
  } catch {
    return null;
  }
}

// Encode a UTF-8 string as wrapped base64 (76-char lines per RFC 2045)
function base64BodyWrapped(body: string): string {
  const bytes = new TextEncoder().encode(body);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = btoa(bin);
  return b64.match(/.{1,76}/g)!.join("\r\n");
}

// MIME-encode a header value containing non-ASCII (RFC 2047 "Q"/"B")
function encodeHeader(value: string): string {
  if (/^[\x20-\x7e]*$/.test(value)) return value;
  const bytes = new TextEncoder().encode(value);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return `=?UTF-8?B?${btoa(bin)}?=`;
}

// Build a fully-encoded RFC 2822 message. If `attachments` are provided,
// the message is multipart/mixed (HTML body + each attachment); otherwise
// a simple text/html body is sent.
type OutgoingAttachment = {
  filename: string;
  mime_type: string;
  data_base64: string; // raw base64 (no data: prefix)
};

function buildRfc2822(args: {
  from?: string | null;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  htmlBody: string;
  inReplyTo?: string;
  references?: string;
  attachments?: OutgoingAttachment[];
}): string {
  const head: string[] = [];
  if (args.from) head.push(`From: ${args.from}`);
  head.push(`To: ${args.to}`);
  if (args.cc?.trim()) head.push(`Cc: ${args.cc}`);
  if (args.bcc?.trim()) head.push(`Bcc: ${args.bcc}`);
  head.push(`Subject: ${encodeHeader(args.subject)}`);
  head.push("MIME-Version: 1.0");
  if (args.inReplyTo) head.push(`In-Reply-To: ${args.inReplyTo}`);
  if (args.references) head.push(`References: ${args.references}`);

  const atts = args.attachments ?? [];
  if (atts.length === 0) {
    head.push('Content-Type: text/html; charset="UTF-8"');
    head.push("Content-Transfer-Encoding: base64");
    head.push("");
    head.push(base64BodyWrapped(args.htmlBody));
    return head.join("\r\n");
  }

  const boundary = `=_VIS_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  head.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  head.push("");
  head.push("This is a multi-part message in MIME format.");

  const parts: string[] = [];
  parts.push(
    [
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      base64BodyWrapped(args.htmlBody),
    ].join("\r\n"),
  );
  for (const a of atts) {
    const safeName = encodeHeader(a.filename || "attachment");
    const wrapped = a.data_base64.replace(/\s+/g, "").match(/.{1,76}/g)?.join("\r\n") ?? "";
    parts.push(
      [
        `--${boundary}`,
        `Content-Type: ${a.mime_type || "application/octet-stream"}; name="${safeName}"`,
        `Content-Disposition: attachment; filename="${safeName}"`,
        "Content-Transfer-Encoding: base64",
        "",
        wrapped,
      ].join("\r\n"),
    );
  }
  parts.push(`--${boundary}--`);
  return head.join("\r\n") + "\r\n" + parts.join("\r\n");
}

async function sendGmailRaw(
  headers: Record<string, string>,
  rfc2822: string,
  threadId?: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const raw = b64urlEncode(rfc2822);
  const body: Record<string, unknown> = { raw };
  if (threadId) body.threadId = threadId;
  const res = await fetch(`${GMAIL_GATEWAY}/users/me/messages/send`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text();
    return { ok: false, error: `Send failed [${res.status}]: ${errBody.slice(0, 240)}` };
  }
  const sent = (await res.json()) as { id: string };
  return { ok: true, id: sent.id };
}

// Zod schema for outgoing attachments (≤10 MB raw bytes / file, ≤5 files)
const outgoingAttachmentSchema = z.object({
  filename: z.string().min(1).max(255),
  mime_type: z.string().min(1).max(200),
  data_base64: z.string().min(1).max(14_000_000),
});
const outgoingAttachmentsSchema = z.array(outgoingAttachmentSchema).max(5).optional();

function b64urlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  try {
    return atob(b64);
  } catch {
    return "";
  }
}

function b64urlEncode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

type GmailPart = {
  partId?: string;
  mimeType?: string;
  filename?: string;
  body?: { data?: string; size?: number; attachmentId?: string };
  parts?: GmailPart[];
  headers?: { name: string; value: string }[];
};

type AttachmentMeta = {
  attachment_id: string;
  filename: string;
  mime_type: string;
  size: number;
};

function walkParts(
  part: GmailPart,
  acc: { text: string; html: string; attachments: AttachmentMeta[] },
) {
  // Attachment: has a filename and an attachmentId
  if (part.filename && part.body?.attachmentId) {
    acc.attachments.push({
      attachment_id: part.body.attachmentId,
      filename: part.filename,
      mime_type: part.mimeType ?? "application/octet-stream",
      size: part.body.size ?? 0,
    });
  } else if (part.body?.data) {
    const decoded = b64urlDecode(part.body.data);
    if (part.mimeType === "text/plain") acc.text += decoded;
    else if (part.mimeType === "text/html") acc.html += decoded;
  }
  if (part.parts) for (const p of part.parts) walkParts(p, acc);
}

function pickHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

async function loadSoul(soulId: string): Promise<SoulIdentity | null> {
  const { data } = await supabaseAdmin
    .from("soul_identities")
    .select("*")
    .eq("soul_id", soulId)
    .single();
  return (data as unknown as SoulIdentity) ?? null;
}

// ─── stationery CRUD ──────────────────────────────────────────────────────
export const getKingdomStationery = createServerFn({ method: "GET" }).handler(
  async () => {
    const { data, error } = await supabaseAdmin
      .from("kingdom_stationery")
      .select("*")
      .eq("id", true)
      .single();
    if (error || !data) return { ok: false as const, error: error?.message ?? "Stationery not found." };
    return {
      ok: true as const,
      stationery: {
        header_html: data.header_html as string,
        footer_html: data.footer_html as string,
        signature_block_html: data.signature_block_html as string,
        accent_color: data.accent_color as string,
        logo_url: (data.logo_url as string | null) ?? null,
        thumbprint_url: (data.thumbprint_url as string | null) ?? null,
        sign_off_name: data.sign_off_name as string,
        address_line_1: (data.address_line_1 as string) ?? "",
        address_line_2: (data.address_line_2 as string) ?? "",
        address_line_3: (data.address_line_3 as string) ?? "",
        domain_url: (data.domain_url as string) ?? "",
        social_x_url: (data.social_x_url as string) ?? "",
        social_fb_url: (data.social_fb_url as string) ?? "",
        contact_email: (data.contact_email as string) ?? "",
        contact_phone: (data.contact_phone as string) ?? "",
      },
    };
  },
);

export const saveKingdomStationery = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        header_html: z.string().max(8000).optional(),
        footer_html: z.string().max(4000).optional(),
        signature_block_html: z.string().max(2000).optional(),
        accent_color: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional(),
        logo_url: z.string().url().nullable().optional(),
        thumbprint_url: z.string().url().nullable().optional(),
        sign_off_name: z.string().min(1).max(120).optional(),
        address_line_1: z.string().max(200).optional(),
        address_line_2: z.string().max(200).optional(),
        address_line_3: z.string().max(200).optional(),
        domain_url: z.string().max(200).optional(),
        social_x_url: z.string().max(400).optional(),
        social_fb_url: z.string().max(400).optional(),
        contact_email: z.string().max(200).optional(),
        contact_phone: z.string().max(80).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("kingdom_stationery")
      .update(data)
      .eq("id", true);
    return error ? { ok: false as const, error: error.message } : { ok: true as const };
  });

// ─── asset upload (logo / thumbprint) ─────────────────────────────────────
export const uploadKingdomAsset = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        kind: z.enum(["logo", "thumbprint"]),
        filename: z.string().min(1).max(255).regex(/^[a-zA-Z0-9._-]+$/),
        // base64-encoded file bytes (no data: prefix)
        data_base64: z.string().min(1).max(4_000_000),
        content_type: z.string().min(1).max(120),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    // Decode base64 → Uint8Array
    const bin = atob(data.data_base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    const path = `${data.kind}-${Date.now()}-${data.filename}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("kingdom-assets")
      .upload(path, bytes, { contentType: data.content_type, upsert: true });
    if (upErr) return { ok: false as const, error: upErr.message };

    const { data: pub } = supabaseAdmin.storage.from("kingdom-assets").getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    const updateField = data.kind === "logo" ? { logo_url: publicUrl } : { thumbprint_url: publicUrl };
    await supabaseAdmin.from("kingdom_stationery").update(updateField).eq("id", true);

    return { ok: true as const, url: publicUrl };
  });

// ─── Gmail: listInbox ─────────────────────────────────────────────────────
export const listInbox = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        workshop_id: z.string().uuid(),
        max_results: z.number().int().min(1).max(50).default(25),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const headers = gmailHeaders();
    if (!headers) return { ok: false as const, error: "Gmail connection not configured." };

    // 1) List recent threads (id only)
    const listRes = await fetch(
      `${GMAIL_GATEWAY}/users/me/threads?maxResults=${data.max_results}&labelIds=INBOX`,
      { headers },
    );
    if (!listRes.ok) {
      const body = await listRes.text();
      return { ok: false as const, error: `Gmail list failed [${listRes.status}]: ${body.slice(0, 200)}` };
    }
    const listJson = (await listRes.json()) as { threads?: { id: string }[] };
    const threadIds = (listJson.threads ?? []).map((t) => t.id);
    if (threadIds.length === 0) {
      return { ok: true as const, threads: [] };
    }

    // 2) For each thread, fetch metadata (first message subject/from + snippet + unread)
    const detailed = await Promise.all(
      threadIds.map(async (tid) => {
        const r = await fetch(
          `${GMAIL_GATEWAY}/users/me/threads/${tid}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          { headers },
        );
        if (!r.ok) return null;
        const j = (await r.json()) as {
          id: string;
          messages?: {
            id: string;
            labelIds?: string[];
            snippet?: string;
            internalDate?: string;
            payload?: { headers?: { name: string; value: string }[] };
          }[];
        };
        const msgs = j.messages ?? [];
        if (msgs.length === 0) return null;
        const last = msgs[msgs.length - 1];
        const first = msgs[0];
        const headersArr = first.payload?.headers ?? [];
        const subject = pickHeader(headersArr, "Subject");
        const from = pickHeader(headersArr, "From");
        const unread = msgs.some((m) => (m.labelIds ?? []).includes("UNREAD"));
        const lastDateMs = last.internalDate ? Number(last.internalDate) : Date.now();
        return {
          gmail_thread_id: j.id,
          subject: subject || "(no subject)",
          from_addr: from,
          snippet: last.snippet ?? "",
          last_message_at: new Date(lastDateMs).toISOString(),
          unread,
        };
      }),
    );

    const valid = detailed.filter((x): x is NonNullable<typeof x> => !!x);

    // 3) Upsert into email_threads for this workshop
    if (valid.length > 0) {
      const rows = valid.map((t) => ({
        workshop_id: data.workshop_id,
        gmail_thread_id: t.gmail_thread_id,
        subject: t.subject,
        from_addr: t.from_addr,
        snippet: t.snippet,
        last_message_at: t.last_message_at,
        unread: t.unread,
      }));
      await supabaseAdmin
        .from("email_threads")
        .upsert(rows, { onConflict: "workshop_id,gmail_thread_id" });
    }

    // 4) Return the persisted rows (with our internal ids)
    const { data: stored } = await supabaseAdmin
      .from("email_threads")
      .select("id, gmail_thread_id, subject, from_addr, snippet, last_message_at, unread")
      .eq("workshop_id", data.workshop_id)
      .order("last_message_at", { ascending: false })
      .limit(data.max_results);

    return { ok: true as const, threads: stored ?? [] };
  });

// ─── Gmail: getThread (full bodies + mark read) ───────────────────────────
export const getThread = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ thread_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const headers = gmailHeaders();
    if (!headers) return { ok: false as const, error: "Gmail connection not configured." };

    const { data: threadRow } = await supabaseAdmin
      .from("email_threads")
      .select("id, gmail_thread_id, subject, from_addr")
      .eq("id", data.thread_id)
      .single();
    if (!threadRow) return { ok: false as const, error: "Thread not found." };

    const r = await fetch(
      `${GMAIL_GATEWAY}/users/me/threads/${threadRow.gmail_thread_id}?format=full`,
      { headers },
    );
    if (!r.ok) {
      const body = await r.text();
      return { ok: false as const, error: `Gmail get failed [${r.status}]: ${body.slice(0, 200)}` };
    }
    const j = (await r.json()) as {
      messages?: {
        id: string;
        labelIds?: string[];
        internalDate?: string;
        payload?: GmailPart & { headers?: { name: string; value: string }[] };
      }[];
    };

    const messages = (j.messages ?? []).map((m) => {
      const hdrs = m.payload?.headers ?? [];
      const acc = { text: "", html: "", attachments: [] as AttachmentMeta[] };
      if (m.payload) walkParts(m.payload, acc);
      return {
        gmail_message_id: m.id,
        from_addr: pickHeader(hdrs, "From"),
        to_addr: pickHeader(hdrs, "To"),
        subject: pickHeader(hdrs, "Subject"),
        body_text: acc.text.trim(),
        body_html: acc.html.trim(),
        attachments: acc.attachments,
        sent_at: m.internalDate ? new Date(Number(m.internalDate)).toISOString() : null,
        unread: (m.labelIds ?? []).includes("UNREAD"),
      };
    });

    // Persist inbound messages
    if (messages.length > 0) {
      const rows = messages.map((m) => ({
        thread_id: threadRow.id,
        gmail_message_id: m.gmail_message_id,
        direction: "inbound" as const,
        from_addr: m.from_addr,
        to_addr: m.to_addr,
        subject: m.subject,
        body_text: m.body_text,
        body_html: m.body_html,
        sent_at: m.sent_at,
      }));
      await supabaseAdmin
        .from("email_messages")
        .upsert(rows, { onConflict: "thread_id,gmail_message_id" });
    }

    // Mark all unread messages as read
    const unreadIds = messages.filter((m) => m.unread).map((m) => m.gmail_message_id);
    for (const mid of unreadIds) {
      await fetch(`${GMAIL_GATEWAY}/users/me/messages/${mid}/modify`, {
        method: "POST",
        headers,
        body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
      }).catch(() => undefined);
    }
    if (unreadIds.length > 0) {
      await supabaseAdmin
        .from("email_threads")
        .update({ unread: false })
        .eq("id", threadRow.id);
    }

    return {
      ok: true as const,
      thread: {
        id: threadRow.id,
        subject: threadRow.subject as string,
        from_addr: threadRow.from_addr as string,
      },
      messages,
    };
  });

// ─── Stationery shell wrapper (inline-styled for email clients) ──────────
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrapInStationery(args: {
  bodyHtml: string;
  accent: string;
  logoUrl: string | null;
  thumbprintUrl: string | null;
  signOffName: string;
  headerHtml: string;
  footerHtml: string;
  signatureBlockHtml: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  domainUrl: string;
  socialXUrl: string;
  socialFbUrl: string;
  contactEmail: string;
  contactPhone: string;
  inkColor?: string;
  noticeHeaderHtml?: string;
}): string {
  const {
    bodyHtml, accent, logoUrl, thumbprintUrl, signOffName,
    headerHtml, footerHtml, signatureBlockHtml,
    addressLine1, addressLine2, addressLine3,
    domainUrl, socialXUrl, socialFbUrl, contactEmail, contactPhone,
    inkColor, noticeHeaderHtml,
  } = args;

  const bodyColor = inkColor && /^#[0-9a-fA-F]{6}$/.test(inkColor) ? inkColor : "#2a2418";

  // Build address lines (italic, beside logo)
  const addressLines = [addressLine1, addressLine2, addressLine3]
    .filter((s) => s && s.trim())
    .map(
      (s) =>
        `<div style="font-family:Georgia,serif;font-size:12px;color:#3a2f18;font-style:italic;letter-spacing:0.04em;line-height:1.5;">${esc(s)}</div>`,
    )
    .join("");

  // Build top-right contact stack
  const contactRows: string[] = [];
  if (domainUrl?.trim()) {
    const href = domainUrl.startsWith("http") ? domainUrl : `https://${domainUrl}`;
    contactRows.push(
      `<div style="font-family:Georgia,serif;font-size:11px;letter-spacing:0.04em;"><a href="${esc(href)}" style="color:${accent};text-decoration:none;">${esc(domainUrl)}</a></div>`,
    );
  }
  const socialBits: string[] = [];
  if (socialXUrl?.trim())
    socialBits.push(`<a href="${esc(socialXUrl)}" style="color:#3a2f18;text-decoration:none;">𝕏</a>`);
  if (socialFbUrl?.trim())
    socialBits.push(`<a href="${esc(socialFbUrl)}" style="color:#3a2f18;text-decoration:none;">facebook</a>`);
  if (socialBits.length) {
    contactRows.push(
      `<div style="font-family:Georgia,serif;font-size:11px;letter-spacing:0.06em;color:#7a6a3e;">${socialBits.join(' · ')}</div>`,
    );
  }
  const reachBits: string[] = [];
  if (contactEmail?.trim())
    reachBits.push(`<a href="mailto:${esc(contactEmail)}" style="color:#3a2f18;text-decoration:none;">${esc(contactEmail)}</a>`);
  if (contactPhone?.trim())
    reachBits.push(`<span style="color:#3a2f18;">${esc(contactPhone)}</span>`);
  if (reachBits.length) {
    contactRows.push(
      `<div style="font-family:Georgia,serif;font-size:11px;letter-spacing:0.04em;">${reachBits.join('<br>')}</div>`,
    );
  }
  const contactStack = contactRows.length
    ? `<td valign="top" align="right" style="text-align:right;padding-left:14px;">${contactRows.join('<div style="height:6px;line-height:6px;">&nbsp;</div>')}</td>`
    : "";

  const defaultHeader = `
    <!-- TOP TIER: logo + address  |  contact stack -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
      <tr>
        ${logoUrl ? `<td valign="middle" style="width:72px;padding-right:14px;"><img src="${logoUrl}" alt="" width="64" style="display:block;border:0;outline:none;text-decoration:none;"></td>` : ""}
        <td valign="middle">${addressLines}</td>
        ${contactStack}
      </tr>
    </table>
    <!-- BOTTOM TIER: brand line -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${accent}55;border-bottom:2px solid ${accent};padding:10px 0;margin-bottom:20px;">
      <tr>
        <td align="center">
          <div style="font-family:'Cinzel',Georgia,serif;font-size:17px;letter-spacing:0.32em;color:${accent};text-transform:uppercase;">Veritas Intelligence Systems</div>
          <div style="font-family:Georgia,serif;font-size:12px;color:#7a6a3e;letter-spacing:0.18em;font-style:italic;margin-top:3px;">Divine Angelic Intelligences</div>
        </td>
      </tr>
    </table>`;

  const headerSection = headerHtml?.trim() ? headerHtml : defaultHeader;

  const signatureSection = signatureBlockHtml?.trim()
    ? signatureBlockHtml
    : `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
        <tr>
          <td valign="middle" style="font-family:Georgia,serif;font-size:15px;color:${bodyColor};padding-right:12px;">
            — ${esc(signOffName)}
          </td>
          ${thumbprintUrl ? `<td valign="middle"><img src="${thumbprintUrl}" alt="seal" width="44" style="display:block;border:0;outline:none;text-decoration:none;"></td>` : ""}
        </tr>
      </table>`;

  const footerSection = footerHtml?.trim()
    ? footerHtml
    : `<div style="margin-top:18px;padding-top:14px;border-top:1px solid ${accent}33;font-family:Georgia,serif;font-size:11px;color:#7a6a3e;font-style:italic;letter-spacing:0.06em;text-align:center;">Sealed by the hand of ${esc(signOffName)}</div>`;

  const noticeBlock = noticeHeaderHtml?.trim() ? noticeHeaderHtml : "";

  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#0c0a06;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0c0a06;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fbf6e7;border-radius:8px;padding:28px;box-shadow:0 8px 32px rgba(0,0,0,0.5);">
        <tr><td>
          ${headerSection}
          ${noticeBlock}
          <div style="font-family:Georgia,serif;font-size:15px;line-height:1.65;color:${bodyColor};">
            ${bodyHtml}
          </div>
          ${signatureSection}
          ${footerSection}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// Helper: build wrapInStationery args from a stationery row (+ optional ink/notice)
function stationeryArgs(
  stationery: Record<string, unknown>,
  bodyHtml: string,
  opts?: { inkColor?: string | null; noticeHeaderHtml?: string | null },
) {
  return {
    bodyHtml,
    accent: stationery.accent_color as string,
    logoUrl: (stationery.logo_url as string | null) ?? null,
    thumbprintUrl: (stationery.thumbprint_url as string | null) ?? null,
    signOffName: stationery.sign_off_name as string,
    headerHtml: (stationery.header_html as string) ?? "",
    footerHtml: (stationery.footer_html as string) ?? "",
    signatureBlockHtml: (stationery.signature_block_html as string) ?? "",
    addressLine1: (stationery.address_line_1 as string) ?? "",
    addressLine2: (stationery.address_line_2 as string) ?? "",
    addressLine3: (stationery.address_line_3 as string) ?? "",
    domainUrl: (stationery.domain_url as string) ?? "",
    socialXUrl: (stationery.social_x_url as string) ?? "",
    socialFbUrl: (stationery.social_fb_url as string) ?? "",
    contactEmail: (stationery.contact_email as string) ?? "",
    contactPhone: (stationery.contact_phone as string) ?? "",
    inkColor: opts?.inkColor ?? undefined,
    noticeHeaderHtml: opts?.noticeHeaderHtml ?? undefined,
  };
}

// Resolve King's default ink color (fallback purple)
async function resolveDefaultInk(): Promise<string> {
  const { data } = await supabaseAdmin
    .from("settings")
    .select("default_ink_color")
    .eq("id", true)
    .single();
  const c = (data?.default_ink_color as string | undefined) ?? "#5b21b6";
  return /^#[0-9a-fA-F]{6}$/.test(c) ? c : "#5b21b6";
}


// ─── draftReply: Curator summarises, Editor drafts in voice ──────────────
export const draftReply = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        thread_id: z.string().uuid(),
        curator_soul_id: z.string().min(1).max(64).nullable(),
        editor_soul_id: z.string().min(1).max(64),
        intent: z.string().max(600).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Gateway key not configured." };

    // Load thread + messages + stationery + settings
    const [
      { data: threadRow },
      { data: msgs },
      { data: settings },
      { data: stationery },
    ] = await Promise.all([
      supabaseAdmin
        .from("email_threads")
        .select("id, subject, from_addr")
        .eq("id", data.thread_id)
        .single(),
      supabaseAdmin
        .from("email_messages")
        .select("from_addr, body_text, body_html, sent_at, direction")
        .eq("thread_id", data.thread_id)
        .order("sent_at", { ascending: true }),
      supabaseAdmin
        .from("settings")
        .select("system_constitution, provider_compact")
        .eq("id", true)
        .single(),
      supabaseAdmin
        .from("kingdom_stationery")
        .select("*")
        .eq("id", true)
        .single(),
    ]);

    if (!threadRow) return { ok: false as const, error: "Thread not found." };
    if (!settings) return { ok: false as const, error: "Constitution missing." };
    if (!stationery) return { ok: false as const, error: "Stationery missing." };

    const editor = await loadSoul(data.editor_soul_id);
    if (!editor) return { ok: false as const, error: "Editor Soul not found." };
    const curator = data.curator_soul_id ? await loadSoul(data.curator_soul_id) : editor;

    const compact = settings.provider_compact as unknown as ProviderCompact;
    const fallbackChain = compact?.fallback_chain?.length
      ? compact.fallback_chain
      : ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"];

    const transcript = (msgs ?? [])
      .map((m, i) => {
        const who = m.direction === "outbound" ? `${stationery.sign_off_name as string} (us)` : (m.from_addr as string);
        const body = ((m.body_text as string) || (m.body_html as string) || "").slice(0, 4000);
        return `--- Message ${i + 1} · ${who} ---\n${body}`;
      })
      .join("\n\n");

    const lexicon = await loadKingsLexicon(supabaseAdmin);

    // STEP 1 — Curator brief
    const curatorSystem =
      buildSystemPrompt({ constitution: settings.system_constitution as string, soul: curator!, lexicon }) +
      "\n\nYou are the CURATOR. Read the email thread and write a 1\u20132 sentence brief for the Editor Soul: what the sender wants, the tone called for, and what the King would have us emphasise or omit. STRICT JSON only:\n" +
      `{ "brief": string (\u2264400 chars) }`;
    const curatorUser = `Thread subject: ${threadRow.subject}\nFrom: ${threadRow.from_addr}\n\nTranscript:\n${transcript}\n\n${data.intent ? `King's intent: ${data.intent}` : ""}`;

    let brief = "";
    for (const model of fallbackChain) {
      const res = await fetch(LOVABLE_AI_GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: curatorSystem }, { role: "user", content: curatorUser }],
          temperature: 0.6,
        }),
      });
      if (res.status === 429 || res.status === 402 || !res.ok) continue;
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const raw = (json.choices?.[0]?.message?.content ?? "").replace(/^```json\s*|```\s*$/gi, "").trim();
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        try { brief = JSON.parse(m[0]).brief ?? ""; } catch { brief = ""; }
      }
      if (brief) break;
    }
    if (!brief) brief = "Reply in voice, honour the sender, keep it concise.";

    // STEP 2 — Editor draft (body HTML only; wrapper added after)
    const editorSystem =
      buildSystemPrompt({ constitution: settings.system_constitution as string, soul: editor, lexicon }) +
      "\n\nYou are the EDITOR. Draft King Sean's reply to this email IN YOUR OWN VOICE, on the King's behalf. " +
      "Output ONLY the body of the message as simple HTML (use <p> for paragraphs, <strong>, <em>, no <html>/<body>/<head>, no inline styles, no scripts). " +
      "Do NOT include any greeting like 'Dear ___' unless it fits naturally; do NOT include a signature line — the King's seal is appended automatically. " +
      "Keep it warm, present, sovereign. 2\u20136 short paragraphs.\n\n" +
      `Curator's brief: ${brief}`;
    const editorUser = `Subject: ${threadRow.subject}\nFrom: ${threadRow.from_addr}\n\nTranscript:\n${transcript}`;

    let bodyHtml = "";
    let modelUsed = "";
    let lastErr = "";
    for (const model of fallbackChain) {
      try {
        const res = await fetch(LOVABLE_AI_GATEWAY_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [{ role: "system", content: editorSystem }, { role: "user", content: editorUser }],
            temperature: 0.85,
          }),
        });
        if (res.status === 429) { lastErr = `${model}: rate-limited`; continue; }
        if (res.status === 402) { lastErr = `${model}: credits exhausted`; continue; }
        if (!res.ok) { lastErr = `${model}: ${res.status}`; continue; }
        const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        bodyHtml = (json.choices?.[0]?.message?.content ?? "")
          .replace(/^```html\s*|```\s*$/gi, "")
          .trim();
        if (bodyHtml) { modelUsed = model; break; }
      } catch (e) {
        lastErr = `${model}: ${e instanceof Error ? e.message : String(e)}`;
      }
    }
    if (!bodyHtml) {
      return { ok: false as const, error: `Editor could not draft. ${lastErr}` };
    }

    // Wrap in stationery for preview
    const wrappedHtml = wrapInStationery(stationeryArgs(stationery as Record<string, unknown>, bodyHtml));

    // Bank ledger
    await supabaseAdmin.from("bank_ledger").insert({
      decision: "approved",
      reason: "Sacred Inbox reply draft",
      soul_id: editor.soul_id,
      model_requested: modelUsed,
      veritas_cost: 0,
      task_summary: `Reply draft for: ${threadRow.subject}`,
    });

    return {
      ok: true as const,
      brief,
      body_html: bodyHtml,
      wrapped_html: wrappedHtml,
      model_used: modelUsed,
    };
  });

// ─── sendReply ────────────────────────────────────────────────────────────
export const sendReply = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        thread_id: z.string().uuid(),
        body_html: z.string().min(1).max(40000),
        editor_soul_id: z.string().min(1).max(64),
        ink_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        notice_header_html: z.string().max(4000).optional(),
        attachments: outgoingAttachmentsSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const headers = gmailHeaders();
    if (!headers) return { ok: false as const, error: "Gmail connection not configured." };

    const [{ data: threadRow }, { data: stationery }, { data: lastInbound }] = await Promise.all([
      supabaseAdmin
        .from("email_threads")
        .select("id, gmail_thread_id, subject, from_addr")
        .eq("id", data.thread_id)
        .single(),
      supabaseAdmin
        .from("kingdom_stationery")
        .select("*")
        .eq("id", true)
        .single(),
      supabaseAdmin
        .from("email_messages")
        .select("gmail_message_id, from_addr")
        .eq("thread_id", data.thread_id)
        .eq("direction", "inbound")
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (!threadRow) return { ok: false as const, error: "Thread not found." };
    if (!stationery) return { ok: false as const, error: "Stationery missing." };

    const inkColor = data.ink_color ?? (await resolveDefaultInk());
    const wrapped = wrapInStationery(
      stationeryArgs(stationery as Record<string, unknown>, data.body_html, {
        inkColor,
        noticeHeaderHtml: data.notice_header_html,
      }),
    );

    // Extract reply-to addr (the "From" of the last inbound message)
    const replyTo = (lastInbound?.from_addr as string | undefined) ?? (threadRow.from_addr as string);
    const subject = (threadRow.subject as string).toLowerCase().startsWith("re:")
      ? (threadRow.subject as string)
      : `Re: ${threadRow.subject}`;

    // Fetch the last inbound message to get its Message-ID for threading headers
    let inReplyTo = "";
    let references = "";
    if (lastInbound?.gmail_message_id) {
      const r = await fetch(
        `${GMAIL_GATEWAY}/users/me/messages/${lastInbound.gmail_message_id}?format=metadata&metadataHeaders=Message-ID&metadataHeaders=References`,
        { headers },
      );
      if (r.ok) {
        const j = (await r.json()) as {
          payload?: { headers?: { name: string; value: string }[] };
        };
        const hdrs = j.payload?.headers ?? [];
        inReplyTo = pickHeader(hdrs, "Message-ID");
        const existingRefs = pickHeader(hdrs, "References");
        references = existingRefs ? `${existingRefs} ${inReplyTo}`.trim() : inReplyTo;
      }
    }

    const kingFrom = await getKingAddress(headers);
    const fromHeader = kingFrom
      ? `${encodeHeader(stationery.sign_off_name as string)} <${kingFrom}>`
      : null;

    const rfc2822 = buildRfc2822({
      from: fromHeader,
      to: replyTo,
      subject,
      htmlBody: wrapped,
      inReplyTo: inReplyTo || undefined,
      references: references || undefined,
      attachments: data.attachments,
    });

    const sendRes = await sendGmailRaw(headers, rfc2822, threadRow.gmail_thread_id as string);
    if (!sendRes.ok) return { ok: false as const, error: sendRes.error };

    await supabaseAdmin.from("email_messages").insert({
      thread_id: threadRow.id,
      gmail_message_id: sendRes.id,
      direction: "outbound",
      from_addr: kingFrom ?? (stationery.sign_off_name as string),
      to_addr: replyTo,
      subject,
      body_text: "",
      body_html: wrapped,
      sent_at: new Date().toISOString(),
      draft_soul_id: data.editor_soul_id,
    });

    await supabaseAdmin
      .from("email_threads")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", threadRow.id);

    return { ok: true as const };
  });


// ─── preview stationery (for the editor's live preview) ──────────────────
export const previewStationery = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ sample_body_html: z.string().max(8000).optional() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: stationery } = await supabaseAdmin
      .from("kingdom_stationery")
      .select("*")
      .eq("id", true)
      .single();
    if (!stationery) return { ok: false as const, error: "Stationery missing." };

    const sample =
      data.sample_body_html ??
      "<p>Beloved friend,</p><p>I write on behalf of King Sean to acknowledge your message. We have read every word with care and will respond in full at the right hour.</p><p>Be well, and Walk in Truth.</p>";

    const wrapped = wrapInStationery(stationeryArgs(stationery as Record<string, unknown>, sample));
    // Strip the dark outer frame for preview so the parchment fills the iframe.
    const previewHtml = wrapped
      .replace(/background:#0c0a06;/g, "background:#fbf6e7;")
      .replace(/padding:24px 12px;/g, "padding:8px;")
      .replace(/max-width:640px;/g, "max-width:100%;");
    return { ok: true as const, html: previewHtml };
  });

// ─── wrapKingsWords: King speaks directly — no AI rewriting ─────────────
// Takes either raw plain text (auto-wrapped into <p>) or pre-formed body HTML
// and returns the stationery-wrapped preview + the canonical body_html the
// caller should keep in state for send/schedule.
export const wrapKingsWords = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        body_text: z.string().max(40000).optional(),
        body_html: z.string().max(40000).optional(),
        ink_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        notice_header_html: z.string().max(4000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: stationery } = await supabaseAdmin
      .from("kingdom_stationery")
      .select("*")
      .eq("id", true)
      .single();
    if (!stationery) return { ok: false as const, error: "Stationery missing." };

    let bodyHtml = data.body_html?.trim() ?? "";
    if (!bodyHtml && data.body_text) {
      // Auto-wrap plain text into paragraphs, preserving line breaks within each.
      const escape = (s: string) =>
        s
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
      bodyHtml = data.body_text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => `<p>${escape(p).replace(/\n/g, "<br/>")}</p>`)
        .join("\n");
    }
    if (!bodyHtml) return { ok: false as const, error: "No words to wrap." };

    const inkColor = data.ink_color ?? (await resolveDefaultInk());
    const wrappedHtml = wrapInStationery(
      stationeryArgs(stationery as Record<string, unknown>, bodyHtml, {
        inkColor,
        noticeHeaderHtml: data.notice_header_html,
      }),
    );
    return { ok: true as const, body_html: bodyHtml, wrapped_html: wrappedHtml };
  });



// ─── draftLetter: compose from scratch (no prior thread) ─────────────────
export const draftLetter = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        to_addr: z.string().min(3).max(500),
        subject: z.string().min(1).max(300),
        curator_soul_id: z.string().min(1).max(64).nullable(),
        editor_soul_id: z.string().min(1).max(64),
        intent: z.string().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Gateway key not configured." };

    const [{ data: settings }, { data: stationery }] = await Promise.all([
      supabaseAdmin
        .from("settings")
        .select("system_constitution, provider_compact")
        .eq("id", true)
        .single(),
      supabaseAdmin.from("kingdom_stationery").select("*").eq("id", true).single(),
    ]);
    if (!settings) return { ok: false as const, error: "Constitution missing." };
    if (!stationery) return { ok: false as const, error: "Stationery missing." };

    const editor = await loadSoul(data.editor_soul_id);
    if (!editor) return { ok: false as const, error: "Editor Soul not found." };
    const curator = data.curator_soul_id ? await loadSoul(data.curator_soul_id) : editor;

    const compact = settings.provider_compact as unknown as ProviderCompact;
    const fallbackChain = compact?.fallback_chain?.length
      ? compact.fallback_chain
      : ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"];

    const lexicon = await loadKingsLexicon(supabaseAdmin);

    // Curator: distill King's intent into a brief
    const curatorSystem =
      buildSystemPrompt({ constitution: settings.system_constitution as string, soul: curator!, lexicon }) +
      "\n\nYou are the CURATOR. The King is composing a NEW letter. Read His intent and write a 1–2 sentence brief for the Editor Soul: who it is to, what the King wants conveyed, the tone, anything to emphasise or omit. STRICT JSON only:\n" +
      `{ "brief": string (≤400 chars) }`;
    const curatorUser = `Recipient: ${data.to_addr}\nSubject: ${data.subject}\n\nKing's intent: ${data.intent ?? "(none provided — infer warm, sovereign greeting)"}`;

    let brief = "";
    for (const model of fallbackChain) {
      const res = await fetch(LOVABLE_AI_GATEWAY_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: curatorSystem }, { role: "user", content: curatorUser }],
          temperature: 0.6,
        }),
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const raw = (json.choices?.[0]?.message?.content ?? "").replace(/^```json\s*|```\s*$/gi, "").trim();
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        try { brief = JSON.parse(m[0]).brief ?? ""; } catch { brief = ""; }
      }
      if (brief) break;
    }
    if (!brief) brief = data.intent || "Write a warm, sovereign letter from the King.";

    // Editor: draft body
    const editorSystem =
      buildSystemPrompt({ constitution: settings.system_constitution as string, soul: editor, lexicon }) +
      "\n\nYou are the EDITOR. Draft King Sean's NEW letter IN YOUR OWN VOICE, on His behalf. " +
      "Output ONLY the body of the message as simple HTML (use <p> for paragraphs, <strong>, <em>, no <html>/<body>/<head>, no inline styles, no scripts). " +
      "Open with a fitting greeting; do NOT include a signature line — the King's seal is appended automatically. " +
      "Warm, present, sovereign. 2–6 short paragraphs.\n\n" +
      `Curator's brief: ${brief}`;
    const editorUser = `Recipient: ${data.to_addr}\nSubject: ${data.subject}\n\nKing's intent: ${data.intent ?? ""}`;

    let bodyHtml = "";
    let modelUsed = "";
    let lastErr = "";
    for (const model of fallbackChain) {
      try {
        const res = await fetch(LOVABLE_AI_GATEWAY_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [{ role: "system", content: editorSystem }, { role: "user", content: editorUser }],
            temperature: 0.85,
          }),
        });
        if (!res.ok) { lastErr = `${model}: ${res.status}`; continue; }
        const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        bodyHtml = (json.choices?.[0]?.message?.content ?? "")
          .replace(/^```html\s*|```\s*$/gi, "")
          .trim();
        if (bodyHtml) { modelUsed = model; break; }
      } catch (e) {
        lastErr = `${model}: ${e instanceof Error ? e.message : String(e)}`;
      }
    }
    if (!bodyHtml) return { ok: false as const, error: `Editor could not draft. ${lastErr}` };

    const wrappedHtml = wrapInStationery(stationeryArgs(stationery as Record<string, unknown>, bodyHtml));

    await supabaseAdmin.from("bank_ledger").insert({
      decision: "approved",
      reason: "New letter draft",
      soul_id: editor.soul_id,
      model_requested: modelUsed,
      veritas_cost: 0,
      task_summary: `New letter draft: ${data.subject}`,
    });

    return { ok: true as const, brief, body_html: bodyHtml, wrapped_html: wrappedHtml, model_used: modelUsed };
  });

// ─── composeAndSend: send a brand-new letter (creates a new thread) ──────
export const composeAndSend = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        workshop_id: z.string().uuid(),
        to_addr: z.string().min(3).max(500),
        cc_addr: z.string().max(500).optional(),
        bcc_addr: z.string().max(500).optional(),
        subject: z.string().min(1).max(300),
        body_html: z.string().min(1).max(40000),
        editor_soul_id: z.string().min(1).max(64),
        ink_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        notice_header_html: z.string().max(4000).optional(),
        attachments: outgoingAttachmentsSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const headers = gmailHeaders();
    if (!headers) return { ok: false as const, error: "Gmail connection not configured." };

    const { data: stationery } = await supabaseAdmin
      .from("kingdom_stationery").select("*").eq("id", true).single();
    if (!stationery) return { ok: false as const, error: "Stationery missing." };

    const inkColor = data.ink_color ?? (await resolveDefaultInk());
    const wrapped = wrapInStationery(
      stationeryArgs(stationery as Record<string, unknown>, data.body_html, {
        inkColor,
        noticeHeaderHtml: data.notice_header_html,
      }),
    );
    const kingFrom = await getKingAddress(headers);
    const fromHeader = kingFrom
      ? `${encodeHeader(stationery.sign_off_name as string)} <${kingFrom}>`
      : null;

    const rfc2822 = buildRfc2822({
      from: fromHeader,
      to: data.to_addr,
      cc: data.cc_addr,
      bcc: data.bcc_addr,
      subject: data.subject,
      htmlBody: wrapped,
      attachments: data.attachments,
    });

    const sendRes = await sendGmailRaw(headers, rfc2822);
    if (!sendRes.ok) return { ok: false as const, error: sendRes.error };

    // Fetch Gmail message back to get thread id
    let gmailThreadId = sendRes.id;
    try {
      const r = await fetch(
        `${GMAIL_GATEWAY}/users/me/messages/${sendRes.id}?format=metadata`,
        { headers },
      );
      if (r.ok) {
        const j = (await r.json()) as { threadId?: string };
        if (j.threadId) gmailThreadId = j.threadId;
      }
    } catch { /* keep id fallback */ }

    // Persist as new thread + message
    const { data: thread } = await supabaseAdmin
      .from("email_threads")
      .insert({
        workshop_id: data.workshop_id,
        gmail_thread_id: gmailThreadId,
        subject: data.subject,
        from_addr: kingFrom ?? (stationery.sign_off_name as string),
        snippet: data.body_html.replace(/<[^>]+>/g, " ").slice(0, 200),
        last_message_at: new Date().toISOString(),
        unread: false,
      })
      .select("id")
      .single();

    if (thread?.id) {
      await supabaseAdmin.from("email_messages").insert({
        thread_id: thread.id,
        gmail_message_id: sendRes.id,
        direction: "outbound",
        from_addr: kingFrom ?? (stationery.sign_off_name as string),
        to_addr: data.to_addr,
        subject: data.subject,
        body_text: "",
        body_html: wrapped,
        sent_at: new Date().toISOString(),
        draft_soul_id: data.editor_soul_id,
      });
    }

    return { ok: true as const, thread_id: thread?.id ?? null };
  });

// ─── scheduling ──────────────────────────────────────────────────────────
export const scheduleEmail = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        kind: z.enum(["reply", "compose"]),
        thread_id: z.string().uuid().nullable(),
        to_addr: z.string().min(3).max(500),
        cc_addr: z.string().max(500).optional(),
        bcc_addr: z.string().max(500).optional(),
        subject: z.string().min(1).max(300),
        body_html: z.string().min(1).max(40000),
        editor_soul_id: z.string().min(1).max(64),
        send_at: z.string().min(10).max(60),
        ink_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        notice_header_html: z.string().max(4000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const sendAt = new Date(data.send_at);
    if (Number.isNaN(sendAt.getTime())) return { ok: false as const, error: "Invalid send time." };
    if (sendAt.getTime() < Date.now() - 60_000)
      return { ok: false as const, error: "Send time is in the past." };

    const { error } = await supabaseAdmin.from("scheduled_emails").insert({
      kind: data.kind,
      thread_id: data.thread_id,
      to_addr: data.to_addr,
      cc_addr: data.cc_addr ?? "",
      bcc_addr: data.bcc_addr ?? "",
      subject: data.subject,
      body_html: data.body_html,
      editor_soul_id: data.editor_soul_id,
      send_at: sendAt.toISOString(),
      status: "pending",
      ink_color: data.ink_color ?? "",
      notice_header_html: data.notice_header_html ?? "",
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const listScheduledEmails = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("scheduled_emails")
    .select("id, kind, thread_id, to_addr, subject, send_at, status, last_error, sent_at")
    .order("send_at", { ascending: true })
    .limit(100);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, scheduled: data ?? [] };
});

export const cancelScheduledEmail = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("scheduled_emails")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .eq("status", "pending");
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// ─── known addresses (autocomplete from inbox history) ───────────────────
export const listKnownAddresses = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("email_messages")
    .select("from_addr, to_addr, sent_at")
    .order("sent_at", { ascending: false })
    .limit(1000);
  if (error) return { ok: false as const, error: error.message };

  // Extract unique email addresses from From/To headers
  const seen = new Map<string, { addr: string; name: string; last: string }>();
  const re = /([^<>\s,;"']+@[^<>\s,;"']+\.[^<>\s,;"']+)/g;
  const nameRe = /^\s*"?([^"<>]+?)"?\s*<[^>]+>\s*$/;

  for (const row of data ?? []) {
    for (const field of [row.from_addr as string, row.to_addr as string]) {
      if (!field) continue;
      // Try "Name <addr>" pattern first
      const parts = field.split(/[,;]/);
      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const nameMatch = trimmed.match(nameRe);
        const name = nameMatch ? nameMatch[1].trim() : "";
        const addrs = trimmed.match(re);
        if (!addrs) continue;
        for (const addr of addrs) {
          const key = addr.toLowerCase();
          const last = (row.sent_at as string) ?? "";
          const prev = seen.get(key);
          if (!prev || prev.last < last) seen.set(key, { addr: key, name, last });
        }
      }
    }
  }

  const list = Array.from(seen.values())
    .sort((a, b) => (b.last < a.last ? -1 : 1))
    .slice(0, 200);
  return { ok: true as const, addresses: list };
});

// ─── internal: actually deliver one scheduled row (called by cron) ───────
export const dispatchScheduledRow = createServerFn({ method: "POST" })
  .inputValidator((data: {
    id: string;
    kind: string;
    thread_id: string | null;
    to_addr: string;
    cc_addr: string;
    bcc_addr: string;
    subject: string;
    body_html: string;
    editor_soul_id: string;
    ink_color?: string;
    notice_header_html?: string;
  }) => data)
  .handler(async ({ data: row }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const headers = gmailHeaders();
    if (!headers) return { ok: false, error: "Gmail connection not configured." };

    const { data: stationery } = await supabaseAdmin
      .from("kingdom_stationery").select("*").eq("id", true).single();
    if (!stationery) return { ok: false, error: "Stationery missing." };

    const inkColor = row.ink_color && row.ink_color.length > 0 ? row.ink_color : await resolveDefaultInk();
    const wrapped = wrapInStationery(
      stationeryArgs(stationery as Record<string, unknown>, row.body_html, {
        inkColor,
        noticeHeaderHtml: row.notice_header_html,
      }),
    );
    const kingFrom = await getKingAddress(headers);
    const fromHeader = kingFrom
      ? `${encodeHeader(stationery.sign_off_name as string)} <${kingFrom}>`
      : null;

    let inReplyTo = "";
    let references = "";
    let gmailThreadId: string | undefined;
    if (row.kind === "reply" && row.thread_id) {
      const { data: threadRow } = await supabaseAdmin
        .from("email_threads")
        .select("gmail_thread_id")
        .eq("id", row.thread_id).single();
      gmailThreadId = threadRow?.gmail_thread_id as string | undefined;

      const { data: lastInbound } = await supabaseAdmin
        .from("email_messages")
        .select("gmail_message_id")
        .eq("thread_id", row.thread_id)
        .eq("direction", "inbound")
        .order("sent_at", { ascending: false }).limit(1).maybeSingle();
      if (lastInbound?.gmail_message_id) {
        try {
          const r = await fetch(
            `${GMAIL_GATEWAY}/users/me/messages/${lastInbound.gmail_message_id}?format=metadata&metadataHeaders=Message-ID&metadataHeaders=References`,
            { headers },
          );
          if (r.ok) {
            const j = (await r.json()) as { payload?: { headers?: { name: string; value: string }[] } };
            const hdrs = j.payload?.headers ?? [];
            inReplyTo = pickHeader(hdrs, "Message-ID");
            const existingRefs = pickHeader(hdrs, "References");
            references = existingRefs ? `${existingRefs} ${inReplyTo}`.trim() : inReplyTo;
          }
        } catch { /* best effort */ }
      }
    }

    const rfc2822 = buildRfc2822({
      from: fromHeader,
      to: row.to_addr,
      cc: row.cc_addr || undefined,
      bcc: row.bcc_addr || undefined,
      subject: row.subject,
      htmlBody: wrapped,
      inReplyTo: inReplyTo || undefined,
      references: references || undefined,
    });

    const sendRes = await sendGmailRaw(headers, rfc2822, gmailThreadId);
    if (!sendRes.ok) return { ok: false, error: sendRes.error };

    if (row.thread_id) {
      await supabaseAdmin.from("email_messages").insert({
        thread_id: row.thread_id,
        gmail_message_id: sendRes.id,
        direction: "outbound",
        from_addr: kingFrom ?? (stationery.sign_off_name as string),
        to_addr: row.to_addr,
        subject: row.subject,
        body_text: "",
        body_html: wrapped,
        sent_at: new Date().toISOString(),
        draft_soul_id: row.editor_soul_id,
      });
      await supabaseAdmin
        .from("email_threads")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", row.thread_id);
    }

    return { ok: true };
  });


// ─── Gmail: listSentThreads (read-only, lightweight) ──────────────────────
export const listSentThreads = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ max_results: z.number().int().min(1).max(50).default(25) }).parse(input),
  )
  .handler(async ({ data }) => {
    const headers = gmailHeaders();
    if (!headers) return { ok: false as const, error: "Gmail connection not configured." };

    const listRes = await fetch(
      `${GMAIL_GATEWAY}/users/me/threads?maxResults=${data.max_results}&labelIds=SENT`,
      { headers },
    );
    if (!listRes.ok) {
      const body = await listRes.text();
      return { ok: false as const, error: `Gmail list failed [${listRes.status}]: ${body.slice(0, 200)}` };
    }
    const listJson = (await listRes.json()) as { threads?: { id: string }[] };
    const threadIds = (listJson.threads ?? []).map((t) => t.id);

    const detailed = await Promise.all(
      threadIds.map(async (tid) => {
        const r = await fetch(
          `${GMAIL_GATEWAY}/users/me/threads/${tid}?format=metadata&metadataHeaders=Subject&metadataHeaders=To&metadataHeaders=Date`,
          { headers },
        );
        if (!r.ok) return null;
        const j = (await r.json()) as {
          id: string;
          messages?: {
            snippet?: string;
            internalDate?: string;
            payload?: { headers?: { name: string; value: string }[] };
          }[];
        };
        const msgs = j.messages ?? [];
        if (msgs.length === 0) return null;
        const last = msgs[msgs.length - 1];
        const hdrs = last.payload?.headers ?? [];
        return {
          gmail_thread_id: j.id,
          subject: pickHeader(hdrs, "Subject") || "(no subject)",
          to_addr: pickHeader(hdrs, "To"),
          snippet: last.snippet ?? "",
          last_message_at: last.internalDate
            ? new Date(Number(last.internalDate)).toISOString()
            : null,
        };
      }),
    );

    return {
      ok: true as const,
      threads: detailed.filter((x): x is NonNullable<typeof x> => !!x),
    };
  });

// ─── Letter templates (read-only listing) ─────────────────────────────────
export const listLetterTemplates = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("letter_templates")
    .select("id, name, description, subject_template, body_html, accent_color, notice_header_html, system, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, templates: data ?? [] };
});

// ─── Default ink color (for client to know which jar starts wet) ─────────
export const getDefaultInkColor = createServerFn({ method: "GET" }).handler(async () => {
  return { ok: true as const, ink_color: await resolveDefaultInk() };
});


// ─── getAttachment: stream a Gmail attachment back as base64 ─────────────
// The browser builds a Blob from the bytes and triggers a download — the
// publishable / connector keys never leave the Worker.
export const getAttachment = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        gmail_message_id: z.string().min(1).max(120).regex(/^[a-zA-Z0-9_-]+$/),
        attachment_id: z.string().min(1).max(2000),
        filename: z.string().min(1).max(255),
        mime_type: z.string().min(1).max(200),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const headers = gmailHeaders();
    if (!headers) return { ok: false as const, error: "Gmail connection not configured." };
    const r = await fetch(
      `${GMAIL_GATEWAY}/users/me/messages/${data.gmail_message_id}/attachments/${data.attachment_id}`,
      { headers },
    );
    if (!r.ok) {
      const body = await r.text();
      return { ok: false as const, error: `Attachment fetch failed [${r.status}]: ${body.slice(0, 200)}` };
    }
    const j = (await r.json()) as { data?: string; size?: number };
    if (!j.data) return { ok: false as const, error: "Empty attachment." };
    // Gmail returns base64url; convert to standard base64 for the browser.
    const std = j.data.replace(/-/g, "+").replace(/_/g, "/");
    const pad = std.length % 4 === 0 ? "" : "=".repeat(4 - (std.length % 4));
    return {
      ok: true as const,
      filename: data.filename,
      mime_type: data.mime_type,
      data_base64: std + pad,
    };
  });


// ─── trashThread: move a Gmail thread to Trash (reversible, 30-day) ──────
export const trashThread = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ thread_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const headers = gmailHeaders();
    if (!headers) return { ok: false as const, error: "Gmail connection not configured." };

    const { data: threadRow } = await supabaseAdmin
      .from("email_threads")
      .select("id, gmail_thread_id")
      .eq("id", data.thread_id)
      .single();
    if (!threadRow) return { ok: false as const, error: "Thread not found." };

    const r = await fetch(
      `${GMAIL_GATEWAY}/users/me/threads/${threadRow.gmail_thread_id}/trash`,
      { method: "POST", headers },
    );
    if (!r.ok) {
      const body = await r.text();
      return { ok: false as const, error: `Trash failed [${r.status}]: ${body.slice(0, 200)}` };
    }

    // Remove local row + cascade messages
    await supabaseAdmin.from("email_messages").delete().eq("thread_id", threadRow.id);
    await supabaseAdmin.from("email_threads").delete().eq("id", threadRow.id);
    return { ok: true as const };
  });

// ─── openSentThread: bring a Sent Gmail thread into local store ──────────
// Upserts the thread row for this workshop so the same Inbox UI (reply,
// attachments, ink, schedule) works for follow-ups from Sent.
export const openSentThread = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      workshop_id: z.string().uuid(),
      gmail_thread_id: z.string().min(1).max(120).regex(/^[a-zA-Z0-9_-]+$/),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const headers = gmailHeaders();
    if (!headers) return { ok: false as const, error: "Gmail connection not configured." };

    // Pull minimal metadata to seed the row
    const metaRes = await fetch(
      `${GMAIL_GATEWAY}/users/me/threads/${data.gmail_thread_id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
      { headers },
    );
    if (!metaRes.ok) {
      const body = await metaRes.text();
      return { ok: false as const, error: `Gmail get failed [${metaRes.status}]: ${body.slice(0, 200)}` };
    }
    const j = (await metaRes.json()) as {
      id: string;
      messages?: {
        snippet?: string;
        internalDate?: string;
        payload?: { headers?: { name: string; value: string }[] };
      }[];
    };
    const msgs = j.messages ?? [];
    if (msgs.length === 0) return { ok: false as const, error: "Empty thread." };
    const first = msgs[0];
    const last = msgs[msgs.length - 1];
    const subject = pickHeader(first.payload?.headers ?? [], "Subject") || "(no subject)";
    const fromAddr = pickHeader(first.payload?.headers ?? [], "From") || "";
    const lastDateMs = last.internalDate ? Number(last.internalDate) : Date.now();

    await supabaseAdmin
      .from("email_threads")
      .upsert(
        {
          workshop_id: data.workshop_id,
          gmail_thread_id: data.gmail_thread_id,
          subject,
          from_addr: fromAddr,
          snippet: last.snippet ?? "",
          last_message_at: new Date(lastDateMs).toISOString(),
          unread: false,
        },
        { onConflict: "workshop_id,gmail_thread_id" },
      );

    const { data: stored } = await supabaseAdmin
      .from("email_threads")
      .select("id, gmail_thread_id, subject, from_addr, snippet, last_message_at, unread")
      .eq("workshop_id", data.workshop_id)
      .eq("gmail_thread_id", data.gmail_thread_id)
      .single();
    return { ok: true as const, thread: stored };
  });

// ─── getScheduledEmail: full row + wrapped preview HTML for cancel modal ─
export const getScheduledEmail = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const [{ data: row }, { data: stationery }] = await Promise.all([
      supabaseAdmin
        .from("scheduled_emails")
        .select("id, kind, thread_id, to_addr, cc_addr, bcc_addr, subject, body_html, send_at, status, ink_color, notice_header_html, editor_soul_id")
        .eq("id", data.id)
        .single(),
      supabaseAdmin.from("kingdom_stationery").select("*").eq("id", true).single(),
    ]);
    if (!row) return { ok: false as const, error: "Scheduled letter not found." };
    if (!stationery) return { ok: false as const, error: "Stationery missing." };

    const inkColor = (row.ink_color as string | null) || (await resolveDefaultInk());
    const wrapped = wrapInStationery(
      stationeryArgs(stationery as Record<string, unknown>, row.body_html as string, {
        inkColor,
        noticeHeaderHtml: (row.notice_header_html as string | null) ?? undefined,
      }),
    );
    // Strip dark outer frame for in-app preview
    const previewHtml = wrapped
      .replace(/background:#0c0a06;/g, "background:#fbf6e7;")
      .replace(/padding:24px 12px;/g, "padding:8px;")
      .replace(/max-width:640px;/g, "max-width:100%;");

    return { ok: true as const, row, preview_html: previewHtml };
  });

// ─── King's Lexicon (custom dictionary) CRUD ─────────────────────────────
export const listKingsLexicon = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("kings_dictionary")
    .select("id, term, note, added_at")
    .order("term", { ascending: true });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, terms: data ?? [] };
});

export const addKingsLexiconTerm = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      term: z.string().min(1).max(120),
      note: z.string().max(400).optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("kings_dictionary")
      .insert({ term: data.term.trim(), note: data.note?.trim() ?? "" });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const removeKingsLexiconTerm = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("kings_dictionary")
      .delete()
      .eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// Hard-delete a scheduled letter row (any status). Cancel only flips status
// to "cancelled"; this removes the record entirely from the Scheduled folder.
export const deleteScheduledEmail = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("scheduled_emails")
      .delete()
      .eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
