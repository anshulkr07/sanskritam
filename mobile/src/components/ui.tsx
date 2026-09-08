// Shared UI primitives — the "Sanskritam look": warm paper, chunky buttons with a
// solid bottom shadow, pill chips, and calm type. Light theme only.

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
import { color, font, radius, shadow, space } from "../theme";

// ─── HeavyButton (the signature Duolingo-shaped action) ─────────────────────

type Tone = "primary" | "ok" | "neutral" | "ghost" | "danger";

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
  primary: color.saffron,
  ok: color.ok,
  neutral: color.surfaceMuted,
  ghost: "transparent",
  danger: color.bad,
};

const TONE_SHADOW: Record<Tone, string> = {
  primary: color.saffronDeep,
  ok: "#1E7A39",
  neutral: "#E0CBA6",
  ghost: "transparent",
  danger: "#B02A20",
};

const TONE_INK: Record<Tone, string> = {
  primary: color.white,
  ok: color.white,
  neutral: color.ink,
  ghost: color.saffron,
  danger: color.white,
};

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
  const fill = TONE_FILL[tone];
  const shadowC = TONE_SHADOW[tone];
  const ink = TONE_INK[tone];
  const isGhost = tone === "ghost";
  const padV = size === "lg" ? 18 : size === "md" ? 13 : 8;
  const fontSize = size === "lg" ? font.sizes.md : size === "md" ? font.sizes.base : font.sizes.sm;
  const baseShadow = size === "sm" ? 0 : 3;

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
          {
            backgroundColor: isGhost ? "transparent" : fill,
            borderRadius: size === "sm" ? radius.sm : radius.md,
            paddingVertical: padV,
            shadowColor: isGhost ? "transparent" : shadowC,
            shadowOffset: { width: 0, height: baseShadow },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: isGhost ? 0 : size === "sm" ? 2 : size === "lg" ? 5 : 4,
          },
          pressed && (isGhost ? styles.ghostPressed : styles.buttonPressed),
          (disabled || loading) && { opacity: isGhost ? 0.4 : 0.6 },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={tone === "ghost" ? color.saffron : color.white} />
        ) : (
          <View style={styles.buttonRow}>
            {icon}
            <Text
              style={[
                styles.buttonText,
                { color: ink, fontSize },
                isGhost && { textTransform: "uppercase", letterSpacing: 0.8 },
                labelStyle,
              ]}
            >
              {label}
            </Text>
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
    minHeight: 40,
  },
  buttonPressed: { transform: [{ translateY: 1 }] },
  ghostPressed: { opacity: 0.7 },
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