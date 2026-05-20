/**
 * Google Calendar gateway — Phase 9.
 *
 * Private legal reminders. The connector authenticates the workspace
 * owner's account (King Sean's) — fine for private King-only reminders.
 * All calls flow through the Lovable connector gateway.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

function headers() {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const GC_KEY = process.env.GOOGLE_CALENDAR_API_KEY;
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
  if (!GC_KEY) throw new Error("GOOGLE_CALENDAR_API_KEY is not configured — link Google Calendar first.");
  return {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": GC_KEY,
    "Content-Type": "application/json",
  };
}

async function gcFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Calendar [${res.status}]: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
}

// ─── listCalendars ─────────────────────────────────────────────────────────
export const listCalendars = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      const data = (await gcFetch("/users/me/calendarList")) as {
        items?: Array<{ id: string; summary: string; primary?: boolean; accessRole?: string }>;
      };
      const calendars = (data?.items ?? []).map((c) => ({
        id: c.id,
        name: c.summary,
        primary: !!c.primary,
        access: c.accessRole ?? "",
      }));
      return { ok: true as const, calendars };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e), calendars: [] };
    }
  });

// ─── setWorkshopCalendar ───────────────────────────────────────────────────
export const setWorkshopCalendar = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      workshop_id: z.string().uuid(),
      google_calendar_id: z.string().min(1).max(255),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("workshops")
      .update({
        google_calendar_id: data.google_calendar_id,
        google_sync_enabled: true,
      })
      .eq("id", data.workshop_id);
    return error ? { ok: false as const, error: error.message } : { ok: true as const };
  });

// ─── createLegalEvent ──────────────────────────────────────────────────────
export const createLegalEvent = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      workshop_id: z.string().uuid(),
      legal_document_id: z.string().uuid(),
      anchor: z.enum(["date_served", "hearing_date", "date_due", "date_filed"]).default("date_served"),
      event_title: z.string().min(1).max(300),
      summary: z.string().max(4000).default(""),
      reminder_days: z.array(z.number().int().min(0).max(365)).max(5).default([1, 7]),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const [{ data: workshop }, { data: doc }] = await Promise.all([
      supabaseAdmin
        .from("workshops")
        .select("google_calendar_id")
        .eq("id", data.workshop_id)
        .single(),
      supabaseAdmin
        .from("legal_documents")
        .select("doc_title, date_served, date_filed, date_due, hearing_date, served_upon, served_by, case_number")
        .eq("id", data.legal_document_id)
        .single(),
    ]);

    if (!workshop?.google_calendar_id) {
      return { ok: false as const, error: "No Google Calendar bound to this Workshop. Pick one first." };
    }
    if (!doc) return { ok: false as const, error: "Legal document not found." };

    const anchorIso = (doc as Record<string, string | null>)[data.anchor];
    if (!anchorIso) {
      return { ok: false as const, error: `Document has no ${data.anchor}.` };
    }

    const eventAt = new Date(anchorIso);
    // All-day event on the anchor date
    const ymd = eventAt.toISOString().slice(0, 10);
    const ymdNext = new Date(eventAt.getTime() + 86400000).toISOString().slice(0, 10);

    const calId = encodeURIComponent(workshop.google_calendar_id);
    const body = {
      summary: data.event_title,
      description:
        data.summary +
        (doc.case_number ? `\n\nCase No.: ${doc.case_number}` : "") +
        ((doc.served_upon as string[] | null)?.length
          ? `\nServed upon: ${(doc.served_upon as string[]).join(", ")}`
          : "") +
        (doc.served_by ? `\nServed by: ${doc.served_by}` : ""),
      start: { date: ymd },
      end: { date: ymdNext },
      reminders: {
        useDefault: false,
        overrides: data.reminder_days.map((d) => ({
          method: "popup",
          minutes: d * 24 * 60,
        })),
      },
    };

    try {
      const res = (await gcFetch(`/calendars/${calId}/events`, {
        method: "POST",
        body: JSON.stringify(body),
      })) as { id: string; htmlLink?: string };

      await supabaseAdmin.from("legal_calendar_events").insert({
        workshop_id: data.workshop_id,
        legal_document_id: data.legal_document_id,
        google_calendar_id: workshop.google_calendar_id,
        google_event_id: res.id,
        anchor_used: data.anchor,
        event_at: eventAt.toISOString(),
        summary: data.event_title,
        reminder_days: data.reminder_days,
      });

      return { ok: true as const, google_event_id: res.id, html_link: res.htmlLink ?? null };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
    }
  });

// ─── cancelLegalEvent ──────────────────────────────────────────────────────
export const cancelLegalEvent = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ legal_calendar_event_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("legal_calendar_events")
      .select("google_calendar_id, google_event_id")
      .eq("id", data.legal_calendar_event_id)
      .single();
    if (!row) return { ok: false as const, error: "Event not found." };
    try {
      await gcFetch(
        `/calendars/${encodeURIComponent(row.google_calendar_id)}/events/${encodeURIComponent(row.google_event_id)}`,
        { method: "DELETE" },
      );
    } catch (e) {
      // Upstream may already be gone — continue with local delete.
      console.warn("Calendar delete failed:", e);
    }
    await supabaseAdmin.from("legal_calendar_events").delete().eq("id", data.legal_calendar_event_id);
    return { ok: true as const };
  });

// ─── listLegalEvents ───────────────────────────────────────────────────────
export const listLegalEvents = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ workshop_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("legal_calendar_events")
      .select("id, legal_document_id, anchor_used, event_at, summary, google_event_id, created_at")
      .eq("workshop_id", data.workshop_id)
      .order("event_at", { ascending: true });
    if (error) return { ok: false as const, error: error.message, events: [] };
    return { ok: true as const, events: rows ?? [] };
  });
