UPDATE public.settings
SET provider_compact = jsonb_set(
  jsonb_set(
    provider_compact::jsonb,
    '{active_provider}', '"venice"'::jsonb, true
  ),
  '{fallback_chain}',
  '["zai-org-glm-4.7","llama-3.3-70b","deepseek-v3.2"]'::jsonb,
  true
)
WHERE id = true;