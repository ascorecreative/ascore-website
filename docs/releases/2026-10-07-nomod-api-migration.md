# Nomod general API migration

The existing Hosted Checkout charged the private AED 2 test successfully. Signed callbacks pass authentication but fail the eventId format guard. The owner requests the separate Nomod API integration. Do not treat this migration as proof the callback mismatch is fixed.

Official documentation read before implementation:
- https://nomod.com/docs/api-reference/introduction
- https://nomod.com/docs/api-reference/authentication
- https://nomod.com/docs/api-reference/requests-responses
- https://nomod.com/docs/api-reference/rate-limits
- https://nomod.com/docs/api-reference/generate-link
- https://nomod.com/docs/api-reference/retrieve-link
- https://nomod.com/docs/api-reference/fetch-charges
- https://nomod.com/docs/api-reference/retrieve-charge
- https://nomod.com/docs/webhooks/how-webhooks-work
- https://nomod.com/docs/webhooks/verifying-webhook-signatures

## Prepared behavior

NOMOD_PAYMENT_MODE=api-links selects the new server-side general API adapter for newly created orders. Old orders retain their provider mode; legacy private tests continue to use the Hosted Checkout diagnostic. Each new order creates one payment link with payment_expiry_limit=1, no tips, no shipping, no added service fee, no discount and no tax. Unknown creation outcomes are not automatically retried. The owned order UUID is stored in the link note; the provider-generated reference and link UUID are persisted before a customer redirect.

Read-only confirmation checks the exact stored link ID, provider reference, note, amount, currency, items, URL and fee settings. Charges are queried with the documented link_id and type=link filters, with bounded pagination. Each paid charge is independently retrieved and must match the stored order note and success URL, exact total, AED currency and zero refund/extras. An enabled link or a success redirect does not authorize delivery. A refund/dispute results in review. Existing persistent delivery claims prevent repeat email.

The strict response field assumptions still require live verification: note propagation to captured charges, return URL propagation and paid status vocabulary. Link item names/amounts, enabled status, payment_expiry_limit=1, zero extras and the three-decimal amount format were verified live without payment. Do not weaken validation merely to pass a live request.

The paused AED 2 public trial is preserved separately in /tmp/ascore-api-migration-preserved and excluded from this release. Public courses stay AED 49.99. Public flags and contract approval remain closed. General API order polling is prepared behind the existing activation gates.

## Validation

The migration-only release passes 124 backend tests; focused integration tests cover the API flow, one link creation despite retry, no fulfilment before capture, once-only delivery and refund holds. Build, prerender and compression pass. Lint has the same three existing warnings. These are mocked provider tests, not live payment verification.

## Next actions

The owner approved the full-access Ascore Website API credential, Ascore Website API Payments webhook, and private Hostinger storage for ascore.ae account u678643193. Credentials and NOMOD_PAYMENT_MODE=api-links are saved. Live authentication returned HTTP 200. Exactly one unpaid AED 2 verification link was created; creation and independent reads confirm the owned note/reference, AED amount, one-payment limit, matching items and zero extras. No charge occurred. Captured charge fields and real fulfilment are still unverified. Deploy through the existing Git branch and Hostinger workflow with public gates closed. Keep old key until reconciliation and replacement verification are complete. Any manual purchase/payment stays with the owner. Do not send any support message without approval of its exact draft.

## Captured verification and actual callback shape

The owner manually paid the existing private API verification link for AED 2. Independent GET Link, filtered List Charges and Get Charge confirm exactly one paid AED 2 capture with zero refund/customer extras. The used one-payment link has status expired. Captured charge note is empty; its link object contains the exact stored id and provider reference, type full. Its success URL carries the exact owned order UUID. The adapter now matches that independently retrieved link object, exact return URL, total/currency and zero refunds/extras; it does not require note propagation to the charge. Link note still binds the stored order. No PDF or Purchase event is generated for this separate private verification.

Authenticated live callbacks from the new API integration are JSON objects with valid type/data.id but no top-level eventId, unlike Nomod's example. The receiver uses the cryptographically signed svix-id as durable deduplication identity only when eventId is absent. A present invalid eventId remains rejected. Raw body signature/timestamp validation, payload conflict detection and captured charge verification remain mandatory. Svix documents the message ID as unique and stable on retries: https://docs.svix.com/receiving/verifying-payloads/how-manual . Actual callback retry after deployment must confirm HTTP 200; do not request another payment.

## Explicitly approved public AED 2 trial

Owner approved resuming public sales on ascore.ae u678643193 at AED 2 per course / AED 4 for both with automatic protected PDF email after exact captured-payment verification. Preserve previous orders and prices in the amount constraint. Six explicit hosting approvals enable the trial: ASCORE_ENABLE_PAID_COURSES, ASCORE_ENABLE_PAID_COURSE_DELIVERY, ASCORE_NOMOD_LIVE_REQUESTS_APPROVED, ASCORE_PAID_COURSE_TERMS_APPROVED, ASCORE_NOMOD_API_CONTRACT_VERIFIED and ASCORE_ENABLE_PUBLIC_COURSE_TRIAL, all 1. General API mode/key/webhook remain privately configured. Zero-payment checkout remains disabled. The trial flag authorizes the narrow owned price-constraint expansion; it never substitutes for captured-payment verification or the API contract approval.

128 backend tests pass, including the full server's closed defaults, separate contract/trial approvals, exact captured confirmation, once-only delivery and protected download capabilities. Build/prerender/compression pass. Removed stale 44% discount copy for the temporary price. Live new API verification captured one AED 2 charge; no real course fulfilment happened on that permanently excluded private probe. First customer purchase/email/download still needs live verification. No new private checkout or agent payment is authorized. Old Hosted key removal remains deferred until replacement is verified and irreversible revocation is confirmed at action time.

Live trial activation identified the existing amount check as an inline MariaDB column constraint (`LEVEL=Column`, `total_minor int(11) NOT NULL`, no default/extra/comment). MariaDB's known MDEV-30899 prevents dropping that check by name. The migration now verifies those column attributes, applies one MODIFY COLUMN with the same attributes and expanded known price set, and rereads the exact check before reporting schema ready. Named table checks retain the original path; unknown checks or column attributes fail closed. Three focused migration tests pass, covering inline checks, idempotence, concurrent migration, unknown attributes and failed postcondition.
