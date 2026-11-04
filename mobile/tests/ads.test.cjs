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
  const sdk = {__esModule: true, default: () => ({setRequestConfiguration: async () => {}, initialize: async () => calls.push('initialize')}),
    AdsConsent: consent, MaxAdContentRating: {G: 'G'}, TestIds: {NATIVE: 'google-native', REWARDED: 'google-rewarded'},
    RewardedAd: {createForAdRequest: (id, request) => {calls.push({id, request}); return ad;}},
    AdEventType: {CLOSED: 'closed', ERROR: 'error'}, RewardedAdEventType: {LOADED: 'loaded', EARNED_REWARD: 'earned'},
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
  }, setTimeout, clearTimeout, process: {env: {EXPO_PUBLIC_ADMOB_ANDROID_REWARDED: 'ca-app-pub-123456789/1234567'}}};
  vm.runInNewContext(outputText, context);
  return {api: context.exports, calls};
}

test('paid or opted-out accounts cannot initialize Google or load an ad', async () => {
  const {api, calls} = setup({allowed: false});
  await assert.rejects(api.watchReward('gita:book', 'reading'), /unavailable/);
  assert.equal(calls.includes('initialize'), false);
  assert.equal(calls.includes('load'), false);
});
test('unresolved consent never initializes SDK or shows an ad', async () => {
  const {api, calls} = setup({consent: false});
  await assert.rejects(api.watchReward('gita:book', 'reading'), /consent/);
  assert.equal(calls.includes('initialize'), false);
  assert.equal(calls.includes('show'), false);
});
test('withdrawal while the consent form is open prevents SDK initialization', async () => {
  const {api, calls} = setup({withdraw: true});
  await assert.rejects(api.watchReward('gita:book', 'reading'), /consent/);
  assert.equal(calls.includes('initialize'), false);
  assert.equal(calls.includes('show'), false);
});
test('Google test ad completion uses demo ID, signed customData and grants no entitlement', async () => {
  const {api, calls} = setup();
  assert.match(await api.watchReward('gita:book', 'reading'), /test ad completed/);
  assert.ok(calls.indexOf('consent') < calls.indexOf('initialize'));
  const created = calls.find(c => typeof c === 'object');
  assert.equal(created.id, 'google-rewarded');
  assert.equal(created.request.requestNonPersonalizedAdsOnly, true);
  assert.equal(created.request.serverSideVerificationOptions.customData, 'signed-ticket');
  assert.equal(calls.includes('refresh'), false);
});
test('closing before reward earns no access', async () => {
  const {api, calls} = setup({earned: false});
  assert.match(await api.watchReward('gita:book', 'reading'), /before completion/);
  assert.equal(calls.includes('refresh'), false);
});
test('live rewards refresh content only after server verification', async () => {
  const {api, calls} = setup({mode: 'live'});
  assert.match(await api.watchReward('gita:audio', 'audio'), /24 hours/);
  assert.ok(calls.indexOf('/commerce/ads/ticket-id') < calls.indexOf('refresh'));
});
test('an account switch prevents a previously prepared ad from showing', async () => {
  const {api, calls} = setup({switchAccount: true});
  await assert.rejects(api.watchReward('gita:book', 'reading'), /Account changed/);
  assert.equal(calls.includes('show'), false);
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
  assert.throws(() => config({EXPO_PUBLIC_ADS_MODE: 'live', EXPO_PUBLIC_HYBRID_COMMERCE: 'true'}), /real ADMOB_ANDROID_APP_ID/);
  assert.throws(() => config({EXPO_PUBLIC_ADS_MODE: 'test'}), /hybrid/);
});
test('test mode can use a registered app for UMP while keeping demo ad serving', () => {
  const result = config({EXPO_PUBLIC_ADS_MODE: 'test', EXPO_PUBLIC_HYBRID_COMMERCE: 'true',
    ADMOB_ANDROID_APP_ID: 'ca-app-pub-123456789~1234567'});
  const plugin = result.plugins.find(p => Array.isArray(p) && p[0] === 'react-native-google-mobile-ads');
  assert.equal(plugin[1].androidAppId, 'ca-app-pub-123456789~1234567');
  assert.equal(result.runtimeVersion, '1.7.0-ads-test-v1');
});
