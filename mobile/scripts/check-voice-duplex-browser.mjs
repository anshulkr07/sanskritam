// Actual Chromium WebRTC/Opus/PCM integration, using its synthetic microphone.
// No phone microphone or user browser profile is opened.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url), ts = require("typescript");
function readModule(file, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  // Only load the self-contained HTML builders; no application/browser state.
  new Function("exports", "require", code)(exports, name => mocks[name]);
  return exports;
}
const runtime = readModule("../src/voiceLab/audioRuntime.ts");
const { DUPLEX_HTML } = readModule("../src/voiceLab/duplexRuntime.ts", { "./audioRuntime": runtime });
const html = DUPLEX_HTML.replace("<script>", "<script>window.messages=[];window.ReactNativeWebView={postMessage:raw=>window.messages.push(JSON.parse(raw))};");
const server = http.createServer((req, res) => { res.setHeader("Content-Type", "text/html"); res.end(html); });
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "voice-duplex-qa-"));
const chrome = process.env.VOICE_QA_CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = spawn(chrome, ["--headless=new", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required", "about:blank"], { windowsHide: true, stdio: "ignore" });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
try {
  const portFile = path.join(profile, "DevToolsActivePort");
  for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await sleep(100);
  assert.ok(fs.existsSync(portFile), "Chromium must start its test debug endpoint");
  const port = fs.readFileSync(portFile, "utf8").split("\n")[0];
  const tab = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(`http://127.0.0.1:${server.address().port}/`)}`, { method: "PUT" })).json();
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let nextId = 0; const requests = new Map();
  socket.onmessage = event => {
    const message = JSON.parse(String(event.data));
    if (requests.has(message.id)) { requests.get(message.id)(message); requests.delete(message.id); }
  };
  async function evaluate(expression) {
    const id = ++nextId;
    const response = new Promise(resolve => requests.set(id, resolve));
    socket.send(JSON.stringify({ id, method: "Runtime.evaluate", params: { expression, awaitPromise: true, returnByValue: true } }));
    let timer;
    const message = await Promise.race([response, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Browser audio check timed out")), 15000); })]).finally(() => clearTimeout(timer));
    if (message.result?.exceptionDetails) throw new Error(JSON.stringify(message.result.exceptionDetails));
    return message.result?.result?.value;
  }
  for (let i = 0; i < 100 && !await evaluate("typeof window.voiceLabDuplexCommand==='function'"); i++) await sleep(100);
  await evaluate("window.voiceLabDuplexCommand({type:'capture_start',id:1})");
  for (let i = 0; i < 80 && !await evaluate("window.messages.some(m=>m.voiceLabCaptureStarted===1||m.voiceLabCaptureError===1)"); i++) await sleep(100);
  const status = await evaluate("({messages:window.messages.filter(m=>!m.voiceLabCaptureFrame),states:duplex&&[duplex.near.connectionState,duplex.far.connectionState],settings:duplex&&duplex.media.getAudioTracks()[0].getSettings()})");
  assert.ok(status.messages.some(m => m.voiceLabCaptureStarted === 1), JSON.stringify(status));
  assert.deepEqual(status.states, ["connected", "connected"]);
  assert.equal(status.settings.echoCancellation, true);
  await sleep(600);
  const frames = await evaluate("window.messages.filter(m=>m.voiceLabCaptureFrame===1).map(m=>({bytes:atob(m.data).length,rate:m.sampleRate,echo:m.echoCancelled}))");
  assert.ok(frames.length >= 3, "Processed microphone packets must keep arriving");
  assert.ok(frames.every(f => f.bytes === 3200 && f.rate === 16000 && f.echo));
  const pcm = Buffer.alloc(48000 * 2);
  for (let i = 0; i < pcm.length / 2; i++) pcm.writeInt16LE(Math.round(10000 * Math.sin(2 * Math.PI * 550 * i / 24000)), i * 2);
  await evaluate(`window.voiceLabCommand({type:'audio',codec:'pcm',sample_rate:24000,data:'${pcm.toString("base64")}'})`);
  await sleep(900);
  const energy = await evaluate("(async()=>{let energy=0;for(const s of (await duplex.near.getStats()).values())if(s.type==='inbound-rtp'&&s.kind==='audio')energy+=s.totalAudioEnergy||0;return energy;})()");
  assert.ok(energy > 0, "AI PCM must reach the remote WebRTC playout track");
  const before = await evaluate("window.messages.filter(m=>m.voiceLabCaptureFrame===1).length");
  await evaluate("window.voiceLabCommand({type:'stop'})"); await sleep(500);
  assert.ok(await evaluate("window.messages.filter(m=>m.voiceLabCaptureFrame===1).length") > before, "Stopping AI playback must keep the microphone running");
  await evaluate("window.voiceLabDuplexCommand({type:'capture_stop'})");
  assert.equal(await evaluate("duplex===null"), true);
  await evaluate("window.voiceLabDuplexCommand({type:'capture_start',id:2})");
  for (let i = 0; i < 80 && !await evaluate("window.messages.some(m=>m.voiceLabCaptureStarted===2||m.voiceLabCaptureError===2)"); i++) await sleep(100);
  assert.ok(await evaluate("window.messages.some(m=>m.voiceLabCaptureStarted===2)"), "A second call must initialize cleanly");
  await evaluate("window.voiceLabDuplexCommand({type:'capture_stop'})");
  const cancelled = await evaluate(`(async()=>{
    const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    let release,late;
    navigator.mediaDevices.getUserMedia=async constraints=>{late=await original(constraints);await new Promise(resolve=>release=resolve);return late;};
    const pending=window.voiceLabDuplexCommand({type:'capture_start',id:3});
    while(!release)await new Promise(resolve=>setTimeout(resolve,20));
    await window.voiceLabDuplexCommand({type:'capture_stop',id:3});release();await pending;
    navigator.mediaDevices.getUserMedia=original;
    return duplex===null&&late.getTracks().every(track=>track.readyState==='ended');
  })()`);
  assert.ok(cancelled, "Cancelling delayed microphone permission must release the late stream");
  console.log(`Chromium duplex PASS: local peers connected, processed PCM (${frames.length} packets), AI playout energy, interruption without capture loss, cleanup and restart.`);
} finally {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ id: 999999, method: "Browser.close" }));
  await Promise.race([new Promise(resolve => browser.once("exit", resolve)), sleep(2000)]);
  socket?.close(); if (browser.exitCode === null) browser.kill(); server.close();
}
