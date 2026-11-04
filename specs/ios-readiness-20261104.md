# iOS readiness check — 2026-11-04

## Implemented

- Added the iOS `ShabdDigitalInk` Expo module and CocoaPods specification. It
  implements the same model download/list/delete and stroke recognition API as
  Android using Google ML Kit Digital Ink. Downloads resolve on completion or
  reject on failure/timeout, allowing the existing local template fallback.
- Kept the current `hi` model and shared candidate grading. Google also lists
  `sa-Deva-IN`; compare real Sanskrit writing before changing either platform.
- Matched GoogleMLKit 8.0.0 already required by photo OCR and face detection.
- Fixed both native Google sign-in entry points to pass the configured iOS client
  ID. Play Services checks now run only on Android.
- Fixed backend Apple identity-token verification to accept RS256. Previously it
  allowed only ES256, rejecting Apple's actual identity tokens. The backend must
  be redeployed for this fix to reach devices.
- Enabled `ios.usesAppleSignIn` explicitly and used Apple's native, localized
  sign-in button after checking availability.
- Added an `ios-testflight` EAS profile with store distribution, an independent
  update channel, inherited production environment, and incrementing build number.
- Removed the direct `expo-modules-core` JS dependency; the local module uses
  Expo's supported re-export. Its native pod still depends on ExpoModulesCore.

## Checked

| Area | Evidence / limits |
| --- | --- |
| Native handwriting registration | Expo Apple autolinking resolves the pod, Swift module and module class. Nested module sources are retained by both EAS ignore files. |
| Handwriting fallbacks | Real shared JS adapter and shape matcher pass missing-module, download failure, empty candidate, recognition failure, and candidate-ranking checks. Recognition stays local; grading/progress still use the backend. |
| Apple authentication | Six real signed-token verifier tests cover valid RSA signatures, wrong audience/issuer, expiry, forged signatures and unexpected algorithms. Existing endpoint tests also pass. |
| Photo handwriting | Installed text-recognition pod includes iOS Devanagari OCR. The existing camera-photo path uses server recognition, then local OCR on failure; no new uploads introduced. Device accuracy remains untested. |
| Eyes-closed checks | Installed face-detection pod has iOS support and exports the eye-probability fields the app uses. Camera frames remain on-device. Device accuracy remains untested. |
| Audio | Installed Expo Audio includes the iOS PCM stream and recorder implementations. Recitation has its recorder fallback. Recording/playback and Bluetooth transitions need device testing. |
| Permissions | Generated iOS config has camera, microphone, photo-library and location descriptions, Apple sign-in entitlement, background audio and iPad orientations. |
| JavaScript / types | iOS Hermes bundle export and TypeScript check pass. This is not a Swift build. |
| Backend regression | 57 selected Apple-authentication, handwriting and photographed-writing tests pass. |
| Account deletion | In-app server/local account deletion exists. Apple authorization revocation is still missing; see pending items. |

## Still required before App Store submission

1. Run a signed cloud Mac build and install it through TestFlight. Windows cannot
   compile this Swift/CocoaPods integration. Neither a native build nor device QA
   was performed in this change.
2. Finish Apple Developer/App Store Connect setup, signing and the app record.
   Confirm the server's `APPLE_CLIENT_ID` includes `com.sanskritam.app`, deploy the
   RS256 fix, and verify real Google/Apple login and account linking.
3. Implement Sign in with Apple token revocation on account deletion. The current
   app sends identity tokens only, does not retain/exchange authorization codes,
   and its provider-deletion outbox handles Stream only. This needs the Apple
   team/key/client-secret configuration and an authorization-code/token flow;
   local/server deletion alone does not revoke Apple's authorization.
4. Resolve the existing Expo dependency warnings as a separate tested update.
   Expo Doctor flags SDK patch drift, the keyboard-controller version, and
   missing/New Architecture metadata for third-party native packages. No warnings
   were hidden. Updating Expo Audio also needs checking the existing Android
   echo-cancellation patch, which depends on the installed native source.
5. Replace the shared Google Play-only store URL for iOS once the App Store ID is
   assigned. Verify notification permissions/APNs if push is part of launch.
6. On both devices test model download, offline recognition, poor-network fallback,
   drawing/scroll gestures, photo OCR, eyes-closed checks, mic permission denial,
   recording/playback/Bluetooth, sign-in/linking/deletion, and iPad layouts. Compare
   `hi` and `sa-Deva-IN` on letters, mātrās and words before choosing a new model.
7. Complete App Store screenshots, privacy declarations, review instructions and
   any export-compliance answers in App Store Connect.

## Commands

From `mobile/`:

```powershell
npx tsc --noEmit
node scripts/check-handwriting.mjs
npx expo-modules-autolinking resolve --platform apple --json
npx expo export --platform ios
npx eas-cli@latest build --platform ios --profile ios-testflight
```

The last command starts a cloud build and was not run. After a successful signed
build, use EAS Submit/App Store Connect to distribute through TestFlight; this
does not itself publish the app publicly.

## References

- [Google ML Kit Digital Ink for iOS](https://developers.google.com/ml-kit/vision/digital-ink-recognition/ios)
- [ML Kit language models](https://developers.google.com/ml-kit/vision/digital-ink-recognition/base-models)
- [Expo SDK 57 Apple authentication](https://docs.expo.dev/versions/v57.0.0/sdk/apple-authentication/)
- [Apple public signing keys](https://appleid.apple.com/auth/keys)
- [Apple account deletion and token revocation](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
