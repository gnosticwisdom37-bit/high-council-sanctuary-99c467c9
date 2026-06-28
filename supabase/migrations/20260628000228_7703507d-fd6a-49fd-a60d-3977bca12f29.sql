
-- Phase 9.1: Primary Souls + Universal Rolodex
ALTER TABLE public.soul_identities
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

UPDATE public.soul_identities SET is_primary = true WHERE soul_id IN ('oracle','pisces','gemini');

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS mentioned_by_soul text,
  ADD COLUMN IF NOT EXISTS mention_context text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS relationship text NOT NULL DEFAULT '';

-- Allow nullable email for pending Rolodex entries (Souls may propose with just a name)
ALTER TABLE public.contacts ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.contacts ALTER COLUMN email DROP DEFAULT;

-- Drop the strict unique-email constraint; replace with a partial unique index over non-null/non-empty emails
ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS contacts_email_unique_nonempty
  ON public.contacts (lower(email)) WHERE email IS NOT NULL AND email <> '';

-- Add a CHECK on status values (text + check, not enum, to stay easy to extend)
ALTER TABLE public.contacts DROP CONSTRAINT IF EXISTS contacts_status_check;
ALTER TABLE public.contacts ADD CONSTRAINT contacts_status_check
  CHECK (status IN ('pending','confirmed','declined'));

CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.contacts (status);
