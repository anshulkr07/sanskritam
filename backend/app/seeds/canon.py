"""P21-4 · The canon catalogue (owner's editorial question, decided 2026-09-08).

"Most depth": the Gītā is the full spine (all 700 verses, the one text worth
complete instrumentation), the Upaniṣads enter whole where short (Īśā: 18/18
imported), everything else enters as curated studied passages, and the
epics/Āyurveda sit as indexed catalogue entries until their selections are
curated. ALL reading is FREE — the reader is a reference posture and the
acquisition loop; gating any of it is a pricing decision (§6), not a default.

Licences: ancient texts are public domain; each row records its transcription
source's licence. "It was on the internet" is not a licence (§6).
"""

CANON_TEXTS = [
    {
        "slug": "gita",
        "title_en": "Bhagavad Gītā",
        "title_sa": "श्रीमद्भगवद्गीता",
        "source": "Mahābhārata, Bhīṣmaparvan 23–40",
        "licence": "Text: public domain (ancient); standard vulgate",
        "study_order": 1,
        "depth": "full",
        "tier": "free",
        "verses_planned": 700,
        "ref_prefixes": ["Bhagavad Gītā", "gita-"],
        "notes": "The spine: the one text worth complete word-by-word instrumentation.",
    },
    {
        "slug": "hito",
        "title_en": "Hitopadeśa (selections)",
        "title_sa": "हितोपदेशः",
        "source": "Nārāyaṇa; Mitralābha onwards",
        "licence": "Text: public domain (ancient)",
        "study_order": 2,
        "depth": "studied",
        "tier": "free",
        "verses_planned": 100,
        "ref_prefixes": ["Hitopade"],
        "notes": "Story verses: simple classical, best second text after the Gītā.",
    },
    {
        "slug": "niti",
        "title_en": "Nītiśataka (selections)",
        "title_sa": "नीतिशतकम्",
        "source": "Bhartṛhari",
        "licence": "Text: public domain (ancient)",
        "study_order": 3,
        "depth": "studied",
        "tier": "free",
        "verses_planned": 100,
        "ref_prefixes": ["Nīti", "Nītī"],
        "notes": "Epigrammatic subhāṣita: one verse is one lesson.",
    },
    {
        "slug": "isha",
        "title_en": "Īśopaniṣad (complete)",
        "title_sa": "ईशावास्योपनिषद्",
        "source": "Vājasaneyi Saṃhitā 40; sa.wikisource.org (CC BY-SA 3.0)",
        "licence": "Text: public domain (ancient); transcription: sa.wikisource.org (CC BY-SA 3.0), accessed 2026-09-08",
        "study_order": 4,
        "depth": "full",
        "tier": "free",
        "verses_planned": 18,
        "ref_prefixes": ["Īśopaniṣad", "Ishopani"],
        "notes": "18/18 imported 2026-09-08 (results/imports/isha.payload.json). The Vedic thin slice.",
    },
    {
        "slug": "katha",
        "title_en": "Kaṭhopaniṣad (selections)",
        "title_sa": "कठोपनिषद्",
        "source": "Kṛṣṇa Yajurveda",
        "licence": "Text: public domain (ancient)",
        "study_order": 5,
        "depth": "studied",
        "tier": "free",
        "verses_planned": 40,
        "ref_prefixes": ["Kaṭh", "Katha"],
        "notes": "Nachiketas dialogue: the most teachable Upaniṣad after Īśā.",
    },
    {
        "slug": "ramayana",
        "title_en": "Rāmāyaṇa (selections)",
        "title_sa": "रामायणम्",
        "source": "Vālmīki; GRETIL e-text (per-text licence at import)",
        "licence": "Text: public domain (ancient); transcription licence recorded at import",
        "study_order": 6,
        "depth": "studied",
        "tier": "free",
        "verses_planned": 60,
        "ref_prefixes": ["Rāmāyaṇa", "Ramayana"],
        "notes": "Bāla + Sundara selections first; anuṣṭubh metre names stay absent (§6).",
    },
    {
        "slug": "mahabharata",
        "title_en": "Mahābhārata (indexed)",
        "title_sa": "महाभारतम्",
        "source": "GRETIL e-text (per-text licence at import)",
        "licence": "Text: public domain (ancient); transcription licence recorded at import",
        "study_order": 7,
        "depth": "index",
        "tier": "free",
        "verses_planned": 200,
        "ref_prefixes": ["Mahābhārata", "Mahabharata"],
        "notes": "Catalogue only until selections are curated. NEVER bulk-import: ~10M chars is ₹30,000+ of TTS (§6 forbids TTS on import; rows are free, audio is not).",
    },
    {
        "slug": "pancha",
        "title_en": "Pañcatantra (selections)",
        "title_sa": "पञ्चतन्त्रम्",
        "source": "Viṣṇuśarman",
        "licence": "Text: public domain (ancient)",
        "study_order": 8,
        "depth": "studied",
        "tier": "free",
        "verses_planned": 30,
        "ref_prefixes": ["Panchatantra", "Pañcatantra"],
        "notes": "Paired with the laukika index: fable prose bridges story and verse.",
    },
    {
        "slug": "subhashita",
        "title_en": "Subhāṣita anthology (selections)",
        "title_sa": "सुभाषितम्",
        "source": "Subhāṣita Ratna Bhāṇḍāgāra + reader pool",
        "licence": "Text: public domain (ancient/anthologised)",
        "study_order": 9,
        "depth": "studied",
        "tier": "free",
        "verses_planned": 100,
        "ref_prefixes": ["Subhāṣita", "Subhashita", "Vairāgya", "Vairagya", "Śṛṅgāra", "Sringara"],
        "notes": "Single-verse readings: the daily-śloka well's natural extension.",
    },
    {
        "slug": "mundaka",
        "title_en": "Muṇḍaka Upaniṣad (selections)",
        "title_sa": "मुण्डकोपनिषद्",
        "source": "Atharvaveda",
        "licence": "Text: public domain (ancient)",
        "study_order": 10,
        "depth": "studied",
        "tier": "free",
        "verses_planned": 20,
        "ref_prefixes": ["Mundaka", "Muṇḍaka"],
        "notes": "Dvā suparṇā and friends: short, famous, teachable.",
    },
    {
        "slug": "ayurveda",
        "title_en": "Āyurvedic saṃhitās (indexed)",
        "title_sa": "आयुर्वेदसंहिताः",
        "source": "Caraka/Suśruta e-texts (per-text licence at import)",
        "licence": "Text: public domain (ancient); transcription licence recorded at import",
        "study_order": 11,
        "depth": "index",
        "tier": "free",
        "verses_planned": 30,
        "ref_prefixes": ["Caraka", "Suśruta", "Sushruta"],
        "notes": "Catalogue only: technical śāstra prose is post-v1 reading, not core.",
    },
    {
        "slug": "simhasana",
        "title_en": "Siṃhāsana Dvātriṃśikā (selections)",
        "title_sa": "सिंहासनद्वात्रिंशिका",
        "source": "Vetāla cycle",
        "licence": "Text: public domain (ancient)",
        "study_order": 12,
        "depth": "studied",
        "tier": "free",
        "verses_planned": 32,
        "ref_prefixes": ["Siṃhāsana", "Simhasana"],
        "notes": "Story-frame verses: graded reading tier-3 material (P22-6).",
    },
]


def seed_canon(db) -> dict:
    """Additive + idempotent (§2.13): insert missing slugs; backfill the
    P23-4a registry pointer (one registry, not two) without touching the
    per-text verbatim licence strings."""
    from app.models import CanonText

    rows = {r.slug: r for r in db.query(CanonText).all()}
    added = 0
    backfilled = 0
    for t in CANON_TEXTS:
        # The Īśā transcription came from sa.wikisource (CC BY-SA 3.0);
        # every other catalogue text is public-domain ancient text.
        key = "sa-wikisource" if t["slug"] == "isha" else "public-domain"
        row = rows.get(t["slug"])
        if row is None:
            db.add(CanonText(**t, source_key=key))
            added += 1
            continue
        if not row.source_key:
            row.source_key = key
            backfilled += 1
    db.commit()
    return {"added": added, "total": len(CANON_TEXTS), "backfilled": backfilled}
