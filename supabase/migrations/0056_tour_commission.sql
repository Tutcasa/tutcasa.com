-- Third-party commission % on our tours (copied onto each booking, like
-- listings), and TutCasa's cut from Amanah on Amanah tours (null = auto rule).
alter table tours add column if not exists commission_pct numeric(5,2) not null default 0;
alter table tour_bookings add column if not exists commission_pct numeric(5,2) not null default 0;
alter table tour_bookings add column if not exists partner_pct numeric(5,2);
