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