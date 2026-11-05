module.exports = ({ config }) => {
  const adsMode = process.env.EXPO_PUBLIC_ADS_MODE || 'off';
  if (!['off', 'test', 'live'].includes(adsMode)) throw new Error('Invalid EXPO_PUBLIC_ADS_MODE');
  // Ads no longer need the Shop build: they can launch before purchases do.
  // EAS sets EAS_BUILD_PLATFORM; a live build only needs real IDs for the
  // platform it builds, so an Android launch works before an iOS app exists.
  const building = process.env.EAS_BUILD_PLATFORM;
  const appId = (platform, sample) => {
    if (adsMode === 'test') {
      const id = process.env[`ADMOB_${platform}_APP_ID`] || sample;
      if (!/^ca-app-pub-\d+~\d+$/.test(id)) throw new Error(`Invalid ADMOB_${platform}_APP_ID`);
      return id;
    }
    const id = process.env[`ADMOB_${platform}_APP_ID`];
    // Without EAS_BUILD_PLATFORM (local config, OTA updates) Android is the one required.
    const required = building ? building.toUpperCase() === platform : platform === 'ANDROID';
    if (!id && !required) return undefined;
    if (!/^ca-app-pub-\d+~\d+$/.test(id || '') || id.includes('3940256099942544')) throw new Error(`Set a real ADMOB_${platform}_APP_ID`);
    for (const format of ['NATIVE', 'INTERSTITIAL', 'REWARDED']) {
      const unit = process.env[`EXPO_PUBLIC_ADMOB_${platform}_${format}`];
      // Optional: interstitials (the audiobook player's full-screen ads) and
      // rewarded ads (they unlock paid editions, so they wait for the Shop).
      if (format !== 'NATIVE' && !unit) continue;
      if (!/^ca-app-pub-\d+\/\d+$/.test(unit || '') || unit.includes('3940256099942544')) throw new Error(`Set a real ${platform} ${format} ad unit`);
    }
    return id;
  };
  return ({
  ...config,
  ...(adsMode !== 'off' ? {
    runtimeVersion: `${config.version}-ads-${adsMode}-v1`,
    android: {...config.android, blockedPermissions: (config.android?.blockedPermissions || []).filter(p => adsMode !== 'live' || p !== 'com.google.android.gms.permission.AD_ID')},
  } : {}),
  plugins: [...config.plugins, 'expo-asset', 'expo-secure-store',
    ...(process.env.EXPO_PUBLIC_HYBRID_COMMERCE === 'true' ? ['react-native-iap'] : []),
    ...(adsMode !== 'off' ? [['react-native-google-mobile-ads', {
      androidAppId: appId('ANDROID', 'ca-app-pub-3940256099942544~3347511713'),
      iosAppId: appId('IOS', 'ca-app-pub-3940256099942544~1458002511'),
      delayAppMeasurementInit: true,
      skAdNetworkItems: ['cstr6suwn9.skadnetwork'],
    }]] : [])],
  });
};
