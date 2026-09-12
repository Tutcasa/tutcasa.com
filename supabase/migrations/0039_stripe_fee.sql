-- Exact Stripe fee per booking, pulled from the balance transaction by the
-- webhook after each successful payment (sums across deposit + balance).
alter table bookings add column if not exists stripe_fee_cents int;
alter table tour_bookings add column if not exists stripe_fee_cents int;
