-- Admin deletes go here first: a full snapshot (row + child rows) that can
-- be restored for 30 days, then pg_cron removes it for good.
create table if not exists trash (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('stay','tour','gift_card')),
  record_id uuid not null,
  label text not null,
  data jsonb not null,
  deleted_at timestamptz not null default now()
);
alter table trash enable row level security; -- server-only (postgres role)

select cron.unschedule('tutcasa-trash-purge')
  where exists (select 1 from cron.job where jobname = 'tutcasa-trash-purge');
select cron.schedule('tutcasa-trash-purge', '30 4 * * *',
  $$delete from trash where deleted_at < now() - interval '30 days'$$);
