import React, { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { matchApi, type GameSessionView, type MatchSnapshot } from "./client";
import { PlaySessionContext, type PlaySessionController } from "./useSession";
import Smriti from "../../screens/Smriti";
import ShabdaRush from "../../screens/ShabdaRush";
import VarnaJaal from "../../screens/VarnaJaal";
import WordGroups from "../../screens/WordGroups";
import PadaPath from "../../screens/PadaPath";
import NumberBuilder from "../../screens/NumberBuilder";
import { color, font, space } from "../../theme";

const screens: Record<string, React.ComponentType<{
  navigation: { goBack: () => void; navigate: (route: string, params?: object) => void };
}>> = {
  smriti: Smriti, rush: ShabdaRush, "varna-jaal": VarnaJaal,
  "word-groups": WordGroups, "pada-path": PadaPath, number: NumberBuilder,
};

// Keep each game's existing board and controls, but use the authoritative
// match pack and live actions instead of issuing an independent solo round.
export default function LiveMatchGame({ snapshot, onLeave, onChanged, connected }: {
  snapshot: MatchSnapshot;
  onLeave: () => void;
  onChanged: () => void;
  connected: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const retryMove = useRef<{ key: string; idem: string } | null>(null);
  const session = useMemo<GameSessionView>(() => ({
    id: snapshot.match_id, game: snapshot.game, mode: "live", ruleset: "casual",
    answer_lang: snapshot.answer_lang, status: "active", deadline: snapshot.deadline,
    pack: snapshot.pack, resume_state: snapshot.own_state,
    ranked_spec: null, result: null, score: null,
  }), [snapshot]);

  const answer = useCallback(async (action: Record<string, unknown>) => {
    if (pending.current || !connected) {
      if (!connected) setError("Reconnecting… wait before making your next move.");
      return null;
    }
    pending.current = true;
    setBusy(true); setError(null);
    try {
      const key = JSON.stringify(action);
      const idem = retryMove.current?.key === key ? retryMove.current.idem
        : `live-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      retryMove.current = { key, idem };
      const result = await matchApi.action(snapshot.match_id, action, idem);
      retryMove.current = null;
      onChanged();
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't submit your move. Try again.");
      return null;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }, [connected, snapshot.match_id, onChanged]);

  const controller: PlaySessionController = {
    session, result: null, busy: busy || !connected, error,
    answer, start: async () => null, finish: async () => { onChanged(); return null; },
    abandon: async () => {}, hint: async () => null, reset: () => {}, setBusy, setError,
  };
  const Screen = screens[snapshot.game];
  const navigation = useMemo(() => ({ goBack: onLeave, navigate: onLeave }), [onLeave]);
  if (!Screen) return <Text accessibilityRole="alert">This game cannot be played online.</Text>;

  return (
    <PlaySessionContext.Provider value={controller}>
      <View style={styles.game}>
        {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
        <Screen navigation={navigation} />
      </View>
    </PlaySessionContext.Provider>
  );
}

const styles = StyleSheet.create({
  game: { flex: 1 },
  error: { color: color.badText, padding: space.sm, fontSize: font.sizes.sm, textAlign: "center" },
});
