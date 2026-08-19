-- Orbitly Discord 알림 Cron 설정입니다. 먼저 아래 두 placeholder를 실제 값으로 바꾼 뒤 Supabase SQL Editor에서 실행합니다.
-- ORBITLY_PROJECT_URL: .env.local의 NEXT_PUBLIC_SUPABASE_URL 값입니다.
-- ORBITLY_PUBLISHABLE_KEY: .env.local의 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 값입니다.
-- 이 SQL은 재실행해도 기존 Vault 값을 갱신하고, 동일 이름의 Cron 작업을 다시 만듭니다.

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare
  project_url_secret_id uuid;
  publishable_key_secret_id uuid;
begin
  select id into project_url_secret_id from vault.secrets where name = 'orbitly_project_url';
  if project_url_secret_id is null then
    perform vault.create_secret('ORBITLY_PROJECT_URL', 'orbitly_project_url');
  else
    perform vault.update_secret(project_url_secret_id, 'ORBITLY_PROJECT_URL', 'orbitly_project_url');
  end if;

  select id into publishable_key_secret_id from vault.secrets where name = 'orbitly_publishable_key';
  if publishable_key_secret_id is null then
    perform vault.create_secret('ORBITLY_PUBLISHABLE_KEY', 'orbitly_publishable_key');
  else
    perform vault.update_secret(publishable_key_secret_id, 'ORBITLY_PUBLISHABLE_KEY', 'orbitly_publishable_key');
  end if;
end $$;

select cron.unschedule(jobid)
from cron.job
where jobname in ('orbitly-discord-reminder-17', 'orbitly-discord-reminder-47');

-- KST: 09:17, 12:17, 15:17, 18:17, 21:17, 00:17
select cron.schedule(
  'orbitly-discord-reminder-17',
  '17 0,3,6,9,12,15 * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'orbitly_project_url') || '/functions/v1/orbitly-discord-reminder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'orbitly_publishable_key')
      ),
      body := '{}'::jsonb
    );
  $$
);

-- KST: 10:47, 13:47, 16:47, 19:47, 22:47, 01:47
select cron.schedule(
  'orbitly-discord-reminder-47',
  '47 1,4,7,10,13,16 * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'orbitly_project_url') || '/functions/v1/orbitly-discord-reminder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'orbitly_publishable_key')
      ),
      body := '{}'::jsonb
    );
  $$
);

-- 등록 확인: cron.job은 예약 작업의 이름과 Cron 식을 보관하는 시스템 테이블입니다.
select jobname, schedule
from cron.job
where jobname in ('orbitly-discord-reminder-17', 'orbitly-discord-reminder-47')
order by jobname;
