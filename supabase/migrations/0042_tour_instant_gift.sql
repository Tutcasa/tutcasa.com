-- Non-Amanah tours can choose instant booking (pay at checkout) or
-- request-first (default), same choice stays have.
alter table tours add column if not exists instant_book boolean not null default false;
-- Gift cards applied to stay bookings (redeemed value mirrors coupons)
alter table bookings add column if not exists gift_card_id uuid references gift_cards(id);
alter table bookings add column if not exists gift_card_cents int not null default 0;
