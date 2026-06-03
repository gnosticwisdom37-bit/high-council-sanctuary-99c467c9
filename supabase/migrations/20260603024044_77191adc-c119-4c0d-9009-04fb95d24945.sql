
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  organization TEXT NOT NULL DEFAULT '',
  role_title TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO anon, authenticated;
GRANT ALL ON public.contacts TO service_role;

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contacts readable by anyone" ON public.contacts FOR SELECT USING (true);
CREATE POLICY "Contacts insertable by anyone" ON public.contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Contacts updatable by anyone" ON public.contacts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Contacts deletable by anyone" ON public.contacts FOR DELETE USING (true);

CREATE TRIGGER contacts_touch BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.contact_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_groups TO anon, authenticated;
GRANT ALL ON public.contact_groups TO service_role;

ALTER TABLE public.contact_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Groups readable by anyone" ON public.contact_groups FOR SELECT USING (true);
CREATE POLICY "Groups insertable by anyone" ON public.contact_groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Groups updatable by anyone" ON public.contact_groups FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Groups deletable by anyone" ON public.contact_groups FOR DELETE USING (true);

CREATE TRIGGER contact_groups_touch BEFORE UPDATE ON public.contact_groups
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.contact_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.contact_groups(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, contact_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_group_members TO anon, authenticated;
GRANT ALL ON public.contact_group_members TO service_role;

ALTER TABLE public.contact_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Group members readable by anyone" ON public.contact_group_members FOR SELECT USING (true);
CREATE POLICY "Group members insertable by anyone" ON public.contact_group_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Group members deletable by anyone" ON public.contact_group_members FOR DELETE USING (true);

CREATE INDEX idx_contact_group_members_group ON public.contact_group_members(group_id);
CREATE INDEX idx_contact_group_members_contact ON public.contact_group_members(contact_id);
CREATE INDEX idx_contacts_email_lower ON public.contacts(lower(email));
CREATE INDEX idx_contacts_name_lower ON public.contacts(lower(display_name));
