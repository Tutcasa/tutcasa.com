# Full-code audit — checkpoint (survives usage-limit resets)

Strategy: sequential single-context audit, one area per pass, findings
fixed immediately and committed. Update this file after every area.

| # | Area | Status |
|---|------|--------|
| 1 | guest-core-ui (home, stays grid, PdGrid, gallery, currency/i18n) | FOUND 8 → fixing now |
| 2 | guest-flows (checkout, tour-booking, invite, loyalty, list-property) | pending |
| 3 | booking-money-backend (bookings, pricing, coupons, actions) | pending |
| 4 | comms-backend (emails, growth, leads, reviews, chatbot) | pending |
| 5 | admin-listings (listings/tours actions + editors) | pending |
| 6 | admin-ops (bookings, transfers, coupons, content, emails admin) | pending |
| 7 | api-lib (api routes, middleware, lib/*, ical) | pending |
| 8 | sql-schema (migrations vs code) | pending |
| 9 | cross-consistency (money/status end-to-end traces) | pending |
| 10 | cleanup-deadcode (unused exports, duplication, tsc/eslint) | pending |

Area-1 findings live in the git history of this commit (all fixed in it).
