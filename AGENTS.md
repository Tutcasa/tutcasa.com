<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# TutCasa platform — architecture rules

A modular monolith. These boundaries are what make later extraction possible — hold them.

- **Modules own their data.** Each `src/modules/<name>/` exposes a public interface via its `index.ts`. Never import another module's internals (`repository`, `mock-data`, etc.) — only what its `index.ts` exports.
- **Pages/components depend on module interfaces**, never on data sources directly. Data access goes through each module's repo factory (e.g. `getListingsRepo()`), which swaps mock → Supabase without touching consumers.
- **Money and booking writes are server-side only.** No browser writes to bookings, payments, or gift cards — server actions / route handlers using the service role.
- **Pricing is computed server-side** in `src/modules/pricing` — never trust a client-sent total.
- **Availability is derived** from bookings + blocks (see `supabase/migrations/0001_init.sql`). There is no "isAvailable" flag anywhere; do not add one.
- **SEO is a feature.** Public pages are server-rendered with `generateMetadata`; keep city/listing pages statically renderable.
- Design tokens live in `src/app/globals.css` (@theme). Use token classes (`bg-crema`, `text-rosa`, `rounded-card`, `shadow-soft`) — no ad-hoc hex values in components.
