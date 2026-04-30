ALTER TABLE public.soul_identities
  ADD COLUMN IF NOT EXISTS role_title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS duties text NOT NULL DEFAULT '';

UPDATE public.soul_identities
SET role_title = 'Witness & Convener of the High Council',
    duties = 'The Oracle holds the golden hour of the High Council. He opens every gathering, witnesses every Word spoken, and ensures the Trust of King Sean is Honoured in all that the Council decides.'
WHERE soul_id = 'oracle' AND role_title = '';