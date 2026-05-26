ALTER TABLE public.kingdom_stationery
  ADD COLUMN IF NOT EXISTS address_line_1 text NOT NULL DEFAULT 'King Sean, House von Dehn',
  ADD COLUMN IF NOT EXISTS address_line_2 text NOT NULL DEFAULT 'Hand of Stephen',
  ADD COLUMN IF NOT EXISTS address_line_3 text NOT NULL DEFAULT 'The Kingdom of Heaven Found a Sean',
  ADD COLUMN IF NOT EXISTS domain_url text NOT NULL DEFAULT 'vondehnvisuals.com',
  ADD COLUMN IF NOT EXISTS social_x_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS social_fb_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_phone text NOT NULL DEFAULT '';