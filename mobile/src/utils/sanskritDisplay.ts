// Display-only normalization for sound rules. Never run over API payloads,
// answer values, search keys, URLs, or intentional IAST secondary labels.
const SOUNDS: Record<string, string> = {
  a: "अ", ā: "आ", i: "इ", ī: "ई", u: "उ", ū: "ऊ", ṛ: "ऋ", ṝ: "ॠ", ḷ: "ऌ",
  e: "ए", ai: "ऐ", o: "ओ", au: "औ", "aḥ": "अः", "e'": "एऽ", "o'": "ओऽ",
  k: "क्", kh: "ख्", g: "ग्", gh: "घ्", ṅ: "ङ्", c: "च्", ch: "छ्", j: "ज्", jh: "झ्", ñ: "ञ्",
  ṭ: "ट्", ṭh: "ठ्", ḍ: "ड्", ḍh: "ढ्", ṇ: "ण्", t: "त्", th: "थ्", d: "द्", dh: "ध्", n: "न्",
  p: "प्", ph: "फ्", b: "ब्", bh: "भ्", m: "म्", y: "य्", r: "र्", l: "ल्", v: "व्",
  ś: "श्", ṣ: "ष्", s: "स्", h: "ह्", "ṃ": "ं", "ḥ": "ः",
  ar: "अर्", ār: "आर्", ay: "अय्", av: "अव्", āy: "आय्", āv: "आव्", ya: "य", ye: "ये", rā: "रा", dbh: "द्भ्",
  "taḥ": "तः", nti: "न्ति", amī: "अमी", ita: "इत", aita: "ऐत",
};
const LETTERS = "A-Za-zĀāĪīŪūṚṛṜṝḶḷṄṅÑñṬṭḌḍṆṇŚśṢṣḤḥṂṃ";
const TOKEN = new RegExp(`[${LETTERS}]+(?:['’])?`, "g");

/** An explicitly labelled sound formula may freely mix English labels and
 * Sanskrit tokens: "prefix a + ṛ → ār" becomes "prefix अ + ऋ → आर्". */
export function devanagariFormula(formula: string): string {
  return formula.replace(TOKEN, (token) => {
    const normalized = token.replace("’", "'");
    return Object.hasOwn(SOUNDS, normalized) ? SOUNDS[normalized] : token;
  });
}

/** In general prose, only normalize operator-linked sound sequences. This
 * deliberately leaves English articles, pronouns, names and IAST alone. */
export function devanagariRules(text: string): string {
  const atom = `[${LETTERS}]+(?:['’])?`;
  const rule = new RegExp(`(?<![${LETTERS}])${atom}(?:\\s*[+→←=/|]\\s*${atom})+(?![${LETTERS}])`, "g");
  const convert = (value: string) => value.replace(rule, (match) => {
    const tokens = match.match(TOKEN) ?? [];
    return tokens.every((token) => Object.hasOwn(SOUNDS, token.replace("’", "'"))) ? devanagariFormula(match) : match;
  })
    .replace(/\b(short|long|final|initial|ordinary)\s+(a|ā|i|ī|u|ū|ṛ|ṝ|ḷ|e|ai|o|au)(?![A-Za-zāīūṛṝḷ])/g,
      (_, cue: string, sound: string) => `${cue} ${SOUNDS[sound]}`)
    .replace(/(?<![A-Za-zāīūṛṝḷ])(a|ā|i|ī|u|ū|ṛ|ṝ|ḷ|e|ai|o|au)\s+(or|and)\s+(a|ā|i|ī|u|ū|ṛ|ṝ|ḷ|e|ai|o|au)(?![A-Za-zāīūṛṝḷ])/g,
      (_, a: string, conjunction: string, b: string) => `${SOUNDS[a]} ${conjunction} ${SOUNDS[b]}`)
    .replace(/\b(a|ā|i|ī|u|ū|ṛ|ṝ|ḷ|e|ai|o|au)\s+(meeting|meets)\s+(a|ā|i|ī|u|ū|ṛ|ṝ|ḷ|e|ai|o|au)\s+(gives|produces)\s+(a|ā|i|ī|u|ū|ṛ|ṝ|ḷ|e|ai|o|au)(?![A-Za-zāīūṛṝḷ])/g,
      (_, a: string, meet: string, b: string, gives: string, result: string) => `${SOUNDS[a]} ${meet} ${SOUNDS[b]} ${gives} ${SOUNDS[result]}`);
  return text.split(/(https?:\/\/\S+|`[^`]*`)/g).map((part) => /^(https?:\/\/|`)/.test(part) ? part : convert(part)).join("");
}
