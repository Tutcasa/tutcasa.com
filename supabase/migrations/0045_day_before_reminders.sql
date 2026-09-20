-- "Tomorrow is the day" reminders: a 1-day stay reminder (reusing the
-- before_checkin trigger) and a new before_tour trigger for tour bookings.
alter table email_automations drop constraint if exists email_automations_trigger_event_check;
alter table email_automations add constraint email_automations_trigger_event_check
  check (trigger_event in ('booking_request','booking_confirmed','second_payment_due','payment_receipt',
                           'before_checkin','before_checkout','after_checkout','deposit_unpaid',
                           'double_booking','before_tour','custom'));

insert into email_automations (key, name, audience, trigger_event, offset_days, builtin, subject, body, sort)
values
('guest_day_before_checkin', 'Day-before reminder (stay)', 'guest', 'before_checkin', 1, true,
 'Tomorrow is the day! 🌴 Your stay at {{listing}}',
 E'Hola {{guest_name}}!\n\nJust a friendly reminder: your stay at {{listing}} starts TOMORROW, {{check_in}}.\n\n- Check-in from: {{checkin_from}}\n- Guests: {{guests}}\n\n{{checkin_message}}\n\nSafe travels — we can''t wait to welcome you! If anything comes up, reply to this email or message us on WhatsApp.',
 26),
('guest_day_before_tour', 'Day-before reminder (tour)', 'guest', 'before_tour', 1, true,
 'Tomorrow is the day! 🎒 Your tour: {{tour}}',
 E'Hola {{guest_name}}!\n\nYour tour is TOMORROW:\n\n- Tour: {{tour}}\n- Date: {{tour_date}}\n- People: {{guests}}\n\nPlease be ready at your pickup point a few minutes early, bring sunscreen, water and your camera. 📸\n\nQuestions? Reply to this email or message us on WhatsApp — see you tomorrow!',
 27)
on conflict (key) do nothing;
