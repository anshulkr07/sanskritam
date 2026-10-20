// Entry point — react-native-gesture-handler MUST be imported first (Android).
// eslint-disable-next-line import/order
import "react-native-gesture-handler";

import { registerRootComponent } from "expo";

import Boot from "./src/Boot";

// registerRootComponent calls AppRegistry.registerComponent('main', () => Boot);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately. Boot paints the Light / Dark palette,
// then requires App (src/Boot.tsx says why App is not imported here).
registerRootComponent(Boot);
