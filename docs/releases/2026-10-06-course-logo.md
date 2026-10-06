# Course logo navigation

The shared course header and footer ASCORE links now point to `/`, with the accessible name `Ascore home`. This applies to the course landing page, both product pages and checkout; the cart uses the shared header. Course navigation and breadcrumbs continue to link to the course area.

This release follows the existing Git hosting workflow on `codex/ascore-cloud-hero-portals`. It changes only the two shared logo links and their generated course output. The approved 46-page Meta catalog, private PDF manifest, AED 50 prices, original video and backend configuration remain unchanged. No PDF is published and payment/delivery gates remain disabled.

Validation: normal build and lint passed (three existing lint warnings); all 38 backend tests passed. Isolated Chrome verified actual homepage navigation from all four course routes, the nested product footer and mobile keyboard navigation after closing the cart. Cart persistence, email validation, current catalog, price and disabled checkout gates passed with no browser errors. No shared desktop inputs or hosting controls were used.
