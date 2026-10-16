// Main destinations, with the isolated Voice Lab beside Read.
import {
  Ionicons,
  type IoniconsIconName,
} from "@react-native-vector-icons/ionicons";
import {
  createBottomTabNavigator,
  BottomTabBar,
} from "@react-navigation/bottom-tabs";
import React from "react";
import { PixelRatio, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ConversationScreen from "../screens/Conversation";
import HomeScreen from "../screens/Home";
import LearnTrailScreen from "../screens/LearnTrail";
import PlayScreen from "../screens/Play";
import ReaderScreen from "../screens/Reader";
import GroupScreen from "../screens/Group";
import { AudioMiniPlayer, useCommunity } from "../community/CommunityProvider";
import VoiceHub from "../screens/VoiceHub";
import { haptics } from "../services/haptics";
import { color, font } from "../theme";
import type { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();
const ICONS: Record<
  keyof MainTabParamList,
  { on: IoniconsIconName; off: IoniconsIconName }
> = {
  Home: { on: "home", off: "home-outline" },
  Learn: { on: "library", off: "library-outline" },
  Conversation: { on: "chatbubbles", off: "chatbubbles-outline" },
  Play: { on: "game-controller", off: "game-controller-outline" },
  Read: { on: "book", off: "book-outline" },
  Group: { on: "people", off: "people-outline" },
  VoiceLab: { on: "mic", off: "mic-outline" },
};
const LABEL: Record<keyof MainTabParamList, string> = {
  Home: "Home",
  Learn: "Learn",
  Conversation: "Talk",
  Play: "Play",
  Read: "Read",
  VoiceLab: "Voice",
  Group: "Group",
};
export default function MainTabs() {
  const { status } = useCommunity();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const iconsOnly = width < 320 || PixelRatio.getFontScale() >= 1.4;
  const bottomPad = Math.max(insets.bottom, 8);
  return (
    <Tab.Navigator
      tabBar={(props) => (
        <View>
          <AudioMiniPlayer />
          <BottomTabBar {...props} />
        </View>
      )}
      screenListeners={{ tabPress: () => haptics.tap() }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: color.saffron,
        tabBarInactiveTintColor: color.inkFaint,
        tabBarStyle: {
          backgroundColor: color.surface,
          borderTopColor: color.border,
          borderTopWidth: 1,
          height: 56 + bottomPad,
          paddingTop: 6,
          paddingBottom: bottomPad,
        },
        tabBarLabelStyle: {
          fontFamily: "Nunito_700Bold",
          fontWeight: "700",
          fontSize: width < 420 ? 10 : font.sizes.xs,
        },
        tabBarShowLabel: !iconsOnly,
        tabBarAccessibilityLabel: LABEL[route.name],
        tabBarIcon: ({ focused, color: c, size }) => (
          <Ionicons
            name={focused ? ICONS[route.name].on : ICONS[route.name].off}
            size={size}
            color={c}
          />
        ),
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: LABEL.Home }}
      />
      <Tab.Screen
        name="Learn"
        component={LearnTrailScreen}
        options={{ tabBarLabel: LABEL.Learn }}
      />
      <Tab.Screen
        name="Conversation"
        component={ConversationScreen}
        options={{ tabBarLabel: LABEL.Conversation }}
      />
      <Tab.Screen
        name="Play"
        component={PlayScreen}
        options={{ tabBarLabel: LABEL.Play }}
      />
      <Tab.Screen
        name="Read"
        component={ReaderScreen}
        options={{ tabBarLabel: LABEL.Read }}
      />
      <Tab.Screen
        name="VoiceLab"
        component={VoiceHub}
        options={{ tabBarLabel: LABEL.VoiceLab }}
      />
      <Tab.Screen
        name="Group"
        component={GroupScreen}
        options={{
          tabBarLabel: LABEL.Group,
          // Unread messages and friend requests waiting; a dot when only a
          // room is live.
          tabBarBadge:
            status.unread + (status.requests ?? 0) > 0
              ? Math.min(99, status.unread + (status.requests ?? 0))
              : status.live > 0
                ? "•"
                : undefined,
          tabBarBadgeStyle: { backgroundColor: color.saffronBtn, fontFamily: "Nunito_700Bold" },
        }}
      />
    </Tab.Navigator>
  );
}
