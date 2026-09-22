-- Early check-in / late check-out: REQUESTED at booking (no charge),
-- decided automatically 48h before, paid only if confirmed, and the
-- adjacent night is blocked only once the guest has paid.
create table if not exists booking_extras (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  kind text not null check (kind in ('early_checkin','late_checkout')),
  fee_cents int not null,
  currency text not null default 'USD',
  -- requested → confirmed (payable) → paid | declined | expired | cancelled
  status text not null default 'requested'
    check (status in ('requested','confirmed','paid','declined','expired','cancelled')),
  payment_ref text unique,
  block_id uuid,
  decided_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists uniq_extra_per_booking_kind on booking_extras (booking_id, kind);
create index if not exists idx_extras_status on booking_extras (status);
