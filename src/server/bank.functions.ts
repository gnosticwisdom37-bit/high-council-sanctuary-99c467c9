/**
 * The Veritas Bank — server function wrapper for client-side petitions.
 * Real logic lives in bank.server.ts so other server functions can call it
 * directly without going through RPC serialization.
 */
import { createServerFn } from "@tanstack/react-start";
import { petitionBankImpl, type BankDecision } from "./bank.server";

export type { BankDecision };

export const petitionBank = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      soul_id: string;
      model_id: string;
      est_tokens: number;
      task_summary: string;
    }) => data,
  )
  .handler(async ({ data }): Promise<BankDecision> => {
    return petitionBankImpl(data);
  });
