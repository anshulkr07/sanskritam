# Books, Guru, Lite and Plus — 4 November 2026

This supersedes the old credit/slot/rental launch design in monetization-setup.md
for new hybrid builds. No age-based pricing. Existing free library content stays
free unless a published edition is explicitly marked premium. No ads, Groups,
competitions, referral payouts or future video-avatar promises are restored.

## Implemented

- A shop in the drawer, plus contextual purchase links in Book and Audiobook.
- Direct, account-bound, non-consumable book/audio/bundle purchases. No membership,
  slots or credit spending required. Owned editions do not expire. Plus gives
  access to published premium editions during a verified membership period.
  Lite gives online access only to explicitly included starter editions. Both
  subscriptions are ad-free and support background audio; Guru packs are separate.
- Non-expiring 5/15/30-minute packs, one shared 180-second introductory voice
  trial per verified account, and no subscription requirement for voice.
- Voice reservations under the account wallet lock, one active call per account,
  startup failure refunds, trial-first settlement and stale reservation recovery.
  Each call is at most ten minutes or available time, whichever is smaller.
  Billing starts with the first audio sent and then counts connected time. End
  the call to stop billing. Remaining reservations return to the account.
- Refunds revoke only the purchased edition grants or pack minutes. Used refunded
  minutes create a deficit; purchases and refunds remain idempotent.
- Offline ownership licences independent of membership. Subscription licences
  expire at the earlier of seven days or membership expiry. Saved audio remains
  encrypted, account-scoped, and checks edition access before decryption.
- Google acknowledges permanent products instead of consuming them. Voice packs
  are consumables. Apple finishTransaction also uses the correct product type.
- Store-localized display prices; reference prices never replace store checkout.
- Separate Android call routing module, without restoring Stream/Group SDKs.
- Conditional purchase/privacy disclosures and account deletion cleanup.

Existing ordinary text questions/practice retain the app's existing quota and
service-budget controls in hybrid mode, without the legacy credit-quote paywall.
No new unlimited text-AI promise or paid lesson gate is introduced. New premium
learning paths can be added when complete; current Plus copy describes catalogue
access, not unfinished learning features.

## Store products

Prefix every suffix below with `com.sanskritam.app.`. Do not rename historical
SKUs; they remain verifiable for existing transactions and refunds.

| Suffix | Store type | INR reference | USD reference |
|---|---|---:|---:|
| lite.v2.monthly | auto-renewing subscription | 99 | 3.99 |
| lite.v2.annual | auto-renewing subscription | 799 | 29.99 |
| plus.v2.monthly | auto-renewing subscription | 299 | 9.99 |
| plus.v2.annual | auto-renewing subscription | 2499 | 79.99 |
| guru.minutes.5 | consumable | 49 | 0.99 |
| guru.minutes.15 | consumable | 149 | 2.99 |
| guru.minutes.30 | consumable | 279 | 5.49 |
| edition.isha.book | non-consumable | 99 | 2.99 |
| edition.isha.audio | non-consumable | 149 | 4.99 |
| edition.isha.bundle | non-consumable | 249 | 7.99 |
| edition.gita.book | non-consumable | 199 | 5.99 |
| edition.gita.audio | non-consumable | 249 | 7.99 |
| edition.gita.bundle | non-consumable | 399 | 9.99 |
| edition.katha.book | non-consumable | 149 | 4.99 |
| edition.katha.audio | non-consumable | 199 | 5.99 |
| edition.katha.bundle | non-consumable | 299 | 8.99 |

Regional Lite monthly/annual references: GBP 2.99/24.99; EUR 3.49/27.99;
CAD 4.99/39.99; AUD 5.99/44.99; AED 12.99/99.99. These are starting reference
prices; the app always displays verified store-localized prices.

Regional Plus monthly/annual references: GBP 7.99/59.99; EUR 8.99/69.99;
CAD 12.99/99.99; AUD 14.99/119.99; AED 29.99/229.99. Configure supported
store price points and taxes. Put all four subscriptions in one Apple subscription
group, with Plus above Lite and monthly/annual options at the same level within
each tier. Use matching monthly/annual Google base-plan periods. All plan/period
changes on Google are deferred rather than inferred from total annual versus
monthly price. Access changes only when a verified store period takes effect.
Configure and sandbox-test upgrades, downgrades and same-tier period changes.

Edition SKUs map to a fixed list of title IDs in backend/app/commerce/hybrid.py.
New books need explicit edition SKUs and mappings. A bundle grants its written
and audio titles. Never accept a client-supplied title mapping in a receipt.

Publish a reviewed, complete, commercially eligible premium edition through the
existing catalogue admin API, with `metadata.premium=true`. Both book and audio
must be published premium titles for a bundle to appear. No premium editions are
automatically created or made paid. Plus is offered only once premium content is
published. Already-paid valid receipts are delivered even after delisting.

## Lite catalogue and download policy

Set `metadata.premium=true` and `metadata.lite_included=true` on each reviewed,
published starter title through the existing catalogue admin API. Book and audio
are separate title IDs: mark both if both are included. No titles are automatically
made paid or added to Lite. The Shop lists actual included titles and hides Lite
sales until at least one published premium starter title exists. Preserve a stable
starter collection; do not silently rotate titles users are currently reading.

The backend checks Lite inclusion for full reading, audio delivery and media-link
renewal. A Lite membership alone cannot obtain a premium offline licence. Plus
includes premium downloads; directly purchased editions include downloads on every
tier and after membership ends. Existing free-library downloads and valid legacy
unlocks are preserved. No database migration is needed beyond the hybrid migration.

Shop responses expose the effective tier, included titles, downloadable titles,
ad-free and background-audio benefits. Purchase/restore and Shop refresh remove
cached licences that lost download rights. Previously issued Plus offline licences
are bounded by seven days or the verified paid-period end, whichever is sooner;
revocations cannot reach a disconnected device immediately. An unlicensed saved
audio file is never decrypted, but Lite can fall back to authorized online streaming.

The subsequent [AdMob integration](admob-setup-20261104.md) adds optional native
and rewarded ads behind a separate native build mode and backend serving flag.
Default builds still have ads off. Lite and Plus are explicitly ad-free, as are
purchased editions. Voice and future avatars are not bundled.
Deploy the updated backend before the Lite mobile build: it supplies the tier,
catalogue inclusion, download entitlement and verified transaction-consumability
fields used by the new client. Store receipt fulfilment does not depend on a SKU
remaining listed for new sales.

## Staging activation

1. Apply Alembic revision `20261104_hybrid_commerce` on a backed-up staging DB.
2. Configure native store agreements/products, account binding, verification keys
   and Apple/Google notifications using the existing setup runbook. Configure
   private audio origins before selling protected media; old public URLs cannot
   be revoked just by adding an API paywall.
3. Set `COMMERCE_ENABLED=true`, `COMMERCE_HYBRID_ENABLED=true` on staging. Keep
   `COMMERCE_SALES_ENABLED=false` until actual sandbox purchase tests pass. Verified
   paid receipts and restores remain deliverable when new sales pause.
4. Build with `EXPO_PUBLIC_HYBRID_COMMERCE=true`. This is an explicit native-build
   feature, not an OTA restoration. IAP/Nitro and ShabdCallAudio require a new
   reviewed native binary and appropriate runtime version. The default build
   flag is off; no production flags, deployment or store products were changed.
5. Voice additionally requires `COMMERCE_VOICE_ENABLED=true` and an admin
   `ai_costs.voice` record with `pipeline_id="guru-sarvam-v1"`, a real `verified_at`,
   at least 20 characters of measurement evidence, and `0 < bound_inr <= 2` per
   connected minute. Current pack prices assume at most INR 2/min direct cost.
   Measure recognition, all model calls, synthesis, cancellations, retries and
   infrastructure. If this cannot be met, revise pricing/pipeline and its gate;
   never fabricate cost evidence. Packs and trial stay unavailable without it.
6. Test linked accounts, purchase interruption/retry, restoration, cancellation,
   renewal, Lite/Plus changes, period changes, refunds, owned offline reading/background audio,
   expired subscription downloads, account switching and deletion on devices.
7. Test microphone permission refusal, native routing/AEC, leaving/backgrounding
   a call, startup failure, low balance, simultaneous calls, provider failures,
   disconnect settlement, minute exhaustion and reports. The sold pipeline is
   pinned to Sarvam + Bulbul v3; clients cannot switch to search/video/native
   Gemini or send a text-request flood using sold voice minutes.
8. Update store disclosures and reviewer instructions to this binary. Enable
   actual sales only after sandbox and measured-cost evidence is recorded.

Trial abuse controls use verified account binding and existing per-account and
service-wide provider budgets. Cloud video avatars and groups remain future work.
Existing legacy credit balances/unlocks should be audited before migrating any
real paid legacy customers; this implementation does not erase their ledger.

## Verification

Backend tests cover direct ownership without membership, bundles, cross-account
receipt rejection, replay prevention, separate refund effects, membership expiry,
trial reservations/settlement, stale calls, startup failures, socket pipeline
pinning, Google acknowledge/consume semantics and SQLite migration round-trip.
Native-store purchases, native compilation and physical-device calls require
their own validation; JavaScript exports do not certify those.

Verified locally: 124 focused backend tests passed (commerce, hybrid purchase
API, voice sockets, migration, free-launch and legal-page checks); final hybrid
rerun 17 passed; TypeScript passed; final Android and web exports passed with the
hybrid build flag enabled; Android autolinking resolves ShabdCallAudio. One
existing Starlette/AnyIO deprecation warning remains. No Java/Android SDK toolchain
was available for native compilation. Store products, production activation,
live cost evidence and physical-device checks were not performed.

Lite follow-up verification: 130 focused backend tests passed, including Lite
catalogue inclusion, expiry/refunds, effective plan changes, offline licence denial
and ownership preservation. Four mobile service regression tests passed with
`node --test tests/commerce.test.cjs` (run from mobile), covering downgrade/refund
cache invalidation and account isolation. TypeScript and Android/web exports with
the hybrid flag enabled passed. Store configuration, real sandbox plan changes and
physical-device playback remain launch checks; no production activation was made.
