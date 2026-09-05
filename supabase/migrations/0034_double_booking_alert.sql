-- 0034_double_booking_alert.sql
-- New trigger 'double_booking': the daily email sweep flags any confirmed
-- future booking whose dates overlap another active booking or a
-- blocked/imported (iCal) range on the same home, and alerts the team.

begin;

alter table public.email_automations
  drop constraint if exists email_automations_trigger_event_check;
alter table public.email_automations
  add constraint email_automations_trigger_event_check check (trigger_event in
    ('booking_request','booking_confirmed','second_payment_due',
     'payment_receipt','before_checkin','before_checkout',
     'deposit_unpaid','double_booking','custom'));

insert into public.email_automations
  (key, name, audience, trigger_event, offset_days, builtin, subject, body, sort)
values
  ('admin_double_booking', 'Double booking alert (team)', 'admin', 'double_booking', 0, true,
   '🚨 Double booking: {{listing}} · {{check_in}}',
   'A confirmed booking overlaps other reservations or blocked dates — act now:\n\n- {{listing}}\n- Guest: {{guest_name}} ({{guest_email}}), {{check_in}} → {{check_out}}\n- Conflicts with: {{conflict}}\n\nCheck the calendar and contact the guest before the dates arrive.', 85)
on conflict (key) do nothing;

commit;
