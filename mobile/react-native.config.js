// Keep the advertising SDK out of binaries built without the ads feature.
const enabled = ['test', 'live'].includes(process.env.EXPO_PUBLIC_ADS_MODE);
module.exports = { dependencies: {
  ...(!enabled ? { 'react-native-google-mobile-ads': { platforms: { android: null, ios: null } } } : {}),
} };
