// Exercise the actual new UI with isolated local storage and mocked APIs.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const profile = fs.mkdtempSync(path.join(os.tmpdir(), "daily-loop-qa-"));
const chrome = process.env.VOICE_QA_CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = spawn(chrome, ["--headless=new", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
try {
  const portFile = path.join(profile, "DevToolsActivePort");
  for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await sleep(100);
  assert.ok(fs.existsSync(portFile), "Headless browser must start");
  const port = fs.readFileSync(portFile, "utf8").split("\n")[0];
  const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" }).then(r => r.json());
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener("open", resolve, { once: true }));
  let id = 0;
  const pending = new Map();
  socket.onmessage = event => {
    const message = JSON.parse(String(event.data));
    if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
  };
  const call = async (method, params = {}) => {
    const key = ++id;
    let timeout;
    const response = new Promise(resolve => pending.set(key, resolve));
    socket.send(JSON.stringify({ id: key, method, params }));
    const message = await Promise.race([response, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error(`Timeout: ${method}`)), 60000); })]).finally(() => clearTimeout(timeout));
    if (message.error || message.result?.exceptionDetails) throw new Error(JSON.stringify(message.error || message.result.exceptionDetails));
    return message.result;
  };
  const evaluate = async expression => (await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.value;
  await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await call("Page.navigate", { url: "http://localhost:8084/daily-loop-preview.html" });
  for (let i = 0; i < 240 && !await evaluate("!!document.querySelector('[aria-label=\"Speak Sanskrit\"]')"); i++) await sleep(500);
  assert.ok(await evaluate("!!document.querySelector('[aria-label=\"Speak Sanskrit\"]')"), await evaluate("document.body.innerText"));
  await evaluate("document.querySelector('[aria-label=\"Speak Sanskrit\"]').click()");
  await sleep(300);
  assert.ok(await evaluate("document.body.innerText.includes('3 due for review')"));
  await evaluate("document.querySelector('[aria-label=\"Continue your learning\"]').click()");
  assert.ok(await evaluate("document.body.innerText.includes('LearnV2Lesson')"));
  await evaluate("document.querySelector('[aria-label=\"Preview audio controls\"]').click()");
  await sleep(100);
  await evaluate("document.querySelector('[aria-label=\"Pause audio\"]').click()");
  assert.ok(await evaluate("!!document.querySelector('[aria-label=\"Resume audio\"]')"));
  const layout = await evaluate(`(() => {
    let el = document.querySelector('[aria-label="Resume audio"]');
    const rows = [];
    while (el) { const r = el.getBoundingClientRect(); rows.push({tag:el.tagName, height:r.height, top:r.top, bottom:r.bottom, position:getComputedStyle(el).position}); el=el.parentElement; }
    return rows;
  })()`);
  assert.ok(layout[0].top > 422 && layout[0].bottom < 844, "Audio controls stay visible near the bottom of the phone");
  const out = path.resolve("../results/beta-20261015");
  fs.mkdirSync(out, { recursive: true });
  const shot = await call("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(out, "daily-loop-phone.png"), Buffer.from(shot.data, "base64"));
  await evaluate("document.querySelector('[aria-label=\"Minimize audio player\"]').click()");
  assert.ok(await evaluate("!!document.querySelector('[aria-label=\"Expand audio player\"]')"));
  await evaluate("document.querySelector('[aria-label=\"Resume audio\"]').click()");
  assert.ok(await evaluate("!!document.querySelector('[aria-label=\"Pause audio\"]')"));
  await evaluate("document.querySelector('[aria-label=\"Expand audio player\"]').click()");
  assert.ok(await evaluate("document.body.innerText.includes('Sanskrit reading')"));
  await evaluate("document.querySelector('[aria-label=\"Preview native dialog\"]').click()");
  await sleep(350);
  assert.ok(await evaluate(`(() => {
    const el = [...document.querySelectorAll('[aria-label="Pause audio"]')].at(-1);
    const r = el?.getBoundingClientRect();
    return r && r.top > 0 && r.bottom < 844 && el.contains(document.elementFromPoint(r.x + 20, r.y + 20));
  })()`), "Native dialog exposes its own accessible audio controls above its content");
  await evaluate("[...document.querySelectorAll('[aria-label=\"Pause audio\"]')].at(-1).click()");
  assert.ok(await evaluate("!!document.querySelector('[aria-label=\"Resume audio\"]')"));
  await evaluate("document.querySelector('[aria-label=\"Close preview dialog\"]').click()");
  console.log("Daily loop browser PASS: goal selection, real review count, lesson navigation and floating audio pause/resume/minimize/expand at 390px.");
} finally {
  socket?.close(); browser.kill();
  await sleep(250);
  const resolved = path.resolve(profile);
  if (resolved.startsWith(path.resolve(os.tmpdir()) + path.sep + "daily-loop-qa-")) {
    try { fs.rmSync(resolved, { recursive: true, force: true }); } catch { /* Chromium may still be releasing files */ }
  }
}
