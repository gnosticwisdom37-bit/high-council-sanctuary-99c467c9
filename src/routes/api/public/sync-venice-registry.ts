/**
 * Public sync endpoint — pg_cron hits this daily (~04:00 UTC) to refresh
 * the Venice model catalogue. Safe to expose: it only fetches a free
 * public model list and upserts it; no secrets, no PII, no destructive ops.
 * Manual GET also allowed for easy testing.
 */
import { createFileRoute } from "@tanstack/react-router";
import { runVeniceSync } from "@/lib-server/venice-registry.functions";

async function run() {
  const result = await runVeniceSync();
  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 500,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/sync-venice-registry")({
  server: {
    handlers: {
      POST: async () => run(),
      GET: async () => run(),
    },
  },
});
