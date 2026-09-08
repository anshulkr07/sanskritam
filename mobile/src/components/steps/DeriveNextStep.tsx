// DeriveNextStep — conjugation as turnable dials (U15-2, U15-6).
//
// Reuses DerivationPlayer + SutraCard: the derivation's own step list with
// step k hidden ("which sūtra fires here?"), sūtra options below. The hidden
// step shows "?" — never an invented change (U1-2's rule for unchanged runs
// applies here too: a step that leaves the form unchanged still shows its
// real result, only the CODE is hidden).

import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "../ui";
import SutraCard from "../derivation/SutraCard";
import { haptics } from "../../services/haptics";
import { color, font, radius, script, space } from "../../theme";
import { field, type StepInputProps } from "./types";

interface VisibleStep {
  code: string | null;
  sutra_text?: string;
  sutra_devanagari?: string;
  result?: string;
}

const DIAL_LABELS: Record<string, string> = {
  dhatu: "root",
  pratipadika: "stem",
  lakara: "tense",
  purusha: "person",
  vacana: "number",
  vibhakti: "case",
  linga: "gender",
};

export default function DeriveNextStep({ step, disabled, onSubmit }: StepInputProps) {
  const payload = step.payload;
  const result = field<string>(payload, "result", "");
  const visible = field<VisibleStep[]>(payload, "visible_steps", []);
  const options = field<string[]>(payload, "options", []);
  const dialParams = field<Record<string, string>>(payload, "derivation_params", {});
  const [pick, setPick] = useState<string | null>(null);

  const submit = () => {
    if (!pick || disabled) return;
    haptics.press();
    onSubmit({ code: pick });
  };

  return (
    <View>
      <Text style={styles.prompt}>
        One step is hidden. Which sūtra fires there to build{" "}
        <Text style={[styles.word, script("bold")]}>{result}</Text>?
      </Text>
      {/* U15-6: conjugation as five turnable dials — the inputs that produced
          this derivation, live from the engine (root · tense · person ·
          number · voice / stem · gender · case · number). */}
      {Object.keys(dialParams).length > 0 && (
        <View style={styles.dials} accessible accessibilityLabel={`Dials: ${Object.entries(dialParams).map(([k, v]) => `${DIAL_LABELS[k] ?? k} ${v}`).join(", ")}`}>
          {Object.entries(dialParams).map(([k, v]) => (
            <View key={k} style={styles.dial}>
              <Text style={styles.dialKey}>{DIAL_LABELS[k] ?? k}</Text>
              <Text style={[styles.dialVal, script("semibold")]}>{String(v)}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.steps} accessible accessibilityLabel={`Derivation with one hidden step, ${visible.length} steps`}>
        {visible.map((s, i) =>
          s.code ? (
            <SutraCard
              key={i}
              code={s.code}
              sutraDevanagari={s.sutra_devanagari ?? ""}
              index={i}
            />
          ) : (
            <View key={i} style={styles.hidden}>
              <Text style={styles.hiddenQ}>?</Text>
              <Text style={[styles.hiddenResult, script("semibold")]}>{s.result}</Text>
            </View>
          ),
        )}
      </View>
      <View style={styles.options}>
        {options.map((opt) => {
          const active = pick === opt;
          return (
            <Pressable
              key={opt}
              onPress={() => {
                if (disabled) return;
                haptics.tap();
                setPick(opt);
              }}
              disabled={disabled}
              style={[styles.opt, active && styles.optActive]}
              accessibilityRole="radio"
              accessibilityState={{ selected: active, disabled }}
              accessibilityLabel={`Sūtra option ${opt}`}
            >
              <Text style={[styles.optText, script("semibold"), active && styles.optTextActive]}>
                {opt}
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
  dials: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, marginBottom: space.md },
  dial: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    alignItems: "center",
  },
  dialKey: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.xs,
    color: color.inkFaint,
    textTransform: "uppercase",
  },
  dialVal: { fontSize: font.sizes.sm, color: color.ink },
  steps: { gap: space.xs, marginBottom: space.md },
  hidden: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: color.unsureBg,
    borderRadius: radius.md,
    padding: space.md,
    minHeight: 48,
  },
  hiddenQ: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.lg,
    color: color.unsureText,
  },
  hiddenResult: { fontSize: font.sizes.base, color: color.ink },
  options: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  opt: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  optActive: { borderColor: color.saffron, backgroundColor: color.saffronLight },
  optText: { fontSize: font.sizes.base, color: color.ink },
  optTextActive: { color: color.saffronDeep },
});
