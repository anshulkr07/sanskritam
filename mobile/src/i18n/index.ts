// Minimal festival language layer, designed for the whole app.
// Flat keys, params only, plural-safe by passing count as a param.
// Only festival screens and the Home strip use t() in this work.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

import { en, type ParvaKey } from "./strings.en";
import { hi } from "./strings.hi";

export type AppLang = "en" | "hi";

const STORE_KEY = "shabd.appLanguage";

const TABLES = { en, hi } as const;

let current: AppLang = "en";
const listeners = new Set<() => void>();

function notify(): void {
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* ignore */
    }
  }
}

export function getLang(): AppLang {
  return current;
}

export function loadLang(): Promise<AppLang> {
  return AsyncStorage.getItem(STORE_KEY)
    .then((v) => {
      if (v === "hi" || v === "en") {
        current = v;
        notify();
      }
      return current;
    })
    .catch(() => current);
}

export function setLang(v: AppLang): void {
  current = v;
  AsyncStorage.setItem(STORE_KEY, v).catch(() => null);
  notify();
}

export function subscribeLang(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Translate a key with {params}. Missing keys fall back to English. */
export function t(key: ParvaKey, params?: Record<string, string | number>): string {
  const table = TABLES[current] ?? en;
  let s: string = (table as Record<string, string>)[key] ?? en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replace(`{${k}}`, String(v));
    }
  }
  return s;
}

export function useLang(): AppLang {
  const [lang, setLangState] = useState<AppLang>(current);
  useEffect(() => subscribeLang(() => setLangState(current)), []);
  return lang;
}
