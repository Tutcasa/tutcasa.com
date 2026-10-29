-- Second half of 0062 (apply AFTER the deploy that targets the new index):
-- the old per-booking key would still block a second payment's receipt.
drop index if exists uniq_notif_booking_recipient;
