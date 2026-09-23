-- Why a mapped home has no PriceLabs prices (e.g. a channel mirror was picked).
alter table listing_pricing add column if not exists pricelabs_error text;
