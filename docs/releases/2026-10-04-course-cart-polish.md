# Course prices and cart feedback

Course card and product prices now use separate AED and amount spans aligned on a shared baseline. Amounts use normal letter spacing, lining/tabular figures and deliberate 36px card / 42px product sizing. Prices remain AED 50 each and AED 100 together.

Adding a course now confirms in the button with a brief checkmark transition, updates the cart badge and displays an optional View cart action on the current screen. The drawer opens on request, with reversible transitions. Duplicate additions still retain one copy per course. Repeated clicks cancel prior feedback timers. Notification focus/hover pauses dismissal, and opening/closing the cart preserves the invoking control's focus and page scroll. The modal background is inert, Tab/Shift+Tab cycle through drawer controls and Escape closes it. Removal restores focus to a remaining cart control. Reduced-motion settings disable these animations.

## Scope and publication

Only public/courses, its byte-identical dist/courses copy, and this release evidence change. Homepage source/bundles, approved mobile card animations, desktop layout, Node API and portal remain at e0414dd. The normal production build was validated; unrelated regenerated root bundles were excluded from this course-only patch. Source remains compatible with subsequent normal builds.

Payments remain disconnected. Email review is local to the page, with no payment, order, email transmission or PDF download. Existing cart storage and all four course routes are retained. Course HTML asset query versions change to 20261004-cart-polish.

Publish through the existing codex/ascore-cloud-hero-portals branch in ascorecreative/ascore-website. No Hostinger control or File Manager operation is part of this release. Prior Git pushes propagated to the public site, but a push alone does not prove deployment; verify the public course HTML and asset hashes after publication.

## Design references

- W3C status-message guidance explicitly discusses cart-add feedback without moving focus: https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- W3C interaction-motion guidance: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- WAI modal dialog focus guidance: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- MDN numeric typography: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/font-variant-numeric
- Shopify Dawn's product/cart implementation was inspected as a production storefront reference: https://raw.githubusercontent.com/Shopify/dawn/main/assets/product-form.js

## Validation

Browser results are recorded in course-cart-polish-browser.json. Checks cover Chrome and Playwright WebKit at 320, 375, 390, 430, 768 and 1440 CSS-pixel widths; landing and both product pages; price spacing, baseline alignment and viewport fit; unchanged add-button dimensions and scroll; repeated additions; focused notification lifetime; modal focus/inert/Escape; interrupted drawer transitions; AED 50/100 totals and empty cart; cart persistence; invalid email rejection and review invalidation; reduced motion and disabled payment. Browser sessions record page errors and non-GET requests.

Existing portal tests, lint, normal build, JavaScript syntax and whitespace checks are run before pushing. Lint's three existing warnings and Vite's existing deferred-3D chunk advisory remain. Local WebKit is an engine check, not a physical-iPhone test. Screenshots are retained in the local QA folder.
