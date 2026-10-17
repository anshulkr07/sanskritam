module.exports = ({ config }) => ({
  ...config,
  plugins: [...config.plugins, 'expo-asset', 'expo-secure-store'],
});
