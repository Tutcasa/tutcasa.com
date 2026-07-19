-- ============================================================
-- Partner tours: categories + notification log
-- ============================================================

alter table public.tours
  add column if not exists category text not null default 'tour'
    check (category in ('tour','park')),
  add column if not exists duration_label text;

-- allow price 0 for on-request items (kept as drafts until priced)
alter table public.tours drop constraint if exists tours_price_cents_check;
alter table public.tours add constraint tours_price_cents_check check (price_cents >= 0);

-- Every outbound partner/guest notification is recorded here, so the
-- admin can see what was sent, what failed, and retry manually.
create table if not exists public.notifications_log (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null,          -- 'tour_booking_partner_email' | 'tour_booking_tutcasa_email' | ...
  channel         text not null check (channel in ('email','whatsapp')),
  recipient       text not null,
  subject         text,
  body            text,
  tour_booking_id uuid references public.tour_bookings(id),
  booking_id      uuid references public.bookings(id),
  status          text not null default 'pending'
                  check (status in ('pending','sent','failed','manual')),
  error           text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_notif_tour_booking on public.notifications_log (tour_booking_id);

alter table public.notifications_log enable row level security;
-- server-role access only; no public policies.
