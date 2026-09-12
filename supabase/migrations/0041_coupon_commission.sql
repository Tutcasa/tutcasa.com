-- Coupons handed to third parties (influencers, agencies): bookings that
-- use the coupon automatically get this % recorded as third-party
-- commission in the price breakdown.
alter table coupons add column if not exists commission_pct numeric;
