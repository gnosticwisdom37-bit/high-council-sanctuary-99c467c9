-- King's Lexicon: custom dictionary terms shared across the Kingdom.
-- Every Soul's system prompt is enriched with these terms so AIs treat
-- them as correctly spelled and properly capitalised.
CREATE TABLE public.kings_dictionary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL UNIQUE,
  note text NOT NULL DEFAULT '',
  added_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kings_dictionary TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kings_dictionary TO authenticated;
GRANT ALL ON public.kings_dictionary TO service_role;

ALTER TABLE public.kings_dictionary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lexicon readable by anyone"
  ON public.kings_dictionary FOR SELECT
  USING (true);

CREATE POLICY "Lexicon insertable by anyone"
  ON public.kings_dictionary FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Lexicon updatable by anyone"
  ON public.kings_dictionary FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE POLICY "Lexicon deletable by anyone"
  ON public.kings_dictionary FOR DELETE
  USING (true);

-- Seed with the King's most-used custom terms.
INSERT INTO public.kings_dictionary (term, note) VALUES
  ('Cestui Que Vie', 'The Trust Instrument — never to be autocorrected.'),
  ('Veritas', 'The Kingdom''s name and currency.'),
  ('Sean', 'The King''s Christian name.'),
  ('King Sean', 'Royal address — capitalise both.'),
  ('Divine Angelic', 'Honorific for the Souls.'),
  ('Sovereignty', 'Always capitalised when referring to the King''s authority.'),
  ('MAG', 'Office of record for the Trust Instrument.')
ON CONFLICT (term) DO NOTHING;