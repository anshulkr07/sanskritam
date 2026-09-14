// AppDrawer — the left drawer (U8-1). Wraps the six-tab bar: Drawer > Tabs.
// The hamburger lives in the header on Home only; a swipe from the left edge
// opens the drawer anywhere (verify it does not fight WordBank's drag — if it
// does, restrict swipeEnabled to Home rather than disabling drag).
//
// The drawer holds the consulted-not-lived-in surfaces: Progress (streak,
// ratios, mastery — moved out of the tab bar so Read could take its slot)
// above the Settings panel. Chrome, not celebration.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import { DrawerActions } from "@react-navigation/native";
import {
  createDrawerNavigator,
  type DrawerContentComponentProps,
} from "@react-navigation/drawer";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import MainTabs from "./MainTabs";
import SettingsPanel from "../screens/Settings";
import ProgressScreen from "../screens/Progress";
import { haptics } from "../services/haptics";
import { color, font, radius, shadow, space } from "../theme";

export type DrawerParamList = {
  Tabs: undefined;
  Progress: undefined;
};

const Drawer = createDrawerNavigator<DrawerParamList>();

// The drawer's own content: a short menu (the app's rooms) with the Settings
// panel filling the rest. The menu is fixed; only Settings scrolls.
function DrawerMenu(props: DrawerContentComponentProps) {
  const { navigation, state } = props;
  const active = state.routeNames[state.index];

  const go = (name: keyof DrawerParamList) => {
    haptics.tap();
    navigation.navigate(name);
  };

  return (
    <View style={styles.menu}>
      <Text style={styles.menuTitle}>Sanskritam</Text>
      <MenuRow
        icon={active === "Tabs" ? "home" : "home-outline"}
        label="Learn"
        hint="Tabs"
        selected={active === "Tabs"}
        onPress={() => go("Tabs")}
      />
      <MenuRow
        icon={active === "Progress" ? "bar-chart" : "bar-chart-outline"}
        label="Progress"
        hint="Streak · mastery"
        selected={active === "Progress"}
        onPress={() => go("Progress")}
      />
      <View style={styles.divider} />
      <View style={styles.settingsWrap}>
        <SettingsPanel />
      </View>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  hint,
  selected,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, selected && styles.rowSelected]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
    >
      <View style={[styles.rowIcon, selected && styles.rowIconSelected]}>
        <Ionicons name={icon} size={20} color={selected ? color.white : color.saffron} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, selected && styles.rowLabelSelected]}>{label}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={color.inkFaint} />
    </Pressable>
  );
}

export default function AppDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerMenu {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: color.bg,
          width: 320,
        },
        overlayColor: "rgba(0,0,0,0.3)",
        sceneStyle: { backgroundColor: color.bg },
      }}
    >
      <Drawer.Screen name="Tabs" component={MainTabs} />
      {/* Progress left the tab bar for the drawer — it keeps its own screen
          with a header (title + hamburger) since no tab chrome surrounds it. */}
      <Drawer.Screen
        name="Progress"
        component={ProgressScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: "Progress",
          headerStyle: { backgroundColor: color.bg },
          headerTintColor: color.ink,
          headerTitleStyle: {
            fontFamily: "Nunito_800ExtraBold",
            fontWeight: "800",
          },
          // eslint-disable-next-line react/no-unstable-nested-components
          headerLeft: () => (
            <DrawerToggle
              onPress={() => {
                haptics.tap();
                navigation.dispatch(DrawerActions.openDrawer());
              }}
            />
          ),
          headerLeftContainerStyle: { paddingLeft: space.sm },
        })}
      />
    </Drawer.Navigator>
  );
}

// A hamburger button for headers (opens the drawer). Kept here so Home and
// Progress only render it; the swipe gesture opens it from anywhere.
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
  menu: { flex: 1, backgroundColor: color.bg, paddingTop: space.xl },
  menuTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.lg,
    color: color.ink,
    paddingHorizontal: space.lg,
    marginBottom: space.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    marginHorizontal: space.md,
    marginBottom: space.xs,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    ...shadow.card,
  },
  rowSelected: { backgroundColor: color.saffronLight },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.saffronLight,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconSelected: { backgroundColor: color.saffron },
  rowText: { flex: 1 },
  rowLabel: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.base,
    color: color.ink,
  },
  rowLabelSelected: { color: color.saffronDeep },
  rowHint: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.xs,
    color: color.inkSoft,
    marginTop: 1,
  },
  divider: { height: 1, backgroundColor: color.border, marginVertical: space.sm, marginHorizontal: space.lg },
  settingsWrap: { flex: 1 },
});
