# Group community implementation

The **Group** bottom tab follows Voice. The feature uses the existing Expo/React Native app, FastAPI Bearer sessions, SQLAlchemy database, friend/block edges, and R2 client. It does not introduce Supabase Auth or a second chat provider.

## Included

- Rooms: create, discover/filter, speaker avatars and connected counts, live stage, speaking/muted indicators, raise hand, host approval/dismissal, step down, end, and a persistent mini-player above the toolbar.
- Chats: accepted-friend DMs, Sanskrit/IAST text, replies, pagination, unread counts/read markers, and idempotent message retries.
- Study groups: public/private creation, discovery, joining, owner invitations to accepted friends, membership details, leaving, and owner transfer.
- Friends: opt-in learner directory with proficiency/bio/presence, incoming/outgoing requests, accept/decline/cancel, chat/call, and blocking using the existing friend graph.
- Media: progressive image compression to WebP/JPEG, 32 kbps mono AAC/Opus voice notes capped at 120 seconds, private R2 uploads, membership-checked signed reads, local caching, 48-hour expiry, image lightbox and voice playback/speed/progress.
- Audio: server-created audio rooms and conversation calls, one-hour tokens scoped to the authorized call, microphones muted on entry, camera disabled before joining, and video/screensharing/recording/transcription disabled on the server. Incoming calls use the app's authenticated realtime connection and a bundled ringtone while the app is open.
- Realtime: short-lived single-use tickets; database-backed websocket invalidations across workers; reconnect and foreground refresh. Long-lived auth tokens never go in socket URLs. Chat content never goes in invalidation events.
- Account deletion: removes private chats/messages/media and transfers ownership of shared groups. Postgres community tables have RLS enabled and browser roles revoked; access goes through authenticated FastAPI routes.

## Configuration and deployment

`STREAM_API_KEY` and `STREAM_API_SECRET` are read server-side from the existing environment. The previous `NEXT_PUBLIC_STREAM_API_KEY` spelling is accepted for compatibility. No Stream secret is bundled into Expo.

The existing R2 credentials have been verified. A separate private community bucket has been provisioned and `R2_PRIVATE_BUCKET` added to the ignored `.env` and `.env.deploy` files. Its `ephemeral-chat/` prefix has a two-day lifecycle rule, and signed GET/HEAD browser reads have CORS enabled. Existing public audio objects and their lifecycle rules were not changed.

The additive Alembic revision is `20261014_group`, following `d5e6f7a8b9c0`; normal backend startup applies it. Database access uses the existing server database connection. The migration supports SQLite and PostgreSQL.

Native packages require a new development/release binary. App version is **1.4.0**, Android version code **7**, so this cannot accidentally ship as an OTA update to a binary without WebRTC and image-picker modules. Before a native build, regenerate native configuration with `npx expo prebuild --platform android --no-install` (or the corresponding iOS workflow), then build normally. Expo Go does not include these native calling modules.

Optional maintenance from `backend/`:

```text
python scripts/community_retention.py --cleanup
```

Run that periodically to remove expired objects explicitly, expire abandoned rooms, and prune realtime tickets/events. The bucket lifecycle independently removes the objects. The app and signed-read endpoint enforce the exact 48-hour deadline even if the storage lifecycle processes deletions later. The `--apply-lifecycle` option merges the community rule without overwriting unrelated rules.

## Verification

- TypeScript check; Expo web, Android Hermes, and iOS exports; Expo prebuild configuration evaluation.
- 20 backend checks pass across community, account deletion, existing social behavior, and environment loading. They cover private membership/invites, accepted-friend DMs, duplicate sends, unread/read state, cross-conversation replies, blocks, media expiry/ownership/limits, host authorization, single-use realtime tickets/delivery, server video restrictions, token scope/expiry, and account deletion with foreign keys enforced.
- Phone-size browser checks create a group, send Sanskrit text, upload/compress a photo to the real private R2 bucket, load its signed/cached preview, and record/upload/play a voice note with the composer above the toolbar.
- Live Stream API checks create/end both call types, grant/revoke speaker permissions, and read occupancy. Temporary API-check users/calls are removed afterward.

The automated browser environment cannot reliably establish the regional Stream SFU websocket (TLS/CORS/network failures). Microphone/media transport and background native behavior still need a two-device check on the new binary. Background/killed-app ringing through APNs/FCM/CallKit is not configured; foreground ringing works through the community socket. The existing learning/reading audio players are independent; Voice Lab and voice-note recording guard against sharing the microphone with a community call.

No production backend/app release has been deployed as part of this source implementation.
