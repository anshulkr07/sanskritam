# Monetization implementation status — 16 October 2026

Current launch scope: **Android first; iOS deferred**. Follow [android-monetization-next-steps.md](android-monetization-next-steps.md) for the Android setup order. Apple setup and iOS device tests apply to the later iOS release.

The implementation is staged behind separate commerce, sales, ads, reward and organizer-hosting switches. All default to disabled. No live store products, banking details, campaigns, payouts or deployment were created by this work.

## Implemented in the repository

- Native store integration, server purchase verification, account binding, durable credit grants before transaction finishing, restore, notifications and reconciliation.
- Wallet, financial journal, spending reservations, refund deficits, configurable products and title prices, independent written/audio slots, surrender, cooldowns and membership access periods.
- Existing reader/audio access checks, signed media delivery, encrypted member downloads and membership-dependent background playback.
- Membership, wallet, refill, purchase history, title confirmation, supporter badge and community-event interfaces.
- Optional consent-gated native/rewarded ads, signed reward verification, replay protection, daily caps and member suppression.
- Referral attribution, first-three-period commissions, settlement records, holds, encrypted payout requests and manual cash/gift fulfilment.
- Organizer approval, free entries, private recordings, judging, results, appeals, prize budgeting and manual delivery records.
- Role-restricted web administration, audit records, purchase terms and marketing/cost-readiness documentation.

The continuation review added fresh Apple transaction lookups to reject stale pre-refund receipts, corrected upgrade grants using verified billing periods, enforced accepted title/skip prices, bounded delivered voice audio and delayed settlement until the response body is sent. It also closed the legacy static-audio bypass and prevented failed encryption from leaving durable plaintext downloads.

## Verification completed

| Check | Result |
|---|---|
| Affected backend regression suite | **220 passed**, eight existing framework/schema warnings |
| TypeScript, `npx tsc --noEmit` | Passed |
| Expo production web export | Passed; local artifact under `results/commerce/web-final-check` |
| Android Expo prebuild | Passed during initial integration; this is not an APK compilation |
| Android EAS native build | **Passed**: signed app bundle 1.5.0 (10), build `5acb0695-073d-48ba-914f-b449a0d3ea6e`; see `android-eas-build-20261016.md` |
| SQLite migration | Fresh application migration and isolated commerce upgrade/downgrade passed |
| PostgreSQL migration SQL | Upgrade/downgrade SQL compilation passed |
| Whitespace check | `git diff --check` passed |

Tests use isolated databases and mocked payment/provider responses. Signature tests exercise real ECDSA verification against a locally generated test key. They do not prove real Apple/Google credentials or AdMob account configuration.

## Release gates still open

1. Complete store payment agreements, bank/tax setup, products and regional prices; provision server verification keys and authenticated notifications.
2. Validate real sandbox purchases, restores, interrupted payments, renewals, prorated upgrades, deferred downgrades and full/partial refunds on Android and iOS. Partial-refund behaviour is not certified for launch.
3. Execute migrations and concurrency tests against a running PostgreSQL server. Docker CLI exists locally, but the Docker engine was stopped; SQL compilation alone does not close this gate.
4. Android native bundle 1.5.0 (10) has been built successfully on EAS. Test purchases, licences, account switching, offline expiry, background audio and interruptions on physical Android devices. iOS builds and tests are deferred to the later iOS release.
5. Measure and review bounded provider costs for every enabled paid AI action. `results/commerce/readiness.json` contains historical aggregate usage and redemption sensitivity, with **no certified live action bounds** and `live_sales_ready=false`.
6. Make protected origin objects private, configure preview encoding, AdMob consent/units/SSV, and reviewed funded reward routes for advertised countries.

Voice currently accepts a 30- or 60-second allowance per reply. It is not a continuous, multi-turn session wallet. Prizes, referral payouts and cancellation refunds use human review and store/fulfilment operations; they do not automatically transfer cash. Detailed analysis uses `/explain/analysis`, selected in the Ask sheet, with its own quote and cost gate; ordinary questions retain the standard rate. Ordinary recitation remains separate from paid AI answers. A marketing budget report uses settled receipts and estimated provider costs; reconcile invoices and operating costs before spending it.

Use [monetization-setup.md](monetization-setup.md) for exact product identifiers, credentials, notification URLs and account setup, and [monetization-release-checklist.md](monetization-release-checklist.md) for release validation. The acquisition allocation and campaign plan are in [monetization-marketing.md](monetization-marketing.md).
