-- Team members with their own admin login (email + password). The shared
-- ADMIN_PASSWORD keeps working as the owner login.
create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  password_hash text not null,          -- scrypt$<salt>$<hash>
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  created_by text
);
create unique index if not exists admin_users_email_uq on admin_users (lower(email));
alter table admin_users enable row level security; -- server-only (postgres role)
