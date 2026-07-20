# Design reference — the demo IS the spec

These CSS files are extracted verbatim from the approved HTML demo
(`~/Desktop/Tutcasa demo`). They are the single source of design truth
for the platform port.

## Port rules (learned the hard way)
1. **Never approximate.** Reuse the demo's exact selectors, values,
   spacing, shadows and markup structure. Tailwind utilities are fine
   for NEW admin-only surfaces, but guest pages must match the demo.
2. Port page by page: copy the page's CSS from here into the platform,
   mirror the demo DOM in JSX, reimplement inline JS as React state.
3. **Verify side-by-side** before calling a page done: demo
   (http://localhost:8777/<Page>.html) vs platform
   (http://localhost:3000/<route>) at desktop AND mobile widths.
4. The demo also carries the EN/FR/ES i18n dictionaries (window.I18N in
   each page) — port them with the language switcher.

## Page map
| Demo page | Platform route | CSS spec |
|---|---|---|
| index.html | / | index.css |
| Stays.html | /stays | stays.css |
| property.html | /stays/[slug] | property.css |
| Tours.html | /tours | tours.css |
| Experiences.html | /tours (activities tab) | experiences.css |
| Concierge.html | /concierge | concierge.css |
| Our_family.html | /our-family | our_family.css |
| why-book-with-us.html | /why-book-with-us | why-book-with-us.css |
| Contact.html | /contact | contact.css |
| Loyalty.html | /loyalty | loyalty.css |
| gift-cards.html | /gift-cards | gift-cards.css |
| checkout.html | /booking, /tour-booking | checkout.css |
| policies.html | /policies | policies.css |
| list-my-property.html | /list-my-property | list-my-property.css |
| wishlist.html | /wishlist | wishlist.css |
| Investors.html | /investors (todo) | investors.css |
