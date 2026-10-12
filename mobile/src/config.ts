// Global app configuration.
//
// U9-3 (P18-3): the backend is reachable two ways —
//   • DEV (dev build / Expo / LAN): the machine's LAN address, rewritten by
//     start_mob.ps1 on every run. This stays the dev default.
//   • RELEASE (a shipped build): the deployed Cloud Run service. Set at build
//     time with EXPO_PUBLIC_SHBAD_RELEASE_URL. A release build with an unset
//     URL FAILS LOUDLY at startup (§2.11 / U9-3) instead of silently falling
//     back to localhost — that silence is how a "working" build talks to nothing.

// When running the web build, __DEV__ is true and localhost:8000 is the
// backend. For a physical device via Expo Go, replace with your machine's
// LAN IP (e.g. http://192.168.1.50:8000).
const DEVICE_HOST = "10.54.211.186";

// Port the backend listens on. Moved off 8000 on 2026-08-30: a phantom socket
// there kept winning connections ahead of every freshly started server, so the
// app talked to stale code no matter how often the backend was restarted. Both
// this and DEVICE_HOST are rewritten by start_mob.ps1 on each run.
const DEVICE_PORT = 8001;

// The deployed backend. Injected at build time (Expo inlines EXPO_PUBLIC_*
// env vars read through process.env). In a release build this must be the
// Cloud Run URL; empty => startup throws.
const RELEASE_BASE_URL_ENV = (
  process.env.EXPO_PUBLIC_SHBAD_RELEASE_URL as string | undefined
)?.trim() ?? "";

// Optional shipped default — paste the Cloud Run URL here once it is known
// (https://shabd-api-<deployment-hash>-as.a.run.app, the deploy script prints
// it). Keeping this as the fallback lets a release build resolve the deployed
// backend without a build-time env, while an entirely-unset URL still fails
// loudly below instead of falling back to localhost (U9-3).
const CLOUD_RUN_FALLBACK_URL = "https://shabd-api-829757572630.asia-south1.run.app";

// Google Sign-in client IDs (Android, iOS, Web/backend). Injected at build
// time via EXPO_PUBLIC_* env vars (expo-auth-session). The Android client ID's
// ID token has `aud` == that same Android client ID, which is what the backend
// verifies (POST /auth/google), so production must set
// EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID to the value configured on the backend.
const GOOGLE_CLIENT_ID_ANDROID =
  (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID as string | undefined)?.trim() ?? "";
const GOOGLE_CLIENT_ID_IOS =
  (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS as string | undefined)?.trim() ?? "";
const GOOGLE_CLIENT_ID_WEB =
  (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB as string | undefined)?.trim() ?? "";
const GOOGLE_CLIENT_ID_EXPO =
  (process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_EXPO as string | undefined)?.trim() ?? "";

// True when at least one Google client ID is configured, so the Login screen
// can enable the "Continue with Google" button.
export const GOOGLE_LOGIN_ENABLED =
  !!GOOGLE_CLIENT_ID_ANDROID || !!GOOGLE_CLIENT_ID_IOS || !!GOOGLE_CLIENT_ID_WEB;

export const GOOGLE_CLIENT_IDS = {
  androidClientId: GOOGLE_CLIENT_ID_ANDROID,
  iosClientId: GOOGLE_CLIENT_ID_IOS,
  webClientId: GOOGLE_CLIENT_ID_WEB,
  expoClientId: GOOGLE_CLIENT_ID_EXPO,
}

// Public legal site (Cloudflare worker in deploy/cloudflare/legal-site).
// This is the stable hostname the Play listing links to. The in-app privacy
// policy must use this, not BASE_URL (Cloud Run), whose hostname is an
// implementation detail and changes across deploys.
export const LEGAL_BASE_URL = "https://sanskritam.vedicvalor.com";
export const PRIVACY_POLICY_URL = `${LEGAL_BASE_URL}/privacy`;
export const DELETE_ACCOUNT_URL = `${LEGAL_BASE_URL}/delete-account`;

const RELEASE_BASE_URL = RELEASE_BASE_URL_ENV || CLOUD_RUN_FALLBACK_URL;

// A helper to build a full URL joined to the API base.
export const BASE_URL = __DEV__
  ? `http://${DEVICE_HOST}:${DEVICE_PORT}`
  : RELEASE_BASE_URL;

if (!__DEV__ && !RELEASE_BASE_URL) {
  throw new Error(
    "[U9-3] Release build has no backend URL. Set EXPO_PUBLIC_SHBAD_RELEASE_URL " +
      "to the Cloud Run URL at build time; a shipped app must not silently fall " +
      "back to localhost (HANDOVER §2.11)."
  );
}

// Dev-login identity columns shown on the onboarding screen.
export const DEFAULT_BRIDGE_LANGS = ["en", "hi"];

// Auto-login identity used until a real onboarding screen ships. The backend's
// /auth/dev-login is the only auth and it is keyed by display name (no
// password), so an anonymous session is one silent call away. This lets Home
// work today; the Login screen (src/screens/Login.tsx) is wired in later.
export const DEFAULT_LEARNER_NAME = "Sisya";

// Conversation pacing constants shared by the talking-agent screen.
export const HOLD_STATE_MS = 480; // pause after tutor audio before allowing input
export const TTS_PACE = 1.0;
export const TTS_SPEAKER = "aditya"; // valid bulbul:v3 persona speaker

export default { BASE_URL, DEVICE_HOST, DEVICE_PORT, TTS_SPEAKER };

