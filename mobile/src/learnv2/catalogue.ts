// LearnV2 static catalogue — validated content only.
//
// Every Sanskrit string below was reviewed 12 Oct 2026 against the cited
// source (see specs/learn-v2/sources.jsonl). Drafts live in coverage.md,
// never here. No card carries an expandable note: qualifications from the
// pilot manuscripts are merged into `body` as plain sentences.

import type { LearnV2Lesson, LearnV2Unit } from "./types";
import { SOURCE_READING_LESSONS, SOURCE_READING_UNITS } from "./sourceReadings";

export const LEARNV2_VERSION = 1;

export const REVIEWED_LEARNV2_LESSONS: LearnV2Lesson[] = [
  // ─── 1. Verb number: one, two and many readers ──────────────────────────
  {
    id: "verbs-number",
    rank: 1,
    unit: { en: "Beginnings", hi: "आरंभ" },
    title: { en: "One, two and many readers", hi: "एक, दो और अनेक पाठक" },
    titleSa: "पठति · पठतः · पठन्ति",
    titleIast: "paṭhati · paṭhataḥ · paṭhanti",
    outcome: {
      en: "Connect three verb forms to one, exactly two, and three-or-more readers.",
      hi: "तीन क्रिया-रूपों को एक, ठीक दो और तीन-या-अधिक पाठकों से जोड़ें।",
    },
    minutes: 8,
    prereqIds: [],
    sourcesLabel: {
      en: "Adapted from the learnsanskrit.org guide (CC BY 4.0).",
      hi: "learnsanskrit.org मार्गदर्शिका से रूपांतरित (CC BY 4.0)।",
    },
    cards: [
      {
        id: "verbs-number-1",
        kind: "teach",
        title: { en: "Start with the action: reading.", hi: "क्रिया से शुरू करें: पढ़ना।" },
        body: {
          en: "The girl is reading. पठति names that action for one person we are talking about. Start with the scene and its meaning; then inspect how the form is built. This present form can mean “reads” or “is reading” — context supplies the English choice.",
          hi: "लड़की पढ़ रही है। पठति उस क्रिया का नाम है, जब हम एक व्यक्ति की बात करते हैं। पहले दृश्य और अर्थ देखें; फिर रूप की बनावट समझें। इसका अर्थ “पढ़ता है” या “पढ़ रहा है” हो सकता है — संदर्भ से चुनें।",
        },
        example: {
          sa: "पठति",
          iast: "paṭhati",
          gloss: { en: "She reads / she is reading.", hi: "वह (लड़की) पढ़ती है / पढ़ रही है।" },
          alt: { en: "One learner reading an open book.", hi: "एक विद्यार्थी खुली पुस्तक पढ़ता हुआ।" },
        },
        assetId: "verbs-reading-single",
        term: {
          sa: "क्रिया",
          iast: "kriyā",
          meaning: { en: "A verb: a word that names an action with person and number.", hi: "क्रिया: वह शब्द जो पुरुष और वचन सहित क्रिया बताए।" },
        },
      },
      {
        id: "verbs-number-2",
        kind: "teach",
        title: { en: "Root, stem, complete verb.", hi: "धातु, अंग और पूर्ण क्रिया।" },
        body: {
          en: "The root पठ् carries “read”. Its present stem here is पठ. Adding the ending ति gives पठति. A root names the basic action; the complete verb adds who and how many. This is one verb class; other classes build their stems differently.",
          hi: "धातु पठ् में “पढ़ना” का अर्थ है। यहाँ वर्तमान अंग पठ है। अंत में ति जुड़कर पठति बनता है। धातु मूल क्रिया बताती है; पूर्ण क्रिया बताती है कौन और कितने। यह एक वर्ग का उदाहरण है; अन्य वर्ग अंग अलग बनाते हैं।",
        },
        steps: [
          { sa: "पठ्", iast: "paṭh", label: { en: "root", hi: "धातु" } },
          { sa: "पठ", iast: "paṭha", label: { en: "present stem", hi: "वर्तमान अंग" } },
          { sa: "पठति", iast: "paṭhati", label: { en: "verb", hi: "क्रिया" } },
        ],
        example: {
          sa: "पठ + ति → पठति",
          iast: "paṭha + ti → paṭhati",
          gloss: { en: "Stem plus ending gives the complete verb.", hi: "अंग और प्रत्यय मिलकर पूर्ण क्रिया बनाते हैं।" },
          alt: { en: "Three-step formation from root to verb.", hi: "धातु से क्रिया तक तीन चरण।" },
        },
        term: {
          sa: "धातु",
          iast: "dhātu",
          meaning: { en: "A verbal root: the core that carries the action's meaning.", hi: "धातु: क्रिया का मूल, जिसमें क्रिया का अर्थ रहता है।" },
        },
      },
      {
        id: "verbs-number-3",
        kind: "teach",
        title: { en: "He reads. She reads. Same verb.", hi: "वह पढ़ता है। वह पढ़ती है। एक ही क्रिया।" },
        body: {
          en: "The pronoun changes between “she” and “he”, but पठति stays the same. This verb agrees in person and number; it adds no feminine ending for the girl. Here स is the connected form of सः before a consonant.",
          hi: "“वह (लड़की)” और “वह (लड़का)” में सर्वनाम बदलता है, पर पठति वही रहता है। यह क्रिया पुरुष और वचन से मेल खाती है; लड़की के लिए स्त्रीलिंग अंत नहीं जोड़ती। यहाँ स व्यंजन से पहले सः का जुड़ा रूप है।",
        },
        rows: [
          { sa: "सा पठति ।", iast: "sā paṭhati.", gloss: { en: "She reads.", hi: "वह (लड़की) पढ़ती है।" } },
          { sa: "स पठति ।", iast: "sa paṭhati.", gloss: { en: "He reads.", hi: "वह (लड़का) पढ़ता है।" } },
        ],
        term: {
          sa: "पुरुष",
          iast: "puruṣa",
          meaning: { en: "Grammatical person: whether we talk about them, you, or I.", hi: "पुरुष: हम उनकी, तुम्हारी या मेरी बात करते हैं — इसका व्याकरणिक भेद।" },
        },
      },
      {
        id: "verbs-number-4",
        kind: "teach",
        title: { en: "Exactly two readers have their own form.", hi: "ठीक दो पाठकों का अपना रूप है।" },
        body: {
          en: "Both children are reading. Sanskrit uses the dual for exactly two: पठतः. It differs from both पठति and the plural ahead. We are talking about two people, so this is third person; speaking to two people directly needs a different ending.",
          hi: "दोनों बच्चे पढ़ रहे हैं। ठीक दो के लिए संस्कृत में द्विवचन है: पठतः। यह पठति से भी अलग है और आगे आने वाले बहुवचन से भी। हम दो लोगों की बात कर रहे हैं, इसलिए यह प्रथम पुरुष है; दो से सीधे बात करने पर अंत बदलता है।",
        },
        example: {
          sa: "पठतः",
          iast: "paṭhataḥ",
          gloss: { en: "The two of them read.", hi: "वे दोनों पढ़ते हैं।" },
          alt: { en: "Exactly two learners reading books.", hi: "ठीक दो विद्यार्थी पुस्तकें पढ़ते हुए।" },
        },
        assetId: "verbs-reading-dual",
        term: {
          sa: "द्विवचन",
          iast: "dvivacana",
          meaning: { en: "The dual number: the form used for exactly two.", hi: "द्विवचन: ठीक दो के लिए प्रयुक्त रूप।" },
        },
      },
      {
        id: "verbs-number-5",
        kind: "anchor",
        title: { en: "Keep the action. Change the ending.", hi: "क्रिया वही। अंत बदलें।" },
        body: {
          en: "The same stem पठ still carries reading. The ending तः marks these two readers. Its final ः is visarga, a sound of its own, not plain ह् (Roman: ḥ).",
          hi: "वही अंग पठ पढ़ने का अर्थ रखता है। अंत तः इन दो पाठकों को बताता है। अंतिम ः विसर्ग है, जिसे ḥ लिखते हैं — यह साधारण h नहीं।",
        },
        example: {
          sa: "पठ + तः → पठतः",
          iast: "paṭha + taḥ → paṭhataḥ",
          gloss: { en: "Same stem, dual ending.", hi: "वही अंग, द्विवचन का अंत।" },
          formula: "stem + तः → dual",
          alt: { en: "Exactly two learners reading; the ending changes.", hi: "ठीक दो विद्यार्थी पढ़ते हुए; अंत बदलता है।" },
        },
        assetId: "verbs-reading-dual",
      },
      {
        id: "verbs-number-6",
        kind: "teach",
        title: { en: "Three or more: the plural.", hi: "तीन या अधिक: बहुवचन।" },
        body: {
          en: "Now a group of children is reading. For three or more people we are talking about, use पठन्ति. The picture shows one group, but the same form covers any larger group too. All three forms so far are third person.",
          hi: "अब बच्चों का समूह पढ़ रहा है। तीन या अधिक लोगों की बात हो तो पठन्ति प्रयोग करें। चित्र में एक समूह है, पर यही रूप बड़े समूह के लिए भी है। अब तक तीनों रूप प्रथम पुरुष के हैं।",
        },
        example: {
          sa: "पठन्ति",
          iast: "paṭhanti",
          gloss: { en: "They read.", hi: "वे (सब) पढ़ते हैं।" },
          alt: { en: "A group of learners reading books.", hi: "विद्यार्थियों का समूह पुस्तकें पढ़ता हुआ।" },
        },
        assetId: "verbs-reading-plural",
        term: {
          sa: "बहुवचन",
          iast: "bahuvacana",
          meaning: { en: "The plural number: the form for three or more.", hi: "बहुवचन: तीन या अधिक के लिए रूप।" },
        },
      },
      {
        id: "verbs-number-7",
        kind: "anchor",
        title: { en: "Find the stem inside पठन्ति.", hi: "पठन्ति में अंग पहचानें।" },
        body: {
          en: "The stem पठ remains. The ending न्ति signals these plural readers. In writing, न् and त join into one conjunct, yet the word still holds the same reading stem. Do not attach -न्ति to every verb; each class has its own endings.",
          hi: "अंग पठ बना रहता है। अंत न्ति इन बहुवचन पाठकों को बताता है। लेखन में न् और त एक संयुक्त अक्षर बनाते हैं, फिर भी वही पढ़ने वाला अंग रहता है। -न्ति हर क्रिया में न जोड़ें; हर वर्ग के अपने अंत हैं।",
        },
        example: {
          sa: "पठ + न्ति → पठन्ति",
          iast: "paṭha + nti → paṭhanti",
          gloss: { en: "Same stem, plural ending.", hi: "वही अंग, बहुवचन का अंत।" },
          formula: "stem + न्ति → plural",
          alt: { en: "A group reading; the stem stays inside the long word.", hi: "समूह पढ़ता हुआ; लंबे शब्द में अंग बना रहता है।" },
        },
        assetId: "verbs-reading-plural",
      },
      {
        id: "verbs-number-8",
        kind: "summary",
        title: { en: "One action. Three numbers.", hi: "एक क्रिया। तीन वचन।" },
        body: {
          en: "The action stays “read”; only the ending changes with number. You can now explain one, two and many readers without a nine-form table. Next comes a new question: keeping the action, how do “I read” and “you read” sound? Scope so far: third person, present, one verb class.",
          hi: "क्रिया “पढ़ना” वही रहती है; केवल वचन से अंत बदलता है। अब आप नौ-रूपों की तालिका बिना एक, दो और अनेक पाठक समझा सकते हैं। अगला प्रश्न: वही क्रिया “मैं पढ़ता हूँ” और “तुम पढ़ते हो” में कैसी लगेगी? अब तक: प्रथम पुरुष, वर्तमान काल, एक वर्ग।",
        },
        rows: [
          { sa: "पठति", iast: "paṭhati", gloss: { en: "one reads", hi: "एक पढ़ता है" } },
          { sa: "पठतः", iast: "paṭhataḥ", gloss: { en: "two read", hi: "दो पढ़ते हैं" } },
          { sa: "पठन्ति", iast: "paṭhanti", gloss: { en: "three or more read", hi: "तीन या अधिक पढ़ते हैं" } },
        ],
      },
      {
        id: "verbs-number-9",
        kind: "practice",
        title: { en: "Try it: two readers.", hi: "करके देखें: दो पाठक।" },
        body: {
          en: "Picture exactly two children, both reading. Reach for the form before checking.",
          hi: "ठीक दो बच्चों की कल्पना करें, दोनों पढ़ रहे हैं। उत्तर देखे बिना रूप चुनें।",
        },
        practice: {
          prompt: {
            en: "Exactly two children are reading. Which verb says so?",
            hi: "ठीक दो बच्चे पढ़ रहे हैं। कौन-सी क्रिया यह कहती है?",
          },
          choices: [
            { label: { en: "पठति (paṭhati)", hi: "पठति (paṭhati)" }, correct: false },
            { label: { en: "पठतः (paṭhataḥ)", hi: "पठतः (paṭhataḥ)" }, correct: true },
            { label: { en: "पठन्ति (paṭhanti)", hi: "पठन्ति (paṭhanti)" }, correct: false },
          ],
          explain: {
            en: "पठतः is the dual: exactly two. पठति is one reader, पठन्ति is three or more.",
            hi: "पठतः द्विवचन है: ठीक दो। पठति एक पाठक का है, पठन्ति तीन या अधिक का।",
          },
        },
      },
      {
        id: "verbs-number-10",
        kind: "practice",
        title: { en: "Try it: he and she.", hi: "करके देखें: वह और वह।" },
        body: {
          en: "A boy reads alone; a girl reads alone. The verb does not change with gender here. Choose, then read why.",
          hi: "एक लड़का अकेला पढ़ता है; एक लड़की अकेली पढ़ती है। यहाँ क्रिया लिंग से नहीं बदलती। चुनें, फिर कारण पढ़ें।",
        },
        practice: {
          prompt: {
            en: "“He reads” is स पठति. What is “she reads”?",
            hi: "“वह (लड़का) पढ़ता है” स पठति है। “वह (लड़की) पढ़ती है” क्या होगा?",
          },
          choices: [
            { label: { en: "सा पठति (sā paṭhati)", hi: "सा पठति (sā paṭhati)" }, correct: true },
            { label: { en: "सा पठन्ति (sā paṭhanti)", hi: "सा पठन्ति (sā paṭhanti)" }, correct: false },
            { label: { en: "स पठतः (sa paṭhataḥ)", hi: "स पठतः (sa paṭhataḥ)" }, correct: false },
          ],
          explain: {
            en: "Only the pronoun changes (स → सा). The verb पठति stays: finite verbs mark person and number, not the reader's gender.",
            hi: "केवल सर्वनाम बदलता है (स → सा)। क्रिया पठति वही रहती है: क्रिया पुरुष और वचन बताती है, पाठक का लिंग नहीं।",
          },
        },
      },
    ],
  },

  // ─── 2. Where words meet ───────────────────────────────────────────────
  {
    id: "sandhi-boundary",
    rank: 2,
    unit: { en: "How words join", hi: "शब्द कैसे जुड़ते हैं" },
    title: { en: "Where words meet", hi: "जहाँ शब्द मिलते हैं" },
    titleSa: "सन्धि-परिचय",
    titleIast: "sandhi-paricaya",
    outcome: {
      en: "Find the two meeting sounds and their setting before choosing any rule.",
      hi: "कोई नियम चुनने से पहले दोनों मिलने वाली ध्वनियाँ और उनकी स्थिति पहचानें।",
    },
    minutes: 8,
    prereqIds: [],
    sourcesLabel: {
      en: "After Whitney §§109–125, 149 (public domain). Original lesson wording.",
      hi: "Whitney §§109–125, 149 के आधार पर (सार्वजनिक डोमेन)। मूल पाठ-शब्द।",
    },
    cards: [
      {
        id: "sandhi-boundary-1",
        kind: "teach",
        title: { en: "Words can look different together.", hi: "साथ में शब्द अलग दिख सकते हैं।" },
        body: {
          en: "रामः + अस्ति becomes रामोऽस्ति, “Rama is here”. Joining changes the sounds where the words meet, but the words keep their meaning and identity. By this chapter's end you will explain the change and recover both words.",
          hi: "रामः + अस्ति मिलकर रामोऽस्ति बनता है, “राम है”। मिलने से ध्वनियाँ बदलती हैं, पर शब्दों का अर्थ और पहचान बनी रहती है। इस अध्याय के अंत तक आप बदलाव समझाकर दोनों शब्द अलग कर सकेंगे।",
        },
        example: {
          sa: "रामः + अस्ति → रामोऽस्ति",
          iast: "rāmaḥ + asti → rāmo'sti",
          gloss: { en: "“Rama is here.” One boundary changes.", hi: "“राम है।” एक संधि-स्थल बदलता है।" },
          formula: "अः + अ → ओऽ",
          alt: { en: "Two words joining into one written form.", hi: "दो शब्द मिलकर एक लिखित रूप बनाते हुए।" },
        },
        term: {
          sa: "सन्धि",
          iast: "sandhi",
          meaning: { en: "Joining: the sound changes where words or parts meet.", hi: "सन्धि: जहाँ शब्द या भाग मिलें, वहाँ ध्वनि-बदलाव।" },
        },
      },
      {
        id: "sandhi-boundary-2",
        kind: "teach",
        title: { en: "Inspect only the meeting sounds.", hi: "केवल मिलने वाली ध्वनियाँ देखें।" },
        body: {
          en: "In सीता + अपि → सीतापि (“Sita too”), look at Sita's final आ and अपि’s initial अ. Those two vowels meet; most of each word stays unchanged. Start from this small boundary, not the whole joined word.",
          hi: "सीता + अपि → सीतापि (“सीता भी”) में सीता का अंतिम आ और अपि का पहला अ देखें। ये दो स्वर मिलते हैं; बाकी शब्द ज्यों के त्यों रहते हैं। पूरे जुड़े शब्द से नहीं, इस छोटे स्थल से शुरू करें।",
        },
        example: {
          sa: "सीता + अपि → सीतापि",
          iast: "sītā + api → sītāpi",
          gloss: { en: "“Sita too.” Final आ meets initial अ.", hi: "“सीता भी।” अंतिम आ पहले अ से मिलता है।" },
          formula: "आ + अ → आ",
          alt: { en: "Final vowel of one word meeting the first vowel of the next.", hi: "एक शब्द का अंतिम स्वर अगले के पहले स्वर से मिलता हुआ।" },
        },
      },
      {
        id: "sandhi-boundary-3",
        kind: "teach",
        title: { en: "A vowel sign is still a vowel.", hi: "मात्रा भी स्वर है।" },
        body: {
          en: "In सीता the ा sign supplies the final आ — no separate आ letter is needed for a vowel boundary. Read sounds first, then script. A bare त includes अ; विराम turns it into त्, without that vowel.",
          hi: "सीता में ा की मात्रा अंतिम आ देती है — स्वर-संधि के लिए अलग आ अक्षर ज़रूरी नहीं। पहले ध्वनि पढ़ें, फिर लिपि देखें। बिना मात्रा त में अ रहता है; हलन्त जोड़ने पर त् बनता है, जिसमें वह स्वर नहीं रहता।",
        },
        example: {
          sa: "सीता + अपि → सीतापि",
          iast: "sītā + api → sītāpi",
          gloss: { en: "ता ends in आ through its vowel sign.", hi: "ता मात्रा से आ में समाप्त होता है।" },
          formula: "ा = आ",
          alt: { en: "A vowel sign carrying the boundary vowel.", hi: "संधि-स्वर को धारण करती मात्रा।" },
        },
      },
      {
        id: "sandhi-boundary-4",
        kind: "teach",
        title: { en: "Three families give you a map.", hi: "तीन परिवार नक्शा देते हैं।" },
        body: {
          en: "A vowel ending leads to vowel sandhi; a consonant ending to consonant sandhi; a visarga ending needs its own checks, including the vowel before it. Identify the family first and learn one case at a time.",
          hi: "स्वरांत से स्वर-सन्धि, व्यंजनांत से व्यंजन-सन्धि; विसर्गांत की अपनी जाँच होती है, जिसमें पहले का स्वर भी देखना पड़ता है। पहले परिवार पहचानें, फिर एक-एक नियम सीखें।",
        },
        rows: [
          { sa: "आ + अ", iast: "ā + a", gloss: { en: "vowel meets vowel", hi: "स्वर से स्वर मिले" } },
          { sa: "त् + अ", iast: "t + a", gloss: { en: "consonant meets vowel", hi: "व्यंजन से स्वर मिले" } },
          { sa: "ः + अ", iast: "ḥ + a", gloss: { en: "visarga: check first", hi: "विसर्ग: पहले जाँचें" } },
        ],
      },
      {
        id: "sandhi-boundary-5",
        kind: "teach",
        title: { en: "Short and long belong together.", hi: "ह्रस्व और दीर्घ साथ हैं।" },
        body: {
          en: "The line over आ, ई, ऊ marks length. Sandhi often treats both lengths as one family, while some rules need one exact length. Also recognise ऋ and ए/ऐ/ओ/औ (all long vowels in Sanskrit).",
          hi: "आ, ई, ऊ पर रेखा दीर्घता बताती है। सन्धि में अक्सर दोनों लंबाइयाँ एक परिवार हैं, पर कुछ नियमों में ठीक लंबाई चाहिए। ऋ को भी पहचानें; e, ai, o, au संस्कृत में दीर्घ स्वर हैं।",
        },
        rows: [
          { sa: "अ / आ", iast: "a / ā", gloss: { en: "one family", hi: "एक परिवार" } },
          { sa: "इ / ई", iast: "i / ī", gloss: { en: "one family", hi: "एक परिवार" } },
          { sa: "उ / ऊ", iast: "u / ū", gloss: { en: "one family", hi: "एक परिवार" } },
        ],
      },
      {
        id: "sandhi-boundary-6",
        kind: "teach",
        title: { en: "A pause changes the setting.", hi: "विराम स्थिति बदलता है।" },
        body: {
          en: "At a real pause, read the pause form: रामः । stays रामः । Do not force a rule across a full stop just because two written words sit side by side. A space alone never proves spoken joining.",
          hi: "सच्चे विराम पर विराम-रूप पढ़ें: रामः । वही रहता है। केवल पास लिखे होने से पूर्णविराम के पार नियम न लगाएँ। अकेली खाली जगह बोले गए सन्धि का प्रमाण नहीं।",
        },
        example: {
          sa: "रामः ।",
          iast: "rāmaḥ (at pause)",
          gloss: { en: "At a pause, the form stands as is.", hi: "विराम पर रूप ज्यों का त्यों रहता है।" },
          formula: "pause ≠ joining",
          alt: { en: "A word before a pause, unchanged.", hi: "विराम से पहले शब्द, अपरिवर्तित।" },
        },
      },
      {
        id: "sandhi-boundary-7",
        kind: "teach",
        title: { en: "Inside a word is another setting.", hi: "शब्द के भीतर दूसरी स्थिति है।" },
        body: {
          en: "Sandhi also builds words: मरुत् + भिः → मरुद्भिः (“by the winds”). Keep this internal formation apart from joining finished words — similar sounds do not always get identical treatment.",
          hi: "सन्धि शब्द भी बनाती है: मरुत् + भिः → मरुद्भिः (“वायुओं द्वारा”)। इसे बने शब्दों के मेल से अलग रखें — समान ध्वनियों का व्यवहार हमेशा एक-सा नहीं होता।",
        },
        example: {
          sa: "मरुत् + भिः → मरुद्भिः",
          iast: "marut + bhiḥ → marudbhiḥ",
          gloss: { en: "“By the winds.” Stem plus ending.", hi: "“वायुओं द्वारा।” अंग और प्रत्यय।" },
          formula: "त् + भ् → द्भ्",
          alt: { en: "A stem joining its case ending.", hi: "अंग का विभक्ति-प्रत्यय से मेल।" },
        },
      },
      {
        id: "sandhi-boundary-8",
        kind: "summary",
        title: { en: "Keep the boundary question.", hi: "संधि-प्रश्न याद रखें।" },
        body: {
          en: "For each example ask: what ends, what begins, in which setting — then what changes and why. This small routine carries through vowels, stops, nasals and visarga without one giant chart. If vowel signs or final consonants feel new, practise sounds first.",
          hi: "हर उदाहरण में पूछें: क्या समाप्त होता है, क्या शुरू होता है, किस स्थिति में — फिर क्या बदलता है और क्यों। यही छोटी विधि स्वर, स्पर्श, नासिक्य और विसर्ग सबमें काम देगी, बिना विशाल तालिका के। मात्राएँ या अंतिम व्यंजन नए लगें तो पहले ध्वनियाँ दोहराएँ।",
        },
        example: {
          sa: "सीता + अपि → सीतापि",
          iast: "sītā + api → sītāpi",
          gloss: { en: "What ends? What begins?", hi: "क्या समाप्त? क्या शुरू?" },
          formula: "final + initial + setting",
          alt: { en: "The three-question routine on one example.", hi: "एक उदाहरण पर तीन-प्रश्न विधि।" },
        },
      },
      {
        id: "sandhi-boundary-9",
        kind: "practice",
        title: { en: "Try it: find the boundary.", hi: "करके देखें: स्थल पहचानें।" },
        body: {
          en: "Name the two meeting sounds before any rule.",
          hi: "नियम से पहले दोनों मिलने वाली ध्वनियाँ बताएँ।",
        },
        practice: {
          prompt: {
            en: "In सीता + अपि, which two sounds actually meet?",
            hi: "सीता + अपि में वास्तव में कौन-सी दो ध्वनियाँ मिलती हैं?",
          },
          choices: [
            { label: { en: "Final आ of सीता + initial अ of अपि", hi: "सीता का अंतिम आ + अपि का पहला अ" }, correct: true },
            { label: { en: "The whole words सीता and अपि", hi: "पूरे शब्द सीता और अपि" }, correct: false },
            { label: { en: "त् + प् consonants", hi: "त् + प् व्यंजन" }, correct: false },
          ],
          explain: {
            en: "Only the boundary vowels meet (आ + अ). Most of each word is untouched — start small.",
            hi: "केवल संधि-स्वर मिलते हैं (आ + अ)। बाकी शब्द अछूते रहते हैं — छोटे से शुरू करें।",
          },
        },
      },
    ],
  },

  // ─── 3. Two vowels of one family ─────────────────────────────────────────
  {
    id: "sandhi-like-vowels",
    rank: 3,
    unit: { en: "How words join", hi: "शब्द कैसे जुड़ते हैं" },
    title: { en: "Two vowels of one family", hi: "एक परिवार के दो स्वर" },
    titleSa: "सवर्ण-दीर्घ",
    titleIast: "savarṇa-dīrgha",
    outcome: {
      en: "Merge two same-family vowels into their long vowel, for every length mix.",
      hi: "एक परिवार के दो स्वरों को हर लंबाई-मिश्रण में दीर्घ स्वर में मिलाएँ।",
    },
    minutes: 8,
    prereqIds: ["sandhi-boundary"],
    sourcesLabel: {
      en: "After Whitney §126 (public domain); like-vowel examples cross-checked with learnsanskrit.org vowel-sandhi (CC BY 4.0).",
      hi: "Whitney §126 के आधार पर (सार्वजनिक डोमेन); उदाहरण learnsanskrit.org स्वर-सन्धि से मिलान (CC BY 4.0)।",
    },
    cards: [
      {
        id: "sandhi-like-vowels-1",
        kind: "anchor",
        title: { en: "Start with two अ vowels.", hi: "दो अ-स्वरों से शुरू करें।" },
        body: {
          en: "सीता ends in आ; अपि begins in अ — two lengths of one family. At this ordinary boundary they merge into one long आ: सीतापि, “Sita too”. The traditional name is सवर्ण-दीर्घ: similar vowels combine long.",
          hi: "सीता आ में समाप्त, अपि अ से शुरू — एक परिवार की दो लंबाइयाँ। इस साधारण स्थल पर दोनों मिलकर एक दीर्घ आ बनते हैं: सीतापि, “सीता भी”। परंपरागत नाम सवर्ण-दीर्घ है: समान स्वर दीर्घ होकर मिलते हैं।",
        },
        example: {
          sa: "सीता + अपि → सीतापि",
          iast: "sītā + api → sītāpi",
          gloss: { en: "“Sita too.” आ + अ → आ.", hi: "“सीता भी।” आ + अ → आ।" },
          formula: "आ + अ → आ",
          alt: { en: "Two अ-vowels merging into one long vowel.", hi: "दो अ-स्वर मिलकर एक दीर्घ स्वर बनते हुए।" },
        },
        term: {
          sa: "सवर्ण-दीर्घ",
          iast: "savarṇa-dīrgha",
          meaning: { en: "Similar vowels of one family combining as one long vowel.", hi: "एक परिवार के समान स्वरों का एक दीर्घ स्वर में मेल।" },
        },
      },
      {
        id: "sandhi-like-vowels-2",
        kind: "anchor",
        title: { en: "One vowel takes their place.", hi: "उनके स्थान पर एक स्वर।" },
        body: {
          en: "Read सी-ता-पि: the boundary now holds one vowel syllable, not आ plus a hidden अ. This helps reading and later verse counting. The merger is sound only — सीता and अपि remain two grammatical words, not a compound.",
          hi: "सी-ता-पि पढ़ें: संधि-स्थल पर अब एक स्वर-अक्षर है, न कि आ और छिपा अ। इससे पठन और छंद-गणना आसान होती है। मेल ध्वनि का है — सीता और अपि दो व्याकरणिक शब्द बने रहते हैं, समास नहीं।",
        },
        example: {
          sa: "सीता + अपि → सीतापि",
          iast: "sītā + api → sītāpi",
          gloss: { en: "Two vowels become one long आ.", hi: "दो स्वर मिलकर एक दीर्घ आ।" },
          formula: "two vowels → one आ",
          alt: { en: "The same joined word, read as three syllables.", hi: "वही जुड़ा शब्द, तीन अक्षरों में पढ़ा हुआ।" },
        },
      },
      {
        id: "sandhi-like-vowels-3",
        kind: "anchor",
        title: { en: "Do not add the lengths.", hi: "लंबाइयाँ न जोड़ें।" },
        body: {
          en: "Long आ plus short अ gives long आ — never an extra-long vowel. The rule yields the family's long vowel no matter which input is short or long. A specially prolonged vowel (प्लुत) is a separate category.",
          hi: "दीर्घ आ और ह्रस्व अ मिलकर दीर्घ आ देते हैं — अति-दीर्घ स्वर कभी नहीं। कोई भी लंबाई हो, परिणाम परिवार का दीर्घ स्वर है। विशेष लंबा स्वर (प्लुत) अलग श्रेणी है।",
        },
        example: {
          sa: "आ + अ → आ",
          iast: "ā + a → ā",
          gloss: { en: "Long plus short still gives long.", hi: "दीर्घ और ह्रस्व मिलकर भी दीर्घ।" },
          formula: "long + short → long",
          alt: { en: "Length inputs collapsing to one long vowel.", hi: "लंबाई-मिश्रण एक दीर्घ स्वर में सिमटते हुए।" },
        },
      },
      {
        id: "sandhi-like-vowels-4",
        kind: "teach",
        title: { en: "All four अ combinations work.", hi: "अ की चारों जोड़ियाँ बनती हैं।" },
        body: {
          en: "Short-short, short-long, long-short and long-long all give आ. A real word: देव + आलय → देवालय, “a deity's dwelling, a temple”. सवर्ण is about sound class, and sandhi supplies the joining while word-formation supplies the words.",
          hi: "ह्रस्व-ह्रस्व, ह्रस्व-दीर्घ, दीर्घ-ह्रस्व, दीर्घ-दीर्घ — सभी आ देते हैं। सच्चा शब्द: देव + आलय → देवालय, “देवता का निवास, मंदिर”। सवर्ण ध्वनि-वर्ग की बात है; शब्द समास से आते हैं, मेल सन्धि से।",
        },
        example: {
          sa: "देव + आलय → देवालय",
          iast: "deva + ālaya → devālaya",
          gloss: { en: "“Temple.” अ + आ → आ.", hi: "“मंदिर।” अ + आ → आ।" },
          formula: "अ/आ + अ/आ → आ",
          alt: { en: "All four अ-length combinations giving one result.", hi: "अ की चारों लंबाई-जोड़ियाँ एक परिणाम देती हुईं।" },
        },
      },
      {
        id: "sandhi-like-vowels-5",
        kind: "teach",
        title: { en: "The इ family gives ई.", hi: "इ परिवार ई देता है।" },
        body: {
          en: "अति + इव → अतीव, “exceedingly”: short इ meets short इ and the result is long ई. Any length mix of इ and ई gives ई. Another formation: अधि + ईश्वर → अधीश्वर, “overlord”. The rule watches the boundary vowels only.",
          hi: "अति + इव → अतीव, “अत्यंत”: ह्रस्व इ और ह्रस्व इ मिलकर दीर्घ ई। इ-ई का कोई भी मिश्रण ई देता है। एक और रूप: अधि + ईश्वर → अधीश्वर, “अधिपति”। नियम केवल संधि-स्वरों को देखता है।",
        },
        example: {
          sa: "अति + इव → अतीव",
          iast: "ati + iva → atīva",
          gloss: { en: "“Exceedingly.” इ + इ → ई.", hi: "“अत्यंत।” इ + इ → ई।" },
          formula: "इ/ई + इ/ई → ई",
          alt: { en: "Two इ-vowels merging into long ई.", hi: "दो इ-स्वर मिलकर दीर्घ ई बनते हुए।" },
        },
      },
      {
        id: "sandhi-like-vowels-6",
        kind: "teach",
        title: { en: "The उ family gives ऊ.", hi: "उ परिवार ऊ देता है।" },
        body: {
          en: "सु + उक्तम् → सूक्तम्: “well” plus “said” gives “well said, a hymn”. Two short उ vowels become one long ऊ, and mixed lengths give ऊ as well. The example is a formed expression, not proof that सु declines as a noun.",
          hi: "सु + उक्तम् → सूक्तम्: “अच्छा” और “कहा हुआ” मिलकर “सूक्त, स्तोत्र”। दो ह्रस्व उ मिलकर एक दीर्घ ऊ; मिश्रित लंबाइयाँ भी ऊ देती हैं। यह बना-बनाया प्रयोग है, सु के संज्ञा-रूपों का प्रमाण नहीं।",
        },
        example: {
          sa: "सु + उक्तम् → सूक्तम्",
          iast: "su + uktam → sūktam",
          gloss: { en: "“Well said; a hymn.” उ + उ → ऊ.", hi: "“अच्छा कहा; स्तोत्र।” उ + उ → ऊ।" },
          formula: "उ/ऊ + उ/ऊ → ऊ",
          alt: { en: "Two उ-vowels merging into long ऊ.", hi: "दो उ-स्वर मिलकर दीर्घ ऊ बनते हुए।" },
        },
      },
      {
        id: "sandhi-like-vowels-7",
        kind: "teach",
        title: { en: "Know the rare vowel row.", hi: "दुर्लभ स्वर-पंक्ति जानें।" },
        body: {
          en: "The family also holds ऋ and ॠ, combining in theory as ॠ — but real examples are vanishingly rare. Recognise the row, then spend reading practice on अ, इ and उ. Never invent everyday words to make a rare rule look common.",
          hi: "परिवार में ऋ और ॠ भी हैं, सिद्धांत में ॠ में मिलते हैं — पर सच्चे उदाहरण अत्यंत दुर्लभ हैं। पंक्ति पहचानें, और पठन-अभ्यास अ, इ, उ पर करें। दुर्लभ नियम को साधारण दिखाने के लिए शब्द न गढ़ें।",
        },
        example: {
          sa: "ऋ + ऋ → ॠ",
          iast: "ṛ + ṛ → ṝ (theoretical)",
          gloss: { en: "Rare row: recognise, keep in reference.", hi: "दुर्लभ पंक्ति: पहचानें, संदर्भ में रखें।" },
          formula: "ऋ + ऋ → ॠ",
          alt: { en: "The rare vocalic-र् row, marked reference-only.", hi: "दुर्लभ ऋ-पंक्ति, केवल संदर्भ हेतु चिह्नित।" },
        },
      },
      {
        id: "sandhi-like-vowels-8",
        kind: "summary",
        title: { en: "The result hides its history.", hi: "परिणाम इतिहास छिपाता है।" },
        body: {
          en: "Seeing आ cannot tell you whether it came from अ+अ, अ+आ, आ+अ or आ+आ. Reading backwards, use known words and meaning to recover the boundary — the sound rule alone never picks a unique split. Reverse sandhi proposes; vocabulary and grammar decide.",
          hi: "आ देखकर नहीं जान सकते कि वह अ+अ, अ+आ, आ+अ या आ+आ से आया। उल्टा पढ़ते समय ज्ञात शब्दों और अर्थ से संधि खोलें — ध्वनि-नियम अकेला एक उत्तर नहीं चुनता। उल्टी सन्धि सुझाती है; शब्द और व्याकरण निर्णय करते हैं।",
        },
        example: {
          sa: "देव + आलय → देवालय",
          iast: "deva + ālaya → devālaya",
          gloss: { en: "One आ — four possible histories.", hi: "एक आ — चार संभावित इतिहास।" },
          formula: "आ ← 4 histories",
          alt: { en: "One result pointing back to four possible inputs.", hi: "एक परिणाम चार संभावित स्रोतों की ओर इशारा करता हुआ।" },
        },
      },
      {
        id: "sandhi-like-vowels-9",
        kind: "practice",
        title: { en: "Try it: merge the pair.", hi: "करके देखें: जोड़ी मिलाएँ।" },
        body: {
          en: "Apply the family rule to a fresh pair.",
          hi: "नई जोड़ी पर परिवार-नियम लगाएँ।",
        },
        practice: {
          prompt: {
            en: "अति + इव joins as…?",
            hi: "अति + इव जुड़कर क्या बनेगा?",
          },
          choices: [
            { label: { en: "अतीव (atīva)", hi: "अतीव (atīva)" }, correct: true },
            { label: { en: "अतियिव (atiyiva)", hi: "अतियिव (atiyiva)" }, correct: false },
            { label: { en: "अताइव (atāiva)", hi: "अताइव (atāiva)" }, correct: false },
          ],
          explain: {
            en: "Same family (इ + इ) merges to long ई: अतीव. A glide (य्) needs a different next vowel.",
            hi: "एक परिवार (इ + इ) दीर्घ ई में मिलता है: अतीव। अर्धस्वर (य्) के लिए भिन्न अगला स्वर चाहिए।",
          },
        },
      },
    ],
  },

  // ─── 4. When a meets a different vowel ───────────────────────────────────
  {
    id: "sandhi-a-combinations",
    rank: 4,
    unit: { en: "How words join", hi: "शब्द कैसे जुड़ते हैं" },
    title: { en: "When अ meets a different vowel", hi: "जब अ भिन्न स्वर से मिले" },
    titleSa: "गुण-वृद्धि",
    titleIast: "guṇa-vṛddhi",
    outcome: {
      en: "Tell गुण (ए, ओ, अर्) from वृद्धि (ऐ, औ) when अ/आ meets another vowel.",
      hi: "अ/आ के भिन्न स्वर से मिलने पर गुण (ए, ओ, अर्) और वृद्धि (ऐ, औ) पहचानें।",
    },
    minutes: 8,
    prereqIds: ["sandhi-like-vowels"],
    sourcesLabel: {
      en: "After Whitney §127 (public domain). Original lesson wording.",
      hi: "Whitney §127 के आधार पर (सार्वजनिक डोमेन)। मूल पाठ-शब्द।",
    },
    cards: [
      {
        id: "sandhi-a-combinations-1",
        kind: "teach",
        title: { en: "अ meeting इ gives ए.", hi: "अ और इ मिलकर ए।" },
        body: {
          en: "देव + इन्द्र → देवेन्द्र, “lord of the gods”. Different families do not lengthen — the boundary becomes ए. The same ए results whether the first vowel is अ or आ, and whether the second is इ or ई.",
          hi: "देव + इन्द्र → देवेन्द्र, “देवों के स्वामी”। भिन्न परिवार दीर्घ नहीं होते — संधि ए बनती है। पहला अ हो या आ, दूसरा इ हो या ई — परिणाम वही ए।",
        },
        example: {
          sa: "देव + इन्द्र → देवेन्द्र",
          iast: "deva + indra → devendra",
          gloss: { en: "“Lord of the gods.” अ + इ → ए.", hi: "“देवों के स्वामी।” अ + इ → ए।" },
          formula: "अ/आ + इ/ई → ए",
          alt: { en: "अ meeting इ producing ए.", hi: "अ और इ मिलकर ए बनाते हुए।" },
        },
        term: {
          sa: "गुण",
          iast: "guṇa",
          meaning: { en: "The ए/ओ/अर् outcomes when अ meets इ, उ or ऋ.", hi: "अ के इ, उ, ऋ से मिलने पर ए/ओ/अर् परिणाम।" },
        },
      },
      {
        id: "sandhi-a-combinations-2",
        kind: "teach",
        title: { en: "Long आ does not change that answer.", hi: "दीर्घ आ उत्तर नहीं बदलता।" },
        body: {
          en: "महा + ईश्वर → महेश्वर, “great lord”: both inputs long, yet the combination is still ए. Decide by vowel families, never by adding lengths or expecting two long vowels to make ऐ.",
          hi: "महा + ईश्वर → महेश्वर, “महान स्वामी”: दोनों दीर्घ, फिर भी मेल ए है। लंबाइयाँ जोड़कर नहीं, स्वर-परिवार देखकर निर्णय करें; दो दीर्घ मिलकर ऐ नहीं बनाते।",
        },
        example: {
          sa: "महा + ईश्वर → महेश्वर",
          iast: "mahā + īśvara → maheśvara",
          gloss: { en: "“Great lord.” आ + ई → ए.", hi: "“महान स्वामी।” आ + ई → ए।" },
          formula: "आ + ई → ए",
          alt: { en: "Two long vowels still giving ए.", hi: "दो दीर्घ स्वर फिर भी ए देते हुए।" },
        },
      },
      {
        id: "sandhi-a-combinations-3",
        kind: "teach",
        title: { en: "अ meeting उ gives ओ.", hi: "अ और उ मिलकर ओ।" },
        body: {
          en: "हित + उपदेशः → हितोपदेशः: “beneficial” plus “instruction” gives “beneficial instruction”. Any short/long mix of these two families yields ओ. The final visarga here already belongs to the given word form.",
          hi: "हित + उपदेशः → हितोपदेशः: “हितकारी” और “उपदेश” मिलकर “हितोपदेश”। इन दो परिवारों का कोई भी लंबाई-मिश्रण ओ देता है। यहाँ अंतिम विसर्ग दिए गए शब्द-रूप का ही भाग है।",
        },
        example: {
          sa: "हित + उपदेशः → हितोपदेशः",
          iast: "hita + upadeśaḥ → hitopadeśaḥ",
          gloss: { en: "“Beneficial instruction.” अ + उ → ओ.", hi: "“हितकारी उपदेश।” अ + उ → ओ।" },
          formula: "अ/आ + उ/ऊ → ओ",
          alt: { en: "अ meeting उ producing ओ.", hi: "अ और उ मिलकर ओ बनाते हुए।" },
        },
      },
      {
        id: "sandhi-a-combinations-4",
        kind: "teach",
        title: { en: "ऋ becomes अर् after अ.", hi: "अ के बाद ऋ अर् बनता है।" },
        body: {
          en: "महा + ऋषिः → महर्षिः: “great” plus “sage” gives “great sage”. Note अर् — the preceding आ does not survive as आर् in this ordinary compound. Prefixes before roots can follow a special rule, taught later.",
          hi: "महा + ऋषिः → महर्षिः: “महान” और “ऋषि” मिलकर “महर्षि”। अर् पर ध्यान दें — इस साधारण समास में पहले का आ आर् बनकर नहीं बचता। धातु से पहले उपसर्ग का विशेष नियम आगे आएगा।",
        },
        example: {
          sa: "महा + ऋषिः → महर्षिः",
          iast: "mahā + ṛṣiḥ → maharṣiḥ",
          gloss: { en: "“Great sage.” आ + ऋ → अर्.", hi: "“महान ऋषि।” आ + ऋ → अर्।" },
          formula: "अ/आ + ऋ → अर्",
          alt: { en: "अ meeting vocalic ऋ producing अर्.", hi: "अ और ऋ मिलकर अर् बनाते हुए।" },
        },
      },
      {
        id: "sandhi-a-combinations-5",
        kind: "teach",
        title: { en: "ए after अ produces ऐ.", hi: "अ के बाद ए ऐ बनता है।" },
        body: {
          en: "सदा + एव → सदैव: “always” plus emphasis gives “always indeed”. Here आ + ए becomes ऐ — a different result from the इ → ए pattern. A following ऐ gives ऐ as well. This outcome is called वृद्धि.",
          hi: "सदा + एव → सदैव: “सदा” और निश्चय-बोधक “एव” मिलकर “सदैव”। यहाँ आ + ए ऐ बनता है — इ → ए वाले ढर्रे से अलग। बाद में ऐ हो तब भी ऐ ही बनता है। इस परिणाम को वृद्धि कहते हैं।",
        },
        example: {
          sa: "सदा + एव → सदैव",
          iast: "sadā + eva → sadaiva",
          gloss: { en: "“Always indeed.” आ + ए → ऐ.", hi: "“सदा ही।” आ + ए → ऐ।" },
          formula: "अ/आ + ए/ऐ → ऐ",
          alt: { en: "अ meeting ए producing ऐ.", hi: "अ और ए मिलकर ऐ बनाते हुए।" },
        },
        term: {
          sa: "वृद्धि",
          iast: "vṛddhi",
          meaning: { en: "The ऐ/औ outcomes when अ meets ए/ऐ or ओ/औ.", hi: "अ के ए/ऐ या ओ/औ से मिलने पर ऐ/औ परिणाम।" },
        },
      },
      {
        id: "sandhi-a-combinations-6",
        kind: "teach",
        title: { en: "ओ after अ produces औ.", hi: "अ के बाद ओ औ बनता है।" },
        body: {
          en: "जल + ओघः → जलौघः: “water” plus “flood” gives “a flood of water”. A following औ gives the same result. Do not read ऐ or औ as two separate Sanskrit vowels — each is one long vowel.",
          hi: "जल + ओघः → जलौघः: “जल” और “प्रवाह” मिलकर “जलप्रवाह”। बाद में औ हो तब भी वही परिणाम। ऐ या औ को दो अलग स्वर न समझें — प्रत्येक एक दीर्घ स्वर है।",
        },
        example: {
          sa: "जल + ओघः → जलौघः",
          iast: "jala + oghaḥ → jalaughaḥ",
          gloss: { en: "“A flood of water.” अ + ओ → औ.", hi: "“जल का प्रवाह।” अ + ओ → औ।" },
          formula: "अ/आ + ओ/औ → औ",
          alt: { en: "अ meeting ओ producing औ.", hi: "अ और ओ मिलकर औ बनाते हुए।" },
        },
      },
      {
        id: "sandhi-a-combinations-7",
        kind: "teach",
        title: { en: "Direction matters.", hi: "क्रम मायने रखता है।" },
        body: {
          en: "अ + इ gives ए — but इ + अ gives य (next lesson's glide). You cannot reverse the inputs and keep the rule.",
          hi: "अ + इ ए देता है — पर इ + अ य देता है (अगले पाठ की अर्धस्वर)। क्रम उल्टाकर नियम वही नहीं रहता।",
        },
        rows: [
          { sa: "अ + इ → ए", iast: "a + i → e", gloss: { en: "अ first", hi: "अ पहले" } },
          { sa: "इ + अ → य", iast: "i + a → ya", gloss: { en: "इ first", hi: "इ पहले" } },
        ],
      },
      {
        id: "sandhi-a-combinations-8",
        kind: "summary",
        title: { en: "Keep a small decision map.", hi: "छोटा निर्णय-नक्शा रखें।" },
        body: {
          en: "When the first vowel is अ or आ, read the second family: इ gives ए, उ gives ओ, ऋ gives अर्, ए/ऐ gives ऐ, ओ/औ gives औ — and like-अ vowels give आ. This is the ordinary map; protection and prefix rules come later.",
          hi: "पहला स्वर अ या आ हो तो दूसरा परिवार देखें: इ → ए, उ → ओ, ऋ → अर्, ए/ऐ → ऐ, ओ/औ → औ — और समान अ-स्वर → आ। यह साधारण नक्शा है; रक्षा और उपसर्ग-नियम आगे आएँगे।",
        },
        rows: [
          { sa: "इ → ए", iast: "i → e", gloss: { en: "गुण", hi: "गुण" } },
          { sa: "उ → ओ", iast: "u → o", gloss: { en: "गुण", hi: "गुण" } },
          { sa: "ए → ऐ", iast: "e → ai", gloss: { en: "वृद्धि", hi: "वृद्धि" } },
          { sa: "ओ → औ", iast: "o → au", gloss: { en: "वृद्धि", hi: "वृद्धि" } },
        ],
      },
      {
        id: "sandhi-a-combinations-9",
        kind: "practice",
        title: { en: "Try it: name the result.", hi: "करके देखें: परिणाम बताएँ।" },
        body: {
          en: "Use the decision map on a fresh pair.",
          hi: "नई जोड़ी पर निर्णय-नक्शा लगाएँ।",
        },
        practice: {
          prompt: {
            en: "हित + उपदेशः joins as…?",
            hi: "हित + उपदेशः जुड़कर क्या बनेगा?",
          },
          choices: [
            { label: { en: "हितोपदेशः (hitopadeśaḥ)", hi: "हितोपदेशः (hitopadeśaḥ)" }, correct: true },
            { label: { en: "हितैदेशः (hitaideśaḥ)", hi: "हितैदेशः (hitaideśaḥ)" }, correct: false },
            { label: { en: "हितूपदेशः (hitūpadeśaḥ)", hi: "हितूपदेशः (hitūpadeśaḥ)" }, correct: false },
          ],
          explain: {
            en: "अ + उ is गुण: ओ. So हितोपदेशः. ऐ would need ए/ऐ after अ; ऊ would need the same family.",
            hi: "अ + उ गुण है: ओ। अतः हितोपदेशः। ऐ के लिए अ के बाद ए/ऐ चाहिए; ऊ के लिए एक परिवार चाहिए।",
          },
        },
      },
    ],
  },

  // ─── 5. A vowel becomes a glide ──────────────────────────────────────────
  {
    id: "sandhi-glides",
    rank: 5,
    unit: { en: "How words join", hi: "शब्द कैसे जुड़ते हैं" },
    title: { en: "A vowel becomes a glide", hi: "स्वर अर्धस्वर बनता है" },
    titleSa: "यण्-सन्धि",
    titleIast: "yaṇ-sandhi",
    outcome: {
      en: "Turn इ/उ/ऋ into य्/व्/र् before a different vowel, and keep that vowel.",
      hi: "भिन्न स्वर से पहले इ/उ/ऋ को य्/व्/र् बनाएँ और उस स्वर को बचाएँ।",
    },
    minutes: 8,
    prereqIds: ["sandhi-a-combinations"],
    sourcesLabel: {
      en: "After Whitney §129 (public domain). Original lesson wording.",
      hi: "Whitney §129 के आधार पर (सार्वजनिक डोमेन)। मूल पाठ-शब्द।",
    },
    cards: [
      {
        id: "sandhi-glides-1",
        kind: "teach",
        title: { en: "इ can become य्.", hi: "इ य् बन सकता है।" },
        body: {
          en: "इति + अपि → इत्यपि (“thus also”): final इ meets अ, a different family, so इ becomes the glide य् while अ stays. The traditional name is यण्: य् belongs with इ, व् with उ, र् with ऋ.",
          hi: "इति + अपि → इत्यपि (“इस प्रकार भी”): अंतिम इ अ से मिलता है, भिन्न परिवार, इसलिए इ अर्धस्वर य् बनता है और अ बचा रहता है। परंपरागत नाम यण् है: य् इ का, व् उ का, र् ऋ का साथी है।",
        },
        example: {
          sa: "इति + अपि → इत्यपि",
          iast: "iti + api → ityapi",
          gloss: { en: "“Thus also.” इ + अ → य.", hi: "“इस प्रकार भी।” इ + अ → य।" },
          formula: "इ + अ → य",
          alt: { en: "Final इ turning into a glide before अ.", hi: "अंतिम इ अ से पहले अर्धस्वर बनता हुआ।" },
        },
        term: {
          sa: "यण्",
          iast: "yaṇ",
          meaning: { en: "The change of इ/उ/ऋ into the glides य्/व्/र्.", hi: "इ/उ/ऋ का य्/व्/र् अर्धस्वर में बदलाव।" },
        },
      },
      {
        id: "sandhi-glides-2",
        kind: "teach",
        title: { en: "Long ई becomes य् too.", hi: "दीर्घ ई भी य् बनती है।" },
        body: {
          en: "नदी + अत्र → नद्यत्र (“the river is here”): long ई changes to य् before dissimilar अ, and no extra ई syllable is left behind. Sanskrit often leaves an understood “is” unstated, as here.",
          hi: "नदी + अत्र → नद्यत्र (“नदी यहाँ है”): दीर्घ ई भिन्न अ से पहले य् बनती है, कोई अतिरिक्त ई-अक्षर नहीं बचता। संस्कृत में “है” अक्सर अव्यक्त रहता है, जैसे यहाँ।",
        },
        example: {
          sa: "नदी + अत्र → नद्यत्र",
          iast: "nadī + atra → nadyatra",
          gloss: { en: "“The river is here.” ई + अ → य.", hi: "“नदी यहाँ है।” ई + अ → य।" },
          formula: "ई + अ → य",
          alt: { en: "Long ई becoming य् before अ.", hi: "दीर्घ ई अ से पहले य् बनती हुई।" },
        },
      },
      {
        id: "sandhi-glides-3",
        kind: "teach",
        title: { en: "उ and ऊ become व्.", hi: "उ और ऊ व् बनते हैं।" },
        body: {
          en: "सु + आगतम् → स्वागतम् (“welcome”): उ becomes व् and आ remains. Short उ and long ऊ share this outcome before a different family. Learn the real pronunciation from a competent speaker, not from spelling alone.",
          hi: "सु + आगतम् → स्वागतम् (“स्वागत”): उ व् बनता है, आ बचा रहता है। ह्रस्व उ और दीर्घ ऊ का भिन्न परिवार से पहले यही परिणाम। सच्चा उच्चारण योग्य वक्ता से सीखें, केवल वर्तनी से नहीं।",
        },
        example: {
          sa: "सु + आगतम् → स्वागतम्",
          iast: "su + āgatam → svāgatam",
          gloss: { en: "“Welcome.” उ + आ → vā.", hi: "“स्वागत।” उ + आ → वा।" },
          formula: "उ/ऊ + vowel → व् + vowel",
          alt: { en: "उ becoming व् before a different vowel.", hi: "उ भिन्न स्वर से पहले व् बनता हुआ।" },
        },
      },
      {
        id: "sandhi-glides-4",
        kind: "teach",
        title: { en: "ऋ becomes र्.", hi: "ऋ र् बनता है।" },
        body: {
          en: "पितृ + आदेशः → पित्रादेशः (“a father's instruction”): vocalic ऋ turns consonantal र् before आ, which then supplies the boundary syllable. Rare ऌ has the matching glide ल्. Never swap compound stems with standalone word forms.",
          hi: "पितृ + आदेशः → पित्रादेशः (“पिता का आदेश”): स्वर-ऋ आ से पहले व्यंजन-र् बनता है, और आ संधि-अक्षर देता है। दुर्लभ ऌ का साथी अर्धस्वर ल् है। समास-अंग और स्वतंत्र शब्द-रूप न बदलें।",
        },
        example: {
          sa: "पितृ + आदेशः → पित्रादेशः",
          iast: "pitṛ + ādeśaḥ → pitrādeśaḥ",
          gloss: { en: "“A father's instruction.” ऋ + आ → रा.", hi: "“पिता का आदेश।” ऋ + आ → रा।" },
          formula: "ऋ + आ → रा",
          alt: { en: "Vocalic र् becoming consonantal र्.", hi: "स्वर-ऋ व्यंजन-र् बनता हुआ।" },
        },
      },
      {
        id: "sandhi-glides-5",
        kind: "teach",
        title: { en: "The following vowel is preserved.", hi: "बाद वाला स्वर बचता है।" },
        body: {
          en: "इति + एव → इत्येव (“just so”): before ए, final इ becomes य् and ए stays. Before any other dissimilar vowel the same holds — इ/ई→य्, उ/ऊ→व्, ऋ→र् — and the second vowel keeps its identity instead of merging.",
          hi: "इति + एव → इत्येव (“ठीक ऐसा”): ए से पहले अंतिम इ य् बनता है, ए बचा रहता है। किसी भी भिन्न स्वर से पहले यही — इ/ई→य्, उ/ऊ→व्, ऋ→र् — और दूसरा स्वर मिले बिना अपनी पहचान रखता है।",
        },
        example: {
          sa: "इति + एव → इत्येव",
          iast: "iti + eva → ityeva",
          gloss: { en: "“Just so.” इ + ए → ये.", hi: "“ठीक ऐसा।” इ + ए → ये।" },
          formula: "इ + ए → ये",
          alt: { en: "The second vowel surviving beside the new glide.", hi: "नए अर्धस्वर के पास दूसरा स्वर बचा हुआ।" },
        },
      },
      {
        id: "sandhi-glides-6",
        kind: "teach",
        title: { en: "Same-family vowels do not glide.", hi: "एक परिवार के स्वर अर्धस्वर नहीं बनते।" },
        body: {
          en: "अति + इव → अतीव: two इ vowels of one family merge into ई — never yi. Compare families first: same family merges, different family glides. Rare ऋ/ऌ pairs follow their traditional classification in the reference.",
          hi: "अति + इव → अतीव: एक परिवार के दो इ स्वर ई में मिलते हैं — यि कभी नहीं। पहले परिवार तुलना करें: समान मिलते हैं, भिन्न अर्धस्वर बनते हैं। दुर्लभ ऋ/ऌ जोड़ियाँ संदर्भ के पारंपरिक वर्ग से चलें।",
        },
        example: {
          sa: "अति + इव → अतीव",
          iast: "ati + iva → atīva",
          gloss: { en: "इ + इ → ई, not yi.", hi: "इ + इ → ई, यि नहीं।" },
          formula: "same family → merge",
          alt: { en: "Same-family vowels merging instead of gliding.", hi: "एक परिवार के स्वर अर्धस्वर के बजाय मिलते हुए।" },
        },
      },
      {
        id: "sandhi-glides-7",
        kind: "teach",
        title: { en: "A consonant is not a trigger.", hi: "व्यंजन कारण नहीं है।" },
        body: {
          en: "नदी वहति (“the river flows”): the next word starts with consonant व्, so final ई stays ई. A familiar vowel ending is not enough — the next initial sound must satisfy the rule. No change is a real result.",
          hi: "नदी वहति (“नदी बहती है”): अगला शब्द व्यंजन व् से शुरू, इसलिए अंतिम ई वही रहती है। परिचित स्वरांत पर्याप्त नहीं — अगली आदि-ध्वनि नियम के अनुकूल होनी चाहिए। अपरिवर्तन भी सच्चा परिणाम है।",
        },
        example: {
          sa: "नदी वहति",
          iast: "nadī vahati",
          gloss: { en: "“The river flows.” ई + व् → no change.", hi: "“नदी बहती है।” ई + व् → अपरिवर्तन।" },
          formula: "ई + consonant → ई",
          alt: { en: "A vowel correctly left unchanged before a consonant.", hi: "व्यंजन से पहले स्वर सहीतः अपरिवर्तित।" },
        },
      },
      {
        id: "sandhi-glides-8",
        kind: "summary",
        title: { en: "Recover the vowel through the glide.", hi: "अर्धस्वर से स्वर वापस पाएँ।" },
        body: {
          en: "Reading नद्यत्र, spot अत्र and test नदी as the first word: य् can come from ई before अ. But a glide never reveals the original length, and not every य् or व् comes from sandhi — some are original consonants. Propose with words, then test with grammar.",
          hi: "नद्यत्र पढ़ते समय अत्र पहचानें और नदी को पहला शब्द मानकर परखें: अ से पहले ई से य् आ सकता है। पर अर्धस्वर मूल लंबाई नहीं बताता, और हर य्/व् सन्धि से नहीं — कुछ मूल व्यंजन हैं। शब्दों से सुझाएँ, व्याकरण से परखें।",
        },
        example: {
          sa: "नदी + अत्र → नद्यत्र",
          iast: "nadyatra ← nadī + atra",
          gloss: { en: "य् may point back to इ or ई.", hi: "य् इ या ई की ओर इशारा कर सकता है।" },
          formula: "य् ← इ / ई",
          alt: { en: "Reading backwards from glide to possible vowels.", hi: "अर्धस्वर से संभावित स्वरों तक उल्टा पठन।" },
        },
      },
      {
        id: "sandhi-glides-9",
        kind: "practice",
        title: { en: "Try it: glide or merge?", hi: "करके देखें: अर्धस्वर या मेल?" },
        body: {
          en: "First compare the families, then choose.",
          hi: "पहले परिवार तुलना करें, फिर चुनें।",
        },
        practice: {
          prompt: {
            en: "इति + एव joins as…?",
            hi: "इति + एव जुड़कर क्या बनेगा?",
          },
          choices: [
            { label: { en: "इत्येव (ityeva)", hi: "इत्येव (ityeva)" }, correct: true },
            { label: { en: "इतैव (itaiva)", hi: "इतैव (itaiva)" }, correct: false },
            { label: { en: "इतीव (itīva)", hi: "इतीव (itīva)" }, correct: false },
          ],
          explain: {
            en: "Different families (इ + ए): इ becomes य् and ए stays — इत्येव. Merging needs the same family; ऐ needs अ first.",
            hi: "भिन्न परिवार (इ + ए): इ य् बनता है, ए बचता है — इत्येव। मेल के लिए एक परिवार चाहिए; ऐ के लिए पहला अ चाहिए।",
          },
        },
      },
    ],
  },

  // ─── 6. The special behaviour of e and o ────────────────────────────────
  {
    id: "sandhi-e-o",
    rank: 6,
    unit: { en: "How words join", hi: "शब्द कैसे जुड़ते हैं" },
    title: { en: "The special behaviour of ए and ओ", hi: "ए और ओ का विशेष व्यवहार" },
    titleSa: "ए-ओ-सन्धि",
    titleIast: "e-o-sandhi",
    outcome: {
      en: "Separate internal अय्/अव् from external elision and retained hiatus.",
      hi: "आंतरिक अय्/अव् को बाह्य लोप और शेष स्वर-अंतराल से अलग करें।",
    },
    minutes: 7,
    prereqIds: ["sandhi-glides"],
    sourcesLabel: {
      en: "After Whitney §§131–135 (public domain). Internal formations labelled schematic.",
      hi: "Whitney §§131–135 के आधार पर (सार्वजनिक डोमेन)। आंतरिक रचनाएँ सांकेतिक चिह्नित।",
    },
    cards: [
      {
        id: "sandhi-e-o-1",
        kind: "teach",
        title: { en: "Inside formations, ए can open to अय्.", hi: "रचना में ए अय् खुलता है।" },
        body: {
          en: "In the schematic formation ने + अ + न्ति → नयन्ति (“they lead”), ए develops into अय् before अ. This is internal word-building — never transfer its अय् result automatically to separate words ending in ए.",
          hi: "सांकेतिक रचना ने + अ + न्ति → नयन्ति (“वे ले जाते हैं”) में ए अ से पहले अय् बनता है। यह आंतरिक शब्द-रचना है — इसका अय् अलग शब्दों के ए पर स्वतः न लगाएँ।",
        },
        example: {
          sa: "ने + अ → नय (→ नयन्ति)",
          iast: "ne + a → naya (→ nayanti)",
          gloss: { en: "“They lead.” Internal ए → अय्.", hi: "“वे ले जाते हैं।” आंतरिक ए → अय्।" },
          formula: "internal: ए + vowel → अय्",
          alt: { en: "Internal formation opening ए into अय्.", hi: "आंतरिक रचना में ए अय् खुलता हुआ।" },
        },
      },
      {
        id: "sandhi-e-o-2",
        kind: "teach",
        title: { en: "The parallel for ओ is अव्.", hi: "ओ का समांतर अव् है।" },
        body: {
          en: "The schematic भो + अ + न्ति → भवन्ति (“they are”) opens internal ओ to अव्. Internal ऐ→आय् and औ→आव् follow the same pattern. Sandhi is one stage of derivation here, not a substitute for the conjugation system.",
          hi: "सांकेतिक भो + अ + न्ति → भवन्ति (“वे होते हैं”) में आंतरिक ओ अव् खुलता है। आंतरिक ऐ→आय् और औ→आव् भी इसी ढर्रे पर। यहाँ सन्धि व्युत्पत्ति का एक चरण है, क्रिया-तंत्र का विकल्प नहीं।",
        },
        example: {
          sa: "भो + अ → भव (→ भवन्ति)",
          iast: "bho + a → bhava (→ bhavanti)",
          gloss: { en: "“They are.” Internal ओ → अव्.", hi: "“वे होते हैं।” आंतरिक ओ → अव्।" },
          formula: "internal: ओ + vowel → अव्",
          alt: { en: "Internal formation opening ओ into अव्.", hi: "आंतरिक रचना में ओ अव् खुलता हुआ।" },
        },
      },
      {
        id: "sandhi-e-o-3",
        kind: "teach",
        title: { en: "At a word boundary, short अ disappears.", hi: "शब्द-संधि में ह्रस्व अ लुप्त होता है।" },
        body: {
          en: "ते + अपि → तेऽपि (“they too”): ए stays and initial short अ drops, with avagraha ऽ marking the loss. It adds no syllable and is never pronounced as a new sound. Ordinary final ओ behaves the same before short अ.",
          hi: "ते + अपि → तेऽपि (“वे भी”): ए बचता है, पहला ह्रस्व अ लुप्त होता है, और अवग्रह ऽ लोप चिह्नित करता है। यह कोई अक्षर नहीं जोड़ता और न बोला जाता है। साधारण अंतिम ओ ह्रस्व अ से पहले ऐसा ही करता है।",
        },
        example: {
          sa: "ते + अपि → तेऽपि",
          iast: "te + api → te'pi",
          gloss: { en: "“They too.” ए + short अ → एऽ.", hi: "“वे भी।” ए + ह्रस्व अ → एऽ।" },
          formula: "ए/ओ + short अ → ए/ओऽ",
          alt: { en: "Short अ elided after ए, marked by avagraha.", hi: "ए के बाद ह्रस्व अ लुप्त, अवग्रह से चिह्नित।" },
        },
        term: {
          sa: "अवग्रह",
          iast: "avagraha",
          meaning: { en: "The mark ऽ recording a lost short अ. Silent.", hi: "लुप्त ह्रस्व अ का चिह्न ऽ। मौन रहता है।" },
        },
      },
      {
        id: "sandhi-e-o-4",
        kind: "teach",
        title: { en: "Long आ does not disappear this way.", hi: "दीर्घ आ ऐसे लुप्त नहीं होता।" },
        body: {
          en: "ते + आगताः → त आगताः (“they have come”): ए changes to अ while long आ remains, read as two separate vowels. The short-अ elision rule never applies to words beginning in आ, and the two vowels must not merge again.",
          hi: "ते + आगताः → त आगताः (“वे आए हैं”): ए अ बनता है, दीर्घ आ बचा रहता है — दो अलग स्वर पढ़ें। ह्रस्व-अ-लोप नियम आ से शुरू शब्दों पर लागू नहीं; दोनों स्वरों को फिर न मिलाएँ।",
        },
        example: {
          sa: "ते + आगताः → त आगताः",
          iast: "te + āgatāḥ → ta āgatāḥ",
          gloss: { en: "“They have come.” ए + आ → अ | आ.", hi: "“वे आए हैं।” ए + आ → अ | आ।" },
          formula: "ए + आ → अ | आ",
          alt: { en: "Two boundary vowels kept apart.", hi: "दो संधि-स्वर अलग रखे हुए।" },
        },
      },
      {
        id: "sandhi-e-o-5",
        kind: "teach",
        title: { en: "Other vowels keep the gap too.", hi: "अन्य स्वर भी अंतर रखते हैं।" },
        body: {
          en: "ते + इह → त इह (“they are here”): final ए becomes अ and इ stays intact. Two adjacent vowel syllables are therefore correct in joined Sanskrit. The space is an editorial help; the rule, not the space, explains the gap.",
          hi: "ते + इह → त इह (“वे यहाँ हैं”): अंतिम ए अ बनता है, इ ज्यों का त्यों। अतः जुड़े संस्कृत में दो पास स्वर-अक्षर सही हैं। खाली जगह संपादकीय सहायता है; अंतर का कारण नियम है, खाली जगह नहीं।",
        },
        example: {
          sa: "ते + इह → त इह",
          iast: "te + iha → ta iha",
          gloss: { en: "“They are here.” ए + इ → अ | इ.", hi: "“वे यहाँ हैं।” ए + इ → अ | इ।" },
          formula: "ए + vowel → अ | vowel",
          alt: { en: "Retained hiatus between two vowels.", hi: "दो स्वरों के बीच शेष अंतर।" },
        },
      },
      {
        id: "sandhi-e-o-6",
        kind: "teach",
        title: { en: "External ऐ leaves आ; औ keeps व्.", hi: "बाह्य ऐ आ देता है; औ व् रखता है।" },
        body: {
          en: "तस्यै + अपि → तस्या अपि (“to her too”): external ऐ becomes आ and the next vowel stays separate — never merge them again. But तौ + एव → तावेव: औ becomes आव् with व् retained. Learn this contrast instead of dropping every glide.",
          hi: "तस्यै + अपि → तस्या अपि (“उसको भी”): बाह्य ऐ आ बनता है, अगला स्वर अलग — फिर न मिलाएँ। पर तौ + एव → तावेव: औ आव् बनता है, व् बचा रहता है। हर अर्धस्वर न गिराएँ; यह अंतर सीखें।",
        },
        rows: [
          { sa: "तस्यै + अपि → तस्या अपि", iast: "tasyai + api → tasyā api", gloss: { en: "ऐ → आ | vowel", hi: "ऐ → आ | स्वर" } },
          { sa: "तौ + एव → तावेव", iast: "tau + eva → tāveva", gloss: { en: "औ → आव् + vowel", hi: "औ → आव् + स्वर" } },
        ],
      },
      {
        id: "sandhi-e-o-7",
        kind: "summary",
        title: { en: "Ask whether ओ came from visarga.", hi: "पूछें: क्या ओ विसर्ग से आया?" },
        body: {
          en: "रामः + इह → राम इह: the pause form रामः loses visarga before इ — never invent an intermediate रामो and apply a general ओ table. Always start from the real word ending. Lexical final ओ is rare and has its own exceptions.",
          hi: "रामः + इह → राम इह: विराम-रूप रामः इ से पहले विसर्ग खोता है — बीच में रामो गढ़कर सामान्य ओ-तालिका न लगाएँ। हमेशा सच्चे शब्दांत से शुरू करें। कोशीय अंतिम ओ दुर्लभ है, उसके अपने अपवाद हैं।",
        },
        example: {
          sa: "रामः + इह → राम इह",
          iast: "rāmaḥ + iha → rāma iha",
          gloss: { en: "Visarga loss, not an ओ rule.", hi: "विसर्ग-लोप, ओ-नियम नहीं।" },
          formula: "अः + vowel → अ | vowel",
          alt: { en: "Visarga disappearing before a vowel.", hi: "स्वर से पहले विसर्ग लुप्त होता हुआ।" },
        },
      },
      {
        id: "sandhi-e-o-8",
        kind: "practice",
        title: { en: "Try it: elide or keep?", hi: "करके देखें: लोप या रक्षा?" },
        body: {
          en: "Short अ after ए disappears; long आ stays.",
          hi: "ए के बाद ह्रस्व अ लुप्त होता है; दीर्घ आ बचता है।",
        },
        practice: {
          prompt: {
            en: "ते + अपि joins as…?",
            hi: "ते + अपि जुड़कर क्या बनेगा?",
          },
          choices: [
            { label: { en: "तेऽपि (te'pi)", hi: "तेऽपि (te'pi)" }, correct: true },
            { label: { en: "तापि (tāpi)", hi: "तापि (tāpi)" }, correct: false },
            { label: { en: "तयपि (tayapi)", hi: "तयपि (tayapi)" }, correct: false },
          ],
          explain: {
            en: "ए + short अ: ए stays, अ elides, avagraha marks it — तेऽपि. Merging to आ would need two अ-family vowels.",
            hi: "ए + ह्रस्व अ: ए बचता है, अ लुप्त, अवग्रह चिह्नित — तेऽपि। आ में मेल के लिए दो अ-परिवार स्वर चाहिए।",
          },
        },
      },
    ],
  },

  // ─── 7. When the ordinary vowel rule stops ──────────────────────────────
  {
    id: "sandhi-protected",
    rank: 7,
    unit: { en: "How words join", hi: "शब्द कैसे जुड़ते हैं" },
    title: { en: "When the ordinary rule stops", hi: "जब साधारण नियम रुकता है" },
    titleSa: "प्रगृह्य",
    titleIast: "pragṛhya",
    outcome: {
      en: "Spot protected vowels and grammar-sensitive exceptions before applying vowel rules.",
      hi: "स्वर-नियम लगाने से पहले रक्षित स्वर और व्याकरण-विशेष अपवाद पहचानें।",
    },
    minutes: 7,
    prereqIds: ["sandhi-e-o"],
    sourcesLabel: {
      en: "After Whitney §§136–138 (public domain). Specialist forms labelled as such.",
      hi: "Whitney §§136–138 के आधार पर (सार्वजनिक डोमेन)। विशेष रूप चिह्नित।",
    },
    cards: [
      {
        id: "sandhi-protected-1",
        kind: "teach",
        title: { en: "Some dual endings are protected.", hi: "कुछ द्विवचन अंत रक्षित हैं।" },
        body: {
          en: "अग्नी अपश्यम् (“I saw two fires”): the dual ending ई stands before the next vowel — no ई→य् glide. This protected class is called प्रगृह्य. Always identify the grammatical ending before the usual rule.",
          hi: "अग्नी अपश्यम् (“मैंने दो अग्नियाँ देखीं”): द्विवचन अंत ई अगले स्वर से पहले ज्यों का त्यों — ई→य् अर्धस्वर नहीं। इस रक्षित वर्ग को प्रगृह्य कहते हैं। साधारण नियम से पहले व्याकरणिक अंत पहचानें।",
        },
        example: {
          sa: "अग्नी अपश्यम्",
          iast: "agnī apaśyam",
          gloss: { en: "“I saw two fires.” Dual ई protected.", hi: "“मैंने दो अग्नियाँ देखीं।” द्विवचन ई रक्षित।" },
          formula: "dual ई + vowel → ई | vowel",
          alt: { en: "A dual ending correctly left unjoined.", hi: "द्विवचन अंत सहीतः असंधिक।" },
        },
        term: {
          sa: "प्रगृह्य",
          iast: "pragṛhya",
          meaning: { en: "A protected ending that refuses its ordinary sandhi.", hi: "रक्षित अंत जो साधारण सन्धि स्वीकार नहीं करता।" },
        },
      },
      {
        id: "sandhi-protected-2",
        kind: "teach",
        title: { en: "Dual ऊ is protected too.", hi: "द्विवचन ऊ भी रक्षित है।" },
        body: {
          en: "बाहू उद्यच्छति (“[someone] raises two arms”): ऊ and following उ stay separate — never merge into ऊ. Protection belongs to the specified dual forms, not to every word connected with arms.",
          hi: "बाहू उद्यच्छति (“[कोई] दो भुजाएँ उठाता है”): ऊ और बाद का उ अलग रहते हैं — ऊ में कभी न मिलाएँ। रक्षा निर्दिष्ट द्विवचन रूपों की है, भुजा से जुड़े हर शब्द की नहीं।",
        },
        example: {
          sa: "बाहू उद्यच्छति",
          iast: "bāhū udyacchati",
          gloss: { en: "Dual ऊ stands before उ.", hi: "द्विवचन ऊ उ से पहले स्थिर।" },
          formula: "dual ऊ + उ → ऊ | उ",
          alt: { en: "Two उ-sounds correctly kept apart.", hi: "दो उ-ध्वनियाँ सहीतः अलग रखी हुईं।" },
        },
      },
      {
        id: "sandhi-protected-3",
        kind: "teach",
        title: { en: "An ए ending is not always protected.", hi: "ए अंत हमेशा रक्षित नहीं।" },
        body: {
          en: "तौ लभेते अश्वान् (“the two obtain horses”): लभेते is dual, so its ए stands — unlike ते + अपि → तेऽपि. Both end in ए, but only the specified grammatical class is protected. प्रगृह्य is grammar, not spelling.",
          hi: "तौ लभेते अश्वान् (“दोनों घोड़े पाते हैं”): लभेते द्विवचन है, इसलिए ए स्थिर — ते + अपि → तेऽपि से भिन्न। दोनों ए में समाप्त, पर रक्षा केवल निर्दिष्ट वर्ग की। प्रगृह्य व्याकरण है, वर्तनी नहीं।",
        },
        example: {
          sa: "लभेते अश्वान्",
          iast: "labhete aśvān",
          gloss: { en: "Dual verbal ए stands.", hi: "द्विवचन क्रिया-ए स्थिर।" },
          formula: "dual ए + vowel → ए | vowel",
          alt: { en: "A dual verb ending refusing elision.", hi: "द्विवचन क्रिया-अंत लोप स्वीकार करता हुआ नहीं।" },
        },
      },
      {
        id: "sandhi-protected-4",
        kind: "teach",
        title: { en: "Recognise अमी and the particles.", hi: "अमी और निपात पहचानें।" },
        body: {
          en: "अमी अत्र (“those men are here”): अमी keeps its ई though plural, not dual. Some particles and calls like अहो keep their vowels too. These are named classes — keep a short exception list beside the ordinary rules.",
          hi: "अमी अत्र (“वे लोग यहाँ हैं”): अमी बहुवचन होकर भी ई बचाता है। अहो जैसे कुछ निपात और संबोधन भी स्वर बचाते हैं। ये नामित वर्ग हैं — साधारण नियमों के पास छोटी अपवाद-सूची रखें।",
        },
        example: {
          sa: "अमी अत्र",
          iast: "amī atra",
          gloss: { en: "Protected ई, though plural.", hi: "बहुवचन होकर भी ई रक्षित।" },
          formula: "अमी + vowel → अमी | vowel",
          alt: { en: "A protected pronoun standing apart.", hi: "रक्षित सर्वनाम अलग खड़ा हुआ।" },
        },
      },
      {
        id: "sandhi-protected-5",
        kind: "teach",
        title: { en: "A prefix before ऋ can give आर्.", hi: "ऋ से पहले उपसर्ग आर् दे सकता है।" },
        body: {
          en: "उप + ऋच्छति → उपार्च्छति (“approaches”): with a prefix ending in अ/आ before a root starting in ऋ, the result can be आर् — unlike महा + ऋषिः → महर्षिः. Identify prefix plus root first; sound pairs alone never suffice. A specialist formation.",
          hi: "उप + ऋच्छति → उपार्च्छति (“पहुँचता है”): ऋ से शुरू धातु से पहले अ/आ-वाला उपसर्ग हो तो आर् बन सकता है — महा + ऋषिः → महर्षिः से भिन्न। पहले उपसर्ग और धातु पहचानें; केवल ध्वनि-जोड़ी अपर्याप्त। विशेष रचना है।",
        },
        example: {
          sa: "उप + ऋच्छति → उपार्च्छति",
          iast: "upa + ṛcchati → upārcchati",
          gloss: { en: "“Approaches.” Prefix अ + ऋ → आर्.", hi: "“पहुँचता है।” उपसर्ग अ + ऋ → आर्।" },
          formula: "prefix अ + ऋ → आर्",
          alt: { en: "A prefix-root boundary giving आर्.", hi: "उपसर्ग-धातु संधि आर् देती हुई।" },
        },
      },
      {
        id: "sandhi-protected-6",
        kind: "teach",
        title: { en: "A prefix before ए may keep only ए.", hi: "ए से पहले उपसर्ग केवल ए रख सकता है।" },
        body: {
          en: "उप + एतव्य → उपेतव्य (“to be approached”): here अ disappears and ए remains, though ordinary अ + ए gives ऐ. This पररूप pattern belongs to its prefix configuration — never discard अ at a free word boundary.",
          hi: "उप + एतव्य → उपेतव्य (“पहुँचने योग्य”): यहाँ अ लुप्त होता है, ए बचता है — जबकि साधारण अ + ए ऐ देता है। यह पररूप ढर्रा अपनी उपसर्ग-रचना का है — स्वतंत्र शब्द-संधि में अ कभी न गिराएँ।",
        },
        example: {
          sa: "उप + एतव्य → उपेतव्य",
          iast: "upa + etavya → upetavya",
          gloss: { en: "Prefix pattern: अ drops, ए stays.", hi: "उपसर्ग-ढर्रा: अ लुप्त, ए स्थिर।" },
          formula: "prefix अ + ए → ए",
          alt: { en: "A prefix boundary keeping only the second vowel.", hi: "उपसर्ग-संधि केवल दूसरा स्वर रखती हुई।" },
        },
      },
      {
        id: "sandhi-protected-7",
        kind: "summary",
        title: { en: "Grammar comes before the table.", hi: "तालिका से पहले व्याकरण।" },
        body: {
          en: "The past-tense marker अ can give ऐ before इ (augment + इत → ऐत) instead of ordinary ए — more proof that sandhi needs grammatical context. Lesson rule: identify ending, prefix, or augment first; only then choose the sound rule. Scope ends here for vowels; consonants need their own chapter.",
          hi: "भूतकाल-चिह्न अ इ से पहले ऐ दे सकता है (आगम + ita → aita), साधारण ए के बजाय — यही प्रमाण कि सन्धि को व्याकरण-संदर्भ चाहिए। पाठ-नियम: पहले अंत, उपसर्ग या आगम पहचानें; तभी ध्वनि-नियम चुनें। स्वरों का दायरा यहीं; व्यंजनों का अलग अध्याय होगा।",
        },
        example: {
          sa: "अ + इत → ऐत",
          iast: "a + ita → aita",
          gloss: { en: "Augment अ + इ → ऐ (specialist).", hi: "आगम अ + इ → ऐ (विशेष)।" },
          formula: "augment अ + इ → ऐ",
          alt: { en: "Grammar overriding the ordinary vowel table.", hi: "व्याकरण साधारण स्वर-तालिका पर भारी पड़ता हुआ।" },
        },
      },
      {
        id: "sandhi-protected-8",
        kind: "practice",
        title: { en: "Try it: join or protect?", hi: "करके देखें: संधि या रक्षा?" },
        body: {
          en: "Check the grammar class before the sound rule.",
          hi: "ध्वनि-नियम से पहले व्याकरण-वर्ग जाँचें।",
        },
        practice: {
          prompt: {
            en: "अग्नी अपश्यम् keeps अग्नी separate because…?",
            hi: "अग्नी अपश्यम् में अग्नी अलग क्यों रहता है?",
          },
          choices: [
            { label: { en: "अग्नी is a dual ending (प्रगृह्य)", hi: "अग्नी द्विवचन अंत है (प्रगृह्य)" }, correct: true },
            { label: { en: "ई never changes before any vowel", hi: "ई किसी स्वर से पहले कभी नहीं बदलता" }, correct: false },
            { label: { en: "The next word starts with a consonant", hi: "अगला शब्द व्यंजन से शुरू होता है" }, correct: false },
          ],
          explain: {
            en: "Dual ई/ऊ/ए endings are प्रगृह्य: protected. Ordinary ई + vowel would glide to य् — grammar decides first.",
            hi: "द्विवचन ई/ऊ/ए अंत प्रगृह्य हैं: रक्षित। साधारण ई + स्वर य् बनता — पहले व्याकरण निर्णय करता है।",
          },
        },
      },
    ],
  },
];

export const REVIEWED_LEARNV2_UNITS: LearnV2Unit[] = [
  {
    id: "beginnings",
    rank: 1,
    title: { en: "Beginnings", hi: "आरंभ" },
    titleSa: "आरम्भः",
    lessonIds: ["verbs-number"],
  },
  {
    id: "word-joining",
    rank: 2,
    title: { en: "How words join", hi: "शब्द कैसे जुड़ते हैं" },
    titleSa: "सन्धिः",
    lessonIds: [
      "sandhi-boundary",
      "sandhi-like-vowels",
      "sandhi-a-combinations",
      "sandhi-glides",
      "sandhi-e-o",
      "sandhi-protected",
    ],
  },
];

// Off the Learn trail (owner, 2026-10-13): the 1–4-card Grammar guide
// readings (`guide-art-*`; the guide topics themselves stay in the Library,
// with their pictures) and the six manuscript copies of the reviewed Sandhi
// lessons. Their data stays in sourceReadings.ts for the rebuild.
const RETIRED_SANDHI_COPIES = new Set([
  "sandhi-source-boundary", "sandhi-source-like-vowels", "sandhi-source-a-combinations",
  "sandhi-source-glides", "sandhi-source-e-o", "sandhi-source-protected",
]);
const kept = (id: string) => !id.startsWith("guide-art-") && !RETIRED_SANDHI_COPIES.has(id);

export const LEARNV2_LESSONS: LearnV2Lesson[] = [...REVIEWED_LEARNV2_LESSONS, ...SOURCE_READING_LESSONS.filter((l) => kept(l.id))].map(lesson => {
  if (lesson.cards.some(card => card.assetId || card.assetIds?.length || card.guide?.chapterId)) return lesson;
  const openingArt = lesson.id.startsWith("sandhi-") ? "sandhi" : lesson.id.startsWith("verse-") ? "metre" : undefined;
  if (!openingArt) return lesson;
  return { ...lesson, cards: lesson.cards.map((card, index) => index === 0 ? { ...card, openingArt } : card) };
});
export const LEARNV2_UNITS: LearnV2Unit[] = [...REVIEWED_LEARNV2_UNITS, ...SOURCE_READING_UNITS]
  .filter((u) => !u.id.startsWith("guide-art-"))
  .map((u) => ({ ...u, lessonIds: u.lessonIds.filter(kept) }))
  .filter((u) => u.lessonIds.length > 0);

export function getLearnV2Lesson(id: string): LearnV2Lesson | undefined {
  return LEARNV2_LESSONS.find((l) => l.id === id);
}

export function getLearnV2UnitForLesson(lessonId: string): LearnV2Unit | undefined {
  return LEARNV2_UNITS.find((u) => u.lessonIds.includes(lessonId));
}

export function learnV2LessonIndex(lessonId: string): { unitIndex: number; lessonIndex: number } | null {
  for (let ui = 0; ui < LEARNV2_UNITS.length; ui++) {
    const li = LEARNV2_UNITS[ui].lessonIds.indexOf(lessonId);
    if (li >= 0) return { unitIndex: ui, lessonIndex: li };
  }
  return null;
}
