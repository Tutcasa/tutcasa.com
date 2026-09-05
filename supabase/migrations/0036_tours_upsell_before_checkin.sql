-- 0036_tours_upsell_before_checkin.sql
-- Same tours & parks upsell line in the pre-arrival "Trip details" email.

begin;

update public.email_automations
   set body = body || E'\n\n' ||
       '🌴 Want to make your stay unforgettable? Add a tour, park day or activity to your trip: {{tours_link}}'
 where key = 'guest_before_checkin'
   and body not like '%tours_link%';

commit;
