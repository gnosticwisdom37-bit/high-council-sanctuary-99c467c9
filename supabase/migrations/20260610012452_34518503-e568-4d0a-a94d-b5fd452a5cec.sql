ALTER TABLE public.toolbox_models
ADD COLUMN IF NOT EXISTS venice_tier text NOT NULL DEFAULT 'paid',
ADD COLUMN IF NOT EXISTS auto_fallback_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS fallback_rank integer;

ALTER TABLE public.toolbox_models
DROP CONSTRAINT IF EXISTS toolbox_models_venice_tier_check;

ALTER TABLE public.toolbox_models
ADD CONSTRAINT toolbox_models_venice_tier_check
CHECK (venice_tier IN ('pro', 'free', 'paid', 'image'));

CREATE INDEX IF NOT EXISTS toolbox_models_auto_fallback_idx
ON public.toolbox_models (auto_fallback_enabled, fallback_rank)
WHERE auto_fallback_enabled = true;