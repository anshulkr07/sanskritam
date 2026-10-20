// Auth context — holds the Bearer token + learner profile, persisted to
// AsyncStorage so a session survives an app restart.

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { api, ApiError, setAuthToken, type DevLoginResponse, type LearnerProfile } from "../api/client";
import { DEFAULT_LEARNER_NAME } from "../config";
import { invalidateCache } from "../services/apiCache";
import { registerPushToken } from "../services/push";
import { setOfflineAudioOwner } from "../services/protectedAudio";
import { setProgressOwner } from "../services/progressStorage";

const TOKEN_KEY = "shabd.token";
const NAME_KEY = "shabd.displayName";
const INSTALL_ID_KEY = "shabd.installId";
const ONBOARDED_KEY = "shabd.onboarded";
const BRIDGE_KEY = "shabd.bridgeLangs";
const PROFILE_KEY = "shabd.cachedProfile";

/**
 * U10-1: the dev-login auto-login path must be UNREACHABLE in a release
 * build. A named auto-login that silently works is how ten testers end up
 * sharing one learner row and one mastery map. __DEV__ is true only in dev
 * builds; in a release bundle this flag is constant-false and the fallback
 * below never fires.
 */
const DEV_LOGIN_ALLOWED = __DEV__;

/** Generate a UUIDv4 — used for install ID. */
function uuidv4(): string {
  // @ts-ignore: crypto is available in React Native
  const crypto = globalThis.crypto;
  if (crypto?.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Get or create the device install ID. */
async function getInstallId(): Promise<string> {
  let id = await AsyncStorage.getItem(INSTALL_ID_KEY);
  if (!id) {
    id = uuidv4();
    await AsyncStorage.setItem(INSTALL_ID_KEY, id);
  }
  return id;
}

interface AuthState {
  token: string | null;
  learner: LearnerProfile | null;
  loading: boolean;
  onboarded: boolean;
  displayName: string;
  login: (displayName: string) => Promise<LearnerProfile>;
  googleLogin: (idToken: string) => Promise<LearnerProfile>;
  appleLogin: (idToken: string, displayName?: string) => Promise<LearnerProfile>;
  guestLogin: () => Promise<LearnerProfile>;
  finishOnboarding: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refresh: () => Promise<LearnerProfile | null>;
  updateName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [learner, setLearner] = useState<LearnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState(false);
  const [displayName, setDisplayName] = useState("");

  /** Persist the install ID + resolve the server response into local state. */
  const applySession = useCallback(async (res: DevLoginResponse): Promise<LearnerProfile> => {
    setAuthToken(res.token);
    setToken(res.token);
    const profile: LearnerProfile = {
      ...res.learner,
      id: res.learner.id,
      display_name: res.learner.display_name,
      bridge_langs: res.learner.bridge_langs,
      sanskrit_ratio: res.learner.sanskrit_ratio,
      sanskrit_ratio_setting:
        res.learner.sanskrit_ratio_setting ?? res.learner.sanskrit_ratio,
      script_ratio: res.learner.script_ratio,
      feature_mastery: res.learner.feature_mastery ?? {},
      streak: res.learner.streak ?? 0,
      voice_minutes_used: res.learner.voice_minutes_used ?? 0,
    };
    setOfflineAudioOwner(profile.id); setProgressOwner(profile.id);
    setLearner(profile);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    await AsyncStorage.setItem(TOKEN_KEY, res.token);
    // P13: best-effort push registration — never blocks the session. No-ops
    // until expo-notifications is installed (P13 sits behind P8).
    registerPushToken().catch(() => {});
    return profile;
  }, []);

  const login = useCallback(
    async (name: string): Promise<LearnerProfile> => {
      await AsyncStorage.setItem(NAME_KEY, name);
      setDisplayName(name);
      const installId = await getInstallId();
      const res = await api.anonLogin(installId, ["en", "hi"]);
      return applySession(res);
    },
    [applySession],
  );

  // A guest is an anonymous local install — one tap, no account, no typing.
  // Mirrors U10-1: anonymous first; an account is offered later, never gated.
  const guestLogin = useCallback(async (): Promise<LearnerProfile> => {
    const installId = await getInstallId();
    const res = await api.anonLogin(installId, ["en", "hi"]);
    setDisplayName(res.learner.display_name);
    await AsyncStorage.setItem(NAME_KEY, res.learner.display_name);
    return applySession(res);
  }, [applySession]);

  const googleLogin = useCallback(
    async (idToken: string): Promise<LearnerProfile> => {
      const res = await api.googleLogin(idToken, ["en", "hi"], undefined);
      setDisplayName(res.learner.display_name);
      await AsyncStorage.setItem(NAME_KEY, res.learner.display_name);
      return applySession(res);
    },
    [applySession],
  );

  // Sign in with Apple — same shape as Google. displayName is forwarded only
  // when Apple supplies it (first authorization); the backend falls back to
  // the relay-email local part, then a label.
  const appleLogin = useCallback(
    async (idToken: string, name?: string): Promise<LearnerProfile> => {
      const res = await api.appleLogin(idToken, name, ["en", "hi"], undefined);
      setDisplayName(res.learner.display_name);
      await AsyncStorage.setItem(NAME_KEY, res.learner.display_name);
      return applySession(res);
    },
    [applySession],
  );

  const finishOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDED_KEY, "true");
    setOnboarded(true);
  }, []);

  const mergeMe = useCallback((me: { learner: LearnerProfile; model: { sanskrit_ratio_setting?: number } }) => {
    // /me splits profile + adaptive model; the ceiling lives in model on
    // older backends, in learner on newer ones — prefer whichever is set.
    const setting =
      me.learner.sanskrit_ratio_setting ?? me.model?.sanskrit_ratio_setting ?? me.learner.sanskrit_ratio;
    const merged: LearnerProfile = { ...me.learner, sanskrit_ratio_setting: setting };
    setOfflineAudioOwner(merged.id); setProgressOwner(merged.id);
    setLearner(merged);
    void AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(merged));
    return merged;
  }, []);

  // Restore session on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    (async () => {
      try {
        const tok = await AsyncStorage.getItem(TOKEN_KEY);
        if (tok) {
          setAuthToken(tok);
          setToken(tok);
          const saved = await AsyncStorage.getItem(PROFILE_KEY);
          if (saved) {
            try {
              const profile = JSON.parse(saved) as LearnerProfile;
              if (typeof profile.id === "string") { setOfflineAudioOwner(profile.id); setProgressOwner(profile.id); setLearner(profile); }
            } catch { /* ignore an invalid cached profile */ }
          }
          try {
            const me = await api.me();
            mergeMe(me);
          } catch (e) {
            if (e instanceof ApiError && e.status === 401) {
              // The stored token is definitively dead (rotated secret, reset
              // DB, ancient install — seen 2026-09-15). Wipe the session AND
              // the onboarding flag so RootNavigator routes back to Login;
              // otherwise the user is stranded in MainTabs where every
              // screen 401s and reports "check your connection". Any other
              // failure (offline, 5xx) keeps local state so a retry works.
              await AsyncStorage.multiRemove([TOKEN_KEY, ONBOARDED_KEY, PROFILE_KEY]);
              setOfflineAudioOwner(null); setProgressOwner(null); setLearner(null);
              setAuthToken(null);
              setToken(null);
              setOnboarded(false);
            } // Network failures preserve the authenticated offline session.
          }
        }
        // Check onboarding status
        const onboardedVal = await AsyncStorage.getItem(ONBOARDED_KEY);
        if (onboardedVal === "true") {
          setOnboarded(true);
        }

        // No usable token → dev auto-login ONLY in dev builds (U10-1). A
        // release build must reach the Login screen like any stranger.
        const currentTok = await AsyncStorage.getItem(TOKEN_KEY);
        if (!currentTok && DEV_LOGIN_ALLOWED) {
          await login(DEFAULT_LEARNER_NAME);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, ONBOARDED_KEY, PROFILE_KEY]);
    setOfflineAudioOwner(null); setProgressOwner(null);
    invalidateCache();
    setAuthToken(null);
    setToken(null);
    setLearner(null);
    setOnboarded(false);
  }, []);

  // Google Play requires in-app deletion. The server removes the account and
  // all its learning data; then this device forgets everything it held (token,
  // install id, cached responses, preferences), so the next start is a new,
  // unlinked learner. If the server call fails, nothing local is touched.
  const deleteAccount = useCallback(async () => {
    await api.deleteMe();
    setOfflineAudioOwner(null); setProgressOwner(null);
    invalidateCache();
    await AsyncStorage.clear();
    setAuthToken(null);
    setToken(null);
    setLearner(null);
    setDisplayName("");
    setOnboarded(false);
  }, []);

  const refresh = useCallback(async (): Promise<LearnerProfile | null> => {
    if (!token) return null;
    try {
      const me = await api.me();
      return mergeMe(me);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        // Dead token discovered after mount (Home/Progress refresh): same
        // full wipe as the restore path so the app falls back to Login.
        await AsyncStorage.multiRemove([TOKEN_KEY, ONBOARDED_KEY]);
        setAuthToken(null);
        setToken(null);
        setOnboarded(false);
      }
      return null;
    }
  }, [token, mergeMe]);

  const updateName = useCallback(async (name: string) => {
    await AsyncStorage.setItem(NAME_KEY, name);
    setDisplayName(name);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      token,
      learner,
      loading,
      onboarded,
      displayName,
      login,
      googleLogin,
      appleLogin,
      guestLogin,
      finishOnboarding,
      logout,
      deleteAccount,
      refresh,
      updateName,
    }),
    [
      token,
      learner,
      loading,
      onboarded,
      displayName,
      login,
      googleLogin,
      appleLogin,
      guestLogin,
      finishOnboarding,
      logout,
      deleteAccount,
      refresh,
      updateName,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
