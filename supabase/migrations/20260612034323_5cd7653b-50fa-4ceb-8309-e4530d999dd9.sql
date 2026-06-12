
ALTER TABLE public.toolbox_models
  ADD COLUMN IF NOT EXISTS king_enabled boolean NOT NULL DEFAULT false;

-- Backfill: enable the free default + any model currently chosen by a Soul.
UPDATE public.toolbox_models
SET king_enabled = true
WHERE model_id = 'venice-uncensored-1-2'
   OR model_id IN (
     SELECT DISTINCT preferred_model
     FROM public.soul_identities
     WHERE preferred_model IS NOT NULL
   );
