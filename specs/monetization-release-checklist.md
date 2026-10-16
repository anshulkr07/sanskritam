# Monetization release checks

## Before any live sale

- [ ] Finish Google and Apple payment agreements, bank/tax setup and required product approvals.
- [ ] Apply migration `20261016_commerce` on a backed-up staging database and then the intended production database. Verify PostgreSQL as well as SQLite.
- [ ] Confirm store IDs, subscription group/base plans, localized prices, cancellation links and credit expiry terms.
- [ ] Install new Android and iOS binaries containing IAP, AdMob, SecureStore and Crypto. This requires native builds.
- [ ] Test signed-in account linking; reject a purchase bound to another account. Verify account recovery on another device.
- [ ] Use sandbox/test accounts to buy each subscription, a refill, a supporter badge and organizer hosting. Do not test real revenue with sandbox settlement entries.
- [ ] Kill the app after store payment, during server verification and before native transaction finishing. Reopen and verify exactly one durable grant.
- [ ] Replay a notification; deliver old and new renewals out of order; verify no duplicate credits or tier downgrade.
- [ ] Test upgrade, deferred downgrade, cancellation, failed renewal, grace, hold, expiry, full refund, already-spent credit deficit and support-badge removal.
- [ ] Review platform-specific partial refund behaviour and proration with real sandbox events before enabling those purchase paths.
- [ ] Run reconciliation with missing/delayed notifications and restore on a second device.
- [ ] Measure every paid AI action's bounded cost, including fallbacks/retries and voice duration decoding, and publish reviewed evidence in `ai_costs`.
- [ ] Test failed and cancelled streams, short voice replies accumulated into 15-second intervals, request replay, simultaneous requests and exhausted maximum reservations.

## Content and app experience

- [ ] Test independent book and audiobook unlocks, including audio-only purchases without buying the written title.
- [ ] Verify legacy `/shlokas`, individual UID, paged chapters and media delivery expose only the allowed preview/access.
- [ ] Ensure current daily verse and active competition verses remain available without purchase.
- [ ] Test five non-member slots, permanent surrender, seven-day cooldown, paid skip plus separate title price, and natural expiry without cooldown.
- [ ] Test Lite 10 / Plus 20 / Pro unlimited; resubscription; over-limit downgrade; post-membership 365-day access.
- [ ] Test reading and audio offline on a physical device, expired/renewed licences, account switching, clock rollback, revoked downloads and retained bookmarks.
- [ ] Verify non-member audio stops when backgrounded and active members retain background controls. Test expiry while the app is backgrounded.
- [ ] Make protected origin objects private and verify old direct URLs cannot bypass access. Keep free instructional audio working.
- [ ] Verify ffmpeg clips previews and a paid audio ticket cannot be renewed after surrender or expiry.
- [ ] Review store privacy/data-safety declarations, public purchase terms and the proxied privacy policy before enabling the corresponding feature.

## Advertising

- [ ] Add the real AdMob app/unit IDs, app-ads.txt, UMP consent messages and server verification callback.
- [ ] Use test devices/test ad units during validation; verify signatures and replay protection with a real test callback.
- [ ] Confirm two native placements/day only after a completed activity, and no native/rewarded ads for active members.
- [ ] Confirm rewarded ads are voluntary, capped at three/day, require verified completion, and extend only the chosen reading/audio/practice access.
- [ ] Reject forged callbacks, wrong ad units, expired tickets, duplicate reward IDs and cross-account redemption.
- [ ] Verify a reward cannot increase competition attempts, ranking, cash, referral rewards or transferable credits.

## Rewards, organizers and administration

- [ ] Configure reviewed and funded delivery routes for every country advertised in a competition or cash programme.
- [ ] Confirm age eligibility before entries or payout requests; review identity and duplicate payment details before fulfilment.
- [ ] Test referral attribution before the first paid membership; exclude refills, supporter products and hosting.
- [ ] Test the first-three-period limit, 45-day hold, threshold aggregation, simultaneous payout requests, refunds and paid-reward clawbacks.
- [ ] Verify recipient details are encrypted, finance-only, and absent from public event responses and moderator views.
- [ ] Exercise poetry and audio entries, ten submissions/day for every tier, private recording review, judging, results and appeals.
- [ ] Require a verified hosting purchase and review evidence before publication; prevent reuse across events.
- [ ] Cancel an undeliverable event and complete the appropriate store refund process; record the case.
- [ ] Allocate prizes against the ₹5,000 monthly budget including delivery; require extra secured sponsorship for excess cost.
- [ ] Test catalogue, moderator and finance permissions separately; verify every financial change is audited.
- [ ] Delete an account and verify personal reward data and private recordings are removed; retain only permitted pseudonymous financial records.

## Local verification commands

```powershell
# From backend/
.venv/Scripts/python.exe -m pytest tests/test_commerce_api.py tests/test_commerce.py tests/test_commerce_stores.py tests/test_commerce_migration.py tests/test_paged_books.py tests/test_p21_canon.py tests/test_p14_entitlement.py tests/test_account_deletion.py tests/test_ask_live.py tests/test_ask_route.py tests/test_legal_pages.py tests/test_p19_explain.py tests/test_competitions.py tests/test_competition_sets.py tests/test_tts_cache.py -q

# From mobile/
npx tsc --noEmit
npx expo prebuild --platform android --no-install
npx expo export --platform web --output-dir ../results/commerce/web-check
```

Repository tests use isolated databases and mocked store/provider responses. They do not replace Apple/Google sandbox purchase tests or physical-device verification. The development host is Windows, so an iOS native build must run on macOS/EAS.
