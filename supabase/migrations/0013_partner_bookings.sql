-- 0013_partner_bookings.sql
-- Partner booking flow (docs: amanah-website/docs/tutcasa-partner-booking-api.md):
-- Amanah sells TutCasa stays with payment taken on Amanah's checkout; TutCasa
-- stays the calendar authority via hold -> confirm -> release. Partner holds
-- reuse the bookings table (status='pending' + hold_expires_at + the
-- no_double_booking exclusion constraint = the required DB-level race safety).

begin;

alter table public.bookings drop constraint bookings_source_check;
alter table public.bookings add constraint bookings_source_check
  check (source in ('direct','airbnb','vrbo','booking','manual','amanah'));

alter table public.bookings drop constraint bookings_payment_provider_check;
alter table public.bookings add constraint bookings_payment_provider_check
  check (payment_provider in ('stripe','paypal','paymob','giftcard','manual','partner'));

alter table public.bookings
  add column if not exists partner_ref text,
  -- amount actually collected (cents) — partner bookings are paid in full;
  -- M2 (Stripe) will reuse this for deposit-split tracking
  add column if not exists amount_paid_cents int not null default 0
    check (amount_paid_cents >= 0);

create index if not exists idx_bookings_partner_ref on public.bookings (partner_ref)
  where partner_ref is not null;

commit;
