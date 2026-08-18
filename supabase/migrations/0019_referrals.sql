-- 0019_referrals.sql
-- Loyalty referral links: each referrer gets a shareable code whose
-- coupon gives their friend $100 off; when a booking using it is
-- CONFIRMED, the referrer automatically receives a $200 coupon by email
-- (one reward per booking, tracked in referral_rewards).

begin;

create table if not exists public.referrals (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,       -- e.g. REF-7K2M9Q (also the friend coupon code)
  referrer_name  text not null,
  referrer_email text not null,
  created_at     timestamptz not null default now()
);
create index if not exists idx_referrals_email on public.referrals (referrer_email);

create table if not exists public.referral_rewards (
  booking_id   uuid primary key references public.bookings(id) on delete cascade,
  referral_id  uuid not null references public.referrals(id) on delete cascade,
  reward_code  text not null,                -- the $200 coupon issued to the referrer
  created_at   timestamptz not null default now()
);

alter table public.referrals enable row level security;        -- server-only
alter table public.referral_rewards enable row level security; -- server-only

commit;
