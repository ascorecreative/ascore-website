# Course sales preparation — 7 October 2026

This release prepares the existing course storefront; it does not enable public
sales, zero-payment checkout, paid PDF delivery or advertising spend.

- Course prices remain AED 49.99 each and AED 99.98 together. The owner confirmed
  the seller is not VAT registered; no VAT is added. Seller identity, support,
  delivery/link limits, Meta refund guarantee and purchase terms are now visible.
- Friday Meta Ads support uses Google Meet at 2 PM UAE time. The joining link is
  still pending from the owner; Friday-morning emails are not enabled. Enquiries
  use WhatsApp/call +971568555626 and info@ascore.ae.
- Consented product visits and real cart additions emit ViewContent/AddToCart.
  InitiateCheckout requires the enabled payment preparation flow. Purchase stays
  limited to server-confirmed paid receipts; private tests never count as sales.
  Privacy signals, withdrawal, sensitive URLs and private routes remain excluded.
- Sales copy follows the server's readiness result and fails closed on errors.
- Nomod's documented pay.nomodapp.com payment host is accepted explicitly by
  private verification. Other nomodapp.com subdomains and suffix lookalikes are
  not trusted. Production redirect hosts still require an explicit allowlist.
- Exactly one approved unpaid Meta checkout creation was attempted. The local
  durable claim remains uncertain and prevents another creation. The existing
  Nomod phone app shows the matching course, amount and creation time, with zero
  charges; its payment page returns to this app's private merchant reference.
  The provider Checkout UUID and signed completed-payment event are not verified.
  Restored the temporary private-test flag to 0; signed webhook receiving stays
  enabled. Public sales and PDF delivery remain closed.
- The owner portal now shows its private merchant reference and reconciliation
  guidance. No credentials, buyer details or checkout capabilities are committed.
- Owner-only recovery reads Nomod's documented Links lookup for the existing
  merchant reference, then independently verifies any returned ID with the
  Hosted Checkout endpoint. Ambiguous or mismatched results remain held. This
  action cannot create another checkout, charge, email, download or sale; a
  recovered private row stays permanently excluded from fulfilment.
  An optional copied payment URL permits one fixed-course-title search and an
  exact URL match when the Link reference differs from the Checkout reference.
  Only the Checkout response can establish the app's private merchant reference.
- The first live recovery read did not find a unique link by merchant reference.
  The existing payment page now confirms the unpaid checkout was cancelled by
  its Back to store return. It cannot be used for a payment test. A replacement
  and manual payment were subsequently approved by the owner. The replacement
  has its own durable request ID and ASCORE_ALLOW_NOMOD_REPLACEMENT_TEST gate;
  the original claim is preserved. Both remain excluded from delivery, reviews,
  weekly buyer emails and Purchase analytics. Restore the replacement gate to 0
  after its single creation. The owner must perform payment manually; the agent
  must not enter payment details, pay, refund or create further checkouts.
- If creation returns a UUID but fails the remaining validation, only that
  candidate ID is kept privately. Independent GET verification must establish
  its exact merchant reference, amount, currency and HTTPS URL before recovery.
  Failed independent verification retains only non-secret field checks for the
  owner, so a response mismatch can be diagnosed without another creation.
- Exactly one approved replacement was attempted. Nomod phone shows a new
  active AED 49.99 link at 6:30 AM UAE with zero charges. Creation and subsequent
  GET verification initially rejected the live unpaid `enabled` state, although
  ID, merchant reference, AED 49.99 and payment URL all matched. Recovery now
  recognizes `enabled` as unpaid, retaining permanent private quarantine. No
  further checkout is authorized. The owner attempted manual payment but reported
  insufficient balance; successful captured payment remains unverified.
- Nomod's existing Hosted Checkout webhook is active at the exact app receiver
  URL, with payment completion, failure, cancellation and refund subscriptions.
  No events were captured at the time of this check; its signing secret remains
  masked and was not rotated or copied.
- The exact redirect host pay.nomodapp.com is saved in Hostinger. The temporary
  creation flag is off and signed notifications are on. Public sales remain off.

Paid customer orders now have a separate administrator overview, with confirmed
revenue and payment/delivery states. Private tests are excluded by both durable
request IDs and private reasons; no receipt, payment or download capability is
exposed in this overview. Public gates remain closed.

Validation: 112 backend tests pass; lint has three existing warnings; production
build, course prerender and compression pass. Isolated Chrome checks cover the
closed and enabled presentations, mobile/desktop layout, unchanged prices,
review-only checkout and safe provider-error handling. No provider request,
payment or email can run from the isolated preview. Meta processed live PageView,
ViewContent and AddToCart after deployment; the cart event carries AED 49.99 and
the Meta course ID. Purchase is not emitted for the private test. Seven unrelated
shared-checkout files retain their hashes.

Official host evidence: https://nomod.com/docs/integrations/deep-linking
Official recovery lookup: https://nomod.com/docs/api-reference/list-link

The owner subsequently authorized one AED 2 test after insufficient balance on
the AED 49.99 replacement. Nomod offers no edit action for that existing link.
A separate finite AED 2 private ledger and owner action are prepared, protected
by ASCORE_ALLOW_NOMOD_SMALL_TEST. Its immutable amount, empty customer email and
held status cannot become customer sales, PDF fulfilment or Purchase analytics.
Setup uses the verified existing database and adds one owned table without
altering customer payment tables. Creation and manual payment are pending.
The live unpaid `enabled` state is accepted as pending in customer checkout
parsing, while production contract verification and public gates stay closed.

The AED 2 test was created once and independently authenticated at the exact
merchant reference, amount and currency. The owner reports the charge succeeded.
Its success return displayed HTTP 503: startup rejected the newly owned private
test table because the main database ownership inventory did not include it.
The production verifier now recognizes that one table only with its ownership
marker; unmarked tables and unrelated databases still fail closed. A regression
test covers actual production inventory verification after private test setup.
Fresh HTTP health and signed payment confirmation remain required before sales.

Fresh recovery checks confirm the AED 2 checkout is paid with the exact private
reference, AED currency and captured total. Its signed completed event is still
awaiting successful delivery after the outage. Nomod's existing Hosted Checkout
webhook points to the exact receiver; completion attempts at 07:01 and 07:06 UAE
show failed delivery. No further checkout or payment is needed or authorized.
Public gates and the reviewed-contract gate remain closed.

The owner portal now gives public purchasing an explicit enabled/disabled status,
collapses private verification history and describes launch gates consistently.
Customer download emails include the owner's Friday 2 PM UAE Google Meet support
arrangement and WhatsApp/call contact. The reusable joining link remains pending;
weekly emails remain disabled. The targeted 17 payment/diagnostic tests pass;
production build and lint pass with the same three existing warnings.

Launch hardening: the protected 24-hour download window begins with the first
independently verified captured payment. A delayed payment or return remains
confirmable; repeated receipt checks cannot extend expiry or resend email.
Optional reviews and weekly-session tables are recognized by production inventory
only with their own ownership markers; this release does not create them.
The administrator sees the latest webhook attempt's time, HTTP status and fixed
reason only. Bodies, signatures, credentials and buyer data are never retained
in this diagnostic. It resets on deployment; stored signed events stay durable.
115 backend tests pass, plus production build and lint with existing warnings.
Public activation still awaits the real signed AED 2 completion notification.

The cart availability paragraph now follows server readiness on every course
route, preventing stale disabled copy after launch. Friday joining copy reflects
the owner's confirmed email arrangement; automated weekly delivery still needs
the reusable Meet link and separate setup. Safe isolated browser checks verify
the enabled cart and review screen at AED 49.99, at 390px and 1440px widths,
without creating a provider checkout, sending email or exposing a paid PDF.

Consented GA4 page locations retain only the existing validated UTM allowlist;
Meta click identifiers, referrers and private query fields remain excluded.
Denied consent, browser privacy signals and sensitive URLs still load no tags.
The attribution regression passes with the existing consent/Purchase protections.
Live GA4 reporting after restart returned actual connected property metrics.
