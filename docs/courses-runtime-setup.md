# Private course runtime setup

The user's confirmed hosting location is Website Dashboard → Environment variables. Enter credentials privately there; never put them in Git, frontend code, chat, or a `VITE_` variable. The course sender reads exactly these independent fields:

| Field | Value |
| --- | --- |
| `COURSE_SMTP_HOST` | `smtp.hostinger.com` |
| `COURSE_SMTP_PORT` | `465` |
| `COURSE_SMTP_USER` | `orders@ascore.ae` |
| `COURSE_SMTP_PASSWORD` | Private password for that mailbox |

The code sets TLS and From/envelope `orders@ascore.ae`. Existing `SMTP_*` enquiry settings remain separate. The user reports saving all four course fields; that does not independently establish authentication or delivery. Rebuild/restart the new Git release before checking its behavior. An environment-triggered deployment of the prior commit does not publish new source code.

Before the explicitly requested one-customer FREE test, an authenticated existing admin must inspect `/portal/?view=courses`: check `schemaReady`, `storageConfigured`, both installed assets and `senderConfigured`. Normal production startup does not create tables. The approved `aswinfrn` administrator can now initialize only the three FREE-course tables through the protected **Initialize course database** action. The operator must temporarily set `ASCORE_ALLOW_COURSE_SCHEMA_SETUP=1`, keep `ASCORE_ENABLE_FREE_COURSES=0`, and restart/redeploy the current Git release. Reload Course orders, confirm the action once, check that database readiness is Ready, then set `ASCORE_ALLOW_COURSE_SCHEMA_SETUP=0` and restart. Keep account activation disabled (`ASCORE_ALLOW_ADMIN_SETUP=0`, `ASCORE_ADMIN_SETUP_GRANTS={}`). Do not change the existing database identity. The action rechecks the runtime database identity, core schema and table ownership, accepts no SQL/configuration, and audits its outcome. A partial failure requires readiness review; it is not automatically retried. See [approved schema action](releases/2026-10-06-course-admin-setup.md).

Configure `ASCORE_COURSE_PDF_DIR` only as a hosting-confirmed persistent absolute directory outside repository and public webroot, owned by the runtime user, permissions 700. Do not guess a hosting path. The file picker stays disabled until this field is present in the running app. Install files through the existing authenticated admin upload, with file permissions 600. Meta must match edition 5 SHA-256 `213035507992b62cd373a920a583dab76df300ca68db75d64c65868e480925b5`; AI must match SHA-256 `e2a3116af5428c4893401d9fbb7b0293370563f89e2f329c2ce7485cc1a2f1e5`. Both approved PDFs have now been verified privately on the consuming Mac. That does not establish production installation. Never upload complete paid PDFs to public or dist.

Only after private setup is verified may the authorized FREE test use `ASCORE_ENABLE_FREE_COURSES=1`. Public `/api/courses/config` must then report `freeCheckoutReady:true` before submitting the exact requested course and email once. Preserve the request ID and receipt token. An SMTP `accepted` result establishes mailbox-provider acceptance, not inbox delivery; confirmation requires recipient evidence. No actual email test occurred during development. The production setup and test are blocked until authenticated admin/runtime access is available; do not bypass hosting restrictions or retrieve credentials.

Prepared Nomod URLs use the production origin `https://ascore.ae`:

- Success: `/courses/checkout/?payment=success&order=<server-order-id>`
- Failure: `/courses/checkout/?payment=failure&order=<server-order-id>`
- Cancelled: `/courses/checkout/?payment=cancelled&order=<server-order-id>`
- Signed POST webhook: `/api/courses/payments/nomod/webhook`

These routes are prepared in code, not registered with Nomod. The backend uses `https://api.nomod.com/v1/checkout` and server-only `X-API-KEY`. Store a future approved key in `NOMOD_HOSTED_CHECKOUT_API_KEY`, webhook signing secret in `NOMOD_WEBHOOK_SIGNING_SECRET`, and only verified checkout redirect DNS hostnames in `NOMOD_CHECKOUT_HOSTS`. No hostname is guessed. Preserve the existing HTTPS origin, database and hosting entry settings.

Leave `ASCORE_ENABLE_PAID_COURSES`, `ASCORE_ENABLE_PAID_COURSE_DELIVERY`, `ASCORE_ENABLE_NOMOD_WEBHOOKS`, `ASCORE_NOMOD_LIVE_REQUESTS_APPROVED`, `ASCORE_PAID_COURSE_TERMS_APPROVED`, and `ASCORE_ALLOW_PAYMENT_SCHEMA_SETUP` at 0. API keys alone cannot activate purchasing because the production application also leaves `contractVerified:false`. Required activation evidence includes actual Hosted Checkout response/charge correlation, captured state, exact totals and AED currency, verified redirect hosts, approved terms/refund/delivery policies, private storage and mail readiness, and separate authorization for any live provider request. No documented sandbox was assumed. Interrupted processing events and uncertain writes require operator review; do not blindly replay them.

Primary provider references: [Hosted Checkout](https://nomod.com/docs/hosted-checkout), [create checkout](https://nomod.com/docs/api-reference/create-checkout), [retrieve checkout](https://nomod.com/docs/api-reference/retrieve-checkout), [webhook events](https://nomod.com/docs/webhooks/how-webhooks-work), [signature verification](https://nomod.com/docs/webhooks/verifying-webhook-signatures). Implementation tests use mock fetches and fixture signing secrets, never the user's Nomod account.
