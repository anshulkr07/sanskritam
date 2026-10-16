import React, { useEffect, useState, useSyncExternalStore } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import MiniPlayer from "./chant/MiniPlayer";
import EdgeFloater from "./EdgeFloater";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { audioTransport } from "../services/audioTransport";
import { useListenBus } from "../services/listenBus";

// A screen with its own controls where the bar would sit (Group chat's
// composer) pins the bar just under its top chrome instead: `below` is where
// that chrome ends, from the top of the screen. The owner token keeps a
// screen that is leaving from unpinning the one that replaced it.
let pin: { owner: object; below: number } | null = null;
const pinListeners = new Set<() => void>();
const emitPin = () => pinListeners.forEach(listener => listener());
const subscribePin = (listener: () => void) => { pinListeners.add(listener); return () => { pinListeners.delete(listener); }; };
const pinnedBelow = () => pin?.below ?? null;

/** Pins the bar under the screen's top chrome while `below` is set; null releases it. */
export function usePinAudioBarBelow(below: number | null) {
  const [owner] = useState(() => ({}));
  useEffect(() => {
    if (below == null) return;
    pin = { owner, below };
    emitPin();
    return () => {
      if (pin?.owner !== owner) return;
      pin = null;
      emitPin();
    };
  }, [owner, below]);
}

export default function FloatingAudioBar({ inTabs = false, atTop = false }: { inTabs?: boolean; atTop?: boolean }) {
  const audio = useSyncExternalStore(audioTransport.subscribe, audioTransport.getSnapshot);
  const below = useSyncExternalStore(subscribePin, pinnedBelow);
  const bus = useListenBus();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  if (audio?.kind !== "audiobook") return null;
  // ✕ on the mini player hides the bar for this session; the floater around
  // it must leave with the bar, not stay behind as an empty tuck tab.
  if (!bus.session || bus.session.pages.length === 0 || bus.miniHiddenFor === bus.session.id) return null;
  const bottom = Math.max(insets.bottom, 8) + (inTabs ? 64 : 12);
  const initialTop = atTop ? insets.top + 52 : below != null ? below + 8 : height - bottom - 88;
  return <EdgeFloater storageKey="shabd.floater.audiobook" label="audiobook player" width={Math.min(420, width - 28)} height={88} initialTop={initialTop}>
    <MiniPlayer floating style={styles.player}
      onOpen={(bookKey, chapter, index) => navigation.navigate("Listen", { bookKey, chapter: chapter ?? undefined, index })} />
  </EdgeFloater>;
}
const styles = StyleSheet.create({
  player: { position: "relative", left: 0, right: 0, bottom: 0 },
});
