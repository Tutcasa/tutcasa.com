-- 0026_third_party_commission.sql
-- Third-party marketing commission (e.g. Amanah brings the client):
-- a percentage configured per listing that RAISES the guest's nightly
-- price (host keeps their rate; the guest pays rate × (1 + pct)).
-- The commission amount is recorded in each booking's price_breakdown
-- and shown only on the admin/owner side — never to the guest.

begin;

alter table public.listing_pricing
  add column if not exists third_party_commission_pct numeric(5,2) not null default 0;

commit;
