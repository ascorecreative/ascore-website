# Screenshot-backed phone viewport correction

Both supplied screenshots were materialized and visually inspected. They show the Ascore homepage hero and studio/statement sections. The hero has a single-line desktop title, visible desktop specimen caption and tiny supporting labels. The studio paragraph, links and header are scaled down even though the site is on a phone.

This layout was reproduced on a 430px phone with a 980px layout viewport. Before the fix, that case reported `innerWidth=980`, scale `0.4387755`, inline hero emphasis, visible specimen caption and a 70px studio heading subsequently scaled down on screen. The ordinary-width smoke checks in the preceding release did not exercise this mismatch. The screenshots do not establish which device/browser setting originally caused the wide viewport.

The old head script skipped correction when the touch count was zero or the viewport initially appeared normal. It never revisited a layout that settled later. Phone detection now also recognizes coarse pointers and mobile user agents, sets the phone's CSS screen width from the start, and refreshes it at DOM readiness, page restoration and orientation changes. Pinch zoom remains unrestricted. The viewport supports edge-to-edge safe areas, and compact headers/menus reserve their insets. Phone hero and studio/statement headings have less cramped tracking and clearer word spacing; studio typography uses a smaller, readable scale. Opening the compact menu focuses its first link with no scroll jump, including WebKit's tap-focus behavior.

Only `index.html`, the compact-menu focus line and the mobile refinement layer change in source. Styles are scoped to widths at or below 1024px, with phone typography at or below 600px. The existing hero/3D engine, original videos, mobile card animations, course code, payments-disabled state, portal/backend, credentials and database are retained. The normal production build and tracked `dist/` are included for the established Git integration.

## Checks

- Rendered Chrome and Playwright WebKit checks at 320x568, 375x667, 390x844, 430x780, 430x932, 600x900, 768x1024 and 844x390.
- Both engines also exercised a forced 980px viewport with zero reported touch points, late wide-layout mutation and restored-page normalization: the corrected viewport was 430px with the phone title/caption styles active.
- Twenty browser cases passed: horizontal overflow, heading text bounds, readable supporting copy, menu scrolling/focus/Escape, sticky service cards, reversible tall-screen project motion and short-screen scroll rail. Initial WebGL hero containers and screenshots were checked in both engines, with no browser runtime errors.
- Desktop geometry, fonts, tracking, padding and positioning match the previous release at 1025, 1280 and 1440px for the header, hero, studio, statement, service cards, work, contact and footer.
- `npm run lint` passes with the three existing AuthContext/legacy-Hero warnings; all 23 existing isolated portal tests pass; normal production build and `git diff --check` pass. The existing deferred-3D bundle size advisory remains.

Before/after screenshots and the browser report are retained in the consuming Mac's local QA evidence directory. Playwright WebKit is a Safari-engine check, not a test on the user's actual iPhone. Real-device confirmation and public propagation remain separate from local build validation. Release uses only `ascorecreative/ascore-website`, branch `codex/ascore-cloud-hero-portals`; no hosting control or File Manager access is used.
