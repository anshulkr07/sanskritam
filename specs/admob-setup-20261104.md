# AdMob test integration and registration — 4 November 2026

The app now supports native sponsored cards between library shelves and on the
next-chapter page, and optional rewarded video for additional reading/listening
previews. Lite and Plus suppress all ads. Separately purchased editions suppress
ads for that edition. Advertising is opt-in and restricted to adults under the
existing ad-profile policy; this does not change pricing by age.

No fullscreen interstitials, audio-insertion ads or lesson/game paywalls are added.
No ad account was created, production settings changed or live ads activated.
Computer-use approval rejected Google Chrome access in this session, preventing
registration in the signed-in browser. Account/payment/identity setup remains manual.

## Testing the native integration

1. Deploy this backend to a staging environment with the existing hybrid migrations.
   Set `COMMERCE_ENABLED=true`, `COMMERCE_HYBRID_ENABLED=true`,
   `COMMERCE_ADS_ENABLED=true` and a real `COMMERCE_SIGNING_KEY`. Sales can stay off.
   Keep production ad serving off during validation.
2. Set the staging API as `EXPO_PUBLIC_SHBAD_RELEASE_URL` in the `ads-test` EAS
   build environment. Build Android with `npx eas-cli build --profile ads-test
   --platform android`, or iOS with `--platform ios` and the required Apple signing.
   This profile sets `EXPO_PUBLIC_HYBRID_COMMERCE=true` and `EXPO_PUBLIC_ADS_MODE=test`.
   A new native binary is required; Expo Go and an OTA to an older binary cannot
   add this SDK. Test runtime is `1.7.0-ads-test-v1`, separated from existing builds.
3. Install the test binary. In Settings → Advertising choose Enable optional ads
   only for an adult test account. The app then invokes Google's UMP consent flow
   before initializing Mobile Ads. No consent-ready result means no ad requests.
   Google's sample app IDs may not have a configured UMP message; if consent is
   unavailable, set `ADMOB_ANDROID_APP_ID` and `ADMOB_IOS_APP_ID` to your registered
   app IDs and rebuild the same `ads-test` profile. Test mode still uses Google's
   **demo ad-unit IDs**. Configure Privacy & messaging for those registered apps.
   Do not bypass consent failures or force a debug geography in a public build.
4. Open the Books library and scroll past the first shelf. At most two native
   tickets/day are issued, with at least ten minutes between them. A no-fill,
   error, withdrawn preference or missing permission leaves the app usable.
   Unused tickets count conservatively toward caps; they are not revenue reports.
5. For rewarded-video testing, publish a test premium title in staging, open its
   book/audiobook preview, and select Watch Google test ad. Rewarded attempts are
   capped at three/day. Test completion shows an explicit demo message and does
   not grant paid content. Google-owned demo ad units cannot be configured with
   your server-verification callback. Automated tests cover the signed callback
   and entitlement flow; verify actual SSV using your own rewarded unit configured
   as a test device before releasing live rewards.
6. Validate Lite/Plus suppression, per-edition ownership, cancellation before
   completion, no-fill, backgrounding, account switching, withdrawal, privacy
   options, chapter navigation and audio interruptions on actual Android/iOS
   devices. Native videos start muted. Rewarded fullscreen ads pause existing app
   audio and do not automatically restart it.

The checked-in test build uses Google's sample app IDs:

| Platform | Sample app ID |
|---|---|
| Android | `ca-app-pub-3940256099942544~3347511713` |
| iOS | `ca-app-pub-3940256099942544~1458002511` |

Ad-unit selection uses the SDK's platform-specific `TestIds.NATIVE` and
`TestIds.REWARDED`; test ads generate no earnings. Default `ADS_MODE=off` excludes
the SDK from native autolinking. Measurement initialization is delayed in ad builds.
Only non-personalized ads are requested, but these still require appropriate
consent/notice and store disclosures.

## Register the AdMob account

1. Open [AdMob](https://admob.google.com/home/) and select Get started. Sign in
   using the Google account that should own monetization. Enter the real payment
   country, time zone, legal/business details and required agreements yourself.
   Do not guess these details. Complete Payments details and later identity,
   address, tax and bank verification as prompted by Google. Store subscriptions
   and AdMob earnings are separate payment systems.
2. In Apps → Add app, add Sanskritam Android and iOS separately. Package and bundle
   identifier: `com.sanskritam.app`. Link the actual store listing if published;
   otherwise choose not listed yet and link it later. Record each **App ID**
   (`ca-app-pub-…~…`, tilde separator).
3. In each app → Ad units, create **Native** (`Library / chapter sponsors`) and
   **Rewarded** (`Extra reading / listening access`). Record each **Ad unit ID**
   (`ca-app-pub-…/…`, slash separator). No interstitial or app-open units are needed.
4. For each rewarded unit configure Server-side verification callback:
   `https://YOUR-STAGING-OR-LIVE-API/commerce/ads/ssv`. The SDK sends the signed
   account-bound ticket in `custom_data`. Put only your rewarded unit IDs in
   backend `COMMERCE_ADMOB_UNITS` as a JSON string array. The server checks Google's
   signature, recognized unit, timestamp, ticket expiry and transaction uniqueness.
   Never award access from the client completion event alone. Live rewards last
   24 hours: next available chapter/five extra verses or two extra audio minutes.
5. Configure Privacy & messaging for your target regions and platform. The app
   exposes Google's privacy options and a separate switch to stop optional ads.
   This version does not request ATT or promise personalized/tracking-based ads.
   Test EEA/UK/Switzerland and applicable US privacy messages with registered test
   devices and the SDK's consent testing tools before launch.
6. Copy AdMob's exact `app-ads.txt` publisher line and serve it at the root of the
   developer website linked in both store listings: `https://YOUR-DOMAIN/app-ads.txt`.
   Do not invent a publisher ID or publish Google's sample publisher ID. Wait for
   AdMob to verify it.

   Owner supplied publisher ID `pub-6672536899650972` on 4 November 2026. The
   matching line is now checked in at `deploy/cloudflare/homepages/app-ads.txt`;
   the homepage build copies it to the Sanskritam static assets and its Worker
   routes `/app-ads.txt` as plain text.

   Published and verified HTTP 200 at
   `https://sanskritam.vedicvalor.com/app-ads.txt` on 4 November 2026, with the exact
   supplied line and `text/plain; charset=utf-8`. The deployment added a small
   route around the existing live handler, preserving the older legal landing
   page and both backend legal proxies. It did not publish the separately prepared
   new homepages. Cloudflare Worker version:
   `81d26b9e-d790-4197-8d32-34069e09d6fb`. The checked-in homepage builder/Worker
   also includes the file so a later approved homepage deployment preserves it.
   AdMob's own crawl/verification is separate: request Check for updates and allow
   at least 24 hours for its status to refresh.
7. Update Google Play's Contains ads, Advertising ID and Data safety declarations,
   and Apple's App Privacy disclosures to reflect the selected SDK version and
   actual data use. Review SDK privacy manifests and the published privacy policy.
   Run internal tests first; Google account/app readiness approval can limit serving.

## Enable your own units after testing

Build-time variables (see mobile/.env.example):

```text
EXPO_PUBLIC_HYBRID_COMMERCE=true
EXPO_PUBLIC_ADS_MODE=live
ADMOB_ANDROID_APP_ID=<Android app ID>
ADMOB_IOS_APP_ID=<iOS app ID>
EXPO_PUBLIC_ADMOB_ANDROID_NATIVE=<Android native unit ID>
EXPO_PUBLIC_ADMOB_IOS_NATIVE=<iOS native unit ID>
EXPO_PUBLIC_ADMOB_ANDROID_REWARDED=<Android rewarded unit ID>
EXPO_PUBLIC_ADMOB_IOS_REWARDED=<iOS rewarded unit ID>
```

Live builds reject missing IDs and Google's sample publisher IDs. For an internal
test of your own publisher configuration, register all test devices in AdMob so
they receive test serving even with these unit IDs. Never click real ads yourself.
The live runtime is `1.7.0-ads-live-v1`; use an appropriate internal channel before
public distribution. Explicitly configure channel/API targets instead of reusing
the `ads-test` demo profile for production. Future app versions change the runtime.

Backend serving can be stopped with `COMMERCE_ADS_ENABLED=false`. Existing valid
earned callbacks can still settle idempotently. No database migration is added by
this change. Deploy the new backend before the new client so eligibility and
preferences endpoints are available.

## Validation and limits

Automated checks cover consent gating, demo/live unit selection, signed ticket
handoff, incomplete rewards, server verification before content refresh, account
switching, paid/owned suppression, opt-in withdrawal, daily caps and cooldowns.
Expo exports and generated Android/iOS config are checked separately from native
runtime tests. This machine has no Java/Android SDK or iOS toolchain; visible
test-ad delivery, physical-device consent forms and actual AdMob SSV remain device
validation tasks. No production deployment or store submission was performed.

Verified locally: 137 focused backend tests passed, followed by 39 hybrid/legal
tests after the final eligibility guard and new disclosure test. Fourteen mobile
service/config tests and TypeScript passed. Android, iOS and web JavaScript exports
passed. Expo introspection generated both sample app IDs and delayed measurement
settings; Android autolinking excludes the SDK in off mode and includes it in test
mode. These checks do not certify native ad delivery on a device.

Official references:
- [AdMob account/app setup](https://support.google.com/admob/answer/15948559?hl=en)
- [Google sample IDs](https://codelabs.developers.google.com/codelabs/admob-ads-in-flutter/)
- [iOS demo ad-unit IDs](https://developers.google.com/admob/ios/test-ads)
- [Google UMP consent](https://developers.google.com/admob/android/privacy)
- [React Native SDK setup](https://docs.page/invertase/react-native-google-mobile-ads)
