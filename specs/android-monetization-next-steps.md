# Android monetization — next steps

Current scope: Android first. iOS setup and device validation are deferred and do not block Android internal testing. Tomorrow's target is an internal Play Store build with verified test purchases; production timing depends on outstanding account, review and release requirements.

## Account-holder tasks, in order

1. Open Google Play Console and select the existing Sanskritam app. Confirm its package is `com.sanskritam.app`. Complete any account verification, merchant/payment profile, banking, tax and agreement tasks. Existing completed tasks do not need repeating.
2. Prepare an Android phone and a separate Gmail tester account. Add that Gmail to both the app's internal-testing list and the account's license-testing list. These are separate settings. The checkout must show Google's test payment methods before proceeding.
3. Allow a billing-enabled Android App Bundle to be uploaded to internal testing. Product setup may remain unavailable until Play recognizes a build containing its Billing Library.
4. Create three auto-renewing monthly subscriptions, each with base-plan ID `monthly`, without trials or introductory offers initially:

| Product ID | India | Credits/month |
|---|---:|---:|
| `com.sanskritam.app.lite.monthly` | ₹99 | 120 |
| `com.sanskritam.app.plus.monthly` | ₹299 | 450 |
| `com.sanskritam.app.pro.monthly` | ₹999 | 1,800 |

5. Create and activate three consumable one-time credit products, with one active standard purchase option and single-quantity purchases:

| Product ID | India | Credits |
|---|---:|---:|
| `com.sanskritam.app.credits.small` | ₹99 | 100 |
| `com.sanskritam.app.credits.medium` | ₹299 | 330 |
| `com.sanskritam.app.credits.large` | ₹999 | 1,200 |

6. For Lite/Plus/Pro set US prices to $3.99/$8.99/$19.99, euro-area prices to €2.99/€6.99/€17.99 and UK prices to £2.49/£5.99/£14.99. Use supported nearby price points if necessary and generated regional prices elsewhere. Refill prices outside India can start with store-generated localization.
7. In the existing Google Cloud project, enable Google Play Android Developer API and create a dedicated purchase-verification service account. Invite its email through Play Console Users and permissions, scoped to this app, with the financial/order access needed for verification and order/subscription management. Store the JSON credential in deployment Secret Manager and mount it privately; never commit it or send its contents in chat.
8. Configure Pub/Sub RTDN together with the backend deployment: create a topic; grant `google-play-developer-notifications@system.gserviceaccount.com` Pub/Sub Publisher on that topic; create an authenticated push subscription to `https://<testing-backend>/commerce/notifications/google`; configure the push principal and matching audience on the backend. In Play monetization setup, enter `projects/<project-id>/topics/<topic-id>`, enable subscription and one-time notifications, and send a test message. Confirm backend receipt, not merely a successful publish.
9. Complete or update the app's privacy, account-deletion, app-access and other Play declarations before production submission. Give reviewers a working sign-in/access route when requested. Confirm Google sign-in works in the Play-installed build; its Play App Signing SHA-1 may differ from the local/upload certificate.
10. Install from the internal-testing opt-in link with the licensed Gmail account. Sign in to Sanskritam through verified Google sign-in and test together with the developer.

## Engineering work to complete alongside these tasks

- Prepare a testing backend and Android internal-testing EAS build profile. The current production EAS profile points at the live backend, and its submission profile targets the production track; do not use automatic production submission for this test.
- Mount Google verification credentials; set a strong commerce signing key, admin roles, notification identity/audience and package ID. Apple credentials are not needed for Android.
- Back up and migrate the target database; run PostgreSQL integration checks against a running database service.
- Publish explicit written/audio title prices, protect media origins and configure signed previews/download delivery.
- Enable commerce and sales only on the testing backend for the first test. Keep ads, real-world rewards and organizer hosting disabled until individually ready.
- Build an Android `.aab`, check the next unused version code, upload manually to Play internal testing and verify Play-signing-aware Google login. This requires a native build; Expo Go/OTA alone cannot supply the new modules.
- Check each subscription/refill, duplicate delivery, restart/restore, renewal, cancellation, refund, upgrades/downgrades, slot rules, offline licences and foreground/background audio on the physical device.
- Measure bounded AI costs before enabling paid AI. Initial rate defaults are not certified cost bounds.
- Run and schedule reconciliation; confirm notifications and ledger history agree with Play orders.

## After the Android purchase flow works

Create supporter products `com.sanskritam.app.supporter.bronze` / `.silver` / `.gold` at ₹99/₹299/₹999 and hosting product `com.sanskritam.app.hosting` at ₹499. These remain part of the rollout, but are not prerequisites for testing the initial six products.

Configure Android AdMob app/native/rewarded IDs, UMP consent, app-ads.txt and `/commerce/ads/ssv` before enabling ads. Use test serving during validation. Configure reviewed country fulfilment, referral settlements, event rules and funded prizes before activating rewards or promoting prizes.

Production release follows the release checklist. For personal developer accounts created after 13 November 2023, Google may require the applicable closed test with at least 12 opted-in testers for 14 continuous days before production access. Internal testing does not replace that requirement.

Official references:

- https://developer.android.com/google/play/billing/getting-ready
- https://developers.google.com/android-publisher/getting_started
- https://developer.android.com/google/play/billing/test
- https://support.google.com/googleplay/android-developer/answer/14151465
