# Deferred Sanskritam features

The free launch removes these modules from mobile/, the Metro dependency graph,
the EAS archive and native autolinking. They are preserved here as source, not
hidden features in the shipped app. Backend modules remain in their normal
locations, with their routes unregistered while DEFERRED_FEATURES_ENABLED=false.

Complete original integration: Git tag
`deferred-features-before-free-launch-20261017` (commit `113e2a2`).
Use this tag to inspect the former shared files, not to overwrite current
safeguards, disclosure, quota or account-deletion fixes wholesale.

## Stage a future restoration

Run, for example, `python scripts/prepare_deferred_restore.py voice results/restore-voice`.
The helper copies only archived sources to a new staging directory. It never
changes the running app or enables a backend feature. Other groups: `group`,
`commerce`, `contests`.

For each feature:

1. Create a normal development branch and copy the staged sources into mobile/.
2. Restore the relevant imports, route registration and providers in App.tsx,
   MainTabs.tsx and AppDrawer.tsx using the baseline tag as a reference. The
   current API client and game client deliberately omit deferred API methods;
   port only those required by the feature. Restore type contracts as needed.
3. Restore only required dependencies/plugins from the baseline package.json
   and app configuration, and regenerate package-lock.json and native projects.
   Group needs Stream/WebRTC; commerce needs IAP/AdMob only when actually used.
   SecureStore/Crypto remain available for other uses.
4. Commerce also needs its access UI, session sync, API quote integration and
   licensed offline/background audio rules. The free versions of offlineBooks,
   managedAudio, useBookPages and reader screens intentionally have no paywalls.
   Inspect the baseline versions when implementing the new business rules.
5. VoiceSession in this archive already has an in-app report control. Keep it,
   the report queue, server safeguards, daily caps and provider-deletion outbox.
   Update privacy disclosures for every enabled Voice provider before release.
6. Implement real store products/sandbox tests, prize eligibility/funding, and
   moderation staffing as applicable. Replace the archived legal wording; it is
   historical reference and must not be republished unchanged.
7. Update Google Play declarations, screenshots, reviewer instructions and
   privacy documents to match the feature. Enable required backend routes in
   staging only, test, and ship a new reviewed native build.

Do not restore by remotely enabling hidden code, detecting reviewers, or
applying an old App.tsx wholesale. New native SDKs require a new store build.
