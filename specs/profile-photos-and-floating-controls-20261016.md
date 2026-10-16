# Shared profile photo and floating controls — 16 October 2026

One optional profile picture is shared by Settings, the learner card, Group
lists, chat senders and call participants. Upload/change/remove are available
in Settings and the learner card. There is no separate group picture in this
change (owner clarified that “image in group” meant the person's profile photo).

## Community protections

- Community participation and profile-photo uploads require a verified Google
  or Apple identity plus the existing learner card and rules agreement.
- Guests can link a new provider account without losing their learner ID or
  progress. Existing provider identities cannot be transferred to another
  learner; linked accounts cannot use name-based development login.
- Pictures are bounded, decoded and re-encoded as JPEG, stripped of metadata,
  and screened using the configured Vertex Gemini image model. Only an explicit
  boolean approval is accepted. Outages and uncertain responses fail closed.
- Storage is private. Photo reads require an app bearer token, respect blocks
  in either direction and hide suspended profiles. Replaced photo URLs expire
  immediately because the server checks the current image version.
- Existing reporting, blocking, friendship and circle-admin controls remain.
  New admin suspension and photo removal are audited; reports alone do not
  automatically ban a learner. Sign-in is account verification, not proof that
  someone is genuine or safe, and image screening can make mistakes.

`PUT /admin/community/learners/{learner_id}` requires the configured
`X-Admin-Token` and accepts `suspended`, optional `remove_photo`, and a reason of
at least five characters. Example JSON:

```json
{"suspended": true, "remove_photo": true, "reason": "Reviewed harmful conduct"}
```

Reports remain at `GET /admin/reports`. A suspension blocks community API
requests and the refresh websocket, while preserving access to learning and
account deletion. Existing Stream call tokens are restricted to their call
and expire after an hour; this change does not revoke an already issued token
at the Stream provider. Call hosts retain their existing moderation controls.

## Floating controls

Ask and the audiobook mini-player share draggable overlays. The chevron tucks
either control to the nearest screen edge. The remaining 28 px tab has 25%
opacity (75% transparency) and an enlarged touch target; tap to restore or drag
the tab to move it. Dragging the expanded control beyond an edge also tucks it.
Each control remembers its own side, height and hidden state. Dialog copies
share the same state. Position is clamped on window changes and stays above
the bottom navigation. Tucking playback controls does not pause the audiobook.

## Verification

- 59 combined backend checks passed (profile images, community, deletion,
  privacy, anonymous auth, Google and Apple auth).
- Targeted auth/profile checks passed again after unifying auth profile output
  and protecting linked accounts from development login (22 checks).
- TypeScript passed. Playback checks and real-component gesture/persistence
  checks passed (`mobile/scripts/check-floaters.mjs`).
- A real Vertex request approved a generated plain-orange test image. No real
  person's photo was used in this smoke test. Harmful-content outcomes and
  outage behavior are exercised with mocked model responses.
- Physical-device photo picking and dragging have not been verified here.

Backend migration: `20261016_profile_photos` (additive learner columns).
Publication outputs and an isolated release snapshot are under ignored
`results/profile-photo-release-20261016/`. The snapshot excludes unrelated
lesson-art and book-tracker work in the shared checkout.

## Production publication

- Backend revision `shabd-api-00080-7j6` is serving 100% of traffic. The deploy
  reused database secret version 51, applied the additive migration at startup,
  and passed health checks. The live OpenAPI includes profile uploads, identity
  linking and the admin moderation endpoint; photo reads without auth return
  401. The public privacy page includes the new disclosures.
- Android production OTA runtime `1.4.1`, published at 01:51 IST on 16 October
  2026 (`2026-10-15T20:21:53.683Z`).
- Update group: `15094518-5944-4636-acb2-dfbb08cb2c6f`.
- Update ID: `01a1413a-7993-767f-8a67-aabacdd59c7b`.
- [EAS update dashboard](https://expo.dev/accounts/sanskritam/projects/sanskritam/updates/15094518-5944-4636-acb2-dfbb08cb2c6f).
- The isolated export contains 482 assets and a 10,758,935-byte Hermes bundle,
  SHA-256 `c931c07501318503e8b2b6fd5b83a2f631b2f21d1eaf8dba0e5697e87b1e0cd7`.
  Publication used `--skip-bundler` to upload that exact checked export.
- Source remains uncommitted on top of `14757e5`; 23 scoped source files were
  copied to the release snapshot and their hashes verified. The snapshot's
  lesson source matches the committed baseline, excluding concurrent edits.
- Existing content and competition scheduler jobs were retained. No native
  build, credential rotation, or unrelated source publication was performed.

Apply in Settings → Check for updates → Restart.
