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
        "ref": "Viṣṇu Sahasranāma", "tier": "free", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_sections",
        "pages": ["विष्णुसहस्रनामस्तोत्रम्‌"],
        "sections": ["मूलपाठः", "अथ ध्यानम्", "स्तोत्रम्", "उत्तरन्यासः",
                     "उपसंहारश्लोकाः", "पर्यायोपसंहारश्लोकाः"],
        "skip_sections": ["न्यास", "सम्बद्धानुबन्ध"],
        "reference_total": 170, "planned": 170, "vedic": False,
    },
    "lalita": {
        "ref": "Lalitā Sahasranāma", "tier": "free", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_unnumbered",
        "pages": ["ललितासहस्रनामस्तोत्रम्"],
        "chapters": {"1": "पूर्वभाग", "2": "श्री ललितासहस्रनामस्तोत्र"},
        "reference_total": None, "planned": 0, "vedic": False,
    },
    "bhajagovindam": {
        "ref": "Bhaja Govindam", "tier": "free", "register": "classical",
        "source_key": "ambuda", "kind": "ambuda_lg",
        "ambuda_slug": "mohamudgara",
        "reference_total": 31, "planned": 31, "vedic": False,
    },
    "saundarya": {
        "ref": "Saundarya Laharī", "tier": "free", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_rendered",
        "pages": ["सौन्दर्यलहरी"],
        "reference_total": 100, "planned": 100, "vedic": False,
    },
    "aditya": {
        "ref": "Āditya Hṛdayam", "tier": "free", "register": "classical",
        "source_key": "ambuda", "kind": "ambuda_auto",
        "ambuda_slug": "adityahrdayam",
        "reference_total": 31, "planned": 31, "vedic": False,
    },
    "tandava": {
        "ref": "Śiva Tāṇḍava Stotra", "tier": "free", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_numbered",
        "pages": ["शिवताण्डवस्तोत्रम्"],
        # 2026-10-14: the page carries 16 verses; the old 13 came from three
        # verse-end markers that a hidden U+200D inside "॥N॥" had merged.
        "reference_total": 16, "planned": 16, "vedic": False,
    },
    "mahimna": {
        "ref": "Śiva Mahimna Stotra", "tier": "free", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_rendered_newline_nums",
        "pages": ["शिवमहिम्नःस्तोत्रम्"],
        # 2026-10-16: the print carries 40 verses — the 31 stotra verses plus
        # nine phala verses (labels run to ४०). The 2026-10-14 reconnaissance
        # read 37 because three marker defects on the page (verse 12 printed
        # as "११" twice, 15 and 23 unnumbered, 25 with a stray dot) merged
        # three verse pairs; repaired in build.py's mahimna branch.
        "reference_total": 40, "planned": 40, "vedic": False,
    },
    "ramaraksha": {
        "ref": "Rāmarakṣā Stotra", "tier": "free", "register": "classical",
        "source_key": "ambuda", "kind": "ambuda_numbered",
        "ambuda_slug": "ramarakshastotram",
        "reference_total": 38, "planned": 38, "vedic": False,
    },
    "naradabhakti": {
        "ref": "Nārada Bhakti Sūtra", "tier": "free", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_numbered",
        "pages": ["नारदभक्तिसूत्रम्"],
        "reference_total": 84, "planned": 84, "vedic": False,
    },
    # 4.2 Puranas
    "devimahatmya": {
        "ref": "Devī Māhātmya", "tier": "free", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_mkp_81_93",
        # 2026-10-14: the full zero-padded Markandeya series exists; the
        # builder remaps MP chapters 81-93 to DM 1-13 and keeps only those
        # (the ०९१-०९५ page carries two extra chapters). The old page set
        # (८१ / ८१-९० / ९१-९३) was missing DM 6-10 and duplicated 81-85.
        # The ०९१-०९५ page only stubs DM 11-13 (4/3/5 of 51/38/17 verses);
        # the old-series ९१-९३ page carries them in full (106 verses).
        "pages": ["मार्कण्डेयपुराणम्/अध्यायः ०८१-०८५",
                  "मार्कण्डेयपुराणम्/अध्यायः ०८६-०९०",
                  "मार्कण्डेयपुराणम्/अध्यायः ९१-९३"],
        "reference_total": 587,
        "reference_by_chapter": {"1": 78, "2": 70, "3": 44, "4": 38, "5": 79,
                                 "6": 19, "7": 26, "8": 61, "9": 39, "10": 27,
                                 "11": 51, "12": 38, "13": 17},
        "planned": 587, "vedic": False,
    },
    "bhagavata": {
        "ref": "Bhāgavata Purāṇa", "tier": "free", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_bhagavata",
        "prefix": "श्रीमद्भागवतपुराणम्/स्कन्धः",
        # Chapter comes from the page title (skandha.adhyaya); verse numbers
        # restart every adhyaya. Each adhyaya's first verse ends "। १ ॥" with
        # a single opening danda — handled by clean._DANDA (2026-10-14).
        "chapter_from_title": ["स्कन्धः", "अध्यायः"],
        # Several verse ends print as "letter + number + danda" (opening
        # danda lost) - inline_num_marker normalises them for the splitter.
        "inline_num_marker": True,
        # The wikisource transcription is incomplete (~10.4k of the 14,067
        # canonical shlokas; skandhas 10-11 are the short ones) - the import
        # takes everything the source has. No count gate.
        "reference_total": None, "planned": 14067, "vedic": False,
    },
    "shivapurana": {
        "ref": "Śiva Purāṇa", "tier": "free", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_shiva",
        "prefix": "शिवपुराणम्/",
        # One page per samhita-adhyaya; verse numbers restart everywhere,
        # so the reading chapter is the page order and the verse number its
        # ordinal within the page.
        "chapter_per_page": True,
        "renumber_per_chapter": True,
        # Verse ends "…पतिः १ ॥" (opening danda lost) - see
        # inline_num_marker in build.py.
        "inline_num_marker": True,
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
        "ref": "Ṛgveda", "tier": "free", "register": "vedic",
        "source_key": "dcs", "kind": "dcs",
        "dcs_text": "Ṛgveda",
        # 2026-10-14: DCS's current export groups sentences ("sent_id N_M"),
        # not ṛcs — 10,552 canonical ṛcs come out as ~11.7k finer rows.
        # Verse numbers are ordinals within each sūkta file, not canonical.
        # No count gate (nothing is lost; the unit is just finer).
        "reference_total": None, "planned": 10552, "vedic": True,
    },
    "samaveda": {
        "ref": "Sāmaveda", "tier": "free", "register": "vedic",
        "source_key": "sa-wikisource", "kind": "wiki_samaveda",
        "pages": ["सामवेदः/कौथुमीया/संहिता/सस्वरा पूर्णा"],
        "reference_total": 1875, "planned": 1875, "vedic": True,
    },
    "yajurveda": {
        "ref": "Śukla Yajurveda", "tier": "free", "register": "vedic",
        "source_key": "sa-wikisource", "kind": "wiki_yajurveda",
        # Page titles use Devanagari digits ("अध्यायः ०१"); the ASCII-digit
        # titles return empty parses and were silently cached empty on
        # 2026-10-14 (empties deleted, refetched).
        "pages": ["शुक्लयजुर्वेदः/अध्यायः " + "".join("०१२३४५६७८९"[int(d)] for d in f"{i:02d}")
                  for i in range(1, 41)],
        # 1975 is the traditional kandika count; the page split yields 2015
        # rows (a few headers/section breaks read as kandikas) - no gate.
        "reference_total": None, "planned": 1975, "vedic": True,
    },
    "atharvaveda": {
        "ref": "Atharvaveda", "tier": "free", "register": "vedic",
        "source_key": "mixed", "kind": "atharvaveda",
        "dcs_text": "Atharvaveda (Śaunaka)",
        "wiki_pages": ["अथर्ववेदः/अथर्ववेद: काण्डं 19",
                       "अथर्ववेदः/अथर्ववेद: काण्डं 20"],
        "reference_total": 5650, "planned": 5650, "vedic": True,
    },
    # 4.4 Upanisads
    "kena": {
        "ref": "Kena Upaniṣad", "tier": "free", "register": "vedic",
        "source_key": "sa-wikisource", "kind": "wiki_numbered",
        "pages": ["केनोपनिषत्"],
        "reference_total": 35, "planned": 35, "vedic": False,
    },
    "prashna": {
        "ref": "Praśna Upaniṣad", "tier": "free", "register": "vedic",
        "source_key": "sa-wikisource", "kind": "wiki_prashna",
        "pages": ["प्रश्नोपनिषत्/प्रथमः प्रश्नः", "प्रश्नोपनिषत्/द्वितीयः प्रश्नः",
                  "प्रश्नोपनिषत्/तृतीयः प्रश्नः", "प्रश्नोपनिषत्/चतुर्थः प्रश्नः",
                  "प्रश्नोपनिषत्/पञ्चमः प्रश्नः", "प्रश्नोपनिषत्/षष्ठः प्रश्नः"],
        "reference_total": None, "planned": 0, "vedic": False,
    },
    "mandukya": {
        "ref": "Māṇḍūkya Upaniṣad", "tier": "free", "register": "vedic",
        "source_key": "ambuda", "kind": "ambuda_p",
        "ambuda_slug": "mandukyopanishat",
        "reference_total": 12, "planned": 12, "vedic": False,
    },
    "taittiriya": {
        "ref": "Taittirīya Upaniṣad", "tier": "free", "register": "vedic",
        "source_key": "dcs", "kind": "dcs",
        "dcs_text": "Taittirīyopaniṣad",
        "reference_total": None, "planned": 0, "vedic": False,
    },
    "aitareya": {
        "ref": "Aitareya Upaniṣad", "tier": "free", "register": "vedic",
        "source_key": "dcs", "kind": "dcs",
        "dcs_text": "Aitareyopaniṣad",
        "reference_total": None, "planned": 0, "vedic": False,
    },
    "shvetashvatara": {
        "ref": "Śvetāśvatara Upaniṣad", "tier": "free", "register": "vedic",
        "source_key": "dcs", "kind": "dcs",
        "dcs_text": "Śvetāśvataropaniṣad",
        # 113 is the mantra count; DCS groups sentences, so long mantras
        # split across rows. No count gate.
        "reference_total": None, "planned": 113, "vedic": False,
    },
    "chandogya": {
        "ref": "Chāndogya Upaniṣad", "tier": "free", "register": "vedic",
        "source_key": "dcs", "kind": "dcs",
        "dcs_text": "Chāndogyopaniṣad",
        "reference_total": None, "planned": 0, "vedic": False,
    },
    "brihadaranyaka": {
        "ref": "Bṛhadāraṇyaka Upaniṣad", "tier": "free", "register": "vedic",
        "source_key": "dcs", "kind": "dcs",
        "dcs_text": "Bṛhadāraṇyakopaniṣad",
        "reference_total": None, "planned": 0, "vedic": False,
    },
    # 4.5 Poetry, drama, stories
    "meghaduta": {
        "ref": "Meghadūta", "tier": "free", "register": "classical",
        "source_key": "dcs", "kind": "dcs",
        "dcs_text": "Meghadūta",
        "reference_total": 122, "planned": 122, "vedic": False,
    },
    "kumarasambhava": {
        "ref": "Kumārasambhava", "tier": "free", "register": "classical",
        "source_key": "dcs", "kind": "dcs_cantos_1_8",
        "dcs_text": "Kumārasaṃbhava",
        "reference_total": 613, "planned": 613, "vedic": False,
    },
    "raghuvamsha": {
        "ref": "Raghuvaṃśa", "tier": "free", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_raghu",
        "prefix": "रघुवंशम्/",
        # 1567 is the canonical sarga total; the page also carries editorial
        # variant rows beyond that, all kept (variants with the same verse
        # number are suffixed .2/.3). No count gate.
        "reference_total": None, "planned": 1567, "vedic": False,
    },
    "shakuntala": {
        "ref": "Abhijñānaśākuntala", "tier": "free", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_shakuntala",
        # Verse numbers restart every act: chapter = page order.
        "chapter_per_page": True,
        "pages": ["अभिज्ञानशाकुन्तलम्/प्रथमोऽङ्कः", "अभिज्ञानशाकुन्तलम्/द्वितीयोऽङ्कः",
                  "अभिज्ञानशाकुन्तलम्/तृतीयोऽङ्कः", "अभिज्ञानशाकुन्तलम्/चतुर्थोऽङ्कः",
                  "अभिज्ञानशाकुन्तलम्/पञ्चमोऽङ्कः", "अभिज्ञानशाकुन्तलम्/षष्ठोऽङ्कः",
                  "अभिज्ञानशाकुन्तलम्/सप्तमोऽङ्कः"],
        "reference_total": 194, "planned": 194, "vedic": False,
    },
    "gitagovinda": {
        "ref": "Gītagovinda", "tier": "free", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_gita_govinda",
        # One page per sarga, verse numbers restart per sarga: chapter = page
        # order among the sarga pages (the bare title page is skipped).
        "chapter_per_page": True,
        # Song numbers restart at every song inside a sarga — store the
        # reading ordinal within the sarga.
        "renumber_per_chapter": True,
        "prefix": "गीतगोविन्दम्/",
        # 2026-10-14: 272 units as printed (the traditional 264 counts the
        # verses without their dhruva refrains the page prints separately).
        "reference_total": 272, "planned": 272, "vedic": False,
    },
    "vetala": {
        "ref": "Vetāla Pañcaviṃśati", "tier": "free", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_vetala",
        # One page per tale, verse numbers restart per tale: chapter = page
        # order. The prose between verses travels inside the verse chunks
        # (the source interleaves them).
        "chapter_per_page": True,
        # Prose and verses interleave; the source's verse numbers restart
        # inside a tale — store the reading ordinal within the tale.
        "renumber_per_chapter": True,
        "pages": [f"वेतालपञ्चविंशति {i:02d}" for i in range(0, 26)],
        # 2026-10-16: 2195 rows after the re-split repair
        # (_repair_vetala_page). The old 2610 was the pre-repair chunk
        # count: page 00's कथामुख poem (17 pipe ends + 3 danda ends)
        # reached the build as 3 chunks (now +17 rows), and pages 01, 16
        # and 18 print their taranga twice — joined sandhi and a
        # split-sandhi duplicate (138, 207 and 87 verses) — which are now
        # dropped; page 04's two editorial comparison notes are dropped
        # too, which fixed its failing row. 2195 = GRETIL's 2175 (tales
        # plus the कथामुख prose ०.८.२१-५८) + the 20-verse कथामुख poem.
        "reference_total": 2195, "planned": 2195, "vedic": False,
    },
    # 4.6 Yoga, Ayurveda, sastra, wisdom
    "yogasutra": {
        "ref": "Yoga Sūtra", "tier": "free", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_yoga",
        "pages": ["योगसूत्रम्/पादः १", "योगसूत्रम्/पादः २",
                  "योगसूत्रम्/पादः ३", "योगसूत्रम्/पादः ४"],
        "reference_total": 195, "planned": 195, "vedic": False,
    },
    "hathayoga": {
        "ref": "Haṭhayogapradīpikā", "tier": "free", "register": "classical",
        "source_key": "dcs", "kind": "dcs",
        "dcs_text": "Haṭhayogapradīpikā",
        "reference_total": 392, "planned": 392, "vedic": False,
    },
    "ashtavakra": {
        "ref": "Aṣṭāvakra Gītā", "tier": "free", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_ashtavakra",
        "pages": ["अष्टावक्रगीता"],
        "reference_total": 298, "planned": 298, "vedic": False,
    },
    "sushruta": {
        "ref": "Suśruta Saṃhitā", "tier": "free", "register": "classical",
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
        "ref": "Amarakośa", "tier": "free", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_amara",
        "pages": ["अमरकोशः/प्रथमकाण्डम्", "अमरकोशः/द्वितीयकाण्डम्",
                  "अमरकोशः/तृतीयकाण्डम्"],
        "reference_total": 3134, "planned": 3134, "vedic": False,
    },
    "chanakya": {
        "ref": "Chāṇakya Nīti", "tier": "free", "register": "classical",
        "source_key": "sa-wikisource", "kind": "wiki_chanakya",
        "pages": ["चाणक्यनीतिदर्पणः"],
        # 2026-10-14: verified against the page — 343 numbered verses over 17
        # chapters (numbering restarts per chapter; 15 chapter-colophon
        # numbers and 1 garbled ॥५१३१॥ marker on the page are not verses and
        # the unnumbered प्रकीर्णक tail is dropped). The old 345 was an
        # edition estimate.
        "reference_total": 343, "planned": 343, "vedic": False,
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
