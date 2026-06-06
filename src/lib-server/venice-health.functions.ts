/**
 * Venice Health Check — one-time ping to verify VENICE_API_KEY.
 * Sends a single minimal /chat/completions call to Venice's cheapest text model
 * and returns a plain DTO. Reads the key inside the handler (never at module scope).
 */
import { createServerFn } from "@tanstack/react-start";

export type VeniceHealthResult = {
  ok: boolean;
  status: number;
  latency_ms: number;
  model_used: string;
  error: string | null;
  raw_snippet: string | null;
};

const VENICE_URL = "https://api.venice.ai/api/v1/chat/completions";
const CHEAP_MODEL = "llama-3.2-3b";

export const pingVenice = createServerFn({ method: "POST" }).handler(
  async (): Promise<VeniceHealthResult> => {
    const key = process.env.VENICE_API_KEY;
    if (!key) {
      return {
        ok: false,
        status: 0,
        latency_ms: 0,
        model_used: CHEAP_MODEL,
        error: "VENICE_API_KEY is not set in project secrets.",
        raw_snippet: null,
      };
    }

    const started = Date.now();
    try {
      const resp = await fetch(VENICE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: CHEAP_MODEL,
          max_tokens: 1,
          messages: [{ role: "user", content: "ping" }],
        }),
      });
      const latency_ms = Date.now() - started;
      const text = await resp.text();

      if (resp.ok) {
        return {
          ok: true,
          status: resp.status,
          latency_ms,
          model_used: CHEAP_MODEL,
          error: null,
          raw_snippet: null,
        };
      }

      let msg = `Venice returned ${resp.status}`;
      try {
        const j = JSON.parse(text);
        if (j?.error?.message) msg = j.error.message;
        else if (j?.message) msg = j.message;
      } catch {
        /* keep default */
      }

      return {
        ok: false,
        status: resp.status,
        latency_ms,
        model_used: CHEAP_MODEL,
        error: msg,
        raw_snippet: text.slice(0, 200),
      };
    } catch (e) {
      return {
        ok: false,
        status: 0,
        latency_ms: Date.now() - started,
        model_used: CHEAP_MODEL,
        error: e instanceof Error ? e.message : "Network error reaching Venice.",
        raw_snippet: null,
      };
    }
  },
);
