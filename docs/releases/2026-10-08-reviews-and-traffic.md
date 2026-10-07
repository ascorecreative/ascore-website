# Buyer reviews and portal traffic

Existing branch: codex/ascore-cloud-hero-portals, starting at 3fc52ef148b046c7341a8747f6abc5a89b83c7b3. No new checkout or branch.

The portal shows Active users now using Google's last-five-minute Realtime report, alongside the last-30-minute count. Traffic refreshes every 30 seconds. Seven days is the initial report period. A single reported day renders as a labelled bar rather than an isolated unexplained dot; changing the metric redraws the chart. Delayed/empty historical data remains explicit.

Country, region and city rows use a separate read-only GA4 report with sessions and active users, fixed ascore.ae host filtering, selected report dates and a 25-row limit. Invalid or unavailable location data leaves other totals and charts intact. Locations are approximate and privacy-limited. Google references: https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema and https://developers.google.com/analytics/devguides/reporting/data/v1/realtime-basics.

The existing agency owner can enable buyer reviews through Course setup, without changing checkout or hosting variables. Owned application/database/payment-schema checks precede additive review-table creation. An audited durable activation marker survives process restarts. Existing buyer capability, exact-paid eligibility, origin, CSRF, rate-limit, duplicate and moderation controls remain. Buyers can preview their name, stars and written review in the existing review format; submissions are pending until moderated.

The creator section contains the owner's supplied eight-plus-years UAE experience and up-to-AED25M/year advertising claims. Add to cart saves the selection and moves immediately to /courses/checkout/?new=1 with a brief fade, respecting reduced motion. Course prices remain AED49.99 each and historic orders are unchanged.

Validation: 138 backend tests pass, including owner activation/durability, paid-only review access, private token handling, moderation, separate GA4 windows, location validation/failure isolation and existing payment regressions. Build passes. Lint has no errors; existing warnings remain in unrelated components. Synthetic local Chrome QA verified owner activation, star/name/body preview, pending submission, metric switching and immediate checkout at 390px without horizontal overflow. Payment/email adapters were blocked in this isolated harness. No live synthetic reviews, checkouts, payments or emails were created.

The unrelated Navbar edit was temporarily excluded from the build and restored byte-for-byte (SHA256 d6fe222a93311b8ba1f2a7d86b2e20ee61eb82bfaa2856a47c65c620659bd24b). Untracked portal components and output remain untouched. The two requested replacement preview images are pending access to the approved 54-page PDF; the former temporary private copy is unavailable. Page 10 and existing previews are retained until genuine source pages are available.
