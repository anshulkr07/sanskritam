import type { LearnV2Lesson, LearnV2Unit } from "./types";
// Exact local manuscript adaptations; English source readings, not reviewed bilingual/graded lessons.
export const SOURCE_READING_LESSONS: LearnV2Lesson[] = [
  {
    "id": "guide-art-how-it-works",
    "rank": 1,
    "unit": {
      "en": "Start here",
      "hi": "यहाँ से शुरू करें"
    },
    "chapterId": "start",
    "title": {
      "en": "How Sanskrit grammar works",
      "hi": "संस्कृत व्याकरण कैसे काम करता है"
    },
    "titleSa": "व्याकरणम्",
    "titleIast": "vyākaraṇam",
    "outcome": {
      "en": "A Sanskrit word carries its job in its ending, so the words can go in almost any order.",
      "hi": "संस्कृत शब्द का काम उसके अंत में छिपा होता है, इसलिए शब्द लगभग किसी भी क्रम में आ सकते हैं।"
    },
    "minutes": 2,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-how-it-works-foundations-boy-eats-fruit",
        "kind": "teach",
        "title": {
          "en": "How Sanskrit grammar works",
          "hi": "संस्कृत व्याकरण कैसे काम करता है"
        },
        "body": {
          "en": "A Sanskrit word carries its job in its ending, so the words can go in almost any order.",
          "hi": "संस्कृत शब्द का काम उसके अंत में छिपा होता है, इसलिए शब्द लगभग किसी भी क्रम में आ सकते हैं।"
        },
        "example": {
          "sa": "बालकः फलं खादति",
          "iast": "bālakaḥ phalaṃ khādati",
          "gloss": {
            "en": "The boy eats a fruit.",
            "hi": "बालक फल खाता है।"
          },
          "alt": {
            "en": "The boy eats a fruit.",
            "hi": "बालक फल खाता है।"
          }
        },
        "assetIds": [
          "foundations-boy-eats-fruit"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-dative",
    "rank": 2,
    "unit": {
      "en": "The 8 cases",
      "hi": "आठ विभक्तियाँ"
    },
    "chapterId": "cases",
    "title": {
      "en": "Dative: for and to",
      "hi": "चतुर्थी: के लिए और को"
    },
    "titleSa": "चतुर्थी",
    "titleIast": "caturthī",
    "outcome": {
      "en": "The 4th case marks the receiver or the purpose: who or what something is for.",
      "hi": "चतुर्थी पाने वाले या उद्देश्य को बताती है: कुछ किसके लिए है।"
    },
    "minutes": 4,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-dative-cases-teacher-gives-book",
        "kind": "teach",
        "title": {
          "en": "Dative: for and to",
          "hi": "चतुर्थी: के लिए और को"
        },
        "body": {
          "en": "The 4th case marks the receiver or the purpose: who or what something is for.",
          "hi": "चतुर्थी पाने वाले या उद्देश्य को बताती है: कुछ किसके लिए है।"
        },
        "example": {
          "sa": "गुरुः शिष्याय पुस्तकं ददाति",
          "iast": "guruḥ śiṣyāya pustakaṃ dadāti",
          "gloss": {
            "en": "The teacher gives the pupil a book.",
            "hi": "गुरु शिष्य को पुस्तक देते हैं।"
          },
          "alt": {
            "en": "The teacher gives the pupil a book.",
            "hi": "गुरु शिष्य को पुस्तक देते हैं।"
          }
        },
        "assetIds": [
          "cases-teacher-gives-book"
        ]
      },
      {
        "id": "guide-art-dative-guide-dative-2",
        "kind": "teach",
        "title": {
          "en": "Dative: for and to",
          "hi": "चतुर्थी: के लिए और को"
        },
        "body": {
          "en": "The 4th case marks the receiver or the purpose: who or what something is for.",
          "hi": "चतुर्थी पाने वाले या उद्देश्य को बताती है: कुछ किसके लिए है।"
        },
        "example": {
          "sa": "सः विद्यायै पठति",
          "iast": "saḥ vidyāyai paṭhati",
          "gloss": {
            "en": "He studies for the sake of learning.",
            "hi": "वह विद्या के लिए पढ़ता है।"
          },
          "alt": {
            "en": "He studies for the sake of learning.",
            "hi": "वह विद्या के लिए पढ़ता है।"
          }
        },
        "assetIds": [
          "guide-dative-2"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-ablative",
    "rank": 3,
    "unit": {
      "en": "The 8 cases",
      "hi": "आठ विभक्तियाँ"
    },
    "chapterId": "cases",
    "title": {
      "en": "Ablative: from",
      "hi": "पञ्चमी: से (अलग होना)"
    },
    "titleSa": "पञ्चमी",
    "titleIast": "pañcamī",
    "outcome": {
      "en": "The 5th case marks what something moves away from — and what you fear or compare against.",
      "hi": "पञ्चमी बताती है कि कोई चीज़ किससे अलग होती है — और किससे डर या तुलना हो।"
    },
    "minutes": 4,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-ablative-cases-leaf-falls-from-tree",
        "kind": "teach",
        "title": {
          "en": "Ablative: from",
          "hi": "पञ्चमी: से (अलग होना)"
        },
        "body": {
          "en": "The 5th case marks what something moves away from — and what you fear or compare against.",
          "hi": "पञ्चमी बताती है कि कोई चीज़ किससे अलग होती है — और किससे डर या तुलना हो।"
        },
        "example": {
          "sa": "वृक्षात् पत्रं पतति",
          "iast": "vṛkṣāt patraṃ patati",
          "gloss": {
            "en": "A leaf falls from the tree.",
            "hi": "पेड़ से पत्ता गिरता है।"
          },
          "alt": {
            "en": "A leaf falls from the tree.",
            "hi": "पेड़ से पत्ता गिरता है।"
          }
        },
        "assetIds": [
          "cases-leaf-falls-from-tree"
        ]
      },
      {
        "id": "guide-art-ablative-guide-ablative-2",
        "kind": "teach",
        "title": {
          "en": "Ablative: from",
          "hi": "पञ्चमी: से (अलग होना)"
        },
        "body": {
          "en": "The 5th case marks what something moves away from — and what you fear or compare against.",
          "hi": "पञ्चमी बताती है कि कोई चीज़ किससे अलग होती है — और किससे डर या तुलना हो।"
        },
        "example": {
          "sa": "बालकः सिंहात् बिभेति",
          "iast": "bālakaḥ siṃhāt bibheti",
          "gloss": {
            "en": "The boy is afraid of the lion.",
            "hi": "बालक शेर से डरता है।"
          },
          "alt": {
            "en": "The boy is afraid of the lion.",
            "hi": "बालक शेर से डरता है।"
          }
        },
        "assetIds": [
          "guide-ablative-2"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-stem-ending",
    "rank": 4,
    "unit": {
      "en": "Nouns",
      "hi": "संज्ञा"
    },
    "chapterId": "nouns",
    "title": {
      "en": "Stem + ending",
      "hi": "मूल शब्द + अंत"
    },
    "titleSa": "प्रातिपदिकम्",
    "titleIast": "prātipadikam",
    "outcome": {
      "en": "Every noun is a stem plus an ending: the stem gives the meaning, the ending gives the job.",
      "hi": "हर संज्ञा मूल शब्द और अंत से बनती है: मूल शब्द अर्थ देता है, अंत उसका काम बताता है।"
    },
    "minutes": 4,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-stem-ending-guide-stem-ending-1",
        "kind": "teach",
        "title": {
          "en": "Stem + ending",
          "hi": "मूल शब्द + अंत"
        },
        "body": {
          "en": "Every noun is a stem plus an ending: the stem gives the meaning, the ending gives the job.",
          "hi": "हर संज्ञा मूल शब्द और अंत से बनती है: मूल शब्द अर्थ देता है, अंत उसका काम बताता है।"
        },
        "example": {
          "sa": "गजः जलं पिबति",
          "iast": "gajaḥ jalaṃ pibati",
          "gloss": {
            "en": "The elephant drinks water.",
            "hi": "हाथी पानी पीता है।"
          },
          "alt": {
            "en": "The elephant drinks water.",
            "hi": "हाथी पानी पीता है।"
          }
        },
        "assetIds": [
          "guide-stem-ending-1"
        ]
      },
      {
        "id": "guide-art-stem-ending-guide-stem-ending-2",
        "kind": "teach",
        "title": {
          "en": "Stem + ending",
          "hi": "मूल शब्द + अंत"
        },
        "body": {
          "en": "Every noun is a stem plus an ending: the stem gives the meaning, the ending gives the job.",
          "hi": "हर संज्ञा मूल शब्द और अंत से बनती है: मूल शब्द अर्थ देता है, अंत उसका काम बताता है।"
        },
        "example": {
          "sa": "बालकः पुस्तकं पठति",
          "iast": "bālakaḥ pustakaṃ paṭhati",
          "gloss": {
            "en": "The boy reads a book.",
            "hi": "बालक पुस्तक पढ़ता है।"
          },
          "alt": {
            "en": "The boy reads a book.",
            "hi": "बालक पुस्तक पढ़ता है।"
          }
        },
        "assetIds": [
          "guide-stem-ending-2"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-locative",
    "rank": 5,
    "unit": {
      "en": "The 8 cases",
      "hi": "आठ विभक्तियाँ"
    },
    "chapterId": "cases",
    "title": {
      "en": "Locative: in, on, at",
      "hi": "सप्तमी: में, पर"
    },
    "titleSa": "सप्तमी",
    "titleIast": "saptamī",
    "outcome": {
      "en": "The 7th case marks where or when something happens.",
      "hi": "सप्तमी बताती है कि कुछ कहाँ या कब होता है।"
    },
    "minutes": 4,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-locative-guide-locative-1",
        "kind": "teach",
        "title": {
          "en": "Locative: in, on, at",
          "hi": "सप्तमी: में, पर"
        },
        "body": {
          "en": "The 7th case marks where or when something happens.",
          "hi": "सप्तमी बताती है कि कुछ कहाँ या कब होता है।"
        },
        "example": {
          "sa": "खगाः वृक्षे वसन्ति",
          "iast": "khagāḥ vṛkṣe vasanti",
          "gloss": {
            "en": "Birds live in the tree.",
            "hi": "पक्षी पेड़ पर रहते हैं।"
          },
          "alt": {
            "en": "Birds live in the tree.",
            "hi": "पक्षी पेड़ पर रहते हैं।"
          }
        },
        "assetIds": [
          "guide-locative-1"
        ]
      },
      {
        "id": "guide-art-locative-guide-locative-2",
        "kind": "teach",
        "title": {
          "en": "Locative: in, on, at",
          "hi": "सप्तमी: में, पर"
        },
        "body": {
          "en": "The 7th case marks where or when something happens.",
          "hi": "सप्तमी बताती है कि कुछ कहाँ या कब होता है।"
        },
        "example": {
          "sa": "नौका जले चलति",
          "iast": "naukā jale calati",
          "gloss": {
            "en": "The boat moves on the water.",
            "hi": "नाव पानी पर चलती है।"
          },
          "alt": {
            "en": "The boat moves on the water.",
            "hi": "नाव पानी पर चलती है।"
          }
        },
        "assetIds": [
          "guide-locative-2"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-number",
    "rank": 6,
    "unit": {
      "en": "Nouns",
      "hi": "संज्ञा"
    },
    "chapterId": "nouns",
    "title": {
      "en": "One, two, many",
      "hi": "एकवचन, द्विवचन, बहुवचन"
    },
    "titleSa": "वचनानि",
    "titleIast": "vacanāni",
    "outcome": {
      "en": "Sanskrit counts in its endings — and keeps a special form for exactly two.",
      "hi": "संस्कृत अपने अंतों में गिनती करता है — और ठीक दो के लिए अलग रूप रखता है।"
    },
    "minutes": 6,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-number-guide-number-3",
        "kind": "teach",
        "title": {
          "en": "One, two, many",
          "hi": "एकवचन, द्विवचन, बहुवचन"
        },
        "body": {
          "en": "Sanskrit counts in its endings — and keeps a special form for exactly two.",
          "hi": "संस्कृत अपने अंतों में गिनती करता है — और ठीक दो के लिए अलग रूप रखता है।"
        },
        "example": {
          "sa": "फलानि",
          "iast": "phalāni",
          "gloss": {
            "en": "fruits — more than two",
            "hi": "कई फल"
          },
          "alt": {
            "en": "fruits — more than two",
            "hi": "कई फल"
          }
        },
        "assetIds": [
          "guide-number-3"
        ]
      },
      {
        "id": "guide-art-number-guide-number-1",
        "kind": "teach",
        "title": {
          "en": "One, two, many",
          "hi": "एकवचन, द्विवचन, बहुवचन"
        },
        "body": {
          "en": "Sanskrit counts in its endings — and keeps a special form for exactly two.",
          "hi": "संस्कृत अपने अंतों में गिनती करता है — और ठीक दो के लिए अलग रूप रखता है।"
        },
        "example": {
          "sa": "नेत्रे",
          "iast": "netre",
          "gloss": {
            "en": "the two eyes",
            "hi": "दोनों आँखें"
          },
          "alt": {
            "en": "the two eyes",
            "hi": "दोनों आँखें"
          }
        },
        "assetIds": [
          "guide-number-1"
        ]
      },
      {
        "id": "guide-art-number-guide-number-2",
        "kind": "teach",
        "title": {
          "en": "One, two, many",
          "hi": "एकवचन, द्विवचन, बहुवचन"
        },
        "body": {
          "en": "Sanskrit counts in its endings — and keeps a special form for exactly two.",
          "hi": "संस्कृत अपने अंतों में गिनती करता है — और ठीक दो के लिए अलग रूप रखता है।"
        },
        "example": {
          "sa": "हस्तौ",
          "iast": "hastau",
          "gloss": {
            "en": "the two hands",
            "hi": "दोनों हाथ"
          },
          "alt": {
            "en": "the two hands",
            "hi": "दोनों हाथ"
          }
        },
        "assetIds": [
          "guide-number-2"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-karaka",
    "rank": 7,
    "unit": {
      "en": "The 8 cases",
      "hi": "आठ विभक्तियाँ"
    },
    "chapterId": "cases",
    "title": {
      "en": "Kāraka: the roles behind the endings",
      "hi": "कारक: विभक्तियों के पीछे की भूमिकाएँ"
    },
    "titleSa": "कारकाणि",
    "titleIast": "kārakāṇi",
    "outcome": {
      "en": "Six roles in an action — doer, object, means, receiver, source, place — explain which ending a noun gets.",
      "hi": "क्रिया की छह भूमिकाएँ — कर्ता, कर्म, करण, सम्प्रदान, अपादान, अधिकरण — बताती हैं कि संज्ञा को कौन-सी विभक्ति मिलेगी।"
    },
    "minutes": 2,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-karaka-guide-karaka-1",
        "kind": "teach",
        "title": {
          "en": "Kāraka: the roles behind the endings",
          "hi": "कारक: विभक्तियों के पीछे की भूमिकाएँ"
        },
        "body": {
          "en": "Six roles in an action — doer, object, means, receiver, source, place — explain which ending a noun gets.",
          "hi": "क्रिया की छह भूमिकाएँ — कर्ता, कर्म, करण, सम्प्रदान, अपादान, अधिकरण — बताती हैं कि संज्ञा को कौन-सी विभक्ति मिलेगी।"
        },
        "example": {
          "sa": "पिता पुत्राय गृहे हस्तेन पुस्तकं ददाति",
          "iast": "pitā putrāya gṛhe hastena pustakaṃ dadāti",
          "gloss": {
            "en": "At home, the father hands his son a book.",
            "hi": "घर में पिता अपने हाथ से पुत्र को पुस्तक देते हैं।"
          },
          "alt": {
            "en": "At home, the father hands his son a book.",
            "hi": "घर में पिता अपने हाथ से पुत्र को पुस्तक देते हैं।"
          }
        },
        "assetIds": [
          "guide-karaka-1"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-accusative",
    "rank": 8,
    "unit": {
      "en": "The 8 cases",
      "hi": "आठ विभक्तियाँ"
    },
    "chapterId": "cases",
    "title": {
      "en": "Accusative: the object and the goal",
      "hi": "द्वितीया: कर्म और गंतव्य"
    },
    "titleSa": "द्वितीया",
    "titleIast": "dvitīyā",
    "outcome": {
      "en": "The 2nd case marks what the action is done to, and where you are going.",
      "hi": "द्वितीया बताती है कि क्रिया किस पर हो रही है, और आप कहाँ जा रहे हैं।"
    },
    "minutes": 4,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-accusative-guide-accusative-1",
        "kind": "teach",
        "title": {
          "en": "Accusative: the object and the goal",
          "hi": "द्वितीया: कर्म और गंतव्य"
        },
        "body": {
          "en": "The 2nd case marks what the action is done to, and where you are going.",
          "hi": "द्वितीया बताती है कि क्रिया किस पर हो रही है, और आप कहाँ जा रहे हैं।"
        },
        "example": {
          "sa": "सः ग्रामं गच्छति",
          "iast": "saḥ grāmaṃ gacchati",
          "gloss": {
            "en": "He goes to the village.",
            "hi": "वह गाँव जाता है।"
          },
          "alt": {
            "en": "He goes to the village.",
            "hi": "वह गाँव जाता है।"
          }
        },
        "assetIds": [
          "guide-accusative-1"
        ]
      },
      {
        "id": "guide-art-accusative-guide-accusative-2",
        "kind": "teach",
        "title": {
          "en": "Accusative: the object and the goal",
          "hi": "द्वितीया: कर्म और गंतव्य"
        },
        "body": {
          "en": "The 2nd case marks what the action is done to, and where you are going.",
          "hi": "द्वितीया बताती है कि क्रिया किस पर हो रही है, और आप कहाँ जा रहे हैं।"
        },
        "example": {
          "sa": "रामः सीतां पश्यति",
          "iast": "rāmaḥ sītāṃ paśyati",
          "gloss": {
            "en": "Rāma sees Sītā.",
            "hi": "राम सीता को देखता है।"
          },
          "alt": {
            "en": "Rāma sees Sītā.",
            "hi": "राम सीता को देखता है।"
          }
        },
        "assetIds": [
          "guide-accusative-2"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-vowels",
    "rank": 9,
    "unit": {
      "en": "Sounds & script",
      "hi": "ध्वनि और लिपि"
    },
    "chapterId": "sounds",
    "title": {
      "en": "Vowels, short and long",
      "hi": "स्वर — ह्रस्व और दीर्घ"
    },
    "titleSa": "स्वराः",
    "titleIast": "svarāḥ",
    "outcome": {
      "en": "Vowels come in short and long pairs, and the length can change a word's meaning.",
      "hi": "स्वर ह्रस्व और दीर्घ जोड़ों में आते हैं, और लम्बाई बदलने से शब्द का अर्थ बदल सकता है।"
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-vowels-guide-vowels-1",
        "kind": "teach",
        "title": {
          "en": "Vowels, short and long",
          "hi": "स्वर — ह्रस्व और दीर्घ"
        },
        "body": {
          "en": "Vowels come in short and long pairs, and the length can change a word's meaning.",
          "hi": "स्वर ह्रस्व और दीर्घ जोड़ों में आते हैं, और लम्बाई बदलने से शब्द का अर्थ बदल सकता है।"
        },
        "example": {
          "sa": "दिनम्",
          "iast": "dinam",
          "gloss": {
            "en": "a day — short i",
            "hi": "दिन — ह्रस्व इ"
          },
          "alt": {
            "en": "a day — short i",
            "hi": "दिन — ह्रस्व इ"
          }
        },
        "assetIds": [
          "guide-vowels-1"
        ]
      },
      {
        "id": "guide-art-vowels-guide-vowels-2",
        "kind": "teach",
        "title": {
          "en": "Vowels, short and long",
          "hi": "स्वर — ह्रस्व और दीर्घ"
        },
        "body": {
          "en": "Vowels come in short and long pairs, and the length can change a word's meaning.",
          "hi": "स्वर ह्रस्व और दीर्घ जोड़ों में आते हैं, और लम्बाई बदलने से शब्द का अर्थ बदल सकता है।"
        },
        "example": {
          "sa": "दीनः",
          "iast": "dīnaḥ",
          "gloss": {
            "en": "a poor, humble person — long ī",
            "hi": "दीन व्यक्ति — दीर्घ ई"
          },
          "alt": {
            "en": "a poor, humble person — long ī",
            "hi": "दीन व्यक्ति — दीर्घ ई"
          }
        },
        "assetIds": [
          "guide-vowels-2"
        ]
      },
      {
        "id": "guide-art-vowels-guide-vowels-3",
        "kind": "teach",
        "title": {
          "en": "Vowels, short and long",
          "hi": "स्वर — ह्रस्व और दीर्घ"
        },
        "body": {
          "en": "Vowels come in short and long pairs, and the length can change a word's meaning.",
          "hi": "स्वर ह्रस्व और दीर्घ जोड़ों में आते हैं, और लम्बाई बदलने से शब्द का अर्थ बदल सकता है।"
        },
        "example": {
          "sa": "कुलम्",
          "iast": "kulam",
          "gloss": {
            "en": "a family — short u",
            "hi": "कुल, परिवार — ह्रस्व उ"
          },
          "alt": {
            "en": "a family — short u",
            "hi": "कुल, परिवार — ह्रस्व उ"
          }
        },
        "assetIds": [
          "guide-vowels-3"
        ]
      },
      {
        "id": "guide-art-vowels-guide-vowels-4",
        "kind": "teach",
        "title": {
          "en": "Vowels, short and long",
          "hi": "स्वर — ह्रस्व और दीर्घ"
        },
        "body": {
          "en": "Vowels come in short and long pairs, and the length can change a word's meaning.",
          "hi": "स्वर ह्रस्व और दीर्घ जोड़ों में आते हैं, और लम्बाई बदलने से शब्द का अर्थ बदल सकता है।"
        },
        "example": {
          "sa": "कूलम्",
          "iast": "kūlam",
          "gloss": {
            "en": "a riverbank — long ū",
            "hi": "नदी का किनारा — दीर्घ ऊ"
          },
          "alt": {
            "en": "a riverbank — long ū",
            "hi": "नदी का किनारा — दीर्घ ऊ"
          }
        },
        "assetIds": [
          "guide-vowels-4"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-consonants",
    "rank": 10,
    "unit": {
      "en": "Sounds & script",
      "hi": "ध्वनि और लिपि"
    },
    "chapterId": "sounds",
    "title": {
      "en": "The consonant grid",
      "hi": "व्यंजनों की सारणी"
    },
    "titleSa": "व्यञ्जनानि",
    "titleIast": "vyañjanāni",
    "outcome": {
      "en": "Consonants are arranged by where the mouth makes them — throat to lips — in a neat 5 × 5 grid.",
      "hi": "व्यंजन इस क्रम में सजे हैं कि मुँह में वे कहाँ बनते हैं — गले से होंठों तक — एक सुंदर 5 × 5 सारणी में।"
    },
    "minutes": 6,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-consonants-guide-consonants-1",
        "kind": "teach",
        "title": {
          "en": "The consonant grid",
          "hi": "व्यंजनों की सारणी"
        },
        "body": {
          "en": "Consonants are arranged by where the mouth makes them — throat to lips — in a neat 5 × 5 grid.",
          "hi": "व्यंजन इस क्रम में सजे हैं कि मुँह में वे कहाँ बनते हैं — गले से होंठों तक — एक सुंदर 5 × 5 सारणी में।"
        },
        "example": {
          "sa": "करः",
          "iast": "karaḥ",
          "gloss": {
            "en": "a hand; a ray of light — plain k",
            "hi": "हाथ; किरण — अल्पप्राण क"
          },
          "alt": {
            "en": "a hand; a ray of light — plain k",
            "hi": "हाथ; किरण — अल्पप्राण क"
          }
        },
        "assetIds": [
          "guide-consonants-1"
        ]
      },
      {
        "id": "guide-art-consonants-guide-consonants-2",
        "kind": "teach",
        "title": {
          "en": "The consonant grid",
          "hi": "व्यंजनों की सारणी"
        },
        "body": {
          "en": "Consonants are arranged by where the mouth makes them — throat to lips — in a neat 5 × 5 grid.",
          "hi": "व्यंजन इस क्रम में सजे हैं कि मुँह में वे कहाँ बनते हैं — गले से होंठों तक — एक सुंदर 5 × 5 सारणी में।"
        },
        "example": {
          "sa": "खरः",
          "iast": "kharaḥ",
          "gloss": {
            "en": "a donkey — breathy kh",
            "hi": "गधा — महाप्राण ख"
          },
          "alt": {
            "en": "a donkey — breathy kh",
            "hi": "गधा — महाप्राण ख"
          }
        },
        "assetIds": [
          "guide-consonants-2"
        ]
      },
      {
        "id": "guide-art-consonants-guide-consonants-4",
        "kind": "teach",
        "title": {
          "en": "The consonant grid",
          "hi": "व्यंजनों की सारणी"
        },
        "body": {
          "en": "Consonants are arranged by where the mouth makes them — throat to lips — in a neat 5 × 5 grid.",
          "hi": "व्यंजन इस क्रम में सजे हैं कि मुँह में वे कहाँ बनते हैं — गले से होंठों तक — एक सुंदर 5 × 5 सारणी में।"
        },
        "example": {
          "sa": "फलम्",
          "iast": "phalam",
          "gloss": {
            "en": "a fruit — breathy ph",
            "hi": "फल — महाप्राण फ"
          },
          "alt": {
            "en": "a fruit — breathy ph",
            "hi": "फल — महाप्राण फ"
          }
        },
        "assetIds": [
          "guide-consonants-4"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-gender",
    "rank": 11,
    "unit": {
      "en": "Nouns",
      "hi": "संज्ञा"
    },
    "chapterId": "nouns",
    "title": {
      "en": "Gender: masculine, feminine, neuter",
      "hi": "लिंग: पुंलिंग, स्त्रीलिंग, नपुंसकलिंग"
    },
    "titleSa": "लिङ्गानि",
    "titleIast": "liṅgāni",
    "outcome": {
      "en": "Every noun has a gender — masculine, feminine or neuter — and it decides the endings.",
      "hi": "हर संज्ञा का एक लिंग होता है — पुंलिंग, स्त्रीलिंग या नपुंसकलिंग — और वही उसके रूप तय करता है।"
    },
    "minutes": 6,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-gender-guide-gender-2",
        "kind": "teach",
        "title": {
          "en": "Gender: masculine, feminine, neuter",
          "hi": "लिंग: पुंलिंग, स्त्रीलिंग, नपुंसकलिंग"
        },
        "body": {
          "en": "Every noun has a gender — masculine, feminine or neuter — and it decides the endings.",
          "hi": "हर संज्ञा का एक लिंग होता है — पुंलिंग, स्त्रीलिंग या नपुंसकलिंग — और वही उसके रूप तय करता है।"
        },
        "example": {
          "sa": "सूर्यः",
          "iast": "sūryaḥ",
          "gloss": {
            "en": "the sun — masculine",
            "hi": "सूर्य — पुंलिंग"
          },
          "alt": {
            "en": "the sun — masculine",
            "hi": "सूर्य — पुंलिंग"
          }
        },
        "assetIds": [
          "guide-gender-2"
        ]
      },
      {
        "id": "guide-art-gender-guide-gender-3",
        "kind": "teach",
        "title": {
          "en": "Gender: masculine, feminine, neuter",
          "hi": "लिंग: पुंलिंग, स्त्रीलिंग, नपुंसकलिंग"
        },
        "body": {
          "en": "Every noun has a gender — masculine, feminine or neuter — and it decides the endings.",
          "hi": "हर संज्ञा का एक लिंग होता है — पुंलिंग, स्त्रीलिंग या नपुंसकलिंग — और वही उसके रूप तय करता है।"
        },
        "example": {
          "sa": "भूमिः",
          "iast": "bhūmiḥ",
          "gloss": {
            "en": "the earth — feminine",
            "hi": "भूमि — स्त्रीलिंग"
          },
          "alt": {
            "en": "the earth — feminine",
            "hi": "भूमि — स्त्रीलिंग"
          }
        },
        "assetIds": [
          "guide-gender-3"
        ]
      },
      {
        "id": "guide-art-gender-guide-gender-4",
        "kind": "teach",
        "title": {
          "en": "Gender: masculine, feminine, neuter",
          "hi": "लिंग: पुंलिंग, स्त्रीलिंग, नपुंसकलिंग"
        },
        "body": {
          "en": "Every noun has a gender — masculine, feminine or neuter — and it decides the endings.",
          "hi": "हर संज्ञा का एक लिंग होता है — पुंलिंग, स्त्रीलिंग या नपुंसकलिंग — और वही उसके रूप तय करता है।"
        },
        "example": {
          "sa": "पुस्तकम्",
          "iast": "pustakam",
          "gloss": {
            "en": "a book — neuter",
            "hi": "पुस्तक — नपुंसकलिंग (हिन्दी में स्त्रीलिंग)"
          },
          "alt": {
            "en": "a book — neuter",
            "hi": "पुस्तक — नपुंसकलिंग (हिन्दी में स्त्रीलिंग)"
          }
        },
        "assetIds": [
          "guide-gender-4"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-agreement",
    "rank": 12,
    "unit": {
      "en": "Nouns",
      "hi": "संज्ञा"
    },
    "chapterId": "nouns",
    "title": {
      "en": "Adjectives agree",
      "hi": "विशेषण संज्ञा के साथ चलता है"
    },
    "titleSa": "विशेषणम्",
    "titleIast": "viśeṣaṇam",
    "outcome": {
      "en": "A describing word copies its noun's gender, number and case.",
      "hi": "गुण बताने वाला शब्द अपनी संज्ञा का लिंग, वचन और विभक्ति अपना लेता है।"
    },
    "minutes": 6,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-agreement-guide-agreement-1",
        "kind": "teach",
        "title": {
          "en": "Adjectives agree",
          "hi": "विशेषण संज्ञा के साथ चलता है"
        },
        "body": {
          "en": "A describing word copies its noun's gender, number and case.",
          "hi": "गुण बताने वाला शब्द अपनी संज्ञा का लिंग, वचन और विभक्ति अपना लेता है।"
        },
        "example": {
          "sa": "सुन्दरः बालकः",
          "iast": "sundaraḥ bālakaḥ",
          "gloss": {
            "en": "a handsome boy",
            "hi": "सुंदर बालक"
          },
          "alt": {
            "en": "a handsome boy",
            "hi": "सुंदर बालक"
          }
        },
        "assetIds": [
          "guide-agreement-1"
        ]
      },
      {
        "id": "guide-art-agreement-guide-agreement-2",
        "kind": "teach",
        "title": {
          "en": "Adjectives agree",
          "hi": "विशेषण संज्ञा के साथ चलता है"
        },
        "body": {
          "en": "A describing word copies its noun's gender, number and case.",
          "hi": "गुण बताने वाला शब्द अपनी संज्ञा का लिंग, वचन और विभक्ति अपना लेता है।"
        },
        "example": {
          "sa": "सुन्दरी बालिका",
          "iast": "sundarī bālikā",
          "gloss": {
            "en": "a pretty girl",
            "hi": "सुंदर बालिका"
          },
          "alt": {
            "en": "a pretty girl",
            "hi": "सुंदर बालिका"
          }
        },
        "assetIds": [
          "guide-agreement-2"
        ]
      },
      {
        "id": "guide-art-agreement-guide-agreement-3",
        "kind": "teach",
        "title": {
          "en": "Adjectives agree",
          "hi": "विशेषण संज्ञा के साथ चलता है"
        },
        "body": {
          "en": "A describing word copies its noun's gender, number and case.",
          "hi": "गुण बताने वाला शब्द अपनी संज्ञा का लिंग, वचन और विभक्ति अपना लेता है।"
        },
        "example": {
          "sa": "सुन्दराणि फलानि",
          "iast": "sundarāṇi phalāni",
          "gloss": {
            "en": "lovely fruits",
            "hi": "सुंदर फल (कई)"
          },
          "alt": {
            "en": "lovely fruits",
            "hi": "सुंदर फल (कई)"
          }
        },
        "assetIds": [
          "guide-agreement-3"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-cases-overview",
    "rank": 13,
    "unit": {
      "en": "The 8 cases",
      "hi": "आठ विभक्तियाँ"
    },
    "chapterId": "cases",
    "title": {
      "en": "The 8 cases at a glance",
      "hi": "आठों विभक्तियाँ एक नज़र में"
    },
    "titleSa": "विभक्तयः",
    "titleIast": "vibhaktayaḥ",
    "outcome": {
      "en": "Eight sets of endings tell you a noun's job: doer, object, tool, receiver, source, owner, place — and the call.",
      "hi": "आठ विभक्तियाँ संज्ञा का काम बताती हैं: कर्ता, कर्म, साधन, पाने वाला, जहाँ से अलग हो, सम्बन्ध, स्थान — और पुकार।"
    },
    "minutes": 2,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-cases-overview-guide-cases-overview-1",
        "kind": "teach",
        "title": {
          "en": "The 8 cases at a glance",
          "hi": "आठों विभक्तियाँ एक नज़र में"
        },
        "body": {
          "en": "Eight sets of endings tell you a noun's job: doer, object, tool, receiver, source, owner, place — and the call.",
          "hi": "आठ विभक्तियाँ संज्ञा का काम बताती हैं: कर्ता, कर्म, साधन, पाने वाला, जहाँ से अलग हो, सम्बन्ध, स्थान — और पुकार।"
        },
        "example": {
          "sa": "रामः ग्रामात् वनं गच्छति",
          "iast": "rāmaḥ grāmāt vanaṃ gacchati",
          "gloss": {
            "en": "Rāma goes from the village to the forest.",
            "hi": "राम गाँव से वन जाता है।"
          },
          "alt": {
            "en": "Rāma goes from the village to the forest.",
            "hi": "राम गाँव से वन जाता है।"
          }
        },
        "assetIds": [
          "guide-cases-overview-1"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-nominative-vocative",
    "rank": 14,
    "unit": {
      "en": "The 8 cases",
      "hi": "आठ विभक्तियाँ"
    },
    "chapterId": "cases",
    "title": {
      "en": "Nominative & vocative: the doer and the call",
      "hi": "प्रथमा और सम्बोधन: कर्ता और पुकार"
    },
    "titleSa": "प्रथमा सम्बोधनं च",
    "titleIast": "prathamā sambodhanaṃ ca",
    "outcome": {
      "en": "The 1st case names who does the action; the vocative calls someone by name.",
      "hi": "प्रथमा बताती है कि काम कौन कर रहा है; सम्बोधन किसी को नाम से पुकारता है।"
    },
    "minutes": 4,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-nominative-vocative-guide-nominative-vocative-1",
        "kind": "teach",
        "title": {
          "en": "Nominative & vocative: the doer and the call",
          "hi": "प्रथमा और सम्बोधन: कर्ता और पुकार"
        },
        "body": {
          "en": "The 1st case names who does the action; the vocative calls someone by name.",
          "hi": "प्रथमा बताती है कि काम कौन कर रहा है; सम्बोधन किसी को नाम से पुकारता है।"
        },
        "example": {
          "sa": "रामः वनं गच्छति",
          "iast": "rāmaḥ vanaṃ gacchati",
          "gloss": {
            "en": "Rāma goes to the forest.",
            "hi": "राम वन जाता है।"
          },
          "alt": {
            "en": "Rāma goes to the forest.",
            "hi": "राम वन जाता है।"
          }
        },
        "assetIds": [
          "guide-nominative-vocative-1"
        ]
      },
      {
        "id": "guide-art-nominative-vocative-guide-nominative-vocative-2",
        "kind": "teach",
        "title": {
          "en": "Nominative & vocative: the doer and the call",
          "hi": "प्रथमा और सम्बोधन: कर्ता और पुकार"
        },
        "body": {
          "en": "The 1st case names who does the action; the vocative calls someone by name.",
          "hi": "प्रथमा बताती है कि काम कौन कर रहा है; सम्बोधन किसी को नाम से पुकारता है।"
        },
        "example": {
          "sa": "हे कृष्ण, अत्र आगच्छ",
          "iast": "he kṛṣṇa, atra āgaccha",
          "gloss": {
            "en": "O Kṛṣṇa, come here!",
            "hi": "हे कृष्ण, यहाँ आओ!"
          },
          "alt": {
            "en": "O Kṛṣṇa, come here!",
            "hi": "हे कृष्ण, यहाँ आओ!"
          }
        },
        "assetIds": [
          "guide-nominative-vocative-2"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-instrumental",
    "rank": 15,
    "unit": {
      "en": "The 8 cases",
      "hi": "आठ विभक्तियाँ"
    },
    "chapterId": "cases",
    "title": {
      "en": "Instrumental: with and by",
      "hi": "तृतीया: से और के द्वारा"
    },
    "titleSa": "तृतीया",
    "titleIast": "tṛtīyā",
    "outcome": {
      "en": "The 3rd case marks the tool, the means, the companion — and the doer of a passive sentence.",
      "hi": "तृतीया साधन, माध्यम, साथी — और कर्मवाच्य का कर्ता — बताती है।"
    },
    "minutes": 2,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-instrumental-guide-instrumental-2",
        "kind": "teach",
        "title": {
          "en": "Instrumental: with and by",
          "hi": "तृतीया: से और के द्वारा"
        },
        "body": {
          "en": "The 3rd case marks the tool, the means, the companion — and the doer of a passive sentence.",
          "hi": "तृतीया साधन, माध्यम, साथी — और कर्मवाच्य का कर्ता — बताती है।"
        },
        "example": {
          "sa": "रामः लक्ष्मणेन सह वनं गच्छति",
          "iast": "rāmaḥ lakṣmaṇena saha vanaṃ gacchati",
          "gloss": {
            "en": "Rāma goes to the forest with Lakṣmaṇa.",
            "hi": "राम लक्ष्मण के साथ वन जाता है।"
          },
          "alt": {
            "en": "Rāma goes to the forest with Lakṣmaṇa.",
            "hi": "राम लक्ष्मण के साथ वन जाता है।"
          }
        },
        "assetIds": [
          "guide-instrumental-2"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-genitive",
    "rank": 16,
    "unit": {
      "en": "The 8 cases",
      "hi": "आठ विभक्तियाँ"
    },
    "chapterId": "cases",
    "title": {
      "en": "Genitive: of, 's",
      "hi": "षष्ठी: का, की, के"
    },
    "titleSa": "षष्ठी",
    "titleIast": "ṣaṣṭhī",
    "outcome": {
      "en": "The 6th case links one noun to another: whose, of what, part of which.",
      "hi": "षष्ठी एक संज्ञा को दूसरी से जोड़ती है: किसका, किस चीज़ का।"
    },
    "minutes": 4,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-genitive-guide-genitive-1",
        "kind": "teach",
        "title": {
          "en": "Genitive: of, 's",
          "hi": "षष्ठी: का, की, के"
        },
        "body": {
          "en": "The 6th case links one noun to another: whose, of what, part of which.",
          "hi": "षष्ठी एक संज्ञा को दूसरी से जोड़ती है: किसका, किस चीज़ का।"
        },
        "example": {
          "sa": "दशरथस्य पुत्रः रामः",
          "iast": "daśarathasya putraḥ rāmaḥ",
          "gloss": {
            "en": "Rāma, the son of Daśaratha",
            "hi": "दशरथ का पुत्र राम"
          },
          "alt": {
            "en": "Rāma, the son of Daśaratha",
            "hi": "दशरथ का पुत्र राम"
          }
        },
        "assetIds": [
          "guide-genitive-1"
        ]
      },
      {
        "id": "guide-art-genitive-guide-genitive-2",
        "kind": "teach",
        "title": {
          "en": "Genitive: of, 's",
          "hi": "षष्ठी: का, की, के"
        },
        "body": {
          "en": "The 6th case links one noun to another: whose, of what, part of which.",
          "hi": "षष्ठी एक संज्ञा को दूसरी से जोड़ती है: किसका, किस चीज़ का।"
        },
        "example": {
          "sa": "गङ्गायाः जलम्",
          "iast": "gaṅgāyāḥ jalam",
          "gloss": {
            "en": "the water of the Gaṅgā",
            "hi": "गंगा का जल"
          },
          "alt": {
            "en": "the water of the Gaṅgā",
            "hi": "गंगा का जल"
          }
        },
        "assetIds": [
          "guide-genitive-2"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-upapada",
    "rank": 17,
    "unit": {
      "en": "The 8 cases",
      "hi": "आठ विभक्तियाँ"
    },
    "chapterId": "cases",
    "title": {
      "en": "Words that demand a case",
      "hi": "उपपद विभक्ति"
    },
    "titleSa": "उपपदविभक्तयः",
    "titleIast": "upapadavibhaktayaḥ",
    "outcome": {
      "en": "Some words always pull the noun beside them into a fixed case — learn them as pairs.",
      "hi": "कुछ शब्द अपने साथ वाली संज्ञा को हमेशा तय विभक्ति में लाते हैं — इन्हें जोड़ी की तरह सीखिए।"
    },
    "minutes": 4,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-upapada-guide-upapada-1",
        "kind": "teach",
        "title": {
          "en": "Words that demand a case",
          "hi": "उपपद विभक्ति"
        },
        "body": {
          "en": "Some words always pull the noun beside them into a fixed case — learn them as pairs.",
          "hi": "कुछ शब्द अपने साथ वाली संज्ञा को हमेशा तय विभक्ति में लाते हैं — इन्हें जोड़ी की तरह सीखिए।"
        },
        "example": {
          "sa": "रामः सीतया सह वनं गच्छति",
          "iast": "rāmaḥ sītayā saha vanaṃ gacchati",
          "gloss": {
            "en": "Rāma goes to the forest with Sītā.",
            "hi": "राम सीता के साथ वन जाता है।"
          },
          "alt": {
            "en": "Rāma goes to the forest with Sītā.",
            "hi": "राम सीता के साथ वन जाता है।"
          }
        },
        "assetIds": [
          "guide-upapada-1"
        ]
      },
      {
        "id": "guide-art-upapada-guide-upapada-2",
        "kind": "teach",
        "title": {
          "en": "Words that demand a case",
          "hi": "उपपद विभक्ति"
        },
        "body": {
          "en": "Some words always pull the noun beside them into a fixed case — learn them as pairs.",
          "hi": "कुछ शब्द अपने साथ वाली संज्ञा को हमेशा तय विभक्ति में लाते हैं — इन्हें जोड़ी की तरह सीखिए।"
        },
        "example": {
          "sa": "विद्यालयं परितः वृक्षाः सन्ति",
          "iast": "vidyālayaṃ paritaḥ vṛkṣāḥ santi",
          "gloss": {
            "en": "There are trees all around the school.",
            "hi": "विद्यालय के चारों ओर पेड़ हैं।"
          },
          "alt": {
            "en": "There are trees all around the school.",
            "hi": "विद्यालय के चारों ओर पेड़ हैं।"
          }
        },
        "assetIds": [
          "guide-upapada-2"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-a-masculine",
    "rank": 18,
    "unit": {
      "en": "Noun families",
      "hi": "शब्दरूप"
    },
    "chapterId": "families",
    "title": {
      "en": "-a masculine nouns: देव",
      "hi": "अकारान्त पुंलिंग: देव"
    },
    "titleSa": "अकारान्तपुंलिङ्गशब्दाः",
    "titleIast": "akārāntapuṃliṅgaśabdāḥ",
    "outcome": {
      "en": "The most common noun family. Learn देव and thousands of words like it follow.",
      "hi": "सबसे आम शब्द-परिवार। देव के रूप सीख लिए, तो हज़ारों ऐसे शब्द अपने आप आ जाएँगे।"
    },
    "minutes": 2,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-a-masculine-guide-a-masculine-3",
        "kind": "teach",
        "title": {
          "en": "-a masculine nouns: देव",
          "hi": "अकारान्त पुंलिंग: देव"
        },
        "body": {
          "en": "The most common noun family. Learn देव and thousands of words like it follow.",
          "hi": "सबसे आम शब्द-परिवार। देव के रूप सीख लिए, तो हज़ारों ऐसे शब्द अपने आप आ जाएँगे।"
        },
        "example": {
          "sa": "बालकेभ्यः",
          "iast": "bālakebhyaḥ",
          "gloss": {
            "en": "for the boys",
            "hi": "बालकों के लिए"
          },
          "alt": {
            "en": "for the boys",
            "hi": "बालकों के लिए"
          }
        },
        "assetIds": [
          "guide-a-masculine-3"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-a-neuter",
    "rank": 19,
    "unit": {
      "en": "Noun families",
      "hi": "शब्दरूप"
    },
    "chapterId": "families",
    "title": {
      "en": "-a neuter nouns: फल",
      "hi": "अकारान्त नपुंसकलिंग: फल"
    },
    "titleSa": "अकारान्तनपुंसकलिङ्गशब्दाः",
    "titleIast": "akārāntanapuṃsakaliṅgaśabdāḥ",
    "outcome": {
      "en": "Neuter a-words share most endings with देव — only the doer, object and call forms differ.",
      "hi": "नपुंसकलिंग अ-शब्दों के ज़्यादातर रूप देव जैसे हैं — बस कर्ता, कर्म और सम्बोधन अलग हैं।"
    },
    "minutes": 2,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-a-neuter-guide-a-neuter-2",
        "kind": "teach",
        "title": {
          "en": "-a neuter nouns: फल",
          "hi": "अकारान्त नपुंसकलिंग: फल"
        },
        "body": {
          "en": "Neuter a-words share most endings with देव — only the doer, object and call forms differ.",
          "hi": "नपुंसकलिंग अ-शब्दों के ज़्यादातर रूप देव जैसे हैं — बस कर्ता, कर्म और सम्बोधन अलग हैं।"
        },
        "example": {
          "sa": "पुस्तकानि",
          "iast": "pustakāni",
          "gloss": {
            "en": "books",
            "hi": "पुस्तकें"
          },
          "alt": {
            "en": "books",
            "hi": "पुस्तकें"
          }
        },
        "assetIds": [
          "guide-a-neuter-2"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-aa-feminine",
    "rank": 20,
    "unit": {
      "en": "Noun families",
      "hi": "शब्दरूप"
    },
    "chapterId": "families",
    "title": {
      "en": "-ā feminine nouns: लता",
      "hi": "आकारान्त स्त्रीलिंग: लता"
    },
    "titleSa": "आकारान्तस्त्रीलिङ्गशब्दाः",
    "titleIast": "ākārāntastrīliṅgaśabdāḥ",
    "outcome": {
      "en": "Feminine words in -ā follow लता, with long, clear endings that are easy to spot.",
      "hi": "आ पर खत्म होने वाले स्त्रीलिंग शब्द लता की तरह चलते हैं; इनके अंत लम्बे और साफ़ पहचाने जाते हैं।"
    },
    "minutes": 2,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-aa-feminine-guide-aa-feminine-2",
        "kind": "teach",
        "title": {
          "en": "-ā feminine nouns: लता",
          "hi": "आकारान्त स्त्रीलिंग: लता"
        },
        "body": {
          "en": "Feminine words in -ā follow लता, with long, clear endings that are easy to spot.",
          "hi": "आ पर खत्म होने वाले स्त्रीलिंग शब्द लता की तरह चलते हैं; इनके अंत लम्बे और साफ़ पहचाने जाते हैं।"
        },
        "example": {
          "sa": "बालिकायै",
          "iast": "bālikāyai",
          "gloss": {
            "en": "for the girl",
            "hi": "बालिका के लिए"
          },
          "alt": {
            "en": "for the girl",
            "hi": "बालिका के लिए"
          }
        },
        "assetIds": [
          "guide-aa-feminine-2"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-i-stems",
    "rank": 21,
    "unit": {
      "en": "Noun families",
      "hi": "शब्दरूप"
    },
    "chapterId": "families",
    "title": {
      "en": "-i nouns: कवि and मति",
      "hi": "इकारान्त शब्द: कवि और मति"
    },
    "titleSa": "इकारान्तशब्दाः",
    "titleIast": "ikārāntaśabdāḥ",
    "outcome": {
      "en": "Words in -i strengthen their vowel before some endings: kavi → kavaye, kaveḥ.",
      "hi": "इ-अंत शब्दों में कुछ प्रत्ययों से पहले स्वर बलवान होता है: कवि → कवये, कवेः।"
    },
    "minutes": 4,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-i-stems-guide-i-stems-2",
        "kind": "teach",
        "title": {
          "en": "-i nouns: कवि and मति",
          "hi": "इकारान्त शब्द: कवि और मति"
        },
        "body": {
          "en": "Words in -i strengthen their vowel before some endings: kavi → kavaye, kaveḥ.",
          "hi": "इ-अंत शब्दों में कुछ प्रत्ययों से पहले स्वर बलवान होता है: कवि → कवये, कवेः।"
        },
        "example": {
          "sa": "भूमौ",
          "iast": "bhūmau",
          "gloss": {
            "en": "on the earth",
            "hi": "धरती पर"
          },
          "alt": {
            "en": "on the earth",
            "hi": "धरती पर"
          }
        },
        "assetIds": [
          "guide-i-stems-2"
        ]
      },
      {
        "id": "guide-art-i-stems-guide-i-stems-3",
        "kind": "teach",
        "title": {
          "en": "-i nouns: कवि and मति",
          "hi": "इकारान्त शब्द: कवि और मति"
        },
        "body": {
          "en": "Words in -i strengthen their vowel before some endings: kavi → kavaye, kaveḥ.",
          "hi": "इ-अंत शब्दों में कुछ प्रत्ययों से पहले स्वर बलवान होता है: कवि → कवये, कवेः।"
        },
        "example": {
          "sa": "अग्नये",
          "iast": "agnaye",
          "gloss": {
            "en": "to Agni, the fire",
            "hi": "अग्नि को"
          },
          "alt": {
            "en": "to Agni, the fire",
            "hi": "अग्नि को"
          }
        },
        "assetIds": [
          "guide-i-stems-3"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-u-stems",
    "rank": 22,
    "unit": {
      "en": "Noun families",
      "hi": "शब्दरूप"
    },
    "chapterId": "families",
    "title": {
      "en": "-u nouns: गुरु, मधु, धेनु",
      "hi": "उकारान्त शब्द: गुरु, मधु, धेनु"
    },
    "titleSa": "उकारान्तशब्दाः",
    "titleIast": "ukārāntaśabdāḥ",
    "outcome": {
      "en": "u-words mirror i-words: u grows to o, and the locative ends in -au.",
      "hi": "उ-शब्द इ-शब्दों का प्रतिबिम्ब हैं: उ बढ़कर ओ बनता है, और सप्तमी -औ पर खत्म होती है।"
    },
    "minutes": 4,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-u-stems-guide-u-stems-1",
        "kind": "teach",
        "title": {
          "en": "-u nouns: गुरु, मधु, धेनु",
          "hi": "उकारान्त शब्द: गुरु, मधु, धेनु"
        },
        "body": {
          "en": "u-words mirror i-words: u grows to o, and the locative ends in -au.",
          "hi": "उ-शब्द इ-शब्दों का प्रतिबिम्ब हैं: उ बढ़कर ओ बनता है, और सप्तमी -औ पर खत्म होती है।"
        },
        "example": {
          "sa": "गुरवे नमः",
          "iast": "gurave namaḥ",
          "gloss": {
            "en": "Salutation to the teacher.",
            "hi": "गुरु को नमस्कार।"
          },
          "alt": {
            "en": "Salutation to the teacher.",
            "hi": "गुरु को नमस्कार।"
          }
        },
        "assetIds": [
          "guide-u-stems-1"
        ]
      },
      {
        "id": "guide-art-u-stems-guide-u-stems-3",
        "kind": "teach",
        "title": {
          "en": "-u nouns: गुरु, मधु, धेनु",
          "hi": "उकारान्त शब्द: गुरु, मधु, धेनु"
        },
        "body": {
          "en": "u-words mirror i-words: u grows to o, and the locative ends in -au.",
          "hi": "उ-शब्द इ-शब्दों का प्रतिबिम्ब हैं: उ बढ़कर ओ बनता है, और सप्तमी -औ पर खत्म होती है।"
        },
        "example": {
          "sa": "वस्तूनि",
          "iast": "vastūni",
          "gloss": {
            "en": "things",
            "hi": "वस्तुएँ"
          },
          "alt": {
            "en": "things",
            "hi": "वस्तुएँ"
          }
        },
        "assetIds": [
          "guide-u-stems-3"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-ii-uu-feminine",
    "rank": 23,
    "unit": {
      "en": "Noun families",
      "hi": "शब्दरूप"
    },
    "chapterId": "families",
    "title": {
      "en": "-ī and -ū feminines: नदी, वधू",
      "hi": "ईकारान्त और ऊकारान्त स्त्रीलिंग: नदी, वधू"
    },
    "titleSa": "नदी वधूश्च",
    "titleIast": "nadī vadhūśca",
    "outcome": {
      "en": "Long-vowel feminines: नदी has no visarga in the nominative, वधू does — the rest runs side by side.",
      "hi": "दीर्घ स्वर वाले स्त्रीलिंग शब्द: नदी की प्रथमा में विसर्ग नहीं, वधू में है — बाकी रूप साथ-साथ चलते हैं।"
    },
    "minutes": 2,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-ii-uu-feminine-guide-ii-uu-feminine-2",
        "kind": "teach",
        "title": {
          "en": "-ī and -ū feminines: नदी, वधू",
          "hi": "ईकारान्त और ऊकारान्त स्त्रीलिंग: नदी, वधू"
        },
        "body": {
          "en": "Long-vowel feminines: नदी has no visarga in the nominative, वधू does — the rest runs side by side.",
          "hi": "दीर्घ स्वर वाले स्त्रीलिंग शब्द: नदी की प्रथमा में विसर्ग नहीं, वधू में है — बाकी रूप साथ-साथ चलते हैं।"
        },
        "example": {
          "sa": "पुत्र्याः",
          "iast": "putryāḥ",
          "gloss": {
            "en": "of the daughter",
            "hi": "पुत्री का"
          },
          "alt": {
            "en": "of the daughter",
            "hi": "पुत्री का"
          }
        },
        "assetIds": [
          "guide-ii-uu-feminine-2"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-r-stems",
    "rank": 24,
    "unit": {
      "en": "Noun families",
      "hi": "शब्दरूप"
    },
    "chapterId": "families",
    "title": {
      "en": "-ṛ nouns: पितृ and मातृ",
      "hi": "ऋकारान्त शब्द: पितृ और मातृ"
    },
    "titleSa": "ऋकारान्तशब्दाः",
    "titleIast": "ṛkārāntaśabdāḥ",
    "outcome": {
      "en": "Family words and doer words end in -ṛ; the ṛ becomes ar, ār or r depending on the ending.",
      "hi": "परिवार के शब्द और 'करने वाले' शब्द -ऋ पर खत्म होते हैं; ऋ प्रत्यय के अनुसार अर्, आर् या र् बनता है।"
    },
    "minutes": 6,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-r-stems-guide-r-stems-1",
        "kind": "teach",
        "title": {
          "en": "-ṛ nouns: पितृ and मातृ",
          "hi": "ऋकारान्त शब्द: पितृ और मातृ"
        },
        "body": {
          "en": "Family words and doer words end in -ṛ; the ṛ becomes ar, ār or r depending on the ending.",
          "hi": "परिवार के शब्द और 'करने वाले' शब्द -ऋ पर खत्म होते हैं; ऋ प्रत्यय के अनुसार अर्, आर् या र् बनता है।"
        },
        "example": {
          "sa": "कर्ता",
          "iast": "kartā",
          "gloss": {
            "en": "a doer, a maker",
            "hi": "करने वाला, कर्ता"
          },
          "alt": {
            "en": "a doer, a maker",
            "hi": "करने वाला, कर्ता"
          }
        },
        "assetIds": [
          "guide-r-stems-1"
        ]
      },
      {
        "id": "guide-art-r-stems-guide-r-stems-2",
        "kind": "teach",
        "title": {
          "en": "-ṛ nouns: पितृ and मातृ",
          "hi": "ऋकारान्त शब्द: पितृ और मातृ"
        },
        "body": {
          "en": "Family words and doer words end in -ṛ; the ṛ becomes ar, ār or r depending on the ending.",
          "hi": "परिवार के शब्द और 'करने वाले' शब्द -ऋ पर खत्म होते हैं; ऋ प्रत्यय के अनुसार अर्, आर् या र् बनता है।"
        },
        "example": {
          "sa": "कर्तारः",
          "iast": "kartāraḥ",
          "gloss": {
            "en": "makers — note the long ā",
            "hi": "करने वाले — लम्बे आ पर ध्यान दें"
          },
          "alt": {
            "en": "makers — note the long ā",
            "hi": "करने वाले — लम्बे आ पर ध्यान दें"
          }
        },
        "assetIds": [
          "guide-r-stems-2"
        ]
      },
      {
        "id": "guide-art-r-stems-guide-r-stems-3",
        "kind": "teach",
        "title": {
          "en": "-ṛ nouns: पितृ and मातृ",
          "hi": "ऋकारान्त शब्द: पितृ और मातृ"
        },
        "body": {
          "en": "Family words and doer words end in -ṛ; the ṛ becomes ar, ār or r depending on the ending.",
          "hi": "परिवार के शब्द और 'करने वाले' शब्द -ऋ पर खत्म होते हैं; ऋ प्रत्यय के अनुसार अर्, आर् या र् बनता है।"
        },
        "example": {
          "sa": "भ्रातरम्",
          "iast": "bhrātaram",
          "gloss": {
            "en": "the brother, as the object",
            "hi": "भाई को"
          },
          "alt": {
            "en": "the brother, as the object",
            "hi": "भाई को"
          }
        },
        "assetIds": [
          "guide-r-stems-3"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-odd-nouns",
    "rank": 25,
    "unit": {
      "en": "Noun families",
      "hi": "शब्दरूप"
    },
    "chapterId": "families",
    "title": {
      "en": "Odd ones: गो and the -vat words",
      "hi": "अनोखे शब्द: गो और -वत् वाले शब्द"
    },
    "titleSa": "विशेषशब्दाः",
    "titleIast": "viśeṣaśabdāḥ",
    "outcome": {
      "en": "A few everyday nouns follow their own rules — गो “cow” and words like भगवत् are the ones you meet most.",
      "hi": "कुछ रोज़ के शब्द अपने नियम चलाते हैं — गो 'गाय' और भगवत् जैसे शब्द सबसे ज़्यादा मिलते हैं।"
    },
    "minutes": 2,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-odd-nouns-guide-odd-nouns-1",
        "kind": "teach",
        "title": {
          "en": "Odd ones: गो and the -vat words",
          "hi": "अनोखे शब्द: गो और -वत् वाले शब्द"
        },
        "body": {
          "en": "A few everyday nouns follow their own rules — गो “cow” and words like भगवत् are the ones you meet most.",
          "hi": "कुछ रोज़ के शब्द अपने नियम चलाते हैं — गो 'गाय' और भगवत् जैसे शब्द सबसे ज़्यादा मिलते हैं।"
        },
        "example": {
          "sa": "गवाम्",
          "iast": "gavām",
          "gloss": {
            "en": "of the cows",
            "hi": "गायों का"
          },
          "alt": {
            "en": "of the cows",
            "hi": "गायों का"
          }
        },
        "assetIds": [
          "guide-odd-nouns-1"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-pronoun-i-we",
    "rank": 26,
    "unit": {
      "en": "Pronouns & numbers",
      "hi": "सर्वनाम और संख्या"
    },
    "chapterId": "pronouns",
    "title": {
      "en": "I and we: अस्मद्",
      "hi": "मैं और हम: अस्मद्"
    },
    "titleSa": "अस्मद्",
    "titleIast": "asmad",
    "outcome": {
      "en": "अहम् “I” changes completely from case to case — but never for gender.",
      "hi": "अहम् 'मैं' हर विभक्ति में पूरी तरह बदल जाता है — पर लिंग से कभी नहीं।"
    },
    "minutes": 6,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-pronoun-i-we-guide-pronoun-i-we-2",
        "kind": "teach",
        "title": {
          "en": "I and we: अस्मद्",
          "hi": "मैं और हम: अस्मद्"
        },
        "body": {
          "en": "अहम् “I” changes completely from case to case — but never for gender.",
          "hi": "अहम् 'मैं' हर विभक्ति में पूरी तरह बदल जाता है — पर लिंग से कभी नहीं।"
        },
        "example": {
          "sa": "मम नाम रामः",
          "iast": "mama nāma rāmaḥ",
          "gloss": {
            "en": "My name is Rāma.",
            "hi": "मेरा नाम राम है।"
          },
          "alt": {
            "en": "My name is Rāma.",
            "hi": "मेरा नाम राम है।"
          }
        },
        "assetIds": [
          "guide-pronoun-i-we-2"
        ]
      },
      {
        "id": "guide-art-pronoun-i-we-guide-pronoun-i-we-1",
        "kind": "teach",
        "title": {
          "en": "I and we: अस्मद्",
          "hi": "मैं और हम: अस्मद्"
        },
        "body": {
          "en": "अहम् “I” changes completely from case to case — but never for gender.",
          "hi": "अहम् 'मैं' हर विभक्ति में पूरी तरह बदल जाता है — पर लिंग से कभी नहीं।"
        },
        "example": {
          "sa": "अहं छात्रः अस्मि",
          "iast": "ahaṃ chātraḥ asmi",
          "gloss": {
            "en": "I am a student.",
            "hi": "मैं छात्र हूँ।"
          },
          "alt": {
            "en": "I am a student.",
            "hi": "मैं छात्र हूँ।"
          }
        },
        "assetIds": [
          "guide-pronoun-i-we-1"
        ]
      },
      {
        "id": "guide-art-pronoun-i-we-guide-pronoun-i-we-3",
        "kind": "teach",
        "title": {
          "en": "I and we: अस्मद्",
          "hi": "मैं और हम: अस्मद्"
        },
        "body": {
          "en": "अहम् “I” changes completely from case to case — but never for gender.",
          "hi": "अहम् 'मैं' हर विभक्ति में पूरी तरह बदल जाता है — पर लिंग से कभी नहीं।"
        },
        "example": {
          "sa": "वयं भारतीयाः",
          "iast": "vayaṃ bhāratīyāḥ",
          "gloss": {
            "en": "We are Indians.",
            "hi": "हम भारतीय हैं।"
          },
          "alt": {
            "en": "We are Indians.",
            "hi": "हम भारतीय हैं।"
          }
        },
        "assetIds": [
          "guide-pronoun-i-we-3"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-pronoun-you",
    "rank": 27,
    "unit": {
      "en": "Pronouns & numbers",
      "hi": "सर्वनाम और संख्या"
    },
    "chapterId": "pronouns",
    "title": {
      "en": "You: युष्मद्",
      "hi": "तुम: युष्मद्"
    },
    "titleSa": "युष्मद्",
    "titleIast": "yuṣmad",
    "outcome": {
      "en": "त्वम् “you” works exactly like अहम् — one set of forms, no gender.",
      "hi": "त्वम् 'तुम' ठीक अहम् की तरह चलता है — रूप एक, लिंग नहीं।"
    },
    "minutes": 6,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-pronoun-you-guide-pronoun-you-1",
        "kind": "teach",
        "title": {
          "en": "You: युष्मद्",
          "hi": "तुम: युष्मद्"
        },
        "body": {
          "en": "त्वम् “you” works exactly like अहम् — one set of forms, no gender.",
          "hi": "त्वम् 'तुम' ठीक अहम् की तरह चलता है — रूप एक, लिंग नहीं।"
        },
        "example": {
          "sa": "त्वं कुत्र गच्छसि",
          "iast": "tvaṃ kutra gacchasi",
          "gloss": {
            "en": "Where are you going?",
            "hi": "तुम कहाँ जा रहे हो?"
          },
          "alt": {
            "en": "Where are you going?",
            "hi": "तुम कहाँ जा रहे हो?"
          }
        },
        "assetIds": [
          "guide-pronoun-you-1"
        ]
      },
      {
        "id": "guide-art-pronoun-you-guide-pronoun-you-2",
        "kind": "teach",
        "title": {
          "en": "You: युष्मद्",
          "hi": "तुम: युष्मद्"
        },
        "body": {
          "en": "त्वम् “you” works exactly like अहम् — one set of forms, no gender.",
          "hi": "त्वम् 'तुम' ठीक अहम् की तरह चलता है — रूप एक, लिंग नहीं।"
        },
        "example": {
          "sa": "तव नाम किम्",
          "iast": "tava nāma kim",
          "gloss": {
            "en": "What is your name?",
            "hi": "तुम्हारा नाम क्या है?"
          },
          "alt": {
            "en": "What is your name?",
            "hi": "तुम्हारा नाम क्या है?"
          }
        },
        "assetIds": [
          "guide-pronoun-you-2"
        ]
      },
      {
        "id": "guide-art-pronoun-you-guide-pronoun-you-3",
        "kind": "teach",
        "title": {
          "en": "You: युष्मद्",
          "hi": "तुम: युष्मद्"
        },
        "body": {
          "en": "त्वम् “you” works exactly like अहम् — one set of forms, no gender.",
          "hi": "त्वम् 'तुम' ठीक अहम् की तरह चलता है — रूप एक, लिंग नहीं।"
        },
        "example": {
          "sa": "यूयं पठथ",
          "iast": "yūyaṃ paṭhatha",
          "gloss": {
            "en": "You all read.",
            "hi": "तुम सब पढ़ते हो।"
          },
          "alt": {
            "en": "You all read.",
            "hi": "तुम सब पढ़ते हो।"
          }
        },
        "assetIds": [
          "guide-pronoun-you-3"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-pronoun-he-she-it",
    "rank": 28,
    "unit": {
      "en": "Pronouns & numbers",
      "hi": "सर्वनाम और संख्या"
    },
    "chapterId": "pronouns",
    "title": {
      "en": "He, she, it: तद्",
      "hi": "वह: तद्"
    },
    "titleSa": "तद्",
    "titleIast": "tad",
    "outcome": {
      "en": "तद् means both “he / she / it” and “that”, in three genders: सः, सा, तत्.",
      "hi": "तद् का अर्थ 'वह' भी है और 'वह (दूर वाला)' भी — तीन लिंगों में: सः, सा, तत्।"
    },
    "minutes": 6,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-pronoun-he-she-it-guide-pronoun-he-she-it-1",
        "kind": "teach",
        "title": {
          "en": "He, she, it: तद्",
          "hi": "वह: तद्"
        },
        "body": {
          "en": "तद् means both “he / she / it” and “that”, in three genders: सः, सा, तत्.",
          "hi": "तद् का अर्थ 'वह' भी है और 'वह (दूर वाला)' भी — तीन लिंगों में: सः, सा, तत्।"
        },
        "example": {
          "sa": "सः बालकः पठति",
          "iast": "saḥ bālakaḥ paṭhati",
          "gloss": {
            "en": "That boy reads.",
            "hi": "वह बालक पढ़ता है।"
          },
          "alt": {
            "en": "That boy reads.",
            "hi": "वह बालक पढ़ता है।"
          }
        },
        "assetIds": [
          "guide-pronoun-he-she-it-1"
        ]
      },
      {
        "id": "guide-art-pronoun-he-she-it-guide-pronoun-he-she-it-2",
        "kind": "teach",
        "title": {
          "en": "He, she, it: तद्",
          "hi": "वह: तद्"
        },
        "body": {
          "en": "तद् means both “he / she / it” and “that”, in three genders: सः, सा, तत्.",
          "hi": "तद् का अर्थ 'वह' भी है और 'वह (दूर वाला)' भी — तीन लिंगों में: सः, सा, तत्।"
        },
        "example": {
          "sa": "सा बालिका गायति",
          "iast": "sā bālikā gāyati",
          "gloss": {
            "en": "That girl sings.",
            "hi": "वह बालिका गाती है।"
          },
          "alt": {
            "en": "That girl sings.",
            "hi": "वह बालिका गाती है।"
          }
        },
        "assetIds": [
          "guide-pronoun-he-she-it-2"
        ]
      },
      {
        "id": "guide-art-pronoun-he-she-it-guide-pronoun-he-she-it-3",
        "kind": "teach",
        "title": {
          "en": "He, she, it: तद्",
          "hi": "वह: तद्"
        },
        "body": {
          "en": "तद् means both “he / she / it” and “that”, in three genders: सः, सा, तत्.",
          "hi": "तद् का अर्थ 'वह' भी है और 'वह (दूर वाला)' भी — तीन लिंगों में: सः, सा, तत्।"
        },
        "example": {
          "sa": "तत् फलं मधुरम्",
          "iast": "tat phalaṃ madhuram",
          "gloss": {
            "en": "That fruit is sweet.",
            "hi": "वह फल मीठा है।"
          },
          "alt": {
            "en": "That fruit is sweet.",
            "hi": "वह फल मीठा है।"
          }
        },
        "assetIds": [
          "guide-pronoun-he-she-it-3"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-pronoun-this-that",
    "rank": 29,
    "unit": {
      "en": "Pronouns & numbers",
      "hi": "सर्वनाम और संख्या"
    },
    "chapterId": "pronouns",
    "title": {
      "en": "This and that: एतद्, इदम्, अदस्",
      "hi": "यह और वह: एतद्, इदम्, अदस्"
    },
    "titleSa": "एतद् इदम् अदस्",
    "titleIast": "etad idam adas",
    "outcome": {
      "en": "Two words mean “this” — एषः and अयम् — and a rarer one, असौ, means “that one over there”.",
      "hi": "'यह' के लिए दो शब्द हैं — एषः और अयम् — और 'वह (उधर वाला)' के लिए कम मिलने वाला असौ।"
    },
    "minutes": 6,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-pronoun-this-that-guide-pronoun-this-that-1",
        "kind": "teach",
        "title": {
          "en": "This and that: एतद्, इदम्, अदस्",
          "hi": "यह और वह: एतद्, इदम्, अदस्"
        },
        "body": {
          "en": "Two words mean “this” — एषः and अयम् — and a rarer one, असौ, means “that one over there”.",
          "hi": "'यह' के लिए दो शब्द हैं — एषः और अयम् — और 'वह (उधर वाला)' के लिए कम मिलने वाला असौ।"
        },
        "example": {
          "sa": "एषः मम भ्राता",
          "iast": "eṣaḥ mama bhrātā",
          "gloss": {
            "en": "This is my brother.",
            "hi": "यह मेरा भाई है।"
          },
          "alt": {
            "en": "This is my brother.",
            "hi": "यह मेरा भाई है।"
          }
        },
        "assetIds": [
          "guide-pronoun-this-that-1"
        ]
      },
      {
        "id": "guide-art-pronoun-this-that-guide-pronoun-this-that-2",
        "kind": "teach",
        "title": {
          "en": "This and that: एतद्, इदम्, अदस्",
          "hi": "यह और वह: एतद्, इदम्, अदस्"
        },
        "body": {
          "en": "Two words mean “this” — एषः and अयम् — and a rarer one, असौ, means “that one over there”.",
          "hi": "'यह' के लिए दो शब्द हैं — एषः और अयम् — और 'वह (उधर वाला)' के लिए कम मिलने वाला असौ।"
        },
        "example": {
          "sa": "इयं मम माता",
          "iast": "iyaṃ mama mātā",
          "gloss": {
            "en": "This is my mother.",
            "hi": "यह मेरी माता है।"
          },
          "alt": {
            "en": "This is my mother.",
            "hi": "यह मेरी माता है।"
          }
        },
        "assetIds": [
          "guide-pronoun-this-that-2"
        ]
      },
      {
        "id": "guide-art-pronoun-this-that-guide-pronoun-this-that-3",
        "kind": "teach",
        "title": {
          "en": "This and that: एतद्, इदम्, अदस्",
          "hi": "यह और वह: एतद्, इदम्, अदस्"
        },
        "body": {
          "en": "Two words mean “this” — एषः and अयम् — and a rarer one, असौ, means “that one over there”.",
          "hi": "'यह' के लिए दो शब्द हैं — एषः और अयम् — और 'वह (उधर वाला)' के लिए कम मिलने वाला असौ।"
        },
        "example": {
          "sa": "एतत् पुस्तकम्",
          "iast": "etat pustakam",
          "gloss": {
            "en": "This is a book.",
            "hi": "यह पुस्तक है।"
          },
          "alt": {
            "en": "This is a book.",
            "hi": "यह पुस्तक है।"
          }
        },
        "assetIds": [
          "guide-pronoun-this-that-3"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-pronoun-who-which",
    "rank": 30,
    "unit": {
      "en": "Pronouns & numbers",
      "hi": "सर्वनाम और संख्या"
    },
    "chapterId": "pronouns",
    "title": {
      "en": "Who, what, which: किम् and यद्",
      "hi": "कौन, क्या, जो: किम् और यद्"
    },
    "titleSa": "किम् यद् च",
    "titleIast": "kim yad ca",
    "outcome": {
      "en": "किम् asks “who? what?”; यद् answers back as “who, which” and pairs with तद् “that”.",
      "hi": "किम् पूछता है 'कौन? क्या?'; यद् 'जो' के अर्थ में आता है और तद् 'वह' के साथ जोड़ी बनाता है।"
    },
    "minutes": 6,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-pronoun-who-which-guide-pronoun-who-which-1",
        "kind": "teach",
        "title": {
          "en": "Who, what, which: किम् and यद्",
          "hi": "कौन, क्या, जो: किम् और यद्"
        },
        "body": {
          "en": "किम् asks “who? what?”; यद् answers back as “who, which” and pairs with तद् “that”.",
          "hi": "किम् पूछता है 'कौन? क्या?'; यद् 'जो' के अर्थ में आता है और तद् 'वह' के साथ जोड़ी बनाता है।"
        },
        "example": {
          "sa": "कः अत्र आगच्छति",
          "iast": "kaḥ atra āgacchati",
          "gloss": {
            "en": "Who is coming here?",
            "hi": "यहाँ कौन आ रहा है?"
          },
          "alt": {
            "en": "Who is coming here?",
            "hi": "यहाँ कौन आ रहा है?"
          }
        },
        "assetIds": [
          "guide-pronoun-who-which-1"
        ]
      },
      {
        "id": "guide-art-pronoun-who-which-guide-pronoun-who-which-2",
        "kind": "teach",
        "title": {
          "en": "Who, what, which: किम् and यद्",
          "hi": "कौन, क्या, जो: किम् और यद्"
        },
        "body": {
          "en": "किम् asks “who? what?”; यद् answers back as “who, which” and pairs with तद् “that”.",
          "hi": "किम् पूछता है 'कौन? क्या?'; यद् 'जो' के अर्थ में आता है और तद् 'वह' के साथ जोड़ी बनाता है।"
        },
        "example": {
          "sa": "किं करोषि",
          "iast": "kiṃ karoṣi",
          "gloss": {
            "en": "What are you doing?",
            "hi": "तुम क्या कर रहे हो?"
          },
          "alt": {
            "en": "What are you doing?",
            "hi": "तुम क्या कर रहे हो?"
          }
        },
        "assetIds": [
          "guide-pronoun-who-which-2"
        ]
      },
      {
        "id": "guide-art-pronoun-who-which-guide-pronoun-who-which-3",
        "kind": "teach",
        "title": {
          "en": "Who, what, which: किम् and यद्",
          "hi": "कौन, क्या, जो: किम् और यद्"
        },
        "body": {
          "en": "किम् asks “who? what?”; यद् answers back as “who, which” and pairs with तद् “that”.",
          "hi": "किम् पूछता है 'कौन? क्या?'; यद् 'जो' के अर्थ में आता है और तद् 'वह' के साथ जोड़ी बनाता है।"
        },
        "example": {
          "sa": "यः पठति सः जानाति",
          "iast": "yaḥ paṭhati saḥ jānāti",
          "gloss": {
            "en": "The one who reads, knows.",
            "hi": "जो पढ़ता है, वह जानता है।"
          },
          "alt": {
            "en": "The one who reads, knows.",
            "hi": "जो पढ़ता है, वह जानता है।"
          }
        },
        "assetIds": [
          "guide-pronoun-who-which-3"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-polite-you",
    "rank": 31,
    "unit": {
      "en": "Pronouns & numbers",
      "hi": "सर्वनाम और संख्या"
    },
    "chapterId": "pronouns",
    "title": {
      "en": "Polite “you”: भवान्, भवती",
      "hi": "आदर वाला 'आप': भवान्, भवती"
    },
    "titleSa": "भवत्",
    "titleIast": "bhavat",
    "outcome": {
      "en": "For respect, say भवान् (to a man) or भवती (to a woman) — and use the he-form of the verb.",
      "hi": "आदर के लिए भवान् (पुरुष से) या भवती (स्त्री से) कहिए — और क्रिया प्रथम पुरुष में रखिए।"
    },
    "minutes": 4,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-polite-you-guide-polite-you-1",
        "kind": "teach",
        "title": {
          "en": "Polite “you”: भवान्, भवती",
          "hi": "आदर वाला 'आप': भवान्, भवती"
        },
        "body": {
          "en": "For respect, say भवान् (to a man) or भवती (to a woman) — and use the he-form of the verb.",
          "hi": "आदर के लिए भवान् (पुरुष से) या भवती (स्त्री से) कहिए — और क्रिया प्रथम पुरुष में रखिए।"
        },
        "example": {
          "sa": "भवान् कुत्र गच्छति",
          "iast": "bhavān kutra gacchati",
          "gloss": {
            "en": "Where are you going, sir?",
            "hi": "आप कहाँ जा रहे हैं?"
          },
          "alt": {
            "en": "Where are you going, sir?",
            "hi": "आप कहाँ जा रहे हैं?"
          }
        },
        "assetIds": [
          "guide-polite-you-1"
        ]
      },
      {
        "id": "guide-art-polite-you-guide-polite-you-2",
        "kind": "teach",
        "title": {
          "en": "Polite “you”: भवान्, भवती",
          "hi": "आदर वाला 'आप': भवान्, भवती"
        },
        "body": {
          "en": "For respect, say भवान् (to a man) or भवती (to a woman) — and use the he-form of the verb.",
          "hi": "आदर के लिए भवान् (पुरुष से) या भवती (स्त्री से) कहिए — और क्रिया प्रथम पुरुष में रखिए।"
        },
        "example": {
          "sa": "भवती किं पठति",
          "iast": "bhavatī kiṃ paṭhati",
          "gloss": {
            "en": "What are you reading, madam?",
            "hi": "आप क्या पढ़ रही हैं?"
          },
          "alt": {
            "en": "What are you reading, madam?",
            "hi": "आप क्या पढ़ रही हैं?"
          }
        },
        "assetIds": [
          "guide-polite-you-2"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-numbers-1-10",
    "rank": 32,
    "unit": {
      "en": "Pronouns & numbers",
      "hi": "सर्वनाम और संख्या"
    },
    "chapterId": "pronouns",
    "title": {
      "en": "Numbers 1–10",
      "hi": "संख्याएँ 1–10"
    },
    "titleSa": "सङ्ख्याः",
    "titleIast": "saṅkhyāḥ",
    "outcome": {
      "en": "One to four change with gender and case; five to ten keep one shape for every gender.",
      "hi": "एक से चार तक लिंग और विभक्ति से बदलते हैं; पाँच से दस तक सब लिंगों में एक-से रहते हैं।"
    },
    "minutes": 6,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-numbers-1-10-guide-numbers-1-10-1",
        "kind": "teach",
        "title": {
          "en": "Numbers 1–10",
          "hi": "संख्याएँ 1–10"
        },
        "body": {
          "en": "One to four change with gender and case; five to ten keep one shape for every gender.",
          "hi": "एक से चार तक लिंग और विभक्ति से बदलते हैं; पाँच से दस तक सब लिंगों में एक-से रहते हैं।"
        },
        "example": {
          "sa": "त्रयः बालकाः",
          "iast": "trayaḥ bālakāḥ",
          "gloss": {
            "en": "three boys",
            "hi": "तीन बालक"
          },
          "alt": {
            "en": "three boys",
            "hi": "तीन बालक"
          }
        },
        "assetIds": [
          "guide-numbers-1-10-1"
        ]
      },
      {
        "id": "guide-art-numbers-1-10-guide-numbers-1-10-2",
        "kind": "teach",
        "title": {
          "en": "Numbers 1–10",
          "hi": "संख्याएँ 1–10"
        },
        "body": {
          "en": "One to four change with gender and case; five to ten keep one shape for every gender.",
          "hi": "एक से चार तक लिंग और विभक्ति से बदलते हैं; पाँच से दस तक सब लिंगों में एक-से रहते हैं।"
        },
        "example": {
          "sa": "तिस्रः बालिकाः",
          "iast": "tisraḥ bālikāḥ",
          "gloss": {
            "en": "three girls",
            "hi": "तीन बालिकाएँ"
          },
          "alt": {
            "en": "three girls",
            "hi": "तीन बालिकाएँ"
          }
        },
        "assetIds": [
          "guide-numbers-1-10-2"
        ]
      },
      {
        "id": "guide-art-numbers-1-10-guide-numbers-1-10-3",
        "kind": "teach",
        "title": {
          "en": "Numbers 1–10",
          "hi": "संख्याएँ 1–10"
        },
        "body": {
          "en": "One to four change with gender and case; five to ten keep one shape for every gender.",
          "hi": "एक से चार तक लिंग और विभक्ति से बदलते हैं; पाँच से दस तक सब लिंगों में एक-से रहते हैं।"
        },
        "example": {
          "sa": "चत्वारि फलानि",
          "iast": "catvāri phalāni",
          "gloss": {
            "en": "four fruits",
            "hi": "चार फल"
          },
          "alt": {
            "en": "four fruits",
            "hi": "चार फल"
          }
        },
        "assetIds": [
          "guide-numbers-1-10-3"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-numbers-big-time",
    "rank": 33,
    "unit": {
      "en": "Pronouns & numbers",
      "hi": "सर्वनाम और संख्या"
    },
    "chapterId": "pronouns",
    "title": {
      "en": "Bigger numbers, ordinals and telling time",
      "hi": "बड़ी संख्याएँ, क्रम-सूचक और समय"
    },
    "titleSa": "सङ्ख्याः समयश्च",
    "titleIast": "saṅkhyāḥ samayaśca",
    "outcome": {
      "en": "From eleven up numbers are built from smaller ones; “first, second…” are ordinary adjectives; and time uses वादनम्.",
      "hi": "ग्यारह से आगे संख्याएँ छोटी संख्याओं से बनती हैं; 'पहला, दूसरा…' सामान्य विशेषण हैं; और समय 'वादनम्' से बताया जाता है।"
    },
    "minutes": 2,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-numbers-big-time-guide-numbers-big-time-1",
        "kind": "teach",
        "title": {
          "en": "Bigger numbers, ordinals and telling time",
          "hi": "बड़ी संख्याएँ, क्रम-सूचक और समय"
        },
        "body": {
          "en": "From eleven up numbers are built from smaller ones; “first, second…” are ordinary adjectives; and time uses वादनम्.",
          "hi": "ग्यारह से आगे संख्याएँ छोटी संख्याओं से बनती हैं; 'पहला, दूसरा…' सामान्य विशेषण हैं; और समय 'वादनम्' से बताया जाता है।"
        },
        "example": {
          "sa": "सः प्रथमः छात्रः",
          "iast": "saḥ prathamaḥ chātraḥ",
          "gloss": {
            "en": "He is the first student.",
            "hi": "वह पहला छात्र है।"
          },
          "alt": {
            "en": "He is the first student.",
            "hi": "वह पहला छात्र है।"
          }
        },
        "assetIds": [
          "guide-numbers-big-time-1"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-verb-grid",
    "rank": 34,
    "unit": {
      "en": "Verbs",
      "hi": "क्रिया"
    },
    "chapterId": "verbs",
    "title": {
      "en": "The 9-cell grid: person × number",
      "hi": "नौ खानों की सारणी: पुरुष × वचन"
    },
    "titleSa": "पुरुषवचनानि",
    "titleIast": "puruṣavacanāni",
    "outcome": {
      "en": "Every tense has nine forms: three persons times three numbers.",
      "hi": "हर काल में नौ रूप होते हैं: तीन पुरुष × तीन वचन।"
    },
    "minutes": 6,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-verb-grid-guide-verb-grid-1",
        "kind": "teach",
        "title": {
          "en": "The 9-cell grid: person × number",
          "hi": "नौ खानों की सारणी: पुरुष × वचन"
        },
        "body": {
          "en": "Every tense has nine forms: three persons times three numbers.",
          "hi": "हर काल में नौ रूप होते हैं: तीन पुरुष × तीन वचन।"
        },
        "example": {
          "sa": "त्वं किं पठसि",
          "iast": "tvaṃ kiṃ paṭhasi",
          "gloss": {
            "en": "What are you reading?",
            "hi": "तुम क्या पढ़ रहे हो?"
          },
          "alt": {
            "en": "What are you reading?",
            "hi": "तुम क्या पढ़ रहे हो?"
          }
        },
        "assetIds": [
          "guide-verb-grid-1"
        ]
      },
      {
        "id": "guide-art-verb-grid-guide-verb-grid-2",
        "kind": "teach",
        "title": {
          "en": "The 9-cell grid: person × number",
          "hi": "नौ खानों की सारणी: पुरुष × वचन"
        },
        "body": {
          "en": "Every tense has nine forms: three persons times three numbers.",
          "hi": "हर काल में नौ रूप होते हैं: तीन पुरुष × तीन वचन।"
        },
        "example": {
          "sa": "आवां गच्छावः",
          "iast": "āvāṃ gacchāvaḥ",
          "gloss": {
            "en": "We two are going.",
            "hi": "हम दोनों जा रहे हैं।"
          },
          "alt": {
            "en": "We two are going.",
            "hi": "हम दोनों जा रहे हैं।"
          }
        },
        "assetIds": [
          "guide-verb-grid-2"
        ]
      },
      {
        "id": "guide-art-verb-grid-guide-verb-grid-3",
        "kind": "teach",
        "title": {
          "en": "The 9-cell grid: person × number",
          "hi": "नौ खानों की सारणी: पुरुष × वचन"
        },
        "body": {
          "en": "Every tense has nine forms: three persons times three numbers.",
          "hi": "हर काल में नौ रूप होते हैं: तीन पुरुष × तीन वचन।"
        },
        "example": {
          "sa": "ते क्रीडन्ति",
          "iast": "te krīḍanti",
          "gloss": {
            "en": "They are playing.",
            "hi": "वे खेल रहे हैं।"
          },
          "alt": {
            "en": "They are playing.",
            "hi": "वे खेल रहे हैं।"
          }
        },
        "assetIds": [
          "guide-verb-grid-3"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-two-endings",
    "rank": 35,
    "unit": {
      "en": "Verbs",
      "hi": "क्रिया"
    },
    "chapterId": "verbs",
    "title": {
      "en": "Two sets of endings: -ti and -te",
      "hi": "दो प्रत्यय-समूह: -ति और -ते"
    },
    "titleSa": "परस्मैपदम् आत्मनेपदं च",
    "titleIast": "parasmaipadam ātmanepadaṃ ca",
    "outcome": {
      "en": "Some roots take -ti endings, some take -te endings, and some take both.",
      "hi": "कुछ धातुओं में -ति वाले प्रत्यय लगते हैं, कुछ में -ते वाले, और कुछ में दोनों।"
    },
    "minutes": 4,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-two-endings-guide-two-endings-1",
        "kind": "teach",
        "title": {
          "en": "Two sets of endings: -ti and -te",
          "hi": "दो प्रत्यय-समूह: -ति और -ते"
        },
        "body": {
          "en": "Some roots take -ti endings, some take -te endings, and some take both.",
          "hi": "कुछ धातुओं में -ति वाले प्रत्यय लगते हैं, कुछ में -ते वाले, और कुछ में दोनों।"
        },
        "example": {
          "sa": "सः फलं लभते",
          "iast": "saḥ phalaṃ labhate",
          "gloss": {
            "en": "He gets a fruit.",
            "hi": "उसे फल मिलता है।"
          },
          "alt": {
            "en": "He gets a fruit.",
            "hi": "उसे फल मिलता है।"
          }
        },
        "assetIds": [
          "guide-two-endings-1"
        ]
      },
      {
        "id": "guide-art-two-endings-guide-two-endings-2",
        "kind": "teach",
        "title": {
          "en": "Two sets of endings: -ti and -te",
          "hi": "दो प्रत्यय-समूह: -ति और -ते"
        },
        "body": {
          "en": "Some roots take -ti endings, some take -te endings, and some take both.",
          "hi": "कुछ धातुओं में -ति वाले प्रत्यय लगते हैं, कुछ में -ते वाले, और कुछ में दोनों।"
        },
        "example": {
          "sa": "अहं गुरुं सेवे",
          "iast": "ahaṃ guruṃ seve",
          "gloss": {
            "en": "I serve the teacher.",
            "hi": "मैं गुरु की सेवा करता हूँ।"
          },
          "alt": {
            "en": "I serve the teacher.",
            "hi": "मैं गुरु की सेवा करता हूँ।"
          }
        },
        "assetIds": [
          "guide-two-endings-2"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-verb-classes",
    "rank": 36,
    "unit": {
      "en": "Verbs",
      "hi": "क्रिया"
    },
    "chapterId": "verbs",
    "title": {
      "en": "The 10 verb classes",
      "hi": "धातुओं के दस गण"
    },
    "titleSa": "दश गणाः",
    "titleIast": "daśa gaṇāḥ",
    "outcome": {
      "en": "Roots fall into ten classes by how they build the present stem; four of them just add -a-.",
      "hi": "धातुएँ वर्तमान रूप बनाने के ढंग से दस गणों में बँटी हैं; इनमें चार गण बस -अ- जोड़ते हैं।"
    },
    "minutes": 4,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-verb-classes-guide-verb-classes-1",
        "kind": "teach",
        "title": {
          "en": "The 10 verb classes",
          "hi": "धातुओं के दस गण"
        },
        "body": {
          "en": "Roots fall into ten classes by how they build the present stem; four of them just add -a-.",
          "hi": "धातुएँ वर्तमान रूप बनाने के ढंग से दस गणों में बँटी हैं; इनमें चार गण बस -अ- जोड़ते हैं।"
        },
        "example": {
          "sa": "बालिका नृत्यति",
          "iast": "bālikā nṛtyati",
          "gloss": {
            "en": "The girl dances — class 4.",
            "hi": "बालिका नाचती है — चौथा गण।"
          },
          "alt": {
            "en": "The girl dances — class 4.",
            "hi": "बालिका नाचती है — चौथा गण।"
          }
        },
        "assetIds": [
          "guide-verb-classes-1"
        ]
      },
      {
        "id": "guide-art-verb-classes-guide-verb-classes-2",
        "kind": "teach",
        "title": {
          "en": "The 10 verb classes",
          "hi": "धातुओं के दस गण"
        },
        "body": {
          "en": "Roots fall into ten classes by how they build the present stem; four of them just add -a-.",
          "hi": "धातुएँ वर्तमान रूप बनाने के ढंग से दस गणों में बँटी हैं; इनमें चार गण बस -अ- जोड़ते हैं।"
        },
        "example": {
          "sa": "सः वस्त्रं क्रीणाति",
          "iast": "saḥ vastraṃ krīṇāti",
          "gloss": {
            "en": "He buys cloth — class 9.",
            "hi": "वह कपड़ा खरीदता है — नौवाँ गण।"
          },
          "alt": {
            "en": "He buys cloth — class 9.",
            "hi": "वह कपड़ा खरीदता है — नौवाँ गण।"
          }
        },
        "assetIds": [
          "guide-verb-classes-2"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-to-be",
    "rank": 37,
    "unit": {
      "en": "Verbs",
      "hi": "क्रिया"
    },
    "chapterId": "verbs",
    "title": {
      "en": "“To be”: अस्ति, and sentences without it",
      "hi": "'होना': अस्ति, और बिना क्रिया के वाक्य"
    },
    "titleSa": "अस्",
    "titleIast": "as",
    "outcome": {
      "en": "अस्ति means “is”, but Sanskrit usually leaves it out: अहं छात्रः = I am a student.",
      "hi": "अस्ति का अर्थ 'है', पर संस्कृत इसे अक्सर छोड़ देता है: अहं छात्रः = मैं छात्र हूँ।"
    },
    "minutes": 6,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-to-be-guide-to-be-1",
        "kind": "teach",
        "title": {
          "en": "“To be”: अस्ति, and sentences without it",
          "hi": "'होना': अस्ति, और बिना क्रिया के वाक्य"
        },
        "body": {
          "en": "अस्ति means “is”, but Sanskrit usually leaves it out: अहं छात्रः = I am a student.",
          "hi": "अस्ति का अर्थ 'है', पर संस्कृत इसे अक्सर छोड़ देता है: अहं छात्रः = मैं छात्र हूँ।"
        },
        "example": {
          "sa": "अहं छात्रः",
          "iast": "ahaṃ chātraḥ",
          "gloss": {
            "en": "I am a student.",
            "hi": "मैं छात्र हूँ।"
          },
          "alt": {
            "en": "I am a student.",
            "hi": "मैं छात्र हूँ।"
          }
        },
        "assetIds": [
          "guide-to-be-1"
        ]
      },
      {
        "id": "guide-art-to-be-guide-to-be-2",
        "kind": "teach",
        "title": {
          "en": "“To be”: अस्ति, and sentences without it",
          "hi": "'होना': अस्ति, और बिना क्रिया के वाक्य"
        },
        "body": {
          "en": "अस्ति means “is”, but Sanskrit usually leaves it out: अहं छात्रः = I am a student.",
          "hi": "अस्ति का अर्थ 'है', पर संस्कृत इसे अक्सर छोड़ देता है: अहं छात्रः = मैं छात्र हूँ।"
        },
        "example": {
          "sa": "वृक्षे खगाः सन्ति",
          "iast": "vṛkṣe khagāḥ santi",
          "gloss": {
            "en": "There are birds in the tree.",
            "hi": "पेड़ पर पक्षी हैं।"
          },
          "alt": {
            "en": "There are birds in the tree.",
            "hi": "पेड़ पर पक्षी हैं।"
          }
        },
        "assetIds": [
          "guide-to-be-2"
        ]
      },
      {
        "id": "guide-art-to-be-guide-to-be-3",
        "kind": "teach",
        "title": {
          "en": "“To be”: अस्ति, and sentences without it",
          "hi": "'होना': अस्ति, और बिना क्रिया के वाक्य"
        },
        "body": {
          "en": "अस्ति means “is”, but Sanskrit usually leaves it out: अहं छात्रः = I am a student.",
          "hi": "अस्ति का अर्थ 'है', पर संस्कृत इसे अक्सर छोड़ देता है: अहं छात्रः = मैं छात्र हूँ।"
        },
        "example": {
          "sa": "कुत्र असि",
          "iast": "kutra asi",
          "gloss": {
            "en": "Where are you?",
            "hi": "तुम कहाँ हो?"
          },
          "alt": {
            "en": "Where are you?",
            "hi": "तुम कहाँ हो?"
          }
        },
        "assetIds": [
          "guide-to-be-3"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-lakaras-overview",
    "rank": 38,
    "unit": {
      "en": "Tenses & moods",
      "hi": "काल और भाव"
    },
    "chapterId": "tenses",
    "title": {
      "en": "The 10 tenses and moods at a glance",
      "hi": "दसों लकार एक नज़र में"
    },
    "titleSa": "दश लकाराः",
    "titleIast": "daśa lakārāḥ",
    "outcome": {
      "en": "Sanskrit marks time and mood with ten verb systems; four of them carry most everyday speech.",
      "hi": "संस्कृत काल और भाव को दस लकारों से बताता है; रोज़ की ज़्यादातर बातचीत इनमें से चार से चलती है।"
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-lakaras-overview-guide-lakaras-overview-1",
        "kind": "teach",
        "title": {
          "en": "The 10 tenses and moods at a glance",
          "hi": "दसों लकार एक नज़र में"
        },
        "body": {
          "en": "Sanskrit marks time and mood with ten verb systems; four of them carry most everyday speech.",
          "hi": "संस्कृत काल और भाव को दस लकारों से बताता है; रोज़ की ज़्यादातर बातचीत इनमें से चार से चलती है।"
        },
        "example": {
          "sa": "सः पठति",
          "iast": "saḥ paṭhati",
          "gloss": {
            "en": "He reads.",
            "hi": "वह पढ़ता है।"
          },
          "alt": {
            "en": "He reads.",
            "hi": "वह पढ़ता है।"
          }
        },
        "assetIds": [
          "guide-lakaras-overview-1"
        ]
      },
      {
        "id": "guide-art-lakaras-overview-guide-lakaras-overview-2",
        "kind": "teach",
        "title": {
          "en": "The 10 tenses and moods at a glance",
          "hi": "दसों लकार एक नज़र में"
        },
        "body": {
          "en": "Sanskrit marks time and mood with ten verb systems; four of them carry most everyday speech.",
          "hi": "संस्कृत काल और भाव को दस लकारों से बताता है; रोज़ की ज़्यादातर बातचीत इनमें से चार से चलती है।"
        },
        "example": {
          "sa": "सः पठतु",
          "iast": "saḥ paṭhatu",
          "gloss": {
            "en": "Let him read.",
            "hi": "वह पढ़े।"
          },
          "alt": {
            "en": "Let him read.",
            "hi": "वह पढ़े।"
          }
        },
        "assetIds": [
          "guide-lakaras-overview-2"
        ]
      },
      {
        "id": "guide-art-lakaras-overview-guide-lakaras-overview-3",
        "kind": "teach",
        "title": {
          "en": "The 10 tenses and moods at a glance",
          "hi": "दसों लकार एक नज़र में"
        },
        "body": {
          "en": "Sanskrit marks time and mood with ten verb systems; four of them carry most everyday speech.",
          "hi": "संस्कृत काल और भाव को दस लकारों से बताता है; रोज़ की ज़्यादातर बातचीत इनमें से चार से चलती है।"
        },
        "example": {
          "sa": "सः अपठत्",
          "iast": "saḥ apaṭhat",
          "gloss": {
            "en": "He read.",
            "hi": "उसने पढ़ा।"
          },
          "alt": {
            "en": "He read.",
            "hi": "उसने पढ़ा।"
          }
        },
        "assetIds": [
          "guide-lakaras-overview-3"
        ]
      },
      {
        "id": "guide-art-lakaras-overview-guide-lakaras-overview-4",
        "kind": "teach",
        "title": {
          "en": "The 10 tenses and moods at a glance",
          "hi": "दसों लकार एक नज़र में"
        },
        "body": {
          "en": "Sanskrit marks time and mood with ten verb systems; four of them carry most everyday speech.",
          "hi": "संस्कृत काल और भाव को दस लकारों से बताता है; रोज़ की ज़्यादातर बातचीत इनमें से चार से चलती है।"
        },
        "example": {
          "sa": "सः पठिष्यति",
          "iast": "saḥ paṭhiṣyati",
          "gloss": {
            "en": "He will read.",
            "hi": "वह पढ़ेगा।"
          },
          "alt": {
            "en": "He will read.",
            "hi": "वह पढ़ेगा।"
          }
        },
        "assetIds": [
          "guide-lakaras-overview-4"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-present-tense",
    "rank": 39,
    "unit": {
      "en": "Tenses & moods",
      "hi": "काल और भाव"
    },
    "chapterId": "tenses",
    "title": {
      "en": "Present: laṭ",
      "hi": "वर्तमान काल: लट्"
    },
    "titleSa": "लट्-लकारः",
    "titleIast": "laṭ-lakāraḥ",
    "outcome": {
      "en": "The present covers “does”, “is doing” and “will do soon” — and with स्म it even means “did”.",
      "hi": "वर्तमान काल 'करता है', 'कर रहा है' और 'जल्द करेगा' — सब बताता है; और स्म के साथ 'करता था' भी।"
    },
    "minutes": 4,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-present-tense-guide-present-tense-1",
        "kind": "teach",
        "title": {
          "en": "Present: laṭ",
          "hi": "वर्तमान काल: लट्"
        },
        "body": {
          "en": "The present covers “does”, “is doing” and “will do soon” — and with स्म it even means “did”.",
          "hi": "वर्तमान काल 'करता है', 'कर रहा है' और 'जल्द करेगा' — सब बताता है; और स्म के साथ 'करता था' भी।"
        },
        "example": {
          "sa": "अहं विद्यालयं गच्छामि",
          "iast": "ahaṃ vidyālayaṃ gacchāmi",
          "gloss": {
            "en": "I go to school.",
            "hi": "मैं विद्यालय जाता हूँ।"
          },
          "alt": {
            "en": "I go to school.",
            "hi": "मैं विद्यालय जाता हूँ।"
          }
        },
        "assetIds": [
          "guide-present-tense-1"
        ]
      },
      {
        "id": "guide-art-present-tense-guide-present-tense-2",
        "kind": "teach",
        "title": {
          "en": "Present: laṭ",
          "hi": "वर्तमान काल: लट्"
        },
        "body": {
          "en": "The present covers “does”, “is doing” and “will do soon” — and with स्म it even means “did”.",
          "hi": "वर्तमान काल 'करता है', 'कर रहा है' और 'जल्द करेगा' — सब बताता है; और स्म के साथ 'करता था' भी।"
        },
        "example": {
          "sa": "श्वः ते आगच्छन्ति",
          "iast": "śvaḥ te āgacchanti",
          "gloss": {
            "en": "They are coming tomorrow.",
            "hi": "वे कल आ रहे हैं।"
          },
          "alt": {
            "en": "They are coming tomorrow.",
            "hi": "वे कल आ रहे हैं।"
          }
        },
        "assetIds": [
          "guide-present-tense-2"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-command-mood",
    "rank": 40,
    "unit": {
      "en": "Tenses & moods",
      "hi": "काल और भाव"
    },
    "chapterId": "tenses",
    "title": {
      "en": "Commands and wishes: loṭ",
      "hi": "आज्ञा और इच्छा: लोट्"
    },
    "titleSa": "लोट्-लकारः",
    "titleIast": "loṭ-lakāraḥ",
    "outcome": {
      "en": "लोट् gives orders (गच्छ “go!”), polite requests and wishes (सुखिनः भवन्तु “may they be happy”).",
      "hi": "लोट् आज्ञा देता है (गच्छ 'जाओ!'), विनम्र अनुरोध करता है और शुभकामना बताता है (सुखिनः भवन्तु 'सुखी हों')।"
    },
    "minutes": 2,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-command-mood-guide-command-mood-1",
        "kind": "teach",
        "title": {
          "en": "Commands and wishes: loṭ",
          "hi": "आज्ञा और इच्छा: लोट्"
        },
        "body": {
          "en": "लोट् gives orders (गच्छ “go!”), polite requests and wishes (सुखिनः भवन्तु “may they be happy”).",
          "hi": "लोट् आज्ञा देता है (गच्छ 'जाओ!'), विनम्र अनुरोध करता है और शुभकामना बताता है (सुखिनः भवन्तु 'सुखी हों')।"
        },
        "example": {
          "sa": "अत्र आगच्छ",
          "iast": "atra āgaccha",
          "gloss": {
            "en": "Come here!",
            "hi": "यहाँ आओ!"
          },
          "alt": {
            "en": "Come here!",
            "hi": "यहाँ आओ!"
          }
        },
        "assetIds": [
          "guide-command-mood-1"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-simple-past",
    "rank": 41,
    "unit": {
      "en": "Tenses & moods",
      "hi": "काल और भाव"
    },
    "chapterId": "tenses",
    "title": {
      "en": "Simple past: laṅ",
      "hi": "भूतकाल: लङ्"
    },
    "titleSa": "लङ्-लकारः",
    "titleIast": "laṅ-lakāraḥ",
    "outcome": {
      "en": "The everyday past adds an a- in front of the verb: पठति “reads” → अपठत् “read”.",
      "hi": "रोज़ का भूतकाल क्रिया के आगे अ- जोड़ता है: पठति 'पढ़ता है' → अपठत् 'पढ़ा'।"
    },
    "minutes": 6,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-simple-past-guide-simple-past-1",
        "kind": "teach",
        "title": {
          "en": "Simple past: laṅ",
          "hi": "भूतकाल: लङ्"
        },
        "body": {
          "en": "The everyday past adds an a- in front of the verb: पठति “reads” → अपठत् “read”.",
          "hi": "रोज़ का भूतकाल क्रिया के आगे अ- जोड़ता है: पठति 'पढ़ता है' → अपठत् 'पढ़ा'।"
        },
        "example": {
          "sa": "सः गृहम् आगच्छत्",
          "iast": "saḥ gṛham āgacchat",
          "gloss": {
            "en": "He came home.",
            "hi": "वह घर आया।"
          },
          "alt": {
            "en": "He came home.",
            "hi": "वह घर आया।"
          }
        },
        "assetIds": [
          "guide-simple-past-1"
        ]
      },
      {
        "id": "guide-art-simple-past-guide-simple-past-2",
        "kind": "teach",
        "title": {
          "en": "Simple past: laṅ",
          "hi": "भूतकाल: लङ्"
        },
        "body": {
          "en": "The everyday past adds an a- in front of the verb: पठति “reads” → अपठत् “read”.",
          "hi": "रोज़ का भूतकाल क्रिया के आगे अ- जोड़ता है: पठति 'पढ़ता है' → अपठत् 'पढ़ा'।"
        },
        "example": {
          "sa": "वने सिंहः अवसत्",
          "iast": "vane siṃhaḥ avasat",
          "gloss": {
            "en": "A lion lived in the forest.",
            "hi": "वन में एक शेर रहता था।"
          },
          "alt": {
            "en": "A lion lived in the forest.",
            "hi": "वन में एक शेर रहता था।"
          }
        },
        "assetIds": [
          "guide-simple-past-2"
        ]
      },
      {
        "id": "guide-art-simple-past-guide-simple-past-3",
        "kind": "teach",
        "title": {
          "en": "Simple past: laṅ",
          "hi": "भूतकाल: लङ्"
        },
        "body": {
          "en": "The everyday past adds an a- in front of the verb: पठति “reads” → अपठत् “read”.",
          "hi": "रोज़ का भूतकाल क्रिया के आगे अ- जोड़ता है: पठति 'पढ़ता है' → अपठत् 'पढ़ा'।"
        },
        "example": {
          "sa": "अहं पत्रम् अलिखम्",
          "iast": "ahaṃ patram alikham",
          "gloss": {
            "en": "I wrote a letter.",
            "hi": "मैंने पत्र लिखा।"
          },
          "alt": {
            "en": "I wrote a letter.",
            "hi": "मैंने पत्र लिखा।"
          }
        },
        "assetIds": [
          "guide-simple-past-3"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-future-tense",
    "rank": 42,
    "unit": {
      "en": "Tenses & moods",
      "hi": "काल और भाव"
    },
    "chapterId": "tenses",
    "title": {
      "en": "Future: lṛṭ",
      "hi": "भविष्यत् काल: लृट्"
    },
    "titleSa": "लृट्-लकारः",
    "titleIast": "lṛṭ-lakāraḥ",
    "outcome": {
      "en": "The future adds -sya- or -iṣya- before the present endings: पठति → पठिष्यति “will read”.",
      "hi": "भविष्यत् काल में वर्तमान के अंत से पहले -स्य- या -इष्य- जुड़ता है: पठति → पठिष्यति 'पढ़ेगा'।"
    },
    "minutes": 4,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-future-tense-guide-future-tense-1",
        "kind": "teach",
        "title": {
          "en": "Future: lṛṭ",
          "hi": "भविष्यत् काल: लृट्"
        },
        "body": {
          "en": "The future adds -sya- or -iṣya- before the present endings: पठति → पठिष्यति “will read”.",
          "hi": "भविष्यत् काल में वर्तमान के अंत से पहले -स्य- या -इष्य- जुड़ता है: पठति → पठिष्यति 'पढ़ेगा'।"
        },
        "example": {
          "sa": "श्वः अहं ग्रामं गमिष्यामि",
          "iast": "śvaḥ ahaṃ grāmaṃ gamiṣyāmi",
          "gloss": {
            "en": "Tomorrow I will go to the village.",
            "hi": "कल मैं गाँव जाऊँगा।"
          },
          "alt": {
            "en": "Tomorrow I will go to the village.",
            "hi": "कल मैं गाँव जाऊँगा।"
          }
        },
        "assetIds": [
          "guide-future-tense-1"
        ]
      },
      {
        "id": "guide-art-future-tense-guide-future-tense-3",
        "kind": "teach",
        "title": {
          "en": "Future: lṛṭ",
          "hi": "भविष्यत् काल: लृट्"
        },
        "body": {
          "en": "The future adds -sya- or -iṣya- before the present endings: पठति → पठिष्यति “will read”.",
          "hi": "भविष्यत् काल में वर्तमान के अंत से पहले -स्य- या -इष्य- जुड़ता है: पठति → पठिष्यति 'पढ़ेगा'।"
        },
        "example": {
          "sa": "सा पुस्तकं दास्यति",
          "iast": "sā pustakaṃ dāsyati",
          "gloss": {
            "en": "She will give the book.",
            "hi": "वह पुस्तक देगी।"
          },
          "alt": {
            "en": "She will give the book.",
            "hi": "वह पुस्तक देगी।"
          }
        },
        "assetIds": [
          "guide-future-tense-3"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-should-may",
    "rank": 43,
    "unit": {
      "en": "Tenses & moods",
      "hi": "काल और भाव"
    },
    "chapterId": "tenses",
    "title": {
      "en": "“Should, may”: vidhiliṅ",
      "hi": "'चाहिए, सम्भव है': विधिलिङ्"
    },
    "titleSa": "विधिलिङ्-लकारः",
    "titleIast": "vidhiliṅ-lakāraḥ",
    "outcome": {
      "en": "विधिलिङ् gives advice, rules and possibilities: पठेत् “he should read”.",
      "hi": "विधिलिङ् सलाह, नियम और सम्भावना बताता है: पठेत् 'उसे पढ़ना चाहिए'।"
    },
    "minutes": 4,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-should-may-guide-should-may-1",
        "kind": "teach",
        "title": {
          "en": "“Should, may”: vidhiliṅ",
          "hi": "'चाहिए, सम्भव है': विधिलिङ्"
        },
        "body": {
          "en": "विधिलिङ् gives advice, rules and possibilities: पठेत् “he should read”.",
          "hi": "विधिलिङ् सलाह, नियम और सम्भावना बताता है: पठेत् 'उसे पढ़ना चाहिए'।"
        },
        "example": {
          "sa": "छात्रः प्रतिदिनं पठेत्",
          "iast": "chātraḥ pratidinaṃ paṭhet",
          "gloss": {
            "en": "A student should study every day.",
            "hi": "छात्र को रोज़ पढ़ना चाहिए।"
          },
          "alt": {
            "en": "A student should study every day.",
            "hi": "छात्र को रोज़ पढ़ना चाहिए।"
          }
        },
        "assetIds": [
          "guide-should-may-1"
        ]
      },
      {
        "id": "guide-art-should-may-guide-should-may-2",
        "kind": "teach",
        "title": {
          "en": "“Should, may”: vidhiliṅ",
          "hi": "'चाहिए, सम्भव है': विधिलिङ्"
        },
        "body": {
          "en": "विधिलिङ् gives advice, rules and possibilities: पठेत् “he should read”.",
          "hi": "विधिलिङ् सलाह, नियम और सम्भावना बताता है: पठेत् 'उसे पढ़ना चाहिए'।"
        },
        "example": {
          "sa": "यदि वर्षा भवेत्",
          "iast": "yadi varṣā bhavet",
          "gloss": {
            "en": "If it should rain…",
            "hi": "यदि वर्षा हो…"
          },
          "alt": {
            "en": "If it should rain…",
            "hi": "यदि वर्षा हो…"
          }
        },
        "assetIds": [
          "guide-should-may-2"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-story-past",
    "rank": 44,
    "unit": {
      "en": "Tenses & moods",
      "hi": "काल और भाव"
    },
    "chapterId": "tenses",
    "title": {
      "en": "Story past: liṭ, the perfect",
      "hi": "परोक्ष भूत: लिट्"
    },
    "titleSa": "लिट्-लकारः",
    "titleIast": "liṭ-lakāraḥ",
    "outcome": {
      "en": "The perfect doubles the start of the root — बभूव, उवाच — and tells of events long ago.",
      "hi": "लिट् धातु की शुरुआत दोहराता है — बभूव, उवाच — और बहुत पहले की घटनाएँ बताता है।"
    },
    "minutes": 4,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-story-past-guide-story-past-1",
        "kind": "teach",
        "title": {
          "en": "Story past: liṭ, the perfect",
          "hi": "परोक्ष भूत: लिट्"
        },
        "body": {
          "en": "The perfect doubles the start of the root — बभूव, उवाच — and tells of events long ago.",
          "hi": "लिट् धातु की शुरुआत दोहराता है — बभूव, उवाच — और बहुत पहले की घटनाएँ बताता है।"
        },
        "example": {
          "sa": "पपाठ",
          "iast": "papāṭha",
          "gloss": {
            "en": "he read (long ago)",
            "hi": "उसने पढ़ा (बहुत पहले)"
          },
          "alt": {
            "en": "he read (long ago)",
            "hi": "उसने पढ़ा (बहुत पहले)"
          }
        },
        "assetIds": [
          "guide-story-past-1"
        ]
      },
      {
        "id": "guide-art-story-past-guide-story-past-2",
        "kind": "teach",
        "title": {
          "en": "Story past: liṭ, the perfect",
          "hi": "परोक्ष भूत: लिट्"
        },
        "body": {
          "en": "The perfect doubles the start of the root — बभूव, उवाच — and tells of events long ago.",
          "hi": "लिट् धातु की शुरुआत दोहराता है — बभूव, उवाच — और बहुत पहले की घटनाएँ बताता है।"
        },
        "example": {
          "sa": "उवाच",
          "iast": "uvāca",
          "gloss": {
            "en": "he said",
            "hi": "वे बोले"
          },
          "alt": {
            "en": "he said",
            "hi": "वे बोले"
          }
        },
        "assetIds": [
          "guide-story-past-2"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-aorist-rare",
    "rank": 45,
    "unit": {
      "en": "Tenses & moods",
      "hi": "काल और भाव"
    },
    "chapterId": "tenses",
    "title": {
      "en": "The aorist, मा, and the rare four",
      "hi": "लुङ्, मा, और चार कम मिलने वाले लकार"
    },
    "titleSa": "लुङ् इतरे च",
    "titleIast": "luṅ itare ca",
    "outcome": {
      "en": "The aorist is another past; मा with it means “don't”; and four rarer moods complete the ten.",
      "hi": "लुङ् एक और भूतकाल है; उसके साथ मा का अर्थ 'मत'; और चार कम मिलने वाले लकार दस पूरे करते हैं।"
    },
    "minutes": 4,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-aorist-rare-guide-aorist-rare-2",
        "kind": "teach",
        "title": {
          "en": "The aorist, मा, and the rare four",
          "hi": "लुङ्, मा, और चार कम मिलने वाले लकार"
        },
        "body": {
          "en": "The aorist is another past; मा with it means “don't”; and four rarer moods complete the ten.",
          "hi": "लुङ् एक और भूतकाल है; उसके साथ मा का अर्थ 'मत'; और चार कम मिलने वाले लकार दस पूरे करते हैं।"
        },
        "example": {
          "sa": "अगमः",
          "iast": "agamaḥ",
          "gloss": {
            "en": "you went",
            "hi": "तुम गए"
          },
          "alt": {
            "en": "you went",
            "hi": "तुम गए"
          }
        },
        "assetIds": [
          "guide-aorist-rare-2"
        ]
      },
      {
        "id": "guide-art-aorist-rare-guide-aorist-rare-3",
        "kind": "teach",
        "title": {
          "en": "The aorist, मा, and the rare four",
          "hi": "लुङ्, मा, और चार कम मिलने वाले लकार"
        },
        "body": {
          "en": "The aorist is another past; मा with it means “don't”; and four rarer moods complete the ten.",
          "hi": "लुङ् एक और भूतकाल है; उसके साथ मा का अर्थ 'मत'; और चार कम मिलने वाले लकार दस पूरे करते हैं।"
        },
        "example": {
          "sa": "यदि वर्षा अभविष्यत्",
          "iast": "yadi varṣā abhaviṣyat",
          "gloss": {
            "en": "Had it rained…",
            "hi": "यदि वर्षा होती…"
          },
          "alt": {
            "en": "Had it rained…",
            "hi": "यदि वर्षा होती…"
          }
        },
        "assetIds": [
          "guide-aorist-rare-3"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-indeclinables",
    "rank": 46,
    "unit": {
      "en": "Small words",
      "hi": "अव्यय"
    },
    "chapterId": "small-words",
    "title": {
      "en": "Words that never change",
      "hi": "कभी न बदलने वाले शब्द"
    },
    "titleSa": "अव्ययम्",
    "titleIast": "avyayam",
    "outcome": {
      "en": "Some words — च “and”, अत्र “here”, शीघ्रम् “quickly” — never take endings. Learn them once.",
      "hi": "कुछ शब्द — च 'और', अत्र 'यहाँ', शीघ्रम् 'जल्दी' — कभी रूप नहीं बदलते। एक बार सीख लीजिए।"
    },
    "minutes": 4,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-indeclinables-guide-indeclinables-1",
        "kind": "teach",
        "title": {
          "en": "Words that never change",
          "hi": "कभी न बदलने वाले शब्द"
        },
        "body": {
          "en": "Some words — च “and”, अत्र “here”, शीघ्रम् “quickly” — never take endings. Learn them once.",
          "hi": "कुछ शब्द — च 'और', अत्र 'यहाँ', शीघ्रम् 'जल्दी' — कभी रूप नहीं बदलते। एक बार सीख लीजिए।"
        },
        "example": {
          "sa": "रामः सीता च वनं गच्छतः",
          "iast": "rāmaḥ sītā ca vanaṃ gacchataḥ",
          "gloss": {
            "en": "Rāma and Sītā go to the forest.",
            "hi": "राम और सीता वन जाते हैं।"
          },
          "alt": {
            "en": "Rāma and Sītā go to the forest.",
            "hi": "राम और सीता वन जाते हैं।"
          }
        },
        "assetIds": [
          "guide-indeclinables-1"
        ]
      },
      {
        "id": "guide-art-indeclinables-guide-indeclinables-2",
        "kind": "teach",
        "title": {
          "en": "Words that never change",
          "hi": "कभी न बदलने वाले शब्द"
        },
        "body": {
          "en": "Some words — च “and”, अत्र “here”, शीघ्रम् “quickly” — never take endings. Learn them once.",
          "hi": "कुछ शब्द — च 'और', अत्र 'यहाँ', शीघ्रम् 'जल्दी' — कभी रूप नहीं बदलते। एक बार सीख लीजिए।"
        },
        "example": {
          "sa": "अद्य अहं शीघ्रं गच्छामि",
          "iast": "adya ahaṃ śīghraṃ gacchāmi",
          "gloss": {
            "en": "Today I am going quickly.",
            "hi": "आज मैं जल्दी जा रहा हूँ।"
          },
          "alt": {
            "en": "Today I am going quickly.",
            "hi": "आज मैं जल्दी जा रहा हूँ।"
          }
        },
        "assetIds": [
          "guide-indeclinables-2"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-joining-words",
    "rank": 47,
    "unit": {
      "en": "Small words",
      "hi": "अव्यय"
    },
    "chapterId": "small-words",
    "title": {
      "en": "Joining words: च, वा, अपि, एव, तु",
      "hi": "जोड़ने वाले शब्द: च, वा, अपि, एव, तु"
    },
    "titleSa": "च वा अपि एव तु",
    "titleIast": "ca vā api eva tu",
    "outcome": {
      "en": "Sanskrit puts “and” after the words it joins: रामः कृष्णः च = Rāma and Kṛṣṇa.",
      "hi": "संस्कृत में 'और' जोड़े जाने वाले शब्दों के बाद आता है: रामः कृष्णः च = राम और कृष्ण।"
    },
    "minutes": 4,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-joining-words-guide-joining-words-1",
        "kind": "teach",
        "title": {
          "en": "Joining words: च, वा, अपि, एव, तु",
          "hi": "जोड़ने वाले शब्द: च, वा, अपि, एव, तु"
        },
        "body": {
          "en": "Sanskrit puts “and” after the words it joins: रामः कृष्णः च = Rāma and Kṛṣṇa.",
          "hi": "संस्कृत में 'और' जोड़े जाने वाले शब्दों के बाद आता है: रामः कृष्णः च = राम और कृष्ण।"
        },
        "example": {
          "sa": "अहम् अपि आगच्छामि",
          "iast": "aham api āgacchāmi",
          "gloss": {
            "en": "I am coming too.",
            "hi": "मैं भी आ रहा हूँ।"
          },
          "alt": {
            "en": "I am coming too.",
            "hi": "मैं भी आ रहा हूँ।"
          }
        },
        "assetIds": [
          "guide-joining-words-1"
        ]
      },
      {
        "id": "guide-art-joining-words-guide-joining-words-2",
        "kind": "teach",
        "title": {
          "en": "Joining words: च, वा, अपि, एव, तु",
          "hi": "जोड़ने वाले शब्द: च, वा, अपि, एव, तु"
        },
        "body": {
          "en": "Sanskrit puts “and” after the words it joins: रामः कृष्णः च = Rāma and Kṛṣṇa.",
          "hi": "संस्कृत में 'और' जोड़े जाने वाले शब्दों के बाद आता है: रामः कृष्णः च = राम और कृष्ण।"
        },
        "example": {
          "sa": "सः तु न पठति",
          "iast": "saḥ tu na paṭhati",
          "gloss": {
            "en": "He, though, does not read.",
            "hi": "वह तो नहीं पढ़ता।"
          },
          "alt": {
            "en": "He, though, does not read.",
            "hi": "वह तो नहीं पढ़ता।"
          }
        },
        "assetIds": [
          "guide-joining-words-2"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-question-place-time",
    "rank": 48,
    "unit": {
      "en": "Small words",
      "hi": "अव्यय"
    },
    "chapterId": "small-words",
    "title": {
      "en": "Question, place and time words",
      "hi": "प्रश्न, स्थान और समय के शब्द"
    },
    "titleSa": "कुत्र कदा कथम्",
    "titleIast": "kutra kadā katham",
    "outcome": {
      "en": "A small set of words asks and answers where, when and how — the backbone of everyday talk.",
      "hi": "कुछ छोटे शब्द कहाँ, कब और कैसे पूछते और बताते हैं — रोज़ की बातचीत की रीढ़।"
    },
    "minutes": 6,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-question-place-time-guide-question-place-time-1",
        "kind": "teach",
        "title": {
          "en": "Question, place and time words",
          "hi": "प्रश्न, स्थान और समय के शब्द"
        },
        "body": {
          "en": "A small set of words asks and answers where, when and how — the backbone of everyday talk.",
          "hi": "कुछ छोटे शब्द कहाँ, कब और कैसे पूछते और बताते हैं — रोज़ की बातचीत की रीढ़।"
        },
        "example": {
          "sa": "भवान् कुत्र गच्छति",
          "iast": "bhavān kutra gacchati",
          "gloss": {
            "en": "Where are you going?",
            "hi": "आप कहाँ जा रहे हैं?"
          },
          "alt": {
            "en": "Where are you going?",
            "hi": "आप कहाँ जा रहे हैं?"
          }
        },
        "assetIds": [
          "guide-question-place-time-1"
        ]
      },
      {
        "id": "guide-art-question-place-time-guide-question-place-time-2",
        "kind": "teach",
        "title": {
          "en": "Question, place and time words",
          "hi": "प्रश्न, स्थान और समय के शब्द"
        },
        "body": {
          "en": "A small set of words asks and answers where, when and how — the backbone of everyday talk.",
          "hi": "कुछ छोटे शब्द कहाँ, कब और कैसे पूछते और बताते हैं — रोज़ की बातचीत की रीढ़।"
        },
        "example": {
          "sa": "अहं श्वः आगमिष्यामि",
          "iast": "ahaṃ śvaḥ āgamiṣyāmi",
          "gloss": {
            "en": "I will come tomorrow.",
            "hi": "मैं कल आऊँगा।"
          },
          "alt": {
            "en": "I will come tomorrow.",
            "hi": "मैं कल आऊँगा।"
          }
        },
        "assetIds": [
          "guide-question-place-time-2"
        ]
      },
      {
        "id": "guide-art-question-place-time-guide-question-place-time-3",
        "kind": "teach",
        "title": {
          "en": "Question, place and time words",
          "hi": "प्रश्न, स्थान और समय के शब्द"
        },
        "body": {
          "en": "A small set of words asks and answers where, when and how — the backbone of everyday talk.",
          "hi": "कुछ छोटे शब्द कहाँ, कब और कैसे पूछते और बताते हैं — रोज़ की बातचीत की रीढ़।"
        },
        "example": {
          "sa": "कथम् अस्ति भवान्",
          "iast": "katham asti bhavān",
          "gloss": {
            "en": "How are you?",
            "hi": "आप कैसे हैं?"
          },
          "alt": {
            "en": "How are you?",
            "hi": "आप कैसे हैं?"
          }
        },
        "assetIds": [
          "guide-question-place-time-3"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-na-ma",
    "rank": 49,
    "unit": {
      "en": "Small words",
      "hi": "अव्यय"
    },
    "chapterId": "small-words",
    "title": {
      "en": "Saying no: न and मा",
      "hi": "निषेध: न और मा"
    },
    "titleSa": "न मा च",
    "titleIast": "na mā ca",
    "outcome": {
      "en": "न negates a statement; मा forbids — “don't!”.",
      "hi": "न किसी कथन को नकारता है; मा मना करता है — 'मत!'।"
    },
    "minutes": 6,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-na-ma-guide-na-ma-1",
        "kind": "teach",
        "title": {
          "en": "Saying no: न and मा",
          "hi": "निषेध: न और मा"
        },
        "body": {
          "en": "न negates a statement; मा forbids — “don't!”.",
          "hi": "न किसी कथन को नकारता है; मा मना करता है — 'मत!'।"
        },
        "example": {
          "sa": "अहं मांसं न खादामि",
          "iast": "ahaṃ māṃsaṃ na khādāmi",
          "gloss": {
            "en": "I don't eat meat.",
            "hi": "मैं मांस नहीं खाता।"
          },
          "alt": {
            "en": "I don't eat meat.",
            "hi": "मैं मांस नहीं खाता।"
          }
        },
        "assetIds": [
          "guide-na-ma-1"
        ]
      },
      {
        "id": "guide-art-na-ma-guide-na-ma-2",
        "kind": "teach",
        "title": {
          "en": "Saying no: न and मा",
          "hi": "निषेध: न और मा"
        },
        "body": {
          "en": "न negates a statement; मा forbids — “don't!”.",
          "hi": "न किसी कथन को नकारता है; मा मना करता है — 'मत!'।"
        },
        "example": {
          "sa": "मा चिन्तय",
          "iast": "mā cintaya",
          "gloss": {
            "en": "Don't worry.",
            "hi": "चिंता मत करो।"
          },
          "alt": {
            "en": "Don't worry.",
            "hi": "चिंता मत करो।"
          }
        },
        "assetIds": [
          "guide-na-ma-2"
        ]
      },
      {
        "id": "guide-art-na-ma-guide-na-ma-3",
        "kind": "teach",
        "title": {
          "en": "Saying no: न and मा",
          "hi": "निषेध: न और मा"
        },
        "body": {
          "en": "न negates a statement; मा forbids — “don't!”.",
          "hi": "न किसी कथन को नकारता है; मा मना करता है — 'मत!'।"
        },
        "example": {
          "sa": "अहं न जानामि",
          "iast": "ahaṃ na jānāmi",
          "gloss": {
            "en": "I don't know.",
            "hi": "मैं नहीं जानता।"
          },
          "alt": {
            "en": "I don't know.",
            "hi": "मैं नहीं जानता।"
          }
        },
        "assetIds": [
          "guide-na-ma-3"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-iti",
    "rank": 50,
    "unit": {
      "en": "Small words",
      "hi": "अव्यय"
    },
    "chapterId": "small-words",
    "title": {
      "en": "इति: quotes and thoughts",
      "hi": "इति: उद्धरण और विचार"
    },
    "titleSa": "इति",
    "titleIast": "iti",
    "outcome": {
      "en": "Sanskrit has no quotation marks: इति closes whatever someone said or thought.",
      "hi": "संस्कृत में उद्धरण-चिह्न नहीं होते: इति बताता है कि किसी की कही या सोची बात यहाँ खत्म हुई।"
    },
    "minutes": 4,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-iti-guide-iti-1",
        "kind": "teach",
        "title": {
          "en": "इति: quotes and thoughts",
          "hi": "इति: उद्धरण और विचार"
        },
        "body": {
          "en": "Sanskrit has no quotation marks: इति closes whatever someone said or thought.",
          "hi": "संस्कृत में उद्धरण-चिह्न नहीं होते: इति बताता है कि किसी की कही या सोची बात यहाँ खत्म हुई।"
        },
        "example": {
          "sa": "गच्छामि इति सः अवदत्",
          "iast": "gacchāmi iti saḥ avadat",
          "gloss": {
            "en": "“I am going,” he said.",
            "hi": "'मैं जा रहा हूँ,' उसने कहा।"
          },
          "alt": {
            "en": "“I am going,” he said.",
            "hi": "'मैं जा रहा हूँ,' उसने कहा।"
          }
        },
        "assetIds": [
          "guide-iti-1"
        ]
      },
      {
        "id": "guide-art-iti-guide-iti-2",
        "kind": "teach",
        "title": {
          "en": "इति: quotes and thoughts",
          "hi": "इति: उद्धरण और विचार"
        },
        "body": {
          "en": "Sanskrit has no quotation marks: इति closes whatever someone said or thought.",
          "hi": "संस्कृत में उद्धरण-चिह्न नहीं होते: इति बताता है कि किसी की कही या सोची बात यहाँ खत्म हुई।"
        },
        "example": {
          "sa": "वर्षा भविष्यति इति चिन्तयामि",
          "iast": "varṣā bhaviṣyati iti cintayāmi",
          "gloss": {
            "en": "I think it will rain.",
            "hi": "मुझे लगता है कि वर्षा होगी।"
          },
          "alt": {
            "en": "I think it will rain.",
            "hi": "मुझे लगता है कि वर्षा होगी।"
          }
        },
        "assetIds": [
          "guide-iti-2"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-word-order",
    "rank": 51,
    "unit": {
      "en": "Sentences",
      "hi": "वाक्य"
    },
    "chapterId": "sentences",
    "title": {
      "en": "Free word order",
      "hi": "स्वतंत्र शब्द-क्रम"
    },
    "titleSa": "पदक्रमः",
    "titleIast": "padakramaḥ",
    "outcome": {
      "en": "The endings show who does what, so Sanskrit words can come in almost any order.",
      "hi": "विभक्तियाँ बताती हैं कि कौन क्या करता है, इसलिए संस्कृत में शब्द लगभग किसी भी क्रम में आ सकते हैं।"
    },
    "minutes": 2,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-word-order-guide-word-order-1",
        "kind": "teach",
        "title": {
          "en": "Free word order",
          "hi": "स्वतंत्र शब्द-क्रम"
        },
        "body": {
          "en": "The endings show who does what, so Sanskrit words can come in almost any order.",
          "hi": "विभक्तियाँ बताती हैं कि कौन क्या करता है, इसलिए संस्कृत में शब्द लगभग किसी भी क्रम में आ सकते हैं।"
        },
        "example": {
          "sa": "रामः फलं खादति",
          "iast": "rāmaḥ phalaṃ khādati",
          "gloss": {
            "en": "Rāma eats fruit.",
            "hi": "राम फल खाता है।"
          },
          "alt": {
            "en": "Rāma eats fruit.",
            "hi": "राम फल खाता है।"
          }
        },
        "assetIds": [
          "guide-word-order-1"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-subject-verb",
    "rank": 52,
    "unit": {
      "en": "Sentences",
      "hi": "वाक्य"
    },
    "chapterId": "sentences",
    "title": {
      "en": "The verb matches its doer",
      "hi": "क्रिया कर्ता से मेल खाती है"
    },
    "titleSa": "कर्तृक्रियान्वयः",
    "titleIast": "kartṛkriyānvayaḥ",
    "outcome": {
      "en": "The verb takes the doer's person and number — one boy पठति, many boys पठन्ति.",
      "hi": "क्रिया कर्ता का पुरुष और वचन लेती है — एक बालक पठति, कई बालक पठन्ति।"
    },
    "minutes": 4,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-subject-verb-guide-subject-verb-1",
        "kind": "teach",
        "title": {
          "en": "The verb matches its doer",
          "hi": "क्रिया कर्ता से मेल खाती है"
        },
        "body": {
          "en": "The verb takes the doer's person and number — one boy पठति, many boys पठन्ति.",
          "hi": "क्रिया कर्ता का पुरुष और वचन लेती है — एक बालक पठति, कई बालक पठन्ति।"
        },
        "example": {
          "sa": "बालकाः उद्याने क्रीडन्ति",
          "iast": "bālakāḥ udyāne krīḍanti",
          "gloss": {
            "en": "The boys play in the garden.",
            "hi": "बालक बगीचे में खेलते हैं।"
          },
          "alt": {
            "en": "The boys play in the garden.",
            "hi": "बालक बगीचे में खेलते हैं।"
          }
        },
        "assetIds": [
          "guide-subject-verb-1"
        ]
      },
      {
        "id": "guide-art-subject-verb-guide-subject-verb-2",
        "kind": "teach",
        "title": {
          "en": "The verb matches its doer",
          "hi": "क्रिया कर्ता से मेल खाती है"
        },
        "body": {
          "en": "The verb takes the doer's person and number — one boy पठति, many boys पठन्ति.",
          "hi": "क्रिया कर्ता का पुरुष और वचन लेती है — एक बालक पठति, कई बालक पठन्ति।"
        },
        "example": {
          "sa": "वृक्षात् पत्राणि पतन्ति",
          "iast": "vṛkṣāt patrāṇi patanti",
          "gloss": {
            "en": "Leaves fall from the tree.",
            "hi": "पेड़ से पत्ते गिरते हैं।"
          },
          "alt": {
            "en": "Leaves fall from the tree.",
            "hi": "पेड़ से पत्ते गिरते हैं।"
          }
        },
        "assetIds": [
          "guide-subject-verb-2"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-relative-clauses",
    "rank": 53,
    "unit": {
      "en": "Sentences",
      "hi": "वाक्य"
    },
    "chapterId": "sentences",
    "title": {
      "en": "“Who… he”: यः … सः sentences",
      "hi": "'जो… वह': यः … सः वाक्य"
    },
    "titleSa": "यत्तदोः सम्बन्धः",
    "titleIast": "yattadoḥ sambandhaḥ",
    "outcome": {
      "en": "Sanskrit links two ideas with a pair: यः “who” … सः “he”, यत्र “where” … तत्र “there”.",
      "hi": "संस्कृत दो बातों को जोड़ी से जोड़ती है: यः 'जो' … सः 'वह', यत्र 'जहाँ' … तत्र 'वहाँ'।"
    },
    "minutes": 2,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-relative-clauses-guide-relative-clauses-1",
        "kind": "teach",
        "title": {
          "en": "“Who… he”: यः … सः sentences",
          "hi": "'जो… वह': यः … सः वाक्य"
        },
        "body": {
          "en": "Sanskrit links two ideas with a pair: यः “who” … सः “he”, यत्र “where” … तत्र “there”.",
          "hi": "संस्कृत दो बातों को जोड़ी से जोड़ती है: यः 'जो' … सः 'वह', यत्र 'जहाँ' … तत्र 'वहाँ'।"
        },
        "example": {
          "sa": "यः पठति सः जानाति",
          "iast": "yaḥ paṭhati saḥ jānāti",
          "gloss": {
            "en": "He who reads, knows.",
            "hi": "जो पढ़ता है, वह जानता है।"
          },
          "alt": {
            "en": "He who reads, knows.",
            "hi": "जो पढ़ता है, वह जानता है।"
          }
        },
        "assetIds": [
          "guide-relative-clauses-1"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-participle-clauses",
    "rank": 54,
    "unit": {
      "en": "Sentences",
      "hi": "वाक्य"
    },
    "chapterId": "sentences",
    "title": {
      "en": "“Having gone”, “while going”, “when he had gone”",
      "hi": "'जाकर', 'जाते हुए', 'जब वह चला गया'"
    },
    "titleSa": "कृदन्तवाक्यानि",
    "titleIast": "kṛdantavākyāni",
    "outcome": {
      "en": "Instead of “and then” or “when”, Sanskrit packs a second action into one verb-made word.",
      "hi": "'और फिर' या 'जब' की जगह संस्कृत दूसरी क्रिया को धातु से बने एक शब्द में समेट देती है।"
    },
    "minutes": 6,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-participle-clauses-guide-participle-clauses-1",
        "kind": "teach",
        "title": {
          "en": "“Having gone”, “while going”, “when he had gone”",
          "hi": "'जाकर', 'जाते हुए', 'जब वह चला गया'"
        },
        "body": {
          "en": "Instead of “and then” or “when”, Sanskrit packs a second action into one verb-made word.",
          "hi": "'और फिर' या 'जब' की जगह संस्कृत दूसरी क्रिया को धातु से बने एक शब्द में समेट देती है।"
        },
        "example": {
          "sa": "बालकः गृहं गत्वा भोजनं खादति",
          "iast": "bālakaḥ gṛhaṃ gatvā bhojanaṃ khādati",
          "gloss": {
            "en": "Having gone home, the boy eats his meal.",
            "hi": "बालक घर जाकर भोजन खाता है।"
          },
          "alt": {
            "en": "Having gone home, the boy eats his meal.",
            "hi": "बालक घर जाकर भोजन खाता है।"
          }
        },
        "assetIds": [
          "guide-participle-clauses-1"
        ]
      },
      {
        "id": "guide-art-participle-clauses-guide-participle-clauses-2",
        "kind": "teach",
        "title": {
          "en": "“Having gone”, “while going”, “when he had gone”",
          "hi": "'जाकर', 'जाते हुए', 'जब वह चला गया'"
        },
        "body": {
          "en": "Instead of “and then” or “when”, Sanskrit packs a second action into one verb-made word.",
          "hi": "'और फिर' या 'जब' की जगह संस्कृत दूसरी क्रिया को धातु से बने एक शब्द में समेट देती है।"
        },
        "example": {
          "sa": "बालिका गच्छन्ती गायति",
          "iast": "bālikā gacchantī gāyati",
          "gloss": {
            "en": "The girl sings as she walks.",
            "hi": "बालिका चलते-चलते गाती है।"
          },
          "alt": {
            "en": "The girl sings as she walks.",
            "hi": "बालिका चलते-चलते गाती है।"
          }
        },
        "assetIds": [
          "guide-participle-clauses-2"
        ]
      },
      {
        "id": "guide-art-participle-clauses-guide-participle-clauses-3",
        "kind": "teach",
        "title": {
          "en": "“Having gone”, “while going”, “when he had gone”",
          "hi": "'जाकर', 'जाते हुए', 'जब वह चला गया'"
        },
        "body": {
          "en": "Instead of “and then” or “when”, Sanskrit packs a second action into one verb-made word.",
          "hi": "'और फिर' या 'जब' की जगह संस्कृत दूसरी क्रिया को धातु से बने एक शब्द में समेट देती है।"
        },
        "example": {
          "sa": "रामे वनं गते दशरथः दुःखी अभवत्",
          "iast": "rāme vanaṃ gate daśarathaḥ duḥkhī abhavat",
          "gloss": {
            "en": "When Rāma had gone to the forest, Daśaratha grieved.",
            "hi": "राम के वन चले जाने पर दशरथ दुःखी हुए।"
          },
          "alt": {
            "en": "When Rāma had gone to the forest, Daśaratha grieved.",
            "hi": "राम के वन चले जाने पर दशरथ दुःखी हुए।"
          }
        },
        "assetIds": [
          "guide-participle-clauses-3"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-sandhi-guna",
    "rank": 55,
    "unit": {
      "en": "Sandhi: sounds that merge",
      "hi": "सन्धि: मिलती ध्वनियाँ"
    },
    "chapterId": "sandhi",
    "title": {
      "en": "a + i → e, a + u → o",
      "hi": "अ + इ → ए, अ + उ → ओ"
    },
    "titleSa": "गुणसन्धिः",
    "titleIast": "guṇasandhiḥ",
    "outcome": {
      "en": "a or ā before i/ī gives e; before u/ū gives o; before ṛ gives ar: नर + इन्द्र → नरेन्द्र.",
      "hi": "अ या आ के बाद इ/ई हो तो ए; उ/ऊ हो तो ओ; ऋ हो तो अर्: नर + इन्द्र → नरेन्द्र।"
    },
    "minutes": 2,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-sandhi-guna-guide-sandhi-guna-3",
        "kind": "teach",
        "title": {
          "en": "a + i → e, a + u → o",
          "hi": "अ + इ → ए, अ + उ → ओ"
        },
        "body": {
          "en": "a or ā before i/ī gives e; before u/ū gives o; before ṛ gives ar: नर + इन्द्र → नरेन्द्र.",
          "hi": "अ या आ के बाद इ/ई हो तो ए; उ/ऊ हो तो ओ; ऋ हो तो अर्: नर + इन्द्र → नरेन्द्र।"
        },
        "example": {
          "sa": "महोत्सवः",
          "iast": "mahotsavaḥ",
          "gloss": {
            "en": "a great festival — महा + उत्सवः",
            "hi": "महोत्सव — महा + उत्सवः"
          },
          "alt": {
            "en": "a great festival — महा + उत्सवः",
            "hi": "महोत्सव — महा + उत्सवः"
          }
        },
        "assetIds": [
          "guide-sandhi-guna-3"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-dvandva",
    "rank": 56,
    "unit": {
      "en": "Compounds",
      "hi": "समास"
    },
    "chapterId": "compounds",
    "title": {
      "en": "Dvandva: “X and Y”",
      "hi": "द्वन्द्व: 'X और Y'"
    },
    "titleSa": "द्वन्द्वः",
    "titleIast": "dvandvaḥ",
    "outcome": {
      "en": "Pairs and lists: रामलक्ष्मणौ “Rāma and Lakṣmaṇa”. Two people take a dual ending.",
      "hi": "जोड़े और सूचियाँ: रामलक्ष्मणौ 'राम और लक्ष्मण'। दो व्यक्तियों पर द्विवचन।"
    },
    "minutes": 6,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-dvandva-guide-dvandva-1",
        "kind": "teach",
        "title": {
          "en": "Dvandva: “X and Y”",
          "hi": "द्वन्द्व: 'X और Y'"
        },
        "body": {
          "en": "Pairs and lists: रामलक्ष्मणौ “Rāma and Lakṣmaṇa”. Two people take a dual ending.",
          "hi": "जोड़े और सूचियाँ: रामलक्ष्मणौ 'राम और लक्ष्मण'। दो व्यक्तियों पर द्विवचन।"
        },
        "example": {
          "sa": "रामलक्ष्मणौ",
          "iast": "rāmalakṣmaṇau",
          "gloss": {
            "en": "Rāma and Lakṣmaṇa — two, so dual",
            "hi": "राम और लक्ष्मण — दो, इसलिए द्विवचन"
          },
          "alt": {
            "en": "Rāma and Lakṣmaṇa — two, so dual",
            "hi": "राम और लक्ष्मण — दो, इसलिए द्विवचन"
          }
        },
        "assetIds": [
          "guide-dvandva-1"
        ]
      },
      {
        "id": "guide-art-dvandva-guide-dvandva-3",
        "kind": "teach",
        "title": {
          "en": "Dvandva: “X and Y”",
          "hi": "द्वन्द्व: 'X और Y'"
        },
        "body": {
          "en": "Pairs and lists: रामलक्ष्मणौ “Rāma and Lakṣmaṇa”. Two people take a dual ending.",
          "hi": "जोड़े और सूचियाँ: रामलक्ष्मणौ 'राम और लक्ष्मण'। दो व्यक्तियों पर द्विवचन।"
        },
        "example": {
          "sa": "सुखदुःखे",
          "iast": "sukhaduḥkhe",
          "gloss": {
            "en": "joy and sorrow",
            "hi": "सुख-दुःख"
          },
          "alt": {
            "en": "joy and sorrow",
            "hi": "सुख-दुःख"
          }
        },
        "assetIds": [
          "guide-dvandva-3"
        ]
      },
      {
        "id": "guide-art-dvandva-guide-dvandva-2",
        "kind": "teach",
        "title": {
          "en": "Dvandva: “X and Y”",
          "hi": "द्वन्द्व: 'X और Y'"
        },
        "body": {
          "en": "Pairs and lists: रामलक्ष्मणौ “Rāma and Lakṣmaṇa”. Two people take a dual ending.",
          "hi": "जोड़े और सूचियाँ: रामलक्ष्मणौ 'राम और लक्ष्मण'। दो व्यक्तियों पर द्विवचन।"
        },
        "example": {
          "sa": "मातापितरौ",
          "iast": "mātāpitarau",
          "gloss": {
            "en": "mother and father",
            "hi": "माता-पिता"
          },
          "alt": {
            "en": "mother and father",
            "hi": "माता-पिता"
          }
        },
        "assetIds": [
          "guide-dvandva-2"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-tatpurusha",
    "rank": 57,
    "unit": {
      "en": "Compounds",
      "hi": "समास"
    },
    "chapterId": "compounds",
    "title": {
      "en": "Tatpuruṣa: “X's Y”, “Y for X”",
      "hi": "तत्पुरुष: 'X का Y', 'X के लिए Y'"
    },
    "titleSa": "तत्पुरुषः",
    "titleIast": "tatpuruṣaḥ",
    "outcome": {
      "en": "The last word is the main one; the first word hides a case: राष्ट्रपतिः = lord of the nation.",
      "hi": "अंतिम शब्द मुख्य है; पहले शब्द में कोई विभक्ति छिपी है: राष्ट्रपतिः = राष्ट्र का पति।"
    },
    "minutes": 2,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-tatpurusha-guide-tatpurusha-2",
        "kind": "teach",
        "title": {
          "en": "Tatpuruṣa: “X's Y”, “Y for X”",
          "hi": "तत्पुरुष: 'X का Y', 'X के लिए Y'"
        },
        "body": {
          "en": "The last word is the main one; the first word hides a case: राष्ट्रपतिः = lord of the nation.",
          "hi": "अंतिम शब्द मुख्य है; पहले शब्द में कोई विभक्ति छिपी है: राष्ट्रपतिः = राष्ट्र का पति।"
        },
        "example": {
          "sa": "गजस्य आननम्",
          "iast": "gajasya ānanam",
          "gloss": {
            "en": "the elephant's face",
            "hi": "हाथी का मुख"
          },
          "alt": {
            "en": "the elephant's face",
            "hi": "हाथी का मुख"
          }
        },
        "assetIds": [
          "guide-tatpurusha-2"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-nan-upapada",
    "rank": 58,
    "unit": {
      "en": "Compounds",
      "hi": "समास"
    },
    "chapterId": "compounds",
    "title": {
      "en": "“Not-X” and “X-maker”",
      "hi": "'अ-X' और 'X-कार'"
    },
    "titleSa": "नञ्-उपपदसमासौ",
    "titleIast": "nañ-upapadasamāsau",
    "outcome": {
      "en": "a-/an- means “not” (असत्यम्); a verb-ending last word makes a doer (कुम्भकारः “pot-maker”).",
      "hi": "अ-/अन्- का अर्थ 'नहीं' (असत्यम्); अंतिम शब्द क्रिया से बना हो तो करने वाला बनता है (कुम्भकारः 'कुम्हार')।"
    },
    "minutes": 2,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-nan-upapada-guide-nan-upapada-1",
        "kind": "teach",
        "title": {
          "en": "“Not-X” and “X-maker”",
          "hi": "'अ-X' और 'X-कार'"
        },
        "body": {
          "en": "a-/an- means “not” (असत्यम्); a verb-ending last word makes a doer (कुम्भकारः “pot-maker”).",
          "hi": "अ-/अन्- का अर्थ 'नहीं' (असत्यम्); अंतिम शब्द क्रिया से बना हो तो करने वाला बनता है (कुम्भकारः 'कुम्हार')।"
        },
        "example": {
          "sa": "कुम्भं करोति",
          "iast": "kumbhaṃ karoti",
          "gloss": {
            "en": "makes a pot",
            "hi": "घड़ा बनाता है"
          },
          "alt": {
            "en": "makes a pot",
            "hi": "घड़ा बनाता है"
          }
        },
        "assetIds": [
          "guide-nan-upapada-1"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-bahuvrihi",
    "rank": 59,
    "unit": {
      "en": "Compounds",
      "hi": "समास"
    },
    "chapterId": "compounds",
    "title": {
      "en": "Bahuvrīhi: “the one who has…”",
      "hi": "बहुव्रीहि: 'जिसका/जिसके…'"
    },
    "titleSa": "बहुव्रीहिः",
    "titleIast": "bahuvrīhiḥ",
    "outcome": {
      "en": "A bahuvrīhi describes someone else: नीलकण्ठः is not a blue throat but the one who has one — Śiva.",
      "hi": "बहुव्रीहि किसी तीसरे का वर्णन करता है: नीलकण्ठः नीला गला नहीं, बल्कि नीले गले वाला — शिव।"
    },
    "minutes": 2,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-bahuvrihi-guide-bahuvrihi-1",
        "kind": "teach",
        "title": {
          "en": "Bahuvrīhi: “the one who has…”",
          "hi": "बहुव्रीहि: 'जिसका/जिसके…'"
        },
        "body": {
          "en": "A bahuvrīhi describes someone else: नीलकण्ठः is not a blue throat but the one who has one — Śiva.",
          "hi": "बहुव्रीहि किसी तीसरे का वर्णन करता है: नीलकण्ठः नीला गला नहीं, बल्कि नीले गले वाला — शिव।"
        },
        "example": {
          "sa": "पीतम् अम्बरं यस्य सः",
          "iast": "pītam ambaraṃ yasya saḥ",
          "gloss": {
            "en": "he whose garment is yellow",
            "hi": "पीला है वस्त्र जिसका, वह"
          },
          "alt": {
            "en": "he whose garment is yellow",
            "hi": "पीला है वस्त्र जिसका, वह"
          }
        },
        "assetIds": [
          "guide-bahuvrihi-1"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-ktva-lyap",
    "rank": 60,
    "unit": {
      "en": "Verb-made words",
      "hi": "धातु से बने शब्द"
    },
    "chapterId": "krdanta",
    "title": {
      "en": "-tvā and -ya: “having done”",
      "hi": "-त्वा और -य: 'करके'"
    },
    "titleSa": "क्त्वा ल्यप् च",
    "titleIast": "ktvā lyap ca",
    "outcome": {
      "en": "गत्वा = having gone. With a prefix the ending is -ya instead: आगत्य = having come.",
      "hi": "गत्वा = जाकर। उपसर्ग लगा हो तो अंत -य होता है: आगत्य = आकर।"
    },
    "minutes": 2,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-ktva-lyap-guide-ktva-lyap-1",
        "kind": "teach",
        "title": {
          "en": "-tvā and -ya: “having done”",
          "hi": "-त्वा और -य: 'करके'"
        },
        "body": {
          "en": "गत्वा = having gone. With a prefix the ending is -ya instead: आगत्य = having come.",
          "hi": "गत्वा = जाकर। उपसर्ग लगा हो तो अंत -य होता है: आगत्य = आकर।"
        },
        "example": {
          "sa": "रामः फलं खादित्वा जलं पिबति",
          "iast": "rāmaḥ phalaṃ khāditvā jalaṃ pibati",
          "gloss": {
            "en": "Having eaten the fruit, Rāma drinks water.",
            "hi": "राम फल खाकर पानी पीता है।"
          },
          "alt": {
            "en": "Having eaten the fruit, Rāma drinks water.",
            "hi": "राम फल खाकर पानी पीता है।"
          }
        },
        "assetIds": [
          "guide-ktva-lyap-1"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-tumun",
    "rank": 61,
    "unit": {
      "en": "Verb-made words",
      "hi": "धातु से बने शब्द"
    },
    "chapterId": "krdanta",
    "title": {
      "en": "-tum: “to do”",
      "hi": "-तुम्: 'करने के लिए'"
    },
    "titleSa": "तुमुन्",
    "titleIast": "tumun",
    "outcome": {
      "en": "पठितुम् = to read. Use it for purpose: “he goes to school to study”.",
      "hi": "पठितुम् = पढ़ने के लिए। उद्देश्य बताने के लिए: 'वह पढ़ने के लिए विद्यालय जाता है'।"
    },
    "minutes": 4,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-tumun-guide-tumun-1",
        "kind": "teach",
        "title": {
          "en": "-tum: “to do”",
          "hi": "-तुम्: 'करने के लिए'"
        },
        "body": {
          "en": "पठितुम् = to read. Use it for purpose: “he goes to school to study”.",
          "hi": "पठितुम् = पढ़ने के लिए। उद्देश्य बताने के लिए: 'वह पढ़ने के लिए विद्यालय जाता है'।"
        },
        "example": {
          "sa": "सः पठितुं विद्यालयं गच्छति",
          "iast": "saḥ paṭhituṃ vidyālayaṃ gacchati",
          "gloss": {
            "en": "He goes to school to study.",
            "hi": "वह पढ़ने के लिए विद्यालय जाता है।"
          },
          "alt": {
            "en": "He goes to school to study.",
            "hi": "वह पढ़ने के लिए विद्यालय जाता है।"
          }
        },
        "assetIds": [
          "guide-tumun-1"
        ]
      },
      {
        "id": "guide-art-tumun-guide-tumun-2",
        "kind": "teach",
        "title": {
          "en": "-tum: “to do”",
          "hi": "-तुम्: 'करने के लिए'"
        },
        "body": {
          "en": "पठितुम् = to read. Use it for purpose: “he goes to school to study”.",
          "hi": "पठितुम् = पढ़ने के लिए। उद्देश्य बताने के लिए: 'वह पढ़ने के लिए विद्यालय जाता है'।"
        },
        "example": {
          "sa": "बालकाः क्रीडितुम् उद्यानं गच्छन्ति",
          "iast": "bālakāḥ krīḍitum udyānaṃ gacchanti",
          "gloss": {
            "en": "The children go to the park to play.",
            "hi": "बच्चे खेलने के लिए बगीचे जाते हैं।"
          },
          "alt": {
            "en": "The children go to the park to play.",
            "hi": "बच्चे खेलने के लिए बगीचे जाते हैं।"
          }
        },
        "assetIds": [
          "guide-tumun-2"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-kta-ktavatu",
    "rank": 62,
    "unit": {
      "en": "Verb-made words",
      "hi": "धातु से बने शब्द"
    },
    "chapterId": "krdanta",
    "title": {
      "en": "-ta and -tavat: “gone”, “has gone”",
      "hi": "-त और -तवत्: 'गया', 'गया है'"
    },
    "titleSa": "क्त क्तवतू",
    "titleIast": "kta ktavatū",
    "outcome": {
      "en": "गतः “gone” and गतवान् “has gone” are the easiest way to talk about the past.",
      "hi": "गतः 'गया हुआ' और गतवान् 'गया' — भूतकाल कहने का सबसे आसान तरीका।"
    },
    "minutes": 6,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-kta-ktavatu-guide-kta-ktavatu-1",
        "kind": "teach",
        "title": {
          "en": "-ta and -tavat: “gone”, “has gone”",
          "hi": "-त और -तवत्: 'गया', 'गया है'"
        },
        "body": {
          "en": "गतः “gone” and गतवान् “has gone” are the easiest way to talk about the past.",
          "hi": "गतः 'गया हुआ' और गतवान् 'गया' — भूतकाल कहने का सबसे आसान तरीका।"
        },
        "example": {
          "sa": "रामः पुस्तकं पठितवान्",
          "iast": "rāmaḥ pustakaṃ paṭhitavān",
          "gloss": {
            "en": "Rāma read the book.",
            "hi": "राम ने पुस्तक पढ़ी।"
          },
          "alt": {
            "en": "Rāma read the book.",
            "hi": "राम ने पुस्तक पढ़ी।"
          }
        },
        "assetIds": [
          "guide-kta-ktavatu-1"
        ]
      },
      {
        "id": "guide-art-kta-ktavatu-guide-kta-ktavatu-2",
        "kind": "teach",
        "title": {
          "en": "-ta and -tavat: “gone”, “has gone”",
          "hi": "-त और -तवत्: 'गया', 'गया है'"
        },
        "body": {
          "en": "गतः “gone” and गतवान् “has gone” are the easiest way to talk about the past.",
          "hi": "गतः 'गया हुआ' और गतवान् 'गया' — भूतकाल कहने का सबसे आसान तरीका।"
        },
        "example": {
          "sa": "सीता पुस्तकं पठितवती",
          "iast": "sītā pustakaṃ paṭhitavatī",
          "gloss": {
            "en": "Sītā read the book.",
            "hi": "सीता ने पुस्तक पढ़ी।"
          },
          "alt": {
            "en": "Sītā read the book.",
            "hi": "सीता ने पुस्तक पढ़ी।"
          }
        },
        "assetIds": [
          "guide-kta-ktavatu-2"
        ]
      },
      {
        "id": "guide-art-kta-ktavatu-guide-kta-ktavatu-3",
        "kind": "teach",
        "title": {
          "en": "-ta and -tavat: “gone”, “has gone”",
          "hi": "-त और -तवत्: 'गया', 'गया है'"
        },
        "body": {
          "en": "गतः “gone” and गतवान् “has gone” are the easiest way to talk about the past.",
          "hi": "गतः 'गया हुआ' और गतवान् 'गया' — भूतकाल कहने का सबसे आसान तरीका।"
        },
        "example": {
          "sa": "रामेण पुस्तकं पठितम्",
          "iast": "rāmeṇa pustakaṃ paṭhitam",
          "gloss": {
            "en": "The book was read by Rāma.",
            "hi": "राम द्वारा पुस्तक पढ़ी गई।"
          },
          "alt": {
            "en": "The book was read by Rāma.",
            "hi": "राम द्वारा पुस्तक पढ़ी गई।"
          }
        },
        "assetIds": [
          "guide-kta-ktavatu-3"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-present-participles",
    "rank": 63,
    "unit": {
      "en": "Verb-made words",
      "hi": "धातु से बने शब्द"
    },
    "chapterId": "krdanta",
    "title": {
      "en": "-at and -māna: “while doing”",
      "hi": "-अत् और -मान: 'करता हुआ'"
    },
    "titleSa": "शतृ शानच्",
    "titleIast": "śatṛ śānac",
    "outcome": {
      "en": "पठन् “reading”, सेवमानः “serving” — describe someone in the middle of an action.",
      "hi": "पठन् 'पढ़ता हुआ', सेवमानः 'सेवा करता हुआ' — किसी को काम करते हुए बताना।"
    },
    "minutes": 4,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-present-participles-guide-present-participles-1",
        "kind": "teach",
        "title": {
          "en": "-at and -māna: “while doing”",
          "hi": "-अत् और -मान: 'करता हुआ'"
        },
        "body": {
          "en": "पठन् “reading”, सेवमानः “serving” — describe someone in the middle of an action.",
          "hi": "पठन् 'पढ़ता हुआ', सेवमानः 'सेवा करता हुआ' — किसी को काम करते हुए बताना।"
        },
        "example": {
          "sa": "पठन् बालकः हसति",
          "iast": "paṭhan bālakaḥ hasati",
          "gloss": {
            "en": "The boy laughs as he reads.",
            "hi": "बालक पढ़ते-पढ़ते हँसता है।"
          },
          "alt": {
            "en": "The boy laughs as he reads.",
            "hi": "बालक पढ़ते-पढ़ते हँसता है।"
          }
        },
        "assetIds": [
          "guide-present-participles-1"
        ]
      },
      {
        "id": "guide-art-present-participles-guide-present-participles-2",
        "kind": "teach",
        "title": {
          "en": "-at and -māna: “while doing”",
          "hi": "-अत् और -मान: 'करता हुआ'"
        },
        "body": {
          "en": "पठन् “reading”, सेवमानः “serving” — describe someone in the middle of an action.",
          "hi": "पठन् 'पढ़ता हुआ', सेवमानः 'सेवा करता हुआ' — किसी को काम करते हुए बताना।"
        },
        "example": {
          "sa": "गायन्ती बालिका",
          "iast": "gāyantī bālikā",
          "gloss": {
            "en": "a girl who is singing",
            "hi": "गाती हुई बालिका"
          },
          "alt": {
            "en": "a girl who is singing",
            "hi": "गाती हुई बालिका"
          }
        },
        "assetIds": [
          "guide-present-participles-2"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-gerundives",
    "rank": 64,
    "unit": {
      "en": "Verb-made words",
      "hi": "धातु से बने शब्द"
    },
    "chapterId": "krdanta",
    "title": {
      "en": "-tavya, -anīya, -ya: “should be done”",
      "hi": "-तव्य, -अनीय, -य: 'करने योग्य'"
    },
    "titleSa": "कृत्यप्रत्ययाः",
    "titleIast": "kṛtyapratyayāḥ",
    "outcome": {
      "en": "कर्तव्यम् “to be done, duty”, दर्शनीयम् “worth seeing”, पेयम् “drinkable”.",
      "hi": "कर्तव्यम् 'करने योग्य, कर्तव्य', दर्शनीयम् 'देखने योग्य', पेयम् 'पीने योग्य'।"
    },
    "minutes": 2,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-gerundives-guide-gerundives-1",
        "kind": "teach",
        "title": {
          "en": "-tavya, -anīya, -ya: “should be done”",
          "hi": "-तव्य, -अनीय, -य: 'करने योग्य'"
        },
        "body": {
          "en": "कर्तव्यम् “to be done, duty”, दर्शनीयम् “worth seeing”, पेयम् “drinkable”.",
          "hi": "कर्तव्यम् 'करने योग्य, कर्तव्य', दर्शनीयम् 'देखने योग्य', पेयम् 'पीने योग्य'।"
        },
        "example": {
          "sa": "त्वया पुस्तकं पठितव्यम्",
          "iast": "tvayā pustakaṃ paṭhitavyam",
          "gloss": {
            "en": "You should read the book.",
            "hi": "तुम्हें पुस्तक पढ़नी चाहिए।"
          },
          "alt": {
            "en": "You should read the book.",
            "hi": "तुम्हें पुस्तक पढ़नी चाहिए।"
          }
        },
        "assetIds": [
          "guide-gerundives-1"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-prefixes",
    "rank": 65,
    "unit": {
      "en": "Prefixes & voice",
      "hi": "उपसर्ग और वाच्य"
    },
    "chapterId": "voice",
    "title": {
      "en": "Prefixes change the meaning",
      "hi": "उपसर्ग अर्थ बदलते हैं"
    },
    "titleSa": "उपसर्गः",
    "titleIast": "upasargaḥ",
    "outcome": {
      "en": "आ + गच्छति “goes” = आगच्छति “comes”. Twenty-two small prefixes bend a root's meaning.",
      "hi": "आ + गच्छति 'जाता है' = आगच्छति 'आता है'। बाईस छोटे उपसर्ग धातु का अर्थ मोड़ देते हैं।"
    },
    "minutes": 4,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-prefixes-guide-prefixes-2",
        "kind": "teach",
        "title": {
          "en": "Prefixes change the meaning",
          "hi": "उपसर्ग अर्थ बदलते हैं"
        },
        "body": {
          "en": "आ + गच्छति “goes” = आगच्छति “comes”. Twenty-two small prefixes bend a root's meaning.",
          "hi": "आ + गच्छति 'जाता है' = आगच्छति 'आता है'। बाईस छोटे उपसर्ग धातु का अर्थ मोड़ देते हैं।"
        },
        "example": {
          "sa": "उपविशति",
          "iast": "upaviśati",
          "gloss": {
            "en": "sits down — उप + विश् “enter”",
            "hi": "बैठता है — उप + विश्"
          },
          "alt": {
            "en": "sits down — उप + विश् “enter”",
            "hi": "बैठता है — उप + विश्"
          }
        },
        "assetIds": [
          "guide-prefixes-2"
        ]
      },
      {
        "id": "guide-art-prefixes-guide-prefixes-4",
        "kind": "teach",
        "title": {
          "en": "Prefixes change the meaning",
          "hi": "उपसर्ग अर्थ बदलते हैं"
        },
        "body": {
          "en": "आ + गच्छति “goes” = आगच्छति “comes”. Twenty-two small prefixes bend a root's meaning.",
          "hi": "आ + गच्छति 'जाता है' = आगच्छति 'आता है'। बाईस छोटे उपसर्ग धातु का अर्थ मोड़ देते हैं।"
        },
        "example": {
          "sa": "उत्तिष्ठति",
          "iast": "uttiṣṭhati",
          "gloss": {
            "en": "stands up — उद् + स्था “stand”",
            "hi": "उठता है — उद् + स्था"
          },
          "alt": {
            "en": "stands up — उद् + स्था “stand”",
            "hi": "उठता है — उद् + स्था"
          }
        },
        "assetIds": [
          "guide-prefixes-4"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-passive",
    "rank": 66,
    "unit": {
      "en": "Prefixes & voice",
      "hi": "उपसर्ग और वाच्य"
    },
    "chapterId": "voice",
    "title": {
      "en": "Active → passive",
      "hi": "कर्तृवाच्य → कर्मवाच्य"
    },
    "titleSa": "कर्मवाच्यम्",
    "titleIast": "karmavācyam",
    "outcome": {
      "en": "रामः पुस्तकं पठति → रामेण पुस्तकं पठ्यते: the doer takes the 3rd case, the verb gets -ya- and -te.",
      "hi": "रामः पुस्तकं पठति → रामेण पुस्तकं पठ्यते: कर्ता तृतीया में, क्रिया में -य- और -ते।"
    },
    "minutes": 6,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-passive-guide-passive-1",
        "kind": "teach",
        "title": {
          "en": "Active → passive",
          "hi": "कर्तृवाच्य → कर्मवाच्य"
        },
        "body": {
          "en": "रामः पुस्तकं पठति → रामेण पुस्तकं पठ्यते: the doer takes the 3rd case, the verb gets -ya- and -te.",
          "hi": "रामः पुस्तकं पठति → रामेण पुस्तकं पठ्यते: कर्ता तृतीया में, क्रिया में -य- और -ते।"
        },
        "example": {
          "sa": "रामः पुस्तकं पठति",
          "iast": "rāmaḥ pustakaṃ paṭhati",
          "gloss": {
            "en": "Rāma reads the book. (active)",
            "hi": "राम पुस्तक पढ़ता है। (कर्तृवाच्य)"
          },
          "alt": {
            "en": "Rāma reads the book. (active)",
            "hi": "राम पुस्तक पढ़ता है। (कर्तृवाच्य)"
          }
        },
        "assetIds": [
          "guide-passive-1"
        ]
      },
      {
        "id": "guide-art-passive-guide-passive-2",
        "kind": "teach",
        "title": {
          "en": "Active → passive",
          "hi": "कर्तृवाच्य → कर्मवाच्य"
        },
        "body": {
          "en": "रामः पुस्तकं पठति → रामेण पुस्तकं पठ्यते: the doer takes the 3rd case, the verb gets -ya- and -te.",
          "hi": "रामः पुस्तकं पठति → रामेण पुस्तकं पठ्यते: कर्ता तृतीया में, क्रिया में -य- और -ते।"
        },
        "example": {
          "sa": "रामेण पुस्तकं पठ्यते",
          "iast": "rāmeṇa pustakaṃ paṭhyate",
          "gloss": {
            "en": "The book is read by Rāma. (passive)",
            "hi": "राम द्वारा पुस्तक पढ़ी जाती है। (कर्मवाच्य)"
          },
          "alt": {
            "en": "The book is read by Rāma. (passive)",
            "hi": "राम द्वारा पुस्तक पढ़ी जाती है। (कर्मवाच्य)"
          }
        },
        "assetIds": [
          "guide-passive-2"
        ]
      },
      {
        "id": "guide-art-passive-guide-passive-3",
        "kind": "teach",
        "title": {
          "en": "Active → passive",
          "hi": "कर्तृवाच्य → कर्मवाच्य"
        },
        "body": {
          "en": "रामः पुस्तकं पठति → रामेण पुस्तकं पठ्यते: the doer takes the 3rd case, the verb gets -ya- and -te.",
          "hi": "रामः पुस्तकं पठति → रामेण पुस्तकं पठ्यते: कर्ता तृतीया में, क्रिया में -य- और -ते।"
        },
        "example": {
          "sa": "बालकेन फलानि खाद्यन्ते",
          "iast": "bālakena phalāni khādyante",
          "gloss": {
            "en": "The fruits are eaten by the boy.",
            "hi": "बालक द्वारा फल खाए जाते हैं।"
          },
          "alt": {
            "en": "The fruits are eaten by the boy.",
            "hi": "बालक द्वारा फल खाए जाते हैं।"
          }
        },
        "assetIds": [
          "guide-passive-3"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-causative",
    "rank": 67,
    "unit": {
      "en": "Prefixes & voice",
      "hi": "उपसर्ग और वाच्य"
    },
    "chapterId": "voice",
    "title": {
      "en": "Causative: “makes someone do”",
      "hi": "प्रेरणार्थक: 'करवाना'"
    },
    "titleSa": "णिजन्तम्",
    "titleIast": "ṇijantam",
    "outcome": {
      "en": "पठति “reads” → पाठयति “makes read, teaches”. Strengthen the root and add -aya-.",
      "hi": "पठति 'पढ़ता है' → पाठयति 'पढ़ाता है'। धातु का स्वर बढ़ाइए और -अय- जोड़िए।"
    },
    "minutes": 4,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-causative-guide-causative-1",
        "kind": "teach",
        "title": {
          "en": "Causative: “makes someone do”",
          "hi": "प्रेरणार्थक: 'करवाना'"
        },
        "body": {
          "en": "पठति “reads” → पाठयति “makes read, teaches”. Strengthen the root and add -aya-.",
          "hi": "पठति 'पढ़ता है' → पाठयति 'पढ़ाता है'। धातु का स्वर बढ़ाइए और -अय- जोड़िए।"
        },
        "example": {
          "sa": "शिक्षकः छात्रं पाठयति",
          "iast": "śikṣakaḥ chātraṃ pāṭhayati",
          "gloss": {
            "en": "The teacher teaches the student.",
            "hi": "शिक्षक छात्र को पढ़ाता है।"
          },
          "alt": {
            "en": "The teacher teaches the student.",
            "hi": "शिक्षक छात्र को पढ़ाता है।"
          }
        },
        "assetIds": [
          "guide-causative-1"
        ]
      },
      {
        "id": "guide-art-causative-guide-causative-2",
        "kind": "teach",
        "title": {
          "en": "Causative: “makes someone do”",
          "hi": "प्रेरणार्थक: 'करवाना'"
        },
        "body": {
          "en": "पठति “reads” → पाठयति “makes read, teaches”. Strengthen the root and add -aya-.",
          "hi": "पठति 'पढ़ता है' → पाठयति 'पढ़ाता है'। धातु का स्वर बढ़ाइए और -अय- जोड़िए।"
        },
        "example": {
          "sa": "माता पुत्रं भोजयति",
          "iast": "mātā putraṃ bhojayati",
          "gloss": {
            "en": "The mother feeds her son.",
            "hi": "माता पुत्र को भोजन कराती है।"
          },
          "alt": {
            "en": "The mother feeds her son.",
            "hi": "माता पुत्र को भोजन कराती है।"
          }
        },
        "assetIds": [
          "guide-causative-2"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-desiderative",
    "rank": 68,
    "unit": {
      "en": "Prefixes & voice",
      "hi": "उपसर्ग और वाच्य"
    },
    "chapterId": "voice",
    "title": {
      "en": "“Wants to”: desiderative and intensive verbs",
      "hi": "'चाहना': सन्नन्त और यङन्त क्रियाएँ"
    },
    "titleSa": "सन्नन्तं यङन्तं च",
    "titleIast": "sannantaṃ yaṅantaṃ ca",
    "outcome": {
      "en": "पिबति “drinks” → पिपासति “wants to drink, is thirsty”. Reduplicate the root and add -sa-.",
      "hi": "पिबति 'पीता है' → पिपासति 'पीना चाहता है, प्यासा है'। धातु को दोहराइए और -स- जोड़िए।"
    },
    "minutes": 2,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-desiderative-guide-desiderative-1",
        "kind": "teach",
        "title": {
          "en": "“Wants to”: desiderative and intensive verbs",
          "hi": "'चाहना': सन्नन्त और यङन्त क्रियाएँ"
        },
        "body": {
          "en": "पिबति “drinks” → पिपासति “wants to drink, is thirsty”. Reduplicate the root and add -sa-.",
          "hi": "पिबति 'पीता है' → पिपासति 'पीना चाहता है, प्यासा है'। धातु को दोहराइए और -स- जोड़िए।"
        },
        "example": {
          "sa": "जिज्ञासुः",
          "iast": "jijñāsuḥ",
          "gloss": {
            "en": "one who wants to know, a seeker",
            "hi": "जानने की इच्छा रखने वाला"
          },
          "alt": {
            "en": "one who wants to know, a seeker",
            "hi": "जानने की इच्छा रखने वाला"
          }
        },
        "assetIds": [
          "guide-desiderative-1"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "guide-art-feminine-suffixes",
    "rank": 69,
    "unit": {
      "en": "Word-making suffixes",
      "hi": "शब्द बनाने वाले प्रत्यय"
    },
    "chapterId": "taddhita",
    "title": {
      "en": "Making feminines: -ā, -ī, -ānī",
      "hi": "स्त्रीलिंग बनाना: -आ, -ई, -आनी"
    },
    "titleSa": "स्त्रीप्रत्ययाः",
    "titleIast": "strīpratyayāḥ",
    "outcome": {
      "en": "बाल → बाला, कुमार → कुमारी, इन्द्र → इन्द्राणी. Three suffixes cover most feminine nouns.",
      "hi": "बाल → बाला, कुमार → कुमारी, इन्द्र → इन्द्राणी। तीन प्रत्यय ज़्यादातर स्त्रीलिंग शब्द बनाते हैं।"
    },
    "minutes": 2,
    "prereqIds": [],
    "sourceReading": true,
    "sourceLanguage": "bilingual",
    "sourceUrls": [],
    "cards": [
      {
        "id": "guide-art-feminine-suffixes-guide-feminine-suffixes-2",
        "kind": "teach",
        "title": {
          "en": "Making feminines: -ā, -ī, -ānī",
          "hi": "स्त्रीलिंग बनाना: -आ, -ई, -आनी"
        },
        "body": {
          "en": "बाल → बाला, कुमार → कुमारी, इन्द्र → इन्द्राणी. Three suffixes cover most feminine nouns.",
          "hi": "बाल → बाला, कुमार → कुमारी, इन्द्र → इन्द्राणी। तीन प्रत्यय ज़्यादातर स्त्रीलिंग शब्द बनाते हैं।"
        },
        "example": {
          "sa": "पठन्ती",
          "iast": "paṭhantī",
          "gloss": {
            "en": "reading (woman) — -at takes -ī",
            "hi": "पढ़ती हुई — -अत् में -ई"
          },
          "alt": {
            "en": "reading (woman) — -at takes -ī",
            "hi": "पढ़ती हुई — -अत् में -ई"
          }
        },
        "assetIds": [
          "guide-feminine-suffixes-2"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.",
      "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"
    }
  },
  {
    "id": "sandhi-source-boundary",
    "rank": 1,
    "unit": {
      "en": "Sandhi: full source readings",
      "hi": "Sandhi: full source readings"
    },
    "title": {
      "en": "Where words meet",
      "hi": "Where words meet"
    },
    "titleSa": "सन्धिः",
    "titleIast": "sandhiḥ",
    "outcome": {
      "en": "Find the sounds at a boundary before choosing a rule.",
      "hi": "Find the sounds at a boundary before choosing a rule."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://en.wikisource.org/wiki/Sanskrit_Grammar_(Whitney)/Chapter_III"
    ],
    "cards": [
      {
        "id": "sandhi-source-boundary-01",
        "kind": "teach",
        "title": {
          "en": "Words can look different together.",
          "hi": "Words can look different together."
        },
        "body": {
          "en": "This means ‘Rama is here / exists’. Joining changes the sounds where the words meet. The meaning and grammatical identity of the words remain. By the end of this chapter, you will explain the change and recover the two words. Sandhi means joining. Our examples use Classical Sanskrit. An isolated teaching pair is not necessarily a complete sentence; the full reading at the end is.",
          "hi": "This means ‘Rama is here / exists’. Joining changes the sounds where the words meet. The meaning and grammatical identity of the words remain. By the end of this chapter, you will explain the change and recover the two words. Sandhi means joining. Our examples use Classical Sanskrit. An isolated teaching pair is not necessarily a complete sentence; the full reading at the end is."
        },
        "example": {
          "sa": "रामः + अस्ति → रामोऽस्ति",
          "iast": "rāmaḥ + asti → rāmo’sti",
          "gloss": {
            "en": "Same words · a changed boundary",
            "hi": "Same words · a changed boundary"
          },
          "alt": {
            "en": "Words can look different together.. This means ‘Rama is here / exists’. Joining changes the sounds where the words meet. The meaning and grammatical identity of the words remain. By the end of this chapter, you will explain the change and recover the two words.",
            "hi": "Words can look different together.. This means ‘Rama is here / exists’. Joining changes the sounds where the words meet. The meaning and grammatical identity of the words remain. By the end of this chapter, you will explain the change and recover the two words."
          }
        },
        "assetIds": [
          "sandhi-boundary-1"
        ]
      },
      {
        "id": "sandhi-source-boundary-02",
        "kind": "teach",
        "title": {
          "en": "Inspect only the meeting sounds.",
          "hi": "Inspect only the meeting sounds."
        },
        "body": {
          "en": "Look at Sita’s final ā and api’s initial a. Those two vowels meet. Most of each word stays unchanged. Start with this small boundary, rather than trying to memorise the whole joined expression. The plus sign marks the original word boundary. It is an explanation device, not part of ordinary Sanskrit spelling. This example means ‘Sita too’.",
          "hi": "Look at Sita’s final ā and api’s initial a. Those two vowels meet. Most of each word stays unchanged. Start with this small boundary, rather than trying to memorise the whole joined expression. The plus sign marks the original word boundary. It is an explanation device, not part of ordinary Sanskrit spelling. This example means ‘Sita too’."
        },
        "example": {
          "sa": "सीता + अपि → सीतापि",
          "iast": "sītā + api → sītāpi",
          "gloss": {
            "en": "ā | a",
            "hi": "ā | a"
          },
          "alt": {
            "en": "Inspect only the meeting sounds.. Look at Sita’s final ā and api’s initial a. Those two vowels meet. Most of each word stays unchanged. Start with this small boundary, rather than trying to memorise the whole joined expression.",
            "hi": "Inspect only the meeting sounds.. Look at Sita’s final ā and api’s initial a. Those two vowels meet. Most of each word stays unchanged. Start with this small boundary, rather than trying to memorise the whole joined expression."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-boundary-03",
        "kind": "teach",
        "title": {
          "en": "A vowel sign is still a vowel.",
          "hi": "A vowel sign is still a vowel."
        },
        "body": {
          "en": "In सीता, the ा sign supplies the final ā. You do not need to see a separate आ letter to have a vowel boundary. Read sounds first, then inspect how Devanagari writes them. A consonant without a vowel sign normally includes a. Virāma removes that inherent vowel: त is ta, त् is t. Sandhi is not a rule about adjoining printed shapes.",
          "hi": "In सीता, the ा sign supplies the final ā. You do not need to see a separate आ letter to have a vowel boundary. Read sounds first, then inspect how Devanagari writes them. A consonant without a vowel sign normally includes a. Virāma removes that inherent vowel: त is ta, त् is t. Sandhi is not a rule about adjoining printed shapes."
        },
        "example": {
          "sa": "सीता + अपि → सीतापि",
          "iast": "sītā + api → sītāpi",
          "gloss": {
            "en": "ता ends in ā",
            "hi": "ता ends in ā"
          },
          "alt": {
            "en": "A vowel sign is still a vowel.. In सीता, the ा sign supplies the final ā. You do not need to see a separate आ letter to have a vowel boundary. Read sounds first, then inspect how Devanagari writes them.",
            "hi": "A vowel sign is still a vowel.. In सीता, the ा sign supplies the final ā. You do not need to see a separate आ letter to have a vowel boundary. Read sounds first, then inspect how Devanagari writes them."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-boundary-04",
        "kind": "teach",
        "title": {
          "en": "Three families give you a map.",
          "hi": "Three families give you a map."
        },
        "body": {
          "en": "A vowel ending leads you to vowel sandhi. A consonant ending leads you to consonant sandhi. A visarga ending needs its own checks, including the vowel before it. First identify the family; learn its cases one at a time. Visarga is a consonantal sound, but teaching it separately prevents a large and confusing consonant table. The visarga result depends on the ending, so this map intentionally gives no universal ḥ + a answer.",
          "hi": "A vowel ending leads you to vowel sandhi. A consonant ending leads you to consonant sandhi. A visarga ending needs its own checks, including the vowel before it. First identify the family; learn its cases one at a time. Visarga is a consonantal sound, but teaching it separately prevents a large and confusing consonant table. The visarga result depends on the ending, so this map intentionally gives no universal ḥ + a answer."
        },
        "example": {
          "sa": "आ + अ · त् + अ · ः + अ → आ · द् + अ · see visarga",
          "iast": "ā + a · t + a · ḥ + a",
          "gloss": {
            "en": "Vowel · consonant · visarga",
            "hi": "Vowel · consonant · visarga"
          },
          "alt": {
            "en": "Three families give you a map.. A vowel ending leads you to vowel sandhi. A consonant ending leads you to consonant sandhi. A visarga ending needs its own checks, including the vowel before it. First identify the family; learn its cases one at a time.",
            "hi": "Three families give you a map.. A vowel ending leads you to vowel sandhi. A consonant ending leads you to consonant sandhi. A visarga ending needs its own checks, including the vowel before it. First identify the family; learn its cases one at a time."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-boundary-05",
        "kind": "teach",
        "title": {
          "en": "Short and long belong together.",
          "hi": "Short and long belong together."
        },
        "body": {
          "en": "The line over ā, ī or ū marks a long vowel. Sandhi may treat both lengths as one family, while other rules depend on a specific length. Keep that distinction visible; ‘a vowel’ is sometimes too broad a description. Also recognise ṛ, ṝ and rare ḷ. Sanskrit e, ai, o and au are long vowels. Roman th, dh, kh and similar pairs each represent one aspirated consonant.",
          "hi": "The line over ā, ī or ū marks a long vowel. Sandhi may treat both lengths as one family, while other rules depend on a specific length. Keep that distinction visible; ‘a vowel’ is sometimes too broad a description. Also recognise ṛ, ṝ and rare ḷ. Sanskrit e, ai, o and au are long vowels. Roman th, dh, kh and similar pairs each represent one aspirated consonant."
        },
        "example": {
          "sa": "अ / आ · इ / ई · उ / ऊ → a / ā · i / ī · u / ū",
          "iast": "a–ā · i–ī · u–ū",
          "gloss": {
            "en": "Length matters",
            "hi": "Length matters"
          },
          "alt": {
            "en": "Short and long belong together.. The line over ā, ī or ū marks a long vowel. Sandhi may treat both lengths as one family, while other rules depend on a specific length. Keep that distinction visible; ‘a vowel’ is sometimes too broad a description.",
            "hi": "Short and long belong together.. The line over ā, ī or ū marks a long vowel. Sandhi may treat both lengths as one family, while other rules depend on a specific length. Keep that distinction visible; ‘a vowel’ is sometimes too broad a description."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-boundary-06",
        "kind": "teach",
        "title": {
          "en": "A pause changes the setting.",
          "hi": "A pause changes the setting."
        },
        "body": {
          "en": "At a real pause, read the pause form. In continuous speech, inspect the following sound. Do not force a rule across every full stop simply because two written words happen to be neighbours. External sandhi is characteristic of continuous Sanskrit, but pedagogical separation, pause and textual conventions matter. A space alone does not guarantee a spoken pause.",
          "hi": "At a real pause, read the pause form. In continuous speech, inspect the following sound. Do not force a rule across every full stop simply because two written words happen to be neighbours. External sandhi is characteristic of continuous Sanskrit, but pedagogical separation, pause and textual conventions matter. A space alone does not guarantee a spoken pause."
        },
        "example": {
          "sa": "रामः । → रामः ।",
          "iast": "rāmaḥ at a pause",
          "gloss": {
            "en": "Pause ≠ continuous joining",
            "hi": "Pause ≠ continuous joining"
          },
          "alt": {
            "en": "A pause changes the setting.. At a real pause, read the pause form. In continuous speech, inspect the following sound. Do not force a rule across every full stop simply because two written words happen to be neighbours.",
            "hi": "A pause changes the setting.. At a real pause, read the pause form. In continuous speech, inspect the following sound. Do not force a rule across every full stop simply because two written words happen to be neighbours."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-boundary-07",
        "kind": "teach",
        "title": {
          "en": "Inside a word is another setting.",
          "hi": "Inside a word is another setting."
        },
        "body": {
          "en": "Sandhi also helps form words. Here a stem and a case ending combine to mean ‘by the winds’. Keep internal formation separate from joining already formed words; similar sounds do not always receive identical treatment. Some endings receive treatment resembling external or pada sandhi. Morphology supplies the input form; joining rules alone cannot construct every Sanskrit word.",
          "hi": "Sandhi also helps form words. Here a stem and a case ending combine to mean ‘by the winds’. Keep internal formation separate from joining already formed words; similar sounds do not always receive identical treatment. Some endings receive treatment resembling external or pada sandhi. Morphology supplies the input form; joining rules alone cannot construct every Sanskrit word."
        },
        "example": {
          "sa": "मरुत् + भिः → मरुद्भिः",
          "iast": "marut + bhiḥ → marudbhiḥ",
          "gloss": {
            "en": "Stem | ending",
            "hi": "Stem | ending"
          },
          "alt": {
            "en": "Inside a word is another setting.. Sandhi also helps form words. Here a stem and a case ending combine to mean ‘by the winds’. Keep internal formation separate from joining already formed words; similar sounds do not always receive identical treatment.",
            "hi": "Inside a word is another setting.. Sandhi also helps form words. Here a stem and a case ending combine to mean ‘by the winds’. Keep internal formation separate from joining already formed words; similar sounds do not always receive identical treatment."
          }
        },
        "assetIds": [
          "sandhi-boundary-7"
        ]
      },
      {
        "id": "sandhi-source-boundary-08",
        "kind": "teach",
        "title": {
          "en": "Keep the boundary question.",
          "hi": "Keep the boundary question."
        },
        "body": {
          "en": "For each example, name the final sound, the next initial sound, and the setting. Then ask what changes and why. This small routine will carry you through vowels, stops, nasals and visarga without one enormous rule chart. Prerequisites: recognise Devanagari or IAST sounds and basic word forms. If vowel signs or final consonants are unfamiliar, complete that sound lesson before continuing.",
          "hi": "For each example, name the final sound, the next initial sound, and the setting. Then ask what changes and why. This small routine will carry you through vowels, stops, nasals and visarga without one enormous rule chart. Prerequisites: recognise Devanagari or IAST sounds and basic word forms. If vowel signs or final consonants are unfamiliar, complete that sound lesson before continuing."
        },
        "example": {
          "sa": "सीता + अपि → सीतापि",
          "iast": "sītā + api → sītāpi",
          "gloss": {
            "en": "What ends? What begins?",
            "hi": "What ends? What begins?"
          },
          "alt": {
            "en": "Keep the boundary question.. For each example, name the final sound, the next initial sound, and the setting. Then ask what changes and why. This small routine will carry you through vowels, stops, nasals and visarga without one enormous rule chart.",
            "hi": "Keep the boundary question.. For each example, name the final sound, the next initial sound, and the setting. Then ask what changes and why. This small routine will carry you through vowels, stops, nasals and visarga without one enormous rule chart."
          }
        },
        "assetIds": []
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Sandhi manuscript · Whitney §§109–125, 149. Source reading; no assessed mastery.",
      "hi": "Existing English Sandhi manuscript · Whitney §§109–125, 149. Source reading; no assessed mastery."
    }
  },
  {
    "id": "sandhi-source-like-vowels",
    "rank": 2,
    "unit": {
      "en": "Sandhi: full source readings",
      "hi": "Sandhi: full source readings"
    },
    "title": {
      "en": "Two vowels of one family",
      "hi": "Two vowels of one family"
    },
    "titleSa": "सन्धिः",
    "titleIast": "sandhiḥ",
    "outcome": {
      "en": "Apply savarṇa-dīrgha across all ordinary short/long combinations.",
      "hi": "Apply savarṇa-dīrgha across all ordinary short/long combinations."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://en.wikisource.org/wiki/Sanskrit_Grammar_(Whitney)/Chapter_III"
    ],
    "cards": [
      {
        "id": "sandhi-source-like-vowels-01",
        "kind": "teach",
        "title": {
          "en": "Start with two a vowels.",
          "hi": "Start with two a vowels."
        },
        "body": {
          "en": "Sita ends in ā. Api begins in a. These are two lengths of the same vowel family. At this ordinary vowel boundary, they merge into one long ā. Sītāpi means ‘Sita too’. The traditional name is savarṇa-dīrgha: similar vowels combine as a long vowel. Protected vowels and special settings will come later.",
          "hi": "Sita ends in ā. Api begins in a. These are two lengths of the same vowel family. At this ordinary vowel boundary, they merge into one long ā. Sītāpi means ‘Sita too’. The traditional name is savarṇa-dīrgha: similar vowels combine as a long vowel. Protected vowels and special settings will come later."
        },
        "example": {
          "sa": "सीता + अपि → सीतापि",
          "iast": "sītā + api → sītāpi",
          "gloss": {
            "en": "ā + a → ā",
            "hi": "ā + a → ā"
          },
          "alt": {
            "en": "Start with two a vowels.. Sita ends in ā. Api begins in a. These are two lengths of the same vowel family. At this ordinary vowel boundary, they merge into one long ā. Sītāpi means ‘Sita too’.",
            "hi": "Start with two a vowels.. Sita ends in ā. Api begins in a. These are two lengths of the same vowel family. At this ordinary vowel boundary, they merge into one long ā. Sītāpi means ‘Sita too’."
          }
        },
        "assetIds": [
          "sandhi-like-vowels-1"
        ]
      },
      {
        "id": "sandhi-source-like-vowels-02",
        "kind": "teach",
        "title": {
          "en": "One vowel takes their place.",
          "hi": "One vowel takes their place."
        },
        "body": {
          "en": "Read sī-tā-pi. The boundary no longer has two vowel syllables. The long ā is one vowel, not ā followed by an invisible a. This helps you read the word and later count syllables in verse. The joined expression retains the grammatical words sītā and api. A phonetic merger does not turn them into a compound.",
          "hi": "Read sī-tā-pi. The boundary no longer has two vowel syllables. The long ā is one vowel, not ā followed by an invisible a. This helps you read the word and later count syllables in verse. The joined expression retains the grammatical words sītā and api. A phonetic merger does not turn them into a compound."
        },
        "example": {
          "sa": "सीता + अपि → सीतापि",
          "iast": "sītā + api → sītāpi",
          "gloss": {
            "en": "Two vowels → one ā",
            "hi": "Two vowels → one ā"
          },
          "alt": {
            "en": "One vowel takes their place.. Read sī-tā-pi. The boundary no longer has two vowel syllables. The long ā is one vowel, not ā followed by an invisible a. This helps you read the word and later count syllables in verse.",
            "hi": "One vowel takes their place.. Read sī-tā-pi. The boundary no longer has two vowel syllables. The long ā is one vowel, not ā followed by an invisible a. This helps you read the word and later count syllables in verse."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-like-vowels-03",
        "kind": "teach",
        "title": {
          "en": "Do not add the lengths.",
          "hi": "Do not add the lengths."
        },
        "body": {
          "en": "A long ā meeting short a produces long ā. It does not create an extra-long vowel. The rule gives the family’s long vowel whether either input is short or long. Pluta, a specially prolonged vowel, is a separate category. Do not infer pluta by adding ordinary vowel lengths together.",
          "hi": "A long ā meeting short a produces long ā. It does not create an extra-long vowel. The rule gives the family’s long vowel whether either input is short or long. Pluta, a specially prolonged vowel, is a separate category. Do not infer pluta by adding ordinary vowel lengths together."
        },
        "example": {
          "sa": "सीता + अपि → सीतापि",
          "iast": "sītā + api → sītāpi",
          "gloss": {
            "en": "Long + short → long",
            "hi": "Long + short → long"
          },
          "alt": {
            "en": "Do not add the lengths.. A long ā meeting short a produces long ā. It does not create an extra-long vowel. The rule gives the family’s long vowel whether either input is short or long.",
            "hi": "Do not add the lengths.. A long ā meeting short a produces long ā. It does not create an extra-long vowel. The rule gives the family’s long vowel whether either input is short or long."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-like-vowels-04",
        "kind": "teach",
        "title": {
          "en": "All four a combinations work.",
          "hi": "All four a combinations work."
        },
        "body": {
          "en": "Short plus short, short plus long, long plus short, and long plus long all give ā. For a real word example, deva + ālaya becomes devālaya: ‘a dwelling of a deity’, a temple. Savarṇa concerns sound class, not identical printed letters. Compound formation supplies the words deva and ālaya; sandhi supplies the joining.",
          "hi": "Short plus short, short plus long, long plus short, and long plus long all give ā. For a real word example, deva + ālaya becomes devālaya: ‘a dwelling of a deity’, a temple. Savarṇa concerns sound class, not identical printed letters. Compound formation supplies the words deva and ālaya; sandhi supplies the joining."
        },
        "example": {
          "sa": "अ + अ · अ + आ · आ + अ · आ + आ → आ",
          "iast": "a+a · a+ā · ā+a · ā+ā → ā",
          "gloss": {
            "en": "a family → ā",
            "hi": "a family → ā"
          },
          "alt": {
            "en": "All four a combinations work.. Short plus short, short plus long, long plus short, and long plus long all give ā. For a real word example, deva + ālaya becomes devālaya: ‘a dwelling of a deity’, a temple.",
            "hi": "All four a combinations work.. Short plus short, short plus long, long plus short, and long plus long all give ā. For a real word example, deva + ālaya becomes devālaya: ‘a dwelling of a deity’, a temple."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-like-vowels-05",
        "kind": "teach",
        "title": {
          "en": "The i family gives ī.",
          "hi": "The i family gives ī."
        },
        "body": {
          "en": "Ati ends in short i; iva begins in short i. The result is atīva, ‘exceedingly’. The same family rule applies if one or both meeting i vowels are long. All four combinations give ī. Another useful formation is adhi + īśvara → adhīśvara, ‘overlord’. The rule is about adjacent boundary vowels, not every i anywhere in a word.",
          "hi": "Ati ends in short i; iva begins in short i. The result is atīva, ‘exceedingly’. The same family rule applies if one or both meeting i vowels are long. All four combinations give ī. Another useful formation is adhi + īśvara → adhīśvara, ‘overlord’. The rule is about adjacent boundary vowels, not every i anywhere in a word."
        },
        "example": {
          "sa": "अति + इव → अतीव",
          "iast": "ati + iva → atīva",
          "gloss": {
            "en": "i / ī + i / ī → ī",
            "hi": "i / ī + i / ī → ī"
          },
          "alt": {
            "en": "The i family gives ī.. Ati ends in short i; iva begins in short i. The result is atīva, ‘exceedingly’. The same family rule applies if one or both meeting i vowels are long. All four combinations give ī.",
            "hi": "The i family gives ī.. Ati ends in short i; iva begins in short i. The result is atīva, ‘exceedingly’. The same family rule applies if one or both meeting i vowels are long. All four combinations give ī."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-like-vowels-06",
        "kind": "teach",
        "title": {
          "en": "The u family gives ū.",
          "hi": "The u family gives ū."
        },
        "body": {
          "en": "Su means ‘well’; uktam means ‘said’. Together they form sūktam, ‘well said’ or a hymn. Two short u vowels become one long ū. Mixing short and long u at this boundary also gives ū. su + ū… , sū + u… and sū + ū… all have the same boundary result ū under the ordinary rule. The example is a formed expression, not a claim that su is a freely inflecting noun.",
          "hi": "Su means ‘well’; uktam means ‘said’. Together they form sūktam, ‘well said’ or a hymn. Two short u vowels become one long ū. Mixing short and long u at this boundary also gives ū. su + ū… , sū + u… and sū + ū… all have the same boundary result ū under the ordinary rule. The example is a formed expression, not a claim that su is a freely inflecting noun."
        },
        "example": {
          "sa": "सु + उक्तम् → सूक्तम्",
          "iast": "su + uktam → sūktam",
          "gloss": {
            "en": "u / ū + u / ū → ū",
            "hi": "u / ū + u / ū → ū"
          },
          "alt": {
            "en": "The u family gives ū.. Su means ‘well’; uktam means ‘said’. Together they form sūktam, ‘well said’ or a hymn. Two short u vowels become one long ū. Mixing short and long u at this boundary also gives ū.",
            "hi": "The u family gives ū.. Su means ‘well’; uktam means ‘said’. Together they form sūktam, ‘well said’ or a hymn. Two short u vowels become one long ū. Mixing short and long u at this boundary also gives ū."
          }
        },
        "assetIds": [
          "sandhi-like-vowels-6"
        ]
      },
      {
        "id": "sandhi-source-like-vowels-07",
        "kind": "teach",
        "title": {
          "en": "Know the rare vowel row.",
          "hi": "Know the rare vowel row."
        },
        "body": {
          "en": "The traditional vowel family includes ṛ and ṝ. Their ordinary like-vowel combination is represented as ṝ, but actual examples are extremely rare. Learn to recognise the row; spend your reading practice on a, i and u first. Whitney notes that practical occurrence is questionable. Traditional savarṇa treatment also connects ṛ and ḷ; rare mixed vocalic-r/l cases require a detailed grammar. Do not invent everyday vocabulary to make a rare rule look common.",
          "hi": "The traditional vowel family includes ṛ and ṝ. Their ordinary like-vowel combination is represented as ṝ, but actual examples are extremely rare. Learn to recognise the row; spend your reading practice on a, i and u first. Whitney notes that practical occurrence is questionable. Traditional savarṇa treatment also connects ṛ and ḷ; rare mixed vocalic-r/l cases require a detailed grammar. Do not invent everyday vocabulary to make a rare rule look common."
        },
        "example": {
          "sa": "ऋ + ऋ → ॠ",
          "iast": "ṛ + ṛ → ṝ, theoretically",
          "gloss": {
            "en": "Rare cases belong in reference",
            "hi": "Rare cases belong in reference"
          },
          "alt": {
            "en": "Know the rare vowel row.. The traditional vowel family includes ṛ and ṝ. Their ordinary like-vowel combination is represented as ṝ, but actual examples are extremely rare. Learn to recognise the row; spend your reading practice on a, i and u first.",
            "hi": "Know the rare vowel row.. The traditional vowel family includes ṛ and ṝ. Their ordinary like-vowel combination is represented as ṝ, but actual examples are extremely rare. Learn to recognise the row; spend your reading practice on a, i and u first."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-like-vowels-08",
        "kind": "teach",
        "title": {
          "en": "The result does not reveal both inputs.",
          "hi": "The result does not reveal both inputs."
        },
        "body": {
          "en": "Seeing ā does not tell you whether it came from a + a, a + ā, ā + a or ā + ā. When reading backwards, use known words and meaning to recover the boundary. The sound rule alone cannot choose a unique split. The joined devālaya is a compound stem. Its inflected forms belong in a later morphology lesson. Reverse sandhi proposes possibilities; vocabulary and grammar test them.",
          "hi": "Seeing ā does not tell you whether it came from a + a, a + ā, ā + a or ā + ā. When reading backwards, use known words and meaning to recover the boundary. The sound rule alone cannot choose a unique split. The joined devālaya is a compound stem. Its inflected forms belong in a later morphology lesson. Reverse sandhi proposes possibilities; vocabulary and grammar test them."
        },
        "example": {
          "sa": "देव + आलय → देवालय",
          "iast": "deva + ālaya → devālaya",
          "gloss": {
            "en": "One ā · several possible histories",
            "hi": "One ā · several possible histories"
          },
          "alt": {
            "en": "The result does not reveal both inputs.. Seeing ā does not tell you whether it came from a + a, a + ā, ā + a or ā + ā. When reading backwards, use known words and meaning to recover the boundary. The sound rule alone cannot choose a unique split.",
            "hi": "The result does not reveal both inputs.. Seeing ā does not tell you whether it came from a + a, a + ā, ā + a or ā + ā. When reading backwards, use known words and meaning to recover the boundary. The sound rule alone cannot choose a unique split."
          }
        },
        "assetIds": [
          "sandhi-like-vowels-8"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Sandhi manuscript · Whitney §126. Source reading; no assessed mastery.",
      "hi": "Existing English Sandhi manuscript · Whitney §126. Source reading; no assessed mastery."
    }
  },
  {
    "id": "sandhi-source-a-combinations",
    "rank": 3,
    "unit": {
      "en": "Sandhi: full source readings",
      "hi": "Sandhi: full source readings"
    },
    "title": {
      "en": "When a meets a different vowel",
      "hi": "When a meets a different vowel"
    },
    "titleSa": "सन्धिः",
    "titleIast": "sandhiḥ",
    "outcome": {
      "en": "Distinguish guṇa and vṛddhi outcomes without treating them as mere lengthening.",
      "hi": "Distinguish guṇa and vṛddhi outcomes without treating them as mere lengthening."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://en.wikisource.org/wiki/Sanskrit_Grammar_(Whitney)/Chapter_III"
    ],
    "cards": [
      {
        "id": "sandhi-source-a-combinations-01",
        "kind": "teach",
        "title": {
          "en": "a meeting i gives e.",
          "hi": "a meeting i gives e."
        },
        "body": {
          "en": "The vowels are from different families. Instead of lengthening a or i, the boundary becomes e. Devendra is ‘lord of the gods’. The same e results when the first vowel is ā or the second is ī. This vowel-sandhi outcome is called guṇa. Guṇa also appears in word formation for other grammatical reasons; not every e in Sanskrit proves this exact boundary.",
          "hi": "The vowels are from different families. Instead of lengthening a or i, the boundary becomes e. Devendra is ‘lord of the gods’. The same e results when the first vowel is ā or the second is ī. This vowel-sandhi outcome is called guṇa. Guṇa also appears in word formation for other grammatical reasons; not every e in Sanskrit proves this exact boundary."
        },
        "example": {
          "sa": "देव + इन्द्र → देवेन्द्र",
          "iast": "deva + indra → devendra",
          "gloss": {
            "en": "a / ā + i / ī → e",
            "hi": "a / ā + i / ī → e"
          },
          "alt": {
            "en": "a meeting i gives e.. The vowels are from different families. Instead of lengthening a or i, the boundary becomes e. Devendra is ‘lord of the gods’. The same e results when the first vowel is ā or the second is ī.",
            "hi": "a meeting i gives e.. The vowels are from different families. Instead of lengthening a or i, the boundary becomes e. Devendra is ‘lord of the gods’. The same e results when the first vowel is ā or the second is ī."
          }
        },
        "assetIds": [
          "sandhi-a-combinations-1"
        ]
      },
      {
        "id": "sandhi-source-a-combinations-02",
        "kind": "teach",
        "title": {
          "en": "Long ā does not change that answer.",
          "hi": "Long ā does not change that answer."
        },
        "body": {
          "en": "Both inputs are long, but their combination is still e. Maheśvara means ‘great lord’. Decide by the vowel families, not by adding lengths or assuming that two long vowels must produce ai. a+i, a+ī, ā+i and ā+ī all yield e in this ordinary setting. Morphological exceptions are a later lesson.",
          "hi": "Both inputs are long, but their combination is still e. Maheśvara means ‘great lord’. Decide by the vowel families, not by adding lengths or assuming that two long vowels must produce ai. a+i, a+ī, ā+i and ā+ī all yield e in this ordinary setting. Morphological exceptions are a later lesson."
        },
        "example": {
          "sa": "महा + ईश्वर → महेश्वर",
          "iast": "mahā + īśvara → maheśvara",
          "gloss": {
            "en": "ā + ī → e",
            "hi": "ā + ī → e"
          },
          "alt": {
            "en": "Long ā does not change that answer.. Both inputs are long, but their combination is still e. Maheśvara means ‘great lord’. Decide by the vowel families, not by adding lengths or assuming that two long vowels must produce ai.",
            "hi": "Long ā does not change that answer.. Both inputs are long, but their combination is still e. Maheśvara means ‘great lord’. Decide by the vowel families, not by adding lengths or assuming that two long vowels must produce ai."
          }
        },
        "assetIds": [
          "sandhi-a-combinations-2"
        ]
      },
      {
        "id": "sandhi-source-a-combinations-03",
        "kind": "teach",
        "title": {
          "en": "a meeting u gives o.",
          "hi": "a meeting u gives o."
        },
        "body": {
          "en": "Hita means ‘beneficial’; upadeśa means ‘instruction’. At their boundary, a and u become o. The resulting expression means ‘beneficial instruction’. Any short/long combination of these two families has the ordinary result o. The final visarga is already part of the supplied word form. This card changes only the vowel boundary.",
          "hi": "Hita means ‘beneficial’; upadeśa means ‘instruction’. At their boundary, a and u become o. The resulting expression means ‘beneficial instruction’. Any short/long combination of these two families has the ordinary result o. The final visarga is already part of the supplied word form. This card changes only the vowel boundary."
        },
        "example": {
          "sa": "हित + उपदेशः → हितोपदेशः",
          "iast": "hita + upadeśaḥ → hitopadeśaḥ",
          "gloss": {
            "en": "a / ā + u / ū → o",
            "hi": "a / ā + u / ū → o"
          },
          "alt": {
            "en": "a meeting u gives o.. Hita means ‘beneficial’; upadeśa means ‘instruction’. At their boundary, a and u become o. The resulting expression means ‘beneficial instruction’. Any short/long combination of these two families has the ordinary result o.",
            "hi": "a meeting u gives o.. Hita means ‘beneficial’; upadeśa means ‘instruction’. At their boundary, a and u become o. The resulting expression means ‘beneficial instruction’. Any short/long combination of these two families has the ordinary result o."
          }
        },
        "assetIds": [
          "sandhi-a-combinations-3"
        ]
      },
      {
        "id": "sandhi-source-a-combinations-04",
        "kind": "teach",
        "title": {
          "en": "ṛ becomes ar after a.",
          "hi": "ṛ becomes ar after a."
        },
        "body": {
          "en": "Mahā means ‘great’, and ṛṣiḥ means ‘sage’. Their combination is maharṣiḥ. Notice ar: the preceding ā does not survive as ār in this ordinary compound. Prefixes before a root can follow a special rule. Rare ḷ has the parallel theoretical result al after a/ā. We introduce the rare row for completeness, without giving it the same practice weight as common a/i/u combinations.",
          "hi": "Mahā means ‘great’, and ṛṣiḥ means ‘sage’. Their combination is maharṣiḥ. Notice ar: the preceding ā does not survive as ār in this ordinary compound. Prefixes before a root can follow a special rule. Rare ḷ has the parallel theoretical result al after a/ā. We introduce the rare row for completeness, without giving it the same practice weight as common a/i/u combinations."
        },
        "example": {
          "sa": "महा + ऋषिः → महर्षिः",
          "iast": "mahā + ṛṣiḥ → maharṣiḥ",
          "gloss": {
            "en": "a / ā + ṛ / ṝ → ar",
            "hi": "a / ā + ṛ / ṝ → ar"
          },
          "alt": {
            "en": "ṛ becomes ar after a.. Mahā means ‘great’, and ṛṣiḥ means ‘sage’. Their combination is maharṣiḥ. Notice ar: the preceding ā does not survive as ār in this ordinary compound. Prefixes before a root can follow a special rule.",
            "hi": "ṛ becomes ar after a.. Mahā means ‘great’, and ṛṣiḥ means ‘sage’. Their combination is maharṣiḥ. Notice ar: the preceding ā does not survive as ār in this ordinary compound. Prefixes before a root can follow a special rule."
          }
        },
        "assetIds": [
          "sandhi-a-combinations-4"
        ]
      },
      {
        "id": "sandhi-source-a-combinations-05",
        "kind": "teach",
        "title": {
          "en": "e after a produces ai.",
          "hi": "e after a produces ai."
        },
        "body": {
          "en": "Sadā means ‘always’; eva adds emphasis. Their ā + e boundary becomes ai. A following ai also produces ai. Here the family of the second vowel leads to a different result from the previous i → e pattern. This outcome is called vṛddhi sandhi. Compare a+i→e with a+e→ai; learning them as adjacent contrasts prevents confusion.",
          "hi": "Sadā means ‘always’; eva adds emphasis. Their ā + e boundary becomes ai. A following ai also produces ai. Here the family of the second vowel leads to a different result from the previous i → e pattern. This outcome is called vṛddhi sandhi. Compare a+i→e with a+e→ai; learning them as adjacent contrasts prevents confusion."
        },
        "example": {
          "sa": "सदा + एव → सदैव",
          "iast": "sadā + eva → sadaiva",
          "gloss": {
            "en": "a / ā + e / ai → ai",
            "hi": "a / ā + e / ai → ai"
          },
          "alt": {
            "en": "e after a produces ai.. Sadā means ‘always’; eva adds emphasis. Their ā + e boundary becomes ai. A following ai also produces ai. Here the family of the second vowel leads to a different result from the previous i → e pattern.",
            "hi": "e after a produces ai.. Sadā means ‘always’; eva adds emphasis. Their ā + e boundary becomes ai. A following ai also produces ai. Here the family of the second vowel leads to a different result from the previous i → e pattern."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-a-combinations-06",
        "kind": "teach",
        "title": {
          "en": "o after a produces au.",
          "hi": "o after a produces au."
        },
        "body": {
          "en": "Jala is water; oghaḥ is a flood or mass. Their a + o boundary gives au. A following au gives the same boundary result. Jalaughaḥ means a flood or mass of water. The two vṛddhi results are ai for e/ai and au for o/au. Do not interpret ai or au as two separately counted Sanskrit vowels.",
          "hi": "Jala is water; oghaḥ is a flood or mass. Their a + o boundary gives au. A following au gives the same boundary result. Jalaughaḥ means a flood or mass of water. The two vṛddhi results are ai for e/ai and au for o/au. Do not interpret ai or au as two separately counted Sanskrit vowels."
        },
        "example": {
          "sa": "जल + ओघः → जलौघः",
          "iast": "jala + oghaḥ → jalaughaḥ",
          "gloss": {
            "en": "a / ā + o / au → au",
            "hi": "a / ā + o / au → au"
          },
          "alt": {
            "en": "o after a produces au.. Jala is water; oghaḥ is a flood or mass. Their a + o boundary gives au. A following au gives the same boundary result. Jalaughaḥ means a flood or mass of water.",
            "hi": "o after a produces au.. Jala is water; oghaḥ is a flood or mass. Their a + o boundary gives au. A following au gives the same boundary result. Jalaughaḥ means a flood or mass of water."
          }
        },
        "assetIds": [
          "sandhi-a-combinations-6"
        ]
      },
      {
        "id": "sandhi-source-a-combinations-07",
        "kind": "teach",
        "title": {
          "en": "Direction matters.",
          "hi": "Direction matters."
        },
        "body": {
          "en": "When a comes first, a + i gives e. When i comes first, it can become y before a. You cannot reverse the inputs and keep the same rule. The next lesson teaches that glide pattern. These are sound demonstrations rather than vocabulary items. Label abstract rows clearly so learners do not mistake them for complete words.",
          "hi": "When a comes first, a + i gives e. When i comes first, it can become y before a. You cannot reverse the inputs and keep the same rule. The next lesson teaches that glide pattern. These are sound demonstrations rather than vocabulary items. Label abstract rows clearly so learners do not mistake them for complete words."
        },
        "example": {
          "sa": "अ + इ · इ + अ → ए · य + अ",
          "iast": "a + i → e · i + a → ya",
          "gloss": {
            "en": "Same vowels · different order",
            "hi": "Same vowels · different order"
          },
          "alt": {
            "en": "Direction matters.. When a comes first, a + i gives e. When i comes first, it can become y before a. You cannot reverse the inputs and keep the same rule. The next lesson teaches that glide pattern.",
            "hi": "Direction matters.. When a comes first, a + i gives e. When i comes first, it can become y before a. You cannot reverse the inputs and keep the same rule. The next lesson teaches that glide pattern."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-a-combinations-08",
        "kind": "teach",
        "title": {
          "en": "Keep a small decision map.",
          "hi": "Keep a small decision map."
        },
        "body": {
          "en": "When the first vowel is a or ā, identify the second family. i gives e; u gives o; ṛ gives ar; e or ai gives ai; o or au gives au. Like a vowels give ā, as you learned earlier. This is the ordinary map. It applies after checking the setting and protection rules; a later card contrasts verbal augment and prefix exceptions.",
          "hi": "When the first vowel is a or ā, identify the second family. i gives e; u gives o; ṛ gives ar; e or ai gives ai; o or au gives au. Like a vowels give ā, as you learned earlier. This is the ordinary map. It applies after checking the setting and protection rules; a later card contrasts verbal augment and prefix exceptions."
        },
        "example": {
          "sa": "अ / आ + इ · उ · ऋ · ए · ओ → ए · ओ · अर् · ऐ · औ",
          "iast": "i→e · u→o · ṛ→ar · e→ai · o→au",
          "gloss": {
            "en": "First vowel: a or ā",
            "hi": "First vowel: a or ā"
          },
          "alt": {
            "en": "Keep a small decision map.. When the first vowel is a or ā, identify the second family. i gives e; u gives o; ṛ gives ar; e or ai gives ai; o or au gives au. Like a vowels give ā, as you learned earlier.",
            "hi": "Keep a small decision map.. When the first vowel is a or ā, identify the second family. i gives e; u gives o; ṛ gives ar; e or ai gives ai; o or au gives au. Like a vowels give ā, as you learned earlier."
          }
        },
        "assetIds": []
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Sandhi manuscript · Whitney §127. Source reading; no assessed mastery.",
      "hi": "Existing English Sandhi manuscript · Whitney §127. Source reading; no assessed mastery."
    }
  },
  {
    "id": "sandhi-source-glides",
    "rank": 4,
    "unit": {
      "en": "Sandhi: full source readings",
      "hi": "Sandhi: full source readings"
    },
    "title": {
      "en": "A vowel becomes a glide",
      "hi": "A vowel becomes a glide"
    },
    "titleSa": "सन्धिः",
    "titleIast": "sandhiḥ",
    "outcome": {
      "en": "Apply yaṇ with a dissimilar following vowel and preserve that vowel.",
      "hi": "Apply yaṇ with a dissimilar following vowel and preserve that vowel."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://en.wikisource.org/wiki/Sanskrit_Grammar_(Whitney)/Chapter_III"
    ],
    "cards": [
      {
        "id": "sandhi-source-glides-01",
        "kind": "teach",
        "title": {
          "en": "i can become y.",
          "hi": "i can become y."
        },
        "body": {
          "en": "Iti ends in i, while api begins in a. Because these are different vowel families, i becomes the glide y. The following a stays. The result is ityapi, roughly ‘thus also’, with its precise meaning supplied by context. The traditional name is yaṇ sandhi. A glide is a consonantal sound related to a vowel; y is related to i.",
          "hi": "Iti ends in i, while api begins in a. Because these are different vowel families, i becomes the glide y. The following a stays. The result is ityapi, roughly ‘thus also’, with its precise meaning supplied by context. The traditional name is yaṇ sandhi. A glide is a consonantal sound related to a vowel; y is related to i."
        },
        "example": {
          "sa": "इति + अपि → इत्यपि",
          "iast": "iti + api → ityapi",
          "gloss": {
            "en": "i + a → ya",
            "hi": "i + a → ya"
          },
          "alt": {
            "en": "i can become y.. Iti ends in i, while api begins in a. Because these are different vowel families, i becomes the glide y. The following a stays. The result is ityapi, roughly ‘thus also’, with its precise meaning supplied by context.",
            "hi": "i can become y.. Iti ends in i, while api begins in a. Because these are different vowel families, i becomes the glide y. The following a stays. The result is ityapi, roughly ‘thus also’, with its precise meaning supplied by context."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-glides-02",
        "kind": "teach",
        "title": {
          "en": "Long ī can become y too.",
          "hi": "Long ī can become y too."
        },
        "body": {
          "en": "Nadī means ‘river’; atra means ‘here’. Long ī changes to y before the dissimilar a. The following a still supplies the boundary vowel. The rule does not leave an extra ī syllable behind. This is a teaching phrase: ‘the river [is] here’. Sanskrit can omit an explicit present-tense ‘is’. The glide rule treats both i and ī alike before a dissimilar vowel.",
          "hi": "Nadī means ‘river’; atra means ‘here’. Long ī changes to y before the dissimilar a. The following a still supplies the boundary vowel. The rule does not leave an extra ī syllable behind. This is a teaching phrase: ‘the river [is] here’. Sanskrit can omit an explicit present-tense ‘is’. The glide rule treats both i and ī alike before a dissimilar vowel."
        },
        "example": {
          "sa": "नदी + अत्र → नद्यत्र",
          "iast": "nadī + atra → nadyatra",
          "gloss": {
            "en": "ī + a → ya",
            "hi": "ī + a → ya"
          },
          "alt": {
            "en": "Long ī can become y too.. Nadī means ‘river’; atra means ‘here’. Long ī changes to y before the dissimilar a. The following a still supplies the boundary vowel. The rule does not leave an extra ī syllable behind.",
            "hi": "Long ī can become y too.. Nadī means ‘river’; atra means ‘here’. Long ī changes to y before the dissimilar a. The following a still supplies the boundary vowel. The rule does not leave an extra ī syllable behind."
          }
        },
        "assetIds": [
          "sandhi-glides-2"
        ]
      },
      {
        "id": "sandhi-source-glides-03",
        "kind": "teach",
        "title": {
          "en": "u and ū become v.",
          "hi": "u and ū become v."
        },
        "body": {
          "en": "Su means ‘well’, and āgatam means ‘come’. At the u + ā boundary, u becomes v and ā remains. Svāgatam is the familiar ‘welcome’. Short u and long ū share this glide outcome before a different vowel family. The ordinary y/v pronunciation must be learned from a competent Sanskrit speaker. This preview does not provide unverified synthetic pronunciation.",
          "hi": "Su means ‘well’, and āgatam means ‘come’. At the u + ā boundary, u becomes v and ā remains. Svāgatam is the familiar ‘welcome’. Short u and long ū share this glide outcome before a different vowel family. The ordinary y/v pronunciation must be learned from a competent Sanskrit speaker. This preview does not provide unverified synthetic pronunciation."
        },
        "example": {
          "sa": "सु + आगतम् → स्वागतम्",
          "iast": "su + āgatam → svāgatam",
          "gloss": {
            "en": "u + ā → vā",
            "hi": "u + ā → vā"
          },
          "alt": {
            "en": "u and ū become v.. Su means ‘well’, and āgatam means ‘come’. At the u + ā boundary, u becomes v and ā remains. Svāgatam is the familiar ‘welcome’. Short u and long ū share this glide outcome before a different vowel family.",
            "hi": "u and ū become v.. Su means ‘well’, and āgatam means ‘come’. At the u + ā boundary, u becomes v and ā remains. Svāgatam is the familiar ‘welcome’. Short u and long ū share this glide outcome before a different vowel family."
          }
        },
        "assetIds": [
          "sandhi-glides-3"
        ]
      },
      {
        "id": "sandhi-source-glides-04",
        "kind": "teach",
        "title": {
          "en": "ṛ becomes r.",
          "hi": "ṛ becomes r."
        },
        "body": {
          "en": "Pitṛ is the compound form ‘father’; ādeśaḥ means ‘instruction’. The vocalic ṛ becomes consonantal r before ā. The result means ‘a father’s instruction’. The following vowel supplies the syllable at the boundary. ṝ has the same glide r. Rare ḷ has the corresponding glide l before a dissimilar vowel. Compound stems and standalone nominative word forms must not be interchanged.",
          "hi": "Pitṛ is the compound form ‘father’; ādeśaḥ means ‘instruction’. The vocalic ṛ becomes consonantal r before ā. The result means ‘a father’s instruction’. The following vowel supplies the syllable at the boundary. ṝ has the same glide r. Rare ḷ has the corresponding glide l before a dissimilar vowel. Compound stems and standalone nominative word forms must not be interchanged."
        },
        "example": {
          "sa": "पितृ + आदेशः → पित्रादेशः",
          "iast": "pitṛ + ādeśaḥ → pitrādeśaḥ",
          "gloss": {
            "en": "ṛ + ā → rā",
            "hi": "ṛ + ā → rā"
          },
          "alt": {
            "en": "ṛ becomes r.. Pitṛ is the compound form ‘father’; ādeśaḥ means ‘instruction’. The vocalic ṛ becomes consonantal r before ā. The result means ‘a father’s instruction’. The following vowel supplies the syllable at the boundary.",
            "hi": "ṛ becomes r.. Pitṛ is the compound form ‘father’; ādeśaḥ means ‘instruction’. The vocalic ṛ becomes consonantal r before ā. The result means ‘a father’s instruction’. The following vowel supplies the syllable at the boundary."
          }
        },
        "assetIds": [
          "sandhi-glides-4"
        ]
      },
      {
        "id": "sandhi-source-glides-05",
        "kind": "teach",
        "title": {
          "en": "The following vowel is preserved.",
          "hi": "The following vowel is preserved."
        },
        "body": {
          "en": "The glide rule is not limited to a. Before e, final i becomes y and the e stays. Iti eva becomes ityeva, ‘just so / precisely thus’. Keep the second vowel rather than replacing it with the first vowel’s long form. Before other dissimilar vowels, apply the same principle: i/ī→y, u/ū→v, ṛ/ṝ→r. The following vowel retains its identity under this step.",
          "hi": "The glide rule is not limited to a. Before e, final i becomes y and the e stays. Iti eva becomes ityeva, ‘just so / precisely thus’. Keep the second vowel rather than replacing it with the first vowel’s long form. Before other dissimilar vowels, apply the same principle: i/ī→y, u/ū→v, ṛ/ṝ→r. The following vowel retains its identity under this step."
        },
        "example": {
          "sa": "इति + एव → इत्येव",
          "iast": "iti + eva → ityeva",
          "gloss": {
            "en": "i + e → ye",
            "hi": "i + e → ye"
          },
          "alt": {
            "en": "The following vowel is preserved.. The glide rule is not limited to a. Before e, final i becomes y and the e stays. Iti eva becomes ityeva, ‘just so / precisely thus’. Keep the second vowel rather than replacing it with the first vowel’s long form.",
            "hi": "The following vowel is preserved.. The glide rule is not limited to a. Before e, final i becomes y and the e stays. Iti eva becomes ityeva, ‘just so / precisely thus’. Keep the second vowel rather than replacing it with the first vowel’s long form."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-glides-06",
        "kind": "teach",
        "title": {
          "en": "Same-family vowels do not glide.",
          "hi": "Same-family vowels do not glide."
        },
        "body": {
          "en": "You already know this word. The two i vowels belong to the same family, so they merge into ī. The glide rule is for a dissimilar next vowel. Always compare the two families before replacing the first vowel. Rare ṛ/ḷ combinations require their traditional savarṇa classification rather than treating them as ordinary dissimilar vowels. Use the reference for those cases.",
          "hi": "You already know this word. The two i vowels belong to the same family, so they merge into ī. The glide rule is for a dissimilar next vowel. Always compare the two families before replacing the first vowel. Rare ṛ/ḷ combinations require their traditional savarṇa classification rather than treating them as ordinary dissimilar vowels. Use the reference for those cases."
        },
        "example": {
          "sa": "अति + इव → अतीव",
          "iast": "ati + iva → atīva",
          "gloss": {
            "en": "i + i → ī, not yi",
            "hi": "i + i → ī, not yi"
          },
          "alt": {
            "en": "Same-family vowels do not glide.. You already know this word. The two i vowels belong to the same family, so they merge into ī. The glide rule is for a dissimilar next vowel. Always compare the two families before replacing the first vowel.",
            "hi": "Same-family vowels do not glide.. You already know this word. The two i vowels belong to the same family, so they merge into ī. The glide rule is for a dissimilar next vowel. Always compare the two families before replacing the first vowel."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-glides-07",
        "kind": "teach",
        "title": {
          "en": "A consonant is not a trigger.",
          "hi": "A consonant is not a trigger."
        },
        "body": {
          "en": "The river flows: nadī vahati. The next word starts with consonant v, so the final ī does not become y. Seeing a familiar vowel ending is not enough; the next initial sound must satisfy the rule. No change is a real result, not a missing rule. Independent words remain separate in this example even though continuous pronunciation links the phrase.",
          "hi": "The river flows: nadī vahati. The next word starts with consonant v, so the final ī does not become y. Seeing a familiar vowel ending is not enough; the next initial sound must satisfy the rule. No change is a real result, not a missing rule. Independent words remain separate in this example even though continuous pronunciation links the phrase."
        },
        "example": {
          "sa": "नदी + वहति → नदी वहति",
          "iast": "nadī vahati",
          "gloss": {
            "en": "ī + v → no vowel sandhi",
            "hi": "ī + v → no vowel sandhi"
          },
          "alt": {
            "en": "A consonant is not a trigger.. The river flows: nadī vahati. The next word starts with consonant v, so the final ī does not become y. Seeing a familiar vowel ending is not enough; the next initial sound must satisfy the rule.",
            "hi": "A consonant is not a trigger.. The river flows: nadī vahati. The next word starts with consonant v, so the final ī does not become y. Seeing a familiar vowel ending is not enough; the next initial sound must satisfy the rule."
          }
        },
        "assetIds": [
          "sandhi-glides-7"
        ]
      },
      {
        "id": "sandhi-source-glides-08",
        "kind": "teach",
        "title": {
          "en": "Recover the vowel through the glide.",
          "hi": "Recover the vowel through the glide."
        },
        "body": {
          "en": "When reading nadyatra, recognise atra and test nadī as the preceding word. The y can come from ī before a. A glide does not reveal the original vowel’s length, so vocabulary and grammar still complete the analysis. Not every y or v comes from sandhi. Some are original consonants. Reverse analysis needs plausible words, not automatic replacement of every glide.",
          "hi": "When reading nadyatra, recognise atra and test nadī as the preceding word. The y can come from ī before a. A glide does not reveal the original vowel’s length, so vocabulary and grammar still complete the analysis. Not every y or v comes from sandhi. Some are original consonants. Reverse analysis needs plausible words, not automatic replacement of every glide."
        },
        "example": {
          "sa": "नदी + अत्र → नद्यत्र",
          "iast": "nadyatra ← nadī + atra",
          "gloss": {
            "en": "y may point back to i or ī",
            "hi": "y may point back to i or ī"
          },
          "alt": {
            "en": "Recover the vowel through the glide.. When reading nadyatra, recognise atra and test nadī as the preceding word. The y can come from ī before a. A glide does not reveal the original vowel’s length, so vocabulary and grammar still complete the analysis.",
            "hi": "Recover the vowel through the glide.. When reading nadyatra, recognise atra and test nadī as the preceding word. The y can come from ī before a. A glide does not reveal the original vowel’s length, so vocabulary and grammar still complete the analysis."
          }
        },
        "assetIds": []
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Sandhi manuscript · Whitney §129. Source reading; no assessed mastery.",
      "hi": "Existing English Sandhi manuscript · Whitney §129. Source reading; no assessed mastery."
    }
  },
  {
    "id": "sandhi-source-e-o",
    "rank": 5,
    "unit": {
      "en": "Sandhi: full source readings",
      "hi": "Sandhi: full source readings"
    },
    "title": {
      "en": "The special behaviour of e and o",
      "hi": "The special behaviour of e and o"
    },
    "titleSa": "सन्धिः",
    "titleIast": "sandhiḥ",
    "outcome": {
      "en": "Distinguish internal ay/av from external elision and retained hiatus.",
      "hi": "Distinguish internal ay/av from external elision and retained hiatus."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://en.wikisource.org/wiki/Sanskrit_Grammar_(Whitney)/Chapter_III"
    ],
    "cards": [
      {
        "id": "sandhi-source-e-o-01",
        "kind": "teach",
        "title": {
          "en": "Inside formations, e can open to ay.",
          "hi": "Inside formations, e can open to ay."
        },
        "body": {
          "en": "In this schematic present-stem formation, e develops into ay before a: nayanti, ‘they lead’. This is an internal formation. Do not transfer its ay result automatically to independent words ending in e. The diagram begins at an intermediate grammatical stage. It is not the full derivation from the root nī. Showing the stage keeps vowel sandhi separate from guṇa and tense formation.",
          "hi": "In this schematic present-stem formation, e develops into ay before a: nayanti, ‘they lead’. This is an internal formation. Do not transfer its ay result automatically to independent words ending in e. The diagram begins at an intermediate grammatical stage. It is not the full derivation from the root nī. Showing the stage keeps vowel sandhi separate from guṇa and tense formation."
        },
        "example": {
          "sa": "ने + अ + न्ति → नयन्ति",
          "iast": "ne + a + nti → nayanti",
          "gloss": {
            "en": "e + vowel → ay + vowel",
            "hi": "e + vowel → ay + vowel"
          },
          "alt": {
            "en": "Inside formations, e can open to ay.. In this schematic present-stem formation, e develops into ay before a: nayanti, ‘they lead’. This is an internal formation. Do not transfer its ay result automatically to independent words ending in e.",
            "hi": "Inside formations, e can open to ay.. In this schematic present-stem formation, e develops into ay before a: nayanti, ‘they lead’. This is an internal formation. Do not transfer its ay result automatically to independent words ending in e."
          }
        },
        "assetIds": [
          "sandhi-e-o-1"
        ]
      },
      {
        "id": "sandhi-source-e-o-02",
        "kind": "teach",
        "title": {
          "en": "The parallel for o is av.",
          "hi": "The parallel for o is av."
        },
        "body": {
          "en": "The corresponding schematic formation gives bhavanti, ‘they are / become’. Before a vowel, internal o opens to av. The relation e→ay and o→av helps explain forms, but external boundaries need additional rules. This begins after an earlier change from root bhū. Sandhi is one stage of derivation, not a replacement for the conjugation system. Internal ai→āy and au→āv follow the parallel pattern.",
          "hi": "The corresponding schematic formation gives bhavanti, ‘they are / become’. Before a vowel, internal o opens to av. The relation e→ay and o→av helps explain forms, but external boundaries need additional rules. This begins after an earlier change from root bhū. Sandhi is one stage of derivation, not a replacement for the conjugation system. Internal ai→āy and au→āv follow the parallel pattern."
        },
        "example": {
          "sa": "भो + अ + न्ति → भवन्ति",
          "iast": "bho + a + nti → bhavanti",
          "gloss": {
            "en": "o + vowel → av + vowel",
            "hi": "o + vowel → av + vowel"
          },
          "alt": {
            "en": "The parallel for o is av.. The corresponding schematic formation gives bhavanti, ‘they are / become’. Before a vowel, internal o opens to av. The relation e→ay and o→av helps explain forms, but external boundaries need additional rules.",
            "hi": "The parallel for o is av.. The corresponding schematic formation gives bhavanti, ‘they are / become’. Before a vowel, internal o opens to av. The relation e→ay and o→av helps explain forms, but external boundaries need additional rules."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-e-o-03",
        "kind": "teach",
        "title": {
          "en": "At a word boundary, short a disappears.",
          "hi": "At a word boundary, short a disappears."
        },
        "body": {
          "en": "Te means ‘they’; api means ‘also’. The e stays and the initial short a drops. The mark ऽ, avagraha, records the lost a. Te’pi means ‘they too’. You do not pronounce the avagraha as a new sound. This external rule also applies after ordinary final o: an initial short a is elided. Check pragṛhya status first, and distinguish lexical o from o arising through visarga sandhi.",
          "hi": "Te means ‘they’; api means ‘also’. The e stays and the initial short a drops. The mark ऽ, avagraha, records the lost a. Te’pi means ‘they too’. You do not pronounce the avagraha as a new sound. This external rule also applies after ordinary final o: an initial short a is elided. Check pragṛhya status first, and distinguish lexical o from o arising through visarga sandhi."
        },
        "example": {
          "sa": "ते + अपि → तेऽपि",
          "iast": "te + api → te’pi",
          "gloss": {
            "en": "e + short a → e’",
            "hi": "e + short a → e’"
          },
          "alt": {
            "en": "At a word boundary, short a disappears.. Te means ‘they’; api means ‘also’. The e stays and the initial short a drops. The mark ऽ, avagraha, records the lost a. Te’pi means ‘they too’. You do not pronounce the avagraha as a new sound.",
            "hi": "At a word boundary, short a disappears.. Te means ‘they’; api means ‘also’. The e stays and the initial short a drops. The mark ऽ, avagraha, records the lost a. Te’pi means ‘they too’. You do not pronounce the avagraha as a new sound."
          }
        },
        "assetIds": [
          "sandhi-e-o-3"
        ]
      },
      {
        "id": "sandhi-source-e-o-04",
        "kind": "teach",
        "title": {
          "en": "Long ā does not disappear this way.",
          "hi": "Long ā does not disappear this way."
        },
        "body": {
          "en": "Te āgatāḥ means ‘they have come’. Here e changes to a, while the following long ā remains. Read the two boundary vowels separately. The short-a elision rule does not apply to a word beginning in ā. The usual external ay loses its y in this setting. The resulting hiatus is normally retained. Do not run savarṇa-dīrgha again and collapse a + ā.",
          "hi": "Te āgatāḥ means ‘they have come’. Here e changes to a, while the following long ā remains. Read the two boundary vowels separately. The short-a elision rule does not apply to a word beginning in ā. The usual external ay loses its y in this setting. The resulting hiatus is normally retained. Do not run savarṇa-dīrgha again and collapse a + ā."
        },
        "example": {
          "sa": "ते + आगताः → त आगताः",
          "iast": "te + āgatāḥ → ta āgatāḥ",
          "gloss": {
            "en": "e + ā → a | ā",
            "hi": "e + ā → a | ā"
          },
          "alt": {
            "en": "Long ā does not disappear this way.. Te āgatāḥ means ‘they have come’. Here e changes to a, while the following long ā remains. Read the two boundary vowels separately. The short-a elision rule does not apply to a word beginning in ā.",
            "hi": "Long ā does not disappear this way.. Te āgatāḥ means ‘they have come’. Here e changes to a, while the following long ā remains. Read the two boundary vowels separately. The short-a elision rule does not apply to a word beginning in ā."
          }
        },
        "assetIds": [
          "sandhi-e-o-4"
        ]
      },
      {
        "id": "sandhi-source-e-o-05",
        "kind": "teach",
        "title": {
          "en": "Other vowels keep the gap too.",
          "hi": "Other vowels keep the gap too."
        },
        "body": {
          "en": "Iha means ‘here’. Before its i, final e normally becomes a and leaves the following i intact. The result is ta iha, ‘they [are] here’. Two adjacent vowel syllables can therefore be correct in joined Sanskrit. This retained hiatus follows loss of y. A space is helpful editorially, but the grammatical reason for the gap is the rule, not the space itself. Rare textual alternatives belong in detailed reference.",
          "hi": "Iha means ‘here’. Before its i, final e normally becomes a and leaves the following i intact. The result is ta iha, ‘they [are] here’. Two adjacent vowel syllables can therefore be correct in joined Sanskrit. This retained hiatus follows loss of y. A space is helpful editorially, but the grammatical reason for the gap is the rule, not the space itself. Rare textual alternatives belong in detailed reference."
        },
        "example": {
          "sa": "ते + इह → त इह",
          "iast": "te + iha → ta iha",
          "gloss": {
            "en": "e + i → a | i",
            "hi": "e + i → a | i"
          },
          "alt": {
            "en": "Other vowels keep the gap too.. Iha means ‘here’. Before its i, final e normally becomes a and leaves the following i intact. The result is ta iha, ‘they [are] here’. Two adjacent vowel syllables can therefore be correct in joined Sanskrit.",
            "hi": "Other vowels keep the gap too.. Iha means ‘here’. Before its i, final e normally becomes a and leaves the following i intact. The result is ta iha, ‘they [are] here’. Two adjacent vowel syllables can therefore be correct in joined Sanskrit."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-e-o-06",
        "kind": "teach",
        "title": {
          "en": "External ai normally leaves ā.",
          "hi": "External ai normally leaves ā."
        },
        "body": {
          "en": "Tasyai means ‘to her’. Before a following vowel, external ai usually becomes ā. The next vowel remains separate: tasyā api, ‘to her too’. Do not combine the resulting ā and a a second time. The internal corresponding outcome is āy. Grammarians allow retention in some descriptions, but loss of y and retained hiatus are the usual reading pattern in texts.",
          "hi": "Tasyai means ‘to her’. Before a following vowel, external ai usually becomes ā. The next vowel remains separate: tasyā api, ‘to her too’. Do not combine the resulting ā and a a second time. The internal corresponding outcome is āy. Grammarians allow retention in some descriptions, but loss of y and retained hiatus are the usual reading pattern in texts."
        },
        "example": {
          "sa": "तस्यै + अपि → तस्या अपि",
          "iast": "tasyai + api → tasyā api",
          "gloss": {
            "en": "ai + vowel → ā | vowel",
            "hi": "ai + vowel → ā | vowel"
          },
          "alt": {
            "en": "External ai normally leaves ā.. Tasyai means ‘to her’. Before a following vowel, external ai usually becomes ā. The next vowel remains separate: tasyā api, ‘to her too’. Do not combine the resulting ā and a a second time.",
            "hi": "External ai normally leaves ā.. Tasyai means ‘to her’. Before a following vowel, external ai usually becomes ā. The next vowel remains separate: tasyā api, ‘to her too’. Do not combine the resulting ā and a a second time."
          }
        },
        "assetIds": [
          "sandhi-e-o-6"
        ]
      },
      {
        "id": "sandhi-source-e-o-07",
        "kind": "teach",
        "title": {
          "en": "External au keeps v.",
          "hi": "External au keeps v."
        },
        "body": {
          "en": "Tau means ‘those two’; eva adds emphasis. Here au becomes āv and the next e stays, giving tāveva. Unlike the usual external ai pattern, the v is retained. Learn this contrast rather than dropping every glide. This is ordinary Classical usage. Older Vedic texts show additional variants; those require evidence from the particular text and its recitation tradition.",
          "hi": "Tau means ‘those two’; eva adds emphasis. Here au becomes āv and the next e stays, giving tāveva. Unlike the usual external ai pattern, the v is retained. Learn this contrast rather than dropping every glide. This is ordinary Classical usage. Older Vedic texts show additional variants; those require evidence from the particular text and its recitation tradition."
        },
        "example": {
          "sa": "तौ + एव → तावेव",
          "iast": "tau + eva → tāveva",
          "gloss": {
            "en": "au + e → āve",
            "hi": "au + e → āve"
          },
          "alt": {
            "en": "External au keeps v.. Tau means ‘those two’; eva adds emphasis. Here au becomes āv and the next e stays, giving tāveva. Unlike the usual external ai pattern, the v is retained. Learn this contrast rather than dropping every glide.",
            "hi": "External au keeps v.. Tau means ‘those two’; eva adds emphasis. Here au becomes āv and the next e stays, giving tāveva. Unlike the usual external ai pattern, the v is retained. Learn this contrast rather than dropping every glide."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-e-o-08",
        "kind": "teach",
        "title": {
          "en": "Ask whether o came from visarga.",
          "hi": "Ask whether o came from visarga."
        },
        "body": {
          "en": "The pause form rāmaḥ becomes rāma before iha, ‘here’. Do not invent an intermediate rāmo and apply a general o table to it. Start from the real word ending. Visarga sandhi will explain this family explicitly. Lexical final o is uncommon and has exceptions: go in compounds, vocatives and certain particles need their own reference entries. The shared-looking surface o can conceal different grammatical histories.",
          "hi": "The pause form rāmaḥ becomes rāma before iha, ‘here’. Do not invent an intermediate rāmo and apply a general o table to it. Start from the real word ending. Visarga sandhi will explain this family explicitly. Lexical final o is uncommon and has exceptions: go in compounds, vocatives and certain particles need their own reference entries. The shared-looking surface o can conceal different grammatical histories."
        },
        "example": {
          "sa": "रामः + इह → राम इह",
          "iast": "rāmaḥ + iha → rāma iha",
          "gloss": {
            "en": "aḥ + i → a | i",
            "hi": "aḥ + i → a | i"
          },
          "alt": {
            "en": "Ask whether o came from visarga.. The pause form rāmaḥ becomes rāma before iha, ‘here’. Do not invent an intermediate rāmo and apply a general o table to it. Start from the real word ending. Visarga sandhi will explain this family explicitly.",
            "hi": "Ask whether o came from visarga.. The pause form rāmaḥ becomes rāma before iha, ‘here’. Do not invent an intermediate rāmo and apply a general o table to it. Start from the real word ending. Visarga sandhi will explain this family explicitly."
          }
        },
        "assetIds": []
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Sandhi manuscript · Whitney §§131–135. Source reading; no assessed mastery.",
      "hi": "Existing English Sandhi manuscript · Whitney §§131–135. Source reading; no assessed mastery."
    }
  },
  {
    "id": "sandhi-source-protected",
    "rank": 6,
    "unit": {
      "en": "Sandhi: full source readings",
      "hi": "Sandhi: full source readings"
    },
    "title": {
      "en": "When the ordinary vowel rule stops",
      "hi": "When the ordinary vowel rule stops"
    },
    "titleSa": "सन्धिः",
    "titleIast": "sandhiḥ",
    "outcome": {
      "en": "Recognise protected vowels and morphology-sensitive exceptions.",
      "hi": "Recognise protected vowels and morphology-sensitive exceptions."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://en.wikisource.org/wiki/Sanskrit_Grammar_(Whitney)/Chapter_III"
    ],
    "cards": [
      {
        "id": "sandhi-source-protected-01",
        "kind": "teach",
        "title": {
          "en": "Some dual endings are protected.",
          "hi": "Some dual endings are protected."
        },
        "body": {
          "en": "Agnī here means ‘two fires’, and apaśyam means ‘I saw’. The dual ending ī remains before the next vowel: agnī apaśyam. This protected class is called pragṛhya. Identify the grammatical ending before applying the usual ī→y rule. Dual ī, ū and e are the main pragṛhya endings. The final m in apaśyam is retained at a pause; if another consonant follows in continuous speech, final-m sandhi applies separately.",
          "hi": "Agnī here means ‘two fires’, and apaśyam means ‘I saw’. The dual ending ī remains before the next vowel: agnī apaśyam. This protected class is called pragṛhya. Identify the grammatical ending before applying the usual ī→y rule. Dual ī, ū and e are the main pragṛhya endings. The final m in apaśyam is retained at a pause; if another consonant follows in continuous speech, final-m sandhi applies separately."
        },
        "example": {
          "sa": "अग्नी + अपश्यम् → अग्नी अपश्यम्",
          "iast": "agnī apaśyam",
          "gloss": {
            "en": "Dual ī · no joining",
            "hi": "Dual ī · no joining"
          },
          "alt": {
            "en": "Some dual endings are protected.. Agnī here means ‘two fires’, and apaśyam means ‘I saw’. The dual ending ī remains before the next vowel: agnī apaśyam. This protected class is called pragṛhya. Identify the grammatical ending before applying the usual ī→y rule.",
            "hi": "Some dual endings are protected.. Agnī here means ‘two fires’, and apaśyam means ‘I saw’. The dual ending ī remains before the next vowel: agnī apaśyam. This protected class is called pragṛhya. Identify the grammatical ending before applying the usual ī→y rule."
          }
        },
        "assetIds": [
          "sandhi-protected-1"
        ]
      },
      {
        "id": "sandhi-source-protected-02",
        "kind": "teach",
        "title": {
          "en": "Dual ū is protected too.",
          "hi": "Dual ū is protected too."
        },
        "body": {
          "en": "Bāhū means ‘two arms’; udyacchati means ‘raises’. The ū and following u remain separate. Do not merge them into ū simply because they are of one family. The dual ending’s protected status comes first. This phrase means ‘[someone] raises two arms’. The same bāhu stem has other case and number endings; protection belongs to the specified dual forms, not to every word related to bāhu.",
          "hi": "Bāhū means ‘two arms’; udyacchati means ‘raises’. The ū and following u remain separate. Do not merge them into ū simply because they are of one family. The dual ending’s protected status comes first. This phrase means ‘[someone] raises two arms’. The same bāhu stem has other case and number endings; protection belongs to the specified dual forms, not to every word related to bāhu."
        },
        "example": {
          "sa": "बाहू + उद्यच्छति → बाहू उद्यच्छति",
          "iast": "bāhū udyacchati",
          "gloss": {
            "en": "Dual ū · no merger",
            "hi": "Dual ū · no merger"
          },
          "alt": {
            "en": "Dual ū is protected too.. Bāhū means ‘two arms’; udyacchati means ‘raises’. The ū and following u remain separate. Do not merge them into ū simply because they are of one family. The dual ending’s protected status comes first.",
            "hi": "Dual ū is protected too.. Bāhū means ‘two arms’; udyacchati means ‘raises’. The ū and following u remain separate. Do not merge them into ū simply because they are of one family. The dual ending’s protected status comes first."
          }
        },
        "assetIds": [
          "sandhi-protected-2"
        ]
      },
      {
        "id": "sandhi-source-protected-03",
        "kind": "teach",
        "title": {
          "en": "An e ending is not always protected.",
          "hi": "An e ending is not always protected."
        },
        "body": {
          "en": "Labhete is a dual verbal form: ‘the two obtain’. Its final e stays before aśvān, ‘horses’. Compare te + api → te’pi from the last lesson. Both end in e, but only the specified grammatical class receives protection. Pragṛhya is not a spelling exception for every e. The learner needs number and form identification. The supplied aśvān is an accusative plural word form.",
          "hi": "Labhete is a dual verbal form: ‘the two obtain’. Its final e stays before aśvān, ‘horses’. Compare te + api → te’pi from the last lesson. Both end in e, but only the specified grammatical class receives protection. Pragṛhya is not a spelling exception for every e. The learner needs number and form identification. The supplied aśvān is an accusative plural word form."
        },
        "example": {
          "sa": "तौ लभेते + अश्वान् → तौ लभेते अश्वान्",
          "iast": "tau labhete aśvān",
          "gloss": {
            "en": "Dual verbal e · protected",
            "hi": "Dual verbal e · protected"
          },
          "alt": {
            "en": "An e ending is not always protected.. Labhete is a dual verbal form: ‘the two obtain’. Its final e stays before aśvān, ‘horses’. Compare te + api → te’pi from the last lesson. Both end in e, but only the specified grammatical class receives protection.",
            "hi": "An e ending is not always protected.. Labhete is a dual verbal form: ‘the two obtain’. Its final e stays before aśvān, ‘horses’. Compare te + api → te’pi from the last lesson. Both end in e, but only the specified grammatical class receives protection."
          }
        },
        "assetIds": [
          "sandhi-protected-3"
        ]
      },
      {
        "id": "sandhi-source-protected-04",
        "kind": "teach",
        "title": {
          "en": "Recognise amī and protected particles.",
          "hi": "Recognise amī and protected particles."
        },
        "body": {
          "en": "Amī means ‘those [men]’. Its ī is protected even though this form is plural, not dual. Certain particles and interjections also keep their vowels. These are named grammatical classes, so use a short exception list alongside the ordinary rules. Whitney also lists final o produced with particle u, interjections such as aho, and Vedic protected pronominal or locative forms. These lexical and register-specific cases should have reference entries.",
          "hi": "Amī means ‘those [men]’. Its ī is protected even though this form is plural, not dual. Certain particles and interjections also keep their vowels. These are named grammatical classes, so use a short exception list alongside the ordinary rules. Whitney also lists final o produced with particle u, interjections such as aho, and Vedic protected pronominal or locative forms. These lexical and register-specific cases should have reference entries."
        },
        "example": {
          "sa": "अमी + अत्र → अमी अत्र",
          "iast": "amī atra",
          "gloss": {
            "en": "amī · protected ī",
            "hi": "amī · protected ī"
          },
          "alt": {
            "en": "Recognise amī and protected particles.. Amī means ‘those [men]’. Its ī is protected even though this form is plural, not dual. Certain particles and interjections also keep their vowels. These are named grammatical classes, so use a short exception list alongside the ordinary rules.",
            "hi": "Recognise amī and protected particles.. Amī means ‘those [men]’. Its ī is protected even though this form is plural, not dual. Certain particles and interjections also keep their vowels. These are named grammatical classes, so use a short exception list alongside the ordinary rules."
          }
        },
        "assetIds": [
          "sandhi-protected-4"
        ]
      },
      {
        "id": "sandhi-source-protected-05",
        "kind": "teach",
        "title": {
          "en": "A prolonged vowel is a different case.",
          "hi": "A prolonged vowel is a different case."
        },
        "body": {
          "en": "A specially prolonged vowel, often marked with ३, is not treated as an ordinary short or long vowel. Recognise it as a special speech setting. Do not turn ordinary ā + a into this prolonged vowel by adding their lengths. Pluta occurs especially in calling, questioning and recitation contexts. Detailed accent and recitation rules belong in a dedicated phonetics or Vedic chapter. The displayed form is a notation demonstration, not a vocabulary word.",
          "hi": "A specially prolonged vowel, often marked with ३, is not treated as an ordinary short or long vowel. Recognise it as a special speech setting. Do not turn ordinary ā + a into this prolonged vowel by adding their lengths. Pluta occurs especially in calling, questioning and recitation contexts. Detailed accent and recitation rules belong in a dedicated phonetics or Vedic chapter. The displayed form is a notation demonstration, not a vocabulary word."
        },
        "example": {
          "sa": "आ३ + next vowel → Keep the prolonged vowel",
          "iast": "pluta: a vowel held for three mātrās",
          "gloss": {
            "en": "Pluta · no ordinary merger",
            "hi": "Pluta · no ordinary merger"
          },
          "alt": {
            "en": "A prolonged vowel is a different case.. A specially prolonged vowel, often marked with ३, is not treated as an ordinary short or long vowel. Recognise it as a special speech setting. Do not turn ordinary ā + a into this prolonged vowel by adding their lengths.",
            "hi": "A prolonged vowel is a different case.. A specially prolonged vowel, often marked with ३, is not treated as an ordinary short or long vowel. Recognise it as a special speech setting. Do not turn ordinary ā + a into this prolonged vowel by adding their lengths."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-protected-06",
        "kind": "teach",
        "title": {
          "en": "A prefix before ṛ can give ār.",
          "hi": "A prefix before ṛ can give ār."
        },
        "body": {
          "en": "With a verbal prefix ending in a or ā before a root beginning in ṛ, the result can be ār. This differs from mahā + ṛṣiḥ → maharṣiḥ. Identify prefix plus root before choosing the ordinary ar result. This is a specialist formation, ‘approaches / reaches’. Dictionaries and grammatical analyses help identify the prefix and root; the surface sound pair alone is insufficient.",
          "hi": "With a verbal prefix ending in a or ā before a root beginning in ṛ, the result can be ār. This differs from mahā + ṛṣiḥ → maharṣiḥ. Identify prefix plus root before choosing the ordinary ar result. This is a specialist formation, ‘approaches / reaches’. Dictionaries and grammatical analyses help identify the prefix and root; the surface sound pair alone is insufficient."
        },
        "example": {
          "sa": "उप + ऋच्छति → उपार्च्छति",
          "iast": "upa + ṛcchati → upārcchati",
          "gloss": {
            "en": "Prefix a + root ṛ → ār",
            "hi": "Prefix a + root ṛ → ār"
          },
          "alt": {
            "en": "A prefix before ṛ can give ār.. With a verbal prefix ending in a or ā before a root beginning in ṛ, the result can be ār. This differs from mahā + ṛṣiḥ → maharṣiḥ. Identify prefix plus root before choosing the ordinary ar result.",
            "hi": "A prefix before ṛ can give ār.. With a verbal prefix ending in a or ā before a root beginning in ṛ, the result can be ār. This differs from mahā + ṛṣiḥ → maharṣiḥ. Identify prefix plus root before choosing the ordinary ar result."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-protected-07",
        "kind": "teach",
        "title": {
          "en": "A prefix before e may keep only e.",
          "hi": "A prefix before e may keep only e."
        },
        "body": {
          "en": "Upetavya means ‘to be approached’. At this prefix boundary, a disappears and the following e remains. Ordinary a + e would give ai. This is a morphology-sensitive pattern, not permission to discard a at any word boundary. Pararūpa patterns and lexical exceptions must be attached to the specific prefix/root or compound configuration. Whitney §137b includes upetavya, upetṛ and additional lexical examples.",
          "hi": "Upetavya means ‘to be approached’. At this prefix boundary, a disappears and the following e remains. Ordinary a + e would give ai. This is a morphology-sensitive pattern, not permission to discard a at any word boundary. Pararūpa patterns and lexical exceptions must be attached to the specific prefix/root or compound configuration. Whitney §137b includes upetavya, upetṛ and additional lexical examples."
        },
        "example": {
          "sa": "उप + एतव्य → उपेतव्य",
          "iast": "upa + etavya → upetavya",
          "gloss": {
            "en": "Special prefix pattern · pararūpa",
            "hi": "Special prefix pattern · pararūpa"
          },
          "alt": {
            "en": "A prefix before e may keep only e.. Upetavya means ‘to be approached’. At this prefix boundary, a disappears and the following e remains. Ordinary a + e would give ai. This is a morphology-sensitive pattern, not permission to discard a at any word boundary.",
            "hi": "A prefix before e may keep only e.. Upetavya means ‘to be approached’. At this prefix boundary, a disappears and the following e remains. Ordinary a + e would give ai. This is a morphology-sensitive pattern, not permission to discard a at any word boundary."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-protected-08",
        "kind": "teach",
        "title": {
          "en": "A verbal augment can give vṛddhi.",
          "hi": "A verbal augment can give vṛddhi."
        },
        "body": {
          "en": "The past-tense augment a is a grammatical element. In the cited formation, it gives ai before initial i, rather than the ordinary e. Corresponding u and ṛ cases can give au and ār. Identify the augment before applying the simple vowel table. This is the grammatical example from Whitney §136a, rather than a free phrase ‘a + ita’. Teach its full tense formation in the verb chapter. Here it shows why sandhi needs grammatical context.",
          "hi": "The past-tense augment a is a grammatical element. In the cited formation, it gives ai before initial i, rather than the ordinary e. Corresponding u and ṛ cases can give au and ār. Identify the augment before applying the simple vowel table. This is the grammatical example from Whitney §136a, rather than a free phrase ‘a + ita’. Teach its full tense formation in the verb chapter. Here it shows why sandhi needs grammatical context."
        },
        "example": {
          "sa": "अ + इत → ऐत",
          "iast": "a + ita → aita",
          "gloss": {
            "en": "Augment a + i → ai",
            "hi": "Augment a + i → ai"
          },
          "alt": {
            "en": "A verbal augment can give vṛddhi.. The past-tense augment a is a grammatical element. In the cited formation, it gives ai before initial i, rather than the ordinary e. Corresponding u and ṛ cases can give au and ār. Identify the augment before applying the simple vowel table.",
            "hi": "A verbal augment can give vṛddhi.. The past-tense augment a is a grammatical element. In the cited formation, it gives ai before initial i, rather than the ordinary e. Corresponding u and ṛ cases can give au and ār. Identify the augment before applying the simple vowel table."
          }
        },
        "assetIds": []
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Sandhi manuscript · Whitney §§136–138. Source reading; no assessed mastery.",
      "hi": "Existing English Sandhi manuscript · Whitney §§136–138. Source reading; no assessed mastery."
    }
  },
  {
    "id": "sandhi-source-stops",
    "rank": 7,
    "unit": {
      "en": "Sandhi: full source readings",
      "hi": "Sandhi: full source readings"
    },
    "title": {
      "en": "Final stops follow their neighbour",
      "hi": "Final stops follow their neighbour"
    },
    "titleSa": "सन्धिः",
    "titleIast": "sandhiḥ",
    "outcome": {
      "en": "Read voicing, nasalisation and dental assimilation at word boundaries.",
      "hi": "Read voicing, nasalisation and dental assimilation at word boundaries."
    },
    "minutes": 10,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://en.wikisource.org/wiki/Sanskrit_Grammar_(Whitney)/Chapter_III"
    ],
    "cards": [
      {
        "id": "sandhi-source-stops-01",
        "kind": "teach",
        "title": {
          "en": "Begin with a valid word ending.",
          "hi": "Begin with a valid word ending."
        },
        "body": {
          "en": "Vāc is the stem ‘speech’; its pause form is vāk. External sandhi starts from the appropriate word form, not a raw dictionary stem. Learn the supplied forms with their morphology so that you do not apply a joining rule to the wrong input. Usual final consonants are k, ṭ, t, p, ṅ, n, m and ḥ; rare ṇ and l occur too. Cluster reduction and stem-specific finals have exceptions, so ‘every palatal becomes k’ is not a complete derivation rule.",
          "hi": "Vāc is the stem ‘speech’; its pause form is vāk. External sandhi starts from the appropriate word form, not a raw dictionary stem. Learn the supplied forms with their morphology so that you do not apply a joining rule to the wrong input. Usual final consonants are k, ṭ, t, p, ṅ, n, m and ḥ; rare ṇ and l occur too. Cluster reduction and stem-specific finals have exceptions, so ‘every palatal becomes k’ is not a complete derivation rule."
        },
        "example": {
          "sa": "वाच् → pause form → वाक्",
          "iast": "vāc stem → vāk at pause",
          "gloss": {
            "en": "Form the word before joining it",
            "hi": "Form the word before joining it"
          },
          "alt": {
            "en": "Begin with a valid word ending.. Vāc is the stem ‘speech’; its pause form is vāk. External sandhi starts from the appropriate word form, not a raw dictionary stem. Learn the supplied forms with their morphology so that you do not apply a joining rule to the wrong input.",
            "hi": "Begin with a valid word ending.. Vāc is the stem ‘speech’; its pause form is vāk. External sandhi starts from the appropriate word form, not a raw dictionary stem. Learn the supplied forms with their morphology so that you do not apply a joining rule to the wrong input."
          }
        },
        "assetIds": [
          "sandhi-stops-1"
        ]
      },
      {
        "id": "sandhi-source-stops-02",
        "kind": "teach",
        "title": {
          "en": "Voiced neighbours voice a final stop.",
          "hi": "Voiced neighbours voice a final stop."
        },
        "body": {
          "en": "Tat means ‘that’; asti means ‘exists / is’. A vowel is voiced, so final t becomes d. Tadasti means ‘that exists’. The vowel itself stays. This is consonant sandhi even though the next word begins with a vowel. The ordinary final-stop correspondences are k→g, ṭ→ḍ, t→d and p→b before voiced sounds. Pause forms and connected forms differ.",
          "hi": "Tat means ‘that’; asti means ‘exists / is’. A vowel is voiced, so final t becomes d. Tadasti means ‘that exists’. The vowel itself stays. This is consonant sandhi even though the next word begins with a vowel. The ordinary final-stop correspondences are k→g, ṭ→ḍ, t→d and p→b before voiced sounds. Pause forms and connected forms differ."
        },
        "example": {
          "sa": "तत् + अस्ति → तदस्ति",
          "iast": "tat + asti → tadasti",
          "gloss": {
            "en": "t + vowel → d + vowel",
            "hi": "t + vowel → d + vowel"
          },
          "alt": {
            "en": "Voiced neighbours voice a final stop.. Tat means ‘that’; asti means ‘exists / is’. A vowel is voiced, so final t becomes d. Tadasti means ‘that exists’. The vowel itself stays. This is consonant sandhi even though the next word begins with a vowel.",
            "hi": "Voiced neighbours voice a final stop.. Tat means ‘that’; asti means ‘exists / is’. A vowel is voiced, so final t becomes d. Tadasti means ‘that exists’. The vowel itself stays. This is consonant sandhi even though the next word begins with a vowel."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-stops-03",
        "kind": "teach",
        "title": {
          "en": "The same happens before g.",
          "hi": "The same happens before g."
        },
        "body": {
          "en": "G is a voiced stop. Final t therefore becomes d before gacchati, ‘goes’. The result is tadgacchati, ‘that goes’. You are changing voicing, not moving the dental t to the g sound’s place of articulation. Voicing and place are separate checks. Final t has extra place-assimilation rules before palatal and retroflex sounds; the next cards add those.",
          "hi": "G is a voiced stop. Final t therefore becomes d before gacchati, ‘goes’. The result is tadgacchati, ‘that goes’. You are changing voicing, not moving the dental t to the g sound’s place of articulation. Voicing and place are separate checks. Final t has extra place-assimilation rules before palatal and retroflex sounds; the next cards add those."
        },
        "example": {
          "sa": "तत् + गच्छति → तद्गच्छति",
          "iast": "tat + gacchati → tadgacchati",
          "gloss": {
            "en": "t + g → d + g",
            "hi": "t + g → d + g"
          },
          "alt": {
            "en": "The same happens before g.. G is a voiced stop. Final t therefore becomes d before gacchati, ‘goes’. The result is tadgacchati, ‘that goes’. You are changing voicing, not moving the dental t to the g sound’s place of articulation.",
            "hi": "The same happens before g.. G is a voiced stop. Final t therefore becomes d before gacchati, ‘goes’. The result is tadgacchati, ‘that goes’. You are changing voicing, not moving the dental t to the g sound’s place of articulation."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-stops-04",
        "kind": "teach",
        "title": {
          "en": "An unvoiced neighbour keeps it unvoiced.",
          "hi": "An unvoiced neighbour keeps it unvoiced."
        },
        "body": {
          "en": "Ph is unvoiced, even though it is aspirated. Final t stays t. Tat phalam means ‘that fruit’. A following h inside the Roman symbol ph does not make ph two consonants or turn it into voiced h. Aspirated kh, ch, ṭh, th and ph are unvoiced stops. Gh, jh, ḍh, dh and bh are voiced. The independent consonant h behaves differently.",
          "hi": "Ph is unvoiced, even though it is aspirated. Final t stays t. Tat phalam means ‘that fruit’. A following h inside the Roman symbol ph does not make ph two consonants or turn it into voiced h. Aspirated kh, ch, ṭh, th and ph are unvoiced stops. Gh, jh, ḍh, dh and bh are voiced. The independent consonant h behaves differently."
        },
        "example": {
          "sa": "तत् + फलम् → तत्फलम्",
          "iast": "tat + phalam → tatphalam",
          "gloss": {
            "en": "t + ph → t + ph",
            "hi": "t + ph → t + ph"
          },
          "alt": {
            "en": "An unvoiced neighbour keeps it unvoiced.. Ph is unvoiced, even though it is aspirated. Final t stays t. Tat phalam means ‘that fruit’. A following h inside the Roman symbol ph does not make ph two consonants or turn it into voiced h.",
            "hi": "An unvoiced neighbour keeps it unvoiced.. Ph is unvoiced, even though it is aspirated. Final t stays t. Tat phalam means ‘that fruit’. A following h inside the Roman symbol ph does not make ph two consonants or turn it into voiced h."
          }
        },
        "assetIds": [
          "sandhi-stops-4"
        ]
      },
      {
        "id": "sandhi-source-stops-05",
        "kind": "teach",
        "title": {
          "en": "Before a nasal, a nasal result is possible.",
          "hi": "Before a nasal, a nasal result is possible."
        },
        "body": {
          "en": "Na means ‘not’. A common joined form is tanna: the dental t becomes dental n before the nasal. Other final stops can similarly become their own class’s nasal. This nasal assimilation is an allowed alternative to simple voicing. The voiced alternative tad na is also permitted in grammatical descriptions. Class nasals are ṅ for k, ṇ for ṭ, n for t and m for p. Mark optionality rather than treating one spelling as the only correct output.",
          "hi": "Na means ‘not’. A common joined form is tanna: the dental t becomes dental n before the nasal. Other final stops can similarly become their own class’s nasal. This nasal assimilation is an allowed alternative to simple voicing. The voiced alternative tad na is also permitted in grammatical descriptions. Class nasals are ṅ for k, ṇ for ṭ, n for t and m for p. Mark optionality rather than treating one spelling as the only correct output."
        },
        "example": {
          "sa": "तत् + न → तन्न",
          "iast": "tat + na → tanna",
          "gloss": {
            "en": "t + n → n + n",
            "hi": "t + n → n + n"
          },
          "alt": {
            "en": "Before a nasal, a nasal result is possible.. Na means ‘not’. A common joined form is tanna: the dental t becomes dental n before the nasal. Other final stops can similarly become their own class’s nasal. This nasal assimilation is an allowed alternative to simple voicing.",
            "hi": "Before a nasal, a nasal result is possible.. Na means ‘not’. A common joined form is tanna: the dental t becomes dental n before the nasal. Other final stops can similarly become their own class’s nasal. This nasal assimilation is an allowed alternative to simple voicing."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-stops-06",
        "kind": "teach",
        "title": {
          "en": "Before c or j, t changes its place.",
          "hi": "Before c or j, t changes its place."
        },
        "body": {
          "en": "Citram means ‘picture’; jalam means ‘water’. Before these palatal stops, final t becomes a palatal stop too. It remains unvoiced before c and becomes voiced before j. The double consonants represent two consonantal positions. The same place pattern applies before ch and jh. Compare voiced and unvoiced rows; teach the shared cause instead of presenting four unrelated answers.",
          "hi": "Citram means ‘picture’; jalam means ‘water’. Before these palatal stops, final t becomes a palatal stop too. It remains unvoiced before c and becomes voiced before j. The double consonants represent two consonantal positions. The same place pattern applies before ch and jh. Compare voiced and unvoiced rows; teach the shared cause instead of presenting four unrelated answers."
        },
        "example": {
          "sa": "तत् + चित्रम् · तत् + जलम् → तच्चित्रम् · तज्जलम्",
          "iast": "tat citram → taccitram · tat jalam → tajjalam",
          "gloss": {
            "en": "t+c→cc · t+j→jj",
            "hi": "t+c→cc · t+j→jj"
          },
          "alt": {
            "en": "Before c or j, t changes its place.. Citram means ‘picture’; jalam means ‘water’. Before these palatal stops, final t becomes a palatal stop too. It remains unvoiced before c and becomes voiced before j. The double consonants represent two consonantal positions.",
            "hi": "Before c or j, t changes its place.. Citram means ‘picture’; jalam means ‘water’. Before these palatal stops, final t becomes a palatal stop too. It remains unvoiced before c and becomes voiced before j. The double consonants represent two consonantal positions."
          }
        },
        "assetIds": [
          "sandhi-stops-6"
        ]
      },
      {
        "id": "sandhi-source-stops-07",
        "kind": "teach",
        "title": {
          "en": "Retroflex stops have their own row.",
          "hi": "Retroflex stops have their own row."
        },
        "body": {
          "en": "Before a retroflex stop, final dental t changes to the retroflex place. Voicing follows the neighbour: ṭ before ṭ, ḍ before ḍ. These sound demonstrations extend the same place-and-voice reasoning to the retroflex row. This is an abstract boundary demonstration, not a sentence. Before ṭh and ḍh the corresponding first result is ṭ and ḍ. Do not apply this row to every consonant pronounced nearby, such as ṣ.",
          "hi": "Before a retroflex stop, final dental t changes to the retroflex place. Voicing follows the neighbour: ṭ before ṭ, ḍ before ḍ. These sound demonstrations extend the same place-and-voice reasoning to the retroflex row. This is an abstract boundary demonstration, not a sentence. Before ṭh and ḍh the corresponding first result is ṭ and ḍ. Do not apply this row to every consonant pronounced nearby, such as ṣ."
        },
        "example": {
          "sa": "त् + ट् · त् + ड् → ट्ट् · ड्ड्",
          "iast": "t + ṭ → ṭṭ · t + ḍ → ḍḍ",
          "gloss": {
            "en": "Dental → retroflex",
            "hi": "Dental → retroflex"
          },
          "alt": {
            "en": "Retroflex stops have their own row.. Before a retroflex stop, final dental t changes to the retroflex place. Voicing follows the neighbour: ṭ before ṭ, ḍ before ḍ. These sound demonstrations extend the same place-and-voice reasoning to the retroflex row.",
            "hi": "Retroflex stops have their own row.. Before a retroflex stop, final dental t changes to the retroflex place. Voicing follows the neighbour: ṭ before ṭ, ḍ before ḍ. These sound demonstrations extend the same place-and-voice reasoning to the retroflex row."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-stops-08",
        "kind": "teach",
        "title": {
          "en": "Before l, t can become l.",
          "hi": "Before l, t can become l."
        },
        "body": {
          "en": "Labhasva means ‘obtain’. Final t assimilates to the following l, producing two l sounds: tallabhasva, ‘obtain that’. Keep this row distinct from merely voicing t to d. The written double ll is a genuine cluster across the old boundary. It is not the same as a single long vowel or an extra syllable.",
          "hi": "Labhasva means ‘obtain’. Final t assimilates to the following l, producing two l sounds: tallabhasva, ‘obtain that’. Keep this row distinct from merely voicing t to d. The written double ll is a genuine cluster across the old boundary. It is not the same as a single long vowel or an extra syllable."
        },
        "example": {
          "sa": "तत् + लभस्व → तल्लभस्व",
          "iast": "tat + labhasva → tallabhasva",
          "gloss": {
            "en": "t + l → ll",
            "hi": "t + l → ll"
          },
          "alt": {
            "en": "Before l, t can become l.. Labhasva means ‘obtain’. Final t assimilates to the following l, producing two l sounds: tallabhasva, ‘obtain that’. Keep this row distinct from merely voicing t to d.",
            "hi": "Before l, t can become l.. Labhasva means ‘obtain’. Final t assimilates to the following l, producing two l sounds: tallabhasva, ‘obtain that’. Keep this row distinct from merely voicing t to d."
          }
        },
        "assetIds": [
          "sandhi-stops-8"
        ]
      },
      {
        "id": "sandhi-source-stops-09",
        "kind": "teach",
        "title": {
          "en": "The next word can change too.",
          "hi": "The next word can change too."
        },
        "body": {
          "en": "Hi is an emphatic particle. One common joined form is taddhi: final t voices to d, and h becomes the matching aspirated dh. Sandhi may alter both sides of a boundary, rather than only the last letter of the first word. Retention of h with a voiced first stop is also allowed: tad hi. Parallel common forms are k+h→g+gh, ṭ+h→ḍ+ḍh and p+h→b+bh. A human pronunciation recording would make the aspiration contrast easier to hear.",
          "hi": "Hi is an emphatic particle. One common joined form is taddhi: final t voices to d, and h becomes the matching aspirated dh. Sandhi may alter both sides of a boundary, rather than only the last letter of the first word. Retention of h with a voiced first stop is also allowed: tad hi. Parallel common forms are k+h→g+gh, ṭ+h→ḍ+ḍh and p+h→b+bh. A human pronunciation recording would make the aspiration contrast easier to hear."
        },
        "example": {
          "sa": "तत् + हि → तद्धि",
          "iast": "tat + hi → taddhi",
          "gloss": {
            "en": "t+h→d+dh, a common option",
            "hi": "t+h→d+dh, a common option"
          },
          "alt": {
            "en": "The next word can change too.. Hi is an emphatic particle. One common joined form is taddhi: final t voices to d, and h becomes the matching aspirated dh. Sandhi may alter both sides of a boundary, rather than only the last letter of the first word.",
            "hi": "The next word can change too.. Hi is an emphatic particle. One common joined form is taddhi: final t voices to d, and h becomes the matching aspirated dh. Sandhi may alter both sides of a boundary, rather than only the last letter of the first word."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-stops-10",
        "kind": "teach",
        "title": {
          "en": "Before ś, recognise cch.",
          "hi": "Before ś, recognise cch."
        },
        "body": {
          "en": "Śivam here means ‘auspicious’. A common result is tacchivam: t becomes c and the following ś becomes ch. Read c + ch as a cluster. This is different from the single aspirated consonant ch you met earlier. The ś→ch substitution has grammatical conditions and variants, especially when ś itself begins a cluster. The retained-ś form is encountered too; do not extrapolate this simple example to all ś sequences.",
          "hi": "Śivam here means ‘auspicious’. A common result is tacchivam: t becomes c and the following ś becomes ch. Read c + ch as a cluster. This is different from the single aspirated consonant ch you met earlier. The ś→ch substitution has grammatical conditions and variants, especially when ś itself begins a cluster. The retained-ś form is encountered too; do not extrapolate this simple example to all ś sequences."
        },
        "example": {
          "sa": "तत् + शिवम् → तच्छिवम्",
          "iast": "tat + śivam → tacchivam",
          "gloss": {
            "en": "t + ś → cch, commonly",
            "hi": "t + ś → cch, commonly"
          },
          "alt": {
            "en": "Before ś, recognise cch.. Śivam here means ‘auspicious’. A common result is tacchivam: t becomes c and the following ś becomes ch. Read c + ch as a cluster. This is different from the single aspirated consonant ch you met earlier.",
            "hi": "Before ś, recognise cch.. Śivam here means ‘auspicious’. A common result is tacchivam: t becomes c and the following ś becomes ch. Read c + ch as a cluster. This is different from the single aspirated consonant ch you met earlier."
          }
        },
        "assetIds": []
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Sandhi manuscript · Whitney §§139–163, 196–203. Source reading; no assessed mastery.",
      "hi": "Existing English Sandhi manuscript · Whitney §§139–163, 196–203. Source reading; no assessed mastery."
    }
  },
  {
    "id": "sandhi-source-nasals",
    "rank": 8,
    "unit": {
      "en": "Sandhi: full source readings",
      "hi": "Sandhi: full source readings"
    },
    "title": {
      "en": "Nasals and small inserted sounds",
      "hi": "Nasals and small inserted sounds"
    },
    "titleSa": "सन्धिः",
    "titleIast": "sandhiḥ",
    "outcome": {
      "en": "Distinguish m, n, anusvāra and nasal consonant variants.",
      "hi": "Distinguish m, n, anusvāra and nasal consonant variants."
    },
    "minutes": 10,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://en.wikisource.org/wiki/Sanskrit_Grammar_(Whitney)/Chapter_III"
    ],
    "cards": [
      {
        "id": "sandhi-source-nasals-01",
        "kind": "teach",
        "title": {
          "en": "Final m becomes anusvāra before a consonant.",
          "hi": "Final m becomes anusvāra before a consonant."
        },
        "body": {
          "en": "Vanam means ‘to the forest’ here; gacchati means ‘goes’. Final m is written as anusvāra before g: vanaṃ gacchati. This explains a very frequent dot in connected Sanskrit. It is not an ordinary vowel mark. Anusvāra pronunciation depends on the following sound and the reading tradition. A visual dot is not a universal instruction to pronounce an isolated m in every environment.",
          "hi": "Vanam means ‘to the forest’ here; gacchati means ‘goes’. Final m is written as anusvāra before g: vanaṃ gacchati. This explains a very frequent dot in connected Sanskrit. It is not an ordinary vowel mark. Anusvāra pronunciation depends on the following sound and the reading tradition. A visual dot is not a universal instruction to pronounce an isolated m in every environment."
        },
        "example": {
          "sa": "वनम् + गच्छति → वनं गच्छति",
          "iast": "vanam + gacchati → vanaṃ gacchati",
          "gloss": {
            "en": "m + consonant → ṃ",
            "hi": "m + consonant → ṃ"
          },
          "alt": {
            "en": "Final m becomes anusvāra before a consonant.. Vanam means ‘to the forest’ here; gacchati means ‘goes’. Final m is written as anusvāra before g: vanaṃ gacchati. This explains a very frequent dot in connected Sanskrit. It is not an ordinary vowel mark.",
            "hi": "Final m becomes anusvāra before a consonant.. Vanam means ‘to the forest’ here; gacchati means ‘goes’. Final m is written as anusvāra before g: vanaṃ gacchati. This explains a very frequent dot in connected Sanskrit. It is not an ordinary vowel mark."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-nasals-02",
        "kind": "teach",
        "title": {
          "en": "Before a vowel, m remains m.",
          "hi": "Before a vowel, m remains m."
        },
        "body": {
          "en": "Phalam means ‘fruit’. Before the vowel a in asti, final m stays m: phalamasti, ‘there is a fruit’. Contrast this with m before a consonant. At a pause, the ordinary final m is retained too. The m may be written attached to the next vowel in continuous Devanagari. Its changed appearance as म does not mean it acquired a new vowel of its own.",
          "hi": "Phalam means ‘fruit’. Before the vowel a in asti, final m stays m: phalamasti, ‘there is a fruit’. Contrast this with m before a consonant. At a pause, the ordinary final m is retained too. The m may be written attached to the next vowel in continuous Devanagari. Its changed appearance as म does not mean it acquired a new vowel of its own."
        },
        "example": {
          "sa": "फलम् + अस्ति → फलमस्ति",
          "iast": "phalam + asti → phalamasti",
          "gloss": {
            "en": "m + vowel → m + vowel",
            "hi": "m + vowel → m + vowel"
          },
          "alt": {
            "en": "Before a vowel, m remains m.. Phalam means ‘fruit’. Before the vowel a in asti, final m stays m: phalamasti, ‘there is a fruit’. Contrast this with m before a consonant. At a pause, the ordinary final m is retained too.",
            "hi": "Before a vowel, m remains m.. Phalam means ‘fruit’. Before the vowel a in asti, final m stays m: phalamasti, ‘there is a fruit’. Contrast this with m before a consonant. At a pause, the ordinary final m is retained too."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-nasals-03",
        "kind": "teach",
        "title": {
          "en": "A dot can correspond to a class nasal.",
          "hi": "A dot can correspond to a class nasal."
        },
        "body": {
          "en": "Khādāmi means ‘I eat’. Before kh, the nasal may be represented by anusvāra or by the matching velar nasal ṅ. These are permitted connected forms. The specific nasal has the same mouth position as the following stop. The five stop-class nasals are ṅ, ñ, ṇ, n and m. Modern editions often prefer anusvāra notation. Semivowel and h contexts have further phonetic conventions; do not assume every dot has the same realisation.",
          "hi": "Khādāmi means ‘I eat’. Before kh, the nasal may be represented by anusvāra or by the matching velar nasal ṅ. These are permitted connected forms. The specific nasal has the same mouth position as the following stop. The five stop-class nasals are ṅ, ñ, ṇ, n and m. Modern editions often prefer anusvāra notation. Semivowel and h contexts have further phonetic conventions; do not assume every dot has the same realisation."
        },
        "example": {
          "sa": "फलम् + खादामि → फलं खादामि / फलङ्खादामि",
          "iast": "phalaṃ khādāmi / phalaṅ khādāmi",
          "gloss": {
            "en": "Before kh · velar nasal option",
            "hi": "Before kh · velar nasal option"
          },
          "alt": {
            "en": "A dot can correspond to a class nasal.. Khādāmi means ‘I eat’. Before kh, the nasal may be represented by anusvāra or by the matching velar nasal ṅ. These are permitted connected forms. The specific nasal has the same mouth position as the following stop.",
            "hi": "A dot can correspond to a class nasal.. Khādāmi means ‘I eat’. Before kh, the nasal may be represented by anusvāra or by the matching velar nasal ṅ. These are permitted connected forms. The specific nasal has the same mouth position as the following stop."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-nasals-04",
        "kind": "teach",
        "title": {
          "en": "Final n matches a following voiced palatal.",
          "hi": "Final n matches a following voiced palatal."
        },
        "body": {
          "en": "Tān means ‘them’; jayati means ‘conquers’. The dental n becomes palatal ñ before j. Before voiced retroflex ḍ or ḍh, the matching nasal is ṇ. Class and voicing help you recognise the result. Do not apply this nasal-place rule to k or g at an ordinary word boundary: final n is not automatically replaced before every stop. The retroflex combinations are rare in real vocabulary.",
          "hi": "Tān means ‘them’; jayati means ‘conquers’. The dental n becomes palatal ñ before j. Before voiced retroflex ḍ or ḍh, the matching nasal is ṇ. Class and voicing help you recognise the result. Do not apply this nasal-place rule to k or g at an ordinary word boundary: final n is not automatically replaced before every stop. The retroflex combinations are rare in real vocabulary."
        },
        "example": {
          "sa": "तान् + जयति → ताञ्जयति",
          "iast": "tān + jayati → tāñjayati",
          "gloss": {
            "en": "n + j → ñj",
            "hi": "n + j → ñj"
          },
          "alt": {
            "en": "Final n matches a following voiced palatal.. Tān means ‘them’; jayati means ‘conquers’. The dental n becomes palatal ñ before j. Before voiced retroflex ḍ or ḍh, the matching nasal is ṇ. Class and voicing help you recognise the result.",
            "hi": "Final n matches a following voiced palatal.. Tān means ‘them’; jayati means ‘conquers’. The dental n becomes palatal ñ before j. Before voiced retroflex ḍ or ḍh, the matching nasal is ṇ. Class and voicing help you recognise the result."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-nasals-05",
        "kind": "teach",
        "title": {
          "en": "Before an unvoiced stop, a sibilant appears.",
          "hi": "Before an unvoiced stop, a sibilant appears."
        },
        "body": {
          "en": "Ca means ‘and’. The n ending before c gives anusvāra plus ś: tāṃśca, ‘and them’. This is more than nasal place matching. Remember the inserted sibilant so that you can recover the original n ending when reading. Historically many final n forms continue older ns. The Classical pattern extends beyond those historical originals. It is useful to recognise the mechanism without requiring historical linguistics before reading.",
          "hi": "Ca means ‘and’. The n ending before c gives anusvāra plus ś: tāṃśca, ‘and them’. This is more than nasal place matching. Remember the inserted sibilant so that you can recover the original n ending when reading. Historically many final n forms continue older ns. The Classical pattern extends beyond those historical originals. It is useful to recognise the mechanism without requiring historical linguistics before reading."
        },
        "example": {
          "sa": "तान् + च → तांश्च",
          "iast": "tān + ca → tāṃśca",
          "gloss": {
            "en": "n + c/ch → ṃś + c/ch",
            "hi": "n + c/ch → ṃś + c/ch"
          },
          "alt": {
            "en": "Before an unvoiced stop, a sibilant appears.. Ca means ‘and’. The n ending before c gives anusvāra plus ś: tāṃśca, ‘and them’. This is more than nasal place matching. Remember the inserted sibilant so that you can recover the original n ending when reading.",
            "hi": "Before an unvoiced stop, a sibilant appears.. Ca means ‘and’. The n ending before c gives anusvāra plus ś: tāṃśca, ‘and them’. This is more than nasal place matching. Remember the inserted sibilant so that you can recover the original n ending when reading."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-nasals-06",
        "kind": "teach",
        "title": {
          "en": "The dental and retroflex rows parallel it.",
          "hi": "The dental and retroflex rows parallel it."
        },
        "body": {
          "en": "Tarati means ‘crosses’. Before t, final n gives anusvāra plus dental s. Before retroflex ṭ, the added sibilant is ṣ. Learn the three unvoiced rows together: c gets ś, ṭ gets ṣ, and t gets s. The ṭ row is shown as an abstract sound combination because common vocabulary examples are sparse. Aspirated ch, ṭh and th follow their respective rows too.",
          "hi": "Tarati means ‘crosses’. Before t, final n gives anusvāra plus dental s. Before retroflex ṭ, the added sibilant is ṣ. Learn the three unvoiced rows together: c gets ś, ṭ gets ṣ, and t gets s. The ṭ row is shown as an abstract sound combination because common vocabulary examples are sparse. Aspirated ch, ṭh and th follow their respective rows too."
        },
        "example": {
          "sa": "तान् + तरति · न् + ट् → तांस्तरति · ंष्ट्",
          "iast": "tān tarati → tāṃstarati · n+ṭ→ṃṣṭ",
          "gloss": {
            "en": "n+t/th→ṃs · n+ṭ/ṭh→ṃṣ",
            "hi": "n+t/th→ṃs · n+ṭ/ṭh→ṃṣ"
          },
          "alt": {
            "en": "The dental and retroflex rows parallel it.. Tarati means ‘crosses’. Before t, final n gives anusvāra plus dental s. Before retroflex ṭ, the added sibilant is ṣ. Learn the three unvoiced rows together: c gets ś, ṭ gets ṣ, and t gets s.",
            "hi": "The dental and retroflex rows parallel it.. Tarati means ‘crosses’. Before t, final n gives anusvāra plus dental s. Before retroflex ṭ, the added sibilant is ṣ. Learn the three unvoiced rows together: c gets ś, ṭ gets ṣ, and t gets s."
          }
        },
        "assetIds": [
          "sandhi-nasals-6"
        ]
      },
      {
        "id": "sandhi-source-nasals-07",
        "kind": "teach",
        "title": {
          "en": "n before l produces a nasal l.",
          "hi": "n before l produces a nasal l."
        },
        "body": {
          "en": "Labhate means ‘obtains’. Before l, final n may be written as a nasalised l followed by l. The small nasal sign matters: this is not simply the plain ll from tat + labhasva. Editions differ in writing nasal l: anusvāra, chandrabindu and explicit nasalised-consonant spellings occur. Preserve the edition’s notation and teach its pronunciation rather than marking every alternative wrong.",
          "hi": "Labhate means ‘obtains’. Before l, final n may be written as a nasalised l followed by l. The small nasal sign matters: this is not simply the plain ll from tat + labhasva. Editions differ in writing nasal l: anusvāra, chandrabindu and explicit nasalised-consonant spellings occur. Preserve the edition’s notation and teach its pronunciation rather than marking every alternative wrong."
        },
        "example": {
          "sa": "तान् + लभते → ताँल्लभते",
          "iast": "tān + labhate → tāl̐ labhate",
          "gloss": {
            "en": "n + l → nasal l + l",
            "hi": "n + l → nasal l + l"
          },
          "alt": {
            "en": "n before l produces a nasal l.. Labhate means ‘obtains’. Before l, final n may be written as a nasalised l followed by l. The small nasal sign matters: this is not simply the plain ll from tat + labhasva.",
            "hi": "n before l produces a nasal l.. Labhate means ‘obtains’. Before l, final n may be written as a nasalised l followed by l. The small nasal sign matters: this is not simply the plain ll from tat + labhasva."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-nasals-08",
        "kind": "teach",
        "title": {
          "en": "Before ś, ñ and ch may appear.",
          "hi": "Before ś, ñ and ch may appear."
        },
        "body": {
          "en": "Śocati means ‘mourns’. One form retains ś after ñ; another changes ś to ch. Both reveal an original n ending. A reader needs to recognise the permitted alternatives instead of memorising one joined spelling as the only possible form. The change of ś has conditions when another consonant follows it. Before s or ṣ, n normally remains n; optional transitional t is recorded, as in mahān san / mahānt san. These are separate rows, not the n+c rule.",
          "hi": "Śocati means ‘mourns’. One form retains ś after ñ; another changes ś to ch. Both reveal an original n ending. A reader needs to recognise the permitted alternatives instead of memorising one joined spelling as the only possible form. The change of ś has conditions when another consonant follows it. Before s or ṣ, n normally remains n; optional transitional t is recorded, as in mahān san / mahānt san. These are separate rows, not the n+c rule."
        },
        "example": {
          "sa": "तान् + शोचति → ताञ्शोचति / ताञ्छोचति",
          "iast": "tāñ śocati / tāñ chocati",
          "gloss": {
            "en": "n + ś → ñś or ñch",
            "hi": "n + ś → ñś or ñch"
          },
          "alt": {
            "en": "Before ś, ñ and ch may appear.. Śocati means ‘mourns’. One form retains ś after ñ; another changes ś to ch. Both reveal an original n ending. A reader needs to recognise the permitted alternatives instead of memorising one joined spelling as the only possible form.",
            "hi": "Before ś, ñ and ch may appear.. Śocati means ‘mourns’. One form retains ś after ñ; another changes ś to ch. Both reveal an original n ending. A reader needs to recognise the permitted alternatives instead of memorising one joined spelling as the only possible form."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-nasals-09",
        "kind": "teach",
        "title": {
          "en": "A short vowel before n can cause doubling.",
          "hi": "A short vowel before n can cause doubling."
        },
        "body": {
          "en": "Gacchan means ‘going’. Its final n follows short a and meets the next vowel, so it doubles: gacchannasti, ‘[he] is going’. Both conditions matter: the preceding vowel is short and the next sound is a vowel. Final ṅ has a parallel doubling rule after a short vowel before a vowel. Final n after a long vowel does not double by this rule: tān + api → tānapi. Some grammatical accounts include rare ṇ contexts.",
          "hi": "Gacchan means ‘going’. Its final n follows short a and meets the next vowel, so it doubles: gacchannasti, ‘[he] is going’. Both conditions matter: the preceding vowel is short and the next sound is a vowel. Final ṅ has a parallel doubling rule after a short vowel before a vowel. Final n after a long vowel does not double by this rule: tān + api → tānapi. Some grammatical accounts include rare ṇ contexts."
        },
        "example": {
          "sa": "गच्छन् + अस्ति → गच्छन्नस्ति",
          "iast": "gacchan + asti → gacchannasti",
          "gloss": {
            "en": "Short vowel + final n + vowel → nn",
            "hi": "Short vowel + final n + vowel → nn"
          },
          "alt": {
            "en": "A short vowel before n can cause doubling.. Gacchan means ‘going’. Its final n follows short a and meets the next vowel, so it doubles: gacchannasti, ‘[he] is going’. Both conditions matter: the preceding vowel is short and the next sound is a vowel.",
            "hi": "A short vowel before n can cause doubling.. Gacchan means ‘going’. Its final n follows short a and meets the next vowel, so it doubles: gacchannasti, ‘[he] is going’. Both conditions matter: the preceding vowel is short and the next sound is a vowel."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-nasals-10",
        "kind": "teach",
        "title": {
          "en": "ch after a short vowel gains c.",
          "hi": "ch after a short vowel gains c."
        },
        "body": {
          "en": "Atra means ‘here’; chāyā means ‘shade’. Short a before ch causes an added c: atracchāyā, ‘there is shade here’. This explains another double-looking cluster. The original ch remains one aspirated consonant, preceded by an extra c. After most long vowels this insertion is optional; after the specified particles ā and mā it is prescribed. The full tug-āgama conditions belong in reference. Do not derive every cch solely from this one environment.",
          "hi": "Atra means ‘here’; chāyā means ‘shade’. Short a before ch causes an added c: atracchāyā, ‘there is shade here’. This explains another double-looking cluster. The original ch remains one aspirated consonant, preceded by an extra c. After most long vowels this insertion is optional; after the specified particles ā and mā it is prescribed. The full tug-āgama conditions belong in reference. Do not derive every cch solely from this one environment."
        },
        "example": {
          "sa": "अत्र + छाया → अत्रच्छाया",
          "iast": "atra + chāyā → atracchāyā",
          "gloss": {
            "en": "Short vowel + ch → cch",
            "hi": "Short vowel + ch → cch"
          },
          "alt": {
            "en": "ch after a short vowel gains c.. Atra means ‘here’; chāyā means ‘shade’. Short a before ch causes an added c: atracchāyā, ‘there is shade here’. This explains another double-looking cluster. The original ch remains one aspirated consonant, preceded by an extra c.",
            "hi": "ch after a short vowel gains c.. Atra means ‘here’; chāyā means ‘shade’. Short a before ch causes an added c: atracchāyā, ‘there is shade here’. This explains another double-looking cluster. The original ch remains one aspirated consonant, preceded by an extra c."
          }
        },
        "assetIds": [
          "sandhi-nasals-10"
        ]
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Sandhi manuscript · Whitney §§204–213, 227. Source reading; no assessed mastery.",
      "hi": "Existing English Sandhi manuscript · Whitney §§204–213, 227. Source reading; no assessed mastery."
    }
  },
  {
    "id": "sandhi-source-a-visarga",
    "rank": 9,
    "unit": {
      "en": "Sandhi: full source readings",
      "hi": "Sandhi: full source readings"
    },
    "title": {
      "en": "The common aḥ and āḥ endings",
      "hi": "The common aḥ and āḥ endings"
    },
    "titleSa": "सन्धिः",
    "titleIast": "sandhiḥ",
    "outcome": {
      "en": "Distinguish four common visarga environments and keep resulting hiatus.",
      "hi": "Distinguish four common visarga environments and keep resulting hiatus."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://en.wikisource.org/wiki/Sanskrit_Grammar_(Whitney)/Chapter_III"
    ],
    "cards": [
      {
        "id": "sandhi-source-a-visarga-01",
        "kind": "teach",
        "title": {
          "en": "The preceding vowel changes the rule.",
          "hi": "The preceding vowel changes the rule."
        },
        "body": {
          "en": "Rāmaḥ is a singular form; rāmāḥ is plural. Before voiced sounds, these two endings behave differently. Read the vowel before visarga carefully. A table that says only ‘ḥ changes’ hides the information needed to choose the result. These ordinary nominal endings continue -as and -ās. Underlying r-final words need different treatment even when their pause spelling also contains visarga.",
          "hi": "Rāmaḥ is a singular form; rāmāḥ is plural. Before voiced sounds, these two endings behave differently. Read the vowel before visarga carefully. A table that says only ‘ḥ changes’ hides the information needed to choose the result. These ordinary nominal endings continue -as and -ās. Underlying r-final words need different treatment even when their pause spelling also contains visarga."
        },
        "example": {
          "sa": "रामः · रामाः → aḥ · āḥ",
          "iast": "rāmaḥ · rāmāḥ",
          "gloss": {
            "en": "Short aḥ ≠ long āḥ",
            "hi": "Short aḥ ≠ long āḥ"
          },
          "alt": {
            "en": "The preceding vowel changes the rule.. Rāmaḥ is a singular form; rāmāḥ is plural. Before voiced sounds, these two endings behave differently. Read the vowel before visarga carefully. A table that says only ‘ḥ changes’ hides the information needed to choose the result.",
            "hi": "The preceding vowel changes the rule.. Rāmaḥ is a singular form; rāmāḥ is plural. Before voiced sounds, these two endings behave differently. Read the vowel before visarga carefully. A table that says only ‘ḥ changes’ hides the information needed to choose the result."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-a-visarga-02",
        "kind": "teach",
        "title": {
          "en": "aḥ becomes o before a voiced consonant.",
          "hi": "aḥ becomes o before a voiced consonant."
        },
        "body": {
          "en": "Rama goes: rāmo gacchati. The ordinary aḥ ending becomes o before voiced g. Other voiced consonants have the same basic outcome. The next word remains intact; only the first word’s ending changes here. Voiced sounds include voiced stops, nasals, semivowels and h. Specific pronouns saḥ and eṣaḥ are exceptions introduced later.",
          "hi": "Rama goes: rāmo gacchati. The ordinary aḥ ending becomes o before voiced g. Other voiced consonants have the same basic outcome. The next word remains intact; only the first word’s ending changes here. Voiced sounds include voiced stops, nasals, semivowels and h. Specific pronouns saḥ and eṣaḥ are exceptions introduced later."
        },
        "example": {
          "sa": "रामः + गच्छति → रामो गच्छति",
          "iast": "rāmaḥ + gacchati → rāmo gacchati",
          "gloss": {
            "en": "aḥ + g → o + g",
            "hi": "aḥ + g → o + g"
          },
          "alt": {
            "en": "aḥ becomes o before a voiced consonant.. Rama goes: rāmo gacchati. The ordinary aḥ ending becomes o before voiced g. Other voiced consonants have the same basic outcome. The next word remains intact; only the first word’s ending changes here.",
            "hi": "aḥ becomes o before a voiced consonant.. Rama goes: rāmo gacchati. The ordinary aḥ ending becomes o before voiced g. Other voiced consonants have the same basic outcome. The next word remains intact; only the first word’s ending changes here."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-a-visarga-03",
        "kind": "teach",
        "title": {
          "en": "Before short a, keep o and omit a.",
          "hi": "Before short a, keep o and omit a."
        },
        "body": {
          "en": "Now the opening example makes sense. Ordinary aḥ before short a gives o, and the following a is elided. Avagraha marks that lost a: rāmo’sti, ‘Rama is here / exists’. It adds no syllable and is not a pause sign. The same visible o’ also occurs after lexical e/o plus short a. To reverse it, use the word form and context, rather than assuming every apostrophe proves aḥ.",
          "hi": "Now the opening example makes sense. Ordinary aḥ before short a gives o, and the following a is elided. Avagraha marks that lost a: rāmo’sti, ‘Rama is here / exists’. It adds no syllable and is not a pause sign. The same visible o’ also occurs after lexical e/o plus short a. To reverse it, use the word form and context, rather than assuming every apostrophe proves aḥ."
        },
        "example": {
          "sa": "रामः + अस्ति → रामोऽस्ति",
          "iast": "rāmaḥ + asti → rāmo’sti",
          "gloss": {
            "en": "aḥ + short a → o’",
            "hi": "aḥ + short a → o’"
          },
          "alt": {
            "en": "Before short a, keep o and omit a.. Now the opening example makes sense. Ordinary aḥ before short a gives o, and the following a is elided. Avagraha marks that lost a: rāmo’sti, ‘Rama is here / exists’. It adds no syllable and is not a pause sign.",
            "hi": "Before short a, keep o and omit a.. Now the opening example makes sense. Ordinary aḥ before short a gives o, and the following a is elided. Avagraha marks that lost a: rāmo’sti, ‘Rama is here / exists’. It adds no syllable and is not a pause sign."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-a-visarga-04",
        "kind": "teach",
        "title": {
          "en": "Before i, the visarga disappears.",
          "hi": "Before i, the visarga disappears."
        },
        "body": {
          "en": "Iha means ‘here’. The aḥ ending becomes a before i, while i remains. Read rāma iha, with two boundary vowels. Do not change it into rāmeha by applying a + i sandhi again. The hiatus created by visarga loss is retained in ordinary Classical usage. The rule covers following vowels other than short a, including long ā.",
          "hi": "Iha means ‘here’. The aḥ ending becomes a before i, while i remains. Read rāma iha, with two boundary vowels. Do not change it into rāmeha by applying a + i sandhi again. The hiatus created by visarga loss is retained in ordinary Classical usage. The rule covers following vowels other than short a, including long ā."
        },
        "example": {
          "sa": "रामः + इह → राम इह",
          "iast": "rāmaḥ + iha → rāma iha",
          "gloss": {
            "en": "aḥ + non-a vowel → a | vowel",
            "hi": "aḥ + non-a vowel → a | vowel"
          },
          "alt": {
            "en": "Before i, the visarga disappears.. Iha means ‘here’. The aḥ ending becomes a before i, while i remains. Read rāma iha, with two boundary vowels. Do not change it into rāmeha by applying a + i sandhi again.",
            "hi": "Before i, the visarga disappears.. Iha means ‘here’. The aḥ ending becomes a before i, while i remains. Read rāma iha, with two boundary vowels. Do not change it into rāmeha by applying a + i sandhi again."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-a-visarga-05",
        "kind": "teach",
        "title": {
          "en": "Long ā stays separate too.",
          "hi": "Long ā stays separate too."
        },
        "body": {
          "en": "Āgacchati means ‘comes’. Because its initial vowel is long ā, the short-a elision pattern does not apply. The visarga disappears and the two vowels remain: rāma āgacchati. The length mark is essential to choosing the rule. This resulting a + ā must not be merged again by savarṇa-dīrgha. Similar-looking adjacent vowels can arise from different grammatical histories.",
          "hi": "Āgacchati means ‘comes’. Because its initial vowel is long ā, the short-a elision pattern does not apply. The visarga disappears and the two vowels remain: rāma āgacchati. The length mark is essential to choosing the rule. This resulting a + ā must not be merged again by savarṇa-dīrgha. Similar-looking adjacent vowels can arise from different grammatical histories."
        },
        "example": {
          "sa": "रामः + आगच्छति → राम आगच्छति",
          "iast": "rāmaḥ + āgacchati → rāma āgacchati",
          "gloss": {
            "en": "aḥ + ā → a | ā",
            "hi": "aḥ + ā → a | ā"
          },
          "alt": {
            "en": "Long ā stays separate too.. Āgacchati means ‘comes’. Because its initial vowel is long ā, the short-a elision pattern does not apply. The visarga disappears and the two vowels remain: rāma āgacchati. The length mark is essential to choosing the rule.",
            "hi": "Long ā stays separate too.. Āgacchati means ‘comes’. Because its initial vowel is long ā, the short-a elision pattern does not apply. The visarga disappears and the two vowels remain: rāma āgacchati. The length mark is essential to choosing the rule."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-a-visarga-06",
        "kind": "teach",
        "title": {
          "en": "āḥ loses visarga before a voiced consonant.",
          "hi": "āḥ loses visarga before a voiced consonant."
        },
        "body": {
          "en": "The Ramas go: rāmā gacchanti. Long ā remains and visarga disappears. It does not become o. Compare the singular rāmo gacchati with this plural form; the grammatical ending and verb number support your reading. The name is used here as a countable plural to contrast endings. Ordinary nouns such as narāḥ ‘men’ show the same -ās-origin pattern.",
          "hi": "The Ramas go: rāmā gacchanti. Long ā remains and visarga disappears. It does not become o. Compare the singular rāmo gacchati with this plural form; the grammatical ending and verb number support your reading. The name is used here as a countable plural to contrast endings. Ordinary nouns such as narāḥ ‘men’ show the same -ās-origin pattern."
        },
        "example": {
          "sa": "रामाः + गच्छन्ति → रामा गच्छन्ति",
          "iast": "rāmāḥ + gacchanti → rāmā gacchanti",
          "gloss": {
            "en": "āḥ + voiced consonant → ā",
            "hi": "āḥ + voiced consonant → ā"
          },
          "alt": {
            "en": "āḥ loses visarga before a voiced consonant.. The Ramas go: rāmā gacchanti. Long ā remains and visarga disappears. It does not become o. Compare the singular rāmo gacchati with this plural form; the grammatical ending and verb number support your reading.",
            "hi": "āḥ loses visarga before a voiced consonant.. The Ramas go: rāmā gacchanti. Long ā remains and visarga disappears. It does not become o. Compare the singular rāmo gacchati with this plural form; the grammatical ending and verb number support your reading."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-a-visarga-07",
        "kind": "teach",
        "title": {
          "en": "āḥ leaves a gap before vowels.",
          "hi": "āḥ leaves a gap before vowels."
        },
        "body": {
          "en": "Bālāḥ means ‘children’; api means ‘also’. Ordinary āḥ loses its visarga, but the following a remains separate. Do not merge the two vowels into bālāpi. This is another correct hiatus created by visarga sandhi. The rule presupposes an -ās-origin ending. A rare āḥ pause form from underlying ār, such as dvāḥ, behaves differently before voiced sounds.",
          "hi": "Bālāḥ means ‘children’; api means ‘also’. Ordinary āḥ loses its visarga, but the following a remains separate. Do not merge the two vowels into bālāpi. This is another correct hiatus created by visarga sandhi. The rule presupposes an -ās-origin ending. A rare āḥ pause form from underlying ār, such as dvāḥ, behaves differently before voiced sounds."
        },
        "example": {
          "sa": "बालाः + अपि → बाला अपि",
          "iast": "bālāḥ + api → bālā api",
          "gloss": {
            "en": "āḥ + vowel → ā | vowel",
            "hi": "āḥ + vowel → ā | vowel"
          },
          "alt": {
            "en": "āḥ leaves a gap before vowels.. Bālāḥ means ‘children’; api means ‘also’. Ordinary āḥ loses its visarga, but the following a remains separate. Do not merge the two vowels into bālāpi. This is another correct hiatus created by visarga sandhi.",
            "hi": "āḥ leaves a gap before vowels.. Bālāḥ means ‘children’; api means ‘also’. Ordinary āḥ loses its visarga, but the following a remains separate. Do not merge the two vowels into bālāpi. This is another correct hiatus created by visarga sandhi."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-a-visarga-08",
        "kind": "teach",
        "title": {
          "en": "Unvoiced stops do not use the o rule.",
          "hi": "Unvoiced stops do not use the o rule."
        },
        "body": {
          "en": "Rama reads: rāmaḥ paṭhati. P is unvoiced, so the ordinary aḥ→o rule does not apply. Before k, kh, p and ph, visarga is normally retained in writing. The next lesson handles the other unvoiced rows. Before k/kh and p/ph, specialised recitation can use jihvāmūlīya and upadhmānīya allophones. Their exact articulation and symbols need an expert phonetics lesson, not a guessed recording.",
          "hi": "Rama reads: rāmaḥ paṭhati. P is unvoiced, so the ordinary aḥ→o rule does not apply. Before k, kh, p and ph, visarga is normally retained in writing. The next lesson handles the other unvoiced rows. Before k/kh and p/ph, specialised recitation can use jihvāmūlīya and upadhmānīya allophones. Their exact articulation and symbols need an expert phonetics lesson, not a guessed recording."
        },
        "example": {
          "sa": "रामः + पठति → रामः पठति",
          "iast": "rāmaḥ paṭhati",
          "gloss": {
            "en": "aḥ + p → aḥ + p",
            "hi": "aḥ + p → aḥ + p"
          },
          "alt": {
            "en": "Unvoiced stops do not use the o rule.. Rama reads: rāmaḥ paṭhati. P is unvoiced, so the ordinary aḥ→o rule does not apply. Before k, kh, p and ph, visarga is normally retained in writing. The next lesson handles the other unvoiced rows.",
            "hi": "Unvoiced stops do not use the o rule.. Rama reads: rāmaḥ paṭhati. P is unvoiced, so the ordinary aḥ→o rule does not apply. Before k, kh, p and ph, visarga is normally retained in writing. The next lesson handles the other unvoiced rows."
          }
        },
        "assetIds": []
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Sandhi manuscript · Whitney §§169–177. Source reading; no assessed mastery.",
      "hi": "Existing English Sandhi manuscript · Whitney §§169–177. Source reading; no assessed mastery."
    }
  },
  {
    "id": "sandhi-source-visarga-more",
    "rank": 10,
    "unit": {
      "en": "Sandhi: full source readings",
      "hi": "Sandhi: full source readings"
    },
    "title": {
      "en": "Visarga beyond aḥ",
      "hi": "Visarga beyond aḥ"
    },
    "titleSa": "सन्धिः",
    "titleIast": "sandhiḥ",
    "outcome": {
      "en": "Recognise sibilants, r outcomes, r collision and pronoun exceptions.",
      "hi": "Recognise sibilants, r outcomes, r collision and pronoun exceptions."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://en.wikisource.org/wiki/Sanskrit_Grammar_(Whitney)/Chapter_III"
    ],
    "cards": [
      {
        "id": "sandhi-source-visarga-more-01",
        "kind": "teach",
        "title": {
          "en": "Before c, visarga can become ś.",
          "hi": "Before c, visarga can become ś."
        },
        "body": {
          "en": "Bālaḥ means ‘the boy’; carati means ‘walks’. Visarga becomes the palatal sibilant ś before c. The joined bālaścarati means ‘the boy walks’. This is a place-matching result, unlike the o before voiced g. The ordinary row applies to simple following c/ch environments. Clusters that begin with these sounds can have additional qualifications; consult the detailed reference when a second consonant follows immediately.",
          "hi": "Bālaḥ means ‘the boy’; carati means ‘walks’. Visarga becomes the palatal sibilant ś before c. The joined bālaścarati means ‘the boy walks’. This is a place-matching result, unlike the o before voiced g. The ordinary row applies to simple following c/ch environments. Clusters that begin with these sounds can have additional qualifications; consult the detailed reference when a second consonant follows immediately."
        },
        "example": {
          "sa": "बालः + चरति → बालश्चरति",
          "iast": "bālaḥ + carati → bālaścarati",
          "gloss": {
            "en": "ḥ + c/ch → ś + c/ch",
            "hi": "ḥ + c/ch → ś + c/ch"
          },
          "alt": {
            "en": "Before c, visarga can become ś.. Bālaḥ means ‘the boy’; carati means ‘walks’. Visarga becomes the palatal sibilant ś before c. The joined bālaścarati means ‘the boy walks’. This is a place-matching result, unlike the o before voiced g.",
            "hi": "Before c, visarga can become ś.. Bālaḥ means ‘the boy’; carati means ‘walks’. Visarga becomes the palatal sibilant ś before c. The joined bālaścarati means ‘the boy walks’. This is a place-matching result, unlike the o before voiced g."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-visarga-more-02",
        "kind": "teach",
        "title": {
          "en": "Before t, the sibilant is s.",
          "hi": "Before t, the sibilant is s."
        },
        "body": {
          "en": "Tiṣṭhati means ‘stands’. Before dental t, visarga becomes dental s: bālastiṣṭhati, ‘the boy stands’. Before a retroflex ṭ or ṭh, the corresponding sibilant is ṣ. Match the sibilant to the following stop’s class. The compact IAST reading is bālastiṣṭhati. The retroflex row is ḥ+ṭ→ṣṭ, not a general conversion of visarga to ṣ everywhere.",
          "hi": "Tiṣṭhati means ‘stands’. Before dental t, visarga becomes dental s: bālastiṣṭhati, ‘the boy stands’. Before a retroflex ṭ or ṭh, the corresponding sibilant is ṣ. Match the sibilant to the following stop’s class. The compact IAST reading is bālastiṣṭhati. The retroflex row is ḥ+ṭ→ṣṭ, not a general conversion of visarga to ṣ everywhere."
        },
        "example": {
          "sa": "बालः + तिष्ठति → बालस्तिष्ठति",
          "iast": "bālaḥ + tiṣṭhati → bālastiṣṭhati",
          "gloss": {
            "en": "ḥ + t/th → s + t/th",
            "hi": "ḥ + t/th → s + t/th"
          },
          "alt": {
            "en": "Before t, the sibilant is s.. Tiṣṭhati means ‘stands’. Before dental t, visarga becomes dental s: bālastiṣṭhati, ‘the boy stands’. Before a retroflex ṭ or ṭh, the corresponding sibilant is ṣ. Match the sibilant to the following stop’s class.",
            "hi": "Before t, the sibilant is s.. Tiṣṭhati means ‘stands’. Before dental t, visarga becomes dental s: bālastiṣṭhati, ‘the boy stands’. Before a retroflex ṭ or ṭh, the corresponding sibilant is ṣ. Match the sibilant to the following stop’s class."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-visarga-more-03",
        "kind": "teach",
        "title": {
          "en": "Before a sibilant, editions can differ.",
          "hi": "Before a sibilant, editions can differ."
        },
        "body": {
          "en": "Śete means ‘lies down’. Visarga may be retained, or assimilated to the following sibilant. Both rāmaḥ śete and rāmaś śete occur as permitted representations. The corresponding ṣ and s contexts have parallel alternatives. A following cluster may favour or require retention under detailed rules. Teach one normal reading, then show permitted variants with their environments. Avoid treating an edition’s spelling preference as a different meaning.",
          "hi": "Śete means ‘lies down’. Visarga may be retained, or assimilated to the following sibilant. Both rāmaḥ śete and rāmaś śete occur as permitted representations. The corresponding ṣ and s contexts have parallel alternatives. A following cluster may favour or require retention under detailed rules. Teach one normal reading, then show permitted variants with their environments. Avoid treating an edition’s spelling preference as a different meaning."
        },
        "example": {
          "sa": "रामः + शेते → रामः शेते / रामश्शेते",
          "iast": "rāmaḥ śete / rāmaś śete",
          "gloss": {
            "en": "ḥ before ś / ṣ / s · alternatives",
            "hi": "ḥ before ś / ṣ / s · alternatives"
          },
          "alt": {
            "en": "Before a sibilant, editions can differ.. Śete means ‘lies down’. Visarga may be retained, or assimilated to the following sibilant. Both rāmaḥ śete and rāmaś śete occur as permitted representations. The corresponding ṣ and s contexts have parallel alternatives.",
            "hi": "Before a sibilant, editions can differ.. Śete means ‘lies down’. Visarga may be retained, or assimilated to the following sibilant. Both rāmaḥ śete and rāmaś śete occur as permitted representations. The corresponding ṣ and s contexts have parallel alternatives."
          }
        },
        "assetIds": [
          "sandhi-visarga-more-3"
        ]
      },
      {
        "id": "sandhi-source-visarga-more-04",
        "kind": "teach",
        "title": {
          "en": "After i or u, voiced sounds give r.",
          "hi": "After i or u, voiced sounds give r."
        },
        "body": {
          "en": "Agniḥ means ‘fire’. Before voiced a, its ending becomes ir: agnirasti, ‘there is fire’. Vāyuḥ + asti similarly gives vāyurasti, ‘there is wind’. These endings do not follow the ordinary short-aḥ→o pattern. Outside the -as/-ās cases, s-origin and r-origin visarga generally give r before voiced sounds. Unvoiced following sounds still use the visarga/sibilant rules.",
          "hi": "Agniḥ means ‘fire’. Before voiced a, its ending becomes ir: agnirasti, ‘there is fire’. Vāyuḥ + asti similarly gives vāyurasti, ‘there is wind’. These endings do not follow the ordinary short-aḥ→o pattern. Outside the -as/-ās cases, s-origin and r-origin visarga generally give r before voiced sounds. Unvoiced following sounds still use the visarga/sibilant rules."
        },
        "example": {
          "sa": "अग्निः + अस्ति → अग्निरस्ति",
          "iast": "agniḥ + asti → agnirasti",
          "gloss": {
            "en": "iḥ + vowel → ir + vowel",
            "hi": "iḥ + vowel → ir + vowel"
          },
          "alt": {
            "en": "After i or u, voiced sounds give r.. Agniḥ means ‘fire’. Before voiced a, its ending becomes ir: agnirasti, ‘there is fire’. Vāyuḥ + asti similarly gives vāyurasti, ‘there is wind’. These endings do not follow the ordinary short-aḥ→o pattern.",
            "hi": "After i or u, voiced sounds give r.. Agniḥ means ‘fire’. Before voiced a, its ending becomes ir: agnirasti, ‘there is fire’. Vāyuḥ + asti similarly gives vāyurasti, ‘there is wind’. These endings do not follow the ordinary short-aḥ→o pattern."
          }
        },
        "assetIds": [
          "sandhi-visarga-more-4"
        ]
      },
      {
        "id": "sandhi-source-visarga-more-05",
        "kind": "teach",
        "title": {
          "en": "Two r sounds are not kept together.",
          "hi": "Two r sounds are not kept together."
        },
        "body": {
          "en": "Punaḥ comes from punar, ‘again’. Before ramate, ‘enjoys’, the meeting r is lost and the preceding a lengthens: punā ramate. After i or u, the corresponding collision can give ī or ū. Examples include agniḥ + rocate → agnī rocate and vāyuḥ + rocate → vāyū rocate. Ordinary -as-origin aḥ before r instead follows the o pattern, as rāmaḥ + ramate → rāmo ramate.",
          "hi": "Punaḥ comes from punar, ‘again’. Before ramate, ‘enjoys’, the meeting r is lost and the preceding a lengthens: punā ramate. After i or u, the corresponding collision can give ī or ū. Examples include agniḥ + rocate → agnī rocate and vāyuḥ + rocate → vāyū rocate. Ordinary -as-origin aḥ before r instead follows the o pattern, as rāmaḥ + ramate → rāmo ramate."
        },
        "example": {
          "sa": "पुनः + रमते → पुना रमते",
          "iast": "punaḥ + ramate → punā ramate",
          "gloss": {
            "en": "Underlying r + r → loss + lengthening",
            "hi": "Underlying r + r → loss + lengthening"
          },
          "alt": {
            "en": "Two r sounds are not kept together.. Punaḥ comes from punar, ‘again’. Before ramate, ‘enjoys’, the meeting r is lost and the preceding a lengthens: punā ramate. After i or u, the corresponding collision can give ī or ū.",
            "hi": "Two r sounds are not kept together.. Punaḥ comes from punar, ‘again’. Before ramate, ‘enjoys’, the meeting r is lost and the preceding a lengthens: punā ramate. After i or u, the corresponding collision can give ī or ū."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-visarga-more-06",
        "kind": "teach",
        "title": {
          "en": "A pause form can hide an original r.",
          "hi": "A pause form can hide an original r."
        },
        "body": {
          "en": "Punaḥ is ‘again’. Before api, its underlying r returns: punarapi, ‘again also’. Do not use the aḥ + a → o’ rule here. The familiar pause spelling alone does not distinguish s-origin from r-origin visarga. The rare door form dvāḥ continues dvār and gives dvār before voiced sounds, rather than the ordinary -ās loss rule. Keep lexical origin in the content model and reference entry.",
          "hi": "Punaḥ is ‘again’. Before api, its underlying r returns: punarapi, ‘again also’. Do not use the aḥ + a → o’ rule here. The familiar pause spelling alone does not distinguish s-origin from r-origin visarga. The rare door form dvāḥ continues dvār and gives dvār before voiced sounds, rather than the ordinary -ās loss rule. Keep lexical origin in the content model and reference entry."
        },
        "example": {
          "sa": "पुनः + अपि → पुनरपि",
          "iast": "punaḥ + api → punarapi",
          "gloss": {
            "en": "Underlying punar → r before voiced sound",
            "hi": "Underlying punar → r before voiced sound"
          },
          "alt": {
            "en": "A pause form can hide an original r.. Punaḥ is ‘again’. Before api, its underlying r returns: punarapi, ‘again also’. Do not use the aḥ + a → o’ rule here. The familiar pause spelling alone does not distinguish s-origin from r-origin visarga.",
            "hi": "A pause form can hide an original r.. Punaḥ is ‘again’. Before api, its underlying r returns: punarapi, ‘again also’. Do not use the aḥ + a → o’ rule here. The familiar pause spelling alone does not distinguish s-origin from r-origin visarga."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-visarga-more-07",
        "kind": "teach",
        "title": {
          "en": "saḥ has a special consonant rule.",
          "hi": "saḥ has a special consonant rule."
        },
        "body": {
          "en": "Saḥ means ‘he / that one’. Before a consonant, its visarga drops: sa gacchati, ‘he goes’. It does not become so gacchati. Eṣaḥ, ‘this one’, follows the same special pattern. Before vowels other than short a, these pronouns also lose visarga and retain hiatus. At a pause, use saḥ and eṣaḥ. Treat these as named lexical exceptions, not a new general rule for all aḥ endings.",
          "hi": "Saḥ means ‘he / that one’. Before a consonant, its visarga drops: sa gacchati, ‘he goes’. It does not become so gacchati. Eṣaḥ, ‘this one’, follows the same special pattern. Before vowels other than short a, these pronouns also lose visarga and retain hiatus. At a pause, use saḥ and eṣaḥ. Treat these as named lexical exceptions, not a new general rule for all aḥ endings."
        },
        "example": {
          "sa": "सः + गच्छति → स गच्छति",
          "iast": "saḥ + gacchati → sa gacchati",
          "gloss": {
            "en": "saḥ / eṣaḥ · drop ḥ before consonants",
            "hi": "saḥ / eṣaḥ · drop ḥ before consonants"
          },
          "alt": {
            "en": "saḥ has a special consonant rule.. Saḥ means ‘he / that one’. Before a consonant, its visarga drops: sa gacchati, ‘he goes’. It does not become so gacchati. Eṣaḥ, ‘this one’, follows the same special pattern.",
            "hi": "saḥ has a special consonant rule.. Saḥ means ‘he / that one’. Before a consonant, its visarga drops: sa gacchati, ‘he goes’. It does not become so gacchati. Eṣaḥ, ‘this one’, follows the same special pattern."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-visarga-more-08",
        "kind": "teach",
        "title": {
          "en": "Before short a, saḥ uses so’.",
          "hi": "Before short a, saḥ uses so’."
        },
        "body": {
          "en": "The pronoun’s short-a case follows the familiar o’ outcome: so’sti, ‘he is here / exists’. Eṣaḥ + asti gives eṣo’sti. Pair this with sa gacchati so that the exception is learned with its own limits. Optional behaviours in metrical or older texts require separate evidence. The main path teaches the ordinary Classical prose patterns before introducing those register-specific alternatives.",
          "hi": "The pronoun’s short-a case follows the familiar o’ outcome: so’sti, ‘he is here / exists’. Eṣaḥ + asti gives eṣo’sti. Pair this with sa gacchati so that the exception is learned with its own limits. Optional behaviours in metrical or older texts require separate evidence. The main path teaches the ordinary Classical prose patterns before introducing those register-specific alternatives."
        },
        "example": {
          "sa": "सः + अस्ति → सोऽस्ति",
          "iast": "saḥ + asti → so’sti",
          "gloss": {
            "en": "saḥ + short a → so’",
            "hi": "saḥ + short a → so’"
          },
          "alt": {
            "en": "Before short a, saḥ uses so’.. The pronoun’s short-a case follows the familiar o’ outcome: so’sti, ‘he is here / exists’. Eṣaḥ + asti gives eṣo’sti. Pair this with sa gacchati so that the exception is learned with its own limits.",
            "hi": "Before short a, saḥ uses so’.. The pronoun’s short-a case follows the familiar o’ outcome: so’sti, ‘he is here / exists’. Eṣaḥ + asti gives eṣo’sti. Pair this with sa gacchati so that the exception is learned with its own limits."
          }
        },
        "assetIds": []
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Sandhi manuscript · Whitney §§170–179. Source reading; no assessed mastery.",
      "hi": "Existing English Sandhi manuscript · Whitney §§170–179. Source reading; no assessed mastery."
    }
  },
  {
    "id": "sandhi-source-internal",
    "rank": 11,
    "unit": {
      "en": "Sandhi: full source readings",
      "hi": "Sandhi: full source readings"
    },
    "title": {
      "en": "Changes inside a formed word",
      "hi": "Changes inside a formed word"
    },
    "titleSa": "सन्धिः",
    "titleIast": "sandhiḥ",
    "outcome": {
      "en": "See why internal consonant sandhi needs roots and endings, not just a word-boundary chart.",
      "hi": "See why internal consonant sandhi needs roots and endings, not just a word-boundary chart."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://en.wikisource.org/wiki/Sanskrit_Grammar_(Whitney)/Chapter_III"
    ],
    "cards": [
      {
        "id": "sandhi-source-internal-01",
        "kind": "teach",
        "title": {
          "en": "Do not voice every internal consonant.",
          "hi": "Do not voice every internal consonant."
        },
        "body": {
          "en": "Vacmi means ‘I speak’. The c remains before voiced m in this internal formation. External final-stop voicing is not a universal rule for every adjacent pair inside words. Identify the root and the ending first. The root vac belongs to a conjugational system. This example teaches a sound outcome, not the entire paradigm. Internal vowels, nasals and semivowels generally do not have the same voicing effect as in external sandhi.",
          "hi": "Vacmi means ‘I speak’. The c remains before voiced m in this internal formation. External final-stop voicing is not a universal rule for every adjacent pair inside words. Identify the root and the ending first. The root vac belongs to a conjugational system. This example teaches a sound outcome, not the entire paradigm. Internal vowels, nasals and semivowels generally do not have the same voicing effect as in external sandhi."
        },
        "example": {
          "sa": "वच् + मि → वच्मि",
          "iast": "vac + mi → vacmi",
          "gloss": {
            "en": "Internal c + m remains cm",
            "hi": "Internal c + m remains cm"
          },
          "alt": {
            "en": "Do not voice every internal consonant.. Vacmi means ‘I speak’. The c remains before voiced m in this internal formation. External final-stop voicing is not a universal rule for every adjacent pair inside words. Identify the root and the ending first.",
            "hi": "Do not voice every internal consonant.. Vacmi means ‘I speak’. The c remains before voiced m in this internal formation. External final-stop voicing is not a universal rule for every adjacent pair inside words. Identify the root and the ending first."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-internal-02",
        "kind": "teach",
        "title": {
          "en": "Some case endings behave like pada boundaries.",
          "hi": "Some case endings behave like pada boundaries."
        },
        "body": {
          "en": "Now revisit ‘by the winds’. Before case ending bhiḥ, final t voices to d. Internal formation does sometimes resemble external joining. Learn which endings receive that treatment rather than declaring all internal and external rules identical. Endings beginning with bh and s are traditionally important pada endings, including bhyām, bhiḥ, bhyaḥ and su. Detailed stem classes belong with declension.",
          "hi": "Now revisit ‘by the winds’. Before case ending bhiḥ, final t voices to d. Internal formation does sometimes resemble external joining. Learn which endings receive that treatment rather than declaring all internal and external rules identical. Endings beginning with bh and s are traditionally important pada endings, including bhyām, bhiḥ, bhyaḥ and su. Detailed stem classes belong with declension."
        },
        "example": {
          "sa": "मरुत् + भिः → मरुद्भिः",
          "iast": "marut + bhiḥ → marudbhiḥ",
          "gloss": {
            "en": "t + bh → dbh",
            "hi": "t + bh → dbh"
          },
          "alt": {
            "en": "Some case endings behave like pada boundaries.. Now revisit ‘by the winds’. Before case ending bhiḥ, final t voices to d. Internal formation does sometimes resemble external joining. Learn which endings receive that treatment rather than declaring all internal and external rules identical.",
            "hi": "Some case endings behave like pada boundaries.. Now revisit ‘by the winds’. Before case ending bhiḥ, final t voices to d. Internal formation does sometimes resemble external joining. Learn which endings receive that treatment rather than declaring all internal and external rules identical."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-internal-03",
        "kind": "teach",
        "title": {
          "en": "Aspiration can move to the next stop.",
          "hi": "Aspiration can move to the next stop."
        },
        "body": {
          "en": "The formation budh + ta gives buddha, ‘awakened’. The first stop loses its aspiration, while the following stop becomes dh. The resulting cluster is d + dh. Its Roman ddh is not three independent consonants. This is a root-plus-suffix demonstration. Consonant adjustment and preservation of aspiration work together; the full participle derivation is a morphology lesson.",
          "hi": "The formation budh + ta gives buddha, ‘awakened’. The first stop loses its aspiration, while the following stop becomes dh. The resulting cluster is d + dh. Its Roman ddh is not three independent consonants. This is a root-plus-suffix demonstration. Consonant adjustment and preservation of aspiration work together; the full participle derivation is a morphology lesson."
        },
        "example": {
          "sa": "बुध् + त → बुद्ध",
          "iast": "budh + ta → buddha",
          "gloss": {
            "en": "dh + t → ddh",
            "hi": "dh + t → ddh"
          },
          "alt": {
            "en": "Aspiration can move to the next stop.. The formation budh + ta gives buddha, ‘awakened’. The first stop loses its aspiration, while the following stop becomes dh. The resulting cluster is d + dh. Its Roman ddh is not three independent consonants.",
            "hi": "Aspiration can move to the next stop.. The formation budh + ta gives buddha, ‘awakened’. The first stop loses its aspiration, while the following stop becomes dh. The resulting cluster is d + dh. Its Roman ddh is not three independent consonants."
          }
        },
        "assetIds": [
          "sandhi-internal-3"
        ]
      },
      {
        "id": "sandhi-source-internal-04",
        "kind": "teach",
        "title": {
          "en": "Another root shows the same mechanism.",
          "hi": "Another root shows the same mechanism."
        },
        "body": {
          "en": "Labh + ta gives labdha, ‘obtained’. The labial first stop becomes unaspirated b; the dental second stop becomes dh. Compare buddha: aspiration is preserved, but the first stop’s place is supplied by its own root. Do not derive labdha by changing every consonant to the same mouth position. Aspiration, place and voicing are different features.",
          "hi": "Labh + ta gives labdha, ‘obtained’. The labial first stop becomes unaspirated b; the dental second stop becomes dh. Compare buddha: aspiration is preserved, but the first stop’s place is supplied by its own root. Do not derive labdha by changing every consonant to the same mouth position. Aspiration, place and voicing are different features."
        },
        "example": {
          "sa": "लभ् + त → लब्ध",
          "iast": "labh + ta → labdha",
          "gloss": {
            "en": "bh + t → bdh",
            "hi": "bh + t → bdh"
          },
          "alt": {
            "en": "Another root shows the same mechanism.. Labh + ta gives labdha, ‘obtained’. The labial first stop becomes unaspirated b; the dental second stop becomes dh. Compare buddha: aspiration is preserved, but the first stop’s place is supplied by its own root.",
            "hi": "Another root shows the same mechanism.. Labh + ta gives labdha, ‘obtained’. The labial first stop becomes unaspirated b; the dental second stop becomes dh. Compare buddha: aspiration is preserved, but the first stop’s place is supplied by its own root."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-internal-05",
        "kind": "teach",
        "title": {
          "en": "Aspiration may return to an earlier consonant.",
          "hi": "Aspiration may return to an earlier consonant."
        },
        "body": {
          "en": "In the cited formation, aspiration cannot stay on the final stop before s, so it appears on the root’s initial b: bhotsya. The result is a future-stem stage. This is a root-sensitive process, not an instruction to aspirate any earlier letter. Whitney treats aspiration transfer in a specified class of roots. Keep the root and derivational stage in the data. A surface-only sandhi table cannot supply this information.",
          "hi": "In the cited formation, aspiration cannot stay on the final stop before s, so it appears on the root’s initial b: bhotsya. The result is a future-stem stage. This is a root-sensitive process, not an instruction to aspirate any earlier letter. Whitney treats aspiration transfer in a specified class of roots. Keep the root and derivational stage in the data. A surface-only sandhi table cannot supply this information."
        },
        "example": {
          "sa": "बोध् + स्य → भोत्स्य",
          "iast": "bodh + sya → bhotsya",
          "gloss": {
            "en": "Aspiration shifts back in this root",
            "hi": "Aspiration shifts back in this root"
          },
          "alt": {
            "en": "Aspiration may return to an earlier consonant.. In the cited formation, aspiration cannot stay on the final stop before s, so it appears on the root’s initial b: bhotsya. The result is a future-stem stage. This is a root-sensitive process, not an instruction to aspirate any earlier letter.",
            "hi": "Aspiration may return to an earlier consonant.. In the cited formation, aspiration cannot stay on the final stop before s, so it appears on the root’s initial b: bhotsya. The result is a future-stem stage. This is a root-sensitive process, not an instruction to aspirate any earlier letter."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-internal-06",
        "kind": "teach",
        "title": {
          "en": "h outcomes can be root-specific.",
          "hi": "h outcomes can be root-specific."
        },
        "body": {
          "en": "The root dah means ‘burn’. In this future-stem formation, the result is dhakṣya. The h does not simply become one fixed consonant in every environment. Study h-final roots through their attested forms and grammatical class. Do not present this as the complete finite verb; the appropriate personal ending follows. Other h-final roots may have different outcomes, so dictionary and morphology support are required.",
          "hi": "The root dah means ‘burn’. In this future-stem formation, the result is dhakṣya. The h does not simply become one fixed consonant in every environment. Study h-final roots through their attested forms and grammatical class. Do not present this as the complete finite verb; the appropriate personal ending follows. Other h-final roots may have different outcomes, so dictionary and morphology support are required."
        },
        "example": {
          "sa": "दह् + स्य → धक्ष्य",
          "iast": "dah + sya → dhakṣya",
          "gloss": {
            "en": "h → kṣ with aspiration transfer",
            "hi": "h → kṣ with aspiration transfer"
          },
          "alt": {
            "en": "h outcomes can be root-specific.. The root dah means ‘burn’. In this future-stem formation, the result is dhakṣya. The h does not simply become one fixed consonant in every environment. Study h-final roots through their attested forms and grammatical class.",
            "hi": "h outcomes can be root-specific.. The root dah means ‘burn’. In this future-stem formation, the result is dhakṣya. The h does not simply become one fixed consonant in every environment. Study h-final roots through their attested forms and grammatical class."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-internal-07",
        "kind": "teach",
        "title": {
          "en": "A preceding ṣ can make t retroflex.",
          "hi": "A preceding ṣ can make t retroflex."
        },
        "body": {
          "en": "Dviṣ means ‘hate’. Before the suffix ta, the dental t becomes retroflex ṭ after ṣ, giving dviṣṭa, ‘hated’. Here the second member changes to match a preceding sound. Sandhi effects can work in either direction. Some palatal roots also show ṣṭ, kṣ or other outcomes under specified formations. Root-final c, j, ś and h require morphological classes, not one universal conversion rule.",
          "hi": "Dviṣ means ‘hate’. Before the suffix ta, the dental t becomes retroflex ṭ after ṣ, giving dviṣṭa, ‘hated’. Here the second member changes to match a preceding sound. Sandhi effects can work in either direction. Some palatal roots also show ṣṭ, kṣ or other outcomes under specified formations. Root-final c, j, ś and h require morphological classes, not one universal conversion rule."
        },
        "example": {
          "sa": "द्विष् + त → द्विष्ट",
          "iast": "dviṣ + ta → dviṣṭa",
          "gloss": {
            "en": "ṣ + t → ṣṭ",
            "hi": "ṣ + t → ṣṭ"
          },
          "alt": {
            "en": "A preceding ṣ can make t retroflex.. Dviṣ means ‘hate’. Before the suffix ta, the dental t becomes retroflex ṭ after ṣ, giving dviṣṭa, ‘hated’. Here the second member changes to match a preceding sound. Sandhi effects can work in either direction.",
            "hi": "A preceding ṣ can make t retroflex.. Dviṣ means ‘hate’. Before the suffix ta, the dental t becomes retroflex ṭ after ṣ, giving dviṣṭa, ‘hated’. Here the second member changes to match a preceding sound. Sandhi effects can work in either direction."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-internal-08",
        "kind": "teach",
        "title": {
          "en": "Read the finished form, then inspect its history.",
          "hi": "Read the finished form, then inspect its history."
        },
        "body": {
          "en": "When you meet labdha, recognise ‘obtained’. Then inspect labh + ta and explain b + dh. This connects sandhi to useful vocabulary. Learning isolated transformations without the root, ending and meaning would leave you unable to recognise the word in a text. Internal sandhi is revisited throughout nouns, verbs and compounds. This chapter establishes the mechanisms; each morphology chapter must teach its own relevant formations and exceptions.",
          "hi": "When you meet labdha, recognise ‘obtained’. Then inspect labh + ta and explain b + dh. This connects sandhi to useful vocabulary. Learning isolated transformations without the root, ending and meaning would leave you unable to recognise the word in a text. Internal sandhi is revisited throughout nouns, verbs and compounds. This chapter establishes the mechanisms; each morphology chapter must teach its own relevant formations and exceptions."
        },
        "example": {
          "sa": "लभ् + त → लब्ध",
          "iast": "labdha ← labh + ta",
          "gloss": {
            "en": "Meaning first · formation second",
            "hi": "Meaning first · formation second"
          },
          "alt": {
            "en": "Read the finished form, then inspect its history.. When you meet labdha, recognise ‘obtained’. Then inspect labh + ta and explain b + dh. This connects sandhi to useful vocabulary. Learning isolated transformations without the root, ending and meaning would leave you unable to recognise the word in a text.",
            "hi": "Read the finished form, then inspect its history.. When you meet labdha, recognise ‘obtained’. Then inspect labh + ta and explain b + dh. This connects sandhi to useful vocabulary. Learning isolated transformations without the root, ending and meaning would leave you unable to recognise the word in a text."
          }
        },
        "assetIds": []
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Sandhi manuscript · Whitney §§110–111, 153–163, 214–226. Source reading; no assessed mastery.",
      "hi": "Existing English Sandhi manuscript · Whitney §§110–111, 153–163, 214–226. Source reading; no assessed mastery."
    }
  },
  {
    "id": "sandhi-source-retroflex",
    "rank": 12,
    "unit": {
      "en": "Sandhi: full source readings",
      "hi": "Sandhi: full source readings"
    },
    "title": {
      "en": "When s and n become retroflex",
      "hi": "When s and n become retroflex"
    },
    "titleSa": "सन्धिः",
    "titleIast": "sandhiḥ",
    "outcome": {
      "en": "Apply ṣatva and ṇatva with their triggers, blockers and word limits.",
      "hi": "Apply ṣatva and ṇatva with their triggers, blockers and word limits."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://en.wikisource.org/wiki/Sanskrit_Grammar_(Whitney)/Chapter_III"
    ],
    "cards": [
      {
        "id": "sandhi-source-retroflex-01",
        "kind": "teach",
        "title": {
          "en": "After i, s can become ṣ.",
          "hi": "After i, s can become ṣ."
        },
        "body": {
          "en": "Agni + su forms agniṣu, ‘in fires’. The suffix’s dental s becomes retroflex ṣ after i. This is an internal formation. It does not mean that every word starting in s changes after any preceding word ending in i. Ṣatva applies under specified internal, prefix and compound conditions. IAST s, ś and ṣ represent three different consonants; do not collapse them into one English s.",
          "hi": "Agni + su forms agniṣu, ‘in fires’. The suffix’s dental s becomes retroflex ṣ after i. This is an internal formation. It does not mean that every word starting in s changes after any preceding word ending in i. Ṣatva applies under specified internal, prefix and compound conditions. IAST s, ś and ṣ represent three different consonants; do not collapse them into one English s."
        },
        "example": {
          "sa": "अग्नि + सु → अग्निषु",
          "iast": "agni + su → agniṣu",
          "gloss": {
            "en": "i + suffix s → ṣ",
            "hi": "i + suffix s → ṣ"
          },
          "alt": {
            "en": "After i, s can become ṣ.. Agni + su forms agniṣu, ‘in fires’. The suffix’s dental s becomes retroflex ṣ after i. This is an internal formation. It does not mean that every word starting in s changes after any preceding word ending in i.",
            "hi": "After i, s can become ṣ.. Agni + su forms agniṣu, ‘in fires’. The suffix’s dental s becomes retroflex ṣ after i. This is an internal formation. It does not mean that every word starting in s changes after any preceding word ending in i."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-retroflex-02",
        "kind": "teach",
        "title": {
          "en": "The trigger set is larger than i.",
          "hi": "The trigger set is larger than i."
        },
        "body": {
          "en": "Dhanus means ‘bow’. In dhanuṣā, ‘with a bow’, the s after u becomes ṣ. Triggering sounds include the i and u vowel groups, vocalic ṛ, and k or r under the specified conditions. The nickname ‘ruki’ helps remember this family. The expanded vowel set includes ī, ū, ṝ, e, ai, o and au. A trigger is not sufficient in every lexical configuration: check morphology and exceptions.",
          "hi": "Dhanus means ‘bow’. In dhanuṣā, ‘with a bow’, the s after u becomes ṣ. Triggering sounds include the i and u vowel groups, vocalic ṛ, and k or r under the specified conditions. The nickname ‘ruki’ helps remember this family. The expanded vowel set includes ī, ū, ṝ, e, ai, o and au. A trigger is not sufficient in every lexical configuration: check morphology and exceptions."
        },
        "example": {
          "sa": "धनुस् + आ → धनुषा",
          "iast": "dhanus + ā → dhanuṣā",
          "gloss": {
            "en": "Ruki sounds · ṣatva",
            "hi": "Ruki sounds · ṣatva"
          },
          "alt": {
            "en": "The trigger set is larger than i.. Dhanus means ‘bow’. In dhanuṣā, ‘with a bow’, the s after u becomes ṣ. Triggering sounds include the i and u vowel groups, vocalic ṛ, and k or r under the specified conditions. The nickname ‘ruki’ helps remember this family.",
            "hi": "The trigger set is larger than i.. Dhanus means ‘bow’. In dhanuṣā, ‘with a bow’, the s after u becomes ṣ. Triggering sounds include the i and u vowel groups, vocalic ṛ, and k or r under the specified conditions. The nickname ‘ruki’ helps remember this family."
          }
        },
        "assetIds": [
          "sandhi-retroflex-2"
        ]
      },
      {
        "id": "sandhi-source-retroflex-03",
        "kind": "teach",
        "title": {
          "en": "A following r can block ṣatva.",
          "hi": "A following r can block ṣatva."
        },
        "body": {
          "en": "Tisraḥ is a feminine form of ‘three’. Despite the preceding i, the s remains dental before r. This is a useful counterexample to ‘i always changes s to ṣ’. The following sounds matter as well as the previous one. Whitney §181 discusses the following-r restriction and root-sensitive exceptions. Teach this visible counterexample in the main path; reserve the extensive lexical list for reference.",
          "hi": "Tisraḥ is a feminine form of ‘three’. Despite the preceding i, the s remains dental before r. This is a useful counterexample to ‘i always changes s to ṣ’. The following sounds matter as well as the previous one. Whitney §181 discusses the following-r restriction and root-sensitive exceptions. Teach this visible counterexample in the main path; reserve the extensive lexical list for reference."
        },
        "example": {
          "sa": "तिस्रः → तिस्रः",
          "iast": "tisraḥ",
          "gloss": {
            "en": "i before s · but sr remains",
            "hi": "i before s · but sr remains"
          },
          "alt": {
            "en": "A following r can block ṣatva.. Tisraḥ is a feminine form of ‘three’. Despite the preceding i, the s remains dental before r. This is a useful counterexample to ‘i always changes s to ṣ’. The following sounds matter as well as the previous one.",
            "hi": "A following r can block ṣatva.. Tisraḥ is a feminine form of ‘three’. Despite the preceding i, the s remains dental before r. This is a useful counterexample to ‘i always changes s to ṣ’. The following sounds matter as well as the previous one."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-retroflex-04",
        "kind": "teach",
        "title": {
          "en": "r can turn a later n into ṇ.",
          "hi": "r can turn a later n into ṇ."
        },
        "body": {
          "en": "Rāmeṇa means ‘by / with Rama’. The r earlier in the word triggers a retroflex ṇ in the ending. The sounds need not be adjacent. First locate the trigger, then inspect what comes between it and n. The left side schematically isolates the final nasal step after the case-ending formation. It is not a standalone Sanskrit word rāmena or the full derivation of the instrumental ending.",
          "hi": "Rāmeṇa means ‘by / with Rama’. The r earlier in the word triggers a retroflex ṇ in the ending. The sounds need not be adjacent. First locate the trigger, then inspect what comes between it and n. The left side schematically isolates the final nasal step after the case-ending formation. It is not a standalone Sanskrit word rāmena or the full derivation of the instrumental ending."
        },
        "example": {
          "sa": "रामेन [before the nasal change] → रामेण",
          "iast": "rāmena → rāmeṇa, showing the nasal step",
          "gloss": {
            "en": "Earlier r · later n → ṇ",
            "hi": "Earlier r · later n → ṇ"
          },
          "alt": {
            "en": "r can turn a later n into ṇ.. Rāmeṇa means ‘by / with Rama’. The r earlier in the word triggers a retroflex ṇ in the ending. The sounds need not be adjacent. First locate the trigger, then inspect what comes between it and n.",
            "hi": "r can turn a later n into ṇ.. Rāmeṇa means ‘by / with Rama’. The r earlier in the word triggers a retroflex ṇ in the ending. The sounds need not be adjacent. First locate the trigger, then inspect what comes between it and n."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-retroflex-05",
        "kind": "teach",
        "title": {
          "en": "Some sounds allow that influence through.",
          "hi": "Some sounds allow that influence through."
        },
        "body": {
          "en": "In rāmeṇa, m and e lie between r and n. They do not block this ṇatva change. Vowels, y, v, gutturals and labials commonly allow the influence through. In the appropriate formation, earlier r, ṛ, ṝ or ṣ can trigger it. The traditional rule also specifies what follows the affected n. In the ordinary internal rule, it is followed by a vowel, n, m, y or v. Final n is not automatically retroflexed just because an earlier r exists.",
          "hi": "In rāmeṇa, m and e lie between r and n. They do not block this ṇatva change. Vowels, y, v, gutturals and labials commonly allow the influence through. In the appropriate formation, earlier r, ṛ, ṝ or ṣ can trigger it. The traditional rule also specifies what follows the affected n. In the ordinary internal rule, it is followed by a vowel, n, m, y or v. Final n is not automatically retroflexed just because an earlier r exists."
        },
        "example": {
          "sa": "रा … म … ए … न → रामेण",
          "iast": "r … m … e … n → rāmeṇa",
          "gloss": {
            "en": "Vowels and labials do not block here",
            "hi": "Vowels and labials do not block here"
          },
          "alt": {
            "en": "Some sounds allow that influence through.. In rāmeṇa, m and e lie between r and n. They do not block this ṇatva change. Vowels, y, v, gutturals and labials commonly allow the influence through. In the appropriate formation, earlier r, ṛ, ṝ or ṣ can trigger it.",
            "hi": "Some sounds allow that influence through.. In rāmeṇa, m and e lie between r and n. They do not block this ṇatva change. Vowels, y, v, gutturals and labials commonly allow the influence through. In the appropriate formation, earlier r, ṛ, ṝ or ṣ can trigger it."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-retroflex-06",
        "kind": "teach",
        "title": {
          "en": "A dental can stop the influence.",
          "hi": "A dental can stop the influence."
        },
        "body": {
          "en": "Rathena means ‘by / with a chariot’. The dental th intervenes between r and the ending’s n. The n stays dental. Compare rāmeṇa, where the intervening m did not block the change. This contrast gives the rule a clear boundary. Palatal, retroflex and dental consonants generally block the preceding influence; y is an important allowed exception. Prefix and compound configurations have further conditions.",
          "hi": "Rathena means ‘by / with a chariot’. The dental th intervenes between r and the ending’s n. The n stays dental. Compare rāmeṇa, where the intervening m did not block the change. This contrast gives the rule a clear boundary. Palatal, retroflex and dental consonants generally block the preceding influence; y is an important allowed exception. Prefix and compound configurations have further conditions."
        },
        "example": {
          "sa": "रथेन → रथेन",
          "iast": "rathena",
          "gloss": {
            "en": "th between r and n · blocked",
            "hi": "th between r and n · blocked"
          },
          "alt": {
            "en": "A dental can stop the influence.. Rathena means ‘by / with a chariot’. The dental th intervenes between r and the ending’s n. The n stays dental. Compare rāmeṇa, where the intervening m did not block the change. This contrast gives the rule a clear boundary.",
            "hi": "A dental can stop the influence.. Rathena means ‘by / with a chariot’. The dental th intervenes between r and the ending’s n. The n stays dental. Compare rāmeṇa, where the intervening m did not block the change. This contrast gives the rule a clear boundary."
          }
        },
        "assetIds": [
          "sandhi-retroflex-6"
        ]
      },
      {
        "id": "sandhi-source-retroflex-07",
        "kind": "teach",
        "title": {
          "en": "Ordinary separate words have a limit.",
          "hi": "Ordinary separate words have a limit."
        },
        "body": {
          "en": "Hari bows: harirnamati. Visarga becomes r before n, but that external r does not automatically turn the next word’s n into ṇ. Keep the normal word boundary limit. Internal retroflexion is not a free rule across every Classical sentence. Certain compounds, prefixes and Vedic combinations extend these processes under particular rules. Learn those as named formations, rather than erasing the distinction between independent words and one integral word.",
          "hi": "Hari bows: harirnamati. Visarga becomes r before n, but that external r does not automatically turn the next word’s n into ṇ. Keep the normal word boundary limit. Internal retroflexion is not a free rule across every Classical sentence. Certain compounds, prefixes and Vedic combinations extend these processes under particular rules. Learn those as named formations, rather than erasing the distinction between independent words and one integral word."
        },
        "example": {
          "sa": "हरिः + नमति → हरिर्नमति",
          "iast": "hariḥ + namati → harirnamati",
          "gloss": {
            "en": "External r | n · n remains n",
            "hi": "External r | n · n remains n"
          },
          "alt": {
            "en": "Ordinary separate words have a limit.. Hari bows: harirnamati. Visarga becomes r before n, but that external r does not automatically turn the next word’s n into ṇ. Keep the normal word boundary limit. Internal retroflexion is not a free rule across every Classical sentence.",
            "hi": "Ordinary separate words have a limit.. Hari bows: harirnamati. Visarga becomes r before n, but that external r does not automatically turn the next word’s n into ṇ. Keep the normal word boundary limit. Internal retroflexion is not a free rule across every Classical sentence."
          }
        },
        "assetIds": [
          "sandhi-retroflex-7"
        ]
      },
      {
        "id": "sandhi-source-retroflex-08",
        "kind": "teach",
        "title": {
          "en": "A good explanation includes a blocker.",
          "hi": "A good explanation includes a blocker."
        },
        "body": {
          "en": "To explain ṇ, name the trigger, show the intervening sounds, and confirm the grammatical setting. To explain dental n, show what blocked the change or why the setting does not allow it. This gives more depth than memorising which words happen to contain ṇ. Detailed exceptions must be revisited with compounds, prefixes and paradigms. This chapter teaches the productive reasoning, while the source reference supports forms outside the common pattern.",
          "hi": "To explain ṇ, name the trigger, show the intervening sounds, and confirm the grammatical setting. To explain dental n, show what blocked the change or why the setting does not allow it. This gives more depth than memorising which words happen to contain ṇ. Detailed exceptions must be revisited with compounds, prefixes and paradigms. This chapter teaches the productive reasoning, while the source reference supports forms outside the common pattern."
        },
        "example": {
          "sa": "रामेण · रथेन → ṇ · n",
          "iast": "rāmeṇa · rathena",
          "gloss": {
            "en": "Trigger + path + setting",
            "hi": "Trigger + path + setting"
          },
          "alt": {
            "en": "A good explanation includes a blocker.. To explain ṇ, name the trigger, show the intervening sounds, and confirm the grammatical setting. To explain dental n, show what blocked the change or why the setting does not allow it. This gives more depth than memorising which words happen to contain ṇ.",
            "hi": "A good explanation includes a blocker.. To explain ṇ, name the trigger, show the intervening sounds, and confirm the grammatical setting. To explain dental n, show what blocked the change or why the setting does not allow it. This gives more depth than memorising which words happen to contain ṇ."
          }
        },
        "assetIds": []
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Sandhi manuscript · Whitney §§180–195. Source reading; no assessed mastery.",
      "hi": "Existing English Sandhi manuscript · Whitney §§180–195. Source reading; no assessed mastery."
    }
  },
  {
    "id": "sandhi-source-reading",
    "rank": 13,
    "unit": {
      "en": "Sandhi: full source readings",
      "hi": "Sandhi: full source readings"
    },
    "title": {
      "en": "Read a whole passage",
      "hi": "Read a whole passage"
    },
    "titleSa": "सन्धिः",
    "titleIast": "sandhiḥ",
    "outcome": {
      "en": "Reconnect rule families, recover words and test ambiguous splits against meaning.",
      "hi": "Reconnect rule families, recover words and test ambiguous splits against meaning."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://en.wikisource.org/wiki/Sanskrit_Grammar_(Whitney)/Chapter_III"
    ],
    "cards": [
      {
        "id": "sandhi-source-reading-01",
        "kind": "teach",
        "title": {
          "en": "Start with the whole sentence.",
          "hi": "Start with the whole sentence."
        },
        "body": {
          "en": "‘Rama is here. He too goes to the forest.’ Read the two short sentences as a whole first. Next we will inspect one boundary per card while keeping this passage visible. The aim is to understand connected Sanskrit, not just fill a sandhi table. This is an original teaching passage, not a quotation from a scripture. The separate-word line exposes grammatical word forms; it does not show the final continuous pronunciation.",
          "hi": "‘Rama is here. He too goes to the forest.’ Read the two short sentences as a whole first. Next we will inspect one boundary per card while keeping this passage visible. The aim is to understand connected Sanskrit, not just fill a sandhi table. This is an original teaching passage, not a quotation from a scripture. The separate-word line exposes grammatical word forms; it does not show the final continuous pronunciation."
        },
        "example": {
          "sa": "रामः इह अस्ति । सः अपि वनम् गच्छति । → राम इहास्ति । सोऽपि वनं गच्छति ।",
          "iast": "rāma ihāsti. so’pi vanaṃ gacchati.",
          "gloss": {
            "en": "A complete reading",
            "hi": "A complete reading"
          },
          "alt": {
            "en": "Start with the whole sentence.. ‘Rama is here. He too goes to the forest.’ Read the two short sentences as a whole first. Next we will inspect one boundary per card while keeping this passage visible. The aim is to understand connected Sanskrit, not just fill a sandhi table.",
            "hi": "Start with the whole sentence.. ‘Rama is here. He too goes to the forest.’ Read the two short sentences as a whole first. Next we will inspect one boundary per card while keeping this passage visible. The aim is to understand connected Sanskrit, not just fill a sandhi table."
          }
        },
        "assetIds": [
          "sandhi-reading-1"
        ]
      },
      {
        "id": "sandhi-source-reading-02",
        "kind": "teach",
        "title": {
          "en": "First, explain rāma iha.",
          "hi": "First, explain rāma iha."
        },
        "body": {
          "en": "Rāmaḥ meets iha. Ordinary aḥ before a vowel other than short a loses visarga and leaves a. The initial i remains. Keep this boundary gap; do not merge rāma and iha into rāmeha. The displayed passage stays anchored so the learner can locate the current change. A production version can underline whole shaped sound spans without splitting a Devanagari conjunct.",
          "hi": "Rāmaḥ meets iha. Ordinary aḥ before a vowel other than short a loses visarga and leaves a. The initial i remains. Keep this boundary gap; do not merge rāma and iha into rāmeha. The displayed passage stays anchored so the learner can locate the current change. A production version can underline whole shaped sound spans without splitting a Devanagari conjunct."
        },
        "example": {
          "sa": "रामः इह अस्ति । सः अपि वनम् गच्छति । → राम इहास्ति । सोऽपि वनं गच्छति ।",
          "iast": "rāmaḥ + iha → rāma iha",
          "gloss": {
            "en": "aḥ + i → retained hiatus",
            "hi": "aḥ + i → retained hiatus"
          },
          "alt": {
            "en": "First, explain rāma iha.. Rāmaḥ meets iha. Ordinary aḥ before a vowel other than short a loses visarga and leaves a. The initial i remains. Keep this boundary gap; do not merge rāma and iha into rāmeha.",
            "hi": "First, explain rāma iha.. Rāmaḥ meets iha. Ordinary aḥ before a vowel other than short a loses visarga and leaves a. The initial i remains. Keep this boundary gap; do not merge rāma and iha into rāmeha."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-reading-03",
        "kind": "teach",
        "title": {
          "en": "Then join iha and asti.",
          "hi": "Then join iha and asti."
        },
        "body": {
          "en": "This is a different boundary. Final a of iha meets initial a of asti, so the ordinary like-vowel rule gives ā. Ihāsti means ‘is here’. The retained gap before iha does not forbid a valid change at the next original boundary. Apply rules to the original relevant boundaries, not blindly to every new adjacent pair created by a deletion. This distinction prevents both over-joining and under-joining.",
          "hi": "This is a different boundary. Final a of iha meets initial a of asti, so the ordinary like-vowel rule gives ā. Ihāsti means ‘is here’. The retained gap before iha does not forbid a valid change at the next original boundary. Apply rules to the original relevant boundaries, not blindly to every new adjacent pair created by a deletion. This distinction prevents both over-joining and under-joining."
        },
        "example": {
          "sa": "रामः इह अस्ति । सः अपि वनम् गच्छति । → राम इहास्ति । सोऽपि वनं गच्छति ।",
          "iast": "iha + asti → ihāsti",
          "gloss": {
            "en": "a + a → ā",
            "hi": "a + a → ā"
          },
          "alt": {
            "en": "Then join iha and asti.. This is a different boundary. Final a of iha meets initial a of asti, so the ordinary like-vowel rule gives ā. Ihāsti means ‘is here’. The retained gap before iha does not forbid a valid change at the next original boundary.",
            "hi": "Then join iha and asti.. This is a different boundary. Final a of iha meets initial a of asti, so the ordinary like-vowel rule gives ā. Ihāsti means ‘is here’. The retained gap before iha does not forbid a valid change at the next original boundary."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-reading-04",
        "kind": "teach",
        "title": {
          "en": "Recover the pronoun from so’pi.",
          "hi": "Recover the pronoun from so’pi."
        },
        "body": {
          "en": "The second sentence begins so’pi. Recover saḥ, ‘he’, and api, ‘also’. The following vowel is short a, so this pronoun uses o’ here. Its exception before consonants would give sa, as in sa gacchati. The pronoun refers back to Rama. Grammar and discourse support this split; the visible o’ mark alone does not identify which word came before it.",
          "hi": "The second sentence begins so’pi. Recover saḥ, ‘he’, and api, ‘also’. The following vowel is short a, so this pronoun uses o’ here. Its exception before consonants would give sa, as in sa gacchati. The pronoun refers back to Rama. Grammar and discourse support this split; the visible o’ mark alone does not identify which word came before it."
        },
        "example": {
          "sa": "रामः इह अस्ति । सः अपि वनम् गच्छति । → राम इहास्ति । सोऽपि वनं गच्छति ।",
          "iast": "saḥ + api → so’pi",
          "gloss": {
            "en": "saḥ + short a → o’",
            "hi": "saḥ + short a → o’"
          },
          "alt": {
            "en": "Recover the pronoun from so’pi.. The second sentence begins so’pi. Recover saḥ, ‘he’, and api, ‘also’. The following vowel is short a, so this pronoun uses o’ here. Its exception before consonants would give sa, as in sa gacchati.",
            "hi": "Recover the pronoun from so’pi.. The second sentence begins so’pi. Recover saḥ, ‘he’, and api, ‘also’. The following vowel is short a, so this pronoun uses o’ here. Its exception before consonants would give sa, as in sa gacchati."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-reading-05",
        "kind": "teach",
        "title": {
          "en": "The dot recovers final m.",
          "hi": "The dot recovers final m."
        },
        "body": {
          "en": "Vanaṃ before gacchati comes from vanam, ‘to the forest’. Final m changes to anusvāra before a consonant. Restoring the word ending lets you recognise its grammatical function and understand where the person is going. The reading has no hidden extra example. Keep the same sentence visible while explaining the nasal, then reassemble it with all the earlier changes.",
          "hi": "Vanaṃ before gacchati comes from vanam, ‘to the forest’. Final m changes to anusvāra before a consonant. Restoring the word ending lets you recognise its grammatical function and understand where the person is going. The reading has no hidden extra example. Keep the same sentence visible while explaining the nasal, then reassemble it with all the earlier changes."
        },
        "example": {
          "sa": "रामः इह अस्ति । सः अपि वनम् गच्छति । → राम इहास्ति । सोऽपि वनं गच्छति ।",
          "iast": "vanam + gacchati → vanaṃ gacchati",
          "gloss": {
            "en": "m + g → anusvāra",
            "hi": "m + g → anusvāra"
          },
          "alt": {
            "en": "The dot recovers final m.. Vanaṃ before gacchati comes from vanam, ‘to the forest’. Final m changes to anusvāra before a consonant. Restoring the word ending lets you recognise its grammatical function and understand where the person is going.",
            "hi": "The dot recovers final m.. Vanaṃ before gacchati comes from vanam, ‘to the forest’. Final m changes to anusvāra before a consonant. Restoring the word ending lets you recognise its grammatical function and understand where the person is going."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-reading-06",
        "kind": "teach",
        "title": {
          "en": "Put meaning and sound back together.",
          "hi": "Put meaning and sound back together."
        },
        "body": {
          "en": "Read it again with meaning: ‘Rama is here. He too goes to the forest.’ You can now explain visarga loss, like-vowel merger, the pronoun’s o’ form, and anusvāra. Each small rule has a place in one coherent reading. Reading progress means you have seen the explanation. A later check should ask you to explain fresh boundaries and recover words without the separated line. Do not label this reading step as mastery.",
          "hi": "Read it again with meaning: ‘Rama is here. He too goes to the forest.’ You can now explain visarga loss, like-vowel merger, the pronoun’s o’ form, and anusvāra. Each small rule has a place in one coherent reading. Reading progress means you have seen the explanation. A later check should ask you to explain fresh boundaries and recover words without the separated line. Do not label this reading step as mastery."
        },
        "example": {
          "sa": "रामः इह अस्ति । सः अपि वनम् गच्छति । → राम इहास्ति । सोऽपि वनं गच्छति ।",
          "iast": "rāma ihāsti. so’pi vanaṃ gacchati.",
          "gloss": {
            "en": "Four boundaries · one passage",
            "hi": "Four boundaries · one passage"
          },
          "alt": {
            "en": "Put meaning and sound back together.. Read it again with meaning: ‘Rama is here. He too goes to the forest.’ You can now explain visarga loss, like-vowel merger, the pronoun’s o’ form, and anusvāra. Each small rule has a place in one coherent reading.",
            "hi": "Put meaning and sound back together.. Read it again with meaning: ‘Rama is here. He too goes to the forest.’ You can now explain visarga loss, like-vowel merger, the pronoun’s o’ form, and anusvāra. Each small rule has a place in one coherent reading."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-reading-07",
        "kind": "teach",
        "title": {
          "en": "Reverse sandhi can have more than one answer.",
          "hi": "Reverse sandhi can have more than one answer."
        },
        "body": {
          "en": "The e result can arise from different short/long inputs. Not every formally possible split produces sensible vocabulary and grammar. Use a dictionary, word forms and sentence meaning to choose a plausible analysis; do not let a reverse-sandhi tool choose blindly. The alternatives here are schematic vowel-boundary candidates, not equally established interpretations of the compound devendra. In genuine reading, ambiguity may require several grammatical parses.",
          "hi": "The e result can arise from different short/long inputs. Not every formally possible split produces sensible vocabulary and grammar. Use a dictionary, word forms and sentence meaning to choose a plausible analysis; do not let a reverse-sandhi tool choose blindly. The alternatives here are schematic vowel-boundary candidates, not equally established interpretations of the compound devendra. In genuine reading, ambiguity may require several grammatical parses."
        },
        "example": {
          "sa": "देव + इन्द्र · देवा + इन्द्र → देवेन्द्र",
          "iast": "deva + indra or devā + indra → devendra",
          "gloss": {
            "en": "Same e · different possible inputs",
            "hi": "Same e · different possible inputs"
          },
          "alt": {
            "en": "Reverse sandhi can have more than one answer.. The e result can arise from different short/long inputs. Not every formally possible split produces sensible vocabulary and grammar. Use a dictionary, word forms and sentence meaning to choose a plausible analysis; do not let a reverse-sandhi tool choose blindly.",
            "hi": "Reverse sandhi can have more than one answer.. The e result can arise from different short/long inputs. Not every formally possible split produces sensible vocabulary and grammar. Use a dictionary, word forms and sentence meaning to choose a plausible analysis; do not let a reverse-sandhi tool choose blindly."
          }
        },
        "assetIds": []
      },
      {
        "id": "sandhi-source-reading-08",
        "kind": "teach",
        "title": {
          "en": "Carry a procedure, not a hundred answers.",
          "hi": "Carry a procedure, not a hundred answers."
        },
        "body": {
          "en": "Find the boundary sounds. Check the ending, word form and setting. Apply the appropriate family rule, including its exceptions. Then test the recovered words against meaning. You now have the common Classical map; return to each rule when it appears in nouns, verbs and real reading. Next learning steps: fresh-text explanation checks, spaced review of confusable cases, compound-specific exceptions, and internal formations within morphology. Vedic accent, recitation variants and exhaustive Pāṇinian rule ordering are separate advanced strands.",
          "hi": "Find the boundary sounds. Check the ending, word form and setting. Apply the appropriate family rule, including its exceptions. Then test the recovered words against meaning. You now have the common Classical map; return to each rule when it appears in nouns, verbs and real reading. Next learning steps: fresh-text explanation checks, spaced review of confusable cases, compound-specific exceptions, and internal formations within morphology. Vedic accent, recitation variants and exhaustive Pāṇinian rule ordering are separate advanced strands."
        },
        "example": {
          "sa": "Boundary → family → setting → rule → meaning → Read · separate · explain",
          "iast": "Forward joining and reverse reading",
          "gloss": {
            "en": "A usable chapter outcome",
            "hi": "A usable chapter outcome"
          },
          "alt": {
            "en": "Carry a procedure, not a hundred answers.. Find the boundary sounds. Check the ending, word form and setting. Apply the appropriate family rule, including its exceptions. Then test the recovered words against meaning. You now have the common Classical map; return to each rule when it appears in nouns, verbs and real reading.",
            "hi": "Carry a procedure, not a hundred answers.. Find the boundary sounds. Check the ending, word form and setting. Apply the appropriate family rule, including its exceptions. Then test the recovered words against meaning. You now have the common Classical map; return to each rule when it appears in nouns, verbs and real reading."
          }
        },
        "assetIds": []
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Sandhi manuscript · Chapter synthesis; original teaching passage. Source reading; no assessed mastery.",
      "hi": "Existing English Sandhi manuscript · Chapter synthesis; original teaching passage. Source reading; no assessed mastery."
    }
  },
  {
    "id": "verse-01",
    "rank": 1,
    "unit": {
      "en": "Hear the building blocks",
      "hi": "Hear the building blocks"
    },
    "title": {
      "en": "A verse has more than one kind of rhythm",
      "hi": "A verse has more than one kind of rhythm"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Separate syllable count, weight and recitation.",
      "hi": "Separate syllable count, weight and recitation."
    },
    "minutes": 7,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/1-Samjnabhidhana.htm",
      "https://www.sanskrit-lexicon.uni-koeln.de/scans/csldev/csldoc/build/dictionaries/prefaces/ap90app1.html"
    ],
    "cards": [
      {
        "id": "verse-01-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "Say a short line slowly. Some syllables take more room than others, but that does not mean they must be louder. Metre is a recurring arrangement of syllables or time units. A melody is one way to perform it.",
          "hi": "Say a short line slowly. Some syllables take more room than others, but that does not mean they must be louder. Metre is a recurring arrangement of syllables or time units. A melody is one way to perform it."
        }
      },
      {
        "id": "verse-01-02",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "We will first learn what the text prescribes, then return to how a reader gives the verse life.",
          "hi": "We will first learn what the text prescribes, then return to how a reader gives the verse life."
        }
      },
      {
        "id": "verse-01-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "क · का | ka · kā — Both have one vowel and therefore one syllable. The vowel in kā is long; the vowel in ka is short.",
          "hi": "क · का | ka · kā — Both have one vowel and therefore one syllable. The vowel in kā is long; the vowel in ka is short."
        }
      },
      {
        "id": "verse-01-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "A spoken verse and a sung verse — The tune may change while the underlying metrical pattern stays the same. Do not count musical notes as Sanskrit syllables.",
          "hi": "A spoken verse and a sung verse — The tune may change while the underlying metrical pattern stays the same. Do not count musical notes as Sanskrit syllables."
        },
        "assetIds": [
          "verse-01-spoken",
          "verse-01-sung"
        ]
      },
      {
        "id": "verse-01-05",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Keep three layers separate: the sounds in the text, the metrical positions they occupy, and the performance. Our L/G notation describes metrical weight; it does not specify pitch, emotion or loudness. A mātrā is a relative unit for analysis, not a command to pronounce every syllable for a fixed number of milliseconds.",
          "hi": "Keep three layers separate: the sounds in the text, the metrical positions they occupy, and the performance. Our L/G notation describes metrical weight; it does not specify pitch, emotion or loudness. A mātrā is a relative unit for analysis, not a command to pronounce every syllable for a fixed number of milliseconds."
        }
      },
      {
        "id": "verse-01-06",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: Does a louder ka automatically become guru?",
          "hi": "Reflect: Does a louder ka automatically become guru?"
        }
      },
      {
        "id": "verse-01-07",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: No. Loudness is not a cause of metrical weight. Look at vowel length and the sounds that follow.",
          "hi": "Explanation: No. Loudness is not a cause of metrical weight. Look at vowel length and the sounds that follow."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-02",
    "rank": 2,
    "unit": {
      "en": "Hear the building blocks",
      "hi": "Hear the building blocks"
    },
    "title": {
      "en": "Find the vowel; find the syllable",
      "hi": "Find the vowel; find the syllable"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Count vowel nuclei rather than written shapes.",
      "hi": "Count vowel nuclei rather than written shapes."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://www.learnsanskrit.org/guide/core/syllables/",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/1-Samjnabhidhana.htm"
    ],
    "cards": [
      {
        "id": "verse-02-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "Each Sanskrit syllable has one vowel. A consonant cluster can look complicated and still belong with a single vowel. Read the sound sequence rather than counting Unicode characters, letters or visual blocks.",
          "hi": "Each Sanskrit syllable has one vowel. A consonant cluster can look complicated and still belong with a single vowel. Read the sound sequence rather than counting Unicode characters, letters or visual blocks."
        }
      },
      {
        "id": "verse-02-02",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "In the teaching divisions below, consonants usually stay with the following vowel. This is a traditional way of displaying syllables.",
          "hi": "In the teaching divisions below, consonants usually stay with the following vowel. This is a traditional way of displaying syllables."
        }
      },
      {
        "id": "verse-02-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "योग → यो · ग | yo · ga — Two vowels, two syllables. The dependent vowel sign in यो is not an extra syllable.",
          "hi": "योग → यो · ग | yo · ga — Two vowels, two syllables. The dependent vowel sign in यो is not an extra syllable."
        },
        "assetIds": [
          "verse-02-yoga"
        ]
      },
      {
        "id": "verse-02-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "व्याकरण → व्या · क · र · ण | vyā · ka · ra · ṇa — Four vowels, four syllables. व्य is a consonant combination, not two vowels.",
          "hi": "व्याकरण → व्या · क · र · ण | vyā · ka · ra · ṇa — Four vowels, four syllables. व्य is a consonant combination, not two vowels."
        }
      },
      {
        "id": "verse-02-05",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "क्षेत्र → क्षे · त्र | kṣe · tra — Two syllables. क्ष contains k + ṣ; त्र contains t + r. Neither cluster creates an extra vowel.",
          "hi": "क्षेत्र → क्षे · त्र | kṣe · tra — Two syllables. क्ष contains k + ṣ; त्र contains t + r. Neither cluster creates an extra vowel."
        },
        "assetIds": [
          "verse-02-field"
        ]
      },
      {
        "id": "verse-02-06",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "A final consonant joins the preceding syllable: सुखम् → सु · खम्. Anusvāra and visarga also stay with their preceding vowel. You may see phonetic divisions such as dhar-ma elsewhere and traditional divisions such as dha-rma here. These place written consonants differently; they must give the same vowel count and weight analysis.",
          "hi": "A final consonant joins the preceding syllable: सुखम् → सु · खम्. Anusvāra and visarga also stay with their preceding vowel. You may see phonetic divisions such as dhar-ma elsewhere and traditional divisions such as dha-rma here. These place written consonants differently; they must give the same vowel count and weight analysis."
        }
      },
      {
        "id": "verse-02-07",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: How many syllables are in मित्रम् (mitram)?",
          "hi": "Reflect: How many syllables are in मित्रम् (mitram)?"
        }
      },
      {
        "id": "verse-02-08",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: Two: mi-tram. The cluster tr does not create a vowel, and final m is not a separate syllable.",
          "hi": "Explanation: Two: mi-tram. The cluster tr does not create a vowel, and final m is not a separate syllable."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-03",
    "rank": 3,
    "unit": {
      "en": "Hear the building blocks",
      "hi": "Hear the building blocks"
    },
    "title": {
      "en": "Vowel length without guessing",
      "hi": "Vowel length without guessing"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Recognize the short and long vowel inventories.",
      "hi": "Recognize the short and long vowel inventories."
    },
    "minutes": 7,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://www.sanskrit-lexicon.uni-koeln.de/scans/csldev/csldoc/build/dictionaries/prefaces/ap90app1.html",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/1-Samjnabhidhana.htm"
    ],
    "cards": [
      {
        "id": "verse-03-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "Learn the vowel itself before judging the whole syllable. The ordinary short vowels are a, i, u, ṛ and ḷ. The long vowels are ā, ī, ū, ṝ, e, ai, o and au. E and o count as long in ordinary Classical Sanskrit metre even without a macron in transliteration.",
          "hi": "Learn the vowel itself before judging the whole syllable. The ordinary short vowels are a, i, u, ṛ and ḷ. The long vowels are ā, ī, ū, ṝ, e, ai, o and au. E and o count as long in ordinary Classical Sanskrit metre even without a macron in transliteration."
        }
      },
      {
        "id": "verse-03-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "अ आ · इ ई · उ ऊ — These pairs make the length contrast visible. Short and long are part of the word, not expressive choices.",
          "hi": "अ आ · इ ई · उ ऊ — These pairs make the length contrast visible. Short and long are part of the word, not expressive choices."
        }
      },
      {
        "id": "verse-03-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "ऋ and रि | ṛ and ri — Ṛ is a vowel; r is a consonant in ri. Both examples have one vowel, but different sounds.",
          "hi": "ऋ and रि | ṛ and ri — Ṛ is a vowel; r is a consonant in ri. Both examples have one vowel, but different sounds."
        }
      },
      {
        "id": "verse-03-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "ए ऐ ओ औ | e ai o au — Each is one long vowel nucleus. Ai and au are not two metrical syllables.",
          "hi": "ए ऐ ओ औ | e ai o au — Each is one long vowel nucleus. Ai and au are not two metrical syllables."
        }
      },
      {
        "id": "verse-03-05",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Ṝ is rare and ḷ is very rare; rarity does not remove them from the system. Pluta, an explicitly prolonged vowel often marked with 3, belongs to a separate discussion of phonetics and recitation. Do not turn every pluta into an ordinary third weight category in Classical L/G pattern matching.",
          "hi": "Ṝ is rare and ḷ is very rare; rarity does not remove them from the system. Pluta, an explicitly prolonged vowel often marked with 3, belongs to a separate discussion of phonetics and recitation. Do not turn every pluta into an ordinary third weight category in Classical L/G pattern matching."
        }
      },
      {
        "id": "verse-03-06",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: Is दे (de) light because e has no macron?",
          "hi": "Reflect: Is दे (de) light because e has no macron?"
        }
      },
      {
        "id": "verse-03-07",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: No. E is a long vowel in ordinary Classical Sanskrit, so de is heavy.",
          "hi": "Explanation: No. E is a long vowel in ordinary Classical Sanskrit, so de is heavy."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-04",
    "rank": 4,
    "unit": {
      "en": "Hear the building blocks",
      "hi": "Hear the building blocks"
    },
    "title": {
      "en": "From syllable to pāda to stanza",
      "hi": "From syllable to pāda to stanza"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Locate quarters before trying to identify a metre.",
      "hi": "Locate quarters before trying to identify a metre."
    },
    "minutes": 6,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://www.learnsanskrit.org/guide/core/syllables/",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/1-Samjnabhidhana.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Chandas-Sastra/Chandas-Sastra-03.htm"
    ],
    "cards": [
      {
        "id": "verse-04-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "A pāda is a metrical division of a verse. Many Classical Sanskrit stanzas have four pādas. Editions often print them on two lines, so a printed line can contain two pādas. A line break caused by a small screen is not a metrical boundary.",
          "hi": "A pāda is a metrical division of a verse. Many Classical Sanskrit stanzas have four pādas. Editions often print them on two lines, so a printed line can contain two pādas. A line break caused by a small screen is not a metrical boundary."
        }
      },
      {
        "id": "verse-04-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "धर्मक्षेत्रे कुरुक्षेत्रे / समवेता युयुत्सवः — The first two pādas of Bhagavadgītā 1.1. Each has eight syllables. Together they make the first half of the stanza.",
          "hi": "धर्मक्षेत्रे कुरुक्षेत्रे / समवेता युयुत्सवः — The first two pādas of Bhagavadgītā 1.1. Each has eight syllables. Together they make the first half of the stanza."
        },
        "assetIds": [
          "verse-04-assembly"
        ]
      },
      {
        "id": "verse-04-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "मामकाः पाण्डवाश्चैव / किमकुर्वत सञ्जय — The remaining two pādas. The question continues through the verse: what did my people and the Pāṇḍavas do?",
          "hi": "मामकाः पाण्डवाश्चैव / किमकुर्वत सञ्जय — The remaining two pādas. The question continues through the verse: what did my people and the Pāṇḍavas do?"
        }
      },
      {
        "id": "verse-04-04",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "The single daṇḍa । and double daṇḍa ॥ are useful editorial clues, but layout and punctuation are not enough to establish a metre. Vedic stanzas can have different numbers of pādas: Gāyatrī commonly has three. Start with the text and its tradition; do not force every poem into four equal quarters.",
          "hi": "The single daṇḍa । and double daṇḍa ॥ are useful editorial clues, but layout and punctuation are not enough to establish a metre. Vedic stanzas can have different numbers of pādas: Gāyatrī commonly has three. Start with the text and its tradition; do not force every poem into four equal quarters."
        }
      },
      {
        "id": "verse-04-05",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: A verse occupies four lines on a phone. Must it have four pādas?",
          "hi": "Reflect: A verse occupies four lines on a phone. Must it have four pādas?"
        }
      },
      {
        "id": "verse-04-06",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: No. Screen wrapping has no metrical authority. Find the verse structure from its source and pattern.",
          "hi": "Explanation: No. Screen wrapping has no metrical authority. Find the verse structure from its source and pattern."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-05",
    "rank": 5,
    "unit": {
      "en": "Light and heavy: every common case",
      "hi": "Light and heavy: every common case"
    },
    "title": {
      "en": "The light case: know the baseline",
      "hi": "The light case: know the baseline"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Explain when a short vowel remains laghu.",
      "hi": "Explain when a short vowel remains laghu."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/1-Samjnabhidhana.htm",
      "https://www.sanskrit-lexicon.uni-koeln.de/scans/csldev/csldoc/build/dictionaries/prefaces/ap90app1.html"
    ],
    "cards": [
      {
        "id": "verse-05-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "A short vowel is the starting point for a light syllable. It stays light when no following closure or cluster makes it heavy. Within a continuous phrase, a single consonant before the next vowel does not normally make the preceding short vowel heavy.",
          "hi": "A short vowel is the starting point for a light syllable. It stays light when no following closure or cluster makes it heavy. Within a continuous phrase, a single consonant before the next vowel does not normally make the preceding short vowel heavy."
        },
        "assetIds": [
          "verse-05-teacher"
        ]
      },
      {
        "id": "verse-05-02",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "Use L for laghu and G for guru. We will always give the reason as well as the label.",
          "hi": "Use L for laghu and G for guru. We will always give the reason as well as the label."
        }
      },
      {
        "id": "verse-05-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "कवि → क · वि | ka · vi — Both vowels are short. Ka is L before the single v. Vi is naturally L when considered apart from any following context or metrical ending.",
          "hi": "कवि → क · वि | ka · vi — Both vowels are short. Ka is L before the single v. Vi is naturally L when considered apart from any following context or metrical ending."
        },
        "assetIds": [
          "verse-05-poet"
        ]
      },
      {
        "id": "verse-05-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "गुरु → गु · रु | gu · ru — Both syllables are naturally light in isolation. The word guru, meaning heavy or teacher, does not itself consist of two heavy syllables.",
          "hi": "गुरु → गु · रु | gu · ru — Both syllables are naturally light in isolation. The word guru, meaning heavy or teacher, does not itself consist of two heavy syllables."
        }
      },
      {
        "id": "verse-05-05",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "कृपा → कृ · पा | kṛ · pā — Kṛ is L before one consonant p; pā is G because ā is long.",
          "hi": "कृपा → कृ · पा | kṛ · pā — Kṛ is L before one consonant p; pā is G because ā is long."
        }
      },
      {
        "id": "verse-05-06",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Weight is contextual. A dictionary word does not always have one unchanging pattern in connected verse. For now identify natural weight away from a pāda boundary; later we will distinguish it from the metrical treatment of the final position. This prevents the misleading rule that every final written short vowel must always count L.",
          "hi": "Weight is contextual. A dictionary word does not always have one unchanging pattern in connected verse. For now identify natural weight away from a pāda boundary; later we will distinguish it from the metrical treatment of the final position. This prevents the misleading rule that every final written short vowel must always count L."
        }
      },
      {
        "id": "verse-05-07",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: Why is kṛ in kṛpā light?",
          "hi": "Reflect: Why is kṛ in kṛpā light?"
        }
      },
      {
        "id": "verse-05-08",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: Ṛ is short, and only one consonant, p, comes before the next vowel.",
          "hi": "Explanation: Ṛ is short, and only one consonant, p, comes before the next vowel."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-06",
    "rank": 6,
    "unit": {
      "en": "Light and heavy: every common case",
      "hi": "Light and heavy: every common case"
    },
    "title": {
      "en": "Heavy because the vowel is long",
      "hi": "Heavy because the vowel is long"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Distinguish vowel length from added consonants.",
      "hi": "Distinguish vowel length from added consonants."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/1-Samjnabhidhana.htm",
      "https://www.sanskrit-lexicon.uni-koeln.de/scans/csldev/csldoc/build/dictionaries/prefaces/ap90app1.html"
    ],
    "cards": [
      {
        "id": "verse-06-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "A long vowel makes its syllable heavy. You do not need another reason. A long vowel followed by a cluster is still one heavy syllable; it does not become a four-unit syllable in ordinary Classical scansion.",
          "hi": "A long vowel makes its syllable heavy. You do not need another reason. A long vowel followed by a cluster is still one heavy syllable; it does not become a four-unit syllable in ordinary Classical scansion."
        }
      },
      {
        "id": "verse-06-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "सीता → सी · ता | sī · tā — G G: ī and ā are both long.",
          "hi": "सीता → सी · ता | sī · tā — G G: ī and ā are both long."
        },
        "assetIds": [
          "verse-06-sita"
        ]
      },
      {
        "id": "verse-06-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "देव → दे · व | de · va — G L in natural isolation: e is long; final a is short.",
          "hi": "देव → दे · व | de · va — G L in natural isolation: e is long; final a is short."
        }
      },
      {
        "id": "verse-06-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "कौशल → कौ · श · ल | kau · śa · la — G L L in natural isolation. Au is one long vowel, not a + u counted separately.",
          "hi": "कौशल → कौ · श · ल | kau · śa · la — G L L in natural isolation. Au is one long vowel, not a + u counted separately."
        }
      },
      {
        "id": "verse-06-05",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "कान्ता → का · न्ता | kā · ntā — G G. The first syllable has both a long vowel and following nt; it is not counted twice.",
          "hi": "कान्ता → का · न्ता | kā · ntā — G G. The first syllable has both a long vowel and following nt; it is not counted twice."
        }
      },
      {
        "id": "verse-06-06",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "A useful explanation stores causes separately from the result: kā is heavy by vowel length, and a following cluster also confirms weight. The result remains G = two mātrās for ordinary metrical bookkeeping. Keeping causes visible makes later spelling variants and sandhi changes easier to understand.",
          "hi": "A useful explanation stores causes separately from the result: kā is heavy by vowel length, and a following cluster also confirms weight. The result remains G = two mātrās for ordinary metrical bookkeeping. Keeping causes visible makes later spelling variants and sandhi changes easier to understand."
        }
      },
      {
        "id": "verse-06-07",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: How many mātrās does kā in kāntā contribute to ordinary scansion?",
          "hi": "Reflect: How many mātrās does kā in kāntā contribute to ordinary scansion?"
        }
      },
      {
        "id": "verse-06-08",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: Two, not four. Multiple causes of heaviness do not add separate penalties.",
          "hi": "Explanation: Two, not four. Multiple causes of heaviness do not add separate penalties."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-07",
    "rank": 7,
    "unit": {
      "en": "Light and heavy: every common case",
      "hi": "Light and heavy: every common case"
    },
    "title": {
      "en": "Heavy before a consonant cluster",
      "hi": "Heavy before a consonant cluster"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Look forward from the vowel, not at the size of the letter.",
      "hi": "Look forward from the vowel, not at the size of the letter."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/1-Samjnabhidhana.htm",
      "https://www.sanskrit-lexicon.uni-koeln.de/scans/csldev/csldoc/build/dictionaries/prefaces/ap90app1.html"
    ],
    "cards": [
      {
        "id": "verse-07-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "A short vowel followed by two or more consonants before the next vowel is normally heavy. The cluster affects the preceding vowel’s syllable. Its printed position can mislead you: a cluster at the start of a syllable does not by itself make that syllable heavy.",
          "hi": "A short vowel followed by two or more consonants before the next vowel is normally heavy. The cluster affects the preceding vowel’s syllable. Its printed position can mislead you: a cluster at the start of a syllable does not by itself make that syllable heavy."
        }
      },
      {
        "id": "verse-07-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "अग्नि → अ · ग्नि | a · gni — A is G before g + n. Gni is naturally L: its i is short and the initial gn does not make that i heavy.",
          "hi": "अग्नि → अ · ग्नि | a · gni — A is G before g + n. Gni is naturally L: its i is short and the initial gn does not make that i heavy."
        },
        "assetIds": [
          "verse-07-fire"
        ]
      },
      {
        "id": "verse-07-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "मित्र → मि · त्र | mi · tra — Mi is G before t + r. Tra is naturally L in isolation.",
          "hi": "मित्र → मि · त्र | mi · tra — Mi is G before t + r. Tra is naturally L in isolation."
        },
        "assetIds": [
          "verse-07-friend"
        ]
      },
      {
        "id": "verse-07-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "बुद्ध → बु · द्ध | bu · ddha — Bu is G before d + dh. Dh is one aspirated consonant; ddh represents two consonants.",
          "hi": "बुद्ध → बु · द्ध | bu · ddha — Bu is G before d + dh. Dh is one aspirated consonant; ddh represents two consonants."
        }
      },
      {
        "id": "verse-07-05",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "कथा → क · था | ka · thā — Ka is L: th is one aspirated consonant, not a cluster t + h. Thā is G from ā.",
          "hi": "कथा → क · था | ka · thā — Ka is L: th is one aspirated consonant, not a cluster t + h. Thā is G from ā."
        },
        "assetIds": [
          "verse-07-story"
        ]
      },
      {
        "id": "verse-07-06",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "The relevant unit is a consonant sound. Kh, gh, ch, jh, ṭh, ḍh, th, dh, ph and bh each represent one aspirated consonant in IAST. Kṣ, tr and jñ are clusters. Double consonants matter too. The small set of attested poetic exceptions will be taught separately, so the normal rule stays dependable.",
          "hi": "The relevant unit is a consonant sound. Kh, gh, ch, jh, ṭh, ḍh, th, dh, ph and bh each represent one aspirated consonant in IAST. Kṣ, tr and jñ are clusters. Double consonants matter too. The small set of attested poetic exceptions will be taught separately, so the normal rule stays dependable."
        }
      },
      {
        "id": "verse-07-07",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: Which first syllable is heavy: kathā or kattā?",
          "hi": "Reflect: Which first syllable is heavy: kathā or kattā?"
        }
      },
      {
        "id": "verse-07-08",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: Kattā: tt is a cluster. In kathā, th is a single aspirated consonant and ka remains light. These are sound contrasts, not a vocabulary exercise.",
          "hi": "Explanation: Kattā: tt is a cluster. In kathā, th is a single aspirated consonant and ka remains light. These are sound contrasts, not a vocabulary exercise."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-08",
    "rank": 8,
    "unit": {
      "en": "Light and heavy: every common case",
      "hi": "Light and heavy: every common case"
    },
    "title": {
      "en": "Anusvāra, visarga and final closure",
      "hi": "Anusvāra, visarga and final closure"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Handle the other common causes of heaviness.",
      "hi": "Handle the other common causes of heaviness."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/1-Samjnabhidhana.htm",
      "https://www.learnsanskrit.org/guide/core/syllables/"
    ],
    "cards": [
      {
        "id": "verse-08-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "A syllable with anusvāra ṃ or visarga ḥ is heavy in ordinary scansion. Neither sign adds a new syllable. A genuinely closed syllable at a pause is heavy too; when words connect, inspect the resulting sound sequence rather than automatically closing every written word.",
          "hi": "A syllable with anusvāra ṃ or visarga ḥ is heavy in ordinary scansion. Neither sign adds a new syllable. A genuinely closed syllable at a pause is heavy too; when words connect, inspect the resulting sound sequence rather than automatically closing every written word."
        }
      },
      {
        "id": "verse-08-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "संस्कृतम् → सं · स्कृ · तम् | saṃ · skṛ · tam — G L G at a pause. Saṃ has anusvāra; skṛ has short ṛ followed by one t; tam is closed by final m.",
          "hi": "संस्कृतम् → सं · स्कृ · तम् | saṃ · skṛ · tam — G L G at a pause. Saṃ has anusvāra; skṛ has short ṛ followed by one t; tam is closed by final m."
        }
      },
      {
        "id": "verse-08-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "दुःख → दुः · ख | duḥ · kha — G L in natural isolation. Visarga makes duḥ heavy; it does not add a vowel after u.",
          "hi": "दुःख → दुः · ख | duḥ · kha — G L in natural isolation. Visarga makes duḥ heavy; it does not add a vowel after u."
        },
        "assetIds": [
          "verse-08-sorrow"
        ]
      },
      {
        "id": "verse-08-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "रामः → रा · मः | rā · maḥ — G G: the first from long ā, the second from visarga.",
          "hi": "रामः → रा · मः | rā · maḥ — G G: the first from long ā, the second from visarga."
        }
      },
      {
        "id": "verse-08-05",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "तत् | tat, at a pause — One closed, heavy syllable. Do not pronounce a new a after t.",
          "hi": "तत् | tat, at a pause — One closed, heavy syllable. Do not pronounce a new a after t."
        }
      },
      {
        "id": "verse-08-06",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Anusvāra may be represented or pronounced through a homorganic nasal before a stop; the nasal-plus-stop sequence still supports heaviness. Candrabindu marks nasalization and should not simply be processed as another spelling of anusvāra in every tradition. For unusual notation, consult the source’s pronunciation conventions.",
          "hi": "Anusvāra may be represented or pronounced through a homorganic nasal before a stop; the nasal-plus-stop sequence still supports heaviness. Candrabindu marks nasalization and should not simply be processed as another spelling of anusvāra in every tradition. For unusual notation, consult the source’s pronunciation conventions."
        }
      },
      {
        "id": "verse-08-07",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: What is wrong with calling saṃskṛtam G L L at a pause?",
          "hi": "Reflect: What is wrong with calling saṃskṛtam G L L at a pause?"
        }
      },
      {
        "id": "verse-08-08",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: The last syllable tam is closed by m and is heavy. The opening sk cluster does not make skṛ heavy; the final closure does make tam heavy.",
          "hi": "Explanation: The last syllable tam is closed by m and is heavy. The opening sk cluster does not make skṛ heavy; the final closure does make tam heavy."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-09",
    "rank": 9,
    "unit": {
      "en": "What context changes",
      "hi": "What context changes"
    },
    "title": {
      "en": "Word boundaries do not stop the rule",
      "hi": "Word boundaries do not stop the rule"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Scan the connected phrase.",
      "hi": "Scan the connected phrase."
    },
    "minutes": 7,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/1-Samjnabhidhana.htm",
      "https://www.sanskrit-lexicon.uni-koeln.de/scans/csldev/csldoc/build/dictionaries/prefaces/ap90app1.html"
    ],
    "cards": [
      {
        "id": "verse-09-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "Spaces help us read words, but the sounds often continue across them. A final consonant of one word and an initial consonant of the next can form the cluster that makes a preceding short vowel heavy. Conversely, a final consonant before a vowel can join that following vowel in continuous pronunciation.",
          "hi": "Spaces help us read words, but the sounds often continue across them. A final consonant of one word and an initial consonant of the next can form the cluster that makes a preceding short vowel heavy. Conversely, a final consonant before a vowel can join that following vowel in continuous pronunciation."
        }
      },
      {
        "id": "verse-09-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "तत् फलम् | tat phalam — The a in tat is followed by t + ph before the next vowel. It is heavy. Ph counts as one consonant, giving two in total.",
          "hi": "तत् फलम् | tat phalam — The a in tat is followed by t + ph before the next vowel. It is heavy. Ph counts as one consonant, giving two in total."
        }
      },
      {
        "id": "verse-09-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "तदपि | tad api → ta · da · pi — The first a is followed by one d before the next vowel. Ta is light in this continuous phrase.",
          "hi": "तदपि | tad api → ta · da · pi — The first a is followed by one d before the next vowel. Ta is light in this continuous phrase."
        }
      },
      {
        "id": "verse-09-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "कुरुक्षेत्रे | ku · ru · kṣe · tre — Ku is L before r alone. Ru is G before k + ṣ. Kṣe and tre are G from long e.",
          "hi": "कुरुक्षेत्रे | ku · ru · kṣe · tre — Ku is L before r alone. Ru is G before k + ṣ. Kṣe and tre are G from long e."
        }
      },
      {
        "id": "verse-09-05",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "First decide what text is actually being read: the continuous form with sandhi, a word-separated aid, or a deliberately paused recitation. A grammatical word division is not automatically a metrical pause. Scan the continuous verse, and show the separated form alongside it only as a meaning aid.",
          "hi": "First decide what text is actually being read: the continuous form with sandhi, a word-separated aid, or a deliberately paused recitation. A grammatical word division is not automatically a metrical pause. Scan the continuous verse, and show the separated form alongside it only as a meaning aid."
        }
      },
      {
        "id": "verse-09-06",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: Can the same short vowel change weight when the next word changes?",
          "hi": "Reflect: Can the same short vowel change weight when the next word changes?"
        }
      },
      {
        "id": "verse-09-07",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: Yes. Its following consonant environment can change. This is why whole-phrase examples must follow isolated-word examples.",
          "hi": "Explanation: Yes. Its following consonant environment can change. This is why whole-phrase examples must follow isolated-word examples."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-10",
    "rank": 10,
    "unit": {
      "en": "What context changes",
      "hi": "What context changes"
    },
    "title": {
      "en": "Sandhi changes what you count",
      "hi": "Sandhi changes what you count"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Keep the reading text and grammatical analysis side by side.",
      "hi": "Keep the reading text and grammatical analysis side by side."
    },
    "minutes": 7,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://www.learnsanskrit.org/guide/core/syllables/",
      "https://www.sanskrit-lexicon.uni-koeln.de/scans/csldev/csldoc/build/dictionaries/prefaces/ap90app1.html"
    ],
    "cards": [
      {
        "id": "verse-10-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "Sandhi joins sounds at word boundaries. It may merge two vowels into one or change the consonants you must inspect. Count the vowels in the form the verse actually uses, not in an expanded word-by-word gloss.",
          "hi": "Sandhi joins sounds at word boundaries. It may merge two vowels into one or change the consonants you must inspect. Count the vowels in the form the verse actually uses, not in an expanded word-by-word gloss."
        }
      },
      {
        "id": "verse-10-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "देव + आलय → देवालय | deva + ālaya → devālaya — The boundary a + ā becomes ā. The two separate words have five vowels in total; the combined form has four syllables: de-vā-la-ya.",
          "hi": "देव + आलय → देवालय | deva + ālaya → devālaya — The boundary a + ā becomes ā. The two separate words have five vowels in total; the combined form has four syllables: de-vā-la-ya."
        },
        "assetIds": [
          "verse-10-temple"
        ]
      },
      {
        "id": "verse-10-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "च + एव → चैव | ca + eva → caiva — Three vowels across the separated forms become two syllables in caiva: cai-va. Ai is one long vowel.",
          "hi": "च + एव → चैव | ca + eva → caiva — Three vowels across the separated forms become two syllables in caiva: cai-va. Ai is one long vowel."
        }
      },
      {
        "id": "verse-10-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "ते + अपि → तेऽपि | te + api → te’pi — The avagraha marks the elided a. It is not an extra syllable: the written connected form has te-pi.",
          "hi": "ते + अपि → तेऽपि | te + api → te’pi — The avagraha marks the elided a. It is not an extra syllable: the written connected form has te-pi."
        }
      },
      {
        "id": "verse-10-05",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Do not apply every conceivable sandhi merely to force a match. Start with an edited text. Where an edition preserves hiatus, separates forms for instruction, or reports alternatives, record that fact. For Vedic texts the relation between the received wording, sandhi and metrical reconstruction needs its own treatment.",
          "hi": "Do not apply every conceivable sandhi merely to force a match. Start with an edited text. Where an edition preserves hiatus, separates forms for instruction, or reports alternatives, record that fact. For Vedic texts the relation between the received wording, sandhi and metrical reconstruction needs its own treatment."
        }
      },
      {
        "id": "verse-10-06",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: Should the avagraha in te’pi receive its own L or G?",
          "hi": "Reflect: Should the avagraha in te’pi receive its own L or G?"
        }
      },
      {
        "id": "verse-10-07",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: No. It marks an omitted vowel, not a pronounced extra syllable.",
          "hi": "Explanation: No. It marks an omitted vowel, not a pronounced extra syllable."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-11",
    "rank": 11,
    "unit": {
      "en": "What context changes",
      "hi": "What context changes"
    },
    "title": {
      "en": "The last position is special",
      "hi": "The last position is special"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Separate natural weight from metrical allowance.",
      "hi": "Separate natural weight from metrical allowance."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/1-Samjnabhidhana.htm",
      "https://gallium.inria.fr/~huet/PUBLIC/WSC2018.pdf#page=142"
    ],
    "cards": [
      {
        "id": "verse-11-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "At a pāda ending, a naturally light syllable can often occupy a position treated as heavy. Mark it as final allowance rather than pretending its vowel became long everywhere. X is useful for an ending that permits either weight.",
          "hi": "At a pāda ending, a naturally light syllable can often occupy a position treated as heavy. Mark it as final allowance rather than pretending its vowel became long everywhere. X is useful for an ending that permits either weight."
        }
      },
      {
        "id": "verse-11-02",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "This is an ending rule, not permission to replace light and heavy freely inside the line.",
          "hi": "This is an ending rule, not permission to replace light and heavy freely inside the line."
        }
      },
      {
        "id": "verse-11-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "सञ्जय | sañ · ja · ya, at the end of Gītā 1.1 — The final ya is naturally light. The śloka ending permits it; the verse need not be “corrected” to yā.",
          "hi": "सञ्जय | sañ · ja · ya, at the end of Gītā 1.1 — The final ya is naturally light. The śloka ending permits it; the verse need not be “corrected” to yā."
        }
      },
      {
        "id": "verse-11-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Interior कु in कुरुक्षेत्रे — Ku is not at the pāda end. You cannot use final allowance to make it heavy.",
          "hi": "Interior कु in कुरुक्षेत्रे — Ku is not at the pāda end. You cannot use final allowance to make it heavy."
        }
      },
      {
        "id": "verse-11-05",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Pattern ending … L G L X — X records an indifferent final position in our teaching notation. It is not a third kind of Sanskrit vowel.",
          "hi": "Pattern ending … L G L X — X records an indifferent final position in our teaching notation. It is not a third kind of Sanskrit vowel."
        }
      },
      {
        "id": "verse-11-06",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Traditional summaries often state the final option broadly. Actual usage differs with the metre and with odd versus even pāda endings; some forms explicitly prescribe a light ending. Keep the observed pronunciation and the pattern match as separate annotations. When a rare case is doubtful, check that metre’s examples and commentary instead of invoking a universal exception.",
          "hi": "Traditional summaries often state the final option broadly. Actual usage differs with the metre and with odd versus even pāda endings; some forms explicitly prescribe a light ending. Keep the observed pronunciation and the pattern match as separate annotations. When a rare case is doubtful, check that metre’s examples and commentary instead of invoking a universal exception."
        }
      },
      {
        "id": "verse-11-07",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: May you lengthen any short syllable until a verse fits?",
          "hi": "Reflect: May you lengthen any short syllable until a verse fits?"
        }
      },
      {
        "id": "verse-11-08",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: No. Identify a specific permitted position or attested license. Otherwise retain the mismatch and investigate it.",
          "hi": "Explanation: No. Identify a specific permitted position or attested license. Otherwise retain the mismatch and investigate it."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-12",
    "rank": 12,
    "unit": {
      "en": "What context changes",
      "hi": "What context changes"
    },
    "title": {
      "en": "Exceptions without destroying the rule",
      "hi": "Exceptions without destroying the rule"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Recognize a documented license and resist inventing one.",
      "hi": "Recognize a documented license and resist inventing one."
    },
    "minutes": 7,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/1-Samjnabhidhana.htm",
      "https://www.sanskrit-lexicon.uni-koeln.de/scans/csldev/csldoc/build/dictionaries/prefaces/ap90app1.html"
    ],
    "cards": [
      {
        "id": "verse-12-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "A small number of passages allow a short vowel before certain consonant combinations to scan light. Learn these after the normal cluster rule. An exception is tied to evidence in a text and its metrical tradition; it is not an alternative pronunciation menu.",
          "hi": "A small number of passages allow a short vowel before certain consonant combinations to scan light. Learn these after the normal cluster rule. An exception is tied to evidence in a text and its metrical tradition; it is not an alternative pronunciation menu."
        }
      },
      {
        "id": "verse-12-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "sundari grāmyajanaḥ in Vṛttaratnākara 1.11 — The primary example scans final ri of sundari light before gr. This demonstrates a licensed exception to ordinary cluster weight.",
          "hi": "sundari grāmyajanaḥ in Vṛttaratnākara 1.11 — The primary example scans final ri of sundari light before gr. This demonstrates a licensed exception to ordinary cluster weight."
        }
      },
      {
        "id": "verse-12-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "अग्नि | agni — Continue to treat a as heavy before gn. The existence of some cluster exceptions does not weaken every cluster.",
          "hi": "अग्नि | agni — Continue to treat a as heavy before gn. The existence of some cluster exceptions does not weaken every cluster."
        }
      },
      {
        "id": "verse-12-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "A line with one extra vowel — Cluster license changes weight, not the number of vowel nuclei. It will not repair a wrong syllable count.",
          "hi": "A line with one extra vowel — Cluster license changes weight, not the number of vowel nuclei. It will not repair a wrong syllable count."
        }
      },
      {
        "id": "verse-12-05",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "When a scan fails, investigate in order: your vowel count, aspirates versus clusters, sandhi, quarter boundaries, the edition, then a documented license. A manuscript variant and a poetic license are different explanations. Preserve the source reading and the reason for any alternative analysis; never silently replace the text to make the pattern look clean.",
          "hi": "When a scan fails, investigate in order: your vowel count, aspirates versus clusters, sandhi, quarter boundaries, the edition, then a documented license. A manuscript variant and a poetic license are different explanations. Preserve the source reading and the reason for any alternative analysis; never silently replace the text to make the pattern look clean."
        }
      },
      {
        "id": "verse-12-06",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: What evidence should support an unusual light syllable before a cluster?",
          "hi": "Reflect: What evidence should support an unusual light syllable before a cluster?"
        }
      },
      {
        "id": "verse-12-07",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: A relevant metrical rule or attested usage with a reliable edition or commentary—not merely the desire to obtain a familiar pattern.",
          "hi": "Explanation: A relevant metrical rule or attested usage with a reliable edition or commentary—not merely the desire to obtain a familiar pattern."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-13",
    "rank": 13,
    "unit": {
      "en": "Scan an entire verse",
      "hi": "Scan an entire verse"
    },
    "title": {
      "en": "One pāda, every reason visible",
      "hi": "One pāda, every reason visible"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Complete a scan without guessing from the metre.",
      "hi": "Complete a scan without guessing from the metre."
    },
    "minutes": 7,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://www.learnsanskrit.org/guide/core/syllables/",
      "https://www.sanskrit-lexicon.uni-koeln.de/scans/csldev/csldoc/build/dictionaries/prefaces/ap90app1.html"
    ],
    "cards": [
      {
        "id": "verse-13-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "Begin with धर्मक्षेत्रे कुरुक्षेत्रे, the opening pāda of Bhagavadgītā 1.1. Count eight vowels. Now assign weight from left to right, giving a reason at each position. Only after that should you compare the result with a metrical pattern.",
          "hi": "Begin with धर्मक्षेत्रे कुरुक्षेत्रे, the opening pāda of Bhagavadgītā 1.1. Count eight vowels. Now assign weight from left to right, giving a reason at each position. Only after that should you compare the result with a metrical pattern."
        }
      },
      {
        "id": "verse-13-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "ध · र्म · क्षे · त्रे | dha · rma · kṣe · tre — G G G G. Dha is heavy before r+m; rma before k+ṣ; kṣe and tre contain long e.",
          "hi": "ध · र्म · क्षे · त्रे | dha · rma · kṣe · tre — G G G G. Dha is heavy before r+m; rma before k+ṣ; kṣe and tre contain long e."
        }
      },
      {
        "id": "verse-13-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "कु · रु · क्षे · त्रे | ku · ru · kṣe · tre — L G G G. Ku is light before r alone; ru is heavy before k+ṣ; both e vowels are long.",
          "hi": "कु · रु · क्षे · त्रे | ku · ru · kṣe · tre — L G G G. Ku is light before r alone; ru is heavy before k+ṣ; both e vowels are long."
        }
      },
      {
        "id": "verse-13-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "G G G G L G G G — Eight syllables, seven heavy and one light: 7×2 + 1 = 15 mātrās. Eight syllables does not mean eight equal time units.",
          "hi": "G G G G L G G G — Eight syllables, seven heavy and one light: 7×2 + 1 = 15 mātrās. Eight syllables does not mean eight equal time units."
        }
      },
      {
        "id": "verse-13-05",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "The traditional spelling division dha-rma is not claiming that dha is light. Weight looks ahead to the consonants between its vowel and the next vowel. An alternative phonetic division dhar-ma gives the same result. Always be consistent about which display convention you use and explain how it relates to sound.",
          "hi": "The traditional spelling division dha-rma is not claiming that dha is light. Weight looks ahead to the consonants between its vowel and the next vowel. An alternative phonetic division dhar-ma gives the same result. Always be consistent about which display convention you use and explain how it relates to sound."
        }
      },
      {
        "id": "verse-13-06",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: Why is the sixth syllable ru heavy while the fifth ku is light?",
          "hi": "Reflect: Why is the sixth syllable ru heavy while the fifth ku is light?"
        }
      },
      {
        "id": "verse-13-07",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: Ru is followed by the consonants k and ṣ; ku is followed only by r. The vowel u itself is short in both.",
          "hi": "Explanation: Ru is followed by the consonants k and ṣ; ku is followed only by r. The vowel u itself is short in both."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-14",
    "rank": 14,
    "unit": {
      "en": "Scan an entire verse",
      "hi": "Scan an entire verse"
    },
    "title": {
      "en": "Two counts tell different stories",
      "hi": "Two counts tell different stories"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Compare akṣara count with mātrā count.",
      "hi": "Compare akṣara count with mātrā count."
    },
    "minutes": 7,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/1-Samjnabhidhana.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/2-Matravrtta-01.htm"
    ],
    "cards": [
      {
        "id": "verse-14-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "Syllable count asks how many vowel nuclei occur. Mātrā count assigns one to L and two to G in ordinary metrical analysis. Two sequences may have the same number of syllables but different duration totals—or the same duration total but different numbers of syllables.",
          "hi": "Syllable count asks how many vowel nuclei occur. Mātrā count assigns one to L and two to G in ordinary metrical analysis. Two sequences may have the same number of syllables but different duration totals—or the same duration total but different numbers of syllables."
        }
      },
      {
        "id": "verse-14-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "L L L L and G G G G — Both contain four syllables. Their totals are four and eight mātrās.",
          "hi": "L L L L and G G G G — Both contain four syllables. Their totals are four and eight mātrās."
        }
      },
      {
        "id": "verse-14-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "G L L and G G — Both total four mātrās, but the first has three syllables and the second two. They are not freely interchangeable in a fixed syllabic metre.",
          "hi": "G L L and G G — Both total four mātrās, but the first has three syllables and the second two. They are not freely interchangeable in a fixed syllabic metre."
        }
      },
      {
        "id": "verse-14-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "G G G G L G G G — The Gītā opening has eight syllables and fifteen mātrās. Śloka is recognized through syllabic structure, not a universal fifteen-mātrā quota.",
          "hi": "G G G G L G G G — The Gītā opening has eight syllables and fifteen mātrās. Śloka is recognized through syllabic structure, not a universal fifteen-mātrā quota."
        }
      },
      {
        "id": "verse-14-05",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Before identifying a metre, decide which system is being tested. In a varṇavṛtta, syllable positions and their weight matter. In a mātrā metre, totals and internal arrangements matter. “Same total” alone proves neither kind of match. Final allowances need explicit treatment rather than silently changing the arithmetic.",
          "hi": "Before identifying a metre, decide which system is being tested. In a varṇavṛtta, syllable positions and their weight matter. In a mātrā metre, totals and internal arrangements matter. “Same total” alone proves neither kind of match. Final allowances need explicit treatment rather than silently changing the arithmetic."
        }
      },
      {
        "id": "verse-14-06",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: Can G G replace G L L anywhere because both total four?",
          "hi": "Reflect: Can G G replace G L L anywhere because both total four?"
        }
      },
      {
        "id": "verse-14-07",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: No. It changes the syllable count and pattern. Only a metre whose rules permit the relevant alternatives can accept that substitution.",
          "hi": "Explanation: No. It changes the syllable count and pattern. Only a metre whose rules permit the relevant alternatives can accept that substitution."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-15",
    "rank": 15,
    "unit": {
      "en": "Scan an entire verse",
      "hi": "Scan an entire verse"
    },
    "title": {
      "en": "Gaṇas: useful shorthand, not a new obstacle",
      "hi": "Gaṇas: useful shorthand, not a new obstacle"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Read the eight three-syllable groups.",
      "hi": "Read the eight three-syllable groups."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/1-Samjnabhidhana.htm",
      "https://www.sanskrit-lexicon.uni-koeln.de/scans/csldev/csldoc/build/dictionaries/prefaces/ap90app1.html"
    ],
    "cards": [
      {
        "id": "verse-15-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "A gaṇa compresses three weight symbols into a name. Learn the patterns by comparison, then use the names to read traditional definitions. You can scan correctly without memorizing the names first.",
          "hi": "A gaṇa compresses three weight symbols into a name. Learn the patterns by comparison, then use the names to read traditional definitions. You can scan correctly without memorizing the names first."
        }
      },
      {
        "id": "verse-15-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "ma = GGG · na = LLL — The two uniform groups: all heavy, all light.",
          "hi": "ma = GGG · na = LLL — The two uniform groups: all heavy, all light."
        }
      },
      {
        "id": "verse-15-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "ya = LGG · ra = GLG · ta = GGL — One light syllable: at the beginning, middle or end.",
          "hi": "ya = LGG · ra = GLG · ta = GGL — One light syllable: at the beginning, middle or end."
        }
      },
      {
        "id": "verse-15-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "bha = GLL · ja = LGL · sa = LLG — One heavy syllable: at the beginning, middle or end.",
          "hi": "bha = GLL · ja = LGL · sa = LLG — One heavy syllable: at the beginning, middle or end."
        }
      },
      {
        "id": "verse-15-05",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "GGG | GLG | GG → ma · ra · G · G — Our eight-syllable opening divides into two groups of three and two leftover heavies. Do not discard the leftovers.",
          "hi": "GGG | GLG | GG → ma · ra · G · G — Our eight-syllable opening divides into two groups of three and two leftover heavies. Do not discard the leftovers."
        }
      },
      {
        "id": "verse-15-06",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "A gaṇa division is analytical, not a command to pause every three syllables. A three-syllable group may cross a word or a prescribed yati. Mātrā metres also use the word gaṇa for groups of time units; those are not automatically these eight three-syllable patterns. Always identify which grouping system is in use.",
          "hi": "A gaṇa division is analytical, not a command to pause every three syllables. A three-syllable group may cross a word or a prescribed yati. Mātrā metres also use the word gaṇa for groups of time units; those are not automatically these eight three-syllable patterns. Always identify which grouping system is in use."
        }
      },
      {
        "id": "verse-15-07",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: What is LGL, and must you pause after it?",
          "hi": "Reflect: What is LGL, and must you pause after it?"
        }
      },
      {
        "id": "verse-15-08",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: Ja-gaṇa. No: its analytical boundary need not coincide with a word boundary or a recitation pause.",
          "hi": "Explanation: Ja-gaṇa. No: its analytical boundary need not coincide with a word boundary or a recitation pause."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-16",
    "rank": 16,
    "unit": {
      "en": "Scan an entire verse",
      "hi": "Scan an entire verse"
    },
    "title": {
      "en": "A map of metre families",
      "hi": "A map of metre families"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Choose the right kind of comparison.",
      "hi": "Choose the right kind of comparison."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/1-Samjnabhidhana.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/4-Ardhasamavrtta.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/5-Visamavrtta.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/2-Matravrtta-01.htm"
    ],
    "cards": [
      {
        "id": "verse-16-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "First ask whether a verse is regulated mainly by syllable positions or by mātrā groups. Next ask how its pādas relate. This family map is more useful than memorizing a long list of names with no structure.",
          "hi": "First ask whether a verse is regulated mainly by syllable positions or by mātrā groups. Next ask how its pādas relate. This family map is more useful than memorizing a long list of names with no structure."
        }
      },
      {
        "id": "verse-16-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Samavṛtta: A / A / A / A — All four pādas follow the same prescription. Bhujaṅgaprayāta is a clear example.",
          "hi": "Samavṛtta: A / A / A / A — All four pādas follow the same prescription. Bhujaṅgaprayāta is a clear example."
        }
      },
      {
        "id": "verse-16-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Ardhasamavṛtta: A / B / A / B — The first and third follow one prescription; the second and fourth follow another. Puṣpitāgrā is an example.",
          "hi": "Ardhasamavṛtta: A / B / A / B — The first and third follow one prescription; the second and fourth follow another. Puṣpitāgrā is an example."
        }
      },
      {
        "id": "verse-16-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Viṣamavṛtta: prescribed unequal quarters — The quarters differ according to the metre’s definition. “Unequal” does not mean anything goes.",
          "hi": "Viṣamavṛtta: prescribed unequal quarters — The quarters differ according to the metre’s definition. “Unequal” does not mean anything goes."
        }
      },
      {
        "id": "verse-16-05",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Mātrā metre: Āryā — The familiar quarter totals are 12 / 18 / 12 / 15, with additional internal rules. It is a different kind of measurement.",
          "hi": "Mātrā metre: Āryā — The familiar quarter totals are 12 / 18 / 12 / 15, with additional internal rules. It is a different kind of measurement."
        }
      },
      {
        "id": "verse-16-06",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Śloka needs its own treatment because its permitted openings and alternating cadences are not a single repeated fixed L/G string. Traditional books also differ in how they organize material: do not infer that a metre is mātrā-based simply because it appears in a chapter alongside mātrā metres. Classification is a tool for testing the actual rules.",
          "hi": "Śloka needs its own treatment because its permitted openings and alternating cadences are not a single repeated fixed L/G string. Traditional books also differ in how they organize material: do not infer that a metre is mātrā-based simply because it appears in a chapter alongside mātrā metres. Classification is a tool for testing the actual rules."
        }
      },
      {
        "id": "verse-16-07",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: Four pādas have identical syllable counts. Does that prove samavṛtta?",
          "hi": "Reflect: Four pādas have identical syllable counts. Does that prove samavṛtta?"
        }
      },
      {
        "id": "verse-16-08",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: No. Their weight prescriptions may differ, or they may belong to a family with variable openings. Compare the full rules.",
          "hi": "Explanation: No. Their weight prescriptions may differ, or they may belong to a family with variable openings. Compare the full rules."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-17",
    "rank": 17,
    "unit": {
      "en": "Understand the śloka",
      "hi": "Understand the śloka"
    },
    "title": {
      "en": "The familiar śloka cadence",
      "hi": "The familiar śloka cadence"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Recognize the pathyā pattern without overgeneralizing.",
      "hi": "Recognize the pathyā pattern without overgeneralizing."
    },
    "minutes": 7,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/2-Matravrtta-04.htm",
      "https://www.sanskrit-lexicon.uni-koeln.de/scans/csldev/csldoc/build/dictionaries/prefaces/ap90app1.html"
    ],
    "cards": [
      {
        "id": "verse-17-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "The common Classical śloka has four eight-syllable pādas. In its normal, pathyā form, the closing rhythm differs between odd pādas (1 and 3) and even pādas (2 and 4). Learn to hear that alternation before adding the opening restrictions.",
          "hi": "The common Classical śloka has four eight-syllable pādas. In its normal, pathyā form, the closing rhythm differs between odd pādas (1 and 3) and even pādas (2 and 4). Learn to hear that alternation before adding the opening restrictions."
        }
      },
      {
        "id": "verse-17-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Odd pādas: … | L G G X — Positions 5–7 are light, heavy, heavy in the ordinary pathyā cadence. Position 8 is the ending.",
          "hi": "Odd pādas: … | L G G X — Positions 5–7 are light, heavy, heavy in the ordinary pathyā cadence. Position 8 is the ending."
        }
      },
      {
        "id": "verse-17-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Even pādas: … | L G L X — The seventh position is light in the normal even cadence. That alternating seventh syllable helps distinguish the two halves.",
          "hi": "Even pādas: … | L G L X — The seventh position is light in the normal even cadence. That alternating seventh syllable helps distinguish the two halves."
        }
      },
      {
        "id": "verse-17-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "धर्मक्षेत्रे कुरुक्षेत्रे → GGGG | LGGG — The Gītā opening is a normal odd cadence. Its sixth syllable is heavy because of the following cluster, not a long vowel.",
          "hi": "धर्मक्षेत्रे कुरुक्षेत्रे → GGGG | LGGG — The Gītā opening is a normal odd cadence. Its sixth syllable is heavy because of the following cluster, not a long vowel."
        }
      },
      {
        "id": "verse-17-05",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "The dots do not mean that absolutely any opening is legal. Pathyā has opening restrictions, and recognized vipulās alter the ordinary odd-pāda shape. Thus “every śloka has a light fifth and a heavy sixth” is a useful first mnemonic but an incomplete general rule. Next we make the restrictions explicit and then study the variations.",
          "hi": "The dots do not mean that absolutely any opening is legal. Pathyā has opening restrictions, and recognized vipulās alter the ordinary odd-pāda shape. Thus “every śloka has a light fifth and a heavy sixth” is a useful first mnemonic but an incomplete general rule. Next we make the restrictions explicit and then study the variations."
        }
      },
      {
        "id": "verse-17-06",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: What distinguishes the ordinary odd and even cadences?",
          "hi": "Reflect: What distinguishes the ordinary odd and even cadences?"
        }
      },
      {
        "id": "verse-17-07",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: Their seventh position: G in the odd cadence, L in the even cadence. The fifth is L and sixth G in this normal form.",
          "hi": "Explanation: Their seventh position: G in the odd cadence, L in the even cadence. The fifth is L and sixth G in this normal form."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-18",
    "rank": 18,
    "unit": {
      "en": "Understand the śloka",
      "hi": "Understand the śloka"
    },
    "title": {
      "en": "Eight syllables are not enough",
      "hi": "Eight syllables are not enough"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Test the opening as well as the ending.",
      "hi": "Test the opening as well as the ending."
    },
    "minutes": 7,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/1-Samjnabhidhana.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/2-Matravrtta-04.htm"
    ],
    "cards": [
      {
        "id": "verse-18-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "A stanza is not a śloka merely because its four quarters each have eight syllables. In the standard Classical pattern, positions 2 and 3 must not both be light. The usual even-pāda opening also avoids a ja-gaṇa, LGL, in positions 2–4. These restrictions explain why some plausible-looking eight-syllable strings fail.",
          "hi": "A stanza is not a śloka merely because its four quarters each have eight syllables. In the standard Classical pattern, positions 2 and 3 must not both be light. The usual even-pāda opening also avoids a ja-gaṇa, LGL, in positions 2–4. These restrictions explain why some plausible-looking eight-syllable strings fail."
        }
      },
      {
        "id": "verse-18-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "G G G G | L G G X — A compatible ordinary odd shape. It has the expected cadence and does not put two light syllables in positions 2–3.",
          "hi": "G G G G | L G G X — A compatible ordinary odd shape. It has the expected cadence and does not put two light syllables in positions 2–3."
        }
      },
      {
        "id": "verse-18-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "G L L G | L G G X — A constructed near-miss. The closing cadence looks right, but positions 2–3 are both L.",
          "hi": "G L L G | L G G X — A constructed near-miss. The closing cadence looks right, but positions 2–3 are both L."
        }
      },
      {
        "id": "verse-18-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "G L G L | L G L X — Another constructed near-miss for an ordinary even pāda: positions 2–4 are LGL. These are patterns for comparison, not quotations.",
          "hi": "G L G L | L G L X — Another constructed near-miss for an ordinary even pāda: positions 2–4 are LGL. These are patterns for comparison, not quotations."
        }
      },
      {
        "id": "verse-18-05",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Apply these as the course’s standard Classical śloka baseline. Epic and older usage contains additional freedom, and named variants have their own opening and word-break conditions. Keep a classification such as “standard pathyā,” “identified variant,” or “needs investigation”; a binary pass/fail based on syllable count hides the important distinctions.",
          "hi": "Apply these as the course’s standard Classical śloka baseline. Epic and older usage contains additional freedom, and named variants have their own opening and word-break conditions. Keep a classification such as “standard pathyā,” “identified variant,” or “needs investigation”; a binary pass/fail based on syllable count hides the important distinctions."
        }
      },
      {
        "id": "verse-18-06",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: Why does an eight-syllable line with the correct last four still need checking?",
          "hi": "Reflect: Why does an eight-syllable line with the correct last four still need checking?"
        }
      },
      {
        "id": "verse-18-07",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: Its opening may violate a restriction. A successful cadence is only one part of the test.",
          "hi": "Explanation: Its opening may violate a restriction. A successful cadence is only one part of the test."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-19",
    "rank": 19,
    "unit": {
      "en": "Understand the śloka",
      "hi": "Understand the śloka"
    },
    "title": {
      "en": "Vipulās: learn variation as a system",
      "hi": "Vipulās: learn variation as a system"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Understand why authentic ślokas need more than one template.",
      "hi": "Understand why authentic ślokas need more than one template."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/2-Matravrtta-04.htm"
    ],
    "cards": [
      {
        "id": "verse-19-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "Vipulās are recognized variations, especially in odd pādas. Their characteristic weight groups and word breaks make them structured alternatives. They are not mistakes, and they do not give permission to change an even pāda into any pattern you like.",
          "hi": "Vipulās are recognized variations, especially in odd pādas. Their characteristic weight groups and word breaks make them structured alternatives. They are not mistakes, and they do not give permission to change an even pāda into any pattern you like."
        }
      },
      {
        "id": "verse-19-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Vṛttaratnākara’s bha-vipulā rule verse: G G L G | G L L G — Notice the GLL group after position 4, unlike pathyā LGG. The full line is a scanned definition, not a license to combine this ending with any opening.",
          "hi": "Vṛttaratnākara’s bha-vipulā rule verse: G G L G | G L L G — Notice the GLL group after position 4, unlike pathyā LGG. The full line is a scanned definition, not a license to combine this ending with any opening."
        }
      },
      {
        "id": "verse-19-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Its ra-vipulā rule verse: G L G G | G L G G — The GLG group follows position 4. Word division is relevant when recognizing the variant.",
          "hi": "Its ra-vipulā rule verse: G L G G | G L G G — The GLG group follows position 4. Word division is relevant when recognizing the variant."
        }
      },
      {
        "id": "verse-19-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Its na-vipulā rule verse: G L G G | L L L G — The LLL group changes the cadence markedly. Count and inspect the whole pāda.",
          "hi": "Its na-vipulā rule verse: G L G G | L L L G — The LLL group changes the cadence markedly. Count and inspect the whole pāda."
        }
      },
      {
        "id": "verse-19-05",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Its ta-vipulā rule verse: G G G G | G G L G — Here the book names the GGL group at positions 5–7. Other accounts discuss a ma-vipulā using a GGG group spanning positions 4–6. Grouping conventions matter.",
          "hi": "Its ta-vipulā rule verse: G G G G | G G L G — Here the book names the GGL group at positions 5–7. Other accounts discuss a ma-vipulā using a GGG group spanning positions 4–6. Grouping conventions matter."
        }
      },
      {
        "id": "verse-19-06",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Read the labels together with their author’s definition. Common treatments discuss na-, bha-, ma- and ra-vipulā; Kedārabhaṭṭa’s Vaktra section includes additional names and a ta-based description. Do not merge all labels into interchangeable endings. For an unfamiliar line, record the complete opening, cadence and word breaks, then compare a source’s full account and examples.",
          "hi": "Read the labels together with their author’s definition. Common treatments discuss na-, bha-, ma- and ra-vipulā; Kedārabhaṭṭa’s Vaktra section includes additional names and a ta-based description. Do not merge all labels into interchangeable endings. For an unfamiliar line, record the complete opening, cadence and word breaks, then compare a source’s full account and examples."
        }
      },
      {
        "id": "verse-19-07",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: If a real śloka has a heavy fifth syllable, is it automatically corrupt?",
          "hi": "Reflect: If a real śloka has a heavy fifth syllable, is it automatically corrupt?"
        }
      },
      {
        "id": "verse-19-08",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: No. A recognized vipulā may explain it. Check the whole odd pāda and the applicable definition before proposing an error.",
          "hi": "Explanation: No. A recognized vipulā may explain it. Check the whole odd pāda and the applicable definition before proposing an error."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-20",
    "rank": 20,
    "unit": {
      "en": "Understand the śloka",
      "hi": "Understand the śloka"
    },
    "title": {
      "en": "Read a complete śloka",
      "hi": "Read a complete śloka"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Bring sound, pattern and meaning together.",
      "hi": "Bring sound, pattern and meaning together."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://www.learnsanskrit.org/guide/core/syllables/",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/2-Matravrtta-04.htm",
      "https://www.sanskrit-lexicon.uni-koeln.de/scans/csldev/csldoc/build/dictionaries/prefaces/ap90app1.html"
    ],
    "cards": [
      {
        "id": "verse-20-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "Return to Bhagavadgītā 1.1. Dhṛtarāṣṭra asks Sañjaya what his people and the Pāṇḍavas did after assembling at Kurukṣetra, wishing to fight. The metrical divisions organize the question without replacing its grammar.",
          "hi": "Return to Bhagavadgītā 1.1. Dhṛtarāṣṭra asks Sañjaya what his people and the Pāṇḍavas did after assembling at Kurukṣetra, wishing to fight. The metrical divisions organize the question without replacing its grammar."
        }
      },
      {
        "id": "verse-20-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "धर्मक्षेत्रे कुरुक्षेत्रे · GGGG | LGGG — dha-rma-kṣe-tre ku-ru-kṣe-tre. Eight syllables; normal odd cadence.",
          "hi": "धर्मक्षेत्रे कुरुक्षेत्रे · GGGG | LGGG — dha-rma-kṣe-tre ku-ru-kṣe-tre. Eight syllables; normal odd cadence."
        }
      },
      {
        "id": "verse-20-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "समवेता युयुत्सवः · LLGG | LGLG — sa-ma-ve-tā yu-yu-tsa-vaḥ. The second yu is heavy before t+s. Normal even cadence.",
          "hi": "समवेता युयुत्सवः · LLGG | LGLG — sa-ma-ve-tā yu-yu-tsa-vaḥ. The second yu is heavy before t+s. Normal even cadence."
        }
      },
      {
        "id": "verse-20-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "मामकाः पाण्डवाश्चैव · GLGG | LGGL — mā-ma-kāḥ pā-ṇḍa-vā-ścai-va. The final va is naturally light and allowed at the ending.",
          "hi": "मामकाः पाण्डवाश्चैव · GLGG | LGGL — mā-ma-kāḥ pā-ṇḍa-vā-ścai-va. The final va is naturally light and allowed at the ending."
        }
      },
      {
        "id": "verse-20-05",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "किमकुर्वत सञ्जय · LLGL | LGLX — ki-ma-ku-rva-ta sa-ñja-ya. Ku is heavy before r+v; sa is heavy before ñ+j; final ya uses ending allowance.",
          "hi": "किमकुर्वत सञ्जय · LLGL | LGLX — ki-ma-ku-rva-ta sa-ñja-ya. Ku is heavy before r+v; sa is heavy before ñ+j; final ya uses ending allowance."
        }
      },
      {
        "id": "verse-20-06",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Now separate reading from analysis. Read each pāda fluently, without inserting pauses at every gaṇa. Explain one weight caused by vowel length, one by a cluster and one by visarga. Then paraphrase the question. A learner who can give both the meaning and the reasons has learned more than someone who merely recognizes “Anuṣṭubh.”",
          "hi": "Now separate reading from analysis. Read each pāda fluently, without inserting pauses at every gaṇa. Explain one weight caused by vowel length, one by a cluster and one by visarga. Then paraphrase the question. A learner who can give both the meaning and the reasons has learned more than someone who merely recognizes “Anuṣṭubh.”"
        }
      },
      {
        "id": "verse-20-07",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: Which two final syllables in this verse show that ending allowance matters?",
          "hi": "Reflect: Which two final syllables in this verse show that ending allowance matters?"
        }
      },
      {
        "id": "verse-20-08",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: Va in caiva, at the third pāda ending, and ya in Sañjaya, at the fourth. Both are naturally light.",
          "hi": "Explanation: Va in caiva, at the third pāda ending, and ya in Sañjaya, at the fourth. Both are naturally light."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-21",
    "rank": 21,
    "unit": {
      "en": "Meet the classical families",
      "hi": "Meet the classical families"
    },
    "title": {
      "en": "Start with a repeating twelve-syllable pattern",
      "hi": "Start with a repeating twelve-syllable pattern"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Distinguish Bhujaṅgaprayāta, Toṭaka and Sragviṇī.",
      "hi": "Distinguish Bhujaṅgaprayāta, Toṭaka and Sragviṇī."
    },
    "minutes": 7,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/3-Samavrtta-12.htm"
    ],
    "cards": [
      {
        "id": "verse-21-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "A repeating group makes a good first fixed metre. Bhujaṅgaprayāta repeats LGG four times per pāda. Compare it with two equally regular twelve-syllable patterns; the differences become easy to locate when they are aligned.",
          "hi": "A repeating group makes a good first fixed metre. Bhujaṅgaprayāta repeats LGG four times per pāda. Compare it with two equally regular twelve-syllable patterns; the differences become easy to locate when they are aligned."
        }
      },
      {
        "id": "verse-21-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Bhujaṅgaprayāta: LGG / LGG / LGG / LGG — Four ya-gaṇas. Each group has five mātrās, but the defining pattern is twelve syllable positions.",
          "hi": "Bhujaṅgaprayāta: LGG / LGG / LGG / LGG — Four ya-gaṇas. Each group has five mātrās, but the defining pattern is twelve syllable positions."
        }
      },
      {
        "id": "verse-21-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Toṭaka: LLG / LLG / LLG / LLG — Four sa-gaṇas. The heavy syllable moves to the end of each group.",
          "hi": "Toṭaka: LLG / LLG / LLG / LLG — Four sa-gaṇas. The heavy syllable moves to the end of each group."
        }
      },
      {
        "id": "verse-21-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Sragviṇī: GLG / GLG / GLG / GLG — Four ra-gaṇas. Each group again has five mātrās, but the pattern differs from Bhujaṅgaprayāta.",
          "hi": "Sragviṇī: GLG / GLG / GLG / GLG — Four ra-gaṇas. Each group again has five mātrās, but the pattern differs from Bhujaṅgaprayāta."
        }
      },
      {
        "id": "verse-21-05",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Compare Bhujaṅgaprayāta with Sragviṇī: both have twelve syllables and twenty mātrās per pāda, yet they are distinct metres. This is a strong counterexample to identification by totals alone. Speak the abstract groups first; then read the Sanskrit definition bhujaṅgaprayātaṃ bhaved yaiś caturbhiḥ, which embodies its own pattern.",
          "hi": "Compare Bhujaṅgaprayāta with Sragviṇī: both have twelve syllables and twenty mātrās per pāda, yet they are distinct metres. This is a strong counterexample to identification by totals alone. Speak the abstract groups first; then read the Sanskrit definition bhujaṅgaprayātaṃ bhaved yaiś caturbhiḥ, which embodies its own pattern."
        }
      },
      {
        "id": "verse-21-06",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: Can twenty mātrās and twelve syllables identify Bhujaṅgaprayāta uniquely?",
          "hi": "Reflect: Can twenty mātrās and twelve syllables identify Bhujaṅgaprayāta uniquely?"
        }
      },
      {
        "id": "verse-21-07",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: No. Sragviṇī has the same totals. The ordering of L and G distinguishes them.",
          "hi": "Explanation: No. Sragviṇī has the same totals. The ordering of L and G distinguishes them."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-22",
    "rank": 22,
    "unit": {
      "en": "Meet the classical families",
      "hi": "Meet the classical families"
    },
    "title": {
      "en": "One position changes the family resemblance",
      "hi": "One position changes the family resemblance"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Compare Indravajrā, Upendravajrā and Upajāti.",
      "hi": "Compare Indravajrā, Upendravajrā and Upajāti."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/3-Samavrtta-11.htm",
      "https://www.sanskrit-lexicon.uni-koeln.de/scans/csldev/csldoc/build/dictionaries/prefaces/ap90app1.html"
    ],
    "cards": [
      {
        "id": "verse-22-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "Indravajrā and Upendravajrā have eleven syllables per pāda. They differ at the first position. A stanza that mixes their pādas is the familiar form of Upajāti. This teaches comparison through one controlled difference rather than memorizing three disconnected names.",
          "hi": "Indravajrā and Upendravajrā have eleven syllables per pāda. They differ at the first position. A stanza that mixes their pādas is the familiar form of Upajāti. This teaches comparison through one controlled difference rather than memorizing three disconnected names."
        }
      },
      {
        "id": "verse-22-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Indravajrā: GGL / GGL / LGL / G G — Ta, ta, ja, G, G. The first syllable is heavy.",
          "hi": "Indravajrā: GGL / GGL / LGL / G G — Ta, ta, ja, G, G. The first syllable is heavy."
        }
      },
      {
        "id": "verse-22-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Upendravajrā: LGL / GGL / LGL / G G — Ja, ta, ja, G, G. Only the first syllable changes to light.",
          "hi": "Upendravajrā: LGL / GGL / LGL / G G — Ja, ta, ja, G, G. Only the first syllable changes to light."
        }
      },
      {
        "id": "verse-22-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "अस्त्युत्तरस्यां दिशि देवतात्मा — Kumārasambhava 1.1 opens with an Indravajrā pāda: as-tyut-ta-ra-syāṃ di-śi de-va-tā-tmā.",
          "hi": "अस्त्युत्तरस्यां दिशि देवतात्मा — Kumārasambhava 1.1 opens with an Indravajrā pāda: as-tyut-ta-ra-syāṃ di-śi de-va-tā-tmā."
        }
      },
      {
        "id": "verse-22-05",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "हिमालयो नाम नगाधिराजः — The next pāda is Upendravajrā: hi-mā-la-yo nā-ma na-gā-dhi-rā-jaḥ. The stanza belongs to the familiar Upajāti family.",
          "hi": "हिमालयो नाम नगाधिराजः — The next pāda is Upendravajrā: hi-mā-la-yo nā-ma na-gā-dhi-rā-jaḥ. The stanza belongs to the familiar Upajāti family."
        },
        "assetIds": [
          "verse-22-himalaya"
        ]
      },
      {
        "id": "verse-22-06",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "The two lines introduce Himālaya as the divine-souled king of mountains in the north. Upajāti is also used more broadly by some prosodists for mixtures of other related metres. Name the specific pair when precision matters. Do not infer a stanza’s classification from its first pāda alone.",
          "hi": "The two lines introduce Himālaya as the divine-souled king of mountains in the north. Upajāti is also used more broadly by some prosodists for mixtures of other related metres. Name the specific pair when precision matters. Do not infer a stanza’s classification from its first pāda alone."
        }
      },
      {
        "id": "verse-22-07",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: What must you inspect before calling a stanza Upajāti?",
          "hi": "Reflect: What must you inspect before calling a stanza Upajāti?"
        }
      },
      {
        "id": "verse-22-08",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: All its pādas and the particular forms they use. A single eleven-syllable line cannot establish a mixed stanza.",
          "hi": "Explanation: All its pādas and the particular forms they use. A single eleven-syllable line cannot establish a mixed stanza."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-23",
    "rank": 23,
    "unit": {
      "en": "Meet the classical families",
      "hi": "Meet the classical families"
    },
    "title": {
      "en": "Other medium metres: compare before naming",
      "hi": "Other medium metres: compare before naming"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Use a few characteristic patterns to navigate the catalogue.",
      "hi": "Use a few characteristic patterns to navigate the catalogue."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/3-Samavrtta-11.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/3-Samavrtta-12.htm"
    ],
    "cards": [
      {
        "id": "verse-23-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "Not all metres consist of one repeated gaṇa. Some share a long opening sequence and diverge only near the end. Group them by length first, then compare the positions that actually distinguish them.",
          "hi": "Not all metres consist of one repeated gaṇa. Some share a long opening sequence and diverge only near the end. Group them by length first, then compare the positions that actually distinguish them."
        }
      },
      {
        "id": "verse-23-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Vaṃśastha: LGL / GGL / LGL / GLG — Twelve syllables: ja, ta, ja, ra. Compare its last three with the eleven-syllable Upendravajrā ending.",
          "hi": "Vaṃśastha: LGL / GGL / LGL / GLG — Twelve syllables: ja, ta, ja, ra. Compare its last three with the eleven-syllable Upendravajrā ending."
        }
      },
      {
        "id": "verse-23-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Drutavilambita: LLL / GLL / GLL / GLG — Twelve syllables: na, bha, bha, ra. Its run of initial lights creates a clearly different opening.",
          "hi": "Drutavilambita: LLL / GLL / GLL / GLG — Twelve syllables: na, bha, bha, ra. Its run of initial lights creates a clearly different opening."
        }
      },
      {
        "id": "verse-23-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Rathoddhatā: GLG / LLL / GLG / L G — Eleven syllables: ra, na, ra, L, G. Count the two leftover positions.",
          "hi": "Rathoddhatā: GLG / LLL / GLG / L G — Eleven syllables: ra, na, ra, L, G. Count the two leftover positions."
        }
      },
      {
        "id": "verse-23-05",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Śālinī: GGG / GGL / GGL / G G — Eleven syllables: ma, ta, ta, G, G; its usual internal division follows the fourth syllable.",
          "hi": "Śālinī: GGG / GGL / GGL / G G — Eleven syllables: ma, ta, ta, G, G; its usual internal division follows the fourth syllable."
        }
      },
      {
        "id": "verse-23-06",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "A metre’s name can suggest an image or movement, but the name is not a measurable tempo instruction. Use the exact pattern and any yati requirement. Comparing neighbours helps retrieval: “eleven syllables, heavy opening, fourth-position division” narrows the search much more reliably than remembering a vague mood.",
          "hi": "A metre’s name can suggest an image or movement, but the name is not a measurable tempo instruction. Use the exact pattern and any yati requirement. Comparing neighbours helps retrieval: “eleven syllables, heavy opening, fourth-position division” narrows the search much more reliably than remembering a vague mood."
        }
      },
      {
        "id": "verse-23-07",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: What separates Vaṃśastha from a generic twelve-syllable verse?",
          "hi": "Reflect: What separates Vaṃśastha from a generic twelve-syllable verse?"
        }
      },
      {
        "id": "verse-23-08",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: Its specific L/G arrangement. Twelve is a useful first filter, not the definition.",
          "hi": "Explanation: Its specific L/G arrangement. Twelve is a useful first filter, not the definition."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-24",
    "rank": 24,
    "unit": {
      "en": "Meet the classical families",
      "hi": "Meet the classical families"
    },
    "title": {
      "en": "Alternating and unequal quarters",
      "hi": "Alternating and unequal quarters"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Recognize structure beyond four identical lines.",
      "hi": "Recognize structure beyond four identical lines."
    },
    "minutes": 7,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/4-Ardhasamavrtta.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/5-Visamavrtta.htm",
      "https://www.sanskrit-lexicon.uni-koeln.de/scans/csldev/csldoc/build/dictionaries/prefaces/ap90app1.html"
    ],
    "cards": [
      {
        "id": "verse-24-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "In an alternating metre, the first and third pādas share one pattern while the second and fourth share another. You must compare the right partners. A line that differs from the first is not necessarily an error.",
          "hi": "In an alternating metre, the first and third pādas share one pattern while the second and fourth share another. You must compare the right partners. A line that differs from the first is not necessarily an error."
        }
      },
      {
        "id": "verse-24-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Puṣpitāgrā · odd: LLL / LLL / GLG / LGG — Twelve syllables: na, na, ra, ya.",
          "hi": "Puṣpitāgrā · odd: LLL / LLL / GLG / LGG — Twelve syllables: na, na, ra, ya."
        }
      },
      {
        "id": "verse-24-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Puṣpitāgrā · even: LLL / LGL / LGL / GLG / G — Thirteen syllables: na, ja, ja, ra, G. The stanza alternates twelve and thirteen.",
          "hi": "Puṣpitāgrā · even: LLL / LGL / LGL / GLG / G — Thirteen syllables: na, ja, ja, ra, G. The stanza alternates twelve and thirteen."
        }
      },
      {
        "id": "verse-24-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Viṣamavṛtta · a prescribed sequence — Vṛttaratnākara gives forms with unequal quarters, including a progressive 8, 12, 16, 20-syllable scheme. Different lengths can be part of the rule.",
          "hi": "Viṣamavṛtta · a prescribed sequence — Vṛttaratnākara gives forms with unequal quarters, including a progressive 8, 12, 16, 20-syllable scheme. Different lengths can be part of the rule."
        }
      },
      {
        "id": "verse-24-05",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Write four separate rows before matching. First compare 1 with 3 and 2 with 4; then consult the named definition. Distinguish alternating fixed metres from a mixture such as the familiar Upajāti and from mātrā-based Āryā. Similar-looking unequal lengths do not make these the same category.",
          "hi": "Write four separate rows before matching. First compare 1 with 3 and 2 with 4; then consult the named definition. Distinguish alternating fixed metres from a mixture such as the familiar Upajāti and from mātrā-based Āryā. Similar-looking unequal lengths do not make these the same category."
        }
      },
      {
        "id": "verse-24-06",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: In Puṣpitāgrā, is a thirteen-syllable second pāda a counting mistake?",
          "hi": "Reflect: In Puṣpitāgrā, is a thirteen-syllable second pāda a counting mistake?"
        }
      },
      {
        "id": "verse-24-07",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: Not if it has the prescribed even-pāda pattern. Its thirteen syllables are part of the alternating design.",
          "hi": "Explanation: Not if it has the prescribed even-pāda pattern. Its thirteen syllables are part of the alternating design."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-25",
    "rank": 25,
    "unit": {
      "en": "Read longer metres",
      "hi": "Read longer metres"
    },
    "title": {
      "en": "Vasantatilakā and Mālinī",
      "hi": "Vasantatilakā and Mālinī"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Read longer patterns in meaningful sections.",
      "hi": "Read longer patterns in meaningful sections."
    },
    "minutes": 7,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/3-Samavrtta-14.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/3-Samavrtta-15.htm",
      "https://www.sanskrit-lexicon.uni-koeln.de/scans/csldev/csldoc/build/dictionaries/prefaces/ap90app1.html"
    ],
    "cards": [
      {
        "id": "verse-25-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "With longer pādas, keep two maps: the gaṇa shorthand for checking and the phrase divisions for reading. Vasantatilakā has fourteen syllables; Mālinī has fifteen. Their differing openings are easy to notice even before learning the names.",
          "hi": "With longer pādas, keep two maps: the gaṇa shorthand for checking and the phrase divisions for reading. Vasantatilakā has fourteen syllables; Mālinī has fifteen. Their differing openings are easy to notice even before learning the names."
        }
      },
      {
        "id": "verse-25-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Vasantatilakā: GGL / GLL / LGL / LGL / G G — Ta, bha, ja, ja, G, G. Four groups of three plus two equals fourteen. Apte gives an 8 + 6 division.",
          "hi": "Vasantatilakā: GGL / GLL / LGL / LGL / G G — Ta, bha, ja, ja, G, G. Four groups of three plus two equals fourteen. Apte gives an 8 + 6 division."
        }
      },
      {
        "id": "verse-25-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Mālinī: LLL / LLL / GGG / LGG / LGG — Na, na, ma, ya, ya. Five groups of three equals fifteen; the conventional division is 8 + 7.",
          "hi": "Mālinī: LLL / LLL / GGG / LGG / LGG — Na, na, ma, ya, ya. Five groups of three equals fifteen; the conventional division is 8 + 7."
        }
      },
      {
        "id": "verse-25-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Same analytical tool, different phrase boundary — The eight-syllable division cuts across a three-syllable gaṇa boundary. That is normal: gaṇas and yati serve different purposes.",
          "hi": "Same analytical tool, different phrase boundary — The eight-syllable division cuts across a three-syllable gaṇa boundary. That is normal: gaṇas and yati serve different purposes."
        }
      },
      {
        "id": "verse-25-05",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "To learn either pattern, first mark the vowels on a source line, then label each weight independently. Compare the resulting string with the formula. Finally put the text back into phrases and read for meaning. Working backwards from a known metre can help diagnose uncertainty, but should not replace the independent scan.",
          "hi": "To learn either pattern, first mark the vowels on a source line, then label each weight independently. Compare the resulting string with the formula. Finally put the text back into phrases and read for meaning. Working backwards from a known metre can help diagnose uncertainty, but should not replace the independent scan."
        }
      },
      {
        "id": "verse-25-06",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: Does an 8 + 6 division tell you all the weights of Vasantatilakā?",
          "hi": "Reflect: Does an 8 + 6 division tell you all the weights of Vasantatilakā?"
        }
      },
      {
        "id": "verse-25-07",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: No. It tells you the section lengths. You still need the GGL GLL LGL LGL GG pattern.",
          "hi": "Explanation: No. It tells you the section lengths. You still need the GGL GLL LGL LGL GG pattern."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-26",
    "rank": 26,
    "unit": {
      "en": "Read longer metres",
      "hi": "Read longer metres"
    },
    "title": {
      "en": "Mandākrāntā: a long line you can navigate",
      "hi": "Mandākrāntā: a long line you can navigate"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Use the 4 + 6 + 7 structure to read seventeen syllables.",
      "hi": "Use the 4 + 6 + 7 structure to read seventeen syllables."
    },
    "minutes": 7,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/3-Samavrtta-17.htm",
      "https://www-archiv.fdm.uni-hamburg.de/ngmcp/A_386-17_Meghad%25C5%25ABta.html"
    ],
    "cards": [
      {
        "id": "verse-26-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "Mandākrāntā has seventeen syllables per pāda. Its four-heavy opening and following run of lights give a memorable contrast. Work with its three reading sections before trying to memorize the full string.",
          "hi": "Mandākrāntā has seventeen syllables per pāda. Its four-heavy opening and following run of lights give a memorable contrast. Work with its three reading sections before trying to memorize the full string."
        }
      },
      {
        "id": "verse-26-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "GGGG | LLLLLG | GLGGLGG — Four syllables, then six, then seven. Total: seventeen. This is the same pattern as ma, bha, na, ta, ta, G, G.",
          "hi": "GGGG | LLLLLG | GLGGLGG — Four syllables, then six, then seven. Total: seventeen. This is the same pattern as ma, bha, na, ta, ta, G, G."
        }
      },
      {
        "id": "verse-26-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "कश्चित् कान्ताविरहगुरुणा स्वाधिकारप्रमत्तः — The opening of Meghadūta 1, in the svādhikārapramattaḥ reading attested by the linked manuscript. A yakṣa has neglected his duty and is burdened by separation from his beloved.",
          "hi": "कश्चित् कान्ताविरहगुरुणा स्वाधिकारप्रमत्तः — The opening of Meghadūta 1, in the svādhikārapramattaḥ reading attested by the linked manuscript. A yakṣa has neglected his duty and is burdened by separation from his beloved."
        },
        "assetIds": [
          "verse-26-separation"
        ]
      },
      {
        "id": "verse-26-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "kaś-cit-kān-tā | vi-ra-ha-gu-ru-ṇā | svā-dhi-kā-ra-pra-mat-taḥ — The middle section gives five light syllables and a long ṇā. Ra in the final section is heavy before pr. Mat is heavy before tt; taḥ has visarga.",
          "hi": "kaś-cit-kān-tā | vi-ra-ha-gu-ru-ṇā | svā-dhi-kā-ra-pra-mat-taḥ — The middle section gives five light syllables and a long ṇā. Ra in the final section is heavy before pr. Mat is heavy before tt; taḥ has visarga."
        }
      },
      {
        "id": "verse-26-05",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "The first internal division comes inside the compound kāntā-viraha. A metrical division may align with a compound-member boundary rather than a space between printed words. Do not automatically insert a dramatic breath at every analytical divider. Different editions have svādhikārāt pramattaḥ; record which reading you use instead of silently mixing them.",
          "hi": "The first internal division comes inside the compound kāntā-viraha. A metrical division may align with a compound-member boundary rather than a space between printed words. Do not automatically insert a dramatic breath at every analytical divider. Different editions have svādhikārāt pramattaḥ; record which reading you use instead of silently mixing them."
        }
      },
      {
        "id": "verse-26-06",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: Why is ra in svādhikārapramattaḥ heavy?",
          "hi": "Reflect: Why is ra in svādhikārapramattaḥ heavy?"
        }
      },
      {
        "id": "verse-26-07",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: Its a is short, but p+r follows before the next vowel. This is ordinary cluster weight in the reading used here.",
          "hi": "Explanation: Its a is short, but p+r follows before the next vowel. This is ordinary cluster weight in the reading used here."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-27",
    "rank": 27,
    "unit": {
      "en": "Read longer metres",
      "hi": "Read longer metres"
    },
    "title": {
      "en": "Śikhariṇī, Pṛthvī and Hariṇī",
      "hi": "Śikhariṇī, Pṛthvī and Hariṇī"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Distinguish three metres of the same length.",
      "hi": "Distinguish three metres of the same length."
    },
    "minutes": 7,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/3-Samavrtta-17.htm"
    ],
    "cards": [
      {
        "id": "verse-27-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "Seventeen syllables do not identify Mandākrāntā. Several important metres share that length. Compare their opening, internal divisions and ending. The point is to learn how to consult a pattern, not to memorize every name at once.",
          "hi": "Seventeen syllables do not identify Mandākrāntā. Several important metres share that length. Compare their opening, internal divisions and ending. The point is to learn how to consult a pattern, not to memorize every name at once."
        }
      },
      {
        "id": "verse-27-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Śikhariṇī: LGG / GGG / LLL / LLG / GLL / L G — Ya, ma, na, sa, bha, L, G. Its conventional division is 6 + 11.",
          "hi": "Śikhariṇī: LGG / GGG / LLL / LLG / GLL / L G — Ya, ma, na, sa, bha, L, G. Its conventional division is 6 + 11."
        }
      },
      {
        "id": "verse-27-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Pṛthvī: LGL / LLG / LGL / LLG / LGG / L G — Ja, sa, ja, sa, ya, L, G. Division: 8 + 9.",
          "hi": "Pṛthvī: LGL / LLG / LGL / LLG / LGG / L G — Ja, sa, ja, sa, ya, L, G. Division: 8 + 9."
        }
      },
      {
        "id": "verse-27-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Hariṇī: LLL / LLG / GGG / GLG / LLG / L G — Na, sa, ma, ra, sa, L, G. Divisions: 6 + 4 + 7.",
          "hi": "Hariṇī: LLL / LLG / GGG / GLG / LLG / L G — Na, sa, ma, ra, sa, L, G. Divisions: 6 + 4 + 7."
        }
      },
      {
        "id": "verse-27-05",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Put the patterns on aligned syllable positions when comparing them. A different yati can also distinguish metres with closely related or identical weight strings in traditional catalogues. Identification therefore includes both a sound pattern and the structural information supplied by its definition. A name-only answer loses that evidence.",
          "hi": "Put the patterns on aligned syllable positions when comparing them. A different yati can also distinguish metres with closely related or identical weight strings in traditional catalogues. Identification therefore includes both a sound pattern and the structural information supplied by its definition. A name-only answer loses that evidence."
        }
      },
      {
        "id": "verse-27-06",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: A scan has seventeen syllables and begins LGGGGG. What is a useful next candidate?",
          "hi": "Reflect: A scan has seventeen syllables and begins LGGGGG. What is a useful next candidate?"
        }
      },
      {
        "id": "verse-27-07",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: Śikhariṇī: its ya + ma opening is LGGGGG. Check the remaining eleven positions and the division; the opening alone is not proof.",
          "hi": "Explanation: Śikhariṇī: its ya + ma opening is LGGGGG. Check the remaining eleven positions and the division; the opening alone is not proof."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-28",
    "rank": 28,
    "unit": {
      "en": "Read longer metres",
      "hi": "Read longer metres"
    },
    "title": {
      "en": "Longer lines and the edge of the catalogue",
      "hi": "Longer lines and the edge of the catalogue"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Read nineteen and twenty-one syllables; understand daṇḍaka.",
      "hi": "Read nineteen and twenty-one syllables; understand daṇḍaka."
    },
    "minutes": 7,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/3-Samavrtta-18-26.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/1-Samjnabhidhana.htm"
    ],
    "cards": [
      {
        "id": "verse-28-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "Long metres become manageable when you preserve their internal organization. Learn two widely encountered patterns, then learn how to use the catalogue for rarer lengths. You do not need a separate memorization lesson for every theoretical L/G combination.",
          "hi": "Long metres become manageable when you preserve their internal organization. Learn two widely encountered patterns, then learn how to use the catalogue for rarer lengths. You do not need a separate memorization lesson for every theoretical L/G combination."
        }
      },
      {
        "id": "verse-28-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Śārdūlavikrīḍita: GGG / LLG / LGL / LLG / GGL / GGL / G — Ma, sa, ja, sa, ta, ta, G: nineteen syllables, conventionally divided 12 + 7.",
          "hi": "Śārdūlavikrīḍita: GGG / LLG / LGL / LLG / GGL / GGL / G — Ma, sa, ja, sa, ta, ta, G: nineteen syllables, conventionally divided 12 + 7."
        }
      },
      {
        "id": "verse-28-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Sragdharā: GGG / GLG / GLL / LLL / LGG / LGG / LGG — Ma, ra, bha, na, ya, ya, ya: twenty-one syllables, divided 7 + 7 + 7.",
          "hi": "Sragdharā: GGG / GLG / GLL / LLL / LGG / LGG / LGG — Ma, ra, bha, na, ya, ya, ya: twenty-one syllables, divided 7 + 7 + 7."
        }
      },
      {
        "id": "verse-28-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Daṇḍaka — Traditional catalogues extend beyond twenty-six syllables per pāda into very long forms called daṇḍaka. They still have prescriptions; length does not make them free verse.",
          "hi": "Daṇḍaka — Traditional catalogues extend beyond twenty-six syllables per pāda into very long forms called daṇḍaka. They still have prescriptions; length does not make them free verse."
        }
      },
      {
        "id": "verse-28-05",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Traditional length classes provide an address in the catalogue, not a unique metre name. A twenty-one-syllable class contains more possibilities than Sragdharā. For a rare form, read its defining gaṇas, yati and all four quarters, then examine a cited example. This is a transferable reading skill that covers new metres beyond the selected repertoire.",
          "hi": "Traditional length classes provide an address in the catalogue, not a unique metre name. A twenty-one-syllable class contains more possibilities than Sragdharā. For a rare form, read its defining gaṇas, yati and all four quarters, then examine a cited example. This is a transferable reading skill that covers new metres beyond the selected repertoire."
        }
      },
      {
        "id": "verse-28-06",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: How should you approach a twenty-seven-syllable pāda?",
          "hi": "Reflect: How should you approach a twenty-seven-syllable pāda?"
        }
      },
      {
        "id": "verse-28-07",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: Verify the count and text first, then consult the long-form/daṇḍaka definitions. Do not shorten it just to force it into a familiar metre.",
          "hi": "Explanation: Verify the count and text first, then consult the long-form/daṇḍaka definitions. Do not shorten it just to force it into a familiar metre."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-29",
    "rank": 29,
    "unit": {
      "en": "Measure time: mātrā metres",
      "hi": "Measure time: mātrā metres"
    },
    "title": {
      "en": "Mātrā groups: same time, different shapes",
      "hi": "Mātrā groups: same time, different shapes"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Build the five ordinary four-unit groups.",
      "hi": "Build the five ordinary four-unit groups."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/1-Samjnabhidhana.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/2-Matravrtta-01.htm"
    ],
    "cards": [
      {
        "id": "verse-29-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "A mātrā group measures time rather than a fixed number of syllables. With L worth one and G worth two, there are five ways to fill four units. This explains why the syllable count may vary while the time framework stays stable.",
          "hi": "A mātrā group measures time rather than a fixed number of syllables. With L worth one and G worth two, there are five ways to fill four units. This explains why the syllable count may vary while the time framework stays stable."
        }
      },
      {
        "id": "verse-29-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "G G = 2 + 2 — Two syllables fill four mātrās.",
          "hi": "G G = 2 + 2 — Two syllables fill four mātrās."
        }
      },
      {
        "id": "verse-29-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "G L L · L G L · L L G — Each has three syllables and totals four. The heavy syllable occupies a different position.",
          "hi": "G L L · L G L · L L G — Each has three syllables and totals four. The heavy syllable occupies a different position."
        }
      },
      {
        "id": "verse-29-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "L L L L = 1 + 1 + 1 + 1 — Four syllables also fill four mātrās.",
          "hi": "L L L L = 1 + 1 + 1 + 1 — Four syllables also fill four mātrās."
        }
      },
      {
        "id": "verse-29-05",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "A mātrā gaṇa is not a three-syllable gaṇa — Only three of these five groups have exactly three syllables. The word gaṇa means a group; its definition depends on context.",
          "hi": "A mātrā gaṇa is not a three-syllable gaṇa — Only three of these five groups have exactly three syllables. The word gaṇa means a group; its definition depends on context."
        }
      },
      {
        "id": "verse-29-06",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "A metre chooses among these groups and may forbid certain arrangements at particular positions. Equal duration does not guarantee substitutability. For example, Āryā restricts the LGL arrangement in its odd-numbered full groups. Start with the inventory, then apply the metre-specific grammar of groups.",
          "hi": "A metre chooses among these groups and may forbid certain arrangements at particular positions. Equal duration does not guarantee substitutability. For example, Āryā restricts the LGL arrangement in its odd-numbered full groups. Start with the inventory, then apply the metre-specific grammar of groups."
        }
      },
      {
        "id": "verse-29-07",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: How can two syllables and four syllables occupy the same mātrā group?",
          "hi": "Reflect: How can two syllables and four syllables occupy the same mātrā group?"
        }
      },
      {
        "id": "verse-29-08",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: GG totals four, just as LLLL totals four. The number of syllables differs; the measured total agrees.",
          "hi": "Explanation: GG totals four, just as LLLL totals four. The number of syllables differs; the measured total agrees."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-30",
    "rank": 30,
    "unit": {
      "en": "Measure time: mātrā metres",
      "hi": "Measure time: mātrā metres"
    },
    "title": {
      "en": "Āryā: understand the whole framework",
      "hi": "Āryā: understand the whole framework"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Use both the quarter totals and the internal groups.",
      "hi": "Use both the quarter totals and the internal groups."
    },
    "minutes": 7,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/2-Matravrtta-01.htm",
      "https://www.sanskrit-lexicon.uni-koeln.de/scans/csldev/csldoc/build/dictionaries/prefaces/ap90app1.html"
    ],
    "cards": [
      {
        "id": "verse-30-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "The familiar Āryā totals are 12, 18, 12 and 15 mātrās. These combine into halves of 30 and 27. But a string that happens to total 57 is not automatically Āryā: its groups and divisions must also obey the rules.",
          "hi": "The familiar Āryā totals are 12, 18, 12 and 15 mātrās. These combine into halves of 30 and 27. But a string that happens to total 57 is not automatically Āryā: its groups and divisions must also obey the rules."
        }
      },
      {
        "id": "verse-30-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "First half: GG | GG | LLG || GG | GLL | LGL | LLG | G — An illustrative skeleton: seven four-mātrā groups and a final G = 30. The first three groups give 12; the remainder gives 18.",
          "hi": "First half: GG | GG | LLG || GG | GLL | LGL | LLG | G — An illustrative skeleton: seven four-mātrā groups and a final G = 30. The first three groups give 12; the remainder gives 18."
        }
      },
      {
        "id": "verse-30-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Second half: GG | GLL | GG || LLG | GLL | L | GG | G — The sixth group is reduced to a single L: 12 + 15 = 27. These are metrical skeletons, not Sanskrit quotations.",
          "hi": "Second half: GG | GLL | GG || LLG | GLL | L | GG | G — The sixth group is reduced to a single L: 12 + 15 = 27. These are metrical skeletons, not Sanskrit quotations."
        }
      },
      {
        "id": "verse-30-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "The odd full groups exclude LGL — Groups 1, 3, 5 and 7 are not ja-shaped. The first half’s sixth group has special requirements: LGL or four lights, with appropriate word division.",
          "hi": "The odd full groups exclude LGL — Groups 1, 3, 5 and 7 are not ja-shaped. The first half’s sixth group has special requirements: LGL or four lights, with appropriate word division."
        }
      },
      {
        "id": "verse-30-05",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "In the first half the sixth group may be LGL, or four lights under the stated division conditions. The second half instead has a single light at that point. The detailed yati and word-boundary provisions matter too. Read the primary definition alongside a marked example; a mātrā counter alone cannot validate Āryā.",
          "hi": "In the first half the sixth group may be LGL, or four lights under the stated division conditions. The second half instead has a single light at that point. The detailed yati and word-boundary provisions matter too. Read the primary definition alongside a marked example; a mātrā counter alone cannot validate Āryā."
        }
      },
      {
        "id": "verse-30-06",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: Why is a total of 57 mātrās insufficient?",
          "hi": "Reflect: Why is a total of 57 mātrās insufficient?"
        }
      },
      {
        "id": "verse-30-07",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: It could have the wrong quarter totals, forbidden internal groups, the wrong sixth-group treatment or unsuitable word divisions.",
          "hi": "Explanation: It could have the wrong quarter totals, forbidden internal groups, the wrong sixth-group treatment or unsuitable word divisions."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-31",
    "rank": 31,
    "unit": {
      "en": "Measure time: mātrā metres",
      "hi": "Measure time: mātrā metres"
    },
    "title": {
      "en": "Āryā variants and the Gīti family",
      "hi": "Āryā variants and the Gīti family"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Compare related structures without conflating their names.",
      "hi": "Compare related structures without conflating their names."
    },
    "minutes": 9,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/2-Matravrtta-01.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/2-Matravrtta-02.htm",
      "https://www.sanskrit-lexicon.uni-koeln.de/scans/csldev/csldoc/build/dictionaries/prefaces/ap90app1.html"
    ],
    "cards": [
      {
        "id": "verse-31-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "Once you know the two Āryā halves, several relatives become easy to understand. Repeating or reversing the halves changes the stanza. These family relationships are a better memory aid than a flat list of totals.",
          "hi": "Once you know the two Āryā halves, several relatives become easy to understand. Repeating or reversing the halves changes the stanza. These family relationships are a better memory aid than a flat list of totals."
        }
      },
      {
        "id": "verse-31-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Āryā: 12 / 18 / 12 / 15 — A 30-mātrā half followed by a 27-mātrā half.",
          "hi": "Āryā: 12 / 18 / 12 / 15 — A 30-mātrā half followed by a 27-mātrā half."
        }
      },
      {
        "id": "verse-31-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Gīti: 12 / 18 / 12 / 18 — Two halves of the first type: 30 + 30.",
          "hi": "Gīti: 12 / 18 / 12 / 18 — Two halves of the first type: 30 + 30."
        }
      },
      {
        "id": "verse-31-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Upagīti: 12 / 15 / 12 / 15 — Two halves of the second type: 27 + 27.",
          "hi": "Upagīti: 12 / 15 / 12 / 15 — Two halves of the second type: 27 + 27."
        }
      },
      {
        "id": "verse-31-05",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Udgīti: 12 / 15 / 12 / 18 — The two types occur in the reverse order: 27 + 30.",
          "hi": "Udgīti: 12 / 15 / 12 / 18 — The two types occur in the reverse order: 27 + 30."
        }
      },
      {
        "id": "verse-31-06",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Āryāgīti: 12 / 20 / 12 / 20 — The extended form has 32 + 32 mātrās. Internal prescriptions still matter.",
          "hi": "Āryāgīti: 12 / 20 / 12 / 20 — The extended form has 32 + 32 mātrās. Internal prescriptions still matter."
        }
      },
      {
        "id": "verse-31-07",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Within Āryā, pathyā and vipulā describe different relationships between the word division and the first three groups. Capalā specifies ja-shaped second and fourth groups with intervening heavy structure; mukhacapalā applies that characteristic to the first half, jaghanacapalā to the second. These names belong to the Āryā system here: a śloka vipulā is a different analysis.",
          "hi": "Within Āryā, pathyā and vipulā describe different relationships between the word division and the first three groups. Capalā specifies ja-shaped second and fourth groups with intervening heavy structure; mukhacapalā applies that characteristic to the first half, jaghanacapalā to the second. These names belong to the Āryā system here: a śloka vipulā is a different analysis."
        }
      },
      {
        "id": "verse-31-08",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: Does “vipulā” always mean a variation of śloka?",
          "hi": "Reflect: Does “vipulā” always mean a variation of śloka?"
        }
      },
      {
        "id": "verse-31-09",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: No. Āryā has its own vipulā, defined through its own group and word-division rules. Always specify the metre family.",
          "hi": "Explanation: No. Āryā has its own vipulā, defined through its own group and word-division rules. Always specify the metre family."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-32",
    "rank": 32,
    "unit": {
      "en": "Measure time: mātrā metres",
      "hi": "Measure time: mātrā metres"
    },
    "title": {
      "en": "Vaitālīya and other measured families",
      "hi": "Vaitālīya and other measured families"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Notice that a fixed cadence can follow a variable opening.",
      "hi": "Notice that a fixed cadence can follow a variable opening."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/2-Matravrtta-02.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/2-Matravrtta-03.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/1-Samjnabhidhana.htm"
    ],
    "cards": [
      {
        "id": "verse-32-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "Mātrā metres are not all built like Āryā. In Vaitālīya, an opening measured by mātrās leads into a fixed closing sequence. Odd and even pādas have different opening totals. This gives you another model for recognizing unfamiliar verse.",
          "hi": "Mātrā metres are not all built like Āryā. In Vaitālīya, an opening measured by mātrās leads into a fixed closing sequence. Odd and even pādas have different opening totals. This gives you another model for recognizing unfamiliar verse."
        }
      },
      {
        "id": "verse-32-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Vaitālīya · odd: 6 mātrās + G L G L G — The five-syllable cadence totals eight mātrās; the pāda totals fourteen.",
          "hi": "Vaitālīya · odd: 6 mātrās + G L G L G — The five-syllable cadence totals eight mātrās; the pāda totals fourteen."
        }
      },
      {
        "id": "verse-32-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Vaitālīya · even: 8 mātrās + G L G L G — The same cadence follows a longer opening; the pāda totals sixteen.",
          "hi": "Vaitālīya · even: 8 mātrās + G L G L G — The same cadence follows a longer opening; the pāda totals sixteen."
        }
      },
      {
        "id": "verse-32-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Aupacchandasika: related opening + G L G L G G — The extended cadence adds a heavy syllable, giving totals of sixteen and eighteen respectively.",
          "hi": "Aupacchandasika: related opening + G L G L G G — The extended cadence adds a heavy syllable, giving totals of sixteen and eighteen respectively."
        }
      },
      {
        "id": "verse-32-05",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Mātrāsamaka and other jāti forms — Other prescriptions use equal mātrā totals with additional positional rules. Learn the particular definition rather than applying Āryā’s groups to them.",
          "hi": "Mātrāsamaka and other jāti forms — Other prescriptions use equal mātrā totals with additional positional rules. Learn the particular definition rather than applying Āryā’s groups to them."
        }
      },
      {
        "id": "verse-32-06",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "These totals and cadences identify the family but are not its entire grammar. Vaitālīya places further restrictions on light-syllable arrangements and group connections; its named subtypes add conditions. Compare the continuous Sanskrit definition across the linked Gīti and Vaitālīya pages. At this stage the goal is sound classification and guided reference use, not unsupported validation of every subtype.",
          "hi": "These totals and cadences identify the family but are not its entire grammar. Vaitālīya places further restrictions on light-syllable arrangements and group connections; its named subtypes add conditions. Compare the continuous Sanskrit definition across the linked Gīti and Vaitālīya pages. At this stage the goal is sound classification and guided reference use, not unsupported validation of every subtype."
        }
      },
      {
        "id": "verse-32-07",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: Does fourteen mātrās in an odd pāda prove Vaitālīya?",
          "hi": "Reflect: Does fourteen mātrās in an odd pāda prove Vaitālīya?"
        }
      },
      {
        "id": "verse-32-08",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: No. The closing GLGLG sequence and the internal opening restrictions must also be satisfied.",
          "hi": "Explanation: No. The closing GLGLG sequence and the internal opening restrictions must also be satisfied."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-33",
    "rank": 33,
    "unit": {
      "en": "Read poetry as poetry",
      "hi": "Read poetry as poetry"
    },
    "title": {
      "en": "Yati: a division that helps the listener",
      "hi": "Yati: a division that helps the listener"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Distinguish metre, word boundaries and breathing.",
      "hi": "Distinguish metre, word boundaries and breathing."
    },
    "minutes": 7,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/1-Samjnabhidhana.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/3-Samavrtta-17.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/3-Samavrtta-18-26.htm"
    ],
    "cards": [
      {
        "id": "verse-33-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "Yati is an internal division prescribed or recognized within a metrical line. It can help a listener follow a long verse. It is not identical to a gaṇa boundary, a printed space, a punctuation mark or a place where you personally run out of breath.",
          "hi": "Yati is an internal division prescribed or recognized within a metrical line. It can help a listener follow a long verse. It is not identical to a gaṇa boundary, a printed space, a punctuation mark or a place where you personally run out of breath."
        }
      },
      {
        "id": "verse-33-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Mandākrāntā: 4 + 6 + 7 — The boundaries follow syllables 4 and 10. The gaṇa groups of three do not land on those same positions.",
          "hi": "Mandākrāntā: 4 + 6 + 7 — The boundaries follow syllables 4 and 10. The gaṇa groups of three do not land on those same positions."
        }
      },
      {
        "id": "verse-33-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Sragdharā: 7 + 7 + 7 — Three equal sections organize a twenty-one-syllable pāda. Counting each section separately makes a missed vowel easier to locate.",
          "hi": "Sragdharā: 7 + 7 + 7 — Three equal sections organize a twenty-one-syllable pāda. Counting each section separately makes a missed vowel easier to locate."
        }
      },
      {
        "id": "verse-33-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "A word cut after its first consonant — Do not manufacture a “pause” inside an indivisible sound unit just because a visual ruler reaches its mark. Inspect the actual word and the metre’s yati rule.",
          "hi": "A word cut after its first consonant — Do not manufacture a “pause” inside an indivisible sound unit just because a visual ruler reaches its mark. Inspect the actual word and the metre’s yati rule."
        }
      },
      {
        "id": "verse-33-05",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Traditional treatments distinguish allowable and faulty word divisions, including questions about compound boundaries. A teaching display should preserve both the whole word and the metrical division. In performance, a boundary may be conveyed by phrasing rather than a long silence. Learn the text’s prescribed organization before experimenting with expressive pauses.",
          "hi": "Traditional treatments distinguish allowable and faulty word divisions, including questions about compound boundaries. A teaching display should preserve both the whole word and the metrical division. In performance, a boundary may be conveyed by phrasing rather than a long silence. Learn the text’s prescribed organization before experimenting with expressive pauses."
        }
      },
      {
        "id": "verse-33-06",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: Must a pause occur after every three-syllable gaṇa?",
          "hi": "Reflect: Must a pause occur after every three-syllable gaṇa?"
        }
      },
      {
        "id": "verse-33-07",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: No. Gaṇas encode weight; yati organizes the line. Their boundaries often differ.",
          "hi": "Explanation: No. Gaṇas encode weight; yati organizes the line. Their boundaries often differ."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-34",
    "rank": 34,
    "unit": {
      "en": "Read poetry as poetry",
      "hi": "Read poetry as poetry"
    },
    "title": {
      "en": "Meaning survives the metrical arrangement",
      "hi": "Meaning survives the metrical arrangement"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Keep original order, word analysis and prose sense connected.",
      "hi": "Keep original order, word analysis and prose sense connected."
    },
    "minutes": 7,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://www.sanskrit-lexicon.uni-koeln.de/scans/csldev/csldoc/build/dictionaries/prefaces/ap90app1.html"
    ],
    "cards": [
      {
        "id": "verse-34-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "Poets arrange words to satisfy metre and express meaning. To understand a verse, keep its original order visible, then unpack sandhi and compounds, and finally build a prose-order explanation. Do not replace the original verse with its paraphrase when scanning.",
          "hi": "Poets arrange words to satisfy metre and express meaning. To understand a verse, keep its original order visible, then unpack sandhi and compounds, and finally build a prose-order explanation. Do not replace the original verse with its paraphrase when scanning."
        }
      },
      {
        "id": "verse-34-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "वागर्थाविव सम्पृक्तौ | vāgarthāv iva saṃpṛktau — Raghuvaṃśa 1.1 compares the pair being praised to speech and meaning, closely joined. Vāk + artha appears inside vāgarthau, with sandhi before iva.",
          "hi": "वागर्थाविव सम्पृक्तौ | vāgarthāv iva saṃpṛktau — Raghuvaṃśa 1.1 compares the pair being praised to speech and meaning, closely joined. Vāk + artha appears inside vāgarthau, with sandhi before iva."
        },
        "assetIds": [
          "verse-34-parents"
        ]
      },
      {
        "id": "verse-34-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "वागर्थप्रतिपत्तये | vāgarthapratipattaye — The purpose is understanding speech and meaning. The compound is long, but still has a precise vowel count.",
          "hi": "वागर्थप्रतिपत्तये | vāgarthapratipattaye — The purpose is understanding speech and meaning. The compound is long, but still has a precise vowel count."
        }
      },
      {
        "id": "verse-34-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "जगतः पितरौ वन्दे / पार्वतीपरमेश्वरौ — The speaker salutes Pārvatī and Parameśvara as the parents of the world. The two objects of reverence are grammatically connected across the verse.",
          "hi": "जगतः पितरौ वन्दे / पार्वतीपरमेश्वरौ — The speaker salutes Pārvatī and Parameśvara as the parents of the world. The two objects of reverence are grammatically connected across the verse."
        }
      },
      {
        "id": "verse-34-05",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Use three synchronized layers: original verse for metre, padaccheda for word recognition, and anvaya or prose ordering for syntax. A compound-member boundary can be meaningful without being a separate grammatical word. This workflow connects the Verse & Rhythm course to grammar and reading without duplicating the same lesson in three separate sections.",
          "hi": "Use three synchronized layers: original verse for metre, padaccheda for word recognition, and anvaya or prose ordering for syntax. A compound-member boundary can be meaningful without being a separate grammatical word. This workflow connects the Verse & Rhythm course to grammar and reading without duplicating the same lesson in three separate sections."
        }
      },
      {
        "id": "verse-34-06",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: Which version should you scan: the original verse or its prose-order paraphrase?",
          "hi": "Reflect: Which version should you scan: the original verse or its prose-order paraphrase?"
        }
      },
      {
        "id": "verse-34-07",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: The original verse. The paraphrase helps meaning but changes the sound sequence and usually the metre.",
          "hi": "Explanation: The original verse. The paraphrase helps meaning but changes the sound sequence and usually the metre."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-35",
    "rank": 35,
    "unit": {
      "en": "Read poetry as poetry",
      "hi": "Read poetry as poetry"
    },
    "title": {
      "en": "Metre is not rhyme, tune or emotion",
      "hi": "Metre is not rhyme, tune or emotion"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Interpret poetic effects without turning associations into rules.",
      "hi": "Interpret poetic effects without turning associations into rules."
    },
    "minutes": 7,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://www.sanskrit-lexicon.uni-koeln.de/scans/csldev/csldoc/build/dictionaries/prefaces/ap90app1.html",
      "https://www-archiv.fdm.uni-hamburg.de/ngmcp/A_386-17_Meghad%25C5%25ABta.html"
    ],
    "cards": [
      {
        "id": "verse-35-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "Sanskrit metrical identity depends on the prescribed pattern, not on matching final sounds. Rhyme, repeated consonants, wordplay, musical tune and expressive tempo can contribute to a poem, but they are separate features.",
          "hi": "Sanskrit metrical identity depends on the prescribed pattern, not on matching final sounds. Rhyme, repeated consonants, wordplay, musical tune and expressive tempo can contribute to a poem, but they are separate features."
        }
      },
      {
        "id": "verse-35-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Same ending sound, different pattern — Two lines can rhyme and still have different syllable counts or weights. Rhyme cannot establish that they share a metre.",
          "hi": "Same ending sound, different pattern — Two lines can rhyme and still have different syllable counts or weights. Rhyme cannot establish that they share a metre."
        }
      },
      {
        "id": "verse-35-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Same metre, different performance — A reader can vary pitch and pacing while preserving the syllabic structure. A tune should not erase a short/long distinction in the text.",
          "hi": "Same metre, different performance — A reader can vary pitch and pacing while preserving the syllabic structure. A tune should not erase a short/long distinction in the text."
        }
      },
      {
        "id": "verse-35-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Mandākrāntā in Meghadūta — Its movement participates in a poem of longing. That literary association does not mean every Mandākrāntā verse must express sorrow or use one fixed melody.",
          "hi": "Mandākrāntā in Meghadūta — Its movement participates in a poem of longing. That literary association does not mean every Mandākrāntā verse must express sorrow or use one fixed melody."
        }
      },
      {
        "id": "verse-35-05",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Read an effect as a relationship between metre, diction, syntax and context. A string of heavy syllables is observable; calling it solemn is an interpretation that needs the surrounding poem. In this course, pattern labels are technical claims, while suggested emotional readings are invitations to compare what the words and performance do.",
          "hi": "Read an effect as a relationship between metre, diction, syntax and context. A string of heavy syllables is observable; calling it solemn is an interpretation that needs the surrounding poem. In this course, pattern labels are technical claims, while suggested emotional readings are invitations to compare what the words and performance do."
        }
      },
      {
        "id": "verse-35-06",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: Can you identify a Sanskrit metre from rhyme alone?",
          "hi": "Reflect: Can you identify a Sanskrit metre from rhyme alone?"
        }
      },
      {
        "id": "verse-35-07",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: No. Scan the syllables and compare the relevant rules. Rhyme is a separate feature.",
          "hi": "Explanation: No. Scan the syllables and compare the relevant rules. Rhyme is a separate feature."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-36",
    "rank": 36,
    "unit": {
      "en": "Read poetry as poetry",
      "hi": "Read poetry as poetry"
    },
    "title": {
      "en": "A practical recitation loop",
      "hi": "A practical recitation loop"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Move from accurate speech to fluent reading.",
      "hi": "Move from accurate speech to fluent reading."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://vedicheritage.gov.in/hi/samhitas/rigveda/shakala-samhita/mandal-01/",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/1-Samjnabhidhana.htm"
    ],
    "cards": [
      {
        "id": "verse-36-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "Use a short passage whose meaning you understand. Read it plainly, inspect difficult sounds, follow the weight pattern slowly, then return to natural phrasing. Record yourself if useful and compare the actual words before judging expressiveness.",
          "hi": "Use a short passage whose meaning you understand. Read it plainly, inspect difficult sounds, follow the weight pattern slowly, then return to natural phrasing. Record yourself if useful and compare the actual words before judging expressiveness."
        },
        "assetIds": [
          "verse-36-recitation"
        ]
      },
      {
        "id": "verse-36-02",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "The course’s diagrams show metrical structure; they are not recordings of an authentic chant.",
          "hi": "The course’s diagrams show metrical structure; they are not recordings of an authentic chant."
        }
      },
      {
        "id": "verse-36-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Pass 1 · Words — Read धर्मक्षेत्रे कुरुक्षेत्रे without adding vowels inside kṣ or tr. Keep long e distinct.",
          "hi": "Pass 1 · Words — Read धर्मक्षेत्रे कुरुक्षेत्रे without adding vowels inside kṣ or tr. Keep long e distinct."
        }
      },
      {
        "id": "verse-36-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Pass 2 · Structure — Explain GGGG LGGG, then read the whole pāda again without stopping after every symbol.",
          "hi": "Pass 2 · Structure — Explain GGGG LGGG, then read the whole pāda again without stopping after every symbol."
        }
      },
      {
        "id": "verse-36-05",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Pass 3 · Meaning and continuity — Read the full Gītā question across four pādas, giving enough phrase shape for a listener to follow it.",
          "hi": "Pass 3 · Meaning and continuity — Read the full Gītā question across four pādas, giving enough phrase shape for a listener to follow it."
        }
      },
      {
        "id": "verse-36-06",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "A useful audio lesson should name the reader and tradition, supply normal and slower recordings, and align the spoken text with the annotation. Mechanical beeps and generic text-to-speech cannot stand in for a reviewed pronunciation model, especially for Vedic recitation. Here the linked Vedic Heritage example supplies an external listening source; no fabricated audio is presented.",
          "hi": "A useful audio lesson should name the reader and tradition, supply normal and slower recordings, and align the spoken text with the annotation. Mechanical beeps and generic text-to-speech cannot stand in for a reviewed pronunciation model, especially for Vedic recitation. Here the linked Vedic Heritage example supplies an external listening source; no fabricated audio is presented."
        }
      },
      {
        "id": "verse-36-07",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: What should you correct first: an attractive tune or an inserted vowel inside a cluster?",
          "hi": "Reflect: What should you correct first: an attractive tune or an inserted vowel inside a cluster?"
        }
      },
      {
        "id": "verse-36-08",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: The inserted vowel. It changes the sound sequence and possibly the syllable count. Expressive performance comes after an accurate text.",
          "hi": "Explanation: The inserted vowel. It changes the sound sequence and possibly the syllable count. Expressive performance comes after an accurate text."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-37",
    "rank": 37,
    "unit": {
      "en": "Enter Vedic verse carefully",
      "hi": "Enter Vedic verse carefully"
    },
    "title": {
      "en": "Vedic metre: a related but distinct system",
      "hi": "Vedic metre: a related but distinct system"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Start with stanza shapes, not Classical templates.",
      "hi": "Start with stanza shapes, not Classical templates."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Chandas-Sastra/Chandas-Sastra-03.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/1-Samjnabhidhana.htm"
    ],
    "cards": [
      {
        "id": "verse-37-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "Vedic verse shares the importance of syllables and rhythm, but its forms and conventions need their own treatment. Begin with the main stanza shapes. These are standard reference forms, not a claim that every Vedic occurrence is perfectly regular.",
          "hi": "Vedic verse shares the importance of syllables and rhythm, but its forms and conventions need their own treatment. Begin with the main stanza shapes. These are standard reference forms, not a claim that every Vedic occurrence is perfectly regular."
        }
      },
      {
        "id": "verse-37-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Gāyatrī · 8 + 8 + 8 = 24 — Usually three eight-syllable pādas. This is not the same as a Classical catalogue’s six-syllable length-class called Gāyatrī.",
          "hi": "Gāyatrī · 8 + 8 + 8 = 24 — Usually three eight-syllable pādas. This is not the same as a Classical catalogue’s six-syllable length-class called Gāyatrī."
        }
      },
      {
        "id": "verse-37-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Uṣṇih · 8 + 8 + 12 = 28; Anuṣṭubh · 4×8 = 32 — A common Uṣṇih arrangement and the familiar four-eight framework. Vedic Anuṣṭubh is not simply the fully developed Classical śloka rule set.",
          "hi": "Uṣṇih · 8 + 8 + 12 = 28; Anuṣṭubh · 4×8 = 32 — A common Uṣṇih arrangement and the familiar four-eight framework. Vedic Anuṣṭubh is not simply the fully developed Classical śloka rule set."
        }
      },
      {
        "id": "verse-37-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Bṛhatī · 8 + 8 + 12 + 8 = 36; Paṅkti · 5×8 = 40 — Common reference forms; placement and other variants exist.",
          "hi": "Bṛhatī · 8 + 8 + 12 + 8 = 36; Paṅkti · 5×8 = 40 — Common reference forms; placement and other variants exist."
        }
      },
      {
        "id": "verse-37-05",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Triṣṭubh · 4×11 = 44; Jagatī · 4×12 = 48 — Important Vedic families whose rhythmic structure requires more than the total count.",
          "hi": "Triṣṭubh · 4×11 = 44; Jagatī · 4×12 = 48 — Important Vedic families whose rhythmic structure requires more than the total count."
        }
      },
      {
        "id": "verse-37-06",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Count supplies the first map, not the whole analysis: cadences, internal divisions, historical phonology and textual tradition also matter. Names can recur in later classifications with different meanings. Always state whether you mean a Vedic stanza type, a Classical length class or a particular fixed Classical metre.",
          "hi": "Count supplies the first map, not the whole analysis: cadences, internal divisions, historical phonology and textual tradition also matter. Names can recur in later classifications with different meanings. Always state whether you mean a Vedic stanza type, a Classical length class or a particular fixed Classical metre."
        }
      },
      {
        "id": "verse-37-07",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: Does Vedic Triṣṭubh mean every pāda must be Indravajrā?",
          "hi": "Reflect: Does Vedic Triṣṭubh mean every pāda must be Indravajrā?"
        }
      },
      {
        "id": "verse-37-08",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: No. Indravajrā is a specific Classical eleven-syllable pattern. Vedic Triṣṭubh is a broader historical metrical family.",
          "hi": "Explanation: No. Indravajrā is a specific Classical eleven-syllable pattern. Vedic Triṣṭubh is a broader historical metrical family."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-38",
    "rank": 38,
    "unit": {
      "en": "Enter Vedic verse carefully",
      "hi": "Enter Vedic verse carefully"
    },
    "title": {
      "en": "Read a three-pāda Vedic stanza",
      "hi": "Read a three-pāda Vedic stanza"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Count Ṛgveda 1.1.1 without inventing a fourth quarter.",
      "hi": "Count Ṛgveda 1.1.1 without inventing a fourth quarter."
    },
    "minutes": 7,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://vedicheritage.gov.in/hi/samhitas/rigveda/shakala-samhita/mandal-01/",
      "https://ancient-buddhist-texts.net/Textual-Studies/Chandas-Sastra/Chandas-Sastra-03.htm"
    ],
    "cards": [
      {
        "id": "verse-38-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "The first Ṛgvedic stanza praises Agni in his ritual roles. Read its three pādas as three units. The Sanskrit below omits accent marks only for the first counting pass; the linked source preserves the accented text and its recitation.",
          "hi": "The first Ṛgvedic stanza praises Agni in his ritual roles. Read its three pādas as three units. The Sanskrit below omits accent marks only for the first counting pass; the linked source preserves the accented text and its recitation."
        }
      },
      {
        "id": "verse-38-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "अग्निमीळे पुरोहितम् | agnimīḷe purohitam — Eight vowels: a · i · ī · e · u · o · i · a. Agni is invoked as the priest placed at the forefront.",
          "hi": "अग्निमीळे पुरोहितम् | agnimīḷe purohitam — Eight vowels: a · i · ī · e · u · o · i · a. Agni is invoked as the priest placed at the forefront."
        },
        "assetIds": [
          "verse-38-agni"
        ]
      },
      {
        "id": "verse-38-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "यज्ञस्य देवमृत्विजम् | yajñasya devamṛtvijam — Eight vowels: a · a · a · e · a · ṛ · i · a. The line continues the description of Agni as divine officiant.",
          "hi": "यज्ञस्य देवमृत्विजम् | yajñasya devamṛtvijam — Eight vowels: a · a · a · e · a · ṛ · i · a. The line continues the description of Agni as divine officiant."
        }
      },
      {
        "id": "verse-38-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "होतारं रत्नधातमम् | hotāraṃ ratnadhātamam — Eight vowels: o · ā · a · a · a · ā · a · a. It completes the praise, including his role as hotṛ and best bestower of treasure.",
          "hi": "होतारं रत्नधातमम् | hotāraṃ ratnadhātamam — Eight vowels: o · ā · a · a · a · ā · a · a. It completes the praise, including his role as hotṛ and best bestower of treasure."
        }
      },
      {
        "id": "verse-38-05",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "The stanza is Gāyatrī: 8 + 8 + 8. A modern layout may print the first two pādas together. The word-separated forms help meaning, but the continuous received text and its accent marks belong to the recitation lesson. Do not add Oṃ to the metrical count unless you are explicitly analyzing an edition or liturgical setting that includes it as a separate element.",
          "hi": "The stanza is Gāyatrī: 8 + 8 + 8. A modern layout may print the first two pādas together. The word-separated forms help meaning, but the continuous received text and its accent marks belong to the recitation lesson. Do not add Oṃ to the metrical count unless you are explicitly analyzing an edition or liturgical setting that includes it as a separate element."
        }
      },
      {
        "id": "verse-38-06",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: Why is a four-quarter śloka template inappropriate here?",
          "hi": "Reflect: Why is a four-quarter śloka template inappropriate here?"
        }
      },
      {
        "id": "verse-38-07",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: This stanza has three eight-syllable pādas. Forcing a fourth misrepresents its Vedic form.",
          "hi": "Explanation: This stanza has three eight-syllable pādas. Forcing a fourth misrepresents its Vedic form."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-39",
    "rank": 39,
    "unit": {
      "en": "Enter Vedic verse carefully",
      "hi": "Enter Vedic verse carefully"
    },
    "title": {
      "en": "Accent, duration and recitation tradition",
      "hi": "Accent, duration and recitation tradition"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Keep three dimensions distinct.",
      "hi": "Keep three dimensions distinct."
    },
    "minutes": 7,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://vedicheritage.gov.in/hi/samhitas/rigveda/shakala-samhita/mandal-01/",
      "https://vedicheritage.gov.in/pdf/Sruti_Dharmadhikari.pdf"
    ],
    "cards": [
      {
        "id": "verse-39-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "Vedic accent is a feature of the transmitted text and its recitation. The traditional categories include udātta, anudātta and svarita. They are not synonyms for guru, laghu or a musical beat. A heavy syllable can carry an accent, but weight alone does not determine it.",
          "hi": "Vedic accent is a feature of the transmitted text and its recitation. The traditional categories include udātta, anudātta and svarita. They are not synonyms for guru, laghu or a musical beat. A heavy syllable can carry an accent, but weight alone does not determine it."
        },
        "assetIds": [
          "verse-39-tradition"
        ]
      },
      {
        "id": "verse-39-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Weight asks: how is the syllable measured? — Long vowels and following consonants matter for the metrical analysis.",
          "hi": "Weight asks: how is the syllable measured? — Long vowels and following consonants matter for the metrical analysis."
        }
      },
      {
        "id": "verse-39-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Accent asks: what accentual category is transmitted? — Use the accented text and the conventions of the named Veda and śākhā. A mark’s interpretation cannot be generalized from one tutorial to every tradition.",
          "hi": "Accent asks: what accentual category is transmitted? — Use the accented text and the conventions of the named Veda and śākhā. A mark’s interpretation cannot be generalized from one tutorial to every tradition."
        }
      },
      {
        "id": "verse-39-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Recitation asks: how is this version performed? — Compare the Śākala Ṛgveda text of 1.1 with its linked recitation. Observe the same words before attempting to copy pitch.",
          "hi": "Recitation asks: how is this version performed? — Compare the Śākala Ṛgveda text of 1.1 with its linked recitation. Observe the same words before attempting to copy pitch."
        }
      },
      {
        "id": "verse-39-05",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "The actual realization of accent and the use of written marks vary among recitation traditions. This preview therefore does not invent a universal three-note tune or infer accent from L/G. A specialist branch should pair a named, reviewed recitation model with its matching marked text. Pluta and tradition-specific phonetic details belong in that branch too.",
          "hi": "The actual realization of accent and the use of written marks vary among recitation traditions. This preview therefore does not invent a universal three-note tune or infer accent from L/G. A specialist branch should pair a named, reviewed recitation model with its matching marked text. Pluta and tradition-specific phonetic details belong in that branch too."
        }
      },
      {
        "id": "verse-39-06",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: Does every guru syllable receive a high pitch?",
          "hi": "Reflect: Does every guru syllable receive a high pitch?"
        }
      },
      {
        "id": "verse-39-07",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: No. Weight and Vedic accent are different dimensions. Follow the transmitted accents and the recitation convention of the source.",
          "hi": "Explanation: No. Weight and Vedic accent are different dimensions. Follow the transmitted accents and the recitation convention of the source."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-40",
    "rank": 40,
    "unit": {
      "en": "Enter Vedic verse carefully",
      "hi": "Enter Vedic verse carefully"
    },
    "title": {
      "en": "Variants, pāṭhas and the limits of a simple count",
      "hi": "Variants, pāṭhas and the limits of a simple count"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Understand why received text and metrical analysis may differ.",
      "hi": "Understand why received text and metrical analysis may differ."
    },
    "minutes": 7,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Chandas-Sastra/Chandas-Sastra-03.htm",
      "https://vedicheritage.gov.in/pdf/Sruti_Dharmadhikari.pdf"
    ],
    "cards": [
      {
        "id": "verse-40-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "Vedic study distinguishes continuous saṃhitā recitation, word-separated pada recitation and other organized recitation methods. These preserve and teach the text in different ways. They are not different metres produced by moving a swipe control.",
          "hi": "Vedic study distinguishes continuous saṃhitā recitation, word-separated pada recitation and other organized recitation methods. These preserve and teach the text in different ways. They are not different metres produced by moving a swipe control."
        }
      },
      {
        "id": "verse-40-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Saṃhitā-pāṭha and pada-pāṭha — The continuous form includes connections between words; the word-separated form helps establish their identity. Scan the appropriate form for the question you are asking.",
          "hi": "Saṃhitā-pāṭha and pada-pāṭha — The continuous form includes connections between words; the word-separated form helps establish their identity. Scan the appropriate form for the question you are asking."
        }
      },
      {
        "id": "verse-40-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Krama and jaṭā — Krama links consecutive words in pairs. Jaṭā uses a more elaborate forward-and-back arrangement. Their repetitions serve transmission, not a new stanza count.",
          "hi": "Krama and jaṭā — Krama links consecutive words in pairs. Jaṭā uses a more elaborate forward-and-back arrangement. Their repetitions serve transmission, not a new stanza count."
        }
      },
      {
        "id": "verse-40-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Nicṛt and bhurij — Piṅgala distinguishes forms deficient or excessive by one syllable. A short count can be a recognized classification, not proof of a copying error.",
          "hi": "Nicṛt and bhurij — Piṅgala distinguishes forms deficient or excessive by one syllable. A short count can be a recognized classification, not proof of a copying error."
        }
      },
      {
        "id": "verse-40-05",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Vedic metre may also require examining historical syllabification or a resolution supported by the text’s scholarly treatment. Do not silently expand a sound or remove a sandhi to achieve a preferred total. Record the received form, the metrical interpretation and the authority for it separately. Full expertise requires work within particular texts and traditions, beyond this survey.",
          "hi": "Vedic metre may also require examining historical syllabification or a resolution supported by the text’s scholarly treatment. Do not silently expand a sound or remove a sandhi to achieve a preferred total. Record the received form, the metrical interpretation and the authority for it separately. Full expertise requires work within particular texts and traditions, beyond this survey."
        }
      },
      {
        "id": "verse-40-06",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: A Vedic stanza is one syllable short of the standard shape. What should happen next?",
          "hi": "Reflect: A Vedic stanza is one syllable short of the standard shape. What should happen next?"
        }
      },
      {
        "id": "verse-40-07",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: Check the text, its assigned metre and the tradition’s analysis, including a possible nicṛt form. Do not automatically edit it.",
          "hi": "Explanation: Check the text, its assigned metre and the tradition’s analysis, including a possible nicṛt form. Do not automatically edit it."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-41",
    "rank": 41,
    "unit": {
      "en": "Investigate and create",
      "hi": "Investigate and create"
    },
    "title": {
      "en": "Read a metrical definition in Sanskrit",
      "hi": "Read a metrical definition in Sanskrit"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Turn a compact rule into a usable pattern.",
      "hi": "Turn a compact rule into a usable pattern."
    },
    "minutes": 7,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/1-Samjnabhidhana.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/3-Samavrtta-12.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/3-Samavrtta-17.htm"
    ],
    "cards": [
      {
        "id": "verse-41-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "Traditional manuals often encode a metre’s prescription in a verse that also demonstrates the metre. Read the technical vocabulary first, expand the gaṇas, count the positions and identify any numerical words specifying divisions.",
          "hi": "Traditional manuals often encode a metre’s prescription in a verse that also demonstrates the metre. Read the technical vocabulary first, expand the gaṇas, count the positions and identify any numerical words specifying divisions."
        }
      },
      {
        "id": "verse-41-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "bhujaṅgaprayātaṃ bhaved yaiś caturbhiḥ — Four ya-gaṇas: LGG repeated four times. The definition both names and exemplifies Bhujaṅgaprayāta.",
          "hi": "bhujaṅgaprayātaṃ bhaved yaiś caturbhiḥ — Four ya-gaṇas: LGG repeated four times. The definition both names and exemplifies Bhujaṅgaprayāta."
        }
      },
      {
        "id": "verse-41-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Mandākrāntā: ma · bha · na · ta · ta · G · G — Expand to GGG GLL LLL GGL GGL GG, then regroup as 4 + 6 + 7 to inspect the yati.",
          "hi": "Mandākrāntā: ma · bha · na · ta · ta · G · G — Expand to GGG GLL LLL GGL GGL GG, then regroup as 4 + 6 + 7 to inspect the yati."
        }
      },
      {
        "id": "verse-41-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Number words in definitions — Words such as abdhi (ocean: four in this convention) and rasa (six) can encode counts. Their function is numerical rather than the literal imagery of the example.",
          "hi": "Number words in definitions — Words such as abdhi (ocean: four in this convention) and rasa (six) can encode counts. Their function is numerical rather than the literal imagery of the example."
        },
        "assetIds": [
          "verse-41-ocean"
        ]
      },
      {
        "id": "verse-41-05",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Keep the definition, your expansion and a literary example distinct. A digital edition may report a variant where the wording no longer matches its apparent pattern. That is a reason to consult the apparatus, not to copy the inconsistent string into a teaching app. The source-linked method lets a learner examine unfamiliar metres beyond this course.",
          "hi": "Keep the definition, your expansion and a literary example distinct. A digital edition may report a variant where the wording no longer matches its apparent pattern. That is a reason to consult the apparatus, not to copy the inconsistent string into a teaching app. The source-linked method lets a learner examine unfamiliar metres beyond this course."
        }
      },
      {
        "id": "verse-41-06",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: Why can a defining verse be especially useful?",
          "hi": "Reflect: Why can a defining verse be especially useful?"
        }
      },
      {
        "id": "verse-41-07",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: It gives a verbal rule and an example to scan. Agreement between the two is a check; disagreement calls for investigation of the text or interpretation.",
          "hi": "Explanation: It gives a verbal rule and an example to scan. Agreement between the two is a check; disagreement calls for investigation of the text or interpretation."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-42",
    "rank": 42,
    "unit": {
      "en": "Investigate and create",
      "hi": "Investigate and create"
    },
    "title": {
      "en": "Piṅgala’s combinatorial world",
      "hi": "Piṅgala’s combinatorial world"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Generate and count possible patterns systematically.",
      "hi": "Generate and count possible patterns systematically."
    },
    "minutes": 7,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/6-Prastharadi.htm"
    ],
    "cards": [
      {
        "id": "verse-42-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "For a fixed number of syllables, each position can be L or G. Three positions produce eight patterns. This systematic expansion is prastāra. It explains why the eight three-syllable gaṇas cover every possible arrangement.",
          "hi": "For a fixed number of syllables, each position can be L or G. Three positions produce eight patterns. This systematic expansion is prastāra. It explains why the eight three-syllable gaṇas cover every possible arrangement."
        }
      },
      {
        "id": "verse-42-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Three-position expansion — GGG, LGG, GLG, LLG, GGL, LGL, GLL, LLL. This ordering changes the leftmost position fastest.",
          "hi": "Three-position expansion — GGG, LGG, GLG, LLG, GGL, LGL, GLL, LLL. This ordering changes the leftmost position fastest."
        }
      },
      {
        "id": "verse-42-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Saṃkhyā: how many? — For n independently chosen positions, there are 2ⁿ patterns. Four positions give sixteen. Only some patterns become established poetic metres.",
          "hi": "Saṃkhyā: how many? — For n independently chosen positions, there are 2ⁿ patterns. Four positions give sixteen. Only some patterns become established poetic metres."
        }
      },
      {
        "id": "verse-42-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Uddiṣṭa and naṣṭa — In the displayed one-based ordering, LGL is row 6. Uddiṣṭa finds a pattern’s row; naṣṭa recovers the pattern from a row number.",
          "hi": "Uddiṣṭa and naṣṭa — In the displayed one-based ordering, LGL is row 6. Uddiṣṭa finds a pattern’s row; naṣṭa recovers the pattern from a row number."
        }
      },
      {
        "id": "verse-42-05",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Using G=0 and L=1 as a modern explanation, the left-to-right place values here are 1, 2, 4. LGL gives 1+4, then add 1 for row 6. Ekadvyādilagakriyā counts patterns with specified numbers of light syllables: for three positions the counts are 1, 3, 3, 1. Adhvayoga concerns the extent of the arranged expansion. These are analytical procedures, not instructions to perform every possible pattern as poetry.",
          "hi": "Using G=0 and L=1 as a modern explanation, the left-to-right place values here are 1, 2, 4. LGL gives 1+4, then add 1 for row 6. Ekadvyādilagakriyā counts patterns with specified numbers of light syllables: for three positions the counts are 1, 3, 3, 1. Adhvayoga concerns the extent of the arranged expansion. These are analytical procedures, not instructions to perform every possible pattern as poetry."
        }
      },
      {
        "id": "verse-42-06",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: How many three-syllable patterns contain exactly one L?",
          "hi": "Reflect: How many three-syllable patterns contain exactly one L?"
        }
      },
      {
        "id": "verse-42-07",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: Three: LGG, GLG and GGL. Choosing the light position determines the pattern.",
          "hi": "Explanation: Three: LGG, GLG and GGL. Choosing the light position determines the pattern."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-43",
    "rank": 43,
    "unit": {
      "en": "Investigate and create",
      "hi": "Investigate and create"
    },
    "title": {
      "en": "When a tool disagrees with the poem",
      "hi": "When a tool disagrees with the poem"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Use computational results as evidence.",
      "hi": "Use computational results as evidence."
    },
    "minutes": 7,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://chandas.org/documentation.html",
      "https://www.sanskrit-lexicon.uni-koeln.de/scans/csldev/csldoc/build/dictionaries/prefaces/ap90app1.html"
    ],
    "cards": [
      {
        "id": "verse-43-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "A metre recognizer can compare a scan against many definitions, but its output depends on the text, transcription, segmentation and supported rules. A close match should lead you to the differing positions. It should not silently rewrite the poem.",
          "hi": "A metre recognizer can compare a scan against many definitions, but its output depends on the text, transcription, segmentation and supported rules. A close match should lead you to the differing positions. It should not silently rewrite the poem."
        }
      },
      {
        "id": "verse-43-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "One unexpected syllable — Check for a missing vowel sign, an accidental extra vowel, duplicated text or the wrong quarter boundary.",
          "hi": "One unexpected syllable — Check for a missing vowel sign, an accidental extra vowel, duplicated text or the wrong quarter boundary."
        }
      },
      {
        "id": "verse-43-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "One unexpected weight — Check long vowels, clusters, anusvāra, visarga, connected-word context and ending treatment before invoking an exception.",
          "hi": "One unexpected weight — Check long vowels, clusters, anusvāra, visarga, connected-word context and ending treatment before invoking an exception."
        }
      },
      {
        "id": "verse-43-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Several possible matches — Compare all pādas, yati and the source’s classification. Report the alternatives rather than pretending the name is certain.",
          "hi": "Several possible matches — Compare all pādas, yati and the source’s classification. Report the alternatives rather than pretending the name is certain."
        }
      },
      {
        "id": "verse-43-05",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Keep an audit trail: source reading → syllable division → weight reasons → candidate metre → remaining mismatch. OCR and transliteration can create apparent metrical faults. A manuscript variant can help explain a mismatch but does not prove which reading is correct. Meaning, grammar and textual evidence must participate in that decision.",
          "hi": "Keep an audit trail: source reading → syllable division → weight reasons → candidate metre → remaining mismatch. OCR and transliteration can create apparent metrical faults. A manuscript variant can help explain a mismatch but does not prove which reading is correct. Meaning, grammar and textual evidence must participate in that decision."
        }
      },
      {
        "id": "verse-43-06",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: A tool offers to delete a syllable for a perfect match. Should the lesson accept it automatically?",
          "hi": "Reflect: A tool offers to delete a syllable for a perfect match. Should the lesson accept it automatically?"
        }
      },
      {
        "id": "verse-43-07",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: No. Preserve the source text, identify the discrepancy and look for textual evidence before proposing a correction.",
          "hi": "Explanation: No. Preserve the source text, identify the discrepancy and look for textual evidence before proposing a correction."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-44",
    "rank": 44,
    "unit": {
      "en": "Investigate and create",
      "hi": "Investigate and create"
    },
    "title": {
      "en": "Compose with constraints and meaning",
      "hi": "Compose with constraints and meaning"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Use a pattern as a scaffold without sacrificing Sanskrit.",
      "hi": "Use a pattern as a scaffold without sacrificing Sanskrit."
    },
    "minutes": 7,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/1-Samjnabhidhana.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/2-Matravrtta-04.htm"
    ],
    "cards": [
      {
        "id": "verse-44-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "Composition joins several skills: a coherent thought, grammatical words, correct sandhi and a metrical structure. Begin with one pāda in a familiar pattern. Treat it as a draft; metre is one requirement, not a substitute for syntax or sense.",
          "hi": "Composition joins several skills: a coherent thought, grammatical words, correct sandhi and a metrical structure. Begin with one pāda in a familiar pattern. Treat it as a draft; metre is one requirement, not a substitute for syntax or sense."
        }
      },
      {
        "id": "verse-44-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Choose a target — For an ordinary odd śloka pāda, plan eight syllables and the LGGX cadence, then check the opening restrictions.",
          "hi": "Choose a target — For an ordinary odd śloka pāda, plan eight syllables and the LGGX cadence, then check the opening restrictions."
        }
      },
      {
        "id": "verse-44-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Write the thought in prose first — Choose a small idea you can express accurately. Identify the case relations and verb before reshaping the wording.",
          "hi": "Write the thought in prose first — Choose a small idea you can express accurately. Identify the case relations and verb before reshaping the wording."
        },
        "assetIds": [
          "verse-44-composition"
        ]
      },
      {
        "id": "verse-44-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Revise one variable at a time — A synonym can change length; word order changes neighbouring sounds; sandhi can change the vowel count. Re-scan after each revision.",
          "hi": "Revise one variable at a time — A synonym can change length; word order changes neighbouring sounds; sandhi can change the vowel count. Re-scan after each revision."
        }
      },
      {
        "id": "verse-44-05",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Do not shorten a long vowel arbitrarily or insert meaningless particles to obtain a match. A good review asks: Is the statement understandable? Is the grammar defensible? Is the connected text correct? Does every weight have a reason? Is the chosen metre genuinely satisfied? Keep the initial prose and revised verse together so the learner can explain the choices.",
          "hi": "Do not shorten a long vowel arbitrarily or insert meaningless particles to obtain a match. A good review asks: Is the statement understandable? Is the grammar defensible? Is the connected text correct? Does every weight have a reason? Is the chosen metre genuinely satisfied? Keep the initial prose and revised verse together so the learner can explain the choices."
        }
      },
      {
        "id": "verse-44-06",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: A line fits perfectly but has the wrong noun case. Is it finished?",
          "hi": "Reflect: A line fits perfectly but has the wrong noun case. Is it finished?"
        }
      },
      {
        "id": "verse-44-07",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: No. Metrical correctness does not repair grammar or meaning. Revise and scan again.",
          "hi": "Explanation: No. Metrical correctness does not repair grammar or meaning. Revise and scan again."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-45",
    "rank": 45,
    "unit": {
      "en": "Reading studios and next steps",
      "hi": "Reading studios and next steps"
    },
    "title": {
      "en": "Studio: speech and meaning in Raghuvaṃśa",
      "hi": "Studio: speech and meaning in Raghuvaṃśa"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Read a fresh complete śloka with a worked explanation.",
      "hi": "Read a fresh complete śloka with a worked explanation."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://www.sanskrit-lexicon.uni-koeln.de/scans/csldev/csldoc/build/dictionaries/prefaces/ap90app1.html",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/2-Matravrtta-04.htm"
    ],
    "cards": [
      {
        "id": "verse-45-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "Kālidāsa opens Raghuvaṃśa by saluting Pārvatī and Parameśvara, joined like speech and meaning, for understanding speech and meaning. First read the complete Sanskrit in the examples. Then check its four eight-syllable pādas without referring to the Gītā solution.",
          "hi": "Kālidāsa opens Raghuvaṃśa by saluting Pārvatī and Parameśvara, joined like speech and meaning, for understanding speech and meaning. First read the complete Sanskrit in the examples. Then check its four eight-syllable pādas without referring to the Gītā solution."
        }
      },
      {
        "id": "verse-45-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "वागर्थाविव सम्पृक्तौ · G G G L | L G G G — vā-ga-rthā-vi-va-saṃ-pṛ-ktau. Ga is heavy before r+th; pṛ is heavy before k+t. The odd cadence is regular.",
          "hi": "वागर्थाविव सम्पृक्तौ · G G G L | L G G G — vā-ga-rthā-vi-va-saṃ-pṛ-ktau. Ga is heavy before r+th; pṛ is heavy before k+t. The odd cadence is regular."
        }
      },
      {
        "id": "verse-45-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "वागर्थप्रतिपत्तये · G G G L | L G L G — vā-ga-rtha-pra-ti-pa-tta-ye. Rtha is heavy before p+r. Pa is heavy before t+t. The even cadence is regular.",
          "hi": "वागर्थप्रतिपत्तये · G G G L | L G L G — vā-ga-rtha-pra-ti-pa-tta-ye. Rtha is heavy before p+r. Pa is heavy before t+t. The even cadence is regular."
        }
      },
      {
        "id": "verse-45-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "जगतः पितरौ वन्दे · L L G L | L G G G — ja-ga-taḥ-pi-ta-rau-va-nde. Taḥ is heavy from visarga, rau from au, and va from n+d.",
          "hi": "जगतः पितरौ वन्दे · L L G L | L G G G — ja-ga-taḥ-pi-ta-rau-va-nde. Taḥ is heavy from visarga, rau from au, and va from n+d."
        }
      },
      {
        "id": "verse-45-05",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "पार्वतीपरमेश्वरौ · G L G L | L G L G — pā-rva-tī-pa-ra-me-śva-rau. Long ā, ī, e and au supply the heavy positions shown.",
          "hi": "पार्वतीपरमेश्वरौ · G L G L | L G L G — pā-rva-tī-pa-ra-me-śva-rau. Long ā, ī, e and au supply the heavy positions shown."
        }
      },
      {
        "id": "verse-45-06",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Notice three different reasons for G within one short stanza: a long vowel, a following cluster and visarga or anusvāra. The grammar also matters: pitarau is a dual form, “the two parents,” referring to the pair named in the fourth pāda. Read the four quarters again as one sentence after finishing the technical scan.",
          "hi": "Notice three different reasons for G within one short stanza: a long vowel, a following cluster and visarga or anusvāra. The grammar also matters: pitarau is a dual form, “the two parents,” referring to the pair named in the fourth pāda. Read the four quarters again as one sentence after finishing the technical scan."
        }
      },
      {
        "id": "verse-45-07",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: Why is rtha in vāgarthapratipattaye heavy although its vowel a is short?",
          "hi": "Reflect: Why is rtha in vāgarthapratipattaye heavy although its vowel a is short?"
        }
      },
      {
        "id": "verse-45-08",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: Because p+r follows it before the next vowel. The cluster at the start of prati affects the preceding syllable.",
          "hi": "Explanation: Because p+r follows it before the next vowel. The cluster at the start of prati affects the preceding syllable."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-46",
    "rank": 46,
    "unit": {
      "en": "Reading studios and next steps",
      "hi": "Reading studios and next steps"
    },
    "title": {
      "en": "Studio: the opening of Meghadūta",
      "hi": "Studio: the opening of Meghadūta"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Navigate a whole long stanza and its textual choices.",
      "hi": "Navigate a whole long stanza and its textual choices."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://www-archiv.fdm.uni-hamburg.de/ngmcp/A_386-17_Meghad%25C5%25ABta.html",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/3-Samavrtta-17.htm",
      "https://gallium.inria.fr/~huet/PUBLIC/WSC2018.pdf#page=142"
    ],
    "cards": [
      {
        "id": "verse-46-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "The opening introduces a yakṣa, punished by his lord after neglecting his duty, living apart from his beloved at Rāmagiri. Read the four Mandākrāntā pādas below. Each has seventeen syllables organized 4 + 6 + 7; preserve the source reading throughout.",
          "hi": "The opening introduces a yakṣa, punished by his lord after neglecting his duty, living apart from his beloved at Rāmagiri. Read the four Mandākrāntā pādas below. Each has seventeen syllables organized 4 + 6 + 7; preserve the source reading throughout."
        }
      },
      {
        "id": "verse-46-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "कश्चित् कान्ताविरहगुरुणा स्वाधिकारप्रमत्तः — kaścit kāntā | virahaguruṇā | svādhikārapramattaḥ. Four heavy syllables begin the line. The first division falls between members of the compound.",
          "hi": "कश्चित् कान्ताविरहगुरुणा स्वाधिकारप्रमत्तः — kaścit kāntā | virahaguruṇā | svādhikārapramattaḥ. Four heavy syllables begin the line. The first division falls between members of the compound."
        }
      },
      {
        "id": "verse-46-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "शापेनास्तङ्गमितमहिमा वर्षभोग्येण भर्तुः — śāpenāstaṃ | gamitamahimā | varṣabhogyeṇa bhartuḥ. The curse has diminished his greatness; it is to be endured for a year.",
          "hi": "शापेनास्तङ्गमितमहिमा वर्षभोग्येण भर्तुः — śāpenāstaṃ | gamitamahimā | varṣabhogyeṇa bhartuḥ. The curse has diminished his greatness; it is to be endured for a year."
        }
      },
      {
        "id": "verse-46-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "यक्षश्चक्रे जनकतनयास्नानपुण्योदकेषु — yakṣaś cakre | janakatanayā | snānapuṇyodakeṣu. The line describes waters made holy by the bathing of Janaka’s daughter.",
          "hi": "यक्षश्चक्रे जनकतनयास्नानपुण्योदकेषु — yakṣaś cakre | janakatanayā | snānapuṇyodakeṣu. The line describes waters made holy by the bathing of Janaka’s daughter."
        }
      },
      {
        "id": "verse-46-05",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "स्निग्धच्छायातरुषु वसतिं रामगिर्याश्रमेषु — snigdhacchāyā | taruṣu vasatiṃ | rāmagiryāśrameṣu. He makes his dwelling in Rāmagiri’s hermitages, among trees with welcoming shade.",
          "hi": "स्निग्धच्छायातरुषु वसतिं रामगिर्याश्रमेषु — snigdhacchāyā | taruṣu vasatiṃ | rāmagiryāśrameṣu. He makes his dwelling in Rāmagiri’s hermitages, among trees with welcoming shade."
        },
        "assetIds": [
          "verse-46-hermitage"
        ]
      },
      {
        "id": "verse-46-06",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "The working pattern is GGGG | LLLLLG | GLGGLGG, with ending treatment checked against usage. Final ṣu in pādas 3 and 4 is naturally light; mark the metrical allowance explicitly. Another reading has svādhikārāt pramattaḥ in pāda 1, with a different consonant environment but the same overall pattern. Record the chosen reading rather than calling one wrong from metre alone.",
          "hi": "The working pattern is GGGG | LLLLLG | GLGGLGG, with ending treatment checked against usage. Final ṣu in pādas 3 and 4 is naturally light; mark the metrical allowance explicitly. Another reading has svādhikārāt pramattaḥ in pāda 1, with a different consonant environment but the same overall pattern. Record the chosen reading rather than calling one wrong from metre alone."
        }
      },
      {
        "id": "verse-46-07",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: Why should a lesson show the selected reading alongside its source?",
          "hi": "Reflect: Why should a lesson show the selected reading alongside its source?"
        }
      },
      {
        "id": "verse-46-08",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: Readers may encounter a different edition. Seeing the reading and its scan prevents normal textual variation from looking like an unexplained error.",
          "hi": "Explanation: Readers may encounter a different edition. Seeing the reading and its scan prevents normal textual variation from looking like an unexplained error."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-47",
    "rank": 47,
    "unit": {
      "en": "Reading studios and next steps",
      "hi": "Reading studios and next steps"
    },
    "title": {
      "en": "Studio: explain Āryā to another learner",
      "hi": "Studio: explain Āryā to another learner"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Show the internal structure instead of reciting totals.",
      "hi": "Show the internal structure instead of reciting totals."
    },
    "minutes": 8,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/2-Matravrtta-01.htm"
    ],
    "cards": [
      {
        "id": "verse-47-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "Imagine teaching someone who knows only “12, 18, 12, 15.” Show what that summary leaves out using Vṛttaratnākara 2.23. The verse describes Āryā while demonstrating it: seven groups plus a heavy ending, no ja in odd groups, and a specially regulated sixth group.",
          "hi": "Imagine teaching someone who knows only “12, 18, 12, 15.” Show what that summary leaves out using Vṛttaratnākara 2.23. The verse describes Āryā while demonstrating it: seven groups plus a heavy ending, no ja in odd groups, and a specially regulated sixth group."
        },
        "assetIds": [
          "verse-47-peer"
        ]
      },
      {
        "id": "verse-47-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "lakṣmaitat sapta gaṇā gopetā bhavati neha viṣame jaḥ — First half of the Sanskrit definition. Meaning in outline: these are its characteristics—seven groups, with a final heavy; no ja-group in an odd position.",
          "hi": "lakṣmaitat sapta gaṇā gopetā bhavati neha viṣame jaḥ — First half of the Sanskrit definition. Meaning in outline: these are its characteristics—seven groups, with a final heavy; no ja-group in an odd position."
        }
      },
      {
        "id": "verse-47-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "lakṣ mai | tat sap | ta ga ṇā || go pe | tā bha va | ti ne ha | vi ṣa me | jaḥ — GG | GG | LLG || GG | GLL | LGL | LLG | G. The first three groups give 12; the rest give 18. The sixth group ti-ne-ha is LGL. Dividers show metrical groups, not word separation.",
          "hi": "lakṣ mai | tat sap | ta ga ṇā || go pe | tā bha va | ti ne ha | vi ṣa me | jaḥ — GG | GG | LLG || GG | GLL | LGL | LLG | G. The first three groups give 12; the rest give 18. The sixth group ti-ne-ha is LGL. Dividers show metrical groups, not word separation."
        }
      },
      {
        "id": "verse-47-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "ṣaṣṭho ’yaṃ nalaghū vā prathame ’rdhe niyatam āryāyāḥ — Second half continues the regulation of the sixth group in the first half. The expression na + laghu gives four lights as its alternative. The next rule, 2.24, supplies further division conditions and the second-half treatment.",
          "hi": "ṣaṣṭho ’yaṃ nalaghū vā prathame ’rdhe niyatam āryāyāḥ — Second half continues the regulation of the sixth group in the first half. The expression na + laghu gives four lights as its alternative. The next rule, 2.24, supplies further division conditions and the second-half treatment."
        }
      },
      {
        "id": "verse-47-05",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "ṣaṣ ṭho | yaṃ na la | ghū vā || pra tha me | rdhe ni ya | ta | mā ryā | yāḥ — GG | GLL | GG || LLG | GLL | L | GG | G. Read 4+4+4 || 4+4+1+4+2 = 12 || 15. Sandhi gives niyatamāryāyāḥ across the last groups.",
          "hi": "ṣaṣ ṭho | yaṃ na la | ghū vā || pra tha me | rdhe ni ya | ta | mā ryā | yāḥ — GG | GLL | GG || LLG | GLL | L | GG | G. Read 4+4+4 || 4+4+1+4+2 = 12 || 15. Sandhi gives niyatamāryāyāḥ across the last groups."
        }
      },
      {
        "id": "verse-47-06",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Now try replacing the first GG group with LGL. It still totals four, but the odd-group restriction rejects it. This near-miss shows why a complete explanation needs both arithmetic and position. The real Sanskrit example also shows why mātrā-group divisions cannot be mistaken for grammatical word boundaries; keep the unbroken verse beside the analysis.",
          "hi": "Now try replacing the first GG group with LGL. It still totals four, but the odd-group restriction rejects it. This near-miss shows why a complete explanation needs both arithmetic and position. The real Sanskrit example also shows why mātrā-group divisions cannot be mistaken for grammatical word boundaries; keep the unbroken verse beside the analysis."
        }
      },
      {
        "id": "verse-47-07",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: What is the best explanation of why the proposed first-group swap fails?",
          "hi": "Reflect: What is the best explanation of why the proposed first-group swap fails?"
        }
      },
      {
        "id": "verse-47-08",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: The total is unchanged, but LGL is excluded in Āryā’s odd full groups. A correct total cannot override a positional rule.",
          "hi": "Explanation: The total is unchanged, but LGL is excluded in Āryā’s odd full groups. A correct total cannot override a positional rule."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  },
  {
    "id": "verse-48",
    "rank": 48,
    "unit": {
      "en": "Reading studios and next steps",
      "hi": "Reading studios and next steps"
    },
    "title": {
      "en": "Finish with evidence, then choose a branch",
      "hi": "Finish with evidence, then choose a branch"
    },
    "titleSa": "छन्दः",
    "titleIast": "chandaḥ",
    "outcome": {
      "en": "Show what you can transfer to a new verse.",
      "hi": "Show what you can transfer to a new verse."
    },
    "minutes": 31,
    "prereqIds": [],
    "sourceReading": true,
    "sourceUrls": [
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/1-Samjnabhidhana.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Chandas-Sastra/Chandas-Sastra-03.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/6-Prastharadi.htm",
      "https://www.sanskrit-lexicon.uni-koeln.de/scans/csldev/csldoc/build/dictionaries/prefaces/ap90app1.html",
      "https://www.learnsanskrit.org/guide/core/syllables/",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/1-Samjnabhidhana.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/2-Matravrtta-04.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/3-Samavrtta-11.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/3-Samavrtta-12.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/3-Samavrtta-14.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/3-Samavrtta-15.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/3-Samavrtta-17.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/3-Samavrtta-18-26.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/2-Matravrtta-01.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/2-Matravrtta-02.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/2-Matravrtta-03.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/4-Ardhasamavrtta.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/5-Visamavrtta.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Vrttaratnakara/6-Prastharadi.htm",
      "https://ancient-buddhist-texts.net/Textual-Studies/Chandas-Sastra/Chandas-Sastra-03.htm",
      "https://vedicheritage.gov.in/hi/samhitas/rigveda/shakala-samhita/mandal-01/",
      "https://vedicheritage.gov.in/pdf/Sruti_Dharmadhikari.pdf",
      "https://gallium.inria.fr/~huet/PUBLIC/WSC2018.pdf#page=142",
      "https://www-archiv.fdm.uni-hamburg.de/ngmcp/A_386-17_Meghad%25C5%25ABta.html",
      "https://chandas.org/documentation.html"
    ],
    "cards": [
      {
        "id": "verse-48-01",
        "kind": "teach",
        "title": {
          "en": "Understand",
          "hi": "Understand"
        },
        "body": {
          "en": "A completed reading should contain the text and source, pāda division, vowel count, weight reasons, candidate metre, relevant exceptions and a plain-language meaning. Then read it fluently. This is a stronger endpoint than remembering a list of metre names.",
          "hi": "A completed reading should contain the text and source, pāda division, vowel count, weight reasons, candidate metre, relevant exceptions and a plain-language meaning. Then read it fluently. This is a stronger endpoint than remembering a list of metre names."
        },
        "assetIds": [
          "verse-48-study"
        ]
      },
      {
        "id": "verse-48-02",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Classical reader · continue from studios 1 and 2 — Take a new sourced śloka, Upajāti and long-metre stanza. Produce the same annotated reading, then compare with an edition or teacher.",
          "hi": "Classical reader · continue from studios 1 and 2 — Take a new sourced śloka, Upajāti and long-metre stanza. Produce the same annotated reading, then compare with an edition or teacher."
        }
      },
      {
        "id": "verse-48-03",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Composer · continue from the composition lesson — Write a small complete stanza, keep the prose sense, and obtain grammatical as well as metrical review.",
          "hi": "Composer · continue from the composition lesson — Write a small complete stanza, keep the prose sense, and obtain grammatical as well as metrical review."
        }
      },
      {
        "id": "verse-48-04",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Vedic learner · continue within a named tradition — Study matched accented texts and reviewed recordings with a teacher. Extend metre, phonetics and recitation together.",
          "hi": "Vedic learner · continue within a named tradition — Study matched accented texts and reviewed recordings with a teacher. Extend metre, phonetics and recitation together."
        }
      },
      {
        "id": "verse-48-05",
        "kind": "teach",
        "title": {
          "en": "Cases and examples",
          "hi": "Cases and examples"
        },
        "body": {
          "en": "Scholar · continue through the primary manuals — Use the catalogue for rare metres, commentaries for exceptions and multiple editions for textual problems. Retain uncertainty when the evidence is unresolved.",
          "hi": "Scholar · continue through the primary manuals — Use the catalogue for rare metres, commentaries for exceptions and multiple editions for textual problems. Retain uncertainty when the evidence is unresolved."
        }
      },
      {
        "id": "verse-48-06",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "This course covers the core mechanisms, common Classical repertoire, mātrā families, Vedic orientation and the tools for further reading. It does not exhaust every historical metre, every commentary, every Vedic śākhā or the independent prosodies of Pāli, Prakrit and regional languages. Breadth means a complete navigational map with honest depth labels—not an unsupported claim that 48 lessons replace the whole discipline.",
          "hi": "This course covers the core mechanisms, common Classical repertoire, mātrā families, Vedic orientation and the tools for further reading. It does not exhaust every historical metre, every commentary, every Vedic śākhā or the independent prosodies of Pāli, Prakrit and regional languages. Breadth means a complete navigational map with honest depth labels—not an unsupported claim that 48 lessons replace the whole discipline."
        }
      },
      {
        "id": "verse-48-07",
        "kind": "teach",
        "title": {
          "en": "Reflection",
          "hi": "Reflection"
        },
        "body": {
          "en": "Reflect: What would demonstrate understanding on a verse you have never seen?",
          "hi": "Reflect: What would demonstrate understanding on a verse you have never seen?"
        }
      },
      {
        "id": "verse-48-08",
        "kind": "teach",
        "title": {
          "en": "Explanation",
          "hi": "Explanation"
        },
        "body": {
          "en": "Explanation: An independently justified scan, a defensible classification, an account of any uncertainty, and a coherent reading of the meaning. The lesson interface can record review, but cannot certify these abilities from a button press.",
          "hi": "Explanation: An independently justified scan, a defensible classification, an account of any uncertainty, and a coherent reading of the meaning. The lesson interface can record review, but cannot certify these abilities from a button press."
        }
      },
      {
        "id": "verse-48-09",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "## Source notes",
          "hi": "## Source notes"
        }
      },
      {
        "id": "verse-48-10",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Apte · Sanskrit Prosody (1890): Public-domain handbook: classical definitions, patterns and literary examples. Its śloka summary is an introduction, not a complete account of variations.",
          "hi": "Apte · Sanskrit Prosody (1890): Public-domain handbook: classical definitions, patterns and literary examples. Its śloka summary is an introduction, not a complete account of variations."
        }
      },
      {
        "id": "verse-48-11",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "LearnSanskrit.org · Syllables: Modern beginner explanation of syllable division and weight; guide licensed CC BY 4.0. The explanations here are newly written.",
          "hi": "LearnSanskrit.org · Syllables: Modern beginner explanation of syllable division and weight; guide licensed CC BY 4.0. The explanations here are newly written."
        }
      },
      {
        "id": "verse-48-12",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Vṛttaratnākara · Definitions: Kedārabhaṭṭa’s primary Sanskrit text, verses 4–22; digital edition by Ānandajoti Bhikkhu.",
          "hi": "Vṛttaratnākara · Definitions: Kedārabhaṭṭa’s primary Sanskrit text, verses 4–22; digital edition by Ānandajoti Bhikkhu."
        }
      },
      {
        "id": "verse-48-13",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Vṛttaratnākara · Vaktra: Primary rules and variants, verses 43–52. Book placement is not a reliable classification: śloka is syllabic.",
          "hi": "Vṛttaratnākara · Vaktra: Primary rules and variants, verses 43–52. Book placement is not a reliable classification: śloka is syllabic."
        }
      },
      {
        "id": "verse-48-14",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Vṛttaratnākara · 11 syllables: Primary definitions of Indravajrā, Upendravajrā, Upajāti and other eleven-syllable metres.",
          "hi": "Vṛttaratnākara · 11 syllables: Primary definitions of Indravajrā, Upendravajrā, Upajāti and other eleven-syllable metres."
        }
      },
      {
        "id": "verse-48-15",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Vṛttaratnākara · 12 syllables: Primary definitions including Vaṃśastha, Toṭaka, Drutavilambita, Bhujaṅgaprayāta and Sragviṇī.",
          "hi": "Vṛttaratnākara · 12 syllables: Primary definitions including Vaṃśastha, Toṭaka, Drutavilambita, Bhujaṅgaprayāta and Sragviṇī."
        }
      },
      {
        "id": "verse-48-16",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Vṛttaratnākara · 14 syllables: Primary definitions including Vasantatilakā.",
          "hi": "Vṛttaratnākara · 14 syllables: Primary definitions including Vasantatilakā."
        }
      },
      {
        "id": "verse-48-17",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Vṛttaratnākara · 15 syllables: Primary definitions including Mālinī.",
          "hi": "Vṛttaratnākara · 15 syllables: Primary definitions including Mālinī."
        }
      },
      {
        "id": "verse-48-18",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Vṛttaratnākara · 17 syllables: Primary definitions of Śikhariṇī, Pṛthvī, Hariṇī and Mandākrāntā.",
          "hi": "Vṛttaratnākara · 17 syllables: Primary definitions of Śikhariṇī, Pṛthvī, Hariṇī and Mandākrāntā."
        }
      },
      {
        "id": "verse-48-19",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Vṛttaratnākara · 18–26 syllables: Primary definitions including Śārdūlavikrīḍita and Sragdharā.",
          "hi": "Vṛttaratnākara · 18–26 syllables: Primary definitions including Śārdūlavikrīḍita and Sragdharā."
        }
      },
      {
        "id": "verse-48-20",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Vṛttaratnākara · Āryā: Primary definitions, internal groups and variants, verses 23–29.",
          "hi": "Vṛttaratnākara · Āryā: Primary definitions, internal groups and variants, verses 23–29."
        }
      },
      {
        "id": "verse-48-21",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Vṛttaratnākara · Gīti family: Primary definitions of related mātrā metres.",
          "hi": "Vṛttaratnākara · Gīti family: Primary definitions of related mātrā metres."
        }
      },
      {
        "id": "verse-48-22",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Vṛttaratnākara · Vaitālīya family: Primary text on cadences and related forms; the opening definition begins on the preceding Gīti page.",
          "hi": "Vṛttaratnākara · Vaitālīya family: Primary text on cadences and related forms; the opening definition begins on the preceding Gīti page."
        }
      },
      {
        "id": "verse-48-23",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Vṛttaratnākara · Alternating quarters: Primary examples of ardhasamavṛtta.",
          "hi": "Vṛttaratnākara · Alternating quarters: Primary examples of ardhasamavṛtta."
        }
      },
      {
        "id": "verse-48-24",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Vṛttaratnākara · Unequal quarters: Primary examples showing how unequal quarters can form a prescribed stanza.",
          "hi": "Vṛttaratnākara · Unequal quarters: Primary examples showing how unequal quarters can form a prescribed stanza."
        }
      },
      {
        "id": "verse-48-25",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Vṛttaratnākara · Enumeration: Primary algorithms: prastāra, naṣṭa, uddiṣṭa and counting, verses 194–202.",
          "hi": "Vṛttaratnākara · Enumeration: Primary algorithms: prastāra, naṣṭa, uddiṣṭa and counting, verses 194–202."
        }
      },
      {
        "id": "verse-48-26",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Piṅgala · Vedic metres: Primary Vedic classification, including variant line lengths and nicṛt/bhurij.",
          "hi": "Piṅgala · Vedic metres: Primary Vedic classification, including variant line lengths and nicṛt/bhurij."
        }
      },
      {
        "id": "verse-48-27",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Vedic Heritage · Ṛgveda 1.1: IGNCA portal: accented Śākala text and a linked recitation. Use the named tradition, not a generic synthesized chant.",
          "hi": "Vedic Heritage · Ṛgveda 1.1: IGNCA portal: accented Śākala text and a linked recitation. Use the named tradition, not a generic synthesized chant."
        }
      },
      {
        "id": "verse-48-28",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Vedic Heritage · Recitation methods: Reference for saṃhitā, pada, krama and vikṛti recitation. This course introduces their purposes; it does not certify performance.",
          "hi": "Vedic Heritage · Recitation methods: Reference for saṃhitā, pada, krama and vikṛti recitation. This course introduces their purposes; it does not certify performance."
        }
      },
      {
        "id": "verse-48-29",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Rajagopalan · Metrical analysis: Research paper in Computational Sanskrit & Digital Humanities, pp. 119–144: metre identification, practical ambiguity and pāda endings.",
          "hi": "Rajagopalan · Metrical analysis: Research paper in Computational Sanskrit & Digital Humanities, pp. 119–144: metre identification, practical ambiguity and pāda endings."
        }
      },
      {
        "id": "verse-48-30",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Hamburg manuscript catalogue · Meghadūta 1: Manuscript opening attests the svādhikārapramattaḥ reading used here. Sanskrit excerpt is an ancient primary text.",
          "hi": "Hamburg manuscript catalogue · Meghadūta 1: Manuscript opening attests the svādhikārapramattaḥ reading used here. Sanskrit excerpt is an ancient primary text."
        }
      },
      {
        "id": "verse-48-31",
        "kind": "teach",
        "title": {
          "en": "Qualifications",
          "hi": "Qualifications"
        },
        "body": {
          "en": "Chandas · Documentation: A computational aid for checking candidates. A match is evidence, not a substitute for reading the source.",
          "hi": "Chandas · Documentation: A computational aid for checking candidates. A match is evidence, not a substitute for reading the source."
        }
      }
    ],
    "sourcesLabel": {
      "en": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.",
      "hi": "Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher."
    }
  }
];
export const SOURCE_READING_UNITS: LearnV2Unit[] = [
  {
    "id": "guide-art-start",
    "rank": 21,
    "title": {
      "en": "Start here",
      "hi": "यहाँ से शुरू करें"
    },
    "titleSa": "आरम्भः",
    "lessonIds": [
      "guide-art-how-it-works"
    ]
  },
  {
    "id": "guide-art-cases",
    "rank": 22,
    "title": {
      "en": "The 8 cases",
      "hi": "आठ विभक्तियाँ"
    },
    "titleSa": "विभक्तयः",
    "lessonIds": [
      "guide-art-dative",
      "guide-art-ablative",
      "guide-art-locative",
      "guide-art-karaka",
      "guide-art-accusative",
      "guide-art-cases-overview",
      "guide-art-nominative-vocative",
      "guide-art-instrumental",
      "guide-art-genitive",
      "guide-art-upapada"
    ]
  },
  {
    "id": "guide-art-nouns",
    "rank": 24,
    "title": {
      "en": "Nouns",
      "hi": "संज्ञा"
    },
    "titleSa": "नामपदानि",
    "lessonIds": [
      "guide-art-stem-ending",
      "guide-art-number",
      "guide-art-gender",
      "guide-art-agreement"
    ]
  },
  {
    "id": "guide-art-sounds",
    "rank": 29,
    "title": {
      "en": "Sounds & script",
      "hi": "ध्वनि और लिपि"
    },
    "titleSa": "वर्णाः",
    "lessonIds": [
      "guide-art-vowels",
      "guide-art-consonants"
    ]
  },
  {
    "id": "guide-art-families",
    "rank": 38,
    "title": {
      "en": "Noun families",
      "hi": "शब्दरूप"
    },
    "titleSa": "शब्दरूपाणि",
    "lessonIds": [
      "guide-art-a-masculine",
      "guide-art-a-neuter",
      "guide-art-aa-feminine",
      "guide-art-i-stems",
      "guide-art-u-stems",
      "guide-art-ii-uu-feminine",
      "guide-art-r-stems",
      "guide-art-odd-nouns"
    ]
  },
  {
    "id": "guide-art-pronouns",
    "rank": 46,
    "title": {
      "en": "Pronouns & numbers",
      "hi": "सर्वनाम और संख्या"
    },
    "titleSa": "सर्वनामानि सङ्ख्याश्च",
    "lessonIds": [
      "guide-art-pronoun-i-we",
      "guide-art-pronoun-you",
      "guide-art-pronoun-he-she-it",
      "guide-art-pronoun-this-that",
      "guide-art-pronoun-who-which",
      "guide-art-polite-you",
      "guide-art-numbers-1-10",
      "guide-art-numbers-big-time"
    ]
  },
  {
    "id": "guide-art-verbs",
    "rank": 54,
    "title": {
      "en": "Verbs",
      "hi": "क्रिया"
    },
    "titleSa": "क्रियापदानि",
    "lessonIds": [
      "guide-art-verb-grid",
      "guide-art-two-endings",
      "guide-art-verb-classes",
      "guide-art-to-be"
    ]
  },
  {
    "id": "guide-art-tenses",
    "rank": 58,
    "title": {
      "en": "Tenses & moods",
      "hi": "काल और भाव"
    },
    "titleSa": "लकाराः",
    "lessonIds": [
      "guide-art-lakaras-overview",
      "guide-art-present-tense",
      "guide-art-command-mood",
      "guide-art-simple-past",
      "guide-art-future-tense",
      "guide-art-should-may",
      "guide-art-story-past",
      "guide-art-aorist-rare"
    ]
  },
  {
    "id": "guide-art-small-words",
    "rank": 66,
    "title": {
      "en": "Small words",
      "hi": "अव्यय"
    },
    "titleSa": "अव्ययानि",
    "lessonIds": [
      "guide-art-indeclinables",
      "guide-art-joining-words",
      "guide-art-question-place-time",
      "guide-art-na-ma",
      "guide-art-iti"
    ]
  },
  {
    "id": "guide-art-sentences",
    "rank": 71,
    "title": {
      "en": "Sentences",
      "hi": "वाक्य"
    },
    "titleSa": "वाक्यम्",
    "lessonIds": [
      "guide-art-word-order",
      "guide-art-subject-verb",
      "guide-art-relative-clauses",
      "guide-art-participle-clauses"
    ]
  },
  {
    "id": "guide-art-sandhi",
    "rank": 75,
    "title": {
      "en": "Sandhi: sounds that merge",
      "hi": "सन्धि: मिलती ध्वनियाँ"
    },
    "titleSa": "सन्धिः",
    "lessonIds": [
      "guide-art-sandhi-guna"
    ]
  },
  {
    "id": "guide-art-compounds",
    "rank": 76,
    "title": {
      "en": "Compounds",
      "hi": "समास"
    },
    "titleSa": "समासाः",
    "lessonIds": [
      "guide-art-dvandva",
      "guide-art-tatpurusha",
      "guide-art-nan-upapada",
      "guide-art-bahuvrihi"
    ]
  },
  {
    "id": "guide-art-krdanta",
    "rank": 80,
    "title": {
      "en": "Verb-made words",
      "hi": "धातु से बने शब्द"
    },
    "titleSa": "कृदन्ताः",
    "lessonIds": [
      "guide-art-ktva-lyap",
      "guide-art-tumun",
      "guide-art-kta-ktavatu",
      "guide-art-present-participles",
      "guide-art-gerundives"
    ]
  },
  {
    "id": "guide-art-voice",
    "rank": 85,
    "title": {
      "en": "Prefixes & voice",
      "hi": "उपसर्ग और वाच्य"
    },
    "titleSa": "उपसर्गाः वाच्यानि च",
    "lessonIds": [
      "guide-art-prefixes",
      "guide-art-passive",
      "guide-art-causative",
      "guide-art-desiderative"
    ]
  },
  {
    "id": "guide-art-taddhita",
    "rank": 89,
    "title": {
      "en": "Word-making suffixes",
      "hi": "शब्द बनाने वाले प्रत्यय"
    },
    "titleSa": "तद्धिताः",
    "lessonIds": [
      "guide-art-feminine-suffixes"
    ]
  },
  {
    "id": "sandhi-source-readings",
    "rank": 3,
    "title": {
      "en": "Sandhi: full source readings",
      "hi": "Sandhi: full source readings"
    },
    "titleSa": "सन्धिः",
    "lessonIds": [
      "sandhi-source-boundary",
      "sandhi-source-like-vowels",
      "sandhi-source-a-combinations",
      "sandhi-source-glides",
      "sandhi-source-e-o",
      "sandhi-source-protected",
      "sandhi-source-stops",
      "sandhi-source-nasals",
      "sandhi-source-a-visarga",
      "sandhi-source-visarga-more",
      "sandhi-source-internal",
      "sandhi-source-retroflex",
      "sandhi-source-reading"
    ]
  },
  {
    "id": "verse-module-01",
    "rank": 4,
    "title": {
      "en": "Verse & Rhythm: Hear the building blocks",
      "hi": "Verse & Rhythm: Hear the building blocks"
    },
    "titleSa": "छन्दः",
    "lessonIds": [
      "verse-01",
      "verse-02",
      "verse-03",
      "verse-04"
    ]
  },
  {
    "id": "verse-module-02",
    "rank": 5,
    "title": {
      "en": "Verse & Rhythm: Light and heavy: every common case",
      "hi": "Verse & Rhythm: Light and heavy: every common case"
    },
    "titleSa": "छन्दः",
    "lessonIds": [
      "verse-05",
      "verse-06",
      "verse-07",
      "verse-08"
    ]
  },
  {
    "id": "verse-module-03",
    "rank": 6,
    "title": {
      "en": "Verse & Rhythm: What context changes",
      "hi": "Verse & Rhythm: What context changes"
    },
    "titleSa": "छन्दः",
    "lessonIds": [
      "verse-09",
      "verse-10",
      "verse-11",
      "verse-12"
    ]
  },
  {
    "id": "verse-module-04",
    "rank": 7,
    "title": {
      "en": "Verse & Rhythm: Scan an entire verse",
      "hi": "Verse & Rhythm: Scan an entire verse"
    },
    "titleSa": "छन्दः",
    "lessonIds": [
      "verse-13",
      "verse-14",
      "verse-15",
      "verse-16"
    ]
  },
  {
    "id": "verse-module-05",
    "rank": 8,
    "title": {
      "en": "Verse & Rhythm: Understand the śloka",
      "hi": "Verse & Rhythm: Understand the śloka"
    },
    "titleSa": "छन्दः",
    "lessonIds": [
      "verse-17",
      "verse-18",
      "verse-19",
      "verse-20"
    ]
  },
  {
    "id": "verse-module-06",
    "rank": 9,
    "title": {
      "en": "Verse & Rhythm: Meet the classical families",
      "hi": "Verse & Rhythm: Meet the classical families"
    },
    "titleSa": "छन्दः",
    "lessonIds": [
      "verse-21",
      "verse-22",
      "verse-23",
      "verse-24"
    ]
  },
  {
    "id": "verse-module-07",
    "rank": 10,
    "title": {
      "en": "Verse & Rhythm: Read longer metres",
      "hi": "Verse & Rhythm: Read longer metres"
    },
    "titleSa": "छन्दः",
    "lessonIds": [
      "verse-25",
      "verse-26",
      "verse-27",
      "verse-28"
    ]
  },
  {
    "id": "verse-module-08",
    "rank": 11,
    "title": {
      "en": "Verse & Rhythm: Measure time: mātrā metres",
      "hi": "Verse & Rhythm: Measure time: mātrā metres"
    },
    "titleSa": "छन्दः",
    "lessonIds": [
      "verse-29",
      "verse-30",
      "verse-31",
      "verse-32"
    ]
  },
  {
    "id": "verse-module-09",
    "rank": 12,
    "title": {
      "en": "Verse & Rhythm: Read poetry as poetry",
      "hi": "Verse & Rhythm: Read poetry as poetry"
    },
    "titleSa": "छन्दः",
    "lessonIds": [
      "verse-33",
      "verse-34",
      "verse-35",
      "verse-36"
    ]
  },
  {
    "id": "verse-module-10",
    "rank": 13,
    "title": {
      "en": "Verse & Rhythm: Enter Vedic verse carefully",
      "hi": "Verse & Rhythm: Enter Vedic verse carefully"
    },
    "titleSa": "छन्दः",
    "lessonIds": [
      "verse-37",
      "verse-38",
      "verse-39",
      "verse-40"
    ]
  },
  {
    "id": "verse-module-11",
    "rank": 14,
    "title": {
      "en": "Verse & Rhythm: Investigate and create",
      "hi": "Verse & Rhythm: Investigate and create"
    },
    "titleSa": "छन्दः",
    "lessonIds": [
      "verse-41",
      "verse-42",
      "verse-43",
      "verse-44"
    ]
  },
  {
    "id": "verse-module-12",
    "rank": 15,
    "title": {
      "en": "Verse & Rhythm: Reading studios and next steps",
      "hi": "Verse & Rhythm: Reading studios and next steps"
    },
    "titleSa": "छन्दः",
    "lessonIds": [
      "verse-45",
      "verse-46",
      "verse-47",
      "verse-48"
    ]
  }
];
