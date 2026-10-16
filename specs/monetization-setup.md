# Sanskritam monetization setup

Implementation: native Google Play Billing and Apple In-App Purchase. No Dodo account is needed. Live commerce, sales, ads, rewards and organizer publication are separate switches and default to off.

## 1. Accounts you must finish

In **Google Play Console**, finish the payments profile, bank account, tax information and merchant agreements. Give a dedicated service account access to the app's orders and subscriptions, with the Android Publisher API enabled. Use a separate staging app/backend configuration for tests.

In **App Store Connect**, accept the Paid Apps agreement, add banking/tax details, and create an In-App Purchase/App Store Server API key. Record the numeric Apple app ID, issuer ID and key ID. Download the private key once and put it in the deployment secret manager. Set Apple and Google sign-in up for `com.sanskritam.app`; purchases require a verified, linked account.

In **AdMob**, register both apps, add the store listings, create native and rewarded ad units, configure the consent messages and publish `app-ads.txt` at your verified developer website. Keep serving disabled until the store privacy/data declarations describe the SDK and optional advertising.

These account-holder agreements and banking confirmations cannot be completed by repository code.

## 2. Exact store products

Use the same product identifiers on both platforms. For Google subscriptions, create one auto-renewing monthly base plan named `monthly` under each subscription product. For Apple, put the three subscriptions in one subscription group: Pro at level 1, Plus at level 2 and Lite at level 3.

| Identifier | Store type | India price | Grant / delivery |
|---|---|---:|---|
| `com.sanskritam.app.lite.monthly` | Monthly subscription | ₹99 | 120 credits, 10 slots |
| `com.sanskritam.app.plus.monthly` | Monthly subscription | ₹299 | 450 credits, 20 slots |
| `com.sanskritam.app.pro.monthly` | Monthly subscription | ₹999 | 1,800 credits, unlimited slots |
| `com.sanskritam.app.credits.small` | Consumable | ₹99 | 100 credits |
| `com.sanskritam.app.credits.medium` | Consumable | ₹299 | 330 credits |
| `com.sanskritam.app.credits.large` | Consumable | ₹999 | 1,200 credits |
| `com.sanskritam.app.supporter.bronze` | Consumable digital supporter purchase | ₹99 | Bronze supporter badge |
| `com.sanskritam.app.supporter.silver` | Consumable digital supporter purchase | ₹299 | Silver supporter badge |
| `com.sanskritam.app.supporter.gold` | Consumable digital supporter purchase | ₹999 | Gold supporter badge |
| `com.sanskritam.app.hosting` | Consumable organizer service | ₹499 | One approved free-entry competition |

Membership overrides, in Lite / Plus / Pro order:

- US: $3.99 / $8.99 / $19.99.
- Euro-area starting prices: €2.99 / €6.99 / €17.99.
- UK: £2.49 / £5.99 / £14.99.
- Other storefronts: store-generated regional prices initially; use the closest supported price points where an exact value is unavailable.

The app renders store-localized prices. The INR amounts in the catalogue are labelled reference values and cannot be used to bypass store checkout. Do not create a separately purchasable product for every book: users purchase credits, and the server records the time-limited title unlock.

Initially configure single-quantity purchases and paid monthly plans without free trials. Trial transactions do not qualify for paid credit grants. Validate immediate, prorated upgrades and deferred downgrades in each store's sandbox before offering plan changes publicly.

## 3. Backend configuration and secrets

Deploy the new Alembic head `20261016_commerce` before releasing the new client. The migration is additive and supports SQLite and PostgreSQL; run backups and a staging migration first. It adds the wallet, ledger, purchases, membership periods, titles, unlocks, cooldowns, reservations, profiles, ad grants, referrals, payouts, hosted entries, prize cases, settings and audit tables.

Set these through your deployment secret manager; do not paste secret values into chat or commit them:

```text
COMMERCE_ENABLED=false
COMMERCE_SALES_ENABLED=false
COMMERCE_ADS_ENABLED=false
COMMERCE_REWARDS_ENABLED=false
COMMERCE_HOSTING_ENABLED=false
COMMERCE_SIGNING_KEY=<at least 32 cryptographically random characters>
COMMERCE_STORE_ENVIRONMENT=Sandbox
COMMERCE_BUNDLE_ID=com.sanskritam.app
COMMERCE_APPLE_ROOT_PATHS=["<mounted Apple root certificate DER path>"]
COMMERCE_APPLE_APP_ID=<numeric app id>
COMMERCE_APPLE_KEY_ID=<key id>
COMMERCE_APPLE_ISSUER_ID=<issuer id>
COMMERCE_APPLE_PRIVATE_KEY_PATH=<mounted .p8 path>
COMMERCE_GOOGLE_CREDENTIALS_PATH=<mounted service-account JSON path>
COMMERCE_GOOGLE_NOTIFICATION_AUDIENCE=<exact HTTPS notification URL>
COMMERCE_GOOGLE_NOTIFICATION_EMAIL=<authorized Pub/Sub push identity>
COMMERCE_ADMOB_UNITS=["<rewarded unit id for Android>","<rewarded unit id for iOS>"]
COMMERCE_ADMIN_KEYS_JSON={"<sha256 of a random administrator token>":"owner"}
```

Download Apple trust anchors from Apple's certificate authority, not from an incoming transaction. The official Apple server library validates its certificate chain, application, environment and signature. Production requires the numeric app ID and `COMMERCE_STORE_ENVIRONMENT=Production`.

Apple verification also fetches current transaction information through the server API before granting credits, so the `.p8` server key is required even when the phone supplies a valid signed receipt. A stale receipt cannot establish that a purchase remains unrefunded. An unavailable lookup leaves the transaction unfinished for retry.

Create separate administrator tokens for `finance`, `catalogue` and `moderator`; use the same SHA-256-token-to-role mapping. `owner` can perform all actions. Store a strong original token securely; the web interface only keeps a typed token in memory. The existing non-default backend `ADMIN_TOKEN` is also recognized as an owner token. Do not use `dev-admin` in production.

Configure notifications:

- Apple App Store Server Notifications V2: `https://<backend>/commerce/notifications/apple`.
- Google RTDN: Pub/Sub push to `https://<backend>/commerce/notifications/google`, with authenticated OIDC push using the configured audience and email. Package identity is checked.
- AdMob server-side reward verification: `https://<backend>/commerce/ads/ssv`.

## 4. Administration and catalogue

Open `https://<backend>/commerce/admin`. A page alone reveals no private records; every data or mutation request requires a role token.

Publish each available book and audiobook explicitly. A written title is `gita:book`; its audio title is `gita:audio`. Both use the existing canonical slug and occupy separate slots. Standard prices are 80 and 200 credits; short/long defaults are 30/150 for text and 80/500 for audio. Set `published` only after completeness, rights and actual playback have been reviewed. Catalogue presence does not establish completeness.

Example title configuration:

```json
{"slug":"gita","medium":"book","name":"Bhagavad Gita","credits":80,"published":true,"metadata":{"size":"standard","affiliates":[]}}
```

Affiliate entries require HTTPS URLs, labels and explicit disclosures. Product credit grants can be changed in the `products` configuration; existing ledger grants do not change retroactively. Skip cost, AI cost evidence, monthly prize budget, fixed operating costs and country reward routes have dedicated configuration entries.

Country routes use an explicit reviewed record, for example `{"IN":{"method":"locally redeemable gift","reviewed":true}}`. Remove a country to disable its route. Catalogue administrators cannot read financial settings, entrant recordings, or private payout details. Organizer publication requires completed identity, rules, funding and moderation reviews, plus published tie-breaks, verification, sponsorship and delivery terms. A hosting purchase can serve only one event.

Member title access extends until the last verified membership end plus 365 days. Surrender is permanent. Over-limit accounts retain existing access but cannot acquire another title until their cap allows it. Every grant and debit has an idempotency key.

Reconciliation reads paginated Apple transaction history, rather than granting only the latest renewal. Google recovery verifies missing renewal-order candidates against the Orders API and its product/token/service-period evidence; historical refunds are checked independently. Extended Google histories above 120 renewal suffixes, unavailable history, or unfamiliar renewal identifiers require reviewed recovery instead of inferred credit grants. Schedule reconciliation regularly and alert on its reported errors.

## 5. Media, offline access and app builds

Full audio delivery uses five-minute account-bound tickets; the app renews them before playback. Preview bytes are clipped on the server. The Docker image already installs ffmpeg. Make protected audio objects private before enabling commerce: returning a protected API response cannot revoke an old publicly cached GCS/CDN URL.

When commerce is enabled, the legacy local `/audio` mount permits only the free `varnamala`, `dialogue`, `challenge`, `grammar`, and `parva-art` namespaces. Book and chant recordings must use signed delivery. Keep protected book recordings outside those free namespaces, including on CDN origins. Downloads persist as encrypted files; temporary playback plaintext uses the disposable app cache.

For GCS, grant the backend identity read access to private audio objects. For a different origin, configure `media_origins` as an HTTPS-host allow-list and ensure the origin cannot be accessed publicly. Do not allow metadata or loopback hosts. Keep non-book instructional media available through its intended delivery path when changing bucket ACLs.

Encrypted downloads use Expo Crypto AES-GCM and a per-account key in SecureStore. Offline licences are capped at seven days and the known membership end. Playback cache is private to the application; bookmarks and reading positions are stored separately. The app blocks non-member background playback.

This update adds native modules. It needs a new binary; it cannot be shipped solely as an OTA update. `app.json` sets app version 1.5.0 and Android version code 10; `app.config.js` adds the native plugins. Adjust upward if another release has already used those values.

Set build-time variables:

```text
ADMOB_ANDROID_APP_ID=<real AdMob Android app id>
ADMOB_IOS_APP_ID=<real AdMob iOS app id>
EXPO_PUBLIC_ADMOB_ANDROID_NATIVE=<native ad unit>
EXPO_PUBLIC_ADMOB_IOS_NATIVE=<native ad unit>
EXPO_PUBLIC_ADMOB_ANDROID_REWARDED=<rewarded ad unit>
EXPO_PUBLIC_ADMOB_IOS_REWARDED=<rewarded ad unit>
```

Without app IDs, prebuild uses Google's public development app IDs; ads are still unavailable without production feature flags and unit IDs. Replace the development IDs before production ad activation. Rebuild both platforms after changing native app IDs.

## 6. AI economics and reconciliation

`results/commerce/readiness.json` contains an observed local usage snapshot and redemption sensitivity. It explicitly does **not** certify per-action live cost bounds. Never fill its missing measurement with a guessed provider cost.

Generate another read-only report:

```powershell
backend/.venv/Scripts/python.exe backend/scripts/commerce_readiness.py --usage-database backend/app.db --output results/commerce/readiness.json
```

Before paid AI activation, measure bounded inputs/output sizes, synthesis, recognition passes, fallbacks and retry paths on staging. Record evidence and a positive worst-case rupee bound per action in admin `ai_costs`. Voice bounds are per minute; other bounds are per action. The server chooses the larger of the starting rate and `ceil(bound / ₹0.10)`, rounding voice rates to four-credit multiples. It refuses unverified actions. A quote is accepted before execution; rate changes require a new quote. Free cached/local results release reservations.

Voice replies currently use a selected 30- or 60-second allowance per response. PCM WAV output is trimmed to that allowance before delivery; unmeasurable output and over-limit unsupported containers fail without charging. Complete native audio interruption and disconnect tests before activation. Catalogue title unlocks and cooldown skips include the user's accepted credit price; a changed price requires a fresh confirmation.

Illustration only: three STT passes, 1,000 synthesized characters/minute and eight ₹0.10 model calls total ₹5.30/minute at the sample rates, requiring **56 credits/minute**, rather than the starting 20. Validate real costs; the starting rates are not a promise of unlimited subsidized service.

Use the reconciliation command against the intended deployment configuration:

```powershell
backend/.venv/Scripts/python.exe backend/scripts/reconcile_commerce.py
backend/.venv/Scripts/python.exe backend/scripts/reconcile_commerce.py --apply
```

The first command is a read-only dry run. The second processes verified store updates, acknowledgements, stale reservations and private recording cleanup. Schedule the applying command as a backend job hourly once staging is verified. Tokens and provider error bodies are not printed.

Record actual store settlements before referral rewards accrue. Sandbox transactions cannot create real settlement revenue or cash rewards. The operating dashboard labels provider estimates separately from settlements and includes outstanding credit-service reserves, referral liabilities and prize spending in its provisional marketing calculation.

## 7. Global fulfilment and launch

The app and store subscriptions are global. Real-world reward availability requires a reviewed country route, not an automatic promise of worldwide shipping. Configure each supported country's lawful cash/local-gift method, responsible operator, delivery cost and review evidence. Keep sensitive recipient instructions in the encrypted payout workflow; do not paste them into public event rules or catalogue metadata.

Referrals: 20% of net subscription receipts during the first three paid periods, a 45-day hold, ₹500-equivalent threshold, identity/duplicate-payment review and refund clawbacks. Fulfilment is manual: the dashboard records evidence after your bank or gift provider actually delivers it. It does not move money automatically.

Prizes: ₹5,000/month including delivery; additional secured sponsorship is recorded separately. Review winning entries before finalizing. Community organizers pay hosting separately, entrants pay zero, and organizer/sponsor funding does not become an entrant-funded prize pool. Cases, judging evidence, appeals and fulfilment remain auditable.

Enable one switch at a time only after the release checklist passes. Production store approvals, physical-device tests, measured AI bounds, private media ACLs and funded reward routes are external release prerequisites; code defaults leave them off until ready.
