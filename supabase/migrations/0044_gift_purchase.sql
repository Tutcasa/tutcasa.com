-- Guest-purchased gift cards: one card per Stripe payment (dedupes webhook retries)
alter table gift_cards add column if not exists payment_ref text unique;
