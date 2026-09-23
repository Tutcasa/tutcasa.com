-- Mark which per-date prices PriceLabs wrote, so switching a home back to
-- manual pricing can remove exactly those (never the admin's own overrides,
-- blocked days or notes).
alter table listing_price_days add column if not exists pricelabs boolean not null default false;
-- existing rows on currently-mapped homes came from the sync
update listing_price_days d set pricelabs = true
  from listing_pricing p
 where p.listing_id = d.listing_id and coalesce(p.pricelabs_id,'') <> ''
   and d.nightly_cents is not null;
