# Sanskritam free production preparation — 17 October 2026

Public app: Sanskritam. Developer/publisher: Vedic Valor.
Monitored support and safety contact: sanskritam@vedicvalor.com.
The owner has accepted responsibility for reviewing reports. Public app copy
uses the developer brand; identity verification and private account ownership
remain accurate.

## Release scope

Android version 1.6.0, version code 11, package com.sanskritam.app, Expo SDK 57.
Home, Learn, Talk, Play and Read remain. Reading, prepared audio, offline saving,
background playback, local games, handwriting and ordinary recitation practice
are free. The Group and Voice tabs, membership/credit screens, ads, rewarded
unlocks, referral payouts, supporter purchases, paid hosting and prize contests
are deferred. Social/competition entry points and their native SDKs are removed.

Baseline tag: deferred-features-before-free-launch-20261017. Restorable source
and instructions: deferred/README.md. This folder is excluded from EAS and
Cloud Run source uploads. Changes in the free release must be ported forward
when restoring a feature; do not replace shared files with the old versions.

## Shared daily spending

GEMINI_DAILY_BUDGET_USD=1; QUOTA_DAILY_BUDGET_INR=300;
BUDGET_TIMEZONE=Asia/Kolkata; QUOTA_ENABLED=true.
These are independent service-wide pools across every learner and instance.
They reset at midnight India time. Existing per-learner abuse limits remain
additional limits, not 1 USD / 300 INR allocations for each account.

Postgres transaction advisory locks serialize reservations across instances.
Known token-based Gemini calls reserve before dispatch and settle afterwards.
Usage is an application estimate based on configured model/unit prices, not an
invoice guarantee. Cached answers, prepared audio and local exercises remain
available. New scheduled batch content generation is paused; stored content
is served. Book search is disabled to avoid unmetered embedding calls.

## Safety operations (owner runbook)

Open `/admin/report-queue` on the backend. Enter the administrator token from
the configured Secret Manager binding; never put it in the mobile bundle,
Git, a URL or a screenshot. The page keeps it in memory in that tab only.

Review open reports every day, prioritising child safety, threats, hate and
personal-data exposure. Set `reviewing` while investigating. Use the exact-answer
withdrawal or daily-card withdrawal action when appropriate. Record a concrete
decision and follow-up before `actioned` or `dismissed`. Escalate serious cases
to the appropriate provider/authority where required. Investigate repeated
reports and improve prompts/filters; do not treat a report row as resolution.

Report submissions acknowledge success only after server acceptance. Failure
stays visible and allows retry. The API supports Talk, Ask, fact, word and future
Voice reports. Reports and review decisions are authenticated and persisted.
AI prompts share safety instructions; high-harm request checks and reviewed
answer withdrawals run on the server. Ask final answers are checked before
delivery; unchecked partial text is not displayed. These are baseline controls,
not perfect automated moderation.

Provider deletion uses a minimal outbox. A failed Stream request does not undo
local account deletion. The administrator retry endpoint is
`POST /admin/provider-deletions/run`. Keep provider credentials until all legacy
deletion tasks are confirmed. Monitor retry errors and unresolved reports.

## Play Console preparation

- Privacy URL: https://sanskritam.vedicvalor.com/privacy
- Deletion URL: https://sanskritam.vedicvalor.com/delete-account
- Ads: no ads in this build. No digital purchases or subscriptions in this build.
- Update screenshots and listing copy to the five remaining tabs and free content.
- Guest access: open app, Continue as guest, complete onboarding. Specify this
  in App access. Google sign-in is optional; account deletion is in Settings.
- Declare data practices for guest account identifiers, optional sign-in/name,
  optional profile pictures, learning/app activity, stored tutor transcripts,
  submitted audio, optional handwriting photos, submitted AI questions/screen
  context/birth details, reports and notification tokens. Assess each provider
  under Google's Data safety definitions and service-provider exemptions;
  do not declare “no data collected” merely because there are no ads/payments.
- Verify target audience and content rating honestly against actual content.
  The policy says the app is not directed to under-13s; do not change age
  declarations solely to avoid requirements.
- Install this exact build through the testing track; test guest/onboarding,
  sign-in, permission denial, lessons, reading/audio, offline/background playback,
  AI exhaustion messages, failed/successful reports and deletion. Inspect the
  Play pre-launch report and native 16 KB compatibility results.
- For Apply for production, use the real recruitment history, tester engagement,
  feedback and fixes. This document does not invent closed-test evidence.
- Build creation is not a Play submission or production-access approval. The
  owner still applies in Play Console after testing the final build.

## Verified release evidence

- EAS production Android build finished successfully: version 1.6.0 (11),
  build ID `3207cc57-60d0-4376-b1b8-e4cdc86e3221`, source commit
  `3c970c51ed4c17b9bff1813e09b9c46f962e840f`.
  Build and AAB download: https://expo.dev/accounts/sanskritam/projects/sanskritam/builds/3207cc57-60d0-4376-b1b8-e4cdc86e3221
  Successful build completion does not replace installation and Play checks below.
- Focused backend suites: 335 passed (139 launch/budget/legal/reporting checks;
  196 tutor/conversation/commerce/configuration checks).
- Mobile TypeScript, playback regressions, offline reading/download checks and
  117 recitation checks passed.
- Android export: 2,475 source modules, 93 assets. Artifact checks confirm the
  deferred source modules, native SDK imports and API paths are absent.
- Regenerated native configuration has no billing declaration, AdMob metadata
  or Stream/WebRTC permissions. AD_ID and broad image/video permissions are
  explicitly blocked. Optional camera/microphone and approximate location are
  retained for the documented learning features.
- Updated shell-quote to 1.12.0 through the lockfile, removing its critical
  development-tool advisory. No claim of a clean audit for all transitive tooling.
- Cloud Build 0b205f1a-6081-4cd7-bc9e-71fd04ecc336 succeeded. Cloud Run revision
  shabd-api-00085-q72 is ready and serving the free launch backend.
- Additive migration 20261017_launch_safety followed the existing
  20261016_canon_licence_text head. The affected report table was backed up
  before deployment (0 existing rows); existing database/credential bindings
  were preserved.
- Live checks passed: health, production dev-login disabled, deferred API routes
  absent, report authentication, 1 USD Gemini / 300 INR Sarvam shared budget
  configuration, updated branded privacy/deletion URLs and provider erasure
  retry endpoint. There were no pending provider deletions at verification.
- Email alerts are configured for sanskritam@vedicvalor.com on report queue
  events and provider erasure failures. Alert policy:
  projects/gen-lang-client-0232760726/alertPolicies/12952897472049039631.
  Receipt of a real email was not exercised by sending a synthetic report.
- Hourly provider deletion retry job: sanskritam-provider-deletion-retry.
  Previous competition and content-generation scheduler jobs are paused.
- The live legal landing page already exposes only privacy and deletion links;
  its source was reconciled to that state. Cloudflare authentication was not
  needed to update policy content because the worker proxies the deployed backend.
- This is source/export/API verification. Physical-device testing, final AAB
  installation, Play pre-launch checks and production-access approval remain
  separate steps. No store submission was made by this preparation.

Android Hermes SHA-256: ac6730474628d324aca04741692b6a67c5eebcca4782f53c66fc3a762ae7f615

