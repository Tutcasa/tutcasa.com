# Full-code audit — checkpoint (survives usage-limit resets)

Strategy: sequential single-context audit, one area per pass, findings
fixed immediately and committed. Update this file after every area.

| # | Area | Status |
|---|------|--------|
| 1 | guest-core-ui (home, stays grid, PdGrid, gallery, currency/i18n) | DONE — 8 found, 8 fixed |
| 2 | guest-flows (checkout, tour-booking, invite, loyalty, list-property) | DONE — 5 found, 5 fixed (tour today-UTC bug, terms bypass on demo carts, stale wording ×2, decl order) |
| 3 | booking-money-backend | DONE (deep 4-agent audit 08-19 + coupon-reallocation re-verified) |
| 4 | comms-backend | DONE (deep 4-agent audit 08-19; growth txns re-verified, connect() releases checked) |
| 5 | admin-listings | DONE (audit 08-19; SQL params verified 1:1, new bed editor typechecked) |
| 6 | admin-ops | DONE (audit 08-19 + requireAdmin on all 46 actions) |
| 7 | api-lib | DONE (audit 08-19: cron auth, ical guards, partner auth verified) |
| 8 | sql-schema | DONE — spot-checked all ON CONFLICT targets vs unique indexes, check constraints vs written values, 0023 partial-index predicates match deliver() |
| 9 | cross-consistency | DONE — money trace re-run after coupon reallocation: service/checkout/invoice/email/orders all agree; chatbot tools share checkout engines |
| 10 | cleanup-deadcode | DONE — tsc clean, eslint clean, 17/17 pricing tests, no TODO/FIXME, last "May" copy removed |

Area-1 findings live in the git history of this commit (all fixed in it).
