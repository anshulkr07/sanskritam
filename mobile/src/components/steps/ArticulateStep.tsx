// ArticulateStep — shape one sound, as ungraded practice (U15-2).
//
// Reuses VocalTract (the mid-sagittal cross-section driven by a constriction
// profile). The microphone stays off: the learner watches the gesture, says
// the sound aloud, and continues. Practice is never assessment — the backend
// no-ops articulate attempts, because hosted ASR cannot honestly grade an
// isolated akṣara (§6.2) and a false accusation costs trust (§6.3).
// Payload: { devanagari, iast?, place?, voicing?, kind?, prompt? }.
// Placeless sounds (anusvāra/visarga) render the character without a tract.

import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import VocalTract from "../VocalTract";
import { articulationFor } from "../../phonetics";
import { haptics } from "../../services/haptics";
import { Button } from "../ui";
import { color, font, radius, script, space } from "../../theme";
import { field, prose, type StepInputProps } from "./types";

export default function ArticulateStep({ step, disabled, onSubmit }: StepInputProps) {
  const payload = step.payload;
  const devanagari = field<string>(payload, "devanagari", "");
  const iast = field<string>(payload, "iast", "");
  const prompt = prose(payload, "prompt", "Shape this sound.");
  const [playToken, setPlayToken] = useState(0);

  const articulation = useMemo(
    () =>
      articulationFor({
        place: field<string | null>(payload, "place", null),
        voicing: field<string | null>(payload, "voicing", null),
        kind: field<string>(payload, "kind", "consonant"),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step],
  );

  const replay = () => {
    if (disabled) return;
    haptics.tap();
    setPlayToken((t) => t + 1);
  };

  const cont = () => {
    if (disabled) return;
    haptics.press();
    onSubmit({ practiced: true });
  };

  return (
    <View>
      <Text style={styles.prompt}>{prompt}</Text>
      <Text
        style={styles.practice}
        accessibilityRole="text"
        accessibilityLabel="Say it aloud. Not graded."
      >
        Say it aloud. Not graded.
      </Text>
      <View style={styles.stage}>
        <Text style={[styles.char, script("bold")]} accessibilityRole="text" accessibilityLabel={devanagari}>
          {devanagari}
        </Text>
        {!!iast && <Text style={styles.iast}>{iast}</Text>}
        {articulation ? (
          <VocalTract articulation={articulation} char={devanagari} iast={iast} playToken={playToken} />
        ) : (
          <Text style={styles.note}>No mouth map for this sound.</Text>
        )}
      </View>
      <View style={styles.row}>
        <Pressable
          onPress={replay}
          disabled={disabled || !articulation}
          style={[styles.replay, (disabled || !articulation) && styles.replayDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Replay the mouth gesture"
          accessibilityState={{ disabled: disabled || !articulation }}
        >
          <Text style={styles.replayText}>Replay gesture</Text>
        </Pressable>
      </View>
      <Button label="Continue" onPress={cont} disabled={disabled} block style={{ marginTop: space.md }} />
    </View>
  );
}

const styles = StyleSheet.create({
  prompt: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.base,
    color: color.ink,
    marginBottom: space.sm,
    lineHeight: 24,
  },
  practice: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginBottom: space.md,
  },
  stage: {
    alignItems: "center",
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  char: { fontSize: 64, color: color.ink, lineHeight: 76 },
  iast: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.base,
    color: color.inkSoft,
    marginTop: 4,
  },
  note: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginTop: space.md,
    textAlign: "center",
  },
  row: { flexDirection: "row", marginTop: space.md },
  replay: {
    flex: 1,
    alignItems: "center",
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: color.border,
    backgroundColor: color.surface,
    minHeight: 44,
    justifyContent: "center",
  },
  replayDisabled: { opacity: 0.5 },
  replayText: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.base,
    color: color.ink,
  },
});
