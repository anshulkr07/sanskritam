import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const source = await readFile(path.join(root, '../legal-site/src/index.js'), 'utf8');
const worker = (await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)).default;
const assetRequests = [];
const env = { ASSETS: { async fetch(request) {
  assetRequests.push(new URL(request.url).pathname);
  return new Response('static content', { headers: { 'content-type': 'text/html' } });
} } };

const redirect = await worker.fetch(new Request('http://sanskritam.vedicvalor.com/privacy'), env);
assert.equal(redirect.status, 301);
assert.equal(redirect.headers.get('location'), 'https://sanskritam.vedicvalor.com/privacy');
for (const pathname of ['/', '/index.html', '/assets/site.css', '/robots.txt', '/app-ads.txt']) {
  const response = await worker.fetch(new Request(`https://sanskritam.vedicvalor.com${pathname}`), env);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'static content');
  assert.match(response.headers.get('strict-transport-security'), /max-age=31536000/);
  if (pathname === '/app-ads.txt') assert.match(response.headers.get('content-type'), /^text\/plain/);
}
assert.deepEqual(assetRequests, ['/', '/index.html', '/assets/site.css', '/robots.txt', '/app-ads.txt']);
assert.equal((await readFile(path.join(root, 'dist/sanskritam/app-ads.txt'), 'utf8')).trim(),
  'google.com, pub-6672536899650972, DIRECT, f08c47fec0942fa0');
const realFetch = globalThis.fetch;
try {
  const legalRequests = [];
  globalThis.fetch = async (url, options) => {
    legalRequests.push([url, options]);
    return new Response('existing policy content', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
  };
  for (const pathname of ['/privacy', '/delete-account']) {
    const response = await worker.fetch(new Request(`https://sanskritam.vedicvalor.com${pathname}`), env);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'existing policy content');
    assert.equal(response.headers.get('cache-control'), 'public, max-age=300');
    assert.match(legalRequests.at(-1)[0], new RegExp(`${pathname}$`));
    assert.equal(legalRequests.at(-1)[1].method, 'GET');
  }
  assert.equal(legalRequests.length, 2);
} finally { globalThis.fetch = realFetch; }
assert.equal((await worker.fetch(new Request('https://sanskritam.vedicvalor.com/missing'), env)).status, 404);

for (const site of ['vedicvalor', 'sanskritam']) {
  const output = path.join(root, 'dist', site);
  const html = await readFile(path.join(output, 'index.html'), 'utf8');
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1, 'One primary heading per page');
  assert.match(html, /https:\/\/play.google.com\/store\/apps\/details\?id=com.sanskritam.app/);
  for (const target of ['privacy', 'delete-account']) assert.ok(html.includes(`https://sanskritam.vedicvalor.com/${target}`));
  for (const match of html.matchAll(/(?:src|href)="(assets\/[^"#]+)"/g)) await access(path.join(output, match[1]));
  const css = await readFile(path.join(output, 'assets/site.css'), 'utf8');
  for (const match of css.matchAll(/url\('([^']+)'\)/g)) await access(path.join(output, 'assets', match[1]));
}
console.log('Passed: HTTPS redirect, static assets, legal proxy preservation, 404, page links, and bundled asset checks.');
