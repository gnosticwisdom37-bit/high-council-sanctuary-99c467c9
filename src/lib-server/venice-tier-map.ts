/**
 * Venice tier map — the curated source of truth for which Venice models
 * are Included-with-Pro vs Free-fallback vs Paid-blocked.
 *
 * Venice's API does NOT expose a Pro-vs-Free flag. The split only lives
 * on venice.ai's UI. King Sean's brochure pastes are committed alongside
 * this file at:
 *   - src/data/venice-pro-models.txt   (25 names, in priority order)
 *   - src/data/venice-free-models.txt  (11 names, in priority order)
 *
 * When Venice changes their tiers, update the .txt files for the human
 * record AND update PRO_IDS / FREE_IDS below for the machine. Keep
 * order identical between .txt and array — fallback_rank follows array
 * order, so the first entry is the most-preferred Pro model.
 *
 * Anything live on Venice but absent from both arrays is tagged "paid"
 * and excluded from the Bank's auto-fallback chain. Image models
 * (type==="image") are tagged "image" regardless.
 */

/** Pro models, in fallback-priority order. Ranks 1..25. */
export const PRO_IDS: readonly string[] = [
  "e2ee-gemma-4-26b-a4b-uncensored-p", // 1. Gemma 4 26B A4B Uncensored (TEE)
  "e2ee-qwen3-6-35b-a3b-uncensored-p", // 2. Qwen3.6 35B A3B Uncensored (TEE)
  "qwen3-6-27b",                        // 3. Qwen 3.6 27B
  "deepseek-v4-flash",                  // 4. DeepSeek V4 Flash
  "e2ee-glm-5-1",                       // 5. GLM 5.1 (TEE)
  "gemma-4-uncensored",                 // 6. Gemma 4 Uncensored
  "zai-org-glm-5-1",                    // 7. GLM 5.1 (Private)
  "google-gemma-4-31b-it",              // 8. Google Gemma 4 31B Instruct
  "google-gemma-4-26b-a4b-it",          // 9. Google Gemma 4 26B A4B Instruct
  "aion-labs-aion-2-0",                 // 10. Aion 2.0
  "e2ee-venice-uncensored-24b-p",       // 11. Venice Uncensored 1.1 (TEE)
  "e2ee-gemma-3-27b-p",                 // 12. Gemma 3 27B (TEE)
  "e2ee-glm-4-7-p",                     // 13. GLM 4.7 (TEE)
  "e2ee-glm-4-7-flash-p",               // 14. GLM 4.7 Flash (TEE)
  "e2ee-gpt-oss-20b-p",                 // 15. GPT OSS 20B (TEE)
  "e2ee-gpt-oss-120b-p",                // 16. GPT OSS 120B (TEE)
  "e2ee-qwen-2-5-7b-p",                 // 17. Qwen 2.5 7B (TEE)
  "e2ee-qwen3-30b-a3b-p",               // 18. Qwen3 30B A3B (TEE)
  "e2ee-qwen3-vl-30b-a3b-p",            // 19. Qwen3 VL 30B A3B (TEE)
  "qwen3-5-35b-a3b",                    // 20. Qwen 3.5 35B A3B
  "venice-uncensored-role-play",        // 21. Venice Role Play Uncensored
  "zai-org-glm-5",                      // 22. GLM 5
  "qwen3-vl-235b-a22b",                 // 23. Qwen3 VL 235B
  "zai-org-glm-4.7",                    // 24. GLM 4.7 (Private)
  "deepseek-v3.2",                      // 25. DeepSeek V3.2
] as const;

/** Free models, in fallback-priority order. Ranks 101..111 (always after Pro). */
export const FREE_IDS: readonly string[] = [
  "nvidia-nemotron-3-ultra-550b-a55b",   // 1. NVIDIA Nemotron 3 Ultra
  "e2ee-qwen3-6-35b-a3b",                // 2. Qwen 3.6 35B A3B FP8 (TEE)
  "e2ee-gemma-4-31b",                    // 3. Gemma 4 31B Instruct (TEE)
  "venice-uncensored-1-2",               // 4. Venice Uncensored 1.2
  "nvidia-nemotron-cascade-2-30b-a3b",   // 5. Nemotron Cascade 2 30B A3B
  "qwen3-5-9b",                          // 6. Qwen 3.5 9B
  "olafangensan-glm-4.7-flash-heretic",  // 7. GLM 4.7 Flash Heretic
  "zai-org-glm-4.7-flash",               // 8. GLM 4.7 Flash
  "qwen3-coder-480b-a35b-instruct-turbo",// 9. Qwen 3 Coder 480B Turbo
  "nvidia-nemotron-3-nano-30b-a3b",      // 10. NVIDIA Nemotron 3 Nano 30B
  "zai-org-glm-4.6",                     // 11. GLM 4.6
] as const;

const PRO_SET = new Set(PRO_IDS);
const FREE_SET = new Set(FREE_IDS);
const PRO_RANK = new Map(PRO_IDS.map((id, i) => [id, i + 1]));
const FREE_RANK = new Map(FREE_IDS.map((id, i) => [id, 101 + i]));

export type VeniceTier = "pro" | "free" | "paid" | "image";

export function tierFor(modelId: string, type: string | null | undefined): VeniceTier {
  if (type === "image") return "image";
  if (PRO_SET.has(modelId)) return "pro";
  if (FREE_SET.has(modelId)) return "free";
  return "paid";
}

export function rankFor(modelId: string): number | null {
  return PRO_RANK.get(modelId) ?? FREE_RANK.get(modelId) ?? null;
}

/**
 * Returns the curated IDs that did NOT appear in the live Venice
 * model list — i.e. names King Sean expects to be available that
 * Venice no longer ships. The UI surfaces these so He can update
 * the .txt files and this array.
 */
export function unmatchedAgainst(liveIds: Iterable<string>): {
  pro_missing: string[];
  free_missing: string[];
} {
  const live = new Set(liveIds);
  return {
    pro_missing: PRO_IDS.filter((id) => !live.has(id)),
    free_missing: FREE_IDS.filter((id) => !live.has(id)),
  };
}

/** Full ordered fallback chain: Pro first (by rank), then Free (by rank). */
export const FULL_FALLBACK_CHAIN: readonly string[] = [...PRO_IDS, ...FREE_IDS];
