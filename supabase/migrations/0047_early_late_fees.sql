-- Optional early check-in / late check-out fees (0 = not offered).
-- Offered to a guest only when the adjacent night is vacant.
alter table listing_pricing add column if not exists early_checkin_cents int not null default 0;
alter table listing_pricing add column if not exists late_checkout_cents int not null default 0;
