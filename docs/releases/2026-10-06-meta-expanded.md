# Expanded Meta advertising course catalog

Baseline: `6bcaaabd33e131443f8c67b62b067229fdbe4144` on `codex/ascore-cloud-hero-portals`. Publish through the established Git integration and normal Node/Vite build; no Hostinger controls or File Manager are involved.

The Meta course title is **Mastering Facebook Ads: Meta Ads — Beginner to Expert**, with the original campaign foundations, four competitor-research pages (26–29), and thirteen Pixel installation/testing pages (30–42). The received final version has 46 pages and 46 bookmarks. The PDF describes eight sanitised actual interface captures on pages 24–27 and 30–31. It contains 34 clickable reference links, representing 30 distinct URLs; storefront copy says “34 reference links” rather than claiming 34 distinct sources. The Practical AI course remains 42 pages, so the combined page count is now 88. Each course remains AED 50.

The current selected Library edition was materialized privately on this Mac. The received file is 1,577,797 bytes; its SHA-256 is `52bc630788bcec5a36719b99ccfc70ddac04325f4ec4c4fd1dc62e3bf9d10d75`. This hash comes from the actual received PDF, not an earlier/pre-upload file. The private manifest now requires this exact edition and filename, `Mastering Facebook Ads - Meta Ads - Beginner to Expert.pdf`. The existing owner-only, outside-repository storage checks and strict hash verification are retained. A local invocation of the real private PDF loader accepted the final artifact. Old editions fail closed under the new manifest.

The course listing, detail page, metadata, curriculum, FAQ, cart/checkout names and combined page count reflect the new edition. A public WebP of the approved first-page cover replaces the older Meta cover in the listing, detail page, catalog hero and approved homepage course teaser. The books are presented using CSS; the homepage 3D hero/video are unchanged. The course build preloads the cover selected by the catalog data. No paid lesson pages or complete PDF are included in Git or public/dist.

## Validation

The normal production build, lint and all 38 backend tests pass. Lint retains the three existing warnings and the deferred-3D bundle advisory remains. PDF page count, bookmarks, metadata title, received size/hash and private-loader acceptance are recorded in `2026-10-06-meta-course-edition.json`. Six rendered listing/detail checks passed at 320, 390 and 1440 CSS-pixel widths: exact title, 46-page facts, curriculum ranges, current cover, AED 50 and no horizontal overflow. Mobile cart persistence, AED 100 combined total, email validation, disabled paid/FREE delivery, and the homepage teaser cover/CTA passed without page errors or submitted orders. Results are in `2026-10-06-meta-course-browser.json`. Desktop-video source and public/dist hashes remain at the verified `6bcaaab` release.

## Private installation remains separate

The read-only live `/api/courses/config` check returned `freeCheckoutReady:false` and `paidCheckoutEnabled:false`. No current authenticated administrator/private-storage readiness evidence was supplied, so the production PDF was not installed. Existing storage, course-table and SMTP readiness remain unverified; no credentials, database provisioning, email activation or delivery flags were changed.

An authorised agency administrator can later use the existing `/portal/?view=courses` **Verify & install private PDF** flow when private storage is configured, selecting the exact final edition above. The server stores it outside the public site with owner-only permissions. Keep the existing payment/delivery gates intact. Git publication of this catalog does not install the private PDF, activate checkout or send email.

The original desktop video remains 1,694,685 bytes with SHA-256 `0c01ec9e86c68f4f25f56bee8930e27ccdcfcffb8ff62a655c60ecaffbf2195b`. Seven pre-existing unrelated local working files are preserved.
