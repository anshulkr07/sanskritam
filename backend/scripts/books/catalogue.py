"""One entry per book: section 4 as data (handover_reading_shelf.md).

Each entry drives scripts.books.build: where to fetch, how to split into
chapters and verses, the reference count (measuring stick), and the licence
fields. Nothing here writes to the database.
"""

from __future__ import annotations

# source_key: ambuda | dcs | sa-wikisource | gretil | mixed (atharvaveda)
BOOKS: dict[str, dict] = {
    # 4.1 Stotras and short works
    "vishnusahasranama": {
        "ref": "Viṣṇu Sahasranāma", "tier": "plus", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_sections",
        "pages": ["विष्णुसहस्रनामस्तोत्रम्‌"],
        "sections": ["मूलपाठः", "अथ ध्यानम्", "स्तोत्रम्", "उत्तरन्यासः",
                     "उपसंहारश्लोकाः", "पर्यायोपसंहारश्लोकाः"],
        "skip_sections": ["न्यास", "सम्बद्धानुबन्ध"],
        "reference_total": 170, "planned": 170, "vedic": False,
    },
    "lalita": {
        "ref": "Lalitā Sahasranāma", "tier": "plus", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_unnumbered",
        "pages": ["ललितासहस्रनामस्तोत्रम्"],
        "chapters": {"1": "पूर्वभाग", "2": "श्री ललितासहस्रनामस्तोत्र"},
        "reference_total": None, "planned": 0, "vedic": False,
    },
    "bhajagovindam": {
        "ref": "Bhaja Govindam", "tier": "plus", "register": "classical",
        "source_key": "ambuda", "kind": "ambuda_lg",
        "ambuda_slug": "mohamudgara",
        "reference_total": 31, "planned": 31, "vedic": False,
    },
    "saundarya": {
        "ref": "Saundarya Laharī", "tier": "plus", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_rendered",
        "pages": ["सौन्दर्यलहरी"],
        "reference_total": 100, "planned": 100, "vedic": False,
    },
    "aditya": {
        "ref": "Āditya Hṛdayam", "tier": "plus", "register": "classical",
        "source_key": "ambuda", "kind": "ambuda_auto",
        "ambuda_slug": "adityahrdayam",
        "reference_total": 31, "planned": 31, "vedic": False,
    },
    "tandava": {
        "ref": "Śiva Tāṇḍava Stotra", "tier": "plus", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_numbered",
        "pages": ["शिवताण्डवस्तोत्रम्"],
        "reference_total": 13, "planned": 13, "vedic": False,
    },
    "mahimna": {
        "ref": "Śiva Mahimna Stotra", "tier": "plus", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_rendered_newline_nums",
        "pages": ["शिवमहिम्नःस्तोत्रम्"],
        "reference_total": 31, "planned": 31, "vedic": False,
    },
    "ramaraksha": {
        "ref": "Rāmarakṣā Stotra", "tier": "plus", "register": "classical",
        "source_key": "ambuda", "kind": "ambuda_numbered",
        "ambuda_slug": "ramarakshastotram",
        "reference_total": 38, "planned": 38, "vedic": False,
    },
    "naradabhakti": {
        "ref": "Nārada Bhakti Sūtra", "tier": "plus", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_numbered",
        "pages": ["नारदभक्तिसूत्रम्"],
        "reference_total": 84, "planned": 84, "vedic": False,
    },
    # 4.2 Puranas
    "devimahatmya": {
        "ref": "Devī Māhātmya", "tier": "plus", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_mkp_81_93",
        "pages": ["मार्कण्डेयपुराणम्/अध्यायः ८१",
                  "मार्कण्डेयपुराणम्/अध्यायः ८१-९०",
                  "मार्कण्डेयपुराणम्/अध्यायः ९१-९३"],
        "reference_total": 587,
        "reference_by_chapter": {"1": 78, "2": 70, "3": 44, "4": 38, "5": 79,
                                 "6": 19, "7": 26, "8": 61, "9": 39, "10": 27,
                                 "11": 51, "12": 38, "13": 17},
        "planned": 587, "vedic": False,
    },
    "bhagavata": {
        "ref": "Bhāgavata Purāṇa", "tier": "plus", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_bhagavata",
        "prefix": "श्रीमद्भागवतपुराणम्/स्कन्धः",
        "reference_total": 14067, "planned": 14067, "vedic": False,
    },
    "shivapurana": {
        "ref": "Śiva Purāṇa", "tier": "plus", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_shiva",
        "prefix": "शिवपुराणम्/",
        "reference_total": None, "planned": 0, "vedic": False,
    },
    "garuda": {
        "ref": "Garuḍa Purāṇa", "tier": "free", "register": "classical",
        "source_key": "gretil", "kind": "gretil",
        "gretil_file": "sa_garuDapurANa",
        "reference_total": 11957, "planned": 11957, "vedic": False,
    },
    # 4.3 Vedas
    "rigveda": {
        "ref": "Ṛgveda", "tier": "plus", "register": "vedic",
        "source_key": "dcs", "kind": "dcs",
        "dcs_text": "Ṛgveda",
        "reference_total": 10552, "planned": 10552, "vedic": True,
    },
    "samaveda": {
        "ref": "Sāmaveda", "tier": "plus", "register": "vedic",
        "source_key": "sa-wikisource", "kind": "wiki_samaveda",
        "pages": ["सामवेदः/कौथुमीया/संहिता/सस्वरा पूर्णा"],
        "reference_total": 1875, "planned": 1875, "vedic": True,
    },
    "yajurveda": {
        "ref": "Śukla Yajurveda", "tier": "plus", "register": "vedic",
        "source_key": "sa-wikisource", "kind": "wiki_yajurveda",
        "pages": [f"शुक्लयजुर्वेदः/अध्यायः {i:02d}" for i in range(1, 41)],
        "reference_total": 1975, "planned": 1975, "vedic": True,
    },
    "atharvaveda": {
        "ref": "Atharvaveda", "tier": "plus", "register": "vedic",
        "source_key": "mixed", "kind": "atharvaveda",
        "dcs_text": "Atharvaveda (Śaunaka)",
        "wiki_pages": ["अथर्ववेदः/अथर्ववेद: काण्डं 19",
                       "अथर्ववेदः/अथर्ववेद: काण्डं 20"],
        "reference_total": 5650, "planned": 5650, "vedic": True,
    },
    # 4.4 Upanisads
    "kena": {
        "ref": "Kena Upaniṣad", "tier": "plus", "register": "vedic",
        "source_key": "sa-wikisource", "kind": "wiki_numbered",
        "pages": ["केनोपनिषत्"],
        "reference_total": 35, "planned": 35, "vedic": False,
    },
    "prashna": {
        "ref": "Praśna Upaniṣad", "tier": "plus", "register": "vedic",
        "source_key": "sa-wikisource", "kind": "wiki_prashna",
        "pages": ["प्रश्नोपनिषत्/प्रथमः प्रश्नः", "प्रश्नोपनिषत्/द्वितीयः प्रश्नः",
                  "प्रश्नोपनिषत्/तृतीयः प्रश्नः", "प्रश्नोपनिषत्/चतुर्थः प्रश्नः",
                  "प्रश्नोपनिषत्/पञ्चमः प्रश्नः", "प्रश्नोपनिषत्/षष्ठः प्रश्नः"],
        "reference_total": None, "planned": 0, "vedic": False,
    },
    "mandukya": {
        "ref": "Māṇḍūkya Upaniṣad", "tier": "plus", "register": "vedic",
        "source_key": "ambuda", "kind": "ambuda_p",
        "ambuda_slug": "mandukyopanishat",
        "reference_total": 12, "planned": 12, "vedic": False,
    },
    "taittiriya": {
        "ref": "Taittirīya Upaniṣad", "tier": "plus", "register": "vedic",
        "source_key": "dcs", "kind": "dcs",
        "dcs_text": "Taittirīyopaniṣad",
        "reference_total": None, "planned": 0, "vedic": False,
    },
    "aitareya": {
        "ref": "Aitareya Upaniṣad", "tier": "plus", "register": "vedic",
        "source_key": "dcs", "kind": "dcs",
        "dcs_text": "Aitareyopaniṣad",
        "reference_total": None, "planned": 0, "vedic": False,
    },
    "shvetashvatara": {
        "ref": "Śvetāśvatara Upaniṣad", "tier": "plus", "register": "vedic",
        "source_key": "dcs", "kind": "dcs",
        "dcs_text": "Śvetāśvataropaniṣad",
        "reference_total": 113, "planned": 113, "vedic": False,
    },
    "chandogya": {
        "ref": "Chāndogya Upaniṣad", "tier": "plus", "register": "vedic",
        "source_key": "dcs", "kind": "dcs",
        "dcs_text": "Chāndogyopaniṣad",
        "reference_total": None, "planned": 0, "vedic": False,
    },
    "brihadaranyaka": {
        "ref": "Bṛhadāraṇyaka Upaniṣad", "tier": "plus", "register": "vedic",
        "source_key": "dcs", "kind": "dcs",
        "dcs_text": "Bṛhadāraṇyakopaniṣad",
        "reference_total": None, "planned": 0, "vedic": False,
    },
    # 4.5 Poetry, drama, stories
    "meghaduta": {
        "ref": "Meghadūta", "tier": "plus", "register": "classical",
        "source_key": "dcs", "kind": "dcs",
        "dcs_text": "Meghadūta",
        "reference_total": 122, "planned": 122, "vedic": False,
    },
    "kumarasambhava": {
        "ref": "Kumārasambhava", "tier": "plus", "register": "classical",
        "source_key": "dcs", "kind": "dcs_cantos_1_8",
        "dcs_text": "Kumārasaṃbhava",
        "reference_total": 613, "planned": 613, "vedic": False,
    },
    "raghuvamsha": {
        "ref": "Raghuvaṃśa", "tier": "plus", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_raghu",
        "prefix": "रघुवंशम्/",
        "reference_total": 1567, "planned": 1567, "vedic": False,
    },
    "shakuntala": {
        "ref": "Abhijñānaśākuntala", "tier": "plus", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_shakuntala",
        "pages": ["अभिज्ञानशाकुन्तलम्/प्रथमोऽङ्कः", "अभिज्ञानशाकुन्तलम्/द्वितीयोऽङ्कः",
                  "अभिज्ञानशाकुन्तलम्/तृतीयोऽङ्कः", "अभिज्ञानशाकुन्तलम्/चतुर्थोऽङ्कः",
                  "अभिज्ञानशाकुन्तलम्/पञ्चमोऽङ्कः", "अभिज्ञानशाकुन्तलम्/षष्ठोऽङ्कः",
                  "अभिज्ञानशाकुन्तलम्/सप्तमोऽङ्कः"],
        "reference_total": 194, "planned": 194, "vedic": False,
    },
    "gitagovinda": {
        "ref": "Gītagovinda", "tier": "plus", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_gita_govinda",
        "prefix": "गीतगोविन्दम्/",
        "reference_total": 264, "planned": 264, "vedic": False,
    },
    "vetala": {
        "ref": "Vetāla Pañcaviṃśati", "tier": "plus", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_vetala",
        "pages": [f"वेतालपञ्चविंशति {i:02d}" for i in range(0, 26)],
        "reference_total": 2175, "planned": 2175, "vedic": False,
    },
    # 4.6 Yoga, Ayurveda, sastra, wisdom
    "yogasutra": {
        "ref": "Yoga Sūtra", "tier": "plus", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_yoga",
        "pages": ["योगसूत्रम्/पादः १", "योगसूत्रम्/पादः २",
                  "योगसूत्रम्/पादः ३", "योगसूत्रम्/पादः ४"],
        "reference_total": 195, "planned": 195, "vedic": False,
    },
    "hathayoga": {
        "ref": "Haṭhayogapradīpikā", "tier": "plus", "register": "classical",
        "source_key": "dcs", "kind": "dcs",
        "dcs_text": "Haṭhayogapradīpikā",
        "reference_total": 392, "planned": 392, "vedic": False,
    },
    "ashtavakra": {
        "ref": "Aṣṭāvakra Gītā", "tier": "plus", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_ashtavakra",
        "pages": ["अष्टावक्रगीता"],
        "reference_total": 298, "planned": 298, "vedic": False,
    },
    "sushruta": {
        "ref": "Suśruta Saṃhitā", "tier": "plus", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_sushruta",
        "pages": ["सुश्रुतसंहिता/सूत्रस्थानम्/अध्याय ०१-१५",
                  "सुश्रुतसंहिता/सूत्रस्थानम्/अध्याय १६-३०",
                  "सुश्रुतसंहिता/सूत्रस्थानम्/अध्याय ३१-४६",
                  "सुश्रुतसंहिता/निदानस्थानम्",
                  "सुश्रुतसंहिता/शारीरस्थानम्",
                  "सुश्रुतसंहिता/चिकित्सास्थानम्/अध्याय ०१-२०",
                  "सुश्रुतसंहिता/चिकित्सास्थानम्/अध्याय २१-४०",
                  "सुश्रुतसंहिता/कल्पस्थानम्",
                  "सुश्रुतसंहिता/उत्तरतन्त्रम्/अध्याय ०१-२०",
                  "सुश्रुतसंहिता/उत्तरतन्त्रम्/अध्याय २१-४०",
                  "सुश्रुतसंहिता/उत्तरतन्त्रम्/अध्याय ४१-६६"],
        "reference_total": None, "planned": 0, "vedic": False,
    },
    "arthashastra": {
        "ref": "Arthaśāstra", "tier": "free", "register": "classical",
        "source_key": "gretil", "kind": "gretil",
        "gretil_file": "sa_kauTilya-arthazAstra",
        "reference_total": None, "planned": 0, "vedic": False,
    },
    "lilavati": {
        "ref": "Līlāvatī", "tier": "free", "register": "classical",
        "source_key": "gretil", "kind": "gretil_lilavati",
        "gretil_file": "sa_bhAskara-lIlAvatI",
        "reference_total": 272, "planned": 272, "vedic": False,
    },
    "amarakosha": {
        "ref": "Amarakośa", "tier": "plus", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_amara",
        "pages": ["अमरकोशः/प्रथमकाण्डम्", "अमरकोशः/द्वितीयकाण्डम्",
                  "अमरकोशः/तृतीयकाण्डम्"],
        "reference_total": 3134, "planned": 3134, "vedic": False,
    },
    "chanakya": {
        "ref": "Chāṇakya Nīti", "tier": "plus", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_chanakya",
        "pages": ["चाणक्यनीतिदर्पणः"],
        "reference_total": 345, "planned": 345, "vedic": False,
    },
}

ORDER = [
    "vishnusahasranama", "lalita", "bhajagovindam", "saundarya", "aditya",
    "tandava", "mahimna", "ramaraksha", "naradabhakti",
    "devimahatmya", "bhagavata", "shivapurana", "garuda",
    "rigveda", "samaveda", "yajurveda", "atharvaveda",
    "kena", "prashna", "mandukya", "taittiriya", "aitareya",
    "shvetashvatara", "chandogya", "brihadaranyaka",
    "meghaduta", "kumarasambhava", "raghuvamsha", "shakuntala",
    "gitagovinda", "vetala",
    "yogasutra", "hathayoga", "ashtavakra", "sushruta", "arthashastra",
    "lilavati", "amarakosha", "chanakya",
]
