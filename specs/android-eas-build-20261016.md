# Android EAS build — 16 October 2026

- App: Sanskritam, `com.sanskritam.app`
- Version: **1.5.0 (10)**
- EAS profile/channel: `android-internal`
- Artifact: signed Android App Bundle (`.aab`) for manual upload to Google Play internal testing
- Build ID: `5acb0695-073d-48ba-914f-b449a0d3ea6e`
- Build page: https://expo.dev/accounts/sanskritam/projects/sanskritam/builds/5acb0695-073d-48ba-914f-b449a0d3ea6e
- Status: **FINISHED**, completed 16 October 2026 at 11:46:45 UTC (17:16:45 IST).
- Download: https://expo.dev/artifacts/eas/v1jiR7Oih3oargUBm6zafy509agRv-fjp3nE3dRfGfs.aab
- Local artifact: `results/commerce/sanskritam-1.5.0-10.aab` (238,254,990 bytes)
- SHA-256: `55da27fc97f950ba66440a2c6da784273e5e21c89da9f4e054fb890b46a5c9b4`
- EAS build duration: approximately 31 minutes; Gradle reported `BUILD SUCCESSFUL in 29m 58s`.

This build reuses the existing EAS-managed Android signing credentials. No Google Play submission or production rollout was requested or performed. The profile inherits the existing backend URL and Google sign-in IDs; it does not provision a separate staging backend or enable monetization switches.

## Build repairs and checks

- Fixed the previous AdMob Gradle configuration failure by selecting `androidSdk: classic`; generated Gradle properties contain `RNGMA_ANDROID_BACKEND=classic`.
- Added SDK-compatible direct native dependencies: Expo Asset, Expo Modules Core, React Native Worklets and Expo Splash Screen.
- Moved obsolete splash configuration to the splash-screen plugin and made the dynamic config consume the static app configuration.
- Removed obsolete external React Native type stubs; TypeScript passed afterward.
- Android prebuild passed with version code 10 and the expected AdMob development app ID. Production ad serving still requires real configuration and a rebuild.
- The EAS Android release build completed successfully, including IAP/AdMob native compilation, code bundling, signing and artifact upload. Expo Doctor reported three nonfatal advisory checks for direct dependencies, React Native Directory metadata and SDK package-version alignment; this is not an all-green Doctor result.
- Restricted the root EAS archive to the self-contained mobile project; separately excluded credential files in the mobile ignore file.
- Inspected the EAS archive using the CLI's copy/ignore implementation: 959 files, approximately 113 MB, mobile-only, local Android ink module and monetization UI present, no credential/env/private-key files detected.

The upload used `EAS_NO_VCS=1` to include current working files without cloning the repository's large Git objects. The optional fingerprint calculation completed successfully. Only one remote build was active when checked.

```powershell
# From mobile/; no automatic store submission
$env:EAS_NO_VCS='1'
eas build --platform android --profile android-internal --non-interactive --freeze-credentials --no-wait --json --message 'Android monetization internal test 1.5.0 (10)'
```

Server/payment configuration, measured AI costs and physical-device validation remain separate release gates. See `android-monetization-next-steps.md`.
