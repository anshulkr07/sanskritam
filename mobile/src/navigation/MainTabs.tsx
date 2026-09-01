// The bottom tab bar — the app's real "pages," Duolingo/Airlearn-style.
// Each tab is a standalone destination now; nothing here also lives stacked
// on the Home screen (see Home.tsx's header comment for the split).

import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { IoniconsIconName } from "@react-native-vector-icons/ionicons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { Platform } from "react-native";

import ConversationScreen from "../screens/Conversation";
import HomeScreen from "../screens/Home";
import ProfileScreen from "../screens/Profile";
import ShlokaScreen from "../screens/Shloka";
import VarnamalaScreen from "../screens/Varnamala";
import { haptics } from "../services/haptics";
import { color, font } from "../theme";
import type { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, { on: IoniconsIconName; off: IoniconsIconName }> = {
  Home: { on: "home", off: "home-outline" },
  Conversation: { on: "chatbubbles", off: "chatbubbles-outline" },
  Shloka: { on: "book", off: "book-outline" },
  Varnamala: { on: "language", off: "language-outline" },
  Profile: { on: "person-circle", off: "person-circle-outline" },
};

const LABEL: Record<keyof MainTabParamList, string> = {
  Home: "Home",
  Conversation: "Talk",
  Shloka: "Śloka",
  Varnamala: "Varṇa",
  Profile: "Profile",
};

export default function MainTabs() {
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
          height: Platform.OS === "ios" ? 84 : 64,
          paddingTop: 6,
          paddingBottom: Platform.OS === "ios" ? 28 : 8,
        },
        tabBarLabelStyle: {
          fontFamily: "Nunito_700Bold",
          fontWeight: "700",
          fontSize: font.sizes.xs,
        },
        tabBarIcon: ({ focused, color: c, size }) => {
          const name = focused ? ICONS[route.name].on : ICONS[route.name].off;
          return <Ionicons name={name} size={size} color={c} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: LABEL.Home }} />
      <Tab.Screen name="Conversation" component={ConversationScreen} options={{ tabBarLabel: LABEL.Conversation }} />
      <Tab.Screen name="Shloka" component={ShlokaScreen} options={{ tabBarLabel: LABEL.Shloka }} />
      <Tab.Screen name="Varnamala" component={VarnamalaScreen} options={{ tabBarLabel: LABEL.Varnamala }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: LABEL.Profile }} />
    </Tab.Navigator>
  );
}
