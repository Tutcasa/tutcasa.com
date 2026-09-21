-- Explicit, admin-controlled filter features per home. The stays filters
-- read ONLY these (never keyword-guess from imported amenity text).
alter table listings add column if not exists features text[] not null default '{}';
