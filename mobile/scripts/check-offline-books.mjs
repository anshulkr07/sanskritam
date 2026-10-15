// Isolated persistence/download checks; no network, provider calls or device files.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const stored = new Map(), files = new Set(), downloads = [];
let contentLength = 1024;
class File {
  constructor(...parts) { this.uri = parts.map(p => p.uri ?? p).join("/"); }
  get exists() { return files.has(this.uri); }
  static async downloadFileAsync(src, dest) { downloads.push(src); files.add(dest.uri); return dest; }
}
class Directory { constructor(...parts) { this.uri = parts.join("/"); } create() {} }
const storage = {
  async getItem(key) { return stored.get(key) ?? null; },
  async setItem(key, value) { stored.set(key, value); },
  async getAllKeys() { return [...stored.keys()]; },
  async multiGet(keys) { return keys.map(k => [k, stored.get(k) ?? null]); },
};
const modules = {
  "@react-native-async-storage/async-storage": { __esModule: true, default: storage },
  "expo-file-system": { File, Directory, Paths: { document: "document" } },
  "react-native": { Platform: { OS: "android" } },
  "../config": { BASE_URL: "https://test.invalid" },
};
function load() {
  const source = readFileSync(new URL("../src/services/offlineBooks.ts", import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", "fetch", js)(specifier => {
    assert.ok(specifier in modules, specifier); return modules[specifier];
  }, module, module.exports, async () => ({ ok: true, headers: { get: () => String(contentLength) } }));
  return module.exports;
}
let books = load();
await assert.rejects(books.saveOfflineBook("empty", null, "Empty", []));
const pages = [{ id: "one", devanagari: "source text", chant: { url: "/one.wav" }, audio_url: "/one.wav" }];
await books.saveOfflineBook("book", "1", "Saved chapter", pages);
await books.saveOfflineBook("book", "2", "Other chapter", [{ id: "two" }]);
assert.equal((await books.listOfflineBooks()).length, 2);
assert.deepEqual((await books.loadOfflineBook("book", "1")).pages, pages);
assert.equal(await books.loadOfflineBook("missing"), null);
assert.equal(await books.downloadBookAudio(pages), 1);
assert.equal(downloads.length, 1, "Duplicate URLs download once");
assert.match(books.offlineAudioUrl("/one.wav"), /^document/);
await books.downloadBookAudio(pages);
assert.equal(downloads.length, 1, "Already downloaded audio is reused");
books = load();
await books.loadOfflineAudio();
assert.match(books.offlineAudioUrl("/one.wav"), /^document/, "Download mapping survives restart");
files.clear();
assert.equal(books.offlineAudioUrl("/one.wav"), "/one.wav", "Missing files fall back to remote audio");
await assert.rejects(books.downloadBookAudio(Array.from({ length: 101 }, (_, i) => ({ audio_url: `/${i}.wav` }))), /smaller chapter/);
contentLength = 101 * 1024 * 1024;
await assert.rejects(books.downloadBookAudio([{ audio_url: "/large.wav" }]), /100 MB/);
contentLength = 0;
await assert.rejects(books.downloadBookAudio([{ audio_url: "/unknown.wav" }]), /unavailable/);
assert.equal((await books.loadOfflineBook("book", "1")).pages.length, 1, "Failed audio downloads retain text");
console.log("Offline reading PASS: chapter isolation, restart persistence, audio deduplication, missing files and download limits.");
