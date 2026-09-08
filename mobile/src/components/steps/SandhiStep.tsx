// SandhiStep — sandhi as f(a,b)→c, run forwards AND backwards (U15-2, U15-6).
//
// Reuses SandhiVisual's function-machine display; the question is multiple
// choice from the engine's own candidates (top + phonetic distractors for a
// split; true join vs raw concat vs reversed halves for a join). Seeing the
// raw concatenation beside the true join IS the lesson: sandhi does something.

import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "../ui";
import { haptics } from "../../services/haptics";
import { color, font, radius, script, space } from "../../theme";
import { field, type StepInputProps } from "./types";

interface SplitOption {
  first: string;
  second: string;
}

export default function SandhiStep({ step, disabled, onSubmit }: StepInputProps) {
  const payload = step.payload;
  const joined = field<string>(payload, "joined", "");
  const first = field<string>(payload, "first", "");
  const second = field<string>(payload, "second", "");
  const splitOptions = field<SplitOption[]>(payload, "options", []).filter(
    (o): o is SplitOption => typeof o === "object" && o !== null && "first" in o,
  );
  const joinOptions = field<string[]>(payload, "options", []).filter(
    (o): o is string => typeof o === "string",
  );
  const isSplit = splitOptions.length > 0;
  const [pick, setPick] = useState<string | null>(null);

  const submit = () => {
    if (!pick || disabled) return;
    haptics.press();
    if (isSplit) {
      const opt = splitOptions.find((o) => `${o.first}+${o.second}` === pick);
      onSubmit({ first: opt?.first ?? "", second: opt?.second ?? "" });
    } else {
      onSubmit({ joined: pick });
    }
  };

  return (
    <View>
      {isSplit ? (
        <Text style={styles.prompt}>
          Split <Text style={[styles.word, script("bold")]}>{joined}</Text> — which two
          words met here?
        </Text>
      ) : (
        <Text style={styles.prompt}>
          Join{" "}
          <Text style={[styles.word, script("bold")]}>
            {first} + {second}
          </Text>{" "}
          — what does the meeting make?
        </Text>
      )}
      {/* The function machine as a tree: two leaves, one root. f(a,b)→c
          drawn, not just described (U15-6: compounds-as-trees will reuse
          this shape once the analyzer can derive them). */}
      <View style={styles.tree} accessible accessibilityLabel={isSplit ? `Tree: ${joined} splits into two words` : `Tree: ${first} and ${second} join into one form`}>
        <View style={styles.leaves}>
          <Text style={[styles.leaf, script("bold")]}>{isSplit ? "a" : first}</Text>
          <Text style={[styles.leaf, script("bold")]}>{isSplit ? "b" : second}</Text>
        </View>
        <Text style={styles.arrow}>↓ f(a,b)→c</Text>
        <Text style={[styles.root, script("bold")]}>{isSplit ? joined : "?"}</Text>
      </View>
      <View style={styles.options}>
        {isSplit
          ? splitOptions.map((o) => {
              const key = `${o.first}+${o.second}`;
              const active = pick === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    if (disabled) return;
                    haptics.tap();
                    setPick(key);
                  }}
                  disabled={disabled}
                  style={[styles.opt, active && styles.optActive]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active, disabled }}
                  accessibilityLabel={`${o.first} plus ${o.second}`}
                >
                  <Text style={[styles.optText, script("semibold"), active && styles.optTextActive]}>
                    {o.first} + {o.second}
                  </Text>
                </Pressable>
              );
            })
          : joinOptions.map((o) => {
              const active = pick === o;
              return (
                <Pressable
                  key={o}
                  onPress={() => {
                    if (disabled) return;
                    haptics.tap();
                    setPick(o);
                  }}
                  disabled={disabled}
                  style={[styles.opt, active && styles.optActive]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active, disabled }}
                  accessibilityLabel={`Join candidate ${o}`}
                >
                  <Text style={[styles.optText, script("semibold"), active && styles.optTextActive]}>
                    {o}
                  </Text>
                </Pressable>
              );
            })}
      </View>
      <Button
        label="Check"
        onPress={submit}
        disabled={!pick || disabled}
        block
        style={{ marginTop: space.md }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  prompt: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.base,
    color: color.ink,
    marginBottom: space.md,
    lineHeight: 24,
  },
  word: { fontSize: font.sizes.lg, color: color.ink },
  tree: { alignItems: "center", marginBottom: space.md },
  leaves: { flexDirection: "row", gap: space.md },
  leaf: {
    fontSize: font.sizes.lg,
    color: color.ink,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    overflow: "hidden",
  },
  arrow: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.sm,
    color: color.saffronDeep,
    marginVertical: 4,
  },
  root: {
    fontSize: font.sizes.xl,
    color: color.saffronText,
    backgroundColor: color.saffronLight,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    overflow: "hidden",
  },
  options: { gap: space.sm },
  opt: {
    minHeight: 56,
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  optActive: { borderColor: color.saffron, backgroundColor: color.saffronLight },
  optText: { fontSize: font.sizes.lg, color: color.ink },
  optTextActive: { color: color.saffronDeep },
});
