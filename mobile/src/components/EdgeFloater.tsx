import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color } from "../theme";

type Spot = { side: "left" | "right"; top: number; hidden: boolean };
const spots = new Map<string, Spot>();
const subscribers = new Map<string, Set<(spot: Spot) => void>>();
const TAB = 28;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Both overlays share the same drag, tuck, restore and saved-position behavior. */
export default function EdgeFloater({ storageKey, label, width: wantedWidth, height: panelHeight, initialTop, children }: {
  storageKey: string; label: string; width: number; height: number; initialTop: number; children: React.ReactNode;
}) {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const width = Math.min(wantedWidth, window.width - 28);
  const minY = insets.top + 32;
  const maxY = Math.max(minY, window.height - insets.bottom - panelHeight - 78);
  const [spot, setSpot] = useState<Spot>({ side: "right", top: initialTop, hidden: false });
  const [ready, setReady] = useState(false);
  const position = useRef(new Animated.ValueXY()).current;
  const current = useRef(spot);
  current.current = spot;
  const origin = useRef({ x: 0, y: 0 });
  const xFor = (s: Spot) => s.side === "left" ? (s.hidden ? 0 : 14) : window.width - (s.hidden ? TAB : width + 14);

  useEffect(() => {
    let alive = true;
    const listeners = subscribers.get(storageKey) ?? new Set<(spot: Spot) => void>();
    subscribers.set(storageKey, listeners);
    listeners.add(setSpot);
    void AsyncStorage.getItem(storageKey).then(raw => {
      if (!alive) return;
      if (spots.has(storageKey)) { setSpot(spots.get(storageKey)!); return; }
      if (!raw) return;
      const saved = JSON.parse(raw);
      if ((saved.side === "left" || saved.side === "right") && Number.isFinite(saved.top)) {
        const spot: Spot = { side: saved.side, top: saved.top, hidden: saved.hidden === true };
        spots.set(storageKey, spot);
        listeners.forEach(listener => listener(spot));
      }
    }).catch(() => {}).finally(() => { if (alive) setReady(true); });
    return () => { alive = false; listeners.delete(setSpot); };
  }, [storageKey]);

  useEffect(() => {
    position.setValue({ x: xFor(spot), y: clamp(spot.top, minY, maxY) });
  }, [spot, window.width, minY, maxY, width, position]);

  const save = (next: Spot) => {
    current.current = next;
    spots.set(storageKey, next);
    subscribers.get(storageKey)?.forEach(listener => listener(next));
    void AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() => {});
  };
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 || Math.abs(g.dy) > 8,
    onPanResponderGrant: () => {
      const s = current.current;
      origin.current = { x: xFor(s), y: clamp(s.top, minY, maxY) };
    },
    onPanResponderMove: (_, g) => {
      position.setValue({ x: origin.current.x + g.dx, y: clamp(origin.current.y + g.dy, minY, maxY) });
    },
    onPanResponderRelease: (_, g) => {
      const s = current.current;
      const x = origin.current.x + g.dx;
      const panelWidth = s.hidden ? TAB : width;
      const side = x + panelWidth / 2 < window.width / 2 ? "left" : "right";
      const hidden = s.hidden || x < -16 || x + panelWidth > window.width + 16;
      save({ side, hidden, top: clamp(origin.current.y + g.dy, minY, maxY) });
    },
    onPanResponderTerminate: () => position.setValue({ x: xFor(current.current), y: clamp(current.current.top, minY, maxY) }),
  }), [width, window.width, minY, maxY, storageKey]);

  if (!ready) return null;
  return <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
    <Animated.View {...pan.panHandlers} style={[styles.floater, position.getLayout(), { width: spot.hidden ? TAB : width, opacity: spot.hidden ? 0.25 : 1 }]}>
      {spot.hidden ? <Pressable hitSlop={8} style={[styles.tab, { borderTopLeftRadius: spot.side === "left" ? 0 : 14, borderBottomLeftRadius: spot.side === "left" ? 0 : 14 }]}
        accessibilityRole="button" accessibilityLabel={`Restore ${label}`} accessibilityHint="Tap to bring the floating control back. Drag to move."
        onPress={() => save({ ...spot, hidden: false })}>
        <Ionicons name={spot.side === "left" ? "chevron-forward" : "chevron-back"} size={22} color={color.white} />
      </Pressable> : <View>
        <Pressable style={styles.tuck} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Tuck ${label} to screen edge`}
          onPress={() => save({ ...spot, hidden: true })}>
          <Ionicons name={spot.side === "left" ? "chevron-back" : "chevron-forward"} size={18} color={color.white} />
        </Pressable>
        {children}
      </View>}
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  floater: { position: "absolute", zIndex: 110 },
  tab: { width: TAB, minHeight: 52, borderTopRightRadius: 14, borderBottomRightRadius: 14, backgroundColor: color.saffronBtn, alignItems: "center", justifyContent: "center" },
  tuck: { alignSelf: "flex-end", width: 28, height: 24, borderTopLeftRadius: 10, borderTopRightRadius: 10, backgroundColor: color.ink, alignItems: "center", justifyContent: "center" },
});
