# Testing purchases, plans and ads on your phone — 6 November 2026

## 1. Test backend

Production stays as it is. The test backend is a separate Cloud Run service,
`shabd-api-test`, with its own database.

Production's database is on Supabase. The app upgrades its database every time
it starts, so the test backend must not share production's database: the next
production restart would fail.

1. **Make an empty database.** The easiest is a new free Supabase project, for
   example "sanskritam-test". In the project, go to Project Settings →
   Database → Connection string → Session pooler, copy the string and fill in
   the password.
2. **Write `.env.test`.** Copy `.env.test.example` to `.env.test` (it is
   gitignored) and set `TEST_DATABASE_URL`. Set `R2_BASE_URL` to the value in
   `.env.deploy`.
3. **Deploy:**

   ```
   CLOUDSDK_CORE_DISABLE_PROMPTS=1 PROJECT_ID=gen-lang-client-0232760726 bash deploy/gcp/deploy-test.sh
   ```

   The script:
   - refuses production's database;
   - names its own secrets `shabd-test-*`;
   - turns on purchases, plans, test ads and Sandbox store checks.
4. **Copy content.** This copies books, verses, chants and daily cards from
   production. It copies no accounts, progress or purchases:

   ```
   PROJECT_ID=gen-lang-client-0232760726 backend/.venv/Scripts/python.exe deploy/gcp/copy_test_content.py
   ```

   It reads production's database, so Claude needs your permission to run it.
5. **Mark paid books** on the test backend:
   `PUT /commerce/admin/titles/gita:book` and `gita:audio`, with metadata
   `{"premium": true}`. Leave `credits` at 0, and the price comes from its
   demand tier.

## 2. Internal-testing build

1. Raise `versionCode` in `mobile/app.json` from 13 to 14.
2. Build:

   ```
   cd mobile && eas build --profile internal-test --platform android
   ```

   The profile points the app at `shabd-api-test`, turns purchases on and uses
   Google's test ads.
3. Submit to the internal testing track:

   ```
   eas submit --profile internal-test --platform android --latest
   ```

4. In Play Console, go to Test and release → Testing → Internal testing →
   Testers. Add your Gmail to an email list, open the opt-in link on your
   phone, and install from Play. The app can take a few hours to appear.

## 3. Licence tester: free test purchases

In Play Console, go to Settings → License testing and add the Gmail you use on
the phone.

- License testers get test cards ("Test instrument, always approves") and are
  never charged.
- A test subscription renews every 5 minutes for a month plan and every 30
  minutes for a year plan, at most 6 times
  (developer.android.com/google/play/billing/test, read 2026-11-06).
- A purchase that is not acknowledged is refunded after 3 minutes.
- Internal-track apps have daily spend limits, even on test cards.

## 4. Products to create in Play Console

Go to Monetize with Play → Products.

**One-time products** (consumable Mudrā packs). Use the IDs exactly as written:

| Product ID | India price |
|---|---|
| `com.sanskritam.app.mudra.50` | ₹49 |
| `com.sanskritam.app.mudra.100` | ₹99 |
| `com.sanskritam.app.mudra.150` | ₹149 |
| `com.sanskritam.app.mudra.200` | ₹199 |
| `com.sanskritam.app.mudra.250` | ₹249 |
| `com.sanskritam.app.mudra.330` | ₹299 |
| `com.sanskritam.app.mudra.440` | ₹399 |
| `com.sanskritam.app.mudra.550` | ₹499 |
| `com.sanskritam.app.mudra.770` | ₹699 |
| `com.sanskritam.app.mudra.1200` | ₹999 |
| `com.sanskritam.app.mudra.1800` | ₹1,499 |
| `com.sanskritam.app.mudra.2400` | ₹1,999 |
| `com.sanskritam.app.mudra.3600` | ₹2,999 |
| `com.sanskritam.app.mudra.6000` | ₹4,999 |

Name each one "N Mudrā". Set the prices for other countries from
`specs/mudra-20261106.md`, section 1. Activate each product.

**Subscriptions.** Each subscription has one base plan, auto-renewing:

| Subscription ID | Base plan | Price |
|---|---|---|
| `com.sanskritam.app.lite.v2.monthly` | monthly | ₹99 |
| `com.sanskritam.app.lite.v2.annual` | yearly | ₹999 |
| `com.sanskritam.app.plus.v2.monthly` | monthly | ₹299 |
| `com.sanskritam.app.plus.v2.annual` | yearly | ₹2,999 |

Activate each base plan.

**Service account.** Go to Users and permissions and grant the service account
in `mobile/service-account-key.json`:
- View app information
- View financial data
- Manage orders and subscriptions

Without this, the backend cannot verify purchases.

## 5. AdMob units

The test build uses Google's test ads, so nothing is needed in AdMob to test.
For the live build you need three units:

| Unit name | Format | Notes |
|---|---|---|
| Book pages | Native advanced | You have this one. |
| Audiobook player | Interstitial | Image and video. The games reuse it. |
| Ask top-up | Rewarded | Set server-side verification to `https://shabd-api-829757572630.asia-south1.run.app/commerce/ads/ssv`. |
