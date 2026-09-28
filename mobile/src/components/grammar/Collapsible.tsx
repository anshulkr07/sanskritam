// Collapsible — a header row that shows or hides its content (chapter cards,
// "Go deeper", proof panels). Layout animates with Reanimated; under Reduce
// Motion it snaps. Controlled (open + onToggle) or uncontrolled (initiallyOpen).

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";

import { useReducedMotion } from "../../hooks/useReducedMotion";
import { duration } from "../../motion";
import { haptics } from "../../services/haptics";
import { color, space } from "../../theme";

interface CollapsibleProps {
  header: React.ReactNode;
  children: React.ReactNode;
  accessibilityLabel: string;
  open?: boolean;
  initiallyOpen?: boolean;
  onToggle?: (open: boolean) => void;
  style?: StyleProp<ViewStyle>;
  headerStyle?: StyleProp<ViewStyle>;
}

export default function Collapsible({
  header,
  children,
  accessibilityLabel,
  open: openProp,
  initiallyOpen = false,
  onToggle,
  style,
  headerStyle,
}: CollapsibleProps) {
  const reduced = useReducedMotion();
  const [openState, setOpenState] = React.useState(initiallyOpen);
  const open = openProp ?? openState;

  const toggle = () => {
    haptics.tap();
    if (onToggle) onToggle(!open);
    if (openProp === undefined) setOpenState(!open);
  };

  return (
    <Animated.View style={style} layout={reduced ? undefined : LinearTransition.duration(duration.base)}>
      <Pressable
        onPress={toggle}
        style={[styles.header, headerStyle]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: open }}
      >
        <View style={styles.headerContent}>{header}</View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={color.saffron} />
      </Pressable>
      {open && (
        <Animated.View entering={reduced ? undefined : FadeIn.duration(duration.quick)}>{children}</Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 44 },
  headerContent: { flex: 1 },
});
