-- A payment receipt is one email PER PAYMENT, not per booking: the unique
-- key (kind, booking, recipient) silently dropped every receipt after the
-- first (e.g. the balance payment). event_ref (the payment ref) makes
-- repeatable events distinct; one-time emails leave it null and keep
-- their exactly-once guarantee. Apply BEFORE deploying the code that
-- targets this index; 0063 drops the old index AFTER that deploy.
alter table notifications_log add column if not exists event_ref text;

create unique index if not exists uniq_notif_booking_recipient_event
  on notifications_log (kind, booking_id, recipient, coalesce(event_ref, ''))
  where booking_id is not null;
