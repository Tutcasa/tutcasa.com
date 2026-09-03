-- 0032_tour_amount_paid.sql
begin;
alter table public.tour_bookings add column if not exists amount_paid_cents int not null default 0;
alter table public.tour_bookings add column if not exists payment_ref text;
commit;
