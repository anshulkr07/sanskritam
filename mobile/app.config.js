module.exports = ({ config }) => ({
  ...config,
  plugins: [...config.plugins, 'expo-asset', 'expo-secure-store', 'react-native-iap',
    ['react-native-google-mobile-ads', {
      androidSdk: 'classic',
      androidAppId: process.env.ADMOB_ANDROID_APP_ID || 'ca-app-pub-3940256099942544~3347511713',
      iosAppId: process.env.ADMOB_IOS_APP_ID || 'ca-app-pub-3940256099942544~1458002511',
      delayAppMeasurementInit: true,
      userTrackingUsageDescription: 'With your permission, advertising helps fund free Sanskrit learning.',
    }],
  ],
});
