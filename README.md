# LoveLink

A working couples website and installable progressive web app. Love Wish Pins are the central journey: save a thought, choose its moment and timezone, set a reminder, and follow through.

## Product structure

- `/`: private couple dashboard, both clocks, relationship duration, Don't Forget card, live countdown, active wishes, gift ideas, recent memory, and upcoming dates.
- `/pins`: create/edit/delete wishes; all ten types; 13 preset offsets; custom days/hours/minutes; recurrence; secret mode; search; completed/recurring views; snooze; notification actions.
- `/calendar`: month navigation, birthdays and annual events, all pinned tasks, linked wishes, and occasion planning.
- `/gifts`: searchable sample products and experiences, budget/delivery-date filters, gift guide, wishlist actions, delivery estimates, demo checkout, and saved demo orders.
- `/wishlist`: saved gifts and quick pins.
- `/memories`: editable private/shared photos, GIFs, videos and audio, dates, places, notes, and memory cards.
- `/surprises`: animated digital boxes with a letter, up to eight uploaded media items, an optional HTTPS playlist link, private drafts and scheduled partner access.
- `/letters`: editable letters, writing prompts, open-when labels, scheduled sharing, and send-later pins.
- `/plans`: bucket-list dreams, progress, date suggestions, both-timezone daytime hint, and a relationship recap.
- `/settings`: profile, partner invitations, long-distance mode, dark mode, notification controls, content export/clear, account deletion, disconnect, install guidance, and explicit integration status.
- `/about`: the LoveLink introduction and entry into the working app.
- `/invite`: authenticated, explicit partner acceptance. Private site access is separate from couple membership.

## Architecture

The app uses TypeScript, React 19, the Next.js App Router, Tailwind CSS, and the bundled Radix/Shadcn primitives. This branch runs on Vercel’s Node.js runtime with a standard Postgres database (Neon or Vercel Marketplace Postgres) through `DATABASE_URL`. Drizzle owns the schema and migrations. Uploaded media is stored as `bytea` rows in Postgres (`media_blobs`), so no Cloudflare R2/KV/D1 bindings are required. Sessions are hashed with `AUTH_SECRET` and stored in `auth_sessions`. No personal record uses browser storage as its source of truth.

The original Cloudflare Worker / D1 deployment remains on the default branch for the `lovelinklo` project. Do not merge this branch there.

Server handlers check the dispatch-provided authenticated user on every account API. The live website is initially owner-private. The anonymous local preview explicitly uses an in-memory example couple; refreshing that demo resets it. Signed-in users receive a durable starter dataset on first use and can personalize the profile or clear the example content.

The main UI and forms are in `app/lovelink.tsx`, `app/love-forms.tsx`, and `app/love-views.tsx`. Domain types, validation, dates, data access, and provider interfaces are separated in `lib/`. Auth helpers remain server-only. `db/schema.ts` defines 29 relational tables with ownership, foreign keys, indexes and timestamps. Record payloads are validated at the API boundary. Schema-only migrations are in `drizzle/` and must remain immutable after publication.

### Server routes

| Route | Behavior |
| --- | --- |
| GET `/api/state` | Authenticated, privacy-filtered couple state |
| POST `/api/state` | Validated record/profile changes, completion, snooze, inbox generation, thinking-of-you, clear, disconnect and account deletion |
| POST `/api/invite` | Create a seven-day, hashed, single-use invitation or atomically accept it |
| POST `/api/media` | Validate media signatures and size, store private bytes and ownership metadata |
| GET `/api/media/:id` | Authorize ownership, a shared memory, or an unlocked shared surprise; support bounded byte ranges for playback |
| POST `/api/ai` | Consent-gated AI request, with hourly request limiting and no hidden partner data |
| POST `/api/reminders/process` | Authenticated job endpoint for an external reminder scheduler and notification gateway |

### Authorization and privacy

- Ownership comes from trusted platform headers, never a client-supplied user or couple ID.
- Records are scoped to the user's couple, then filtered by creator/secret status. Only the creator can edit or delete a record.
- Notification inboxes are owner-only. Shared letters are excluded from the partner's API response before their scheduled date; hiding is not only cosmetic.
- Invitations store SHA-256 token hashes, expire in seven days, and are claimed with a two-member limit in an atomic batch.
- Mutations reject cross-site origins. SQL uses bound parameters and a fixed server-side table allowlist. Sensitive responses use `private, no-store`.
- Media supports JPG, PNG, WebP, GIF (10 MB), MP3, WAV, M4A (20 MB), MP4 and WebM (30 MB), checked by container signatures and bounded upload reads. Media codecs still depend on the browser. The browser never receives raw object-store credentials or public storage URLs.
- External notification text respects the creator's notification-privacy setting. No location tracking is implemented.
- Privacy is access control plus transport/platform storage protections, not end-to-end encryption.

## Reminder semantics

Every pin stores an absolute UTC `dueAt`, an IANA timezone, the repeat rule, original day-of-month anchor, reminder offset in minutes, and optional snooze/notification timestamps. Countdown displays derive from absolute time and update every second.

Custom `2 days, 4 hours, 30 minutes` is stored as 3,150 minutes. Presets cover 30d, 14d, 7d, 3d, 1d, 12h, 6h, 3h, 1h, 30m, 15m, 5m, and exact time.

Daylight-saving gaps are rejected at entry. Ambiguous repeated hours use the first occurrence, disclosed beside the dual-timezone preview. Recurring pins preserve local wall time and the original month-day anchor; January 31 becomes February 28/29, then March 31. On completion, missed occurrences are skipped until the next future reminder. Snooze changes the reminder timestamp without moving the occasion. Annual calendar dates remain visible in later years. Upcoming cards and smart plans resolve the next occurrence in the event timezone, retaining the original leap-day anchor. Preparation tasks subtract local calendar days, preserving time through DST. Smart plans open on the selected event and disable already-added tasks. Send-later pins retain their specific letter link.

The foreground scheduler checks every 10 seconds, stores an idempotent in-app notification, and optionally shows a browser notification when permitted. Private content is not cached offline. A closed app cannot run JavaScript timers reliably: background notification delivery is intentionally not advertised as active without the gateway and scheduler below.

### Calendar export

The calendar exports a private `.ics` snapshot of upcoming occasions and the current user’s active wish occurrences for 366 days (maximum 20,000). Private pins/occasions and wish message text each require an explicit selection. Annual and recurring dates expand into absolute UTC instances, preserving local wall time across DST. Future alarms, including snoozed alarms, are included; already-passed alarms are omitted. Unicode lines fold at 75 octets and text is escaped. Calendar alerts depend on the importing app. This is not automatic calendar synchronization; imported copies do not update on completion or edits. A phone agenda complements the desktop month grid.

## Website and phone app

`public/manifest.webmanifest` includes standalone mode, icons, scope, theme and shortcuts. `public/sw.js` caches only the public offline screen/icons, handles push notifications when a provider is connected, and never caches private account pages or API content. The install dialog supports a browser install prompt plus iPhone/Android/manual instructions.

This is a PWA, not an App Store or Play Store binary. It uses the same hosted account and data as the website. Native store distribution, store signing, native widgets and native background scheduling are not included.

## Optional integrations and current boundaries

This is a functional first version with production-oriented authorization and persistence, not an operational global gift business. The UI clearly separates available features from services requiring setup.

- **Marketplace/payments/shipping:** sample catalog, prices, ratings and orders. No charge, shipment, booking, affiliate purchase or recipient message is triggered by demo checkout. Live merchant inventory, stock, holiday calendars, carrier tracking, Stripe/PayPal/Apple Pay/Google Pay, and bookings need production adapters and credentials. Business-day calculations are illustrative and disclose excluded holidays/cross-border constraints.
- **AI:** curated gift/date/wish suggestions work without a model. Set `OPENAI_API_KEY` and `OPENAI_MODEL` through hosted secrets to enable `/api/ai`. The OpenAI Developers plugin can securely provision the key with approval. Explicit per-request consent is required. Requests contain only the entered text, budget and mode. Responses API uses `store:false`; no browsing or merchant verification is implied.
- **Background reminders:** configure `NOTIFICATION_GATEWAY_URL`, `NOTIFICATION_GATEWAY_TOKEN`, and a random `REMINDER_JOB_SECRET` of at least 32 characters. An external scheduler calls POST `/api/reminders/process` once per minute with `Authorization: Bearer <REMINDER_JOB_SECRET>`. The HTTPS gateway must resolve the site-scoped recipient ID to previously opted-in email/SMS/push destinations and honor the provided `Idempotency-Key`. Never invent recipient contacts. Delivery failures leave the pin due for retry. Hosted cron and recipient-channel onboarding are not provisioned by this source.
- **Partner access:** the invitation flow is implemented and tested. A second person needs Site audience access as well as an invitation; publishing does not widen the audience automatically. Share settings must be changed explicitly by the owner.
- **Future expansion:** recap video export, digital gift-card fulfillment and physical tracking inside surprise boxes, Google Calendar synchronization, third-party booking/search, QR invitations, granular wishlist sizing/favorites, and native app-store packages remain follow-on work. Their associated integration data models are included where applicable, but no UI claims that those services are live.

`.env.example` lists every required and optional secret. Never commit `.env`, `.env.local`, or a real key.

### Required environment variables (Vercel / Node)

Set these on the `lovelinklos` Vercel project (Production and Preview):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (Neon pooled URL recommended). `POSTGRES_URL` is accepted as an alias. |
| `AUTH_SECRET` | Random 32+ character secret used to hash session tokens. `SESSION_SECRET` is an optional alias. Generate with `openssl rand -base64 48`. |

Optional secrets (`OPENAI_API_KEY`, Stripe, notification gateway, TURN) are unchanged. After provisioning the database, apply schema with `pnpm db:migrate` (or `npm run db:migrate`) using that `DATABASE_URL`. Vercel does not apply migrations automatically.

### Deploying `lovelinklos` from this branch

1. In the Vercel project **lovelinklos**, set Git to deploy this branch (not `main`).
2. Add `DATABASE_URL` (Neon or Marketplace Postgres) and `AUTH_SECRET`.
3. From a machine that can reach the database: `pnpm db:migrate`.
4. Deploy. Framework is Next.js; build command is `next build` (`pnpm build`).
5. Confirm `/login` and `/register` create a session and that creating a wish pin survives a reload.

## Development

Use Node.js 22.13+. Preserve `pnpm-lock.yaml` and the declared package manager. Create a local Postgres database, copy `.env.example` to `.env.local`, set `DATABASE_URL` and `AUTH_SECRET`, then:

```bash
pnpm install
pnpm db:migrate
pnpm dev
```

`pnpm build` / `next build` produce the Vercel production bundle. `pnpm start` / `next start` serve it. After a schema edit, generate a new Postgres migration with `pnpm db:generate`, inspect the SQL, and apply it with `pnpm db:migrate`.

### Validation

- `node --test tests/love-time.test.mjs tests/love-extras.test.mjs tests/d1-postgres.test.mjs`: calendar export privacy, UTF-8 folding, annual leap-day anchors, media recognition, byte ranges, timezone conversion, DST gaps/overlaps, recurrence, custom offsets, snooze, countdown thresholds, and D1-to-Postgres SQL rewrite (including quoted `AS "userId"` aliases).
- `pnpm exec tsc --noEmit`: typed application and route checks.
- After `pnpm build` and `pnpm db:migrate`, `pnpm test:e2e`: sign-up, session cookie, pin create/save, logout, sign-in, and durable read against local Postgres. Test identities are synthetic.
- Browser QA covers the dashboard, pin editor, custom date/reminder entry, navigation, responsive layouts and install guidance. The browser's optional WebMCP `modelContext` is unavailable in this environment; tools are feature-detected and registered with cleanup when supported.

Two structured browser tools are included: `list_love_pins` (read only) and `start_love_pin` (opens the editor without saving). Inputs are validated and outputs use the same visible state as the interface.

## Photography

Assets are local and optimized. Source URLs, photographers and reuse labels are retained in `ASSET-SOURCES.json`. The photographs illustrate the fictional sample couple and sample products; they do not depict the real user's private relationship or guarantee a merchant's product.

## Date Concierge and business features

`/concierge` provides curated date plans with a budget split, timezone-aware itinerary, saved checklist, calendar event and four linked reminders, plus text itinerary export. Plans and private drafts persist in `concierge_records`. Calendar insertion is a single database transaction with deterministic IDs, so retries cannot duplicate its event or pins. Checklist completion and Love Pin completion are separate controls. Created calendar entries remain after deleting a plan.

The shop includes three digital date scripts ($5.99, $7.99, $5.99). Confirmed purchases unlock their server-delivered content; active couple Premium includes all three. Refunds revoke future access. Existing downloaded content cannot be recalled. Existing Premium pricing remains $4.99/month. No real charges occur while the existing payment switch is disabled.

Creator proposals, merchant applications, hosted event requests, and printed-keepsake requests support private draft, submission, owner review, review notes, and deletion. They are request workflows, not active third-party listings or guaranteed fulfillment. The owner-only Business desk shows submitted requests and recorded order totals; it excludes subscription renewal revenue and is not a payout ledger. `lib/concierge-operator.ts` identifies the verified Site owner using the hosting authentication identity.

Still requires owner/provider setup: Stripe merchant onboarding and existing secret configuration; AI provider key/model for optional suggestions; notification delivery gateway for closed-app reminders; merchant agreements, affiliate tracking/commission terms, creator seller onboarding/payouts, event hosts, and print/shipping fulfillment. No commissions, seller payouts, bookings, or physical orders are claimed by the new request forms. Basic communication and safety remain free.

Validation: `node tests/concierge-api.test.mjs` after building. Tests use isolated local storage and synthetic identities; no real payment or external message is sent.
