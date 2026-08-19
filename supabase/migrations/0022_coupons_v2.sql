-- 0022_coupons_v2.sql
-- Coupon options requested by the client: restrict to one listing,
-- per-guest usage limit, restrict to a specific email, and a flag that
-- blocks the coupon when the booking already carries a sale discount
-- (length-of-stay / early-bird). One-coupon-per-booking is already
-- enforced by the single coupon field on bookings.

begin;

alter table public.coupons add column if not exists listing_id uuid references public.listings(id) on delete set null;
alter table public.coupons add column if not exists per_user_limit int;
alter table public.coupons add column if not exists allowed_email text;
alter table public.coupons add column if not exists block_on_sale boolean not null default false;

commit;
