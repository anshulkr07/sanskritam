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

import { DEFAULT_LEARNER_NAME } from "../config";
import { api, setAuthToken, type LearnerProfile } from "../api/client";

const TOKEN_KEY = "shabd.token";
const NAME_KEY = "shabd.displayName";
const INSTALL_ID_KEY = "shabd.installId";
const ONBOARDED_KEY = "shabd.onboarded";
const BRIDGE_KEY = "shabd.bridgeLangs";

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
  finishOnboarding: () => Promise<void>;
  logout: () => Promise<void>;
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

  const login = useCallback(async (name: string): Promise<LearnerProfile> => {
    await AsyncStorage.setItem(NAME_KEY, name);
    setDisplayName(name);
    const installId = await getInstallId();
    const res = await api.anonLogin(installId, ["en", "hi"]);
    setAuthToken(res.token);
    setToken(res.token);
    const profile: LearnerProfile = {
      id: res.learner.id,
      display_name: res.learner.display_name,
      bridge_langs: res.learner.bridge_langs,
      sanskrit_ratio: res.learner.sanskrit_ratio,
      script_ratio: res.learner.script_ratio,
      feature_mastery: res.learner.feature_mastery ?? {},
      streak: res.learner.streak ?? 0,
      voice_minutes_used: res.learner.voice_minutes_used ?? 0,
    };
    setLearner(profile);
    await AsyncStorage.setItem(TOKEN_KEY, res.token);
    return profile;
  }, []);

  const finishOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDED_KEY, "true");
    setOnboarded(true);
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
          try {
            const me = await api.me();
            setLearner(me.learner);
          } catch {
            await AsyncStorage.multiRemove([TOKEN_KEY]);
            setAuthToken(null);
            setToken(null);
          }
        }
        // Check onboarding status
        const onboardedVal = await AsyncStorage.getItem(ONBOARDED_KEY);
        if (onboardedVal === "true") {
          setOnboarded(true);
        }

        // No usable token → silently log in with device install ID.
        const currentTok = await AsyncStorage.getItem(TOKEN_KEY);
        if (!currentTok) {
          await login(DEFAULT_LEARNER_NAME);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, ONBOARDED_KEY]);
    setAuthToken(null);
    setToken(null);
    setLearner(null);
    setOnboarded(false);
  }, []);

  const refresh = useCallback(async (): Promise<LearnerProfile | null> => {
    if (!token) return null;
    try {
      const me = await api.me();
      setLearner(me.learner);
      return me.learner;
    } catch {
      return null;
    }
  }, [token]);

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
      finishOnboarding,
      logout,
      refresh,
      updateName,
    }),
    [token, learner, loading, onboarded, displayName, login, finishOnboarding, logout, refresh, updateName],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}