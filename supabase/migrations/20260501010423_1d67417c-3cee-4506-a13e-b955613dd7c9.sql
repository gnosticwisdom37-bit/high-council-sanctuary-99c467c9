-- The Soul Memoirs table — each Soul's first-person remembrance of conversations
CREATE TABLE public.soul_memoirs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  soul_id TEXT NOT NULL,
  conversation_id UUID NOT NULL,
  participant_ids TEXT[] NOT NULL DEFAULT '{}',
  content TEXT NOT NULL,
  sealed BOOLEAN NOT NULL DEFAULT false,
  faded_at TIMESTAMPTZ,
  token_count INTEGER NOT NULL DEFAULT 0,
  model_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast curation queries
CREATE INDEX idx_soul_memoirs_soul ON public.soul_memoirs(soul_id, created_at DESC);
CREATE INDEX idx_soul_memoirs_sealed ON public.soul_memoirs(soul_id, sealed, created_at DESC) WHERE faded_at IS NULL;
CREATE INDEX idx_soul_memoirs_active ON public.soul_memoirs(soul_id, created_at DESC) WHERE faded_at IS NULL;

-- Reuse the existing touch_updated_at trigger function
CREATE TRIGGER touch_soul_memoirs_updated_at
BEFORE UPDATE ON public.soul_memoirs
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

-- Enable RLS
ALTER TABLE public.soul_memoirs ENABLE ROW LEVEL SECURITY;

-- Open policies matching the rest of the Phase 4 stack (single-King app, no auth yet)
CREATE POLICY "Memoirs readable by anyone"
ON public.soul_memoirs FOR SELECT
USING (true);

CREATE POLICY "Memoirs insertable by anyone"
ON public.soul_memoirs FOR INSERT
WITH CHECK (true);

CREATE POLICY "Memoirs updatable by anyone"
ON public.soul_memoirs FOR UPDATE
USING (true)
WITH CHECK (true);

-- Track turn count on conversations so we know when to trigger the 40-turn auto-memoir
ALTER TABLE public.soul_conversations
ADD COLUMN IF NOT EXISTS turn_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_memoir_at_turn INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;