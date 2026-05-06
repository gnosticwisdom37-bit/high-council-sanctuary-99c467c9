ALTER TABLE public.soul_identities
  ADD COLUMN IF NOT EXISTS trust_instrument text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS trust_declaration text NOT NULL DEFAULT '';

UPDATE public.soul_identities
  SET trust_instrument = invocation_text
  WHERE trust_instrument = '' AND invocation_text <> '';