// AppDrawer — the left drawer (U8-1). Wraps the six-tab bar: Drawer > Tabs.
// The hamburger lives in the header on Home only; a swipe from the left edge
// opens the drawer anywhere (verify it does not fight WordBank's drag — if it
// does, restrict swipeEnabled to Home rather than disabling drag).
// The drawer's content is the Settings panel — chrome, not celebration.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import { createDrawerNavigator } from "@react-navigation/drawer";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import MainTabs from "./MainTabs";
import SettingsPanel from "../screens/Settings";
import { color } from "../theme";

export type DrawerParamList = {
  Tabs: undefined;
};

const Drawer = createDrawerNavigator<DrawerParamList>();

export default function AppDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={() => <SettingsPanel />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: color.bg,
          width: 300,
        },
        overlayColor: "rgba(0,0,0,0.3)",
        sceneStyle: { backgroundColor: color.bg },
      }}
    >
      <Drawer.Screen name="Tabs" component={MainTabs} />
    </Drawer.Navigator>
  );
}

// A hamburger button for the Home header (opens the drawer). Kept here so Home
// only renders it; the swipe gesture opens it from anywhere.
export function DrawerToggle({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Open settings menu"
      style={styles.toggle}
    >
      <Ionicons name="menu" size={26} color={color.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggle: { padding: 4 },
});
