UPDATE public.kingdom_stationery
SET logo_url = 'https://pzhpdruusylknxlhmuzr.supabase.co/storage/v1/object/public/kingdom-assets/logo.png',
    thumbprint_url = 'https://pzhpdruusylknxlhmuzr.supabase.co/storage/v1/object/public/kingdom-assets/thumbprint.png',
    updated_at = now()
WHERE id = true;