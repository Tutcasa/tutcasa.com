-- Content parity with the approved demo's property.html PROPERTIES:
-- the demo is the spec for guest-facing copy. Also introduces the
-- 'unlisted' status (bookable via direct link, hidden from the grid)
-- for Jardin Verde, which the demo exposes via wizard/property page
-- but never lists in the Stays grid.

alter table public.listings drop constraint listings_status_check;
alter table public.listings add constraint listings_status_check
  check (status in ('draft','published','unlisted','archived'));

update public.listings set
  description = 'A bright oceanfront walkout in the gated Mareazul community, steps from a white-sand beach and three lagoon-style pools. Floor-to-ceiling windows open onto a private terrace with direct garden-to-beach access. Fully equipped for families, with a full kitchen, fast Wi-Fi and 24/7 TutCasa concierge on WhatsApp.',
  amenities = '{"Beachfront access","Lagoon pools","Full kitchen","Air conditioning","Fast Wi-Fi 300 Mbps","Free parking","Washer & dryer","Smart TV","Beach club","24/7 concierge"}',
  max_guests = 6, bathrooms = 2, min_stay = 3
where slug = 'spiritum-marea';

update public.listings set
  description = 'A top-floor penthouse two blocks from Fifth Avenue with a private rooftop plunge pool and sweeping ocean views. Sleeps six across three bedrooms, with an open kitchen-living space made for long dinners and sunset drinks.',
  amenities = '{"Rooftop plunge pool","Ocean view","Full kitchen","Air conditioning","Fast Wi-Fi","Elevator","Washer","Smart TV","Walk to 5th Ave","24/7 concierge"}',
  max_guests = 6, bathrooms = 2, min_stay = 2
where slug = 'vista-playa';

update public.listings set
  description = 'A four-bedroom jungle villa wrapped in greenery with a private pool and a shaded palapa lounge. A short drive to Tulum beach and the ruins, with a cenote within walking distance. Ideal for two families travelling together.',
  amenities = '{"Private pool","Jungle garden","Palapa lounge","Full kitchen","Air conditioning","Wi-Fi","Free parking","BBQ grill","Near cenote","24/7 concierge"}',
  max_guests = 9, bathrooms = 3, min_stay = 4
where slug = 'casa-selva';

update public.listings set
  description = 'A serene riverside home in Nuba with a shaded terrace overlooking the Nile. Traditional Nubian design meets modern comfort, minutes from Aswan’s markets and temples. Warm hosts and home-cooked breakfast on request.',
  amenities = '{"Nile-view terrace","Air conditioning","Full kitchen","Wi-Fi","Breakfast on request","Airport transfer","Washer","Rooftop","Near temples","24/7 concierge"}',
  max_guests = 7, bathrooms = 2, min_stay = 3
where slug = 'nile-breeze';

update public.listings set
  description = 'A calm two-bedroom condo with a shared pool and a rooftop sun deck, in a quiet residential pocket a short walk from the beach and the town centre. A great value base for exploring the Riviera Maya.',
  amenities = '{"Shared pool","Rooftop deck","Full kitchen","Air conditioning","Wi-Fi","Free parking","Washer","Smart TV","Walk to beach","24/7 concierge"}',
  max_guests = 5, bathrooms = 2, min_stay = 2
where slug = 'palma-azul';

update public.listings set
  description = 'A stylish one-bedroom beachfront suite made for couples, with a balcony over the sand and direct beach access. Steps from cafes and dive shops, and a five-minute walk to Fifth Avenue.',
  amenities = '{"Beachfront","Balcony","Kitchenette","Air conditioning","Wi-Fi","Smart TV","Beach access","Coffee bar","Walk to 5th Ave","24/7 concierge"}',
  max_guests = 3, bathrooms = 1, min_stay = 2
where slug = 'coral-suite';

update public.listings set
  description = 'A five-bedroom private villa with a large heated pool, chef’s kitchen and a rooftop terrace for stargazing. Sleeps eleven, with a games room and optional private chef. The go-to for celebrations and multi-family trips.',
  amenities = '{"Large heated pool","Rooftop terrace","Chef kitchen","Air conditioning","Wi-Fi","Free parking","Games room","Private chef (option)","BBQ grill","24/7 concierge"}',
  max_guests = 11, bathrooms = 4, min_stay = 5
where slug = 'villa-maya';

update public.listings set
  description = 'A cheerful four-bedroom family home in a resort community minutes from the theme parks, with a private screened pool and a themed kids’ room. Community water park, gym and clubhouse included.',
  amenities = '{"Private screened pool","Themed kids room","Full kitchen","Air conditioning","Wi-Fi","Free parking","Washer & dryer","Game room","Resort water park","Minutes to parks"}',
  max_guests = 10, bathrooms = 3, min_stay = 3
where slug = 'casa-sol';

-- Jardin Verde — demo property.html 9th home, reachable only by direct link
insert into public.listings
  (slug, title, city, country, region, lat, lng, property_type, max_guests,
   bedrooms, bathrooms, headline, description, amenities, min_stay, status,
   rating_cached, review_count_cached)
values
  ('jardin-verde', 'Jardin Verde', 'Playa del Carmen', 'MX', 'Riviera Maya',
   20.6320, -87.0760, 'condo', 7, 3, 2, 'Garden',
   'A leafy three-bedroom condo built around a green courtyard and pool, a short stroll from the beach and Fifth Avenue. Bright, spacious and quiet — a comfortable home base for families and groups.',
   '{"Courtyard pool","Garden","Full kitchen","Air conditioning","Wi-Fi","Free parking","Washer","Smart TV","Walk to beach","24/7 concierge"}',
   2, 'unlisted', 4.83, 71)
on conflict (slug) do nothing;

insert into public.listing_rates (listing_id, nightly_cents, cleaning_cents, tax_pct, currency)
select id, 17500, 6000, 16, 'USD' from public.listings where slug = 'jardin-verde'
  and not exists (
    select 1 from public.listing_rates r
    join public.listings l on l.id = r.listing_id
    where l.slug = 'jardin-verde' and r.season is null
  );
