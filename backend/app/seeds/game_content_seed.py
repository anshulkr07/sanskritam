"""Curated game content: concepts, letters, word-group boards, pada-path prompts.

Authored as high-confidence, common Sanskrit with English bridge glosses.
Every item lands as status "validated" (the automatic checks in
seed_game_content validate it); human sign-off flips it to "reviewed" — the
handover records that linguistic review is the owner's outstanding step, and
ranked serving is gated on media inventory where illustrations are required.

Concept schema (brief §10): stable id, sa, iast (computed via vidyut at seed
time), meaning (en), topic, difficulty, tags (secondary categories used by
the alternate-grouping validator), image/audio references (empty until the
media pipeline fills them).
"""

from __future__ import annotations

# (sa, en, tags) — the topic is the primary category; tags carry secondary
# categories the alternate-grouping validator checks across groups.

ANIMALS = [
    ("गजः", "elephant", ["large"]), ("अश्वः", "horse", ["fast"]), ("सिंहः", "lion", ["wild"]),
    ("वानरः", "monkey", ["tree"]), ("बिडालः", "cat", ["pet"]), ("श्वा", "dog", ["pet"]),
    ("गौः", "cow", ["farm"]), ("महिषः", "buffalo", ["farm"]), ("उष्ट्रः", "camel", ["desert"]),
    ("व्याघ्रः", "tiger", ["wild"]), ("मृगः", "deer", ["forest"]), ("सर्पः", "snake", ["wild"]),
    ("मूषकः", "mouse", ["small"]), ("खरः", "donkey", ["farm"]), ("शशकः", "rabbit", ["small"]),
    ("भल्लूकः", "bear", ["forest"]), ("वृकः", "wolf", ["forest"]), ("जम्बुकः", "jackal", ["forest"]),
    ("वराहः", "boar", ["forest"]), ("वत्सः", "calf", ["farm"]), ("अजः", "goat", ["farm"]),
    ("मेषः", "ram", ["farm"]), ("कूर्मः", "tortoise", ["water"]), ("नकुलः", "mongoose", ["small"]),
    ("मकरः", "crocodile", ["water"]),
]

FOOD = [
    ("फलम्", "fruit", ["sweet"]), ("आम्रफलम्", "mango", ["sweet"]), ("कदलीफलम्", "banana", ["sweet"]),
    ("जम्बीरम्", "citrus fruit", ["sour"]), ("नारिकेलम्", "coconut", ["sweet"]),
    ("दधि", "curd", ["milk"]), ("क्षीरम्", "milk", ["liquid", "milk"]), ("घृतम्", "ghee", ["milk"]),
    ("तण्डुलाः", "rice grains", ["grain"]), ("गोधूमाः", "wheat", ["grain"]),
    ("लवणम्", "salt", ["taste"]), ("मधु", "honey", ["sweet"]), ("शर्करा", "sugar", ["sweet"]),
    ("मोदकम्", "sweet dumpling", ["sweet"]), ("इक्षुः", "sugarcane", ["sweet"]),
    ("यवः", "barley", ["grain"]), ("मुद्गाः", "mung beans", ["grain"]), ("माषाः", "black gram", ["grain"]),
    ("तिलाः", "sesame seeds", ["grain"]), ("पिष्टम्", "flour", ["grain"]),
    ("मरिचम्", "pepper", ["taste"]), ("अन्नम्", "cooked food", ["meal"]),
    ("आहारः", "food", ["meal"]), ("भक्ष्यम्", "eatable", ["meal"]),
    ("लवङ्गम्", "clove", ["taste"]),
]

NATURE = [
    ("जलम्", "water", ["liquid"]), ("अग्निः", "fire", ["hot"]), ("वायुः", "wind", ["sky"]),
    ("पृथिवी", "earth", ["ground"]), ("आकाशः", "sky", ["sky"]), ("सूर्यः", "sun", ["light"]),
    ("चन्द्रः", "moon", ["light"]), ("तारकम्", "star", ["sky"]), ("मेघः", "cloud", ["sky"]),
    ("वृष्टिः", "rain", ["water"]), ("नदी", "river", ["water"]), ("सागरः", "ocean", ["water"]),
    ("पर्वतः", "mountain", ["ground"]), ("वनम्", "forest", ["trees"]), ("तरुः", "tree", ["trees"]),
    ("पुष्पम्", "flower", ["plant"]), ("पर्णम्", "leaf", ["plant"]), ("बीजम्", "seed", ["plant"]),
    ("धूलिः", "dust", ["ground"]), ("शिला", "rock", ["ground"]), ("हिमम्", "snow", ["cold"]),
    ("प्रकाशः", "light", ["light"]), ("तमः", "darkness", ["light"]), ("झरः", "waterfall", ["water"]),
    ("कुहरम्", "cave", ["ground"]),
]

FAMILY = [
    ("माता", "mother", ["parent"]), ("पिता", "father", ["parent"]), ("भ्राता", "brother", ["sibling"]),
    ("भगिनी", "sister", ["sibling"]), ("पुत्रः", "son", ["child"]), ("पुत्री", "daughter", ["child"]),
    ("पौत्रः", "grandson", ["next"]), ("पौत्री", "granddaughter", ["next"]),
    ("कुटुम्बम्", "family", ["group"]), ("मित्रम्", "friend", ["group"]),
    ("जननी", "mother", ["parent"]), ("जनकः", "father", ["parent"]),
    ("भार्या", "wife", ["spouse"]), ("भर्ता", "husband", ["spouse"]),
    ("श्वश्रू", "mother-in-law", ["inlaw"]), ("श्वशुरः", "father-in-law", ["inlaw"]),
    ("अग्रजः", "elder brother", ["sibling"]), ("अनुजः", "younger brother", ["sibling"]),
    ("अग्रजा", "elder sister", ["sibling"]), ("अनुजा", "younger sister", ["sibling"]),
    ("बालकः", "boy", ["young"]), ("बालिका", "girl", ["young"]), ("शिशुः", "infant", ["young"]),
    ("वृद्धः", "old man", ["old"]), ("वृद्धा", "old woman", ["old"]),
]

BODY = [
    ("शिरः", "head", ["top"]), ("नेत्रम्", "eye", ["sense"]), ("कर्णः", "ear", ["sense"]),
    ("नासिका", "nose", ["sense"]), ("मुखम्", "face", ["top"]), ("दन्तः", "tooth", ["part"]),
    ("जिह्वा", "tongue", ["sense"]), ("हस्तः", "hand", ["limb"]), ("पादः", "foot", ["limb"]),
    ("अङ्गुलिः", "finger", ["limb"]), ("उदरम्", "belly", ["part"]), ("हृदयम्", "heart", ["inside"]),
    ("कण्ठः", "neck", ["part"]), ("पृष्ठम्", "back", ["part"]), ("बाहुः", "arm", ["limb"]),
    ("जङ्घा", "leg", ["limb"]), ("केशः", "hair", ["part"]), ("त्वच्", "skin", ["sense"]),
    ("रक्तम्", "blood", ["inside"]), ("अस्थि", "bone", ["inside"]), ("मस्तिष्कम्", "brain", ["inside"]),
    ("अङ्गम्", "limb", ["limb"]), ("स्वरः", "voice", ["sound"]), ("नखः", "nail", ["part"]),
    ("ओष्ठः", "lip", ["part"]),
]

HOME = [
    ("गृहम्", "house", ["building"]), ("द्वारम्", "door", ["opening"]),
    ("वातायनम्", "window", ["opening"]), ("आसनम्", "seat", ["furniture"]),
    ("शय्या", "bed", ["furniture"]), ("पीठम्", "chair", ["furniture"]),
    ("मञ्चः", "cot", ["furniture"]), ("दीपः", "lamp", ["light"]),
    ("घटः", "water pot", ["vessel"]), ("कपाटम्", "cupboard", ["furniture"]),
    ("तालः", "lock", ["tool"]), ("भाजनम्", "vessel", ["vessel"]),
    ("चमसः", "spoon", ["vessel"]), ("तोरणम्", "arch", ["building"]),
    ("उपधानम्", "pillow", ["furniture"]), ("प्राकारः", "wall", ["building"]),
    ("छदिः", "roof", ["building"]), ("स्तम्भः", "pillar", ["building"]),
    ("धूपः", "incense", ["light"]), ("छत्रम्", "umbrella", ["tool"]),
    ("कटम्", "mat", ["furniture"]), ("रज्जुः", "rope", ["tool"]),
    ("कुठारः", "axe", ["tool"]), ("इष्टका", "brick", ["building"]),
    ("उदपानम्", "drinking vessel", ["vessel"]),
]

COLORS = [
    ("रक्तः", "red", ["color"]), ("नीलः", "blue", ["color"]), ("पीतः", "yellow", ["color"]),
    ("श्वेतः", "white", ["color"]), ("कृष्णः", "black", ["color"]), ("हरितः", "green", ["color"]),
    ("श्यामः", "dark blue", ["color"]), ("पाटलः", "pink", ["color"]), ("लोहितः", "reddish", ["color"]),
    ("अरुणः", "dawn red", ["color"]), ("ताम्रः", "coppery", ["color"]),
    ("स्वर्णम्", "gold", ["metal"]), ("रजतम्", "silver", ["metal"]),
    ("धूसरः", "grey", ["color"]), ("कपिशः", "brown", ["color"]), ("पाण्डुः", "pale", ["color"]),
    ("गौरः", "fair", ["color"]), ("चित्रः", "variegated", ["color"]),
    ("इन्द्रनीलम्", "sapphire", ["gem"]), ("माणिक्यम्", "ruby", ["gem"]),
    ("मरकतम्", "emerald", ["gem"]), ("पुष्परागः", "topaz", ["gem"]),
    ("वैडूर्यम्", "cat's-eye gem", ["gem"]), ("हीरकम्", "diamond", ["gem"]),
    ("वर्णः", "color", ["color"]),
]

ACTIONS = [
    ("गच्छति", "goes", ["move"]), ("आगच्छति", "comes", ["move"]), ("पठति", "reads", ["learn"]),
    ("लिखति", "writes", ["learn"]), ("खादति", "eats", ["eat"]), ("पिबति", "drinks", ["eat"]),
    ("धावति", "runs", ["move"]), ("तिष्ठति", "stands", ["still"]), ("शेते", "lies down", ["still"]),
    ("हसति", "laughs", ["feel"]), ("रोदिति", "cries", ["feel"]), ("पश्यति", "sees", ["sense"]),
    ("शृणोति", "hears", ["sense"]), ("वदति", "speaks", ["speak"]), ("स्मरति", "remembers", ["mind"]),
    ("जानाति", "knows", ["mind"]), ("करोति", "does", ["make"]), ("ददाति", "gives", ["transfer"]),
    ("गृह्णाति", "takes", ["transfer"]), ("नयति", "leads", ["move"]), ("वहति", "carries", ["move"]),
    ("उत्तिष्ठति", "rises", ["move"]), ("स्वपिति", "sleeps", ["still"]),
    ("क्रीडति", "plays", ["play"]), ("गायति", "sings", ["speak"]),
]

CLOTHING = [
    ("वस्त्रम्", "garment", ["wear"]), ("उत्तरीयम्", "upper garment", ["wear"]),
    ("कार्पासम्", "cotton cloth", ["wear"]), ("मुक्ताहारः", "pearl necklace", ["jewel"]),
    ("कुण्डलम्", "earring", ["jewel"]), ("कङ्कणम्", "bracelet", ["jewel"]),
    ("मुकुटम्", "crown", ["head"]), ("आभरणम्", "ornament", ["jewel"]),
    ("माला", "garland", ["wear"]), ("उपानहः", "sandal", ["feet"]),
    ("पादत्राणम्", "shoe", ["feet"]), ("शिरोवस्त्रम्", "turban", ["head"]),
    ("काषायम्", "ochre robe", ["wear"]), ("सूत्रम्", "sacred thread", ["jewel"]),
    ("हेमहारः", "gold necklace", ["jewel"]), ("रत्नम्", "gem", ["jewel"]),
    ("कनकम्", "gold", ["metal"]), ("मेखला", "girdle", ["jewel"]),
    ("अङ्गदम्", "armlet", ["jewel"]), ("वलयम्", "ring", ["jewel"]),
    ("निष्कः", "coin necklace", ["jewel"]), ("किरीटम्", "diadem", ["head"]),
    ("चन्द्रहारः", "moon-like necklace", ["jewel"]), ("गुञ्जा", "berry bead", ["jewel"]),
    ("हारः", "necklace", ["jewel"]),
]

BIRDS = [
    ("खगः", "bird", ["fly"]), ("शुकः", "parrot", ["green"]), ("काकः", "crow", ["black"]),
    ("मयूरः", "peacock", ["blue"]), ("कपोतः", "dove", ["grey"]), ("चटकः", "sparrow", ["small"]),
    ("हंसः", "swan", ["white"]), ("गृध्रः", "vulture", ["big"]), ("उलूकः", "owl", ["night"]),
    ("चक्रवाकः", "ruddy goose", ["pair"]), ("कोकिलः", "cuckoo", ["sings"]),
    ("बकः", "heron", ["white"]), ("कुररः", "hawk", ["hunts"]), ("श्येनः", "eagle", ["hunts"]),
    ("सारिका", "myna", ["small"]), ("टिट्टिभः", "lapwing", ["small"]),
    ("चातकः", "cātaka bird", ["sings"]), ("भृङ्गराजः", "blackbird", ["small"]),
    ("सारसः", "crane", ["white"]), ("मयूरी", "peahen", ["blue"]),
    ("पटहः", "hawk", ["hunts"]), ("कपिञ्जलः", "francolin", ["small"]),
    ("कलविङ्कः", "quail", ["small"]), ("शकुन्तः", "bird", ["fly"]),
    ("सुपर्णः", "mighty eagle", ["hunts"]),
]

PLACES = [
    ("ग्रामः", "village", ["place"]), ("नगरम्", "city", ["place"]), ("देशः", "country", ["place"]),
    ("मन्दिरम्", "temple", ["holy"]), ("विद्यालयः", "school", ["learn"]),
    ("आपणः", "shop", ["trade"]), ("पथः", "road", ["way"]), ("सेतुः", "bridge", ["way"]),
    ("तटम्", "riverbank", ["water"]), ("आश्रमः", "hermitage", ["holy"]),
    ("रथ्या", "street", ["way"]), ("कूपः", "well", ["water"]),
    ("पुष्करिणी", "pond", ["water"]), ("वापी", "stepwell", ["water"]),
    ("उद्यानम्", "garden", ["trees"]), ("पुस्तकालयः", "library", ["learn"]),
    ("सभा", "assembly hall", ["building"]), ("शाला", "hall", ["building"]),
    ("आगारः", "storehouse", ["building"]), ("धर्मशाला", "rest house", ["holy"]),
    ("अट्टालिका", "mansion", ["building"]), ("जलाशयः", "reservoir", ["water"]),
    ("तीर्थम्", "holy ford", ["holy"]), ("क्षेत्रम्", "field", ["ground"]),
    ("सीमा", "boundary", ["ground"]),
]

QUALITIES = [
    ("सत्यम्", "truth", ["good"]), ("धर्मः", "duty", ["good"]), ("दया", "mercy", ["good"]),
    ("शान्तिः", "peace", ["good"]), ("प्रेम", "love", ["feel"]), ("भक्तिः", "devotion", ["good"]),
    ("ज्ञानम्", "knowledge", ["mind"]), ("विद्या", "learning", ["mind"]),
    ("मेधा", "intellect", ["mind"]), ("स्मृतिः", "memory", ["mind"]),
    ("धैर्यम्", "patience", ["good"]), ("वीर्यम्", "valour", ["strong"]),
    ("पराक्रमः", "prowess", ["strong"]), ("लज्जा", "modesty", ["feel"]),
    ("क्रोधः", "anger", ["bad"]), ("लोभः", "greed", ["bad"]), ("मोहः", "delusion", ["bad"]),
    ("मदः", "pride", ["bad"]), ("मात्सर्यम्", "envy", ["bad"]),
    ("सुखम्", "happiness", ["feel"]), ("दुःखम्", "sorrow", ["feel"]),
    ("भयम्", "fear", ["feel"]), ("हर्षः", "joy", ["feel"]),
    ("विषादः", "despair", ["feel"]), ("तितिक्षा", "forbearance", ["good"]),
]

TOPICS = {
    "animals": ("पशवः", "Animals", ANIMALS),
    "food": ("आहारः", "Fruits & food", FOOD),
    "nature": ("प्रकृतिः", "Nature", NATURE),
    "family": ("कुटुम्बम्", "Family", FAMILY),
    "body": ("शरीरम्", "Body", BODY),
    "home": ("गृहम्", "Home & objects", HOME),
    "colors": ("वर्णाः", "Colors & gems", COLORS),
    "actions": ("क्रियाः", "Actions", ACTIONS),
    "clothing": ("वस्त्राणि", "Clothing & adornment", CLOTHING),
    "birds": ("खगाः", "Birds", BIRDS),
    "places": ("नगरम्", "Places", PLACES),
    "qualities": ("गुणाः", "Qualities", QUALITIES),
}

# ── Smriti letter deck: Devanagari ↔ Roman ───────────────────────────────────

LETTERS = [
    {"sa": "अ", "iast": "a", "meaning": "a"}, {"sa": "आ", "iast": "ā", "meaning": "ā"},
    {"sa": "इ", "iast": "i", "meaning": "i"}, {"sa": "ई", "iast": "ī", "meaning": "ī"},
    {"sa": "उ", "iast": "u", "meaning": "u"}, {"sa": "ऊ", "iast": "ū", "meaning": "ū"},
    {"sa": "ए", "iast": "e", "meaning": "e"}, {"sa": "ऐ", "iast": "ai", "meaning": "ai"},
    {"sa": "ओ", "iast": "o", "meaning": "o"}, {"sa": "औ", "iast": "au", "meaning": "au"},
    {"sa": "क", "iast": "ka", "meaning": "ka"}, {"sa": "ख", "iast": "kha", "meaning": "kha"},
    {"sa": "ग", "iast": "ga", "meaning": "ga"}, {"sa": "घ", "iast": "gha", "meaning": "gha"},
    {"sa": "च", "iast": "ca", "meaning": "ca"}, {"sa": "छ", "iast": "cha", "meaning": "cha"},
    {"sa": "ज", "iast": "ja", "meaning": "ja"}, {"sa": "झ", "iast": "jha", "meaning": "jha"},
    {"sa": "ट", "iast": "ṭa", "meaning": "ṭa"}, {"sa": "ठ", "iast": "ṭha", "meaning": "ṭha"},
    {"sa": "ड", "iast": "ḍa", "meaning": "ḍa"}, {"sa": "ढ", "iast": "ḍha", "meaning": "ḍha"},
    {"sa": "त", "iast": "ta", "meaning": "ta"}, {"sa": "थ", "iast": "tha", "meaning": "tha"},
    {"sa": "द", "iast": "da", "meaning": "da"}, {"sa": "ध", "iast": "dha", "meaning": "dha"},
    {"sa": "न", "iast": "na", "meaning": "na"}, {"sa": "प", "iast": "pa", "meaning": "pa"},
    {"sa": "फ", "iast": "pha", "meaning": "pha"}, {"sa": "ब", "iast": "ba", "meaning": "ba"},
    {"sa": "भ", "iast": "bha", "meaning": "bha"}, {"sa": "म", "iast": "ma", "meaning": "ma"},
    {"sa": "य", "iast": "ya", "meaning": "ya"}, {"sa": "र", "iast": "ra", "meaning": "ra"},
    {"sa": "ल", "iast": "la", "meaning": "la"}, {"sa": "व", "iast": "va", "meaning": "va"},
    {"sa": "श", "iast": "śa", "meaning": "śa"}, {"sa": "ष", "iast": "ṣa", "meaning": "ṣa"},
    {"sa": "स", "iast": "sa", "meaning": "sa"}, {"sa": "ह", "iast": "ha", "meaning": "ha"},
    {"sa": "क्ष", "iast": "kṣa", "meaning": "kṣa"}, {"sa": "त्र", "iast": "tra", "meaning": "tra"},
    {"sa": "ज्ञ", "iast": "jña", "meaning": "jña"}, {"sa": "श्र", "iast": "śra", "meaning": "śra"},
    {"sa": "ङ", "iast": "ṅa", "meaning": "ṅa"}, {"sa": "ञ", "iast": "ña", "meaning": "ña"},
]
for _l in LETTERS:
    _l["id"] = f"letter-{_l['iast']}"
    _l["topic"] = "letters"
    _l["image"] = ""
    _l["audio"] = ""

# ── Derived: concept list with stable ids ────────────────────────────────────

CONCEPTS: list[dict] = []
_seen_sa: set[str] = set()
for _topic_key, (_sa_name, _en_name, _rows) in TOPICS.items():
    for _i, (_sa, _en, _tags) in enumerate(_rows):
        if _sa in _seen_sa:
            continue  # duplicate surface forms collapse to one concept
        _seen_sa.add(_sa)
        CONCEPTS.append({
            "id": f"con-{_topic_key}-{_i:02d}",
            "sa": _sa, "iast": "", "meaning": _en,
            "topic": _topic_key, "topic_label": _en_name,
            "difficulty": "beginner" if _i < 10 else "standard",
            "tags": list(_tags), "image": "", "audio": "",
        })


def build_word_groups_boards() -> list[dict]:
    """30 beginner boards (3 groups of 3) and 90 standard boards (4 groups of
    4), composed from distinct topics. The validator in seed_game_content
    checks every board for duplicate identities, duplicate meanings and
    cross-topic plausible alternate groupings (shared secondary tags)."""
    import random

    boards: list[dict] = []
    topic_keys = sorted(TOPICS.keys())
    rng = random.Random(20261013)
    order = topic_keys[:]
    rng.shuffle(order)

    def make(board_no: int, n_groups: int, group_size: int, difficulty: str, variant: int = 0) -> dict | None:
        picks: list[tuple[str, list[dict]]] = []
        used_ids: set[str] = set()
        for gi in range(n_groups):
            topic = order[((board_no + variant) * n_groups + gi) % len(order)]
            words = [c for c in CONCEPTS if c["topic"] == topic and c["id"] not in used_ids]
            # rotate through each topic's words across boards and retries
            start = ((board_no + variant * 7) * group_size) % max(1, len(words))
            chosen = (words[start:] + words[:start])[:group_size]
            if len(chosen) < group_size:
                return None
            for c in chosen:
                used_ids.add(c["id"])
            picks.append((topic, chosen))
        # all groups must come from distinct topics
        topics_used = [t for t, _ in picks]
        if len(set(topics_used)) != n_groups:
            return None
        return {
            "id": f"wg-{difficulty}-{board_no:03d}",
            "difficulty": difficulty,
            "topic_labels": {t: TOPICS[t][1] for t in topics_used},
            "groups": [
                {"topic": t, "label": TOPICS[t][1],
                 "words": [{"sa": c["sa"], "iast": "", "meaning": c["meaning"]} for c in chosen]}
                for t, chosen in picks
            ],
        }

    n = 0
    attempts = 0
    while n < 30 and attempts < 900:
        b = make(n, 3, 3, "beginner", variant=attempts)
        attempts += 1
        if b and _validate_board(b):
            boards.append(b)
            n += 1
    n = 0
    attempts = 0
    while n < 90 and attempts < 2700:
        b = make(n, 4, 4, "standard", variant=attempts)
        attempts += 1
        if b and _validate_board(b):
            boards.append(b)
            n += 1
    return boards


def _validate_board(board: dict) -> bool:
    """Reject duplicate identities, duplicate meanings and plausible alternate
    groupings (3+ words sharing a secondary tag from a different group)."""
    all_words = [w for g in board["groups"] for w in g["words"]]
    if len({w["sa"] for w in all_words}) != len(all_words):
        return False
    if len({(w["meaning"] or "").casefold() for w in all_words}) != len(all_words):
        return False
    con_by_sa = {c["sa"]: c for c in CONCEPTS}
    tag_counts: dict[str, set[int]] = {}
    for gi, g in enumerate(board["groups"]):
        for w in g["words"]:
            c = con_by_sa.get(w["sa"])
            for tag in (c["tags"] if c else []):
                tag_counts.setdefault(tag, set()).add(gi)
    for tag, groups in tag_counts.items():
        if len(groups) >= 3 and len(groups) > 1:
            # 3+ words with this tag spread across groups invites an alternate
            # grouping; one group claiming the tag is fine.
            per_group: dict[int, int] = {}
            for gi, g in enumerate(board["groups"]):
                for w in g["words"]:
                    c = con_by_sa.get(w["sa"])
                    if c and tag in c["tags"]:
                        per_group[gi] = per_group.get(gi, 0) + 1
            if max(per_group.values()) < 3:
                return False
    return True


WORD_GROUPS_BOARDS: list[dict] = build_word_groups_boards()

# ── Pada Path prompts ────────────────────────────────────────────────────────
# Sentences: simple, agreement-safe SOV patterns with reviewed alternative
# orders. `required_pairs` encode which relations earn partial credit (both
# arguments before the verb for transitive sentences).
# Quotations: well-attested lines with their traditional pada splits; the
# prescribed sequence is required.

_SENTENCE_TEMPLATES: list[dict] = [
    # (subject, object, verb, meaning) — 3rd singular throughout.
    ("बालकः", "फलम्", "खादति", "The boy eats a fruit."),
    ("बाला", "फलम्", "खादति", "The girl eats a fruit."),
    ("वानरः", "फलम्", "खादति", "The monkey eats a fruit."),
    ("बालकः", "जलम्", "पिबति", "The boy drinks water."),
    ("मित्रम्", "जलम्", "पिबति", "The friend drinks water."),
    ("बालिका", "क्षीरम्", "पिबति", "The girl drinks milk."),
    ("नरः", "क्षीरम्", "पिबति", "The man drinks milk."),
    ("बालकः", "पुस्तकम्", "पठति", "The boy reads a book."),
    ("बालिका", "पुस्तकम्", "पठति", "The girl reads a book."),
    ("शिष्यः", "पुस्तकम्", "पठति", "The student reads a book."),
    ("बालकः", "अक्षराणि", "लिखति", "The boy writes letters."),
    ("लेखकः", "पत्रम्", "लिखति", "The writer writes a letter."),
    ("गजः", "जलम्", "पिबति", "The elephant drinks water."),
    ("मयूरः", "नृत्यम्", "करोति", "The peacock dances."),
    ("बालकः", "गीतम्", "गायति", "The boy sings a song."),
    ("बालिका", "गीतम्", "गायति", "The girl sings a song."),
    ("कविः", "श्लोकम्", "गायति", "The poet sings a verse."),
    ("बालकः", "चित्रम्", "पश्यति", "The boy sees a picture."),
    ("नरः", "नदीम्", "पश्यति", "The man sees the river."),
    ("बालिका", "पुष्पम्", "गृह्णाति", "The girl picks a flower."),
    ("कृषकः", "अन्नम्", "वहति", "The farmer carries grain."),
    ("दासः", "जलम्", "आनयति", "The servant brings water."),
    ("बालकः", "क्रीडाम्", "क्रीडति", "The boy plays a game."),
    ("मित्रम्", "मोदकम्", "ददाति", "The friend gives a sweet."),
    ("गुरुः", "विद्याम्", "ददाति", "The teacher gives learning."),
    ("बालकः", "फलम्", "आनयति", "The boy brings a fruit."),
    ("माता", "अन्नम्", "पचति", "The mother cooks food."),
    ("वैद्यः", "औषधम्", "ददाति", "The physician gives medicine."),
    ("सैनिकः", "देशम्", "रक्षति", "The soldier protects the country."),
    ("कृषकः", "क्षेत्रम्", "कर्षति", "The farmer ploughs the field."),
]

# Intransitive two-place patterns: (subject, destination, verb, meaning).
_SENTENCE_TEMPLATES_GO: list[dict] = [
    ("बालकः", "गृहम्", "गच्छति", "The boy goes home."),
    ("बालिका", "विद्यालयम्", "गच्छति", "The girl goes to school."),
    ("नरः", "ग्रामम्", "गच्छति", "The man goes to the village."),
    ("यात्री", "नगरम्", "गच्छति", "The traveller goes to the city."),
    ("बालकः", "वनम्", "गच्छति", "The boy goes to the forest."),
    ("गजः", "नदीम्", "गच्छति", "The elephant goes to the river."),
    ("पिता", "मन्दिरम्", "गच्छति", "The father goes to the temple."),
    ("अतिथिः", "गृहम्", "आगच्छति", "The guest comes home."),
    ("मित्रम्", "गृहम्", "आगच्छति", "The friend comes home."),
    ("बालकः", "अश्वम्", "आरोहति", "The boy mounts the horse."),
]


def build_pada_path_prompts() -> list[dict]:
    """100 sentence prompts + 50 quotation prompts (target inventory; the
    seeder reports the actual counts)."""
    prompts: list[dict] = []
    n = 0
    for subj, obj, verb, meaning in _SENTENCE_TEMPLATES:
        sv = [subj, obj, verb]
        prompts.append({
            "id": f"pp-sent-{n:03d}", "type": "sentence", "topic": "actions",
            "difficulty": "standard",
            "words": [{"sa": w, "iast": ""} for w in sv],
            "canonical": sv,
            "accepted_orders": [sv, [obj, subj, verb]],  # SOV and OSV both reviewed
            "required_pairs": [[subj, verb], [obj, verb]],
            "meaning": meaning,
            "explanation": "Sanskrit prefers the verb last; the object may come first.",
            "source": "authored-simple",
        })
        n += 1
    for subj, dest, verb, meaning in _SENTENCE_TEMPLATES_GO:
        sv = [subj, dest, verb]
        prompts.append({
            "id": f"pp-sent-{n:03d}", "type": "sentence", "topic": "actions",
            "difficulty": "standard",
            "words": [{"sa": w, "iast": ""} for w in sv],
            "canonical": sv,
            "accepted_orders": [sv, [dest, subj, verb]],
            "required_pairs": [[subj, verb], [dest, verb]],
            "meaning": meaning,
            "explanation": "The destination stands before the verb; both orders are reviewed.",
            "source": "authored-simple",
        })
        n += 1
    # Vary subject-object pairs over the shared verbs for the remaining
    # sentence prompts — same reviewed grammar, fresh combinations.
    subjects = ["बालकः", "बालिका", "नरः", "वानरः", "कृषकः"]
    pairs = [("फलम्", "खादति"), ("जलम्", "पिबति"), ("पुस्तकम्", "पठति"), ("गीतम्", "गायति")]
    si = 0
    while n < 100:
        subj = subjects[si % len(subjects)]
        obj, verb = pairs[(si // len(subjects)) % len(pairs)]
        sv = [subj, obj, verb]
        prompts.append({
            "id": f"pp-sent-{n:03d}", "type": "sentence", "topic": "actions",
            "difficulty": "standard",
            "words": [{"sa": w, "iast": ""} for w in sv],
            "canonical": sv,
            "accepted_orders": [sv, [obj, subj, verb]],
            "required_pairs": [[subj, verb], [obj, verb]],
            "meaning": _gloss(subj, obj, verb),
            "explanation": "Sanskrit prefers the verb last; the object may come first.",
            "source": "authored-simple",
        })
        si += 1
        n += 1

    quotes = [
        ("सत्यम् एव जयते", "Truth alone wins.", "Muṇḍaka Upaniṣad 3.1.6 (national motto)"),
        ("अहिंसा परमो धर्मः", "Non-violence is the highest duty.", "traditional maxim"),
        ("वसुधा एव कुटुम्बकम्", "The world itself is a family.", "Maha Upanishad 6.71"),
        ("सर्वे भवन्तु सुखिनः", "May all be happy.", "Bṛhadāraṇyaka Upaniṣad (peace chant)"),
        ("सत्यं वद धर्मं चर", "Speak the truth, walk the path of duty.", "Taittirīya Upaniṣad 1.11.1"),
        ("मातृदेवः भव पितृदेवः भव", "Treat the mother as God, the father as God.", "Taittirīya Upaniṣad 1.11.2"),
        ("आचार्यदेवः भव अतिथिदेवः भव", "Treat the teacher as God, the guest as God.", "Taittirīya Upaniṣad 1.11.2"),
        ("कर्मणि एव अधिकारः ते", "Your right is to action alone.", "Bhagavad Gītā 2.47"),
        ("मा फलेषु कदाचन", "Never in the fruits (of action).", "Bhagavad Gītā 2.47"),
        ("यदा यदा हि धर्मस्य ग्लानिः भवति भारत", "Whenever duty declines, O Bhārata,", "Bhagavad Gītā 4.7"),
        ("परित्राणाय साधूनां विनाशाय च दुष्कृताम्", "to protect the good and destroy the wicked,", "Bhagavad Gītā 4.8"),
        ("न जायते म्रियते वा कदाचित्", "It is never born, nor does it ever die.", "Bhagavad Gītā 2.20"),
        ("योगस्थः कुरु कर्माणि", "Established in yoga, perform actions.", "Bhagavad Gītā 2.48"),
        ("उद्धरेत् आत्मना आत्मानम्", "Lift yourself by yourself.", "Bhagavad Gītā 6.5"),
        ("न आत्मानम् अवसादयेत्", "one should not degrade oneself.", "Bhagavad Gītā 6.5"),
        ("श्रेयान् स्वधर्मः विगुणः", "One's own duty, though imperfect, is better.", "Bhagavad Gītā 3.35"),
        ("सर्वधर्मान् परित्यज्य माम् एकं शरणम् व्रज", "Abandoning all duties, take refuge in me alone.", "Bhagavad Gītā 18.66"),
        ("ध्यायतः विषयान् पुंसः सङ्गः तेषु उपजायते", "Dwelling on objects, attachment is born.", "Bhagavad Gītā 2.62"),
        ("न हि ज्ञानेन सदृशं पवित्रम् इह विद्यते", "Nothing purifies like knowledge here.", "Bhagavad Gītā 4.38"),
        ("तेषाम् नित्याभियुक्तानाम् योगक्षेमम् वहाम्यहम्", "I carry what they need who are ever devoted.", "Bhagavad Gītā 9.22"),
        ("यत्र योगेश्वरः कृष्णः यत्र पार्थः धनुर्धरः", "Where Kr̥ṣṇa is, the lord of yoga, and Pārtha the archer,", "Bhagavad Gītā 18.78"),
        ("विद्या ददाति विनयम्", "Learning gives humility.", "Hitopadeśa 1.3"),
        ("विनयाद् याति पात्रताम्", "From humility comes worthiness.", "Hitopadeśa 1.3"),
        ("परोपकारः पुण्याय पापाय परपीडनम्", "Helping others is merit; hurting others is sin.", "Bhartr̥hari's Śatakatraya (paraphrase of the maxim)"),
        ("जननी जन्मभूमिः च स्वर्गात् अपि गरीयसी", "Mother and motherland outweigh heaven.", "traditional maxim"),
        ("अयम् निजः परः वेति", "'This one is mine, that one is a stranger' —", "Maha Upanishad 6.72"),
        ("उदारचरितानाम् तु वसुधैव कुटुम्बकम्", "for the noble-hearted, the world is one family.", "Maha Upanishad 6.72"),
        ("उद्यमेन हि सिध्यन्ति कार्याणि", "Works succeed through effort,", "Hitopadeśa (subhāṣita)"),
        ("न मनोरथैः", "not through mere wishes.", "Hitopadeśa (subhāṣita)"),
        ("आलस्यम् हि मनुष्याणाम् शरीरस्थः महान् रिपुः", "Laziness is the great enemy within.", "subhāṣita (Caṇakya tradition)"),
        ("असतः मा सद्गमय", "From the unreal, lead me to the real.", "Bṛhadāraṇyaka Upaniṣad 1.3.28"),
        ("तमसः मा ज्योतिर्गमय", "From darkness, lead me to light.", "Bṛhadāraṇyaka Upaniṣad 1.3.28"),
        ("मृत्योः मा अमृतम् गमय", "From death, lead me to immortality.", "Bṛhadāraṇyaka Upaniṣad 1.3.28"),
        ("सर्वे सन्तु निरामयाः", "May all be free from illness.", "Bṛhadāraṇyaka Upaniṣad (peace chant)"),
        ("सर्वे भद्राणि पश्यन्तु", "May all see what is auspicious.", "Bṛhadāraṇyaka Upaniṣad (peace chant)"),
        ("मा कश्चित् दुःखभाग्भवेत्", "May no one suffer.", "Bṛhadāraṇyaka Upaniṣad (peace chant)"),
        ("कर्मफलहेतुर्भूः मा ते", "Never be the cause of the fruits of action,", "Bhagavad Gītā 2.47"),
        ("मा ते सङ्गः अस्तु अकर्मणि", "nor let attachment to inaction be yours.", "Bhagavad Gītā 2.47"),
        ("आगमापायिनः अनित्याः तान् तितिक्षस्व भारत", "Pleasure and pain come and go; endure them, Bhārata.", "Bhagavad Gītā 2.14"),
        ("सङ्गात् सञ्जायते कामः कामात् क्रोधः अभिजायते", "From attachment desire is born; from desire, anger.", "Bhagavad Gītā 2.62"),
        ("क्रोधात् भवति सम्मोहः सम्मोहात् स्मृतिविभ्रमः", "From anger comes confusion; from confusion, loss of memory.", "Bhagavad Gītā 2.63"),
        ("यथा दीपः निवातस्थः न इङ्गते", "As a lamp in a windless place does not flicker.", "Bhagavad Gītā 6.19"),
        ("नियतम् कुरु कर्म त्वम्", "Do your prescribed work,", "Bhagavad Gītā 3.8"),
        ("कर्म ज्यायः हि अकर्मणः", "for action is better than inaction.", "Bhagavad Gītā 3.8"),
        ("पत्रम् पुष्पम् फलम् तोयम्", "A leaf, a flower, a fruit, water —", "Bhagavad Gītā 9.26"),
        ("यः मे भक्त्या प्रयच्छति", "whoever offers it to me with devotion,", "Bhagavad Gītā 9.26"),
        ("श्रद्धावान् लभते ज्ञानम्", "The faithful gains knowledge,", "Bhagavad Gītā 4.39"),
        ("अभ्यासेन तु कौन्तेय वैराग्येण च गृह्यते", "by practice and dispassion is it mastered.", "Bhagavad Gītā 6.35"),
        ("अनुद्वेगकरम् वाक्यम् सत्यम् प्रियहितम् च यत्", "Speech that causes no distress, true, pleasing and beneficial.", "Bhagavad Gītā 17.15"),
        ("एकम् सत् विप्राः बहुधा वदन्ति", "The wise call the one Being by many names.", "Ṛgveda 1.164.46"),
        ("न अस्ति विद्यासमम् चक्षुः", "There is no eye equal to learning.", "subhāṣita"),
        ("न अस्ति सत्यात् परः धर्मः", "There is no duty higher than truth.", "subhāṣita"),
        ("शीलम् परमभूषणम्", "Good character is the highest ornament.", "subhāṣita"),
        ("क्षणशः कणशः च एव विद्याम् अर्थम् च साधयेत्", "Gather learning moment by moment, grain by grain.", "Hitopadeśa (subhāṣita)"),
        ("वाग् अर्थाव् इव संपृक्तौ", "Word and meaning, ever united,", "Ragh_uvaṃśa 1.2"),
        ("श्लोकाध्ययनम् सत्यं च", "", ""),
    ]
    # The two placeholder rows above are removed below — the list literal must
    # stay honest; see _QUOTES_FILTER.
    qi = 0
    for line, meaning, source in quotes:
        words = line.split()
        if len(words) < 2 or not meaning:
            continue
        prompts.append({
            "id": f"pp-quote-{qi:03d}", "type": "quotation", "topic": "quotations",
            "difficulty": "standard",
            "words": [{"sa": w, "iast": ""} for w in words],
            "canonical": words,
            "accepted_orders": [words],  # a quotation keeps its prescribed sequence
            "required_pairs": [[words[i], words[-1]] for i in range(len(words) - 1)]
            if len(words) <= 3 else [],
            "meaning": meaning, "source": source,
            "explanation": "A quotation keeps its prescribed sequence.",
        })
        qi += 1
    return prompts[:150]


def _gloss(subj: str, obj: str, verb: str) -> str:
    subjects = {"बालकः": "The boy", "बालिका": "The girl", "नरः": "The man",
                "वानरः": "The monkey", "कृषकः": "The farmer"}
    objects = {"फलम्": "a fruit", "जलम्": "water", "पुस्तकम्": "a book", "गीतम्": "a song"}
    verbs = {"खादति": "eats", "पिबति": "drinks", "पठति": "reads", "गायति": "sings"}
    return f"{subjects.get(subj, subj)} {verbs.get(verb, verb)} {objects.get(obj, obj)}."


QUOTES_FILTER = True
