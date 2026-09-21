-- Visible PriceLabs status: when the last sync ran and how many nights it wrote.
alter table listing_pricing add column if not exists pricelabs_synced_at timestamptz;
alter table listing_pricing add column if not exists pricelabs_synced_days int;
-- the legacy flag mirrors the mapping from now on
update listing_pricing set dynamic_pricing = (pricelabs_id is not null and pricelabs_id <> '');
