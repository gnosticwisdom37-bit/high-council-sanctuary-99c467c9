ALTER TABLE public.soul_conversations
  ADD COLUMN IF NOT EXISTS pending_recall_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];