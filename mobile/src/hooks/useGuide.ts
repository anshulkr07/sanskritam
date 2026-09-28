// Grammar guide hooks — the language toggle and on-device reading progress.
//
// useGuideLang: one persisted choice (prefs.guideLang) shared by every guide
// surface, so switching English ↔ हिन्दी anywhere switches it everywhere. Until
// the learner chooses, Hindi-only bridge languages start in Hindi.
//
// useGrammarProgress: read marks + last topic from services/grammarGuide,
// refreshed whenever any screen marks a topic.

import React from "react";

import type { GuideLang, Loc } from "../api/client";
import { getGuideLang, setGuideLang, subscribePrefs } from "../services/prefs";
import { loadGrammarProgress, subscribeGrammarProgress } from "../services/grammarGuide";
import { useAuth } from "../store/auth";

export function useGuideLang(): { lang: GuideLang; t: (loc?: Loc | null) => string; setLang: (l: GuideLang) => void } {
  const { learner } = useAuth();
  const [chosen, setChosen] = React.useState<GuideLang | null>(getGuideLang());

  React.useEffect(() => subscribePrefs(() => setChosen(getGuideLang())), []);

  const bridges = learner?.bridge_langs ?? [];
  const fallback: GuideLang = bridges.length > 0 && bridges.every((l) => l === "hi") ? "hi" : "en";
  const lang = chosen ?? fallback;
  const t = React.useCallback((loc?: Loc | null) => (loc ? loc[lang] || loc.en : ""), [lang]);
  return { lang, t, setLang: setGuideLang };
}

export function useGrammarProgress(): { read: Set<string>; last: string | null; ready: boolean } {
  const [state, setState] = React.useState<{ read: Set<string>; last: string | null; ready: boolean }>({
    read: new Set(),
    last: null,
    ready: false,
  });

  React.useEffect(() => {
    let alive = true;
    const refresh = () => {
      loadGrammarProgress().then((p) => {
        if (alive) setState({ ...p, ready: true });
      });
    };
    refresh();
    const unsubscribe = subscribeGrammarProgress(refresh);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  return state;
}
