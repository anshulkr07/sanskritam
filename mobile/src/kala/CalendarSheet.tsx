import Modal from "../components/AudioModal";
// CalendarSheet — "Your calendar": which tradition's date the Home card
// shows, what it is written in, and the place it is worked out for. Opened
// from Kāla (screens/Kala.tsx).
//
// A bottom sheet over the screen, entering straight up with no bounce, like
// Ask (HANDOVER 4.1). It is a Modal because Home sits inside the tab bar and
// the sheet has to cover it. Rows are plain rows with hairlines, the script
// choice is a row of outlined buttons with the chosen one solid ink, and the
// only saffron is the Done button.
//
// Each tradition shows what it calls the month right now, in its own script,
// so the choice is recognised rather than read.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PlaceChooser from "../components/PlaceChooser";
import { Button } from "../components/ui";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { haptics } from "../services/haptics";
import { ensureScriptFont } from "../services/scriptFonts";
import { color, fill, font, onFill, outline, radius, script, space } from "../theme";
import { wallClockAt } from "./clock";
import { faceFor } from "./faces";
import { getKalaPrefs, setKalaPrefs, subscribeKalaPrefs, type KalaPrefs } from "./prefs";
import { WORDS } from "./sanskritNames";
import { monthPreviews, type TextScript } from "./today";
import { TRADITIONS, traditionById, type ScriptChoice, type TraditionId } from "./traditions";
import type { ResolvedPlace } from "./useToday";

interface Props {
  visible: boolean;
  place: ResolvedPlace;
  /** The learner chose a place: the card should read it again. */
  onPlaceChanged: () => void;
  onClose: () => void;
}

type Previews = Record<TraditionId, { text: string; script: TextScript }>;

export default function CalendarSheet({ visible, place, onPlaceChanged, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [prefs, setPrefs] = useState<KalaPrefs>(getKalaPrefs);
  const [page, setPage] = useState<"main" | "place">("main");
  const [previews, setPreviews] = useState<Previews | null>(null);
  const [, setFontTick] = useState(0);

  useEffect(() => subscribeKalaPrefs(() => setPrefs(getKalaPrefs())), []);

  // On opening: the month each tradition is in, and the faces to write them.
  const tz = place.place.tz;
  useEffect(() => {
    if (!visible) {
      setPage("main");
      return;
    }
    let alive = true;
    const timer = setTimeout(() => {
      try {
        const at = new Date();
        if (alive) setPreviews(monthPreviews(at, wallClockAt(at, tz)));
      } catch {
        /* the rows still read without their previews */
      }
    }, 0);
    for (const t of TRADITIONS) {
      if (t.regional) {
        void ensureScriptFont(t.regional).then(() => {
          if (alive) setFontTick((n) => n + 1);
        });
      }
    }
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [visible, tz]);

  const tradition = traditionById(prefs.tradition);
  // "My script" only where the region has one of its own.
  const scriptChoices: { id: ScriptChoice; label: string; sanskrit?: boolean }[] = [
    { id: "devanagari", label: WORDS.devanagari.nom, sanskrit: true },
    { id: "roman", label: "Roman" },
    ...(tradition.regional ? [{ id: "regional" as const, label: "My script" }] : []),
  ];
  const activeScript: ScriptChoice = prefs.script === "regional" && !tradition.regional ? "devanagari" : prefs.script;

  const pickTradition = (id: TraditionId) => {
    haptics.tap();
    setKalaPrefs({ tradition: id });
  };
  const pickScript = (id: ScriptChoice) => {
    haptics.tap();
    setKalaPrefs({ script: id });
  };

  const back = () => {
    if (page === "place") setPage("main");
    else onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={back}>
      <View style={styles.root}>
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(140)}
          exiting={reduced ? undefined : FadeOut.duration(120)}
          style={StyleSheet.absoluteFill}
        >
          <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close your calendar" />
        </Animated.View>

        <Animated.View
          entering={reduced ? undefined : SlideInDown.duration(180).easing(Easing.out(Easing.cubic))}
          exiting={reduced ? undefined : SlideOutDown.duration(140)}
          style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}
        >
          <View style={styles.grabber} />

          {page === "place" ? (
            <>
              <View style={styles.head}>
                <Pressable onPress={back} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Back to your calendar">
                  <Ionicons name="chevron-back" size={24} color={color.ink} />
                </Pressable>
                <Text style={[styles.title, { flex: 1 }]} accessibilityRole="header">
                  Choose your place
                </Text>
              </View>
              <PlaceChooser
                onPick={() => {
                  onPlaceChanged();
                  setPage("main");
                }}
              />
            </>
          ) : (
            <>
              <View style={styles.head}>
                <Text style={[styles.title, { flex: 1 }]} accessibilityRole="header">
                  Your calendar
                </Text>
                <Pressable onPress={onClose} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Close">
                  <Ionicons name="close" size={22} color={color.inkSoft} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                <Text style={styles.label}>Tradition</Text>
                <View accessibilityRole="radiogroup">
                  {TRADITIONS.map((t) => {
                    const on = t.id === prefs.tradition;
                    const preview = previews?.[t.id];
                    return (
                      <Pressable
                        key={t.id}
                        onPress={() => pickTradition(t.id)}
                        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on, selected: on }}
                        accessibilityLabel={`${t.label}. ${t.note.replace(" · ", ", ")}`}
                      >
                        <View style={[styles.radio, on && styles.radioOn]}>{on && <View style={styles.radioDot} />}</View>
                        <View style={styles.rowText}>
                          <Text style={[styles.rowLabel, on && styles.rowLabelOn]}>{t.label}</Text>
                          <Text style={styles.rowNote}>{t.note}</Text>
                        </View>
                        {!!preview && (
                          <Text
                            style={[styles.preview, faceFor(preview.script), !on && styles.previewOff]}
                            accessible={false}
                            importantForAccessibility="no"
                          >
                            {preview.text}
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[styles.label, styles.labelGap]}>Show it in</Text>
                <View style={styles.choices}>
                  {scriptChoices.map((c) => {
                    const on = c.id === activeScript;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => pickScript(c.id)}
                        style={[styles.choice, on && styles.choiceOn]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        accessibilityLabel={c.sanskrit ? "Devanagari" : c.label}
                      >
                        <Text style={[c.sanskrit ? [script("semibold"), styles.choiceSa] : styles.choiceText, on && styles.choiceTextOn]}>
                          {c.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[styles.label, styles.labelGap]}>Place</Text>
                <View style={styles.placeRow}>
                  <Ionicons name="location-outline" size={22} color={color.ink} />
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabelOn}>{place.place.label}</Text>
                    <Text style={styles.rowNote}>{place.source === "chosen" ? "Chosen by you" : "From your time zone"}</Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      haptics.tap();
                      setPage("place");
                    }}
                    style={styles.change}
                    accessibilityRole="button"
                    accessibilityLabel="Change place"
                  >
                    <Text style={styles.changeText}>Change</Text>
                  </Pressable>
                </View>
              </ScrollView>

              <Button label="Done" block onPress={onClose} style={styles.done} />
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(59,46,37,0.45)" },
  sheet: {
    maxHeight: "92%",
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  grabber: { alignSelf: "center", width: 44, height: 5, borderRadius: radius.pill, backgroundColor: color.border },
  head: { flexDirection: "row", alignItems: "center", gap: space.xs, marginTop: space.xs, minHeight: 44 },
  title: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.lg, color: color.ink },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  label: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: color.inkSoft,
    marginTop: space.sm,
  },
  labelGap: { marginTop: space.md, marginBottom: space.xs },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: 57,
    paddingVertical: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  rowPressed: { opacity: 0.7 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: outline, alignItems: "center", justifyContent: "center" },
  radioOn: { backgroundColor: fill.ink, borderColor: fill.ink },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: onFill.text },
  rowText: { flex: 1, minWidth: 0 },
  rowLabel: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 15, color: color.ink },
  rowLabelOn: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 15, color: color.ink },
  rowNote: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: 12.5, color: color.inkSoft },
  preview: { fontSize: 18, lineHeight: 26, color: color.ink },
  previewOff: { color: color.inkSoft },
  choices: { flexDirection: "row", gap: space.xs },
  choice: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: color.ink,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xs,
  },
  choiceOn: { backgroundColor: fill.ink },
  choiceText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.ink },
  choiceSa: { fontSize: font.sizes.md, lineHeight: 26, color: color.ink },
  choiceTextOn: { color: onFill.text },
  placeRow: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 56 },
  change: { minHeight: 44, minWidth: 44, justifyContent: "center", paddingHorizontal: space.xxs },
  changeText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.saffronText },
  done: { marginTop: space.sm },
});
