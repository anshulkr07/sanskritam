// Verify the actual Android export, not just whether buttons are hidden.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";

const root = resolve(process.argv[2] || ".expo/free-launch-final");
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]);
}
const entries = files(root);
const map = JSON.parse(readFileSync(entries.find(p => p.endsWith(".hbc.map")), "utf8"));
const excluded = ["/src/community/", "/src/voiceLab/", "/services/commerce.", "/services/ads.", "/services/storePurchases.", "/screens/Membership.", "/screens/Contest.", "/screens/VoiceSession.", "react-native-iap/", "react-native-google-mobile-ads/", "@stream-io/"];
for (const name of excluded) assert.ok(!map.sources.some(p => p.replaceAll("\\", "/").includes(name)), `Deferred source in bundle: ${name}`);
const bundle = readFileSync(entries.find(p => p.endsWith(".hbc")));
for (const path of ["/commerce/", "/voice-lab/", "/community/", "/competitions/"]) assert.ok(!bundle.includes(Buffer.from(path)), `Deferred API path in bundle: ${path}`);
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
for (const name of ["react-native-iap", "react-native-google-mobile-ads", "@stream-io/video-react-native-sdk", "@stream-io/react-native-webrtc", "@config-plugins/react-native-webrtc"]) assert.ok(!pkg.dependencies[name], `Deferred native dependency: ${name}`);
console.log(JSON.stringify({ source_modules: map.sources.length, hermes_bytes: bundle.length, sha256: createHash("sha256").update(bundle).digest("hex"), deferred_code_found: false }));
