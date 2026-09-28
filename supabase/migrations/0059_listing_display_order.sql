-- Admin-chosen position on the site (1 = first). Null = after the numbered ones.
alter table listings add column if not exists display_order int;
