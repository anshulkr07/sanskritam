// Regional month and weekday names, for the card's "My script" setting.
//
// Every string here is as Drik Panchang prints it on its own pages in that
// language (drikpanchang.com with lang=ta, ml, bn and gu; read 2026-10-02).
// The lists were compared with those pages by a hash of their code points,
// taken in the page and here, so no name was checked by eye or retyped:
// scripts/check-kala.mjs keeps the hashes.
//
//   Tamil      twelve months, seven weekdays           exact
//   Malayalam  twelve months                           exact
//              seven weekdays: the almanac prints the older spelling with a
//              consonant and a virama (ഞായര്); these are the same words
//              with the chillu letters now standard (ഞായർ)
//   Bengali    twelve months, seven weekdays           exact
//   Gujarati   twelve months, seven weekdays, સુદ, વદ, અધિક and the fifteen
//              tithi names of a half                   exact
//
// The roman month names are the spellings of the same almanac's English
// pages. NOT yet read by a native speaker of any of the four languages: that
// is the check still owed.
//
// Nakshatra and year names are deliberately absent. Until someone who reads
// the script has checked a list, the card shows those in roman.

export type RegionalScript = "gujarati" | "tamil" | "malayalam" | "bengali";

/** Solar months by the Sun's sign, 0 = Mesha (the month that opens in April). */
export const SOLAR_MONTHS: Record<"tamil" | "malayalam" | "bengali", { native: string[]; roman: string[] }> = {
  tamil: {
    native: ["சித்திரை", "வைகாசி", "ஆனி", "ஆடி", "ஆவணி", "புரட்டாசி", "ஐப்பசி", "கார்த்திகை", "மார்கழி", "தை", "மாசி", "பங்குனி"],
    roman: ["Chithirai", "Vaikaasi", "Aani", "Aadi", "Aavani", "Purattaasi", "Aippasi", "Karthikai", "Maargazhi", "Thai", "Maasi", "Panguni"],
  },
  malayalam: {
    native: ["മേടം", "ഇടവം", "മിഥുനം", "കർക്കടകം", "ചിങ്ങം", "കന്നി", "തുലാം", "വൃശ്ചികം", "ധനു", "മകരം", "കുംഭം", "മീനം"],
    roman: ["Medam", "Edavam", "Mithunam", "Karkadakam", "Chingam", "Kanni", "Thulam", "Vrishchikam", "Dhanu", "Makaram", "Kumbham", "Meenam"],
  },
  bengali: {
    native: ["বৈশাখ", "জ্যৈষ্ঠ", "আষাঢ়", "শ্রাবণ", "ভাদ্র", "আশ্বিন", "কার্তিক", "অগ্রহায়ণ", "পৌষ", "মাঘ", "ফাল্গুন", "চৈত্র"],
    roman: ["Boishakh", "Joishtho", "Asharh", "Srabon", "Bhadro", "Ashshin", "Kartik", "Ogrohaeon", "Poush", "Magh", "Falgun", "Choitro"],
  },
};

/** Gujarati lunar months, 0 = Chaitra. */
export const GUJARATI_MONTHS = ["ચૈત્ર", "વૈશાખ", "જેઠ", "અષાઢ", "શ્રાવણ", "ભાદરવો", "આસો", "કારતક", "માગશર", "પોષ", "મહા", "ફાગણ"];

/** The fifteen tithis of either half as Gujarati names them, the first to
 *  the fourteenth and then the full moon. The dark half ends in `amas`. */
export const GUJARATI_TITHIS = ["પડવો", "બીજ", "ત્રીજ", "ચોથ", "પાંચમ", "છઠ", "સાતમ", "આઠમ", "નોમ", "દશમ", "અગિયારશ", "બારસ", "તેરસ", "ચૌદસ", "પૂનમ"];

export const GUJARATI = {
  /** The bright half and the dark half. */
  sud: "સુદ",
  vad: "વદ",
  /** The new moon. */
  amas: "અમાસ",
  /** An added month: it follows the month's name. */
  adhik: "અધિક",
};

/** Weekdays, Sunday first. */
export const REGIONAL_WEEKDAYS: Record<RegionalScript, string[]> = {
  gujarati: ["રવિવાર", "સોમવાર", "મંગળવાર", "બુધવાર", "ગુરુવાર", "શુક્રવાર", "શનિવાર"],
  tamil: ["ஞாயிறு", "திங்கள்", "செவ்வாய்", "புதன்", "வியாழன்", "வெள்ளி", "சனி"],
  malayalam: ["ഞായർ", "തിങ്കൾ", "ചൊവ്വ", "ബുധൻ", "വ്യാഴം", "വെള്ളി", "ശനി"],
  bengali: ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"],
};

/** The first of each script's ten digits. Tamil and Malayalam dates are
 *  written with the ordinary digits today, so they have none here. */
const DIGIT_ZERO: Partial<Record<RegionalScript | "devanagari", number>> = {
  devanagari: 0x0966,
  gujarati: 0x0ae6,
  bengali: 0x09e6,
};

/** A whole number in a script's own digits, or in ordinary ones. */
export function digits(n: number, scriptKey: RegionalScript | "devanagari" | "latin"): string {
  const zero = scriptKey === "latin" ? undefined : DIGIT_ZERO[scriptKey];
  const plain = String(Math.trunc(n));
  if (zero === undefined) return plain;
  let out = "";
  for (const ch of plain) out += ch >= "0" && ch <= "9" ? String.fromCharCode(zero + Number(ch)) : ch;
  return out;
}

/** A hash of a string's code points, to hold these lists to their source
 *  without anyone retyping a name. FNV-1a over four bytes a code point. */
export function codePointHash(s: string): string {
  let h = 0x811c9dc5;
  for (const ch of s) {
    let c = ch.codePointAt(0) ?? 0;
    for (let k = 0; k < 4; k++) {
      h ^= c & 0xff;
      h = Math.imul(h, 0x01000193) >>> 0;
      c >>>= 8;
    }
  }
  return h.toString(16).padStart(8, "0");
}
