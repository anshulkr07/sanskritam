module.exports = ({ config }) => {
  const adsMode = process.env.EXPO_PUBLIC_ADS_MODE || 'off';
  if (!['off', 'test', 'live'].includes(adsMode)) throw new Error('Invalid EXPO_PUBLIC_ADS_MODE');
  if (adsMode !== 'off' && process.env.EXPO_PUBLIC_HYBRID_COMMERCE !== 'true') throw new Error('Ads require the hybrid commerce build');
  const appId = (platform, sample) => {
    if (adsMode === 'test') {
      const id = process.env[`ADMOB_${platform}_APP_ID`] || sample;
      if (!/^ca-app-pub-\d+~\d+$/.test(id)) throw new Error(`Invalid ADMOB_${platform}_APP_ID`);
      return id;
    }
    const id = process.env[`ADMOB_${platform}_APP_ID`];
    if (!/^ca-app-pub-\d+~\d+$/.test(id || '') || id.includes('3940256099942544')) throw new Error(`Set a real ADMOB_${platform}_APP_ID`);
    for (const format of ['NATIVE', 'REWARDED']) {
      const unit = process.env[`EXPO_PUBLIC_ADMOB_${platform}_${format}`];
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
