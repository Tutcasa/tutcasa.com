-- 0015_email_automations.sql
-- Admin-manageable email automations (feature spec "E-mails" section):
-- each row is one automation — who gets it, when it fires, editable
-- subject/body with {{variables}}, and an enabled switch. Built-in rows
-- (the spec's 6 guest + 3 admin emails) can be edited/disabled but not
-- deleted; admins can add and remove their own custom automations.
-- Bodies are plain text with {{vars}}; the emails module wraps them in
-- the branded TutCasa HTML layout at send time.

begin;

create table if not exists public.email_automations (
  id           uuid primary key default gen_random_uuid(),
  key          text not null unique,     -- machine key, e.g. 'guest_booking_request'
  name         text not null,            -- shown in admin
  audience     text not null check (audience in ('guest','admin')),
  trigger_event text not null check (trigger_event in
    ('booking_request','booking_confirmed','second_payment_due',
     'payment_receipt','before_checkin','before_checkout','custom')),
  /** for before_checkin/before_checkout: days before the date (positive) */
  offset_days  int not null default 0 check (offset_days >= 0),
  enabled      boolean not null default true,
  builtin      boolean not null default false,
  subject      text not null,
  body         text not null,
  sort         int not null default 0,
  updated_at   timestamptz not null default now()
);
alter table public.email_automations enable row level security; -- server-only

insert into public.email_automations
  (key, name, audience, trigger_event, offset_days, builtin, subject, body, sort)
values
  ('guest_booking_request', 'Booking request received', 'guest', 'booking_request', 0, true,
   'We received your booking request — {{listing}}',
   'Hola {{guest_name}}! 👋\n\nThank you for choosing TutCasa. We''ve received your booking request:\n\n- {{listing}}\n- {{check_in}} → {{check_out}} · {{guests}} guests\n- Total: {{total}}\n\nThe owner is reviewing your request and we''ll get back to you shortly. No payment has been taken yet.\n\nQuestions? May is one message away on WhatsApp.', 10),

  ('guest_booking_confirmed', 'Booking request accepted', 'guest', 'booking_confirmed', 0, true,
   'Your stay is confirmed! 🎉 {{listing}}',
   'Hola {{guest_name}}!\n\nGreat news — your booking is confirmed:\n\n- {{listing}}\n- {{check_in}} → {{check_out}} · {{guests}} guests\n- Total: {{total}}\n\nYour invoice: {{invoice_link}}\n\nWe can''t wait to host you. May will be in touch on WhatsApp before your arrival.', 20),

  ('guest_second_payment_due', 'Second payment due', 'guest', 'second_payment_due', 0, true,
   'Your balance for {{listing}} is due',
   'Hola {{guest_name}},\n\nA friendly reminder that the remaining balance for your stay is due:\n\n- {{listing}}, {{check_in}} → {{check_out}}\n- Balance due: {{balance}} by {{balance_due_date}}\n\nPay securely here: {{invoice_link}}\n\nNeed more time or have a question? Just reply or message May on WhatsApp.', 30),

  ('guest_payment_receipt', 'Payment receipt', 'guest', 'payment_receipt', 0, true,
   'Payment received — thank you! ({{listing}})',
   'Hola {{guest_name}},\n\nWe''ve received your payment of {{amount_paid}} for:\n\n- {{listing}}, {{check_in}} → {{check_out}}\n\nYour invoice: {{invoice_link}}\n\nThank you — everything is on track for your stay!', 40),

  ('guest_before_checkin', 'Trip details (before check-in)', 'guest', 'before_checkin', 2, true,
   'Your trip is almost here! {{listing}} 🌴',
   'Hola {{guest_name}}!\n\nYour stay at {{listing}} starts on {{check_in}} — here''s everything you need:\n\n{{checkin_message}}\n\n- Check-in from: {{checkin_from}}\n- Address & directions: May will share the exact pin on WhatsApp\n\nSafe travels — see you soon!', 50),

  ('guest_before_checkout', 'Check-out instructions', 'guest', 'before_checkout', 1, true,
   'Check-out tomorrow — quick notes ({{listing}})',
   'Hola {{guest_name}},\n\nWe hope you''ve had a wonderful stay! A few notes for check-out tomorrow:\n\n{{checkout_message}}\n\n- Check-out until: {{checkout_until}}\n\nThank you for staying with TutCasa — we''d love to host you again. 💕', 60),

  ('admin_new_booking', 'New booking / request (team)', 'admin', 'booking_request', 0, true,
   'New {{booking_kind}}: {{listing}} · {{check_in}}',
   'New {{booking_kind}} received:\n\n- {{listing}}\n- {{check_in}} → {{check_out}} · {{guests}} guests\n- Guest: {{guest_name}} ({{guest_email}})\n- Total: {{total}}\n- Source: {{source}}\n\nManage it in the admin dashboard.', 70),

  ('admin_payment_due_reminder', 'Payment dues reminder (team)', 'admin', 'second_payment_due', 0, true,
   'Balance outstanding: {{listing}} · {{guest_name}}',
   'The balance for this booking is coming due:\n\n- {{listing}}, {{check_in}} → {{check_out}}\n- Guest: {{guest_name}} ({{guest_email}})\n- Balance: {{balance}} due {{balance_due_date}}\n\nThe guest has been reminded automatically.', 80),

  ('admin_payment_receipt', 'Payment received (team)', 'admin', 'payment_receipt', 0, true,
   'Payment in: {{amount_paid}} · {{listing}}',
   'A payment was completed:\n\n- {{listing}}, {{check_in}} → {{check_out}}\n- Guest: {{guest_name}}\n- Amount: {{amount_paid}} · Total: {{total}}\n- Invoice: {{invoice_link}}', 90)
on conflict (key) do nothing;

commit;
