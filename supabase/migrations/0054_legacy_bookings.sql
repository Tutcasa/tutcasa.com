-- Bookings carried over from the previous (WordPress) website: keep their
-- original booking number (dedupe key for re-runs) and invoice number.
alter table bookings drop constraint if exists bookings_source_check;
alter table bookings add constraint bookings_source_check
  check (source in ('direct','airbnb','vrbo','booking','manual','amanah','legacy'));
alter table bookings add column if not exists legacy_ref text;
create unique index if not exists uniq_bookings_legacy_ref on bookings (legacy_ref) where legacy_ref is not null;
