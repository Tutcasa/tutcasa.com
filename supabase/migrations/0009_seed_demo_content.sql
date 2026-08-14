-- 0009_seed_demo_content.sql
-- Seeds the client-approved demo content (the demo IS the content spec).
-- Written for the fresh client Supabase project: the old dev project's data
-- was never in migrations, so this reconstructs it from the demo sources
-- (Stays.html PROPS + property.html copy + Tours.html catalog).
-- Idempotent: every insert is guarded, safe to re-run.
-- NOTE: jardin-verde (the 9th, unlisted home) is already inserted by 0006.

begin;

-- ---------- 8 published homes -----------------------------------------------
insert into public.listings
  (slug, title, city, country, region, lat, lng, property_type, max_guests,
   bedrooms, bathrooms, headline, description, amenities, min_stay, status,
   rating_cached, review_count_cached)
values
  ('spiritum-marea', 'Spiritum Marea', 'Playa del Carmen', 'MX', 'Riviera Maya',
   20.6540, -87.0680, 'condo', 6, 2, 2, 'Oceanfront',
   'A bright oceanfront walkout in the gated Mareazul community, steps from a white-sand beach and three lagoon-style pools. Floor-to-ceiling windows open onto a private terrace with direct garden-to-beach access. Fully equipped for families, with a full kitchen, fast Wi-Fi and 24/7 TutCasa concierge on WhatsApp.',
   '{"Beachfront access","Lagoon pools","Full kitchen","Air conditioning","Fast Wi-Fi 300 Mbps","Free parking","Washer & dryer","Smart TV","Beach club","24/7 concierge"}',
   3, 'published', 4.94, 128),

  ('vista-playa', 'Vista Playa', 'Playa del Carmen', 'MX', 'Riviera Maya',
   20.6296, -87.0739, 'penthouse', 6, 3, 2, 'Penthouse',
   'A top-floor penthouse two blocks from Fifth Avenue with a private rooftop plunge pool and sweeping ocean views. Sleeps six across three bedrooms, with an open kitchen-living space made for long dinners and sunset drinks.',
   '{"Rooftop plunge pool","Ocean view","Full kitchen","Air conditioning","Fast Wi-Fi","Elevator","Washer","Smart TV","Walk to 5th Ave","24/7 concierge"}',
   2, 'published', 4.87, 96),

  ('casa-selva', 'Casa Selva', 'Tulum', 'MX', 'Riviera Maya',
   20.2114, -87.4654, 'villa', 9, 4, 3, 'Jungle villa',
   'A four-bedroom jungle villa wrapped in greenery with a private pool and a shaded palapa lounge. A short drive to Tulum beach and the ruins, with a cenote within walking distance. Ideal for two families travelling together.',
   '{"Private pool","Jungle garden","Palapa lounge","Full kitchen","Air conditioning","Wi-Fi","Free parking","BBQ grill","Near cenote","24/7 concierge"}',
   4, 'published', 4.91, 74),

  ('nile-breeze', 'Nile Breeze', 'Nuba', 'EG', 'Upper Egypt',
   24.0889, 32.8998, 'house', 7, 3, 2, 'Family',
   'A serene riverside home in Nuba with a shaded terrace overlooking the Nile. Traditional Nubian design meets modern comfort, minutes from Aswan''s markets and temples. Warm hosts and home-cooked breakfast on request.',
   '{"Nile-view terrace","Air conditioning","Full kitchen","Wi-Fi","Breakfast on request","Airport transfer","Washer","Rooftop","Near temples","24/7 concierge"}',
   3, 'published', 4.96, 63),

  ('palma-azul', 'Palma Azul', 'Playa del Carmen', 'MX', 'Riviera Maya',
   20.6300, -87.0800, 'condo', 5, 2, 2, 'Private pool',
   'A calm two-bedroom condo with a shared pool and a rooftop sun deck, in a quiet residential pocket a short walk from the beach and the town centre. A great value base for exploring the Riviera Maya.',
   '{"Shared pool","Rooftop deck","Full kitchen","Air conditioning","Wi-Fi","Free parking","Washer","Smart TV","Walk to beach","24/7 concierge"}',
   2, 'published', 4.90, 58),

  ('coral-suite', 'Coral Suite', 'Playa del Carmen', 'MX', 'Riviera Maya',
   20.6250, -87.0700, 'condo', 3, 1, 1, 'Beachfront',
   'A stylish one-bedroom beachfront suite made for couples, with a balcony over the sand and direct beach access. Steps from cafes and dive shops, and a five-minute walk to Fifth Avenue.',
   '{"Beachfront","Balcony","Kitchenette","Air conditioning","Wi-Fi","Smart TV","Beach access","Coffee bar","Walk to 5th Ave","24/7 concierge"}',
   2, 'published', 4.85, 87),

  ('villa-maya', 'Villa Maya', 'Tulum', 'MX', 'Riviera Maya',
   20.2000, -87.4700, 'villa', 11, 5, 4, 'Villa',
   'A five-bedroom private villa with a large heated pool, chef''s kitchen and a rooftop terrace for stargazing. Sleeps eleven, with a games room and optional private chef. The go-to for celebrations and multi-family trips.',
   '{"Large heated pool","Rooftop terrace","Chef kitchen","Air conditioning","Wi-Fi","Free parking","Games room","Private chef (option)","BBQ grill","24/7 concierge"}',
   5, 'published', 4.98, 41),

  ('casa-sol', 'Casa Sol', 'Orlando', 'US', 'Florida',
   28.3852, -81.5639, 'house', 10, 4, 3, 'Near parks',
   'A cheerful four-bedroom family home in a resort community minutes from the theme parks, with a private screened pool and a themed kids'' room. Community water park, gym and clubhouse included.',
   '{"Private screened pool","Themed kids room","Full kitchen","Air conditioning","Wi-Fi","Free parking","Washer & dryer","Game room","Resort water park","Minutes to parks"}',
   3, 'published', 4.88, 69)
on conflict (slug) do nothing;

-- ---------- base rates for the 8 (jardin-verde's came with 0006) ------------
insert into public.listing_rates (listing_id, nightly_cents, cleaning_cents, tax_pct, currency)
select l.id, v.nightly, v.cleaning, v.tax, 'USD'
  from (values
    ('spiritum-marea', 16000, 6000, 16::numeric),
    ('vista-playa',    20000, 7500, 16),
    ('casa-selva',     32000, 9000, 16),
    ('nile-breeze',    11000, 3000, 14),
    ('palma-azul',     14500, 5000, 16),
    ('coral-suite',    12000, 4000, 16),
    ('villa-maya',     41000, 12000, 16),
    ('casa-sol',       18000, 8000, 12.5)
  ) as v(slug, nightly, cleaning, tax)
  join public.listings l on l.slug = v.slug
 where not exists (
   select 1 from public.listing_rates r
    where r.listing_id = l.id and r.season is null
 );

-- ---------- default pricing config for every listing ------------------------
insert into public.listing_pricing (listing_id)
select id from public.listings
on conflict (listing_id) do nothing;

-- ---------- tours & parks catalog (Tours.html; prices are MXN per person, ---
-- ---------- price_cents = 0 means "on request") -----------------------------
insert into public.tours
  (slug, title, subtitle, partner, city, duration_label, price_cents, currency,
   category, status)
values
  ('cenotes-coral-sea-turtles', 'Cenotes, Coral & Sea Turtles', 'Dos Ojos Cenote + Akumal Snorkeling', 'amanah', 'Playa del Carmen', '6 hours',          235000, 'MXN', 'tour', 'published'),
  ('cenotes-ruins-tulum',       'Cenotes & the Ruins of Tulum', 'Dos Ojos Cenote + Tulum Site',        'amanah', 'Playa del Carmen', '6–8 hours',        370000, 'MXN', 'tour', 'published'),
  ('coba-ruins-jungle-cenotes', 'Cobá Ruins & Jungle Cenotes',  'Coba Zone + Choo-Ha & Tankach-Ha',    'amanah', 'Playa del Carmen', 'Full day',         390000, 'MXN', 'tour', 'published'),
  ('cozumel-private-boat',      'Cozumel Private Boat Snorkeling', 'El Cielo, Colombia & Lever Reefs',  'amanah', 'Playa del Carmen', 'Approx. 4 hours',  460000, 'MXN', 'tour', 'published'),
  ('tulum-akumal',              'Tulum & Akumal',               'Dos Ojos + Tulum Ruins + Akumal',      'amanah', 'Playa del Carmen', 'Full day',         585000, 'MXN', 'tour', 'published'),
  ('chichen-itza-valladolid',   'Chichen Itza & Valladolid',    'New 7 Wonders + Suytun & Samulá',      'amanah', 'Playa del Carmen', 'Full day',         660000, 'MXN', 'tour', 'published'),
  ('ruta-de-cenotes',           'Ruta de Cenotes',              '4 Cenotes + Diving Platform + Zip Line','amanah','Playa del Carmen', 'Half day',         290000, 'MXN', 'tour', 'published'),
  ('holbox-island-escape',      'Holbox Island Escape',         '2 Days, 1 Night',                      'amanah', 'Playa del Carmen', 'Overnight',             0, 'MXN', 'tour', 'published'),
  ('isla-contoy',               'Isla Contoy National Park',    'Ixlaché Reef + Contoy + Isla Mujeres', 'amanah', 'Playa del Carmen', 'Full day',              0, 'MXN', 'tour', 'published'),
  ('xcaret-park',               'Xcaret Park',                  'Eco-archaeological park + night show', 'amanah', 'Playa del Carmen', 'All-day access',   350000, 'MXN', 'park', 'published'),
  ('xel-ha-park',               'Xel-Há Park',                  'All-inclusive natural aquarium',       'amanah', 'Playa del Carmen', 'All-day access',   285000, 'MXN', 'park', 'published'),
  ('xplor-park',                'Xplor Park',                   'Zip-lines + caverns + amphibious vehicles','amanah','Playa del Carmen','All-day access', 335000, 'MXN', 'park', 'published'),
  ('xplor-fuego-park',          'Xplor Fuego Park',             'The night version, lit by fire',       'amanah', 'Playa del Carmen', 'Evening access',   285000, 'MXN', 'park', 'published'),
  ('xenses-park',               'Xenses Park',                  'Half-day park of the senses',          'amanah', 'Playa del Carmen', 'Half-day access',  185000, 'MXN', 'park', 'published'),
  ('jungala-aqua-park',         'Jungala Aqua Park',            'Waterpark in the jungle',              'amanah', 'Playa del Carmen', 'All-day access',   180000, 'MXN', 'park', 'published')
on conflict (slug) do nothing;

commit;
