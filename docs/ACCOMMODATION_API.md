# TutCasa Accommodation API — integration guide for amanahvacations.com

TutCasa exposes its accommodation catalog + live availability so Amanah's
accommodation section can show what's bookable, with real info and prices.
Read-only, public data only (no guest data), CORS `*`.

**Base URL**
- Preview (now): `https://tutcasa-platform.vercel.app`
- Production (after launch): `https://tutcasa.com`
Put it in an env var on the Amanah side, e.g. `TUTCASA_API_BASE`.

---

## 1. `GET /api/accommodation` — the catalog

All **published** homes, featured first. Cached 5 minutes (`s-maxage=300`).

```jsonc
{
  "count": 8,
  "listings": [
    {
      "slug": "casa-selva",
      "title": "Casa Selva",
      "city": "Tulum",
      "country": "MX",              // MX | EG | US
      "region": "Riviera Maya",
      "propertyType": "villa",       // condo | villa | house | apartment | penthouse
      "maxGuests": 9,
      "bedrooms": 4,
      "bathrooms": 3,
      "headline": "Jungle villa",    // short card tag
      "description": "…",
      "amenities": ["Private pool", "…"],
      "minStay": 4,
      "sizeSqft": null,
      "instantBook": false,           // false = request-to-book
      "featured": true,
      "rating": 4.91,
      "reviewCount": 74,
      "checkinFrom": "15:00",
      "checkoutUntil": "11:00",
      "pricing": {
        "nightly": 320,              // base nightly, USD
        "cleaningFee": 90,
        "taxPct": 16,
        "allInNightly": 371,         // advertised all-in (base + tax share)
        "currency": "USD"
      },
      "photos": [ { "url": "https://…", "alt": "…" } ],   // [] until photos land
      "detailUrl": "/api/accommodation/casa-selva",
      "bookUrl": "/stays/casa-selva"  // deep-link guests here to book on TutCasa
    }
  ]
}
```

## 2. `GET /api/accommodation/{slug}` — detail + live availability

Never cached (`no-store`) — availability is always fresh. Adds to the card
fields: `faqs` (`[{q,a}]`), `cancellationPolicy`, `houseRules`, and:

```jsonc
{
  // …all catalog fields…
  "unavailable": [                  // ranges a guest CANNOT book
    { "from": "2026-09-07", "to": "2026-09-14" }  // from inclusive, to EXCLUSIVE
  ],                                 // (checkout day is bookable)
  "quote": null                      // see §3
}
```

`404 {"error":"NOT_FOUND"}` for unknown/unpublished slugs.

## 3. Live quote — add `?checkIn=&checkOut=&guests=`

`GET /api/accommodation/casa-selva?checkIn=2026-10-05&checkOut=2026-10-12&guests=4`

`quote` becomes the server-computed price (full TutCasa pricing model:
seasonal/per-date rates, weekend markup, discounts, fees, taxes, deposit split):

```jsonc
"quote": {
  "ok": true,
  "nights": 7,
  "currency": "USD",
  "total": 2820,                     // all-in
  "dueNow": 846,                     // deposit due at booking
  "balance": 1974,
  "balanceDueDate": "2026-09-21",
  "securityDeposit": 200             // refundable, on top of total
}
```

Failures: `"quote": { "ok": false, "error": "DATES_TAKEN" | "MIN_STAY_NOT_MET" | "INVALID_DATES" }`.

---

## Integration notes (Amanah side)

- **Fetch server-side** (RSC / route handler), not from the browser — keeps
  Amanah in control of caching and avoids client waterfalls. Suggested:
  `fetch(`${base}/api/accommodation`, { next: { revalidate: 300 } })` for the
  catalog; `cache: "no-store"` for detail/availability.
- **Booking happens on TutCasa** — link "Book" to `${base}${listing.bookUrl}`
  (optionally with `?ci=…&co=…&guests=…` prefill params understood by the
  property page). `instantBook` tells you whether to label it "Instant booking"
  or "Request to book".
- Prices are **already all-in per TutCasa's brand promise** — show
  `pricing.allInNightly` on cards and the live `quote.total` for date-specific
  totals. Never compute prices Amanah-side.
- `photos` is empty until the tutcasa.com listing/image import lands (launch
  data-migration task) — build the card with a graceful placeholder.
- The reverse integration (TutCasa importing Amanah tours 1:1 incl. group-tier
  pricing) is specced separately — this doc covers accommodation only.
