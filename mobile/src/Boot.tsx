// Boot — the root component. It reads the learner's Light / Dark choice and
// paints the palette (theme.applyScheme) before App.tsx is required: App
// imports every screen, and each screen builds its StyleSheet from the
// palette the moment it is first required. Keep this file and the modules it
// imports free of screen code.

import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";

import { bootScheme } from "./services/colorScheme";

// The native splash stays up through the one storage read.
void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Boot() {
  const [Root, setRoot] = useState<React.ComponentType | null>(null);
  useEffect(() => {
    let alive = true;
    void bootScheme().finally(() => {
      if (!alive) return;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const App = (require("../App") as { default: React.ComponentType }).default;
      setRoot(() => App);
    });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (Root) void SplashScreen.hideAsync().catch(() => {});
  }, [Root]);
  return Root ? <Root /> : null;
}
