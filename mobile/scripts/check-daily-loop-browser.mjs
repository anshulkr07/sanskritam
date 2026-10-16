// Exercise the actual new UI with isolated local storage and mocked APIs.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

// Node 20 (the CI runner) has no global WebSocket; Chromium's DevTools endpoint
// needs one. Metro already ships ws, so fall back to it when the global is absent.
const WebSocketImpl = globalThis.WebSocket ?? createRequire(import.meta.url)("ws");

// Resolve a Chromium binary per platform: no machine-specific path is baked in,
// so the same script runs on Windows dev machines, macOS and CI Linux runners.
function firstExisting(candidates) {
  return candidates.find(candidate => { try { return fs.statSync(candidate).isFile(); } catch { return false; } });
}

function getChromePath() {
  if (process.env.VOICE_QA_CHROME) return process.env.VOICE_QA_CHROME;
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const names = ["google-chrome", "google-chrome-stable", "chrome", "chromium", "chromium-browser"];
  const scanPath = () => firstExisting((process.env.PATH || "").split(path.delimiter).filter(Boolean)
    .flatMap(dir => names.map(name => path.join(dir, name))));
  if (process.platform === "win32") {
    const dirs = [process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA].filter(Boolean);
    return firstExisting([
      ...dirs.map(dir => path.join(dir, "Google", "Chrome", "Application", "chrome.exe")),
      ...dirs.map(dir => path.join(dir, "Microsoft", "Edge", "Application", "msedge.exe")),
    ]) ?? null;
  }
  if (process.platform === "darwin") {
    return firstExisting([
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ]) ?? scanPath() ?? null;
  }
  const dirs = ["/usr/bin", "/usr/local/bin", "/snap/bin", "/opt/google/chrome", path.join(os.homedir(), ".local", "bin")];
  return firstExisting(dirs.flatMap(dir => names.map(name => path.join(dir, name)))) ?? scanPath() ?? null;
}

// In CI or environments without the preview server running on port 8084, skip cleanly.
try {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  const res = await fetch("http://localhost:8084/daily-loop-preview.html", { signal: ctrl.signal });
  clearTimeout(t);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
} catch (e) {
  console.log(`Daily loop preview server not running on localhost:8084; skipping interactive browser QA (${e.message || e.code}).`);
  process.exit(0);
}

const chrome = getChromePath();
if (!chrome || (path.isAbsolute(chrome) && !fs.existsSync(chrome))) {
  console.log(`Chrome/Chromium not found (${chrome || "no known install location"}); set VOICE_QA_CHROME to a browser binary to run the interactive QA. Skipping.`);
  process.exit(0);
}
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "daily-loop-qa-"));
const browser = spawn(chrome, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--no-first-run",
  "--no-default-browser-check",
  "--remote-debugging-port=0",
  "--autoplay-policy=no-user-gesture-required",
  `--user-data-dir=${profile}`,
  "about:blank",
], { windowsHide: true, stdio: "ignore" });
browser.on("error", err => {
  console.warn(`Browser process error (${chrome}):`, err.message);
});
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
try {
  const portFile = path.join(profile, "DevToolsActivePort");
  for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await sleep(100);
  assert.ok(fs.existsSync(portFile), "Headless browser must start");
  const port = fs.readFileSync(portFile, "utf8").split("\n")[0];
  const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" }).then(r => r.json());
  socket = new WebSocketImpl(target.webSocketDebuggerUrl);
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
  // The floating bar is the app's MiniPlayer on the shared listen transport, so
  // it appears when a verse starts sounding and drives the real chant session.
  assert.ok(!await evaluate("!!document.querySelector('[aria-label=\"Pause\"]')"), "No floating player before a verse sounds");
  await evaluate("document.querySelector('[aria-label=\"Preview audio controls\"]').click()");
  for (let i = 0; i < 60 && !await evaluate("!!document.querySelector('[aria-label=\"Pause\"]')"); i++) await sleep(250);
  assert.ok(await evaluate("!!document.querySelector('[aria-label=\"Pause\"]')"), await evaluate("document.body.innerText"));
  const layout = await evaluate(`(() => {
    const r = document.querySelector('[aria-label="Pause"]').getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
  })()`);
  assert.ok(layout.top > 422 && layout.bottom < 844 && layout.left >= 0 && layout.right <= 390, "Floating player stays visible near the bottom of the phone");
  const out = path.resolve("../results/beta-20261015");
  fs.mkdirSync(out, { recursive: true });
  const shot = await call("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(out, "daily-loop-phone.png"), Buffer.from(shot.data, "base64"));
  assert.ok(await evaluate("document.body.innerText.includes('Sanskrit reading')"), "The bar names the sounding session");
  await evaluate("document.querySelector('[aria-label=\"Pause\"]').click()");
  await sleep(200);
  assert.ok(await evaluate("!!document.querySelector('[aria-label=\"Play\"]')"), "Pausing the chant flips the bar to Play");
  await evaluate("document.querySelector('[aria-label=\"Play\"]').click()");
  for (let i = 0; i < 40 && !await evaluate("!!document.querySelector('[aria-label=\"Pause\"]')"); i++) await sleep(250);
  assert.ok(await evaluate("!!document.querySelector('[aria-label=\"Pause\"]')"), "Resuming the chant flips the bar back to Pause");
  await evaluate("document.querySelector('[aria-label=\"Tuck audiobook player to screen edge\"]').click()");
  assert.ok(await evaluate("!!document.querySelector('[aria-label=\"Restore audiobook player\"]')"));
  assert.ok(!await evaluate("!!document.querySelector('[aria-label=\"Pause\"]')"), "A tucked player leaves only its edge tab");
  await evaluate("document.querySelector('[aria-label=\"Restore audiobook player\"]').click()");
  assert.ok(await evaluate("!!document.querySelector('[aria-label=\"Pause\"]')"));
  await evaluate("document.querySelector('[aria-label=\"Preview native dialog\"]').click()");
  await sleep(350);
  assert.ok(await evaluate(`(() => {
    const el = [...document.querySelectorAll('[aria-label="Pause"]')].at(-1);
    const r = el?.getBoundingClientRect();
    return !!r && r.top > 0 && r.bottom < 844 && el.contains(document.elementFromPoint(r.x + 20, r.y + 20));
  })()`), "The dialog carries its own floating player above its content");
  await evaluate("[...document.querySelectorAll('[aria-label=\"Pause\"]')].at(-1).click()");
  await evaluate("document.querySelector('[aria-label=\"Close preview dialog\"]').click()");
  await sleep(200);
  assert.ok(await evaluate("!!document.querySelector('[aria-label=\"Play\"]')"), "Pausing inside the dialog pauses the same chant");
  console.log("Daily loop browser PASS: goal selection, real review count, lesson navigation, and the shared floating player's pause/resume, tuck/restore and dialog controls at 390px.");
} finally {
  socket?.close(); browser.kill();
  await sleep(250);
  const resolved = path.resolve(profile);
  if (resolved.startsWith(path.resolve(os.tmpdir()) + path.sep + "daily-loop-qa-")) {
    try { fs.rmSync(resolved, { recursive: true, force: true }); } catch { /* Chromium may still be releasing files */ }
  }
}
