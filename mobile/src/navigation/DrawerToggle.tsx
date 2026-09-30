// The hamburger that opens the left drawer. Its own file so screens (Home,
// Progress, Settings) can import it without importing the drawer, which
// imports the tab bar, which imports Home.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React from "react";
import { Pressable, StyleSheet } from "react-native";

import { color } from "../theme";

export function DrawerToggle({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      style={styles.toggle}
    >
      <Ionicons name="menu" size={26} color={color.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggle: { padding: 4 },
});
