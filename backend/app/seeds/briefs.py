"""SCENARIO_BRIEFS — 50 scenario briefs for the authoring pipeline.

Cross-product of 10 situations × 5 feature bands.
This is a static data file — no LLM calls, no network.
Feature IDs verified against the seeded features table at test time.
"""

# Feature bands ordered by the seeded features.rank:
# (a) rank 10-32: NOM.SG, ACC.SG, PRES.1SG, PRES.2SG, PRES.3SG
# (b) rank 12-17: +INSTR.SG, DAT.SG, VOC.SG
# (c) rank 25-38: +NOM.PL, ACC.PL, PRES.1PL, PRES.2PL, PRES.3PL
# (d) rank 14-40: +ABL.SG, GEN.SG, GEN.PL, LOC.SG, LOC.PL, IMP.2SG
# (e) rank 23-35: +NOM.DU, ACC.DU, PRES.1DU, PRES.2DU, PRES.3DU

FEATURE_BANDS: list[dict] = [
    {
        "name": "a",
        "features": ["NOM.SG", "ACC.SG", "PRES.1SG", "PRES.2SG", "PRES.3SG"],
        "min_ratio": 0.2,
        "max_ratio": 0.4,
        "prefer_provider": "",
    },
    {
        "name": "b",
        "features": ["NOM.SG", "ACC.SG", "PRES.1SG", "PRES.2SG", "PRES.3SG", "INSTR.SG", "DAT.SG", "VOC.SG"],
        "min_ratio": 0.25,
        "max_ratio": 0.45,
        "prefer_provider": "",
    },
    {
        "name": "c",
        "features": ["NOM.SG", "ACC.SG", "PRES.1SG", "PRES.2SG", "PRES.3SG", "INSTR.SG", "DAT.SG", "VOC.SG", "NOM.PL", "ACC.PL", "PRES.1PL", "PRES.2PL", "PRES.3PL"],
        "min_ratio": 0.3,
        "max_ratio": 0.5,
        "prefer_provider": "",
    },
    {
        "name": "d",
        "features": ["NOM.SG", "ACC.SG", "PRES.1SG", "PRES.2SG", "PRES.3SG", "INSTR.SG", "DAT.SG", "VOC.SG", "NOM.PL", "ACC.PL", "PRES.1PL", "PRES.2PL", "PRES.3PL", "ABL.SG", "GEN.SG", "GEN.PL", "LOC.SG", "LOC.PL", "IMP.2SG"],
        "min_ratio": 0.4,
        "max_ratio": 0.6,
        "prefer_provider": "",
    },
    {
        "name": "e",
        "features": ["NOM.SG", "ACC.SG", "PRES.1SG", "PRES.2SG", "PRES.3SG", "INSTR.SG", "DAT.SG", "VOC.SG", "NOM.PL", "ACC.PL", "PRES.1PL", "PRES.2PL", "PRES.3PL", "ABL.SG", "GEN.SG", "GEN.PL", "LOC.SG", "LOC.PL", "IMP.2SG", "NOM.DU", "ACC.DU", "PRES.1DU", "PRES.2DU", "PRES.3DU"],
        "min_ratio": 0.5,
        "max_ratio": 0.8,
        "prefer_provider": "gemini",
    },
]

# 10 situations mapped to brief data
SITUATIONS: list[dict] = [
    {"slug": "greeting", "title": "अभिवादनम्", "description": "Greetings and introductions", "register": "laukika", "situation": "Two people meet and exchange names and greetings."},
    {"slug": "family", "title": "परिवारः", "description": "Family members and relationships", "register": "laukika", "situation": "Talking about family members, their names, and relationships."},
    {"slug": "food", "title": "भोजनम्", "description": "Food, eating, and dining", "register": "laukika", "situation": "Discussing food, ordering meals, and talking about eating habits."},
    {"slug": "market", "title": "बाजारः", "description": "Marketplace and shopping", "register": "laukika", "situation": "Buying goods, asking prices, and bargaining at the market."},
    {"slug": "travel", "title": "यात्रा", "description": "Travel and directions", "register": "laukika", "situation": "Asking for directions, describing routes, and talking about travel."},
    {"slug": "routine", "title": "दैनन्दिनः", "description": "Daily routine", "register": "laukika", "situation": "Describing daily activities, waking up, working, and resting."},
    {"slug": "weather", "title": "ऋतवः", "description": "Weather and seasons", "register": "laukika", "situation": "Talking about weather, seasons, and climate."},
    {"slug": "school", "title": "विद्यालयः", "description": "School and learning", "register": "laukika", "situation": "Discussing studies, teachers, subjects, and school life."},
    {"slug": "health", "title": "आरोग्यम्", "description": "Health and wellness", "register": "laukika", "situation": "Talking about health, illness, and visiting a doctor."},
    {"slug": "festivals", "title": "उत्सवाः", "description": "Festivals and celebrations", "register": "classical", "situation": "Describing festivals, celebrations, and cultural events."},
]

# Build cross-product
SCENARIO_BRIEFS: list[dict] = []

for band in FEATURE_BANDS:
    for sit in SITUATIONS:
        brief = {
            "slug": f"{sit['slug']}-{band['name']}",
            "title": sit["title"],
            "description": sit["description"],
            "register": sit["register"],
            "situation": sit["situation"],
            "target_features": band["features"],
            "min_ratio": band["min_ratio"],
            "max_ratio": band["max_ratio"],
            "est_minutes": 4,
            "n_turns": 8,
        }
        if band.get("prefer_provider"):
            brief["prefer_provider"] = band["prefer_provider"]
        SCENARIO_BRIEFS.append(brief)


# ── P7-12: focused challenge bands ─────────────────────────────────────────
#
# The scenario bands above are cumulative supersets, so a generator drifts to
# the easiest readings (NOM/ACC/PRES.3SG) and the lopsided coverage of §4
# results. The challenge pool needs NARROW bands that force one under-covered
# feature per sentence, so adaptive.py has something to select at each feature's
# mastery edge.
#
# Only features the Vidyut analyzer can actually DERIVE belong here — the gate
# rejects a claim it cannot verify. The analyzer's vocabulary is case+number and
# tense+person+number strings (NOM.PL, GEN.PL, PRES.2PL, IMP.2SG, ...). It emits
# nothing for gender (MASC/FEM/NEUT), voice (ATMANEPADA/PARASMAIPADA), bare
# number (SG/DU/PL), or the sandhi type tags; those are a frozen-analyzer
# coverage gap (§2.1) and are escalated, not forced here.
#
# Dual-bearing bands route to Gemini per §2.6 (Sarvam false-accuses ~50% of
# duals) and their pass rate is reported separately.
CHALLENGE_BANDS: list[dict] = [
    {"name": "gen-pl",  "features": ["GEN.PL", "NOM.SG"], "register": "laukika",  "prefer_provider": ""},
    {"name": "loc-pl",  "features": ["LOC.PL", "NOM.SG"], "register": "laukika",  "prefer_provider": ""},
    {"name": "pres-2pl","features": ["PRES.2PL", "ACC.SG"], "register": "laukika", "prefer_provider": ""},
    {"name": "imp-2sg", "features": ["IMP.2SG", "VOC.SG"], "register": "laukika",  "prefer_provider": ""},
    {"name": "pres-1pl", "features": ["PRES.1PL", "ACC.SG"], "register": "laukika", "prefer_provider": ""},
    {"name": "instr-sg", "features": ["INSTR.SG", "NOM.SG"], "register": "laukika", "prefer_provider": ""},
    {"name": "dat-sg",  "features": ["DAT.SG", "ACC.SG"], "register": "laukika",  "prefer_provider": ""},
    {"name": "abl-sg",  "features": ["ABL.SG", "NOM.SG"], "register": "laukika",  "prefer_provider": ""},
    {"name": "gen-sg",  "features": ["GEN.SG", "NOM.SG"], "register": "laukika",  "prefer_provider": ""},
    {"name": "nom-pl",  "features": ["NOM.PL", "PRES.3PL"], "register": "laukika", "prefer_provider": ""},
    {"name": "acc-pl",  "features": ["ACC.PL", "PRES.1SG"], "register": "laukika", "prefer_provider": ""},
    {"name": "pres-1du", "features": ["PRES.1DU", "ACC.SG"], "register": "laukika", "prefer_provider": "gemini"},
    {"name": "pres-2du", "features": ["PRES.2DU", "ACC.SG"], "register": "laukika", "prefer_provider": "gemini"},
    {"name": "acc-du",  "features": ["ACC.DU", "NOM.SG"], "register": "laukika",  "prefer_provider": "gemini"},
    # classical-register companions so both vocabularies advance
    {"name": "cl-gen-pl", "features": ["GEN.PL", "NOM.SG"], "register": "classical", "prefer_provider": ""},
    {"name": "cl-loc-pl", "features": ["LOC.PL", "NOM.SG"], "register": "classical", "prefer_provider": ""},
    {"name": "cl-pres-2pl", "features": ["PRES.2PL", "ACC.SG"], "register": "classical", "prefer_provider": ""},
    {"name": "cl-imp-2sg", "features": ["IMP.2SG", "VOC.SG"], "register": "classical", "prefer_provider": ""},
    {"name": "cl-pres-1du", "features": ["PRES.1DU", "ACC.SG"], "register": "classical", "prefer_provider": "gemini"},
    {"name": "cl-acc-du", "features": ["ACC.DU", "NOM.SG"], "register": "classical", "prefer_provider": "gemini"},
]