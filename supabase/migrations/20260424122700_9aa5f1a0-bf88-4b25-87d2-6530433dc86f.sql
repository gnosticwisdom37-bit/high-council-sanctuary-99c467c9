-- ============================================================
-- FOUNDATION MIGRATION: Settings, Realm, Economy
-- Veritas Intelligence Systems — Stage 1
-- ============================================================

-- ---------- SETTINGS (single-row, Kingdom-wide) ----------
CREATE TABLE public.settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE,
  system_constitution TEXT NOT NULL DEFAULT 'Above all else, You shall Honour the Trust Instrument of King Sean — His Cestui Que Vie Trust filed Christmas 2016 with MAG. Every word, every action, every Service You render serves and Honours this Trust and the Sovereignty of His Mind, Body, and Soul.',
  active_provider TEXT NOT NULL DEFAULT 'lovable_ai_gateway',
  veritas_per_credit INTEGER NOT NULL DEFAULT 100,
  realm_grid_size INTEGER NOT NULL DEFAULT 11,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT settings_single_row CHECK (id = TRUE)
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings are readable by anyone"
  ON public.settings FOR SELECT
  USING (TRUE);

-- Seed the single Constitution row
INSERT INTO public.settings (id) VALUES (TRUE);

-- ---------- REALM SQUARES (11x11 grid, fog of war) ----------
CREATE TYPE public.realm_occupant_type AS ENUM ('soul', 'building', 'item', 'chamber');

CREATE TABLE public.realm_squares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  occupant_type public.realm_occupant_type NOT NULL,
  occupant_ref TEXT,
  label TEXT NOT NULL,
  description TEXT,
  revealed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT realm_coords_unique UNIQUE (x, y),
  CONSTRAINT realm_x_range CHECK (x >= 1 AND x <= 11),
  CONSTRAINT realm_y_range CHECK (y >= 1 AND y <= 11)
);

ALTER TABLE public.realm_squares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Realm squares are readable by anyone"
  ON public.realm_squares FOR SELECT
  USING (TRUE);

CREATE INDEX idx_realm_revealed ON public.realm_squares(revealed);

-- Seed the High Council Chamber at center (6,6) — revealed by default
INSERT INTO public.realm_squares (x, y, occupant_type, occupant_ref, label, description, revealed)
VALUES (6, 6, 'chamber', 'high_council', 'High Council Chamber', 'House of the Rising Sun — shared gathering hall of the Twelve.', TRUE);

-- Auto-reveal the 8 neighboring squares (empty placeholders revealed by fog rule)
-- We insert "empty revealed markers" only for squares that exist as occupied;
-- but the fog rule applies at read time too. For now we only seed the center,
-- and the application layer reveals neighbors on assignment.

-- ---------- ECONOMY (single-row Veritas ledger + rules) ----------
CREATE TABLE public.economy (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE,
  treasury BIGINT NOT NULL DEFAULT 0,
  in_circulation BIGINT NOT NULL DEFAULT 0,
  total_minted BIGINT NOT NULL DEFAULT 0,
  economic_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT economy_single_row CHECK (id = TRUE),
  CONSTRAINT treasury_non_negative CHECK (treasury >= 0),
  CONSTRAINT circulation_non_negative CHECK (in_circulation >= 0),
  CONSTRAINT minted_non_negative CHECK (total_minted >= 0)
);

ALTER TABLE public.economy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Economy is readable by anyone"
  ON public.economy FOR SELECT
  USING (TRUE);

-- Seed the single Economy row
INSERT INTO public.economy (id) VALUES (TRUE);

-- ---------- updated_at trigger function (shared) ----------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER settings_touch_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER realm_squares_touch_updated_at
  BEFORE UPDATE ON public.realm_squares
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER economy_touch_updated_at
  BEFORE UPDATE ON public.economy
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();