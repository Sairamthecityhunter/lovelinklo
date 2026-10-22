# LoveLink shop activation

The public shop opens with previews only. No live credentials are configured and SHOP_ENABLED is false by default.

## Products
- Premium: USD 4.99/month, covers the subscriber and their current connected partner. Three themes, six avatar colors, two bonus quizzes. Gifts and books are not included.
- Wedding garden 4.99, Winter cabin 5.99, Romantic island 7.99: one-time theme access for the buyer's current couple.
- Bouquet 1.99, hearts 0.99, celebration 2.99: one purchase can be sent once to the connected partner. Both people can replay it.
- Love book 4.99: five personalized sections, printable HTML download; browser Print → Save as PDF. No AI generation.

## Merchant connection required
1. Activate the owner's Stripe merchant account and payout details through Stripe. Keep credentials out of chat and source control.
2. Configure the customer portal to allow subscription cancellation and payment-method updates.
3. Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET as secret runtime values in Sites. Set SHOP_ENABLED=true only after testing. Test and live purchase entitlements are isolated.
4. Point Stripe's webhook at https://lovelink-moments.tangy-lime-6083.chatgpt.site/api/shop/webhook using API version 2025-06-30.basil. Subscribe to checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.expired, customer.subscription.created/updated/deleted, charge.refunded, and charge.dispute.created.
5. Publish with the environment change. Test checkout, return confirmation, repeated webhooks, billing cancellation, and a real low-value charge/refund before promoting purchases.

Prices are owned by the server catalog, not the browser. No checkout links or credentials are user-editable. Only a verified signed webhook or a server retrieval of the buyer's own paid Stripe session unlocks purchases. Payment setup and real transactions were not performed in this implementation.

One-time refunds/disputes revoke access. Subscription refunds are handled by the merchant in Stripe; cancel the subscription as appropriate so its cancellation webhook updates access. Configure your own customer support and refund policy before launch. Tax and merchant onboarding remain the account owner's responsibilities.

Tests: node tests/shop-api.test.mjs uses a local database and mocked Stripe HTTP responses, never live payments. Existing API suites cover account and world isolation.
