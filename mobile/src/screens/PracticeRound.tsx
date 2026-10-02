// PracticeRound: one screen for engine-backed drills. Eight items per round.

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { RootStackParamList } from "../navigation/types";
import { api } from "../api/client";
import GameShell from "../games/GameShell";
import ResultSheet from "../games/ResultSheet";
import { gamesPools, gamesResult } from "../games/api";
import StepRenderer from "../components/steps/StepRenderer";
import { haptics } from "../services/haptics";
import { color, font, space } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "PracticeRound">;

export default function PracticeRoundScreen({ navigation, route }: Props) {
  const { kind, title, daily } = route.params;
  const [params, setParams] = useState<Record<string, unknown>[]>([]);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [at, setAt] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState<{ xp: number; best: number; isBest: boolean } | null>(null);
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    void gamesPools(kind).then(async (d) => {
      const list = ((d.params ?? []) as Record<string, unknown>[]).slice(0, 8);
      const full = list.length >= 8 ? list : [...list, ...list, ...list].slice(0, 8);
      setParams(full);
      // Pre-generate renderable items.
      const rendered: Record<string, unknown>[] = [];
      for (let i = 0; i < full.length; i++) {
        try {
          const it = await api.generateExercise(kind, full[i], 1000 + i);
          rendered.push(it);
        } catch {
          rendered.push({ abstained: true });
        }
      }
      setItems(rendered);
    }).catch(() => setParams([]));
  }, [kind]);

  const submit = async (answer: Record<string, unknown>) => {
    const p = params[at];
    if (!p || disabled) return;
    setDisabled(true);
    try {
      const r = await api.gradeExercise(kind, p, 1000 + at, answer);
      if (r.abstained) {
        // Skipped and replaced: never counted.
        advance(score);
        return;
      }
      const pts = r.verdict === "correct" ? 10 : r.verdict === "off_by_one" ? 5 : 0;
      const ns = score + pts;
      setScore(ns);
      haptics.tap();
      advance(ns);
    } catch {
      advance(score);
    }
  };

  const advance = async (ns: number) => {
    if (at + 1 >= 8) {
      await finish(ns);
    } else {
      setAt((a) => a + 1);
      setDisabled(false);
    }
  };

  const finish = async (finalScore: number) => {
    try {
      const r = await gamesResult({ game: kind, mode: "round", score: finalScore, daily: !!daily });
      setDone({ xp: r.xp, best: r.best, isBest: r.is_best });
    } catch {
      setDone({ xp: 0, best: finalScore, isBest: false });
    }
  };

  if (done) {
    return (
      <View style={styles.start}>
        <ResultSheet score={score} best={done.best} isBest={done.isBest} xp={done.xp} onAgain={() => { setScore(0); setAt(0); setDone(null); setDisabled(false); }} onDone={() => navigation.goBack()} />
      </View>
    );
  }

  const payload = items[at];
  const step = payload ? { rank: at, kind, payload, abstained: !!payload.abstained } : null;

  return (
    <GameShell title={title} progress={at / 8} progressLabel={`${at + 1} of 8`} score={score} onClose={() => navigation.goBack()}>
      {step && !step.abstained ? (
        <StepRenderer step={step} disabled={disabled} onSubmit={(a) => void submit(a)} />
      ) : (
        <Text style={styles.loading}>Loading…</Text>
      )}
    </GameShell>
  );
}

const styles = StyleSheet.create({
  start: { flex: 1, backgroundColor: color.bg, alignItems: "center", justifyContent: "center", padding: 24 },
  loading: { fontSize: 14, color: color.inkSoft, textAlign: "center" },
});
