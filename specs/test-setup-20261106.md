# Testing purchases, plans and ads on your phone (staging) — 6 November 2026

## Status (6 November 2026)

| Piece | State |
|---|---|
| Production backend | Revision `shabd-api-00097-zmq` from commit 74be1cb. All new features are off, and `/commerce/*` returns 404. |
| Staging backend | `https://shabd-api-staging-829757572630.asia-south1.run.app`. Same image and database as production, features on. |
| Staging app | Version 1.8.0, build 14 (EAS build 00711165), submitted to the internal testing track. |
| Cost guards | ₹500 monthly budget alert. Container images: the newest 5 are kept and older ones deleted after 7 days. |
| Play service account | `sanskritam-play-submit@gen-lang-client-0232760726.iam.gserviceaccount.com` submits builds, and staging uses it to verify purchases. |

## 1. Staging backend (owner's choice, 2026-11-06)

Staging is a second Cloud Run service, `shabd-api-staging`, in the same Google
Cloud project. It uses production's image, settings, secrets and database, with
purchases, plans and test ads switched on (`deploy/gcp/staging_spec.py`). Only
the staging app build points at it.

The backend upgrades its database every time it starts, and both services share
production's database. So the order is always:

1. Release production first, with the new features off:
   `CLOUDSDK_CORE_DISABLE_PROMPTS=1 PROJECT_ID=gen-lang-client-0232760726 bash deploy/gcp/deploy.sh`
2. Then copy production's current image into staging:
   `CLOUDSDK_CORE_DISABLE_PROMPTS=1 PROJECT_ID=gen-lang-client-0232760726 bash deploy/gcp/deploy-staging.sh`

Any change to the database's structure goes to production (switched off) before
staging.

Cost stays low. Staging has no build of its own, scales to zero, runs at most
one instance and has no scheduler jobs, and its daily AI caps are ₹100 for
speech and $0.50 for Gemini.

Test purchases land in production's database under the tester's own account,
marked as Sandbox purchases.

## 2. Staging app build (internal testing)

1. Raise `versionCode` in `mobile/app.json` above the last one uploaded to Play.
2. Build:

   ```
   cd mobile && eas build --profile staging --platform android
   ```

   The profile points the app at `shabd-api-staging`, turns purchases on and
   uses Google's test ads.
3. Submit to the internal testing track:

   ```
   eas submit --profile staging --platform android --latest
   ```

4. In Play Console, go to Test and release → Testing → Internal testing →
   Testers. Add your Gmail to an email list, open the opt-in link on your phone,
   and install from Play. The release can take a few hours to appear.

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

**Service account.** Go to Users and permissions and grant
`sanskritam-play-submit@gen-lang-client-0232760726.iam.gserviceaccount.com`:
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
