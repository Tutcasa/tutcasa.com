-- 0025_notifications_status_sending.sql
-- The per-recipient email claim writes status='sending' first, but the
-- original check constraint only allowed pending/sent/failed/manual —
-- so EVERY booking-flow email threw (silently) at the claim insert.
-- This is why no request/confirmation emails ever reached anyone.

begin;

alter table public.notifications_log
  drop constraint if exists notifications_log_status_check;
alter table public.notifications_log
  add constraint notifications_log_status_check
  check (status in ('pending','sending','sent','failed','manual'));

commit;
