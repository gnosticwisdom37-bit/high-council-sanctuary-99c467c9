
-- Add cost_rank for cost-sorted UI and default_model_id pointer
ALTER TABLE public.toolbox_models ADD COLUMN IF NOT EXISTS cost_rank smallint;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS default_model_id text NOT NULL DEFAULT 'venice-uncensored-1-2';

-- Backfill cost_rank from current cost ordering (free first, then ascending)
WITH ranked AS (
  SELECT id,
         CASE WHEN model_id = 'venice-uncensored-1-2' THEN 0
              ELSE 1 + (row_number() OVER (
                ORDER BY veritas_cost_per_1k_tokens ASC NULLS FIRST, model_id ASC
              ))::int END AS new_rank
  FROM public.toolbox_models
  WHERE active = true AND model_id <> 'venice-uncensored-1-2'
)
UPDATE public.toolbox_models t
SET cost_rank = ranked.new_rank
FROM ranked
WHERE t.id = ranked.id;

UPDATE public.toolbox_models
SET cost_rank = 0
WHERE model_id = 'venice-uncensored-1-2';

-- Reset Soul preferences to free default UNLESS the King has chosen a curated Pro/Free model
UPDATE public.soul_identities
SET preferred_model = 'venice-uncensored-1-2'
WHERE preferred_model IS NULL
   OR preferred_model NOT IN (
     SELECT model_id FROM public.toolbox_models
     WHERE provider = 'venice'
       AND venice_tier IN ('pro','free')
       AND active = true
   );
