/** Original short glosses for a month of intermediate Sanskrit vocabulary. */
export const DAILY_VOCABULARY = [
  { word: "सूक्ष्मम्", meaning: "subtle; minute" },
  { word: "संशयः", meaning: "doubt; uncertainty" },
  { word: "सङ्कल्पः", meaning: "intention; resolve" },
  { word: "विवेकः", meaning: "discernment; discrimination" },
  { word: "प्रज्ञा", meaning: "insight; wisdom" },
  { word: "अन्वेषणम्", meaning: "inquiry; exploration" },
  { word: "प्रतिभा", meaning: "creative insight; brilliance" },
  { word: "औचित्यम्", meaning: "appropriateness; fittingness" },
  { word: "अनुग्रहः", meaning: "favour; gracious assistance" },
  { word: "अवकाशः", meaning: "space; opportunity" },
  { word: "परिशीलनम्", meaning: "careful study; practice" },
  { word: "समन्वयः", meaning: "coordination; harmonious connection" },
  { word: "अभ्युदयः", meaning: "rise; prosperity" },
  { word: "प्रत्युत्पन्नमतिः", meaning: "presence of mind; quick understanding" },
  { word: "अभिज्ञानम्", meaning: "recognition; a token of identity" },
  { word: "अनिर्वचनीयम्", meaning: "indescribable; beyond expression" },
  { word: "वैदग्ध्यम्", meaning: "refinement; cultivated skill" },
  { word: "उत्कर्षः", meaning: "excellence; advancement" },
  { word: "सौहार्दम्", meaning: "friendliness; goodwill" },
  { word: "कृतज्ञता", meaning: "gratitude" },
  { word: "निरूपणम्", meaning: "exposition; careful determination" },
  { word: "अनुमानम्", meaning: "inference" },
  { word: "प्रत्ययः", meaning: "conviction; an idea or belief" },
  { word: "अनुष्ठानम्", meaning: "performance; carrying out a practice" },
  { word: "प्रसन्नता", meaning: "clarity; cheerfulness" },
  { word: "निष्कर्षः", meaning: "conclusion; extraction" },
  { word: "परिमार्जनम्", meaning: "refinement; cleansing" },
  { word: "अविरतम्", meaning: "unceasing; uninterrupted" },
  { word: "समाधानम्", meaning: "settling; resolution" },
  { word: "निःश्रेयसम्", meaning: "highest good; ultimate welfare" },
  { word: "अतन्द्रितः", meaning: "vigilant; unwearied" },
];

export function vocabularyForDate(day: string) {
  const offset = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86400000);
  return DAILY_VOCABULARY[((offset % DAILY_VOCABULARY.length) + DAILY_VOCABULARY.length) % DAILY_VOCABULARY.length];
}
