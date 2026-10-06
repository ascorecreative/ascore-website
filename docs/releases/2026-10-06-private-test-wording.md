# Private test order terminology

Baseline: `e5487d28facc95ff1df392b8555a0ca9e6011a44` on the existing Git release branch. The user clarified that zero-payment testing is private and is not a public free-course offer.

The private dashboard uses Test orders / Zero-payment test labels and identifies the public zero-payment checkout flag as Disabled when it is off. It no longer presents that flag as a missing prerequisite to enable. The course setup confirmation describes course-order tables. Home readiness distinguishes verified private prerequisites from permission to send an email. Existing API field names, schema checks, payment gates, server pricing, private upload rules, disabled controls and authorization remain unchanged.

The current runtime guide now explicitly requires `ASCORE_ENABLE_FREE_COURSES=0`; the previous instruction to enable public checkout for testing is superseded. This release adds no test-send endpoint and sends no email. A separate protected one-recipient action must be reviewed before implementation. The user reports Course database Ready after completing the existing Initialize action once and confirms the temporary schema flag is back at 0 after redeploy. Do not rerun initialization or re-enable that flag. Persistent private storage remains unverified.

Validation: lint and the normal production build pass. All five focused schema-action security tests pass. The isolated responsive dashboard and schema-action browser checks pass, including the visible Test orders wording, Disabled public checkout badge, unchanged confirmation/CSRF requests and private-storage gates. No production order or email was created.
