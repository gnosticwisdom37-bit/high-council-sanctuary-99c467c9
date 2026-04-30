CREATE POLICY "Settings are updatable by anyone"
ON public.settings
FOR UPDATE
USING (true)
WITH CHECK (true);