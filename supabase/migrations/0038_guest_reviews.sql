-- 0038_guest_reviews.sql
-- Real guest reviews on listings: guests get a review link after
-- check-out (new 'after_checkout' email trigger), submissions wait for
-- admin approval, published ones show on the listing page. The admin can
-- also add reviews by hand (e.g. imported from Airbnb).

begin;

create table if not exists public.listing_reviews (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings(id) on delete cascade,
  booking_id   uuid references public.bookings(id) on delete set null,
  guest_name   text not null,
  rating       int not null check (rating between 1 and 5),
  body         text not null,
  source       text not null default 'guest',   -- guest | airbnb | google | vrbo
  status       text not null check (status in ('pending','published')) default 'pending',
  stayed_at    date,
  created_at   timestamptz not null default now()
);
-- one review per booking
create unique index if not exists listing_reviews_booking
  on public.listing_reviews (booking_id) where booking_id is not null;
alter table public.listing_reviews enable row level security; -- server-only

alter table public.email_automations
  drop constraint if exists email_automations_trigger_event_check;
alter table public.email_automations
  add constraint email_automations_trigger_event_check check (trigger_event in
    ('booking_request','booking_confirmed','second_payment_due',
     'payment_receipt','before_checkin','before_checkout','after_checkout',
     'deposit_unpaid','double_booking','custom'));

insert into public.email_automations
  (key, name, audience, trigger_event, offset_days, builtin, subject, body, sort)
values
  ('guest_review_request', 'Review request (after check-out)', 'guest', 'after_checkout', 1, true,
   'How was your stay at {{listing}}?',
   E'Hola {{guest_name}}!\n\nThank you for staying with TutCasa — we hope {{listing}} felt like home.\n\nWould you take a minute to share how it went? Your review helps other guests and means the world to our family:\n\n{{review_link}}\n\nGracias — and we''d love to host you again. 💕', 65)
on conflict (key) do nothing;

commit;
