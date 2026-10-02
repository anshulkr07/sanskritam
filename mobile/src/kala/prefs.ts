// The learner's calendar choices: which tradition's date to show and what
// to write it in. Kept on the phone, like every other preference
// (services/prefs.ts), with a subscription so the Home card follows the sheet.

import AsyncStorage from "@react-native-async-storage/async-storage";

import { DEFAULT_TRADITION, TRADITIONS, type ScriptChoice, type TraditionId } from "./traditions";

const STORE_KEY = "shabd.kala";

export interface KalaPrefs {
  tradition: TraditionId;
  script: ScriptChoice;
}

let current: KalaPrefs = { tradition: DEFAULT_TRADITION, script: "devanagari" };
let loading: Promise<KalaPrefs> | null = null;

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* a dead listener never breaks a choice */
    }
  }
}

export function subscribeKalaPrefs(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function getKalaPrefs(): KalaPrefs {
  return current;
}

/** Read the stored choices once. Safe to call from every mount. */
export function loadKalaPrefs(): Promise<KalaPrefs> {
  if (!loading) {
    loading = AsyncStorage.getItem(STORE_KEY)
      .then((raw) => {
        if (raw) {
          const p = JSON.parse(raw) as Partial<KalaPrefs>;
          const tradition = TRADITIONS.some((t) => t.id === p.tradition) ? (p.tradition as TraditionId) : current.tradition;
          const script: ScriptChoice =
            p.script === "roman" || p.script === "regional" || p.script === "devanagari" ? p.script : current.script;
          current = { tradition, script };
          notify();
        }
        return current;
      })
      .catch(() => current); // storage unavailable: the defaults stand
  }
  return loading;
}

export function setKalaPrefs(patch: Partial<KalaPrefs>): void {
  current = { ...current, ...patch };
  AsyncStorage.setItem(STORE_KEY, JSON.stringify(current)).catch(() => null);
  notify();
}
