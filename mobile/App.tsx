import { Nunito_400Regular, Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, useFonts } from "@expo-google-fonts/nunito";
import { Baloo2_400Regular, Baloo2_500Medium, Baloo2_600SemiBold, Baloo2_700Bold, Baloo2_800ExtraBold } from "@expo-google-fonts/baloo-2";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { color } from "./src/theme";
import type { RootStackParamList } from "./src/navigation/types";
import { AuthProvider, useAuth } from "./src/store/auth";

import MainTabs from "./src/navigation/MainTabs";
import ChallengeScreen from "./src/screens/Challenge";

// NOTE: Login screen (src/screens/Login.tsx) is intentionally NOT mounted yet.
// Auth is silent dev-login for now; onboarding ships later.

const Stack = createNativeStackNavigator<RootStackParamList>();

const HEADER_OPTS = {
  headerStyle: { backgroundColor: color.bg },
  headerTintColor: color.ink,
  headerTitleStyle: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800" as const,
  },
};

function RootNavigator() {
  const { loading } = useAuth();
  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={color.saffron} size="large" />
      </View>
    );
  }
  return (
    <Stack.Navigator screenOptions={HEADER_OPTS}>
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      {/* Pushed OVER the tab bar — a practice session is a flow you step
          into and return from, not a place you live (same reason Duolingo
          has no "Lesson" tab). The tab bar is hidden while this is active. */}
      <Stack.Screen
        name="Challenge"
        component={ChallengeScreen}
        options={{ title: "Challenges", presentation: "card" }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Baloo2_400Regular,
    Baloo2_500Medium,
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={color.saffron} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
        <StatusBar style="dark" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.bg },
});