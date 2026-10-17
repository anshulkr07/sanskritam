// AppDrawer — the left drawer (U8-1). Wraps the five-tab bar: Drawer > Tabs.
// A swipe from the left edge opens it anywhere; the hamburger sits in the
// header of Home and of every drawer screen (Progress, Settings, Licences,
// Privacy policy), so each place the menu leads to has the same way back.
//
// The drawer is a short menu, not a settings dump: who you are (name and day
// streak), where to go (Home, Progress, Settings, Licences, Privacy policy),
// and Sign out. Settings is its own screen. Chrome, not celebration.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import { DrawerActions } from "@react-navigation/native";
import {
  createDrawerNavigator,
  useDrawerStatus,
  type DrawerContentComponentProps,
  type DrawerNavigationOptions,
  type DrawerNavigationProp,
} from "@react-navigation/drawer";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import MainTabs from "./MainTabs";
import { DrawerToggle } from "./DrawerToggle";
import { useAsk } from "../ask/AskProvider";
import { useDayStats } from "../hooks/useDayStats";
import SettingsScreen from "../screens/Settings";
import ProgressScreen from "../screens/Progress";
import LicencesScreen from "../screens/Licences";
import PrivacyScreen from "../screens/Privacy";
import { haptics } from "../services/haptics";
import { useAuth } from "../store/auth";
import { accent, color, font, gradientOf, radius, space } from "../theme";
import { firstName } from "../utils/name";

export { DrawerToggle };

export type DrawerParamList = {
  Tabs: undefined;
  Progress: undefined;
  Settings: undefined;
  Licences: undefined;
  Privacy: undefined;
  Membership: undefined;
  CommunityEvents: undefined;
};

const Drawer = createDrawerNavigator<DrawerParamList>();

function DrawerMenu(props: DrawerContentComponentProps) {
  const { navigation, state } = props;
  const insets = useSafeAreaInsets();
  const { learner, logout } = useAuth();
  const status = useDrawerStatus();
  const { setHiddenBy } = useAsk();
  const { stats, refresh } = useDayStats();
  const active = state.routeNames[state.index];
  const name = firstName(learner?.display_name);

  // The Ask bubble would float over the drawer, so it steps aside while the
  // drawer is open; the streak is refreshed each time it opens.
  useEffect(() => {
    setHiddenBy("drawer", status === "open");
    if (status === "open") refresh();
    return () => setHiddenBy("drawer", false);
  }, [status, setHiddenBy, refresh]);

  const go = (target: keyof DrawerParamList) => {
    haptics.tap();
    navigation.navigate(target);
    navigation.closeDrawer();
  };

  return (
    <View style={[styles.menu, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.md }]}>
      <View style={styles.header}>
        <LinearGradient colors={gradientOf("saffron")} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
          {name ? (
            <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
          ) : (
            <Ionicons name="person" size={26} color={color.white} />
          )}
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {name || "Friend"}
          </Text>
          {stats ? (
            <View style={styles.streakRow}>
              <Ionicons name="flame" size={14} color={stats.streak > 0 ? color.saffron : color.inkFaint} />
              <Text style={styles.streakText}>
                {stats.streak} {stats.streak === 1 ? "day" : "days"}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.rows}>
        <MenuRow icon="home" label="Home" selected={active === "Tabs"} onPress={() => go("Tabs")} />
        <MenuRow icon="stats-chart" label="Progress" selected={active === "Progress"} onPress={() => go("Progress")} />
        <MenuRow icon="settings" label="Settings" selected={active === "Settings"} onPress={() => go("Settings")} />
        <MenuRow icon="document-text" label="Licences" selected={active === "Licences"} onPress={() => go("Licences")} />
        <MenuRow
          icon="shield-checkmark"
          label="Privacy policy"
          selected={active === "Privacy"}
          onPress={() => go("Privacy")}
        />
      </View>

      <View style={{ flex: 1 }} />

      <Pressable
        onPress={() => {
          haptics.tap();
          void logout();
        }}
        style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
      >
        <Ionicons name="log-out-outline" size={20} color={color.badText} />
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  selected = false,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
    >
      <Ionicons name={icon} size={22} color={selected ? accent.saffron.fg : color.inkSoft} />
      <Text style={[styles.rowLabel, selected && { color: accent.saffron.fg }]}>{label}</Text>
    </Pressable>
  );
}

/** Header for the drawer screens that have one (all but the tabs). */
function withHeader(title: string) {
  return ({ navigation }: { navigation: DrawerNavigationProp<DrawerParamList> }): DrawerNavigationOptions => ({
    headerShown: true,
    title,
    headerStyle: { backgroundColor: color.bg },
    headerShadowVisible: false,
    headerTintColor: color.ink,
    headerTitleStyle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800" },
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
  });
}

export default function AppDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerMenu {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: color.bg, width: 300 },
        overlayColor: "rgba(59,46,37,0.35)",
        sceneStyle: { backgroundColor: color.bg },
      }}
    >
      <Drawer.Screen name="Tabs" component={MainTabs} />
      <Drawer.Screen name="Progress" component={ProgressScreen} options={withHeader("Progress")} />
      <Drawer.Screen name="Settings" component={SettingsScreen} options={withHeader("Settings")} />
      <Drawer.Screen name="Licences" component={LicencesScreen} options={withHeader("Licences and credits")} />
      <Drawer.Screen name="Privacy" component={PrivacyScreen} options={withHeader("Privacy policy")} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  menu: { flex: 1, backgroundColor: color.bg, paddingHorizontal: space.md },
  header: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.xs, marginBottom: space.lg },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  avatarLetter: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.lg, color: color.white },
  name: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.lg, color: color.ink },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  streakText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.inkSoft },
  rows: { gap: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: 52,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
  },
  rowSelected: { backgroundColor: color.saffronLight },
  rowLabel: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base, color: color.ink },
  signOut: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: 52,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: color.badBg,
  },
  signOutText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: color.badText },
});
