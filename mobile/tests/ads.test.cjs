const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function setup(options = {}) {
  const calls = [];
  let owner = 'u';
  const events = new Map();
  const ad = {addAdEventListener: (event, fn) => {events.set(event, fn); return () => events.delete(event);},
    load: () => { calls.push('load'); void events.get('loaded')(); },
    show: async () => { calls.push('show'); if (options.earned !== false) events.get('earned')(); events.get('closed')(); },
  };
  const consent = {getConsentInfo: async () => ({canRequestAds: options.consent !== false}),
    gatherConsent: async () => {calls.push('consent'); if (options.withdraw) options.allowed = false;},
  };
  const sdk = {__esModule: true, default: () => ({setRequestConfiguration: async config => calls.push('rating:' + config.maxAdContentRating), initialize: async () => calls.push('initialize')}),
    AdsConsent: consent, MaxAdContentRating: {G: 'G'}, TestIds: {NATIVE: 'google-native', REWARDED: 'google-rewarded', INTERSTITIAL: 'google-interstitial'},
    NativeAdChoicesPlacement: {TOP_RIGHT: 1},
    InterstitialAd: {createForAdRequest: (id, request) => {
      calls.push({interstitial: id, request});
      const handlers = new Map();
      return {
        addAdEventListener: (event, fn) => { handlers.set(event, fn); return () => handlers.delete(event); },
        load: () => { calls.push('iload'); options.noFill ? handlers.get('error')(new Error('No fill')) : handlers.get('ad-loaded')(); },
        show: async () => { calls.push('ishow'); handlers.get('closed')(); },
      };
    }},
    NativeAd: {createForAdRequest: async (id, request) => {calls.push({native: id, request}); if (options.noFill) throw new Error('No fill'); return {destroy() {}};}},
    RewardedAd: {createForAdRequest: (id, request) => {calls.push({id, request}); return ad;}},
    AdEventType: {CLOSED: 'closed', ERROR: 'error', LOADED: 'ad-loaded'}, RewardedAdEventType: {LOADED: 'loaded', EARNED_REWARD: 'earned'},
  };
  const mocks = {
    'react-native': {AppState: {currentState: 'active'}, Platform: {OS: 'android'}},
    '../api/client': {request: async url => {
      calls.push(url);
      if (url.includes('eligibility')) return {allowed: options.allowed !== false};
      if (url.endsWith('/ticket')) {if (options.switchAccount) owner = 'other'; return {ticket: 'signed-ticket', id: 'ticket-id'};}
      if (url.endsWith('/ticket-id')) return {verified: true};
      throw new Error('Unexpected request: ' + url);
    }},
    './commerce': {commerceOwner: () => owner, refreshCommerce: async () => calls.push('refresh')},
    './adsState': {ADS_ENABLED: true, ADS_MODE: options.mode || 'test', adsRevision: {changed() {}}},
    './audioTransport': {audioTransport: {getSnapshot: () => null}},
    'react-native-google-mobile-ads': sdk,
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/services/ads.native.ts'), 'utf8');
  const {outputText} = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true}});
  const context = {exports: {}, require: id => {
    if (!(id in mocks)) throw new Error('Unexpected import ' + id);
    return mocks[id];
  }, setTimeout, clearTimeout, process: {env: options.noRewarded ? {} : {EXPO_PUBLIC_ADMOB_ANDROID_REWARDED: 'ca-app-pub-123456789/1234567'}}};
  vm.runInNewContext(outputText, context);
  return {api: context.exports, calls};
}

test('paid or opted-out accounts cannot initialize Google or load an ad', async () => {
  const {api, calls} = setup({allowed: false});
  await assert.rejects(api.watchReward('gita:book', 'practice'), /unavailable/);
  assert.equal(calls.includes('initialize'), false);
  assert.equal(calls.includes('load'), false);
});
test('unresolved consent never initializes SDK or shows an ad', async () => {
  const {api, calls} = setup({consent: false});
  await assert.rejects(api.watchReward('gita:book', 'practice'), /consent/);
  assert.equal(calls.includes('initialize'), false);
  assert.equal(calls.includes('show'), false);
});
test('withdrawal while the consent form is open prevents SDK initialization', async () => {
  const {api, calls} = setup({withdraw: true});
  await assert.rejects(api.watchReward('gita:book', 'practice'), /consent/);
  assert.equal(calls.includes('initialize'), false);
  assert.equal(calls.includes('show'), false);
});
test('Google test ad completion uses demo ID, signed customData and grants no entitlement', async () => {
  const {api, calls} = setup();
  assert.match(await api.watchReward('gita:book', 'practice'), /test ad completed/);
  assert.ok(calls.indexOf('consent') < calls.indexOf('initialize'));
  const created = calls.find(c => typeof c === 'object');
  assert.equal(created.id, 'google-rewarded');
  assert.equal(created.request.requestNonPersonalizedAdsOnly, true);
  assert.equal(created.request.serverSideVerificationOptions.customData, 'signed-ticket');
  assert.equal(calls.includes('refresh'), false);
});
test('closing before reward earns no access', async () => {
  const {api, calls} = setup({earned: false});
  assert.match(await api.watchReward('gita:book', 'practice'), /before completion/);
  assert.equal(calls.includes('refresh'), false);
});
test('live rewards refresh content only after server verification', async () => {
  const {api, calls} = setup({mode: 'live'});
  assert.match(await api.watchReward('gita:audio', 'practice'), /24 hours/);
  assert.ok(calls.indexOf('/commerce/ads/ticket-id') < calls.indexOf('refresh'));
});
test('an account switch prevents a previously prepared ad from showing', async () => {
  const {api, calls} = setup({switchAccount: true});
  await assert.rejects(api.watchReward('gita:book', 'practice'), /Account changed/);
  assert.equal(calls.includes('show'), false);
});
test('native ads need no ticket and are always non-personalized and rated G', async () => {
  const {api, calls} = setup();
  const loaded = await api.loadNativeAd();
  assert.ok(loaded && loaded.ad);
  assert.equal(calls.some(c => typeof c === 'string' && c.endsWith('/ticket')), false);
  const request = calls.find(c => c && c.native);
  assert.equal(request.native, 'google-native');
  assert.equal(request.request.requestNonPersonalizedAdsOnly, true);
  assert.ok(calls.includes('rating:G'));
  assert.ok(calls.indexOf('consent') < calls.indexOf('initialize'));
});
test('paid accounts and unsettled consent load no native ad', async () => {
  for (const options of [{allowed: false}, {consent: false}]) {
    const {api, calls} = setup(options);
    assert.equal(await api.loadNativeAd(), null);
    assert.equal(calls.some(c => c && c.native), false);
  }
});
test('the player\'s full-screen ad is non-personalized, needs no ticket and resolves when closed', async () => {
  const {api, calls} = setup();
  const ad = await api.loadInterstitial();
  const created = calls.find(c => c && c.interstitial);
  assert.equal(created.interstitial, 'google-interstitial');
  assert.equal(created.request.requestNonPersonalizedAdsOnly, true);
  assert.equal(calls.some(c => typeof c === 'string' && c.endsWith('/ticket')), false);
  await ad.show();
  assert.ok(calls.includes('ishow'));
});
test('no fill rejects the load; no interstitial unit in a live build means no player ads', async () => {
  await assert.rejects(setup({noFill: true}).api.loadInterstitial(), /No fill/);
  const live = setup({mode: 'live'});
  assert.equal(live.api.hasInterstitialUnit(), false);
  assert.equal(await live.api.loadInterstitial(), null);
  assert.equal(live.calls.some(c => c && c.interstitial), false);
});
test('a live build without a rewarded unit hides the rewarded offer', () => {
  assert.equal(setup({mode: 'live'}).api.hasRewardedUnit(), true);
  assert.equal(setup({mode: 'test'}).api.hasRewardedUnit(), true);
  assert.equal(setup({mode: 'live', noRewarded: true}).api.hasRewardedUnit(), false);
});

function config(env) {
  const source = fs.readFileSync(path.join(__dirname, '../app.config.js'), 'utf8');
  const context = {module: {exports: {}}, process: {env}};
  vm.runInNewContext(source, context);
  return context.module.exports({config: {version: '1.7.0', plugins: [], android: {blockedPermissions: ['com.google.android.gms.permission.AD_ID']}}});
}
test('test build uses Google sample app IDs and its own runtime', () => {
  const result = config({EXPO_PUBLIC_ADS_MODE: 'test', EXPO_PUBLIC_HYBRID_COMMERCE: 'true'});
  const plugin = result.plugins.find(p => Array.isArray(p) && p[0] === 'react-native-google-mobile-ads');
  assert.equal(plugin[1].androidAppId, 'ca-app-pub-3940256099942544~3347511713');
  assert.equal(plugin[1].iosAppId, 'ca-app-pub-3940256099942544~1458002511');
  assert.equal(plugin[1].delayAppMeasurementInit, true);
  assert.equal(result.runtimeVersion, '1.7.0-ads-test-v1');
  assert.equal(config({}).plugins.includes('react-native-google-mobile-ads'), false);
});
test('live configuration rejects missing or demo publisher IDs', () => {
  assert.throws(() => config({EXPO_PUBLIC_ADS_MODE: 'live'}), /real ADMOB_ANDROID_APP_ID/);
  assert.throws(() => config({EXPO_PUBLIC_ADS_MODE: 'live', ADMOB_ANDROID_APP_ID: 'ca-app-pub-3940256099942544~3347511713'}), /real ADMOB_ANDROID_APP_ID/);
  assert.throws(() => config({EXPO_PUBLIC_ADS_MODE: 'live', ADMOB_ANDROID_APP_ID: 'ca-app-pub-123~456'}), /real ANDROID NATIVE ad unit/);
});
const LIVE_ANDROID = {EXPO_PUBLIC_ADS_MODE: 'live', ADMOB_ANDROID_APP_ID: 'ca-app-pub-123~456', EXPO_PUBLIC_ADMOB_ANDROID_NATIVE: 'ca-app-pub-123/789'};
test('ads ship without the Shop build, and Android can launch before iOS', () => {
  const result = config({...LIVE_ANDROID, EAS_BUILD_PLATFORM: 'android'});
  const plugin = result.plugins.find(p => Array.isArray(p) && p[0] === 'react-native-google-mobile-ads');
  assert.equal(plugin[1].androidAppId, 'ca-app-pub-123~456');
  assert.equal(plugin[1].iosAppId, undefined);
  assert.equal(result.plugins.includes('react-native-iap'), false);
  assert.equal(result.runtimeVersion, '1.7.0-ads-live-v1');
  assert.equal(result.android.blockedPermissions.includes('com.google.android.gms.permission.AD_ID'), false);
  assert.ok(config(LIVE_ANDROID));  // OTA updates and local config read no platform
  assert.throws(() => config({...LIVE_ANDROID, EAS_BUILD_PLATFORM: 'ios'}), /real ADMOB_IOS_APP_ID/);
  assert.ok(config({EXPO_PUBLIC_ADS_MODE: 'test'}));
  // The interstitial unit is optional, but checked when given.
  assert.ok(config({...LIVE_ANDROID, EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL: 'ca-app-pub-123/790'}));
  assert.throws(() => config({...LIVE_ANDROID, EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712'}), /real ANDROID INTERSTITIAL ad unit/);
});
test('test mode can use a registered app for UMP while keeping demo ad serving', () => {
  const result = config({EXPO_PUBLIC_ADS_MODE: 'test', EXPO_PUBLIC_HYBRID_COMMERCE: 'true',
    ADMOB_ANDROID_APP_ID: 'ca-app-pub-123456789~1234567'});
  const plugin = result.plugins.find(p => Array.isArray(p) && p[0] === 'react-native-google-mobile-ads');
  assert.equal(plugin[1].androidAppId, 'ca-app-pub-123456789~1234567');
  assert.equal(result.runtimeVersion, '1.7.0-ads-test-v1');
});
