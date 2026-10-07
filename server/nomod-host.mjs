// Nomod documents pay.nomodapp.com as its payment-link host; Hosted Checkout
// returned that exact host during the approved unpaid integration check.
// Keep this explicit: arbitrary nomodapp.com subdomains are not trusted.
export const nomodOwnedHost = host => host === 'pay.nomodapp.com' || host === 'nomod.com' || host.endsWith('.nomod.com')
