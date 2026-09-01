-- 0029_tour_amanah_note.sql
-- Amanah drives tour-booking decisions from their admin queue:
-- confirm / deny / ask-for-details. Their question lands here.

begin;
alter table public.tour_bookings add column if not exists amanah_note text;
commit;
