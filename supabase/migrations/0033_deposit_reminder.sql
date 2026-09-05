-- 0033_deposit_reminder.sql
-- New timed trigger 'deposit_unpaid': N days after a booking is made and
-- the guest still hasn't paid the deposit, remind them (daily email sweep).
-- Also default the balance-due reminders to fire 3 days BEFORE the due
-- date instead of on the day itself (admin-editable in the emails page).

begin;

alter table public.email_automations
  drop constraint if exists email_automations_trigger_event_check;
alter table public.email_automations
  add constraint email_automations_trigger_event_check check (trigger_event in
    ('booking_request','booking_confirmed','second_payment_due',
     'payment_receipt','before_checkin','before_checkout',
     'deposit_unpaid','custom'));

insert into public.email_automations
  (key, name, audience, trigger_event, offset_days, builtin, subject, body, sort)
values
  ('guest_deposit_reminder', 'Deposit payment reminder', 'guest', 'deposit_unpaid', 2, true,
   'Complete your booking — {{listing}} is waiting for you',
   'Hola {{guest_name}}! 👋\n\nYour booking for {{listing}} ({{check_in}} → {{check_out}}) is almost ready — we''re just waiting for the deposit payment to secure your dates:\n\n- Total: {{total}}\n- Pay securely here: {{invoice_link}}\n\nYour dates aren''t locked in until the deposit is paid, so don''t wait too long!\n\nAny trouble paying or a question about the booking? Just reply or message us on WhatsApp.', 25)
on conflict (key) do nothing;

update public.email_automations set offset_days = 3
 where key in ('guest_second_payment_due','admin_payment_due_reminder')
   and offset_days = 0;

commit;
