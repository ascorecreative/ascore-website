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
- The exact redirect host pay.nomodapp.com is saved in Hostinger. The temporary
  creation flag is off and signed notifications are on. Public sales remain off.

Validation: 104 backend tests pass; lint has three existing warnings; production
build, course prerender and compression pass. Isolated Chrome checks cover the
closed and enabled presentations, mobile/desktop layout, unchanged prices,
review-only checkout and safe provider-error handling. No provider request,
payment or email can run from the isolated preview. Meta processed live PageView,
ViewContent and AddToCart after deployment; the cart event carries AED 49.99 and
the Meta course ID. Purchase is not emitted for the private test. Seven unrelated
shared-checkout files retain their hashes.

Official host evidence: https://nomod.com/docs/integrations/deep-linking
Official recovery lookup: https://nomod.com/docs/api-reference/list-link
