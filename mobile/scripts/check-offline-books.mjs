// End-to-end offline storage using Node's real AES-GCM as the native crypto adapter.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
const require = createRequire(import.meta.url), ts = require("typescript");
const stored = new Map(), secure = new Map(), files = new Map();
let downloads = 0, contentLength = 1024;
const recording = Buffer.from("RIFF private paid recording ".repeat(35));
class File {
  constructor(...parts) { this.uri = parts.map(p => p.uri ?? p).join("/"); }
  get exists() { return files.has(this.uri); }
  write(bytes) { files.set(this.uri, Buffer.from(bytes)); }
  async bytes() { return new Uint8Array(files.get(this.uri)); }
  delete() { files.delete(this.uri); }
}
class Directory {
  constructor(...parts) { this.uri = parts.map(p => p.uri ?? p).join("/"); }
  create() {}
  list() { return [...files.keys()].filter(p => p.startsWith(this.uri + "/")).map(p => new File(p)); }
}
const storage = {
  async getItem(k) { return stored.get(k) ?? null; }, async setItem(k,v) { stored.set(k,v); }, async removeItem(k) { stored.delete(k); },
  async getAllKeys() { return [...stored.keys()]; }, async multiGet(keys) { return keys.map(k => [k,stored.get(k) ?? null]); },
};
class Key {
  constructor(bytes) { this.value = Buffer.from(bytes); }
  static async generate() { return new Key(randomBytes(32)); }
  static async import(value, encoding) { return new Key(Buffer.from(value, encoding)); }
  async encoded(encoding) { return this.value.toString(encoding); }
}
const crypto = {
  AESEncryptionKey: Key, AESSealedData: { fromCombined: bytes => Buffer.from(bytes) },
  CryptoDigestAlgorithm: { SHA256: "sha256" }, digestStringAsync: async (algo,s) => createHash(algo).update(s).digest("hex"), randomUUID,
  async aesEncryptAsync(bytes,key) { const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm",key.value,iv); const data = Buffer.concat([cipher.update(bytes),cipher.final()]); return { combined: async () => Buffer.concat([iv,data,cipher.getAuthTag()]) }; },
  async aesDecryptAsync(data,key) { const decipher = createDecipheriv("aes-256-gcm",key.value,data.subarray(0,12)); decipher.setAuthTag(data.subarray(-16)); return new Uint8Array(Buffer.concat([decipher.update(data.subarray(12,-16)),decipher.final()])); },
};
const modules = {
  "@react-native-async-storage/async-storage": { __esModule:true,default:storage },
  "expo-file-system": { File,Directory,Paths:{document:"document",cache:"cache"} },
  "expo-crypto": crypto,
  "expo-secure-store": { AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1, getItemAsync: async k => secure.get(k) ?? null, setItemAsync: async (k,v) => secure.set(k,v) },
  "react-native": { Platform:{OS:"android"} }, "../config": { BASE_URL:"https://test.invalid" },
};
function load(name) {
  const js=ts.transpileModule(readFileSync(new URL(`../src/services/${name}.ts`,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};
  new Function("require","module","exports","fetch",js)(specifier => { assert.ok(specifier in modules,specifier);return modules[specifier]; },module,module.exports,
    async (url,opts) => { if(opts?.method !== "HEAD") downloads++;return {ok:true,headers:{get:()=>String(contentLength)},arrayBuffer:async()=>recording}; });
  return module.exports;
}
let vault=load("protectedAudio"); modules["./protectedAudio"]=vault;
const books=load("offlineBooks");
vault.setOfflineAudioOwner("reader-a");
await assert.rejects(books.saveOfflineBook("empty",null,"Empty",[]));
const pages=[{id:"one",devanagari:"source text",chant:{url:"/one.wav"},audio_url:"/one.wav"}];
await books.saveOfflineBook("book","1","Saved chapter",pages);
await books.saveOfflineBook("book","2","Other chapter",[{id:"two"}]);
assert.equal((await books.listOfflineBooks()).length,2);
assert.deepEqual((await books.loadOfflineBook("book","1")).pages,pages);
await Promise.all([books.downloadBookAudio(pages),books.downloadBookAudio(pages)]);
assert.equal(downloads,1,"Concurrent duplicate downloads share the encrypted recording");
const encrypted=[...files.keys()].find(k=>k.endsWith(".sba"));
assert.ok(encrypted);assert.ok(!files.get(encrypted).includes(Buffer.from("private paid recording")),"Persistent audio is ciphertext");
assert.ok(![...stored.values()].some(v=>[...secure.values()].some(key=>v.includes(key))),"Keys never enter normal storage");
const lease=await vault.resolveOfflineAudio("/one.wav");
assert.match(lease.uri,/^cache\/protected-audio-playback\//);
assert.deepEqual(files.get(lease.uri),recording);
lease.release();assert.ok(!files.has(lease.uri),"Playback plaintext is removed on release");
vault=load("protectedAudio");vault.setOfflineAudioOwner("reader-a");await vault.loadOfflineAudio();
const restarted=await vault.resolveOfflineAudio("https://test.invalid/one.wav");assert.deepEqual(files.get(restarted.uri),recording);
vault.setOfflineAudioOwner("reader-b");assert.ok(!files.has(restarted.uri),"Account switches clean playback plaintext");
assert.equal((await vault.resolveOfflineAudio("/one.wav")).uri,"/one.wav","Another account cannot open this download");
vault.setOfflineAudioOwner("reader-a");await vault.loadOfflineAudio();
const bytes=files.get(encrypted);files.set(encrypted,Buffer.from(bytes));files.get(encrypted)[16]^=1;
await assert.rejects(vault.resolveOfflineAudio("/one.wav"),undefined,"Tampered ciphertext fails authentication");files.set(encrypted,bytes);
vault.setOfflineAudioOwner(null);assert.equal((await vault.resolveOfflineAudio("/one.wav")).uri,"/one.wav","Signed-out sessions cannot decrypt");
// Historical downloads are migrated without leaving their plaintext copy.
files.set("document/reading-audio/old.audio",recording);stored.set("shabd.offline.audio.v1",JSON.stringify({"/old.wav":"document/reading-audio/old.audio"}));
vault.setOfflineAudioOwner("reader-a");await vault.loadOfflineAudio();assert.ok(!files.has("document/reading-audio/old.audio"));
const migrated=await vault.resolveOfflineAudio("/old.wav");assert.deepEqual(files.get(migrated.uri),recording);migrated.release();
await assert.rejects(books.downloadBookAudio(Array.from({length:101},(_,i)=>({audio_url:`/${i}.wav`}))),/smaller chapter/);
contentLength=101*1024*1024;await assert.rejects(books.downloadBookAudio([{audio_url:"/large.wav"}]),/100 MB/);
contentLength=0;await assert.rejects(books.downloadBookAudio([{audio_url:"/unknown.wav"}]),/unavailable/);
assert.equal((await books.loadOfflineBook("book","1")).pages.length,1);
console.log("Offline reading PASS: real AES-256-GCM round-trip and tamper rejection, secure keys, restart, account isolation, playback cleanup, plaintext migration, deduplication and limits.");
