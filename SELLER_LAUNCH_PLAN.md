# LoveLink Sellers: India and USA pilot

## Product and pricing

- Dedicated seller website entrance: `/seller`, separate from the couple workspace.
- Individuals, independent makers, and gift businesses can prepare applications and product drafts.
- India-based sellers use INR and propose domestic India delivery. USA-based sellers use USD and propose domestic USA delivery. One domestic market per seller in this pilot.
- Applications and drafts are free. No seller subscription is proposed.
- Proposed future platform commission: 10% of item subtotal, excluding shipping and tax. This is a planning assumption, not an active contract or charged fee.
- Calculator deducts product, packaging, carrier, estimated processing, and risk allowance costs. It is not a tax calculator, processor quote, payout statement, or earnings guarantee.

## What works in this release

Authenticated, durable seller applications; product drafts; privately uploaded product images; submitted-record owner review; notes and change requests; record archive; seller policy/support cases; INR/USD pricing estimates; country and currency validation; server-side ownership and review authorization; edit revision checks; audit entries; and private photo access.

Seller-consented, owner-reviewed catalog previews are integrated into the customer Gift pages, separately for India and USA. The public preview exposes only the opted-in product information, shop name, and city, not seller email or private application details. Product edits, archiving, permission withdrawal, or application review revocation remove public preview access and photo access.

No listing is published to customer checkout. No payment, reservation, payout, email, KYC verification, escrow, insurance, or chargeback coverage is created by saving, submitting, or reviewing a record.

## Launch gates — all required before paid physical sales

1. Decide the platform's operating entity and country, contracting seller, merchant of record, and responsibility for returns/disputes. Have qualified legal and tax professionals review obligations in each country.
2. Confirm marketplace processor approval and supported seller countries. Stripe India is invite-only; do not assume a USA account can automatically onboard India sellers. Assess locally supported marketplace providers if needed.
3. Use provider-hosted seller identity verification, bank onboarding, and payouts. Never collect bank credentials, government IDs, PAN, SSN, or payment-card details in these forms.
4. Agree final seller fees, settlement schedule, refund and dispute handling, tax responsibilities, prohibited-item policy, and suspension process. Do not advertise guaranteed protection or payouts.
5. Implement verified payment webhooks, order ledger, item/shipping/tax totals, stock reservation, receipts, refund ledger, payout reconciliation, and idempotent transaction operations. Existing digital-gift checkout is not seller payout infrastructure.
6. Integrate carrier tracking, delivery evidence, seller support, and a staffed issue-resolution process. Establish carrier claims and optional insurance where applicable.
7. Pilot domestic sales with a small reviewed seller cohort in one market first, then independently verify readiness for the other market. Enable cross-border selling only after customs, tax, currency, restricted-goods, and returns arrangements are ready.

## Protection boundaries

Private drafts are visible only to the seller. Only submitted/reviewed/support records enter owner review. A reviewed pilot record is not a verified-seller badge and never changes checkout availability. Sellers can report misuse and receive stored review notes, but cases do not guarantee a response time or replace the payment provider's dispute process.

## Verified provider references

- https://support.stripe.com/questions/stripe-accounts-are-invite-only-in-india
- https://support.stripe.com/questions/stripe-india-support-for-marketplaces
- https://docs.stripe.com/connect/merchant-of-record
- https://docs.stripe.com/connect/disputes

Reviewed October 2, 2026. Reconfirm provider eligibility and obligations before activation.
