import {
  useFonts,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from "@expo-google-fonts/nunito";
import {
  Baloo2_400Regular,
  Baloo2_500Medium,
  Baloo2_600SemiBold,
  Baloo2_700Bold,
  Baloo2_800ExtraBold,
} from "@expo-google-fonts/baloo-2";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { color } from "./src/theme";
import type { RootStackParamList } from "./src/navigation/types";
import { AuthProvider, useAuth } from "./src/store/auth";
import { TypeScaleProvider } from "./src/hooks/useTypeScale";
import { AskProvider } from "./src/ask/AskProvider";

import MainTabs from "./src/navigation/AppDrawer";
import ChallengeScreen from "./src/screens/Challenge";
import LoginScreen from "./src/screens/Login";
import WordOrderScreen from "./src/screens/WordOrder";
import ParadigmScreen from "./src/screens/Paradigm";
import ShlokaScreen from "./src/screens/Shloka";
import VarnamalaScreen from "./src/screens/Varnamala";
import DailyWordScreen from "./src/screens/DailyWord";

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
  const { loading, onboarded } = useAuth();
  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={color.saffron} size="large" />
      </View>
    );
  }
  // If not onboarded, show the login/onboarding screen instead of the app
  if (!onboarded) {
    return <LoginScreen />;
  }
  return (
    <Stack.Navigator screenOptions={HEADER_OPTS}>
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="Challenge"
        component={ChallengeScreen}
        options={{ title: "Challenges", presentation: "card" }}
      />
      <Stack.Screen
        name="WordOrder"
        component={WordOrderScreen}
        options={{ title: "Word Order" }}
      />
      <Stack.Screen
        name="Paradigm"
        component={ParadigmScreen}
        options={{ title: "Paradigm" }}
      />
      {/* U8-1: Shloka and Varṇamālā are stack screens reached from Home cards. */}
      <Stack.Screen name="Shloka" component={ShlokaScreen} options={{ title: "Daily Śloka" }} />
      <Stack.Screen name="Varnamala" component={VarnamalaScreen} options={{ title: "Varṇamālā" }} />
      {/* U8-4: the daily word */}
      <Stack.Screen name="DailyWord" component={DailyWordScreen} options={{ headerShown: false }} />
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
      <GestureHandlerRootView style={{ flex: 1 }}>
        <TypeScaleProvider>
          <AuthProvider>
            <NavigationContainer>
              <AskProvider>
                <RootNavigator />
              </AskProvider>
            </NavigationContainer>
            <StatusBar style="dark" />
          </AuthProvider>
        </TypeScaleProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.bg },
});