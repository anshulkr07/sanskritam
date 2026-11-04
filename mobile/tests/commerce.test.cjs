// Run with: node --test tests/commerce.test.cjs (no native runtime required).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function setup() {
  const storage = new Map();
  const state = { reply: null, error: null, handler: null };
  const mocks = {
    '../api/client': { request: async () => {
      if (state.handler) return state.handler();
      if (state.error) throw state.error;
      return state.reply;
    } },
    './apiCache': { invalidateCache() {} },
    '../config': { BASE_URL: 'https://example.test' },
    '@react-native-async-storage/async-storage': {
      getAllKeys: async () => [...storage.keys()],
      getItem: async key => storage.get(key) ?? null,
      setItem: async (key, value) => { storage.set(key, value); },
      removeItem: async key => { storage.delete(key); },
    },
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/services/commerce.ts'), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const context = { exports: {}, require: id => {
    if (!(id in mocks)) throw new Error(`Unexpected import: ${id}`);
    return mocks[id];
  }, process: { env: { EXPO_PUBLIC_HYBRID_COMMERCE: 'true' } }, URL };
  vm.runInNewContext(outputText, context);
  const key = (owner, title) => `shabd.edition.licence.${encodeURIComponent(owner)}.${encodeURIComponent(title)}`;
  const cache = (owner, title, extra = {}) => storage.set(key(owner, title), JSON.stringify({
    owner, expires_at: '2099-01-01T00:00:00', owned: false, premium: true, ...extra,
  }));
  return { api: context.exports, state, storage, key, cache };
}

test('Plus to Lite removes subscription downloads while preserving owned and free editions', async () => {
  const { api, state, storage, key, cache } = setup();
  api.setCommerceOwner('u');
  cache('u', 'isha:book');
  cache('u', 'gita:audio', { owned: true });
  cache('u', 'free:book', { premium: false });
  cache('other', 'isha:book');
  state.reply = { owned_titles: ['gita:audio'], downloadable_titles: ['gita:audio'],
    catalogue: [{ id: 'isha:book', lite_included: true }, { id: 'gita:audio' }] };
  await api.refreshCommerce();
  assert.equal(await api.offlineEditionAllowed('isha:book'), false);
  assert.equal(await api.offlineEditionAllowed('gita:audio'), true);
  assert.equal(await api.offlineEditionAllowed('free:book'), true);
  assert.equal(storage.has(key('other', 'isha:book')), true);
});

test('server refusal invalidates a previous download licence', async () => {
  const { api, state, storage, key, cache } = setup();
  api.setCommerceOwner('u'); cache('u', 'isha:audio');
  state.error = new Error('Lite does not include premium downloads');
  await assert.rejects(api.offlineEditionAllowed('isha:audio', true), /Lite/);
  assert.equal(storage.has(key('u', 'isha:audio')), false);
});

test('refund refresh removes only the revoked ownership licence', async () => {
  const { api, state, cache } = setup();
  api.setCommerceOwner('u');
  cache('u', 'isha:book', { owned: true }); cache('u', 'gita:book', { owned: true });
  state.reply = { owned_titles: ['gita:book'], downloadable_titles: ['gita:book'], catalogue: [] };
  await api.refreshCommerce();
  assert.equal(await api.offlineEditionAllowed('isha:book'), false);
  assert.equal(await api.offlineEditionAllowed('gita:book'), true);
});

test('an account switch during licence acquisition cannot cache another account grant', async () => {
  const { api, state, storage } = setup();
  api.setCommerceOwner('u');
  state.handler = async () => {
    api.setCommerceOwner('other');
    return { owner: 'u', expires_at: '2099-01-01T00:00:00', owned: true };
  };
  await assert.rejects(api.offlineEditionAllowed('isha:book', true), /Account changed/);
  assert.equal(storage.size, 0);
});
