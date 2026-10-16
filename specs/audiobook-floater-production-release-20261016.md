# Audiobook floater production OTA — 16 October 2026

Owner requested the earlier orange player layout and production OTA publication.

- Restores the earlier mini-player layout: equalizer mark, title and verse
  details, previous/next, round saffron play/pause button and session close.
- The global floater uses that shared mini-player and opens the active book's
  Listen screen. Ordinary speech, voice notes, practice, videos and voice calls
  do not opt in to the floater.
- TypeScript and playback regression checks passed; recitation checks passed
  (117). Focused component checks passed for visibility, navigation,
  previous/play/next/close actions and suppression of duplicate shelf controls.
- Android export passed; all 482 asset references and the bundle exist.

Published to the production channel/branch for Android runtime `1.4.1` at
01:21 IST on 16 October 2026 (`2026-10-15T19:51:40.425Z`).

- Update group: `cb1c5cf8-75e5-4e93-add0-dd2c97cd9948`.
- Update ID: `01a1411e-ce89-7912-bf66-7cb7966b2fba`.
- [EAS dashboard](https://expo.dev/accounts/sanskritam/projects/sanskritam/updates/cb1c5cf8-75e5-4e93-add0-dd2c97cd9948).
- Published from the working tree based on `14757e5`; source changes are
  uncommitted. No native build or backend deployment was required.
- Export and publication logs: ignored `mobile/.expo/audiobook-floater-*`.

Apply through Settings → Check for updates → Restart. Physical-device
installation and visual appearance were not verified in this session.
