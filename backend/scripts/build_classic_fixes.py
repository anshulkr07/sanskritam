"""Build classic fix payloads: katha-complete, mundaka-complete, mahabharata-bori.

Nothing here writes to the database. Run from backend/.
"""

import json
from pathlib import Path

from scripts.books import clean as C
from scripts.books import fetch as F
from scripts.books.build import dcs_to_devanagari, parse_dcs_conllu, _wiki_numbered_verses

OUT = Path("results/imports")


def build_katha() -> dict:
    verses = []
    for vi, fn in enumerate(F.dcs_list_files("Kaṭhopaniṣad"), 1):
        body = F.dcs_fetch_file("Kaṭhopaniṣad", fn)
        # Vallis 1-3 -> 1.1-1.3, 4-6 -> 2.1-2.3.
        if vi <= 3:
            a, v = 1, vi
        else:
            a, v = 2, vi - 3
        for n, iast_text in parse_dcs_conllu(body):
            dev = dcs_to_devanagari(iast_text).strip()
            if "॥" not in dev:
                dev += " ॥"
            dev = C.verse_text(dev)
            verses.append({"ref": f"Kaṭhopaniṣad {a}.{v}.{n}",
                           "devanagari": dev,
                           "translation_hi": "", "translation_en": ""})
    payload = {
        "licence": "Text: public domain (ancient); transcription: GRETIL sa_kathopaniSad (the 40 existing rows) and Digital Corpus of Sanskrit, Oliver Hellwig (github.com/OliverHellwig/sanskrit, dcs/data/conllu/files/Kaṭhopaniṣad), CC BY 4.0, accessed 2026-10-09. Changes: IAST converted to Devanagari with vidyut.lipi; half-verses joined.",
        "source": "Kṛṣṇa Yajurveda; GRETIL + DCS (CC BY 4.0)",
        "register": "vedic",
        "verses": verses,
    }
    (OUT / "katha-complete.payload.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8", newline="")
    print(f"[katha] {len(verses)} verses")
    return payload


def build_mundaka() -> dict:
    pg = F.wiki_fetch_page("मुण्डकोपनिषत्")
    verses = []
    for num_raw, body in _wiki_numbered_verses(pg.get("wikitext", ""), vedic=False):
        nums = C.number_parts(num_raw)
        if len(nums) < 3:
            continue
        number = ".".join(str(p) for p in nums[-3:])
        cleaned = C.verse_text(C.drop_leading_junk(body))
        verses.append({"ref": f"Mundaka Upaniṣad {number}",
                       "devanagari": cleaned,
                       "translation_hi": "", "translation_en": ""})
    # Order by M.K.N.
    verses.sort(key=lambda v: [int(p) for p in v["ref"].rsplit(" ", 1)[-1].split(".")])
    payload = {
        "licence": "Text: public domain (ancient); transcription: sa.wikisource.org, pages \"मुण्डकोपनिषत्\", revisions recorded in results/imports/books/mundaka.sources.json (CC BY-SA 4.0), accessed 2026-10-09. Changes: wiki markup removed, verses split and numbered as described in handover_reading_shelf.md.",
        "source": "Atharvaveda; sa.wikisource.org (CC BY-SA 4.0)",
        "register": "vedic",
        "verses": verses,
    }
    (OUT / "mundaka-complete.payload.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8", newline="")
    (OUT / "books" / "mundaka.sources.json").parent.mkdir(parents=True, exist_ok=True)
    (OUT / "books" / "mundaka.sources.json").write_text(
        json.dumps({"title": "मुण्डकोपनिषत्", "revid": pg.get("revid"),
                    "url": pg.get("url")}, ensure_ascii=False, indent=1),
        encoding="utf-8", newline="")
    print(f"[mundaka] {len(verses)} verses")
    return payload


def build_mahabharata() -> dict:
    verses = []
    for parva, adhyaya, fn in (
        (5, 33, "Mahābhārata-0696-MBh, 5, 33-5709.conllu"),
        (5, 34, "Mahābhārata-0697-MBh, 5, 34-5710.conllu"),
    ):
        body = F.dcs_fetch_file("Mahābhārata", fn)
        for n, iast_text in parse_dcs_conllu(body):
            dev = dcs_to_devanagari(iast_text).strip()
            if "॥" not in dev:
                dev += " ॥"
            dev = C.verse_text(dev)
            verses.append({"ref": f"Mahābhārata {parva}.{adhyaya}.{n}",
                           "devanagari": dev,
                           "translation_hi": "", "translation_en": ""})
    payload = {
        "licence": "Text: public domain (ancient); text: Digital Corpus of Sanskrit, Oliver Hellwig (github.com/OliverHellwig/sanskrit, dcs/data/conllu/files/Mahābhārata), CC BY 4.0, accessed 2026-10-09. Changes: IAST converted to Devanagari with vidyut.lipi; half-verses joined.",
        "source": "Vyāsa; DCS (CC BY 4.0)",
        "register": "classical",
        "verses": verses,
    }
    (OUT / "mahabharata-bori.payload.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8", newline="")
    print(f"[mahabharata] {len(verses)} verses")
    return payload


if __name__ == "__main__":
    build_katha()
    build_mundaka()
    build_mahabharata()
