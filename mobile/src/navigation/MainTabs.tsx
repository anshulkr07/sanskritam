// The bottom tab bar — the app's "pages" (U8-1). Six tabs:
// Home · Path · Talk · Play · Grammar · Read.
// Shloka and Varṇamālā are NOT tabs — they are stack screens reached
// from Home cards (U8-2). Progress is NOT a tab either — it lives in the
// left drawer next to Settings. This file is wrapped in a left drawer
// (AppDrawer).
//
// Six-tab width rule: below 360dp OR at font scale ≥1.5 we render icons only
// (with an accessibilityLabel on every tab) so a label never truncates to an
// ellipsis — a bar reading "Progr…" is worse than an icon.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { IoniconsIconName } from "@react-native-vector-icons/ionicons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { PixelRatio, Platform, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ConversationScreen from "../screens/Conversation";
import GrammarScreen from "../screens/Grammar";
import HomeScreen from "../screens/Home";
import PathScreen from "../screens/Path";
import PlayScreen from "../screens/Play";
import ReaderScreen from "../screens/Reader";
import { haptics } from "../services/haptics";
import { color, font } from "../theme";
import type { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, { on: IoniconsIconName; off: IoniconsIconName }> = {
  Home: { on: "home", off: "home-outline" },
  Path: { on: "map", off: "map-outline" },
  Conversation: { on: "chatbubbles", off: "chatbubbles-outline" },
  Play: { on: "game-controller", off: "game-controller-outline" },
  Grammar: { on: "school", off: "school-outline" },
  Read: { on: "book", off: "book-outline" },
};

const LABEL: Record<keyof MainTabParamList, string> = {
  Home: "Home",
  Path: "Path",
  Conversation: "Talk",
  Play: "Play",
  Grammar: "Grammar",
  Read: "Read",
};

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Six tabs at 360dp is ~60dp each — too tight for icon+label at larger fonts.
  // Icons only below 360dp or at font scale ≥1.5; labels always have an
  // accessibilityLabel so nothing is lost to VoiceOver (§U5-1).
  const fontScale = PixelRatio.getFontScale();
  const iconsOnly = width < 360 || fontScale >= 1.5;

  const bottomPad = Platform.OS === "ios" ? 28 : Math.max(insets.bottom, 8);
  const barHeight = Platform.OS === "ios" ? 84 : 56 + bottomPad;

  return (
    <Tab.Navigator
      screenListeners={{ tabPress: () => haptics.tap() }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: color.saffron,
        tabBarInactiveTintColor: color.inkFaint,
        tabBarStyle: {
          backgroundColor: color.surface,
          borderTopColor: color.border,
          borderTopWidth: 1,
          height: barHeight,
          paddingTop: 6,
          paddingBottom: bottomPad,
        },
        tabBarLabelStyle: {
          fontFamily: "Nunito_700Bold",
          fontWeight: "700",
          fontSize: font.sizes.xs,
        },
        tabBarShowLabel: !iconsOnly,
        tabBarIcon: ({ focused, color: c, size }) => {
          const name = focused ? ICONS[route.name].on : ICONS[route.name].off;
          return <Ionicons name={name} size={focused && iconsOnly ? size + 4 : size} color={c} />;
        },
        tabBarAccessibilityLabel: LABEL[route.name],
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: LABEL.Home }} />
      <Tab.Screen name="Path" component={PathScreen} options={{ tabBarLabel: LABEL.Path }} />
      <Tab.Screen name="Conversation" component={ConversationScreen} options={{ tabBarLabel: LABEL.Conversation }} />
      <Tab.Screen name="Play" component={PlayScreen} options={{ tabBarLabel: LABEL.Play }} />
      <Tab.Screen name="Grammar" component={GrammarScreen} options={{ tabBarLabel: LABEL.Grammar }} />
      <Tab.Screen name="Read" component={ReaderScreen} options={{ tabBarLabel: LABEL.Read }} />
    </Tab.Navigator>
  );
}
