-- ============================================================
-- TutCasa seed — the launch collection (8 homes)
-- Idempotent: re-running updates in place via slug conflict.
-- ============================================================

insert into public.listings
  (id, slug, title, city, country, region, lat, lng, property_type,
   max_guests, bedrooms, bathrooms, headline, description, amenities,
   min_stay, status, rating_cached, review_count_cached)
values
  ('c0a80101-0001-4000-8000-000000000001', 'spiritum-marea', 'Spiritum Marea',
   'Playa del Carmen', 'MX', 'Riviera Maya', 20.6540, -87.0680, 'condo',
   6, 2, 2.0, 'Oceanfront',
   'A bright oceanfront walkout in the gated Mareazul community, steps from a white-sand beach and three lagoon-style pools. Floor-to-ceiling windows open onto a private terrace with direct garden-to-beach access.',
   array['Beachfront access','Lagoon pools','Full kitchen','Air conditioning','Fast Wi-Fi','Washer','Free parking','WhatsApp concierge'],
   3, 'published', 4.94, 128),

  ('c0a80101-0002-4000-8000-000000000002', 'vista-playa', 'Vista Playa',
   'Playa del Carmen', 'MX', 'Riviera Maya', 20.6296, -87.0739, 'penthouse',
   8, 3, 3.0, 'Penthouse',
   'A rooftop penthouse with a private plunge pool and sweeping Caribbean views, two blocks from Quinta Avenida''s restaurants and nightlife.',
   array['Rooftop pool','Ocean view','Full kitchen','Air conditioning','Fast Wi-Fi','Elevator','WhatsApp concierge'],
   3, 'published', 4.87, 96),

  ('c0a80101-0003-4000-8000-000000000003', 'casa-selva', 'Casa Selva',
   'Tulum', 'MX', 'Riviera Maya', 20.2114, -87.4654, 'villa',
   10, 4, 4.0, 'Jungle villa',
   'A private jungle villa in Aldea Zamá with a 12-metre pool, outdoor kitchen and palapa lounge — five minutes from Tulum beach.',
   array['Private pool','Garden','Outdoor kitchen','Air conditioning','Fast Wi-Fi','Free parking','Family friendly','WhatsApp concierge'],
   4, 'published', 4.91, 74),

  ('c0a80101-0004-4000-8000-000000000004', 'nile-breeze', 'Nile Breeze',
   'Nuba', 'EG', 'Upper Egypt', 24.0889, 32.8998, 'house',
   8, 3, 2.0, 'Family',
   'A Nubian guesthouse on the banks of the Nile with a shaded roof terrace, home-cooked breakfast and felucca trips at sunset.',
   array['Nile view','Roof terrace','Breakfast included','Air conditioning','Wi-Fi','Family friendly','WhatsApp concierge'],
   2, 'published', 4.96, 63),

  ('c0a80101-0005-4000-8000-000000000005', 'palma-azul', 'Palma Azul',
   'Playa del Carmen', 'MX', 'Riviera Maya', 20.6300, -87.0800, 'condo',
   5, 2, 2.0, 'Private pool',
   'A calm garden condo with its own plunge pool in a palm-shaded residencial, a short bike ride from the beach clubs.',
   array['Private pool','Garden','Full kitchen','Air conditioning','Fast Wi-Fi','Family friendly','WhatsApp concierge'],
   2, 'published', 4.90, 58),

  ('c0a80101-0006-4000-8000-000000000006', 'coral-suite', 'Coral Suite',
   'Playa del Carmen', 'MX', 'Riviera Maya', 20.6250, -87.0700, 'condo',
   3, 1, 1.0, 'Beachfront',
   'A cosy beachfront suite for couples — wake to the sound of the waves, coffee on the balcony, toes in the sand in sixty seconds.',
   array['Beachfront access','Balcony','Kitchenette','Air conditioning','Fast Wi-Fi','WhatsApp concierge'],
   2, 'published', 4.85, 87),

  ('c0a80101-0007-4000-8000-000000000007', 'villa-maya', 'Villa Maya',
   'Tulum', 'MX', 'Riviera Maya', 20.2000, -87.4700, 'villa',
   12, 5, 5.0, 'Villa',
   'Our flagship five-bedroom estate: chef''s kitchen, heated pool, cinema room and staff quarters — built for celebrations and big family escapes.',
   array['Private pool','Chef''s kitchen','Cinema room','Garden','Air conditioning','Fast Wi-Fi','Free parking','WhatsApp concierge'],
   4, 'published', 4.98, 41),

  ('c0a80101-0008-4000-8000-000000000008', 'casa-sol', 'Casa Sol',
   'Orlando', 'US', 'Florida', 28.3852, -81.5639, 'house',
   10, 4, 3.0, 'Near parks',
   'A sunny four-bedroom home ten minutes from the Disney gates, with a screened pool, game room and space for the whole crew.',
   array['Private pool','Game room','Full kitchen','Air conditioning','Fast Wi-Fi','Free parking','Family friendly','WhatsApp concierge'],
   3, 'published', 4.88, 69)

on conflict (slug) do update set
  title = excluded.title,
  city = excluded.city,
  country = excluded.country,
  region = excluded.region,
  lat = excluded.lat, lng = excluded.lng,
  property_type = excluded.property_type,
  max_guests = excluded.max_guests,
  bedrooms = excluded.bedrooms,
  bathrooms = excluded.bathrooms,
  headline = excluded.headline,
  description = excluded.description,
  amenities = excluded.amenities,
  min_stay = excluded.min_stay,
  status = excluded.status,
  rating_cached = excluded.rating_cached,
  review_count_cached = excluded.review_count_cached;

-- base rates (season null). delete-and-insert keeps this idempotent
-- without fighting the one_base_rate exclusion constraint.
delete from public.listing_rates
 where listing_id in (select id from public.listings
                      where slug in ('spiritum-marea','vista-playa','casa-selva',
                                     'nile-breeze','palma-azul','coral-suite',
                                     'villa-maya','casa-sol'))
   and season is null;

insert into public.listing_rates (listing_id, nightly_cents, cleaning_cents, tax_pct, currency)
select id, v.nightly, v.cleaning, v.tax, 'USD'
from (values
  ('spiritum-marea', 16000, 6000, 16.0),
  ('vista-playa',    20000, 7500, 16.0),
  ('casa-selva',     32000, 9000, 16.0),
  ('nile-breeze',    11000, 3000, 14.0),
  ('palma-azul',     14500, 5000, 16.0),
  ('coral-suite',    12000, 4000, 16.0),
  ('villa-maya',     41000, 12000, 16.0),
  ('casa-sol',       18000, 8000, 12.5)
) as v(slug, nightly, cleaning, tax)
join public.listings on listings.slug = v.slug;
