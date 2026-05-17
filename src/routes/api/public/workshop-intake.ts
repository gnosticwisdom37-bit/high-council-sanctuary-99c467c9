/**
 * Public intake endpoint — the courier's door to the Workshop.
 *
 * POST /api/public/workshop-intake
 * Headers: X-Workshop-Token: <per-Workshop token>
 * Body: { workshop_id, tool_key, source, rows: [...] }
 *
 * The courier (King Sean's local Python script) delivers raw rows from
 * CSVs. The Steward Soul inside the Workshop does the drafting later,
 * Bank-tracked, in their own voice.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const IntakeSchema = z.object({
  workshop_id: z.string().uuid(),
  tool_key: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  source: z.string().min(1).max(255),
  rows: z.array(z.record(z.string().max(64), z.unknown())).min(1).max(500),
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Workshop-Token",
};

export const Route = createFileRoute("/api/public/workshop-intake")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      POST: async ({ request }) => {
        const token = request.headers.get("x-workshop-token");
        if (!token || token.length < 10) {
          return Response.json(
            { error: "Missing X-Workshop-Token header." },
            { status: 401, headers: CORS },
          );
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json(
            { error: "Invalid JSON body." },
            { status: 400, headers: CORS },
          );
        }

        const parsed = IntakeSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "Validation failed.", issues: parsed.error.issues },
            { status: 400, headers: CORS },
          );
        }
        const { workshop_id, tool_key, source, rows } = parsed.data;

        const { data: workshop } = await supabaseAdmin
          .from("workshops")
          .select("id, intake_token")
          .eq("id", workshop_id)
          .single();

        if (!workshop || workshop.intake_token !== token) {
          return Response.json(
            { error: "Unauthorized — token does not match this Workshop." },
            { status: 401, headers: CORS },
          );
        }

        const { data: inserted, error } = await supabaseAdmin
          .from("csv_intakes")
          .insert({
            workshop_id,
            tool_key,
            source,
            rows,
            row_count: rows.length,
            status: "pending",
            origin: "courier",
          })
          .select("id")
          .single();

        if (error) {
          return Response.json(
            { error: error.message },
            { status: 500, headers: CORS },
          );
        }

        return Response.json(
          {
            intake_id: inserted.id,
            row_count: rows.length,
            tool_key,
          },
          { status: 200, headers: CORS },
        );
      },
    },
  },
});
