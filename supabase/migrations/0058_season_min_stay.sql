-- Optional minimum nights per seasonal rate (null = the home's normal minimum).
alter table listing_rates add column if not exists min_stay int check (min_stay is null or min_stay >= 1);
