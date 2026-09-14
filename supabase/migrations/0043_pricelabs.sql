-- PriceLabs dynamic pricing: which PriceLabs listing feeds this home
alter table listing_pricing add column if not exists pricelabs_id text;
alter table listing_pricing add column if not exists pricelabs_pms text;
