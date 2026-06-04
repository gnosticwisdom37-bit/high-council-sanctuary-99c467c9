DO $$ BEGIN PERFORM cron.unschedule('dispatch-scheduled-mail'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'dispatch-scheduled-mail',
  '* * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://project--5548c05f-8aea-4910-b8db-2e5ca1f9bdfd-dev.lovable.app/api/public/dispatch-scheduled-mail',
    headers := jsonb_build_object('Content-Type','application/json'),
    body := '{}'::jsonb
  );
  $cron$
);