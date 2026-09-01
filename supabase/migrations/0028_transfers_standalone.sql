-- 0028_transfers_standalone.sql
-- Transfers no longer require a booking: the team can send Amanah a
-- pickup/drop-off request any time. New guest-contact fields travel with
-- every request: WhatsApp number and the address + unit for the
-- non-airport end of the ride.

begin;

alter table public.transfers
  alter column booking_id drop not null,
  add column if not exists whatsapp text,
  add column if not exists address text;

commit;
