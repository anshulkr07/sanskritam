// Released curriculum snapshot for visual QA; no backend writes or sign-in.
import type { Unit } from "../src/api/client";
export const units: Unit[] = [
  {
    "id": "u1",
    "rank": 1,
    "layer": 0,
    "title_en": "Sounds",
    "title_hi": "वर्णाः",
    "blurb": "The alphabet is a 5×5 grid, not a list.",
    "lessons": [
      {
        "unit_id": "u1",
        "feature_id": "SG",
        "features": [
          "SG"
        ],
        "rank": 0,
        "title_en": "Sounds first, then singulars",
        "title_hi": "प्रथमं वर्णाः, तत एकवचनम्",
        "id": "u1:SG",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      }
    ],
    "progress": 0.24
  },
  {
    "id": "u2",
    "rank": 2,
    "layer": 1,
    "title_en": "First Words",
    "title_hi": "प्रथमशब्दाः",
    "blurb": "One ending does the work English gives to word order.",
    "lessons": [
      {
        "unit_id": "u2",
        "feature_id": "NOM.SG",
        "features": [
          "NOM.SG"
        ],
        "rank": 0,
        "title_en": "What is a case?",
        "title_hi": "विभक्तिः किम्?",
        "id": "u2:NOM.SG",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u2",
        "feature_id": "ACC.SG",
        "features": [
          "ACC.SG"
        ],
        "rank": 1,
        "title_en": "The object: whom the action reaches",
        "title_hi": "कर्म — क्रिया यं प्राप्नोति",
        "id": "u2:ACC.SG",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u2",
        "feature_id": "PRES.3SG",
        "features": [
          "PRES.3SG"
        ],
        "rank": 2,
        "title_en": "What is a verb?",
        "title_hi": "क्रिया किम्?",
        "id": "u2:PRES.3SG",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      }
    ],
    "progress": 0.24
  },
  {
    "id": "u3",
    "rank": 3,
    "layer": 1,
    "title_en": "More Cases",
    "title_hi": "अन्यविभक्तयः",
    "blurb": "Six more endings, six more questions answered.",
    "lessons": [
      {
        "unit_id": "u3",
        "feature_id": "INSTR.SG",
        "features": [
          "INSTR.SG"
        ],
        "rank": 0,
        "title_en": "With what? The instrument",
        "title_hi": "केन? करणम्",
        "id": "u3:INSTR.SG",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u3",
        "feature_id": "DAT.SG",
        "features": [
          "DAT.SG"
        ],
        "rank": 1,
        "title_en": "For whom? The recipient",
        "title_hi": "कस्मै? सम्प्रदानम्",
        "id": "u3:DAT.SG",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u3",
        "feature_id": "ABL.SG",
        "features": [
          "ABL.SG"
        ],
        "rank": 2,
        "title_en": "From where? The source",
        "title_hi": "कस्मात्? अपादानम्",
        "id": "u3:ABL.SG",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u3",
        "feature_id": "GEN.SG",
        "features": [
          "GEN.SG"
        ],
        "rank": 3,
        "title_en": "Whose? Belonging",
        "title_hi": "कस्य? सम्बन्धः",
        "id": "u3:GEN.SG",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u3",
        "feature_id": "LOC.SG",
        "features": [
          "LOC.SG"
        ],
        "rank": 4,
        "title_en": "Where? The ground of action",
        "title_hi": "कुत्र? अधिकरणम्",
        "id": "u3:LOC.SG",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u3",
        "feature_id": "VOC.SG",
        "features": [
          "VOC.SG"
        ],
        "rank": 5,
        "title_en": "Calling out: the address",
        "title_hi": "सम्बोधनम् — आह्वानम्",
        "id": "u3:VOC.SG",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u3",
        "feature_id": "INDECL",
        "features": [
          "INDECL"
        ],
        "rank": 6,
        "title_en": "Words that never change: avyaya",
        "title_hi": "अव्ययम् — विकारहीनं पदम्",
        "id": "u3:INDECL",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      }
    ],
    "progress": 0.24
  },
  {
    "id": "u4",
    "rank": 4,
    "layer": 1,
    "title_en": "Numbers",
    "title_hi": "वचनानि",
    "blurb": "Sanskrit counts one, two, many — not one and many.",
    "lessons": [
      {
        "unit_id": "u4",
        "feature_id": "DU",
        "features": [
          "DU",
          "NOM.DU",
          "ACC.DU",
          "PRES.3DU"
        ],
        "rank": 0,
        "title_en": "Two is special: the dual",
        "title_hi": "द्विवचनम्",
        "id": "u4:DU",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u4",
        "feature_id": "NOM.PL",
        "features": [
          "NOM.PL",
          "ACC.PL",
          "PRES.3PL"
        ],
        "rank": 1,
        "title_en": "Many: the plural",
        "title_hi": "बहुवचनम्",
        "id": "u4:NOM.PL",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u4",
        "feature_id": "GEN.PL",
        "features": [
          "GEN.PL",
          "LOC.PL"
        ],
        "rank": 2,
        "title_en": "Whose and where, for many",
        "title_hi": "षष्ठी-सप्तमी",
        "id": "u4:GEN.PL",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u4",
        "feature_id": "PL",
        "features": [
          "PL"
        ],
        "rank": 3,
        "title_en": "Many as an idea: what plural means",
        "title_hi": "बहुत्वम् — बहुवचनस्य भावः",
        "id": "u4:PL",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u4",
        "feature_id": "NOM.DU",
        "features": [
          "NOM.DU"
        ],
        "rank": 4,
        "title_en": "Two who act: nominative dual",
        "title_hi": "द्वौ कर्तारौ — प्रथमा द्विवचनम्",
        "id": "u4:NOM.DU",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u4",
        "feature_id": "ACC.DU",
        "features": [
          "ACC.DU"
        ],
        "rank": 5,
        "title_en": "Two undergone: accusative dual",
        "title_hi": "द्वौ कर्मणी — द्वितीया द्विवचनम्",
        "id": "u4:ACC.DU",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u4",
        "feature_id": "ACC.PL",
        "features": [
          "ACC.PL"
        ],
        "rank": 6,
        "title_en": "Many undergone: accusative plural",
        "title_hi": "बहून् — द्वितीया बहुवचनम्",
        "id": "u4:ACC.PL",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u4",
        "feature_id": "LOC.PL",
        "features": [
          "LOC.PL"
        ],
        "rank": 7,
        "title_en": "Among many: locative plural",
        "title_hi": "बहुषु — सप्तमी बहुवचनम्",
        "id": "u4:LOC.PL",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      }
    ],
    "progress": 0.24
  },
  {
    "id": "u5",
    "rank": 5,
    "layer": 1,
    "title_en": "Persons",
    "title_hi": "पुरुषाः",
    "blurb": "Three persons × three numbers: a nine-cell grid.",
    "lessons": [
      {
        "unit_id": "u5",
        "feature_id": "PRES.1SG",
        "features": [
          "PRES.1SG",
          "PRES.2SG"
        ],
        "rank": 0,
        "title_en": "Who speaks: I and you",
        "title_hi": "अहं त्वम्",
        "id": "u5:PRES.1SG",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u5",
        "feature_id": "PRES.1DU",
        "features": [
          "PRES.1DU",
          "PRES.2DU"
        ],
        "rank": 1,
        "title_en": "We-two and you-two",
        "title_hi": "आवां युवाम्",
        "id": "u5:PRES.1DU",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u5",
        "feature_id": "PRES.1PL",
        "features": [
          "PRES.1PL"
        ],
        "rank": 2,
        "title_en": "We (many) speak: first plural",
        "title_hi": "वयं वदामः — उत्तम बहुवचनम्",
        "id": "u5:PRES.1PL",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u5",
        "feature_id": "PRES.2PL",
        "features": [
          "PRES.2PL"
        ],
        "rank": 3,
        "title_en": "You (many) speak: second plural",
        "title_hi": "यूयं वदथ — मध्यम बहुवचनम्",
        "id": "u5:PRES.2PL",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u5",
        "feature_id": "PRES.3PL",
        "features": [
          "PRES.3PL"
        ],
        "rank": 4,
        "title_en": "They speak: third plural",
        "title_hi": "ते वदन्ति — प्रथम बहुवचनम्",
        "id": "u5:PRES.3PL",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u5",
        "feature_id": "PRES.3DU",
        "features": [
          "PRES.3DU"
        ],
        "rank": 5,
        "title_en": "Those two speak: third dual",
        "title_hi": "तौ वदतः — प्रथम द्विवचनम्",
        "id": "u5:PRES.3DU",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      }
    ],
    "progress": 0.24
  },
  {
    "id": "u6",
    "rank": 6,
    "layer": 1,
    "title_en": "Sandhi",
    "title_hi": "सन्धिः",
    "blurb": "Where sounds meet, a function decides what happens.",
    "lessons": [
      {
        "unit_id": "u6",
        "feature_id": "VOWEL-SANDHI",
        "features": [
          "VOWEL-SANDHI",
          "VISARGA-SANDHI",
          "ANUSVARA-SANDHI",
          "CONSONANT-SANDHI"
        ],
        "rank": 0,
        "title_en": "Sandhi is a function: f(a, b) → c",
        "title_hi": "सन्धिः — द्वयोः मेलने कार्यम्",
        "id": "u6:VOWEL-SANDHI",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u6",
        "feature_id": "VISARGA-SANDHI",
        "features": [
          "VISARGA-SANDHI"
        ],
        "rank": 1,
        "title_en": "The breathing that changes: visarga",
        "title_hi": "विसर्गसन्धिः",
        "id": "u6:VISARGA-SANDHI",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u6",
        "feature_id": "ANUSVARA-SANDHI",
        "features": [
          "ANUSVARA-SANDHI"
        ],
        "rank": 2,
        "title_en": "The nose takes over: anusvara",
        "title_hi": "अनुस्वारसन्धिः",
        "id": "u6:ANUSVARA-SANDHI",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u6",
        "feature_id": "CONSONANT-SANDHI",
        "features": [
          "CONSONANT-SANDHI"
        ],
        "rank": 3,
        "title_en": "Stops meet stops: consonant sandhi",
        "title_hi": "व्यञ्जनसन्धिः",
        "id": "u6:CONSONANT-SANDHI",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      }
    ],
    "progress": 0.24
  },
  {
    "id": "u7",
    "rank": 7,
    "layer": 1,
    "title_en": "Genders",
    "title_hi": "लिङ्गानि",
    "blurb": "Stem type predicts the whole paradigm.",
    "lessons": [
      {
        "unit_id": "u7",
        "feature_id": "NEUT",
        "features": [
          "NEUT"
        ],
        "rank": 0,
        "title_en": "It changes everything: neuter",
        "title_hi": "नपुंसकम्",
        "id": "u7:NEUT",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u7",
        "feature_id": "MASC",
        "features": [
          "MASC"
        ],
        "rank": 1,
        "title_en": "Masculine, and how you know",
        "title_hi": "पुंलिङ्गम्",
        "id": "u7:MASC",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u7",
        "feature_id": "FEM",
        "features": [
          "FEM"
        ],
        "rank": 2,
        "title_en": "Feminine: the pattern, honestly held",
        "title_hi": "स्त्रीलिङ्गम् — सूत्रं, न तु सिद्धरूपम्",
        "id": "u7:FEM",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      }
    ],
    "progress": 0.24
  },
  {
    "id": "u8",
    "rank": 8,
    "layer": 1,
    "title_en": "More Tenses",
    "title_hi": "लकाराः",
    "blurb": "Ten lakāras; the first four carry most speech.",
    "lessons": [
      {
        "unit_id": "u8",
        "feature_id": "IMP.2PL",
        "features": [
          "IMP.2PL"
        ],
        "rank": 0,
        "title_en": "Orders to many: the imperative",
        "title_hi": "आज्ञा — यूयं पठत",
        "id": "u8:IMP.2PL",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u8",
        "feature_id": "IMPF.3SG",
        "features": [
          "IMPF.3SG"
        ],
        "rank": 1,
        "title_en": "What already happened: the imperfect",
        "title_hi": "अनद्यतनभूतम्",
        "id": "u8:IMPF.3SG",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u8",
        "feature_id": "FUT.1SG",
        "features": [
          "FUT.1SG",
          "FUT.3SG"
        ],
        "rank": 2,
        "title_en": "What will happen: the future",
        "title_hi": "भविष्यत्",
        "id": "u8:FUT.1SG",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u8",
        "feature_id": "IMP.2SG",
        "features": [
          "IMP.2SG"
        ],
        "rank": 3,
        "title_en": "Order one: the singular imperative",
        "title_hi": "आज्ञा — त्वं पठ",
        "id": "u8:IMP.2SG",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u8",
        "feature_id": "FUT.3SG",
        "features": [
          "FUT.3SG"
        ],
        "rank": 4,
        "title_en": "He will: third future",
        "title_hi": "सः करिष्यति — भविष्यत् प्रथमः",
        "id": "u8:FUT.3SG",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      }
    ],
    "progress": 0.24
  },
  {
    "id": "u9",
    "rank": 9,
    "layer": 1,
    "title_en": "Voices",
    "title_hi": "पदे",
    "blurb": "Who the action returns to decides the ending set.",
    "lessons": [
      {
        "unit_id": "u9",
        "feature_id": "ATMANEPADA",
        "features": [
          "ATMANEPADA",
          "PARASMAIPADA"
        ],
        "rank": 0,
        "title_en": "For others, for self: the two voices",
        "title_hi": "द्वे पदे",
        "id": "u9:ATMANEPADA",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u9",
        "feature_id": "PARASMAIPADA",
        "features": [
          "PARASMAIPADA"
        ],
        "rank": 1,
        "title_en": "Outward voice: parasmaipada",
        "title_hi": "परस्मैपदम् — परार्था क्रिया",
        "id": "u9:PARASMAIPADA",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      }
    ],
    "progress": 0.24
  },
  {
    "id": "u10",
    "rank": 10,
    "layer": 2,
    "title_en": "Compounds",
    "title_hi": "समासाः",
    "blurb": "Words compose: A+B, B-of-A, one-who-has-A-B.",
    "lessons": [
      {
        "unit_id": "u10",
        "feature_id": "SAMASA-DVANDVA",
        "features": [
          "SAMASA-DVANDVA"
        ],
        "rank": 0,
        "title_en": "Both-and: dvandva compounds",
        "title_hi": "द्वन्द्वः — रामलक्ष्मणौ",
        "id": "u10:SAMASA-DVANDVA",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u10",
        "feature_id": "SAMASA-TATPURUSA",
        "features": [
          "SAMASA-TATPURUSA"
        ],
        "rank": 1,
        "title_en": "Of-him: tatpurusha compounds",
        "title_hi": "तत्पुरुषः — राजपुत्रः",
        "id": "u10:SAMASA-TATPURUSA",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u10",
        "feature_id": "SAMASA-BAHUVRIHI",
        "features": [
          "SAMASA-BAHUVRIHI"
        ],
        "rank": 2,
        "title_en": "One-who-has: bahuvrihi compounds",
        "title_hi": "बहुव्रीहिः — पीताम्बरः",
        "id": "u10:SAMASA-BAHUVRIHI",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u10",
        "feature_id": "SAMASA-AVYAYIBHAVA",
        "features": [
          "SAMASA-AVYAYIBHAVA"
        ],
        "rank": 3,
        "title_en": "Never-declined: avyayibhava compounds",
        "title_hi": "अव्ययीभावः — उपगङ्गम्",
        "id": "u10:SAMASA-AVYAYIBHAVA",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      }
    ],
    "progress": 0.24
  },
  {
    "id": "u11",
    "rank": 11,
    "layer": 2,
    "title_en": "Kāraka",
    "title_hi": "कारकाणि",
    "blurb": "The six roles that explain why a vibhakti is there.",
    "lessons": [
      {
        "unit_id": "u11",
        "feature_id": "KARAKA-KARTR",
        "features": [
          "KARAKA-KARTR"
        ],
        "rank": 0,
        "title_en": "Who does: kartr, the agent",
        "title_hi": "कर्तृकारकम् — यः करोति",
        "id": "u11:KARAKA-KARTR",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u11",
        "feature_id": "KARAKA-KARMA",
        "features": [
          "KARAKA-KARMA"
        ],
        "rank": 1,
        "title_en": "What is reached: karma, the object",
        "title_hi": "कर्मकारकम् — यत् क्रियते",
        "id": "u11:KARAKA-KARMA",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u11",
        "feature_id": "KARAKA-KARANA",
        "features": [
          "KARAKA-KARANA"
        ],
        "rank": 2,
        "title_en": "With what: karana, the instrument",
        "title_hi": "करणकारकम् — येन क्रियते",
        "id": "u11:KARAKA-KARANA",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u11",
        "feature_id": "KARAKA-SAMPRADANA",
        "features": [
          "KARAKA-SAMPRADANA"
        ],
        "rank": 3,
        "title_en": "For whom: sampradana, the recipient",
        "title_hi": "सम्प्रदानकारकम् — यस्मै दीयते",
        "id": "u11:KARAKA-SAMPRADANA",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u11",
        "feature_id": "KARAKA-APADANA",
        "features": [
          "KARAKA-APADANA"
        ],
        "rank": 4,
        "title_en": "From where: apadana, the source",
        "title_hi": "अपादानकारकम् — यस्मात् अपैति",
        "id": "u11:KARAKA-APADANA",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      },
      {
        "unit_id": "u11",
        "feature_id": "KARAKA-ADHIKARANA",
        "features": [
          "KARAKA-ADHIKARANA"
        ],
        "rank": 5,
        "title_en": "Where: adhikarana, the locus",
        "title_hi": "अधिकरणकारकम् — यत्र क्रिया",
        "id": "u11:KARAKA-ADHIKARANA",
        "register": "laukika",
        "step_count": 7,
        "attribution": ""
      }
    ],
    "progress": 0.24
  }
];
