// Shared UI primitives: warm paper, flat filled buttons with a soft lift,
// pill chips, and calm type. Light theme only.

import React from "react";
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

import { haptics } from "../services/haptics";
import { accent, color, font, radius, shadow, space } from "../theme";

// ─── Button ─────────────────────────────────────────────────────────────────

type Tone = "primary" | "ok" | "neutral" | "ghost" | "danger" | "tonal" | "dark";

interface ButtonProps extends Omit<PressableProps, "style"> {
  label: string;
  tone?: Tone;
  size?: "lg" | "md" | "sm";
  block?: boolean;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  labelStyle?: TextStyle;
  icon?: React.ReactNode;
}

const TONE_FILL: Record<Tone, string> = {
  primary: color.saffronBtn,
  ok: color.okText,
  neutral: color.surfaceMuted,
  ghost: "transparent",
  danger: color.badText,
  tonal: color.saffronLight,
  dark: color.ink,
};

const TONE_INK: Record<Tone, string> = {
  primary: color.white,
  ok: color.white,
  neutral: color.ink,
  ghost: color.saffronText,
  danger: color.white,
  tonal: accent.saffron.fg,
  dark: color.white,
};

// Only solid fills get a lift; tonal, neutral and ghost buttons sit flat.
const TONE_LIFT: Partial<Record<Tone, string>> = {
  primary: color.saffronDeep,
  ok: "#1E6B34",
  danger: "#A3231A",
  dark: color.ink,
};

const SIZE = {
  lg: { minHeight: 54, fontSize: font.sizes.base, borderRadius: radius.md },
  md: { minHeight: 46, fontSize: font.sizes.base, borderRadius: radius.md },
  sm: { minHeight: 36, fontSize: font.sizes.sm, borderRadius: radius.sm },
} as const;

export function Button({
  label,
  tone = "primary",
  size = "lg",
  block = false,
  loading = false,
  disabled = false,
  style,
  labelStyle,
  icon,
  onPress,
  ...rest
}: ButtonProps) {
  const ink = TONE_INK[tone];
  const lift = size === "sm" ? undefined : TONE_LIFT[tone];
  const s = SIZE[size];

  return (
    <View style={[style, block && styles.block]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={rest.accessibilityLabel ?? label}
        disabled={disabled || loading}
        onPress={(e) => {
          haptics.tap();
          onPress?.(e);
        }}
        {...rest}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: TONE_FILL[tone], borderRadius: s.borderRadius, minHeight: s.minHeight },
          lift ? { ...shadow.button, shadowColor: lift } : null,
          pressed && styles.buttonPressed,
          (disabled || loading) && { opacity: 0.5 },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={ink} />
        ) : (
          <View style={styles.buttonRow}>
            {icon}
            <Text style={[styles.buttonText, { color: ink, fontSize: s.fontSize }, labelStyle]}>{label}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

// ─── Card ──────────────────────────────────────────────────────────────────

export function Card({
  children,
  style,
  muted = false,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  muted?: boolean;
}) {
  return (
    <View style={[styles.card, { backgroundColor: muted ? color.surfaceMuted : color.surface }, style]}>
      {children}
    </View>
  );
}

// ─── ProgressBar ───────────────────────────────────────────────────────────

export function ProgressBar({
  progress,
  color: barColor = color.saffron,
  height = 16,
  style,
}: {
  progress: number; // 0..1
  color?: string;
  height?: number;
  style?: ViewStyle;
}) {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <View style={[styles.progressTrack, { height, borderRadius: height / 2 }, style]}>
      <View
        style={{
          width: `${pct}%`,
          height,
          borderRadius: height / 2,
          backgroundColor: barColor,
        }}
      />
    </View>
  );
}

// ─── Chip ──────────────────────────────────────────────────────────────────

export function Chip({
  label,
  selected = false,
  onPress,
  tone = "neutral",
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: "neutral" | "ok" | "bad" | "warn" | "unsure";
}) {
  const bg =
    tone === "ok"
      ? color.okBg
      : tone === "bad"
        ? color.badBg
        : tone === "warn"
          ? color.warnBg
          : tone === "unsure"
            ? color.unsureBg
            : color.surfaceMuted;
  const fg =
    tone === "ok"
      ? color.ok
      : tone === "bad"
        ? color.bad
        : tone === "warn"
          ? color.warn
          : tone === "unsure"
            ? color.unsure
            : color.inkSoft;
  return (
    <Pressable onPress={onPress} style={[styles.chip, { backgroundColor: selected ? fg : bg }]} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }}>
      <Text style={[styles.chipText, { color: selected ? color.white : fg }]}>{label}</Text>
    </Pressable>
  );
}

// ─── SectionLabel ──────────────────────────────────────────────────────────

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

// ─── EmptyState ────────────────────────────────────────────────────────────

interface EmptyStateProps {
  title: string;
  hint?: string;
  illustration?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({ title, hint, illustration, action }: EmptyStateProps) {
  return (
    <View style={styles.empty}>
      {illustration && <View style={styles.emptyIllus}>{illustration}</View>}
      <Text style={styles.emptyTitle}>{title}</Text>
      {!!hint && <Text style={styles.emptyHint}>{hint}</Text>}
      {action && <View style={{ marginTop: space.md }}>{action}</View>}
    </View>
  );
}

// ─── Verdana script fallback for Devanagari ───────────────────────────────

export const devanagariFont = { fontWeight: font.weights.semibold as TextStyle["fontWeight"] };

// ─── styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  block: { alignSelf: "stretch" },
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
    paddingHorizontal: space.lg,
  },
  buttonPressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  buttonRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  buttonText: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    textAlign: "center",
  },
  card: {
    borderRadius: radius.lg,
    padding: space.md,
    ...shadow.card,
  },
  progressTrack: {
    backgroundColor: color.border,
    overflow: "hidden",
    width: "100%",
  },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    marginRight: space.xs,
    marginBottom: space.xs,
  },
  chipText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm },
  sectionLabel: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.lg,
    color: color.ink,
    marginBottom: space.xs,
  },
  empty: { alignItems: "center", paddingVertical: space.xxl },
  emptyIllus: { marginBottom: space.md },
  emptyTitle: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.md,
    color: color.inkSoft,
  },
  emptyHint: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.inkFaint,
    marginTop: space.xs,
    textAlign: "center",
  },
});

export default { Button, Card, Chip, ProgressBar, SectionLabel, EmptyState };