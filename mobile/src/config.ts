// Global app configuration.
// The backend is only reachable here in dev. On a device, point this at the
// LAN IP of the machine running the FastAPI server. Override at build time
// with .env or a metadata injection if you need env-specific base URLs.

// When running the web build, __DEV__ is true and localhost:8000 is the
// backend. For a physical device via Expo Go, replace with your machine's
// LAN IP (e.g. http://192.168.1.50:8000).
const DEVICE_HOST = "192.168.1.8";

// Port the backend listens on. Moved off 8000 on 2026-08-30: a phantom socket
// there kept winning connections ahead of every freshly started server, so the
// app talked to stale code no matter how often the backend was restarted. Both
// this and DEVICE_HOST are rewritten by start_mob.ps1 on each run.
const DEVICE_PORT = 8001;

// A helper to build a full URL joined to the API base.
export const BASE_URL = `http://${DEVICE_HOST}:${DEVICE_PORT}`;

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























