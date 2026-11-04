module.exports = ({ config }) => ({
  ...config,
  plugins: [...config.plugins, 'expo-asset', 'expo-secure-store',
    ...(process.env.EXPO_PUBLIC_HYBRID_COMMERCE === 'true' ? ['react-native-iap'] : [])],
});
