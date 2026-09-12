-- One-off guest blasts scheduled for a future date/time. The email-dispatch
-- cron (now every 15 min) sends the due ones.
create table if not exists scheduled_broadcasts (
  id uuid primary key default gen_random_uuid(),
  audience text not null,
  listing_id uuid,
  subject text not null,
  body text not null,
  send_at timestamptz not null,
  status text not null default 'scheduled', -- scheduled | sending | sent | cancelled
  result text,
  created_at timestamptz not null default now()
);
