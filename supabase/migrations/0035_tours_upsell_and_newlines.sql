-- 0035_tours_upsell_and_newlines.sql
-- 1) The seed migrations wrote '\n' as literal backslash-n (standard SQL
--    string quoting), so bodies never had real line breaks — repair them.
-- 2) Add a tours & parks upsell line ({{tours_link}}) to the booking
--    emails and the check-out email.

begin;

update public.email_automations
   set body = replace(body, '\n', E'\n')
 where body like '%\n%';

update public.email_automations
   set body = body || E'\n\n' ||
       '🌴 Want to make your stay unforgettable? Add a tour, park day or activity to your trip: {{tours_link}}'
 where key in ('guest_booking_request', 'guest_booking_confirmed')
   and body not like '%tours_link%';

update public.email_automations
   set body = body || E'\n\n' ||
       'One last adventure before you go — or a head start on your next visit? Our tours & parks are here: {{tours_link}}'
 where key = 'guest_before_checkout'
   and body not like '%tours_link%';

commit;
