"""Vocabulary curriculum seeds (P22-5).

PROVENANCE (P22-5 §6): curated 2026-09-07 from vocabulary already present in
the Vidyut-gated challenge pool, with original glosses — NOT ingested from
Sanskrit WordNet. The WordNet cross-reference (CC BY-SA 4.0, 66,930 words)
is deferred pending the licence confirmation on the exported data that §6
requires; each row's ``provenance`` says so. Example sentences are drawn from
APPROVED challenge rows containing the word (substring match at seed time, up
to 2) — every example sentence therefore already passed the Vidyut gate, and
a word with no pool sentence ships with ``examples: []`` (absent is absent).

Stems are given only for regular a-stems (word minus its :/म् ending); every
other row ships ``stem: ""`` rather than a guessed stem.
"""

from __future__ import annotations

# (topic, rank, devanagari, gloss, gender, stem)
SEED_VOCAB: list[tuple[str, int, str, str, str, str]] = [
    ("greeting", 0, "नमस्ते", "greetings to you", "", ""),
    ("greeting", 1, "स्वागतम्", "welcome", "NEUT", "स्वागत"),
    ("greeting", 2, "धन्यवादः", "thank you", "MASC", "धन्यवाद"),
    ("greeting", 3, "मित्रम्", "friend", "NEUT", "मित्र"),
    ("greeting", 4, "सुखम्", "happiness; are you well?", "NEUT", "सुख"),
    ("greeting", 5, "पुनः", "again; see you again", "", ""),
    ("family", 0, "माता", "mother", "FEM", ""),
    ("family", 1, "पिता", "father", "MASC", ""),
    ("family", 2, "पुत्रः", "son", "MASC", "पुत्र"),
    ("family", 3, "भ्राता", "brother", "MASC", ""),
    ("family", 4, "भगिनी", "sister", "FEM", ""),
    ("family", 5, "गृहम्", "house, home", "NEUT", "गृह"),
    ("food", 0, "फलम्", "fruit", "NEUT", "फल"),
    ("food", 1, "जलम्", "water", "NEUT", "जल"),
    ("food", 2, "अन्नम्", "food, grain", "NEUT", "अन्न"),
    ("food", 3, "दुग्धम्", "milk", "NEUT", "दुग्ध"),
    ("food", 4, "ओदनः", "cooked rice", "MASC", "ओदन"),
    ("food", 5, "शाकम्", "vegetables", "NEUT", "शाक"),
    ("market", 0, "आपणः", "market, shop", "MASC", "आपण"),
    ("market", 1, "मूल्यम्", "price", "NEUT", "मूल्य"),
    ("market", 2, "धनम्", "money, wealth", "NEUT", "धन"),
    ("market", 3, "क्रयः", "buying, purchase", "MASC", "क्रय"),
    ("market", 4, "विक्रयः", "selling, sale", "MASC", "विक्रय"),
    ("market", 5, "पण्यम्", "goods, merchandise", "NEUT", "पण्य"),
    ("travel", 0, "मार्गः", "road, path", "MASC", "मार्ग"),
    ("travel", 1, "रथः", "chariot, cart", "MASC", "रथ"),
    ("travel", 2, "यात्रा", "journey", "FEM", ""),
    ("travel", 3, "ग्रामः", "village", "MASC", "ग्राम"),
    ("travel", 4, "नदी", "river", "FEM", ""),
    ("travel", 5, "पर्वतः", "mountain", "MASC", "पर्वत"),
    ("routine", 0, "सूर्यः", "sun", "MASC", "सूर्य"),
    ("routine", 1, "चन्द्रः", "moon", "MASC", "चन्द्र"),
    ("routine", 2, "दिवसः", "day", "MASC", "दिवस"),
    ("routine", 3, "रात्रिः", "night", "FEM", ""),
    ("routine", 4, "कार्यम्", "work, task", "NEUT", "कार्य"),
    ("routine", 5, "विश्रामः", "rest", "MASC", "विश्राम"),
    ("weather", 0, "वायुः", "wind", "MASC", "वायु"),
    ("weather", 1, "मेघः", "cloud", "MASC", "मेघ"),
    ("weather", 2, "वर्षा", "rain, rainy season", "FEM", ""),
    ("weather", 3, "हिमम्", "snow, frost", "NEUT", "हिम"),
    ("weather", 4, "वसन्तः", "spring", "MASC", "वसन्त"),
    ("weather", 5, "प्रकाशः", "light", "MASC", "प्रकाश"),
    ("school", 0, "पुस्तकम्", "book", "NEUT", "पुस्तक"),
    ("school", 1, "पाठः", "lesson, reading", "MASC", "पाठ"),
    ("school", 2, "गुरुः", "teacher", "MASC", "गुरु"),
    ("school", 3, "शिष्यः", "student", "MASC", "शिष्य"),
    ("school", 4, "विद्या", "knowledge, learning", "FEM", ""),
    ("school", 5, "लेखनी", "pen", "FEM", ""),
    ("health", 0, "शरीरम्", "body", "NEUT", "शरीर"),
    ("health", 1, "औषधम्", "medicine", "NEUT", "औषध"),
    ("health", 2, "वैद्यः", "doctor", "MASC", "वैद्य"),
    ("health", 3, "स्वास्थ्यम्", "health", "NEUT", "स्वास्थ्य"),
    ("health", 4, "रोगः", "illness", "MASC", "रोग"),
    ("health", 5, "बलम्", "strength", "NEUT", "बल"),
    ("festivals", 0, "दीपः", "lamp", "MASC", "दीप"),
    ("festivals", 1, "उत्सवः", "festival", "MASC", "उत्सव"),
    ("festivals", 2, "पूजा", "worship", "FEM", ""),
    ("festivals", 3, "गीतम्", "song", "NEUT", "गीत"),
    ("festivals", 4, "नृत्यम्", "dance", "NEUT", "नृत्य"),
    ("festivals", 5, "प्रकाशः", "light", "MASC", "प्रकाश"),
]

# P23-4a: a registry KEY, not free text. The row owns the pointer; the
# registry (seeds/licences.py) owns the wording. These words were curated
# from the Vidyut-gated challenge pool with original glosses 2026-09-07;
# WordNet cross-reference stays deferred pending its licence confirmation.
PROVENANCE = "original"


def _pool_examples(dev: str, approved: list[tuple[str, str]]) -> list[dict]:
    """Up to 2 example sentences from APPROVED challenge rows containing the
    word (substring match). Every example therefore already passed the Vidyut
    gate — the seed never authors sentences."""
    from app.services import iast as _iast

    examples = []
    for target, prompt in approved:
        if dev and dev in target:
            examples.append({
                "devanagari": target,
                "iast": _iast.to_iast(target),
                "gloss": prompt,
            })
            if len(examples) == 2:
                break
    return examples


# DCS frequency expansion (2026-09-08, P22-5 WordNet alternative).
# (topic, devanagari, gloss): hand-mapped from Mitrasaṃgraha-induced
# glosses — see scripts/import_vocab_dcs.py for TOPIC_MAP, GLOSS_FIXES
# and every staged-but-unshipped row with its reason. Gender/stem stay ""
# (allowed): kosha liṅga is not unanimous and stems ship for regular
# a-stems only — neither is asserted from frequency data. Examples come
# from the approved pool by the same gated rule as curated rows (usually
# []: the pool rarely contains these words — absent is absent).
DCS_VOCAB: list[tuple[str, str, str]] = [
    ("food", "जलं", "water"),
    ("food", "लवणं", "salt"),
    ("food", "तैलं", "oil"),
    ("food", "कटुः", "pungent"),
    ("health", "विषं", "poison"),
    ("health", "शरीरं", "body"),
    ("health", "हृदयं", "heart"),
    ("health", "पित्तं", "bile"),
    ("health", "त्रिफला", "triphala (three-fruit remedy)"),
    ("health", "हरीतकी", "haritaki (medicinal fruit)"),
    ("health", "कटुका", "katuka (bitter herb)"),
    ("family", "मात्रा", "mother"),
    ("school", "ज्ञानं", "knowledge"),
    ("school", "वचनं", "words"),
    ("school", "सूक्ष्मं", "subtle"),
    ("school", "संशयः", "doubt"),
    ("routine", "दिनं", "day"),
    ("routine", "मासि", "month"),
    ("routine", "कालं", "time"),
    ("festivals", "नमः", "obeisance"),
    ("festivals", "नमोनमः", "obeisance"),
    ("festivals", "देवा", "gods"),
    ("festivals", "दानं", "charity"),
    ("market", "काञ्चनं", "gold"),
    ("market", "ताम्रं", "copper"),
    ("market", "ऋणं", "debt"),
    ("market", "पलं", "pala (unit of weight)"),
]

DCS_PROVENANCE = "dcs"


def seed_vocab(db) -> dict[str, int]:
    """Idempotent vocab seed (P22-5): insert by (topic, devanagari), IAST from
    lipi, example sentences from APPROVED challenge rows containing the word.
    Returns {"words": N added, "examples_filled": N backfilled}."""
    from app.models import Challenge, VocabWord
    from app.services import iast as _iast

    approved = [
        (c.target_sanskrit or "", c.prompt_l1 or "")
        for c in db.query(Challenge)
        .filter(Challenge.review_status == "approved").all()
    ]
    added = 0
    backfilled = 0
    filled = 0
    for topic, rank, dev, gloss, gender, stem in SEED_VOCAB:
        existing = db.query(VocabWord).filter(
            VocabWord.topic == topic, VocabWord.devanagari == dev).first()
        if existing:
            # P23-4a: rows seeded before the registry carry free text —
            # repoint them at the key without touching taught content.
            if existing.provenance != PROVENANCE:
                existing.provenance = PROVENANCE
                backfilled += 1
            # A3: rows seeded when the pool was thin carry examples == [].
            # Refill from today's approved pool — same gated rule, no dupes.
            if not (existing.examples or []):
                examples = _pool_examples(dev, approved)
                if examples:
                    existing.examples = examples
                    filled += 1
            continue
        db.add(VocabWord(
            topic=topic, rank=rank, devanagari=dev,
            iast=_iast.to_iast(dev), gloss=gloss,
            gender=gender, stem=stem,
            examples=_pool_examples(dev, approved),
            provenance=PROVENANCE,
        ))
        added += 1
    # Flush: this session runs with autoflush off, so the DCS loop's
    # per-topic max-rank query must see the curated rows above — otherwise
    # every topic restarts at 0. Same discipline as _seed_challenges.
    db.flush()
    dcs_added = 0
    for topic, dev, gloss in DCS_VOCAB:
        existing = db.query(VocabWord).filter(
            VocabWord.topic == topic, VocabWord.devanagari == dev).first()
        if existing:
            if existing.provenance != DCS_PROVENANCE:
                existing.provenance = DCS_PROVENANCE
                backfilled += 1
            continue
        top_rank = db.query(VocabWord.rank).filter(
            VocabWord.topic == topic).order_by(
            VocabWord.rank.desc()).first()
        rank = (top_rank[0] + 1) if top_rank else 0
        db.add(VocabWord(
            topic=topic, rank=rank, devanagari=dev,
            iast=_iast.to_iast(dev), gloss=gloss,
            gender="", stem="",
            examples=_pool_examples(dev, approved),
            provenance=DCS_PROVENANCE,
        ))
        # Flush per add (autoflush off): same-topic later rows must see
        # this rank — the identical bug the script had (all-6 ranks).
        db.flush()
        dcs_added += 1
    return {"words": added + dcs_added, "dcs_words": dcs_added,
            "examples_filled": filled}
