# TutCasa Platform — Build-to-Launch Plan

**Goal:** Replace the existing WordPress (WpRentals) site with this Next.js + Supabase platform **without losing Google ranking or reviews**, and reach feature parity with the old site (per the client feature spreadsheet), launched in ordered phases.

**Locked decisions (2026-08-11):**
- **Full replace** of the WordPress site (same domain, 301 redirects — we have DNS access).
- **TutCasa manages all properties** → NO owner marketplace, memberships, or owner↔guest messaging.
- **Gift cards removed** (loyalty kept).
- **Channel sync: native iCal now** (Airbnb/VRBO); Hostaway/Booking.com API **later** when we scale.
- **Dynamic pricing: keep PriceLabs** (integrate later phase).
- **Payments: Stripe + PayPal.**

---

## Architecture (target)

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (guest + admin)                                      │
└───────────────┬───────────────────────────────┬──────────────┘
                │                                 │
        Next.js 16 App Router (Vercel)   Ported demo CSS = visual spec
                │  (server actions, RSC)          │  (design-reference/)
                ▼                                 ▼
┌──────────────────────────┐   ┌──────────────────────────────┐
│  Server actions / modules │──▶│  Supabase Postgres            │
│  modules/<domain>/…       │   │  (via pg Pool, service role)  │
│  pricing, bookings, tours │   │  + Supabase Auth (guests)     │
│  notifications, listings  │   │  + Supabase Storage (photos)  │
└───────┬───────────┬───────┘   └──────────────────────────────┘
        │           │
        ▼           ▼
   Stripe/PayPal   Resend (email) + WhatsApp deep links
        │
        ▼
   iCal import/export  ←→  Airbnb / VRBO calendars
   PriceLabs (later)   ←→  dynamic nightly rates
```

**Access layers (existing):** `lib/supabase.ts` (anon, RLS reads), `lib/supabase-admin.ts` (service role, storage), `lib/db.ts` (direct `pg` Pool — all privileged writes). Repo pattern in `modules/<name>/`.

---

## Current state (from inventory) — what's REAL vs THEATER

| Area | Real | Theater / Missing |
|---|---|---|
| Listings (data, filters, detail) | ✅ | — |
| Booking core (server pricing, no-double-book) | ✅ stays + tours | Payment is preview only |
| Availability (holds, expiry, GiST constraint) | ✅ | No admin block UI, no iCal |
| Admin: listings CRUD, tours CRUD, content | ✅ | — |
| Admin: stay bookings | Read-only | No confirm/cancel/refund/edit |
| Pricing model | nightly + cleaning + tax + seasons | Weekend, extra-guest, city fee, deposits, discounts, add-ons, per-date calendar |
| Payments (Stripe/PayPal) | — | UI preview only, no charge |
| Guest auth | — | Mock modal only |
| Emails | Tour booking (Resend) | No stay emails, no lifecycle, no admin control |
| Invoices / orders | — | None |
| Reviews | DB table + trigger | No submit, no moderation, display hardcoded |
| Loyalty / coupons / forms | — | Front-end only |
| Wishlist | — | localStorage, not DB |
| iCal / PriceLabs | DB schema ready for iCal | No code |

---

## Full feature list (from client spreadsheet, mapped)

**Listing fields:** title, category/room type, guests, city/neighborhood, country, description, affiliate/redirect link, private notes (admin-only), check-in message (auto email 2 days before), amenities, photos (orderable), size ft², bedrooms, bed types, check-in/out hours, FAQs, cancellation policy, other rules, allowed/not-allowed (children/smoking/party/pets), per-listing email-notification routing, location/map, iCal links, internal calendar (block/manual book), instant-book vs request-to-book, featured-on-homepage, "keep calendar clean" (hotel overlap), reservation deposit %, full-payment threshold (days).

**Pricing (USD):** per-night; 7+/30+ night discount (fixed or %); weekend (Sat/Sun) price; extra-guest fee (per guest/night); cleaning fee (single or per-night); city fee (single or per-night); security deposit; early-bird discount (% + min days ahead); 16% tax site-wide; extra optional fees (flat/per-night/per-guest/per-guest-night); per-date price calendar; dynamic pricing via PriceLabs (toggle per listing).

**Bookings/admin:** edit booking (name, email, phone, guests, dates, total, listing); bookings data page w/ invoice #; invoices page w/ shareable links; per-paid-invoice financial breakdown (orders page).

**Emails — guest:** booking request · request accepted (w/ invoice link) · second-payment-due (w/ 2nd invoice) · payment receipt · 2-days-before check-in (trip details) · 1-day-before check-out (instructions).
**Emails — admin:** new booking/instant-book · payment-due reminders · order receipts.

**Coupons:** WooCommerce-style coupons + coupon analytics.

**Other:** analytics/orders dashboard; admins with roles; payments = Stripe + PayPal; add pages; featured properties on homepage; plugins-for-needs (SEO etc.); contact page; loyalty program; optional add city/country.

---

## Phases — ordered to launch, then post-launch

Milestones **M1–M5 = the launch line** (operational replacement of the old site). Everything after M5 layers on without blocking go-live.

### M1 — Pricing & listing model completeness  *(the money model — first, everything depends on it)*
- Migration: add fee schedule (weekend %, extra-guest, city fee, security deposit, weekly/monthly discount, early-bird, deposit %, second-payment threshold, tax default 16%).
- New tables: `listing_price_days` (per-date calendar overrides + per-night block/min-stay), `listing_addons` (stay extra options).
- Add listing config fields: instant_book, keep_calendar_clean, affiliate_url, checkin_message, private_notes, allowed/not-allowed, FAQs, bed types, size, check-in/out hours.
- Rewrite `modules/pricing` to compute the full breakdown (all fees, discounts, tax, deposit split).
- Admin: full pricing editor + **price-calendar UI** + add-on editor + all new listing fields.

### M2 — Payments + booking operations  *(turn preview into real money)*
- Stripe integration (Payment Intents): real charge at checkout, webhooks → booking `confirmed`.
- **Deposit / split-pay:** first charge = deposit %, schedule second payment at threshold.
- PayPal as second method.
- Instant-book vs request-to-book flow per listing.
- Admin **stay-booking controls**: confirm / cancel / refund / edit (name, email, phone, guests, dates, total, listing).
- Booking status lifecycle end-to-end.

### M3 — Emails, invoices & orders  *(automation + records)*
- **Verify Resend domain** (blocker) → extend notifications to stays: full 6 guest + 3 admin lifecycle.
- Per-listing check-in message (2 days before) + check-out instructions (1 day before) via scheduler.
- Per-listing admin email-notification routing.
- Invoice generation + invoices page + shareable per-invoice links.
- Orders/financial breakdown page per paid invoice.
- Admin `notifications_log` viewer.

### M4 — Channel sync (iCal) + availability admin
- iCal **export** per listing (feed of confirmed bookings + blocks) for Airbnb/VRBO.
- iCal **import** (poll external feeds → `availability_blocks` reason='ical', dedup by UID).
- Admin: manage iCal links per listing, add manual owner/maintenance blocks, view merged calendar.

### M5 — SEO migration & LAUNCH
> **Infra/DNS plan: see [DNS_MIGRATION.md](./DNS_MIGRATION.md)** — registrar stays at GoDaddy (no domain transfer), DNS → Cloudflare, hosting → Vercel, plus 5 pre-existing email/DNS issues to fix. The DNS move is independent of the code and can start any time.
- Crawl old site sitemap (`/sitemap_index.xml`) → build **301 redirect map** old→new.
- `sitemap.xml` + `robots.txt` + schema.org structured data (VacationRental, Review, Breadcrumb).
- GA4 + Google Search Console (verify via DNS), submit new sitemap.
- Rebuild on-site Google reviews display (Business Profile / Trustindex embed).
- Deploy to Vercel, point DNS, monitor Search Console for 404s/coverage.
- **→ GO LIVE.**

---

### Post-launch (layer on, non-blocking)

**P6 — Guest auth & accounts:** real Supabase Auth (email + OTP), "my trips", wishlist → DB, guest_id on bookings.
**P7 — Reviews:** post-stay review submission + admin moderation + display from DB (replace hardcoded).
**P8 — Coupons & loyalty:** native coupon engine + admin + checkout apply + analytics; loyalty backend (referrals/points).
**P9 — Lead capture:** contact / list-my-property / loyalty forms → persist + email (currently front-end only).
**P10 — Admin roles & analytics:** role-based admin (manager access), user management, orders/coupons analytics dashboard.
**P11 — Dynamic pricing:** PriceLabs integration (per-listing toggle).
**P12 — Content:** blog (SEO), add-city/country flow, page management.

---

## Scope reality — this is a full-stack build, not a finished site

**Done:** the guest-facing **visual design** only (pixel-exact ported pages). **Not done:** every functional layer — most guest interactions are currently "theater" (auth, payments, reviews, wishlist, forms), the **entire admin is essentially new UI**, and all backend integrations are unbuilt. Design being finished ≠ product being finished.

### Work split — frontend vs backend per milestone

| Milestone | Backend | Frontend |
|---|---|---|
| M1 Pricing | migration + pricing-engine rewrite (all fees/discounts/deposit split) + CRUD actions | Admin: pricing editor, price-calendar UI, add-on editor, expanded listing form. Guest: property + checkout price breakdown |
| M2 Payments | Stripe (PaymentIntents + webhooks), deposit/split scheduling, PayPal, booking state machine | Guest: real Stripe card UI, instant-book vs request, deposit screens. Admin: booking management UI (confirm/cancel/refund/edit) |
| M3 Emails/Invoices | email templates + Resend lifecycle, scheduler, invoice + orders generation | Guest: invoice view/download. Admin: invoices page, orders/financials, notifications log, email-routing UI |
| M4 iCal | export endpoint, import poller (cron), dedup | Admin: iCal link management, manual-block UI, merged calendar view |
| M5 SEO/Launch | redirects, sitemap/robots, GA4, deploy, DNS | structured data, real reviews-display component, meta polish |
| Post-launch | auth, reviews, coupons, loyalty, lead capture, roles | login flows, reviews submission, coupon UI, "my trips", **tour detail page (missing)**, real experiences page, wishlist→DB |

### Known missing / demo-only guest pages to build (not just wire)
- **Tour detail page** (`/tours/[slug]`) — does not exist; tours are booked straight from cards.
- **/experiences** — visual/demo only (static catalog + localStorage), no DB.
- **/wishlist** — localStorage, needs DB.
- **Reviews** everywhere — hardcoded arrays, need real submission + display.
- **Auth flows** — mock modal, need real Supabase Auth UI.

## Cross-cutting / setup
- Document `DATABASE_URL` in `.env.example` (currently missing — setup gap).
- Admin auth is a single shared `ADMIN_PASSWORD` env → upgrade to roles in P10.
- Keep the dual-CSS system (ported demo CSS = visual spec) intact when adding admin UI (admin uses Tailwind tokens).

## Definition of "launch-ready" (M1–M5 done)
A guest can find a property (SEO preserved), see correct full pricing, book with instant-book or request, pay a real deposit via Stripe/PayPal, receive the full email lifecycle with invoices; TutCasa can manage every booking and calendar from admin; Airbnb/VRBO stay in iCal sync. Everything else is enhancement.
