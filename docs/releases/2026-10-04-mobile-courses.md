# Mobile refinements and course storefront

This release integrates the approved mobile preview and aligned course storefront into the existing Ascore React/Vite build, based on `bd16c01fe2bdb60d4e11d96488f08427fcb38f35`. The release branch remains `codex/ascore-cloud-hero-portals` in `ascorecreative/ascore-website`.

The homepage's digital-products section follows the original hero/video sequence and links to `/courses/`. The course source lives in `public/courses/`; the normal build copies it into `dist/courses/` with four physical routes: `/courses/`, `/courses/meta-ads/`, `/courses/practical-ai/` and `/courses/checkout/`. It uses no root rewrite or backend change. The supplied private-preview banner is adapted to “Course preview” for the approved public release; noindex remains while purchasing is unavailable.

Each course is AED 50. Duplicate cart additions do not increase quantities; both courses total AED 100. Email review is local to the current page. Payments remain disabled and no orders, delivery emails or PDF downloads are created. Full PDFs and gateway credentials are absent from the public build.

Mobile refinements apply at widths up to 1024px and 600px. Service cards retain sticky stacking on viewports at least 660px high. Project cards retain reversible sliding/tilting on viewports at least 740px high; shorter screens use a swipeable rail. Reduced motion retains an ordinary reading layout. The compact menu locks scrolling, cycles keyboard focus, closes with Escape and resets when returning to desktop.

## Git hosting workflow

Pull `codex/ascore-cloud-hero-portals` through the existing hosting Git integration. Use the normal `npm ci` and `npm run build` pipeline, or the tracked `dist/` output if that is what the existing hosting integration consumes. Preserve the existing Node startup command, environment variables, private credentials, database and storage. Do not select `build:static`; it would disable backend features in the UI. No hosting configuration is changed by this release.

Repository inspection found no `.github` deployment workflows. Local memory records Hostinger previously deploying this branch through its Git integration and redeploy control. Hosting-side automatic deploy settings could not be verified without restricted hosting access. A Git push alone is not confirmation that ascore.ae has deployed. After pulling/redeploying, verify the homepage CTA, all four course routes, existing portal and enquiry flows on the live host. This task uses Git only; no File Manager operation is part of the release.

## Verification on 4 October 2026

- Both Library archives were materialized on the consuming Mac; all ten course-package SHA-256 checksums matched before integration.
- `npm run lint` passed with three existing warnings in AuthContext and the unused legacy Hero component.
- `npm run test:portal`: 23 passed, 0 failed, using isolated test databases/adapters. An initial sandbox run could not bind loopback; the permitted local-network rerun passed.
- `npm run build` passed in normal release mode, producing ten prerendered public pages, four private shells, the 404 page and four copied course pages. Existing deferred-3D chunk size advisory remains.
- `node --check public/courses/app.js` and `git diff --check` passed.
- All literal course route/asset references resolve in the built output. The built course files match their integrated source byte-for-byte. No PDF is present in `dist/`.
- Local Chrome inspected all four course pages at 320, 390, 430, 768, 1024, 1025, 1280 and 1440px without horizontal document overflow; desktop/mobile screenshots were reviewed.
- Cart checks passed: duplicate adds, AED 50/100 totals, refresh persistence, removal, Escape/focus, blank/invalid/valid email, review reset when email/cart changes and disabled payment.
- Homepage mobile checks passed at 320, 390, 430, 768 and 1024px: menu scroll lock and focus/Escape, one teaser with `/courses/` CTA, sticky services and reversible project transforms. Short viewport and reduced-motion fallbacks passed.
- Desktop geometry/font/padding/position checks match the original built baseline at 1025, 1280 and 1440px for the header, hero headline, service cards, work stage, contact heading and footer.
- No browser runtime errors were recorded. Backend/authentication code, original video files, hero/3D source and original stylesheet files are unchanged. Unfinished local legacy portal edits are preserved outside this release.

Browser evidence and the machine-readable report are retained in the consuming workspace's local QA folder. These are local Chrome checks; real-device Safari and deployed-host behavior remain post-pull checks.
