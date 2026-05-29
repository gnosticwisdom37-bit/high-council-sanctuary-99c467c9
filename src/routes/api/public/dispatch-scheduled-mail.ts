/**
 * Public dispatcher — pg_cron hits this every minute to deliver any
 * scheduled letter whose send_at has arrived.
 */
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { dispatchScheduledRow } from "@/server/inbox.functions";

async function dispatch() {
  const now = new Date().toISOString();
  const { data: due, error } = await supabaseAdmin
    .from("scheduled_emails")
    .select("id, kind, thread_id, to_addr, cc_addr, bcc_addr, subject, body_html, editor_soul_id, ink_color, notice_header_html")
    .eq("status", "pending")
    .lte("send_at", now)
    .limit(20);

  if (error) {
    return { ok: false, error: error.message, processed: 0 };
  }
  if (!due || due.length === 0) return { ok: true, processed: 0 };

  let sent = 0;
  let failed = 0;
  for (const row of due) {
    // Claim the row first so concurrent runs don't double-send
    const { data: claimed } = await supabaseAdmin
      .from("scheduled_emails")
      .update({ status: "sending" })
      .eq("id", row.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    const result = await dispatchScheduledRow({
      data: {
        id: row.id as string,
        kind: row.kind as string,
        thread_id: (row.thread_id as string | null) ?? null,
        to_addr: row.to_addr as string,
        cc_addr: (row.cc_addr as string) ?? "",
        bcc_addr: (row.bcc_addr as string) ?? "",
        subject: row.subject as string,
        body_html: row.body_html as string,
        editor_soul_id: row.editor_soul_id as string,
      },
    });


    if (result.ok) {
      await supabaseAdmin
        .from("scheduled_emails")
        .update({ status: "sent", sent_at: new Date().toISOString(), last_error: null })
        .eq("id", row.id);
      sent++;
    } else {
      await supabaseAdmin
        .from("scheduled_emails")
        .update({ status: "failed", last_error: result.error })
        .eq("id", row.id);
      failed++;
    }
  }
  return { ok: true, processed: due.length, sent, failed };
}

export const Route = createFileRoute("/api/public/dispatch-scheduled-mail")({
  server: {
    handlers: {
      POST: async () => {
        const result = await dispatch();
        return new Response(JSON.stringify(result), {
          status: result.ok ? 200 : 500,
          headers: { "Content-Type": "application/json" },
        });
      },
      GET: async () => {
        // Allow manual trigger for testing.
        const result = await dispatch();
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
