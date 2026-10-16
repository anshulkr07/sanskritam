// Render production card components for visual QA without signing into an
// account or writing learning progress. Run check-card-lessons.cjs first.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { execFileSync } = require('node:child_process');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { AppRegistry, Text } = require('react-native-web');
const root = path.resolve(__dirname, '..');
let lang = 'en';
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} }; cache.set(file, mod);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  function req(name) {
    if (name === 'react-native') return require('react-native-web');
    if (name === '@react-native-vector-icons/ionicons') return { Ionicons: () => null };
    if (name.endsWith('/hooks/useGuide')) return { useGuideLang: () => ({ lang, t: loc => loc ? loc[lang] || loc.en : '' }) };
    if (name.endsWith('/hooks/useTypeScale')) return { useTypeScale: () => ({ sized: n => n }) };
    if (name.endsWith('/services/haptics')) return { haptics: {} };
    if (name.endsWith('/services/speech')) return { playClip() {} };
    if (name.endsWith('/grammar/ProofPanel')) return { ProofBody: ({ proof }) => React.createElement(Text, null, proof.label[lang]) };
    if (!name.startsWith('.')) return require(name);
    const base = path.resolve(path.dirname(file), name);
    if (/\.(webp|png|jpg)$/.test(base)) return { uri: `data:image/${path.extname(base).slice(1)};base64,${fs.readFileSync(base).toString('base64')}` };
    for (const ext of ['.ts', '.tsx']) if (fs.existsSync(base + ext)) return load(base + ext);
    throw new Error(`Cannot load ${name}`);
  }
  new Function('require', 'module', 'exports', code)(req, mod, mod.exports);
  return mod.exports;
}
const { topicCards } = load(path.join(root, 'src/learnv2/guideCards.ts'));
const { getLearnV2Lesson } = load(path.join(root, 'src/learnv2/catalogue.ts'));
const Card = load(path.join(root, 'src/learnv2/LearnCard.tsx')).default;
const backend = path.resolve(root, '../backend');
const python = process.env.PYTHON ?? path.join(backend, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const fixture = JSON.parse(execFileSync(python, ['-c', 'from app.services.grammar_guide import _build; import json; print(json.dumps(_build(),ensure_ascii=False))'], {
  cwd: backend, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
}));
const vowels = topicCards(fixture.topics.vowels);
const example = (topic, sa) => topicCards(fixture.topics[topic]).find(c => c.example?.sa === sa);
const examples = process.env.LESSON_ART_QA ? [
  vowels[0], example('questions', 'तव नाम किम्'), example('questions', 'कः अस्ति'),
  example('questions', 'अपि त्वं गच्छसि'), example('participle-clauses', 'गुरौ आगते शिष्याः उत्तिष्ठन्ति'),
  example('numbers-1-10', 'त्रयाणाम्'), example('numbers-1-10', 'चतुर्षु'),
  example('consonant-stems', 'वाचा'), example('feminine-suffixes', 'जानकी'), vowels.find(c => c.practice),
] : [vowels[0], vowels.find(c => c.guide?.block), vowels.find(c => c.example),
  getLearnV2Lesson('sandhi-a-combinations').cards[0], vowels.find(c => c.practice)];
const pages = [];
for (const language of ['en', 'hi']) for (const card of examples) {
  lang = language;
  pages.push(`<section class="phone" lang="${lang}"><header>${lang === 'hi' ? 'पाठ कार्ड' : 'Lesson cards'} <span>${pages.length + 1}/${examples.length * 2}</span></header><main>${renderToStaticMarkup(React.createElement(Card, { card }))}</main><footer><button onclick="move(-1)">‹</button><button onclick="move(1)">${lang === 'hi' ? 'आगे' : 'Continue'}</button></footer></section>`);
}
AppRegistry.registerComponent('CardsQA', () => () => null);
const { getStyleElement } = AppRegistry.getApplication('CardsQA');
const styles = renderToStaticMarkup(getStyleElement());
function font(name, file) {
  return `@font-face{font-family:'${name}';src:url(data:font/ttf;base64,${fs.readFileSync(require.resolve(file)).toString('base64')})}`;
}
const fonts = [font('Mukta_400Regular', '@expo-google-fonts/mukta/400Regular/Mukta_400Regular.ttf'),
  font('Mukta_600SemiBold', '@expo-google-fonts/mukta/600SemiBold/Mukta_600SemiBold.ttf'),
  font('Mukta_700Bold', '@expo-google-fonts/mukta/700Bold/Mukta_700Bold.ttf'),
  font('TiroDevanagariSanskrit_400Regular', '@expo-google-fonts/tiro-devanagari-sanskrit/400Regular/TiroDevanagariSanskrit_400Regular.ttf')].join('');
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<style>${fonts}
body{margin:0;background:#e8e1d6;display:flex;justify-content:center;font-family:Mukta_400Regular}.phone{width:min(100vw,390px);height:100dvh;max-height:844px;display:none;flex-direction:column;background:#fff8ee}section:first-of-type{display:flex}header{display:flex;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #d8cbb7;color:#334d40}main{padding:16px;overflow-y:auto;flex:1}footer{padding:12px 16px;display:flex;gap:10px;border-top:1px solid #d8cbb7}footer>button{min-height:52px;border:1px solid #c3b7a3;background:#fff8ee;font:18px Mukta_600SemiBold;padding:0 20px}footer>button:last-child{flex:1;background:#9a4a26;color:white;border:0}
</style>${pages.join('')}<script>let at=0;const pages=[...document.querySelectorAll('section')];function move(n){pages[at].style.display='none';at=(at+n+pages.length)%pages.length;pages[at].style.display='flex'}</script>`;
const out = path.join(root, '.card-lessons-qa.html');
fs.writeFileSync(out, html);
console.log(`Rendered ${pages.length} production card views: ${out}`);
