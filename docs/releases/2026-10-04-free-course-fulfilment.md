# FREE course checkout and private team operations

The existing Ascore Node backend now owns course quotes, FREE coupon orders, email job state and protected downloads. The storefront keeps AED 50 per PDF / AED 100 for both; the server computes a 100% FREE discount and accepts only zero-value orders. Paid checkout remains disabled and no Nomod API is activated.

Checkout includes coupon entry, review and an explicit Email my PDFs action. Email/cart/coupon edits invalidate the review. A session-local request reference is reused after interrupted requests, and the server refuses reuse with changed contents. The UI shows queued, rejected and uncertain outcomes without claiming email success before the SMTP adapter accepts the message.

The team dashboard is reached at `/portal/?view=courses`, using existing login, admin role and CSRF protection. It is absent from public navigation and from client-account navigation. It reads persisted order history, FREE order counts, actual paid revenue (zero while paid checkout is disabled), seven-day UTC order totals and email delivery states. It supports status filtering, pagination and safe retry of confirmed temporary email failures. Uncertain outcomes are never automatically resent. No production accounts or authentication settings are created or changed.

## Private PDF installation

The authenticated dashboard uploads the two approved PDF editions to an operator-configured directory outside the repository/public webroot. The directory can be created by the application on first upload with owner-only permissions. This is application upload, not hosting File Manager access. Inputs require admin authorization, same origin, CSRF, PDF content type, an 8 MiB maximum, a PDF signature and the exact approved SHA-256. Filenames are selected by the server. Valid files are installed atomically with mode 0600. Arbitrary files, wrong editions, path traversal, loose directory permissions and repository destinations are rejected.

- Meta: 25 pages; SHA-256 `3b70d8d8ecbd0a33fe445bee123c08da059ae80390a3ab895933218722d4c61b`.
- Practical AI: 42 pages; SHA-256 `e2a3116af5428c4893401d9fbb7b0293370563f89e2f329c2ce7485cc1a2f1e5`.

PDF bytes and SMTP/database secrets are excluded from Git and dist. Downloads require an unguessable course/order-bound token, expire after 24 hours and allow ten GET downloads per selected course. HEAD requests do not consume that course allowance. Responses are private/no-store with no-referrer and noindex. Tokens, email bodies and credential values are not logged by application code.

## Required production steps — not executed by this release

Public `/api/health` currently confirms production MariaDB, verified base schema version 1 and tracking-only payments. This Mac has no database/SMTP runtime configuration. Existing production secret values were not inspected. Git publishes code only; it does not provision private runtime settings, initialize production course tables, install PDFs or confirm inbox delivery.

1. Preserve the existing approved database configuration. In that same production runtime, an authorized operator runs the additive course migration once:

   ```sh
   NODE_ENV=production ASCORE_ALLOW_COURSE_SCHEMA_SETUP=1 node server/setup-course-schema.mjs
   ```

   This assumes the host already supplies its existing DB_* and other runtime configuration. The script verifies database ownership before adding only course_orders, course_downloads and course_limits, with separate ownership/version markers. It creates no accounts, orders or emails. Normal startup performs no course DDL. Disable/remove the one-off setup flag afterward. Do not change ASCORE_ALLOW_SCHEMA_SETUP or replace the existing database.

2. Set ASCORE_COURSE_PDF_DIR privately to an absolute, writable, persistent path outside the deployment checkout and public webroot. The hosting operator must confirm that this location survives redeployment. Keep ASCORE_ENABLE_FREE_COURSES=0 during preparation.
3. Sign in with an existing authorized team account at `/portal/?view=courses`. Upload each corresponding approved Library PDF through Verify & install private PDF. No public URL, Git PDF commit or File Manager operation is needed.
4. Provision or verify server-only SMTP_HOST=smtp.hostinger.com, SMTP_PORT=465, SMTP_USER=info@ascore.ae and SMTP_PASSWORD through the approved private runtime settings. The current implementation reuses that existing sender convention and does not depend on Zoho CRM credentials. If the team supplies a different sender/host/port, review that configuration before activation.
5. After the dashboard confirms database, PDFs and sender readiness, set ASCORE_ENABLE_FREE_COURSES=1 and restart the application. Paid checkout stays disabled. Use the confirmed test recipient, apply FREE, review the AED 0 total and submit exactly once. Check both inbox/spam delivery and both protected PDF downloads before calling the live delivery test complete.

Email jobs persist before sending, are claimed transactionally across workers, have bounded concurrency/attempts/backoff, and resume on restart. Confirmed temporary rejections retry safely; uncertain results require provider reconciliation. Persistent per-address, per-IP and global limits bound public FREE checkout. The FREE coupon is deliberately public test functionality; turning its runtime flag off prevents new redemptions and retains existing order history for the team.

## Verification

The normal production build, lint and existing portal tests pass. Focused tests cover authoritative pricing; coupon/cart/email tampering; duplicate/concurrent/restarted orders; rate limits; explicit versus uncertain SMTP failure; admin role/CSRF; private upload size/type/edition/traversal restrictions; download binding/expiry/counts; tied-timestamp pagination; additive schema ownership and no automatic migration. Existing three lint warnings and deferred-3D bundle advisory remain.

Local Chrome and Playwright WebKit checked checkout at 320, 390, 768 and 1440 CSS-pixel widths. Eight persisted FREE orders produced eight locally captured email jobs and zero paid revenue. Both real PDFs were installed through the actual authenticated admin upload and fetched through their protected links; their returned bytes matched the approved hashes. Dashboard status filters, desktop/mobile viewport fit and unauthenticated access rejection passed without browser errors. This is local functional evidence with captured mail, not production SMTP/inbox or physical-iPhone verification.

Future paid fulfilment remains a separate integration: payment/order correlation, Nomod `charge.completed`, signature/timestamp verification and event deduplication are required before a paid download is granted. Official references: https://nomod.com/docs/webhooks/how-webhooks-work and https://nomod.com/docs/webhooks/verifying-webhook-signatures.
