// The Voice companions catalogue, checked against the server's own limits.
//
// companions.ts is presentation plus a LabConfig, so the one thing that can
// break a call is a preset the backend would reject (backend/app/voice_lab/
// config.py forbids extra keys and validates every field) or a speaker the
// chosen pipeline does not have. This runs the real module and asserts:
// unique ids, Devanagari names, complete groups, sayings, and — through the
// module's own presetFor() — a valid config for every companion.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");

function resolveVoice(file) {
  const local = new URL(file, import.meta.url);
  if (fs.existsSync(local)) return local;
  const deferred = new URL(`../../deferred/mobile/${file.replace(/^\.\.\//, "")}`, import.meta.url);
  if (fs.existsSync(deferred)) return deferred;
  return null;
}

function load(relative, requires = {}) {
  const target = resolveVoice(relative);
  if (!target) {
    console.log(`Voice module ${relative} not present (deferred); skipping voice companions check.`);
    process.exit(0);
  }
  const source = fs.readFileSync(target, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  const local = id => {
    if (id in requires) return requires[id];
    throw new Error(`unexpected import ${id} in ${relative}`);
  };
  vm.runInNewContext(compiled, { module, exports: module.exports, require: local, console, Map, Set, Object, Array, JSON, Math, Number, String });
  return module.exports;
}

const config = load("../src/voiceLab/config.ts");
const { VOICE_CATEGORIES, COMPANION_COUNT, presetFor, roleParts } = load("../src/voiceLab/companions.ts", {
  "./config": config,
});

// The server's own enums and bounds (backend/app/voice_lab/config.py).
const PERSONAS = ["guru", "mother", "friend", "scholar"];
const LANGUAGES = ["sa-IN", "hi-IN", "te-IN", "kn-IN", "mr-IN"];
const TTS = ["bulbul:v3", "bulbul:v4-flash"];
const LLM = ["sarvam-105b-conversations", "sarvam-105b", "gemma4", "deepseekv4.1-flash", "glm5.3"];
const OPEN = ["edge_tts_prosody", "ai4bharat_indic_parler"];
const LIVE = ["gemini-3.8-live", "gemini-3.1-flash-live-preview", "gemini-2.5-flash-native-audio-preview-12-2025"];
const TONES = ["saffron", "teal", "sage", "rose", "gold", "slate", "ink", "maroon", "ok", "bad"];
const DEVANAGARI = /[\u0900-\u097F]/;
const between = (value, low, high) => typeof value === "number" && value >= low && value <= high;

assert.ok(VOICE_CATEGORIES.length >= 6, "the hub needs the owner's groups: yoga, ayurveda, guru, astrology, history, friend, and more");
assert.equal(COMPANION_COUNT, VOICE_CATEGORIES.reduce((total, category) => total + category.people.length, 0));

const categoryIds = new Set();
const companionIds = new Set();
const roles = new Set();
let friends = 0;

for (const category of VOICE_CATEGORIES) {
  assert.ok(!categoryIds.has(category.id), `duplicate group id ${category.id}`);
  categoryIds.add(category.id);
  assert.ok(DEVANAGARI.test(category.deva), `${category.id}: the group name must be Devanagari`);
  assert.ok(category.en && category.hook && category.intro.length > 60, `${category.id}: needs a name, a hook and a real intro`);
  assert.ok(TONES.includes(category.tone), `${category.id}: ${category.tone} is not a fill tone`);
  assert.ok(category.people.length >= 3, `${category.id}: a group needs at least three companions`);
  assert.ok(category.sayings.length >= 3, `${category.id}: give the learner three or four lines to try`);
  assert.ok(!category.sayings.some(saying => !DEVANAGARI.test(saying.sa) || !saying.en || DEVANAGARI.test(saying.en)),
    `${category.id}: every saying is Devanagari, with a plain-English gloss and no Devanagari in the gloss`);
  assert.equal(new Set(category.sayings.map(saying => saying.sa)).size, category.sayings.length, `${category.id}: sayings repeat`);

  const emotions = new Set();
  for (const companion of category.people) {
    const where = `${category.id}/${companion.id}`;
    assert.ok(!companionIds.has(companion.id), `duplicate companion id ${companion.id}`);
    companionIds.add(companion.id);
    if (category.id === "mitra") friends += 1;

    assert.ok(DEVANAGARI.test(companion.deva), `${where}: the name must be Devanagari`);
    assert.ok(/^[A-Za-z\u00C0-\u024F\u1E00-\u1EFF .'-]+$/.test(companion.roman), `${where}: the Roman name is IAST Latin, not Devanagari`);
    const role = roleParts(companion.role);
    assert.ok(DEVANAGARI.test(role.sa) && role.en && !roles.has(companion.role), `${where}: needs a fresh "devanagari · english" role`);
    roles.add(companion.role);
    assert.ok(companion.quality.length > 24, `${where}: the quality line says what makes them themselves`);
    assert.ok(companion.voice.length >= 2 && companion.voice.length <= 3, `${where}: two or three voice chips`);

    assert.ok(!emotions.has(companion.config.emotion), `${where}: two companions in one group share a manner`);
    emotions.add(companion.config.emotion);

    // The preset a call actually opens with: server-valid, and speaking with
    // a voice its pipeline really has.
    const preset = presetFor(companion);
    assert.ok([1, 2, 3, 4].includes(preset.pipeline), `${where}: pipeline`);
    assert.ok(PERSONAS.includes(preset.persona), `${where}: persona must be one the server knows`);
    assert.ok(config.voices(preset).includes(preset.speaker), `${where}: ${preset.speaker} is not a ${preset.pipeline} voice`);
    assert.ok(LANGUAGES.includes(preset.language), `${where}: language`);
    assert.ok(TTS.includes(preset.tts_model) && LLM.includes(preset.llm_model) && OPEN.includes(preset.open_provider) && LIVE.includes(preset.live_model),
      `${where}: model names`);
    assert.ok(between(preset.pace, 0.5, 2) && between(preset.pitch, -12, 12) && between(preset.loudness, 0.3, 2), `${where}: voice ranges`);
    assert.ok(between(preset.temperature, 0.1, 1) && between(preset.thinking_budget, 0, 4096), `${where}: reply ranges`);
    assert.ok(preset.emotion.length > 0 && preset.emotion.length <= 160, `${where}: emotion must fit the server's 160 characters`);
    if (preset.pipeline === 3) assert.equal(preset.pitch, 0, `${where}: the native voice ignores pitch`);
    if (preset.pipeline === 4) assert.ok(preset.web_search, `${where}: pipeline 4 exists for its search grounding`);
    if (preset.pipeline === 3 || preset.pipeline === 4) assert.ok(preset.thinking_budget >= 0, `${where}: thinking budget`);
  }
}

assert.equal(friends, 5, "the owner's Friend group holds five companions");
assert.ok(companionIds.size >= 20, "the catalogue is meant to be a real choice, not a placeholder");

// The same speaker may return in another group, but never with the same
// combination of voice, pace and pitch: two companions would then be twins.
const voicesSeen = new Map();
for (const category of VOICE_CATEGORIES) {
  for (const companion of category.people) {
    const preset = presetFor(companion);
    const key = `${preset.pipeline}:${preset.speaker}:${preset.pace}:${preset.pitch}`;
    assert.ok(!voicesSeen.has(key), `${companion.id} sounds exactly like ${voicesSeen.get(key)}`);
    voicesSeen.set(key, companion.id);
  }
}

console.log(`Voice companions: ${COMPANION_COUNT} across ${VOICE_CATEGORIES.length} groups, every preset a call the server will accept.`);
