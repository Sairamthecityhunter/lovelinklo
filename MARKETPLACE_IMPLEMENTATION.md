# Connected LoveLink commerce

Customer website: `/gifts` and `/shop`. Seller website: `/seller`.
Both use the same authenticated user IDs, durable database, reviewed product catalog, and physical order records. They are separate interfaces on one hosted website, not separate payment databases.

## Implemented

- Seller applications, private drafts, uploaded photos, market-specific INR/USD prices, owner review, explicit public listing consent, stock, shipping, preparation and transit estimates.
- Stripe-hosted connected-seller onboarding and provider-side bank/identity collection. Account country, card-payment capability, charges, payouts, and details submission are checked before every physical checkout. Full Stripe dashboards belong to sellers.
- One physical item per checkout, domestic address collection, gift/personalization note, seller policy acknowledgement, automatic Stripe Tax, server-calculated prices, explicit configurable commission on item price only.
- Atomic inventory reservation and immutable purchase snapshot. Checkout request IDs prevent duplicate reservations. Stripe idempotency prevents duplicate sessions on retries. Checkout expires after one hour.
- Signed connected-account payment webhooks. Account ownership, mode, checkout reference, buyer, currency, item/shipping subtotal, tax, final total, and shipping country are validated before fulfillment.
- Shared buyer/seller order history; seller shipment and tracking entry; latest order support message; full refund action and signed partial/full refund and dispute status updates.
- Expired/failed checkout restores reserved stock once. Refreshing an order reconciles provider payment status. If a provider timeout left the session ID unsaved, reconciliation scans that account's checkout sessions (up to 1,000) before recovering the session or releasing an old reservation. It fails closed when the scan is incomplete.
- Paid-order financial records survive personal profile/content deletion. Active unfulfilled orders, refunds, and disputes block deletion/clear. Financial records are separate from relationship data. Support and delivery addresses remain accessible only to the order's buyer and seller.
- Owner payment-configuration status without secret values.

## Current publication

No hosted payment configuration was present at inspection. Digital and physical real-money checkout remain disabled. Empty/sample gift ideas are not real inventory. The code does not create merchant credentials, verify a seller itself, guarantee stock/delivery, or create a payout outside Stripe.

## Owner launch procedure

1. Establish the operating business and obtain a Stripe Connect platform approved for the desired seller countries and direct charges. India availability needs explicit provider confirmation; do not assume a USA platform can onboard India sellers. Enable only confirmed markets.
2. Finalize seller/customer terms, commission, domestic delivery operations, tax obligations, return rules, support, and dispute procedures. Sellers are the merchant of record in this direct-charge design. Do not advertise escrow, insurance, or guaranteed seller protection.
3. Configure secure hosted runtime secrets `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_CONNECT_WEBHOOK_SECRET`. Never place them in source, browser bundles, messages, or public documents.
4. Digital events go to `/api/shop/webhook`. Connected-account events go to `/api/marketplace/webhook`: `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `account.updated`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`.
5. In a test environment, configure `MARKETPLACE_COUNTRIES` (approved codes separated by commas), `MARKETPLACE_FEE_BPS` (1000 means 10%), `MARKETPLACE_ENABLED=true`. Enable `SHOP_ENABLED=true` for digital sales separately. Commission must be explicit; there is no hidden default.
6. Review a seller application and product. Seller enables catalog consent, accepts displayed fees/responsibilities, and completes Stripe onboarding. Seller configures Stripe Tax, accurate tax registrations and product classification before accepting orders. Current physical products use the general tangible-goods tax code; category-specific exemptions/classification must be reviewed before launch.
7. Run real provider test-mode scenarios: successful card, declined card, authentication, network timeout, expired checkout, refund, tracking, webhook retries, seller restrictions, countries, and taxes. Automated repository tests simulate provider requests; they do not substitute for this step. Perform mobile/desktop browser acceptance checks.
8. Configure live secrets only after these tests and operations are complete. Re-onboard/accept seller fees in live mode. Do a small real pilot sale, shipment and refund before advertising broad availability.

## Deliberate limits

- Domestic India or USA only; no cart across sellers, cross-border shipping, currency conversion, or carrier label purchasing.
- Service area is seller text plus buyer acknowledgement and country enforcement; city/postal-code restrictions are not automatically validated.
- Latest buyer/seller support message is in-app only; no outbound order email/SMS. Carrier tracking is entered by the seller; delivery is not auto-confirmed.
- Full refunds can be initiated here; partial refunds and disputes are managed in seller Stripe dashboards and reflected by webhooks. Refunded physical inventory is not automatically restocked.
- The reservation recovery scan is bounded. If it cannot complete, owner/provider investigation is required; inventory is not released on an assumption that payment failed.
- Profile deletion does not delete a connected Stripe account or cancel financial obligations. Financial retention/anonymization policies must be finalized for the operating business before commercial launch.
- Closed-app notifications, external AI service, and TURN relay require their own configured providers; those integrations are separate from purchasing.

## Validation

`pnpm exec tsc --noEmit`, production Worker build, and `tests/marketplace-api.test.mjs`, plus existing state, digital shop, seller, Together, concierge, and world API regression suites. No real money is charged by the tests. Browser visual acceptance remains outstanding in this environment.

Primary implementation references: https://docs.stripe.com/connect/direct-charges?platform=web&ui=stripe-hosted , https://docs.stripe.com/connect/webhooks , https://docs.stripe.com/api/account_links/create , https://docs.stripe.com/tax/connect .
