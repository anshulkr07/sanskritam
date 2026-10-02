"""Sanskrit names for the phone's calendar (mobile/src/kala/sanskritNames.ts).

Rule of the house: never write Sanskrit from memory. So the only thing typed
by hand here is the list of STEMS, in SLP1, and each list says where its
stems were read. Everything a learner reads is made by Vidyut from those
stems:

* vidyut.lipi writes each stem in Devanagari and in IAST;
* vidyut.prakriya derives the first case (singular and plural) and the
  seventh case (singular);
* vidyut.kosha is asked whether it knows the word, and the answer is kept
  beside each name (``attested``) and printed, so a stem the dictionary does
  not know is visible instead of trusted.

    cd backend && ./.venv/Scripts/python.exe scripts/gen_kala_names.py

Prints a report and rewrites mobile/src/kala/sanskritNames.ts.

Where the stems were read (2026-10-02). "MW" is Monier-Williams 1899 and
"Vcp" the Vacaspatyam, both at the University of Cologne's Sanskrit lexicon
(sanskrit-lexicon.uni-koeln.de). The Surya Siddhanta is GRETIL's e-text of
the Bibliotheca Indica edition of 1854. The Bhagavata Purana is as given at
vedabase.io. Drik Panchang is drikpanchang.com.
"""

from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("SHABD_IGNORE_DOTENV", "1")

import vidyut.lipi as lipi  # noqa: E402

from app.services.prakriya import derive_forms  # noqa: E402
from app.services.sandhi import is_known_word  # noqa: E402

OUT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "mobile", "src", "kala", "sanskritNames.ts",
)

# (stem in SLP1, gender). Gender: Pum, Stri, Napumsaka.
MONTHS = [  # amanta order, Chaitra first, as panchang.MONTHS
    ("cEtra", "Pum"), ("vESAKa", "Pum"), ("jyEzWa", "Pum"), ("AzAQa", "Pum"),
    ("SrAvaRa", "Pum"), ("BAdrapada", "Pum"), ("ASvina", "Pum"), ("kArttika", "Pum"),
    ("mArgaSIrza", "Pum"), ("pOza", "Pum"), ("mAGa", "Pum"), ("PAlguna", "Pum"),
]
TITHIS = [  # 1 to 14; the fifteenth is the full or the new moon
    ("pratipadA", "Stri"), ("dvitIyA", "Stri"), ("tftIyA", "Stri"), ("caturTI", "Stri"),
    ("paYcamI", "Stri"), ("zazWI", "Stri"), ("saptamI", "Stri"), ("azwamI", "Stri"),
    ("navamI", "Stri"), ("daSamI", "Stri"), ("ekAdaSI", "Stri"), ("dvAdaSI", "Stri"),
    ("trayodaSI", "Stri"), ("caturdaSI", "Stri"),
]
FULL_NEW = [("pUrRimA", "Stri"), ("amAvAsyA", "Stri")]
PAKSHAS = [("Sukla", "Pum"), ("kfzRa", "Pum")]
WEEKDAYS = [  # Sunday first, as JavaScript counts
    ("ravivAsara", "Pum"), ("somavAsara", "Pum"), ("maNgalavAsara", "Pum"), ("buDavAsara", "Pum"),
    ("guruvAsara", "Pum"), ("SukravAsara", "Pum"), ("SanivAsara", "Pum"),
]
NAKSHATRAS = [  # as panchang.NAKSHATRAS
    ("aSvinI", "Stri"), ("BaraRI", "Stri"), ("kfttikA", "Stri"), ("rohiRI", "Stri"),
    ("mfgaSIrza", "Napumsaka"), ("ArdrA", "Stri"), ("punarvasu", "Pum"), ("puzya", "Pum"),
    ("ASlezA", "Stri"), ("maGA", "Stri"), ("pUrvaPalgunI", "Stri"), ("uttaraPalgunI", "Stri"),
    ("hasta", "Pum"), ("citrA", "Stri"), ("svAti", "Stri"), ("viSAKA", "Stri"),
    ("anurADA", "Stri"), ("jyezWA", "Stri"), ("mUla", "Napumsaka"), ("pUrvAzAQA", "Stri"),
    ("uttarAzAQA", "Stri"), ("SravaRa", "Pum"), ("DanizWA", "Stri"), ("SataBizA", "Stri"),
    ("pUrvaBAdrapadA", "Stri"), ("uttaraBAdrapadA", "Stri"), ("revatI", "Stri"),
]
SAMVATSARAS = [  # the sixty-year cycle, Prabhava first
    # MW gives the place in Jupiter's cycle under 53 of these names, and each
    # agrees with this order, bar two slips of the dictionary's own (virodhin
    # and durmukha are each printed one place off). Drik Panchang's list of
    # the sixty has the same order, and names Shaka 1948 (2026-27) Parabhava,
    # the fortieth. Almanacs differ a little in the form of some names
    # (Pramoda or Pramoduta, Shobhana or Shobhakrit); these are MW's.
    ("praBava", "Pum"), ("viBava", "Pum"), ("Sukla", "Pum"), ("pramoda", "Pum"),
    ("prajApati", "Pum"), ("aNgiras", "Pum"), ("SrImuKa", "Pum"), ("BAva", "Pum"),
    ("yuvan", "Pum"), ("DAtf", "Pum"), ("ISvara", "Pum"), ("bahuDAnya", "Pum"),
    ("pramATin", "Pum"), ("vikrama", "Pum"), ("vfza", "Pum"), ("citraBAnu", "Pum"),
    ("suBAnu", "Pum"), ("tAraRa", "Pum"), ("pArTiva", "Pum"), ("vyaya", "Pum"),
    ("sarvajit", "Pum"), ("sarvaDArin", "Pum"), ("viroDin", "Pum"), ("vikfta", "Pum"),
    ("Kara", "Pum"), ("nandana", "Pum"), ("vijaya", "Pum"), ("jaya", "Pum"),
    ("manmaTa", "Pum"), ("durmuKa", "Pum"), ("hemalamba", "Pum"), ("vilambin", "Pum"),
    ("vikArin", "Pum"), ("SArvarin", "Pum"), ("plava", "Pum"), ("SuBakft", "Pum"),
    ("SoBana", "Pum"), ("kroDin", "Pum"), ("viSvAvasu", "Pum"), ("parABava", "Pum"),
    ("plavaNga", "Pum"), ("kIlaka", "Pum"), ("sOmya", "Pum"), ("sADAraRa", "Pum"),
    ("viroDakft", "Pum"), ("pariDAvin", "Pum"), ("pramAdin", "Pum"), ("Ananda", "Pum"),
    ("rAkzasa", "Pum"), ("anala", "Pum"), ("piNgala", "Pum"), ("kAlayukta", "Pum"),
    ("sidDArTin", "Pum"), ("rOdra", "Pum"), ("durmati", "Pum"), ("dunduBi", "Pum"),
    ("ruDirodgArin", "Pum"), ("raktAkza", "Pum"), ("kroDana", "Pum"), ("kzaya", "Pum"),
]
YOGAS = [  # as panchang.YOGAS, Vishkambha first
    # MW names each of these as a yoga and numbers twenty of them (vishkambha
    # the first, indra the twenty-sixth, vaidhriti the star of the 27th), all
    # in this order. Drik Panchang prints the same list.
    ("vizkamBa", "Pum"), ("prIti", "Stri"), ("Ayuzmat", "Pum"), ("sOBAgya", "Napumsaka"),
    ("SoBana", "Pum"), ("atigaRqa", "Pum"), ("sukarman", "Pum"), ("Dfti", "Stri"),
    ("SUla", "Pum"), ("gaRqa", "Pum"), ("vfdDi", "Stri"), ("Druva", "Pum"),
    ("vyAGAta", "Pum"), ("harzaRa", "Pum"), ("vajra", "Pum"), ("sidDi", "Stri"),
    ("vyatIpAta", "Pum"), ("varIyas", "Pum"), ("pariGa", "Pum"), ("Siva", "Pum"),
    ("sidDa", "Pum"), ("sADya", "Pum"), ("SuBa", "Pum"), ("Sukla", "Pum"),
    ("brahman", "Pum"), ("indra", "Pum"), ("vEDfti", "Pum"),
]
KARANAS = [  # in the order of KARANA_ORDER below
    # Surya Siddhanta 2.67-68 names the four fixed ones (zakunir nAgaM ...
    # catuSpadam, kiMstughnam) and "the seven beginning with bava". Genders:
    # Vcp has bava, bAlava and kaulava as masculine, taitila, nAga and
    # catuSpada as neuter and viSTi as feminine; MW has gara as neuter and
    # vaNija as masculine; the Surya Siddhanta's own kiMstughnam is neuter.
    # The second is bAlava in Vcp and vAlava in MW. Note catuSpada, with a
    # short a: catuSpAda is another word.
    ("bava", "Pum"), ("bAlava", "Pum"), ("kOlava", "Pum"), ("tEtila", "Napumsaka"),
    ("gara", "Napumsaka"), ("vaRija", "Pum"), ("vizwi", "Stri"), ("Sakuni", "Pum"),
    ("catuzpada", "Napumsaka"), ("nAga", "Napumsaka"), ("kiMstuGna", "Napumsaka"),
]
# The names engine.ts and panchang.py give the karanas, in the same order.
KARANA_ORDER = ["Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti",
                "Shakuni", "Chatushpada", "Naga", "Kimstughna"]
RITUS = [  # two amanta months each, from Chaitra
    # MW gives each with its two months: vasanta Caitra and Vaishakha, grishma
    # Jyeshtha and Ashadha, hemanta Agrahayana and Pausha, shishira Magha and
    # Phalguna. Of sharad it says the months differ by region; Ashvina and
    # Karttika is the reckoning Drik Panchang follows. The rains are a plural
    # in Sanskrit ("pl., exceptionally sg."), so that name is given in the
    # plural: see PLURAL_NAMES.
    ("vasanta", "Pum"), ("grIzma", "Pum"), ("varzA", "Stri"), ("Sarad", "Stri"),
    ("hemanta", "Pum"), ("SiSira", "Pum"),
]
AYANAS = [("uttarAyaRa", "Napumsaka"), ("dakziRAyana", "Napumsaka")]  # northward, then southward
UNITS = [  # small to large
    # Surya Siddhanta 1.11-12: six pranas make a vinadi, sixty of those a
    # nadika, sixty nadikas a day and night. MW: vinadika "24 seconds", pala
    # "1/60 of a ghati", ghatika "24 minutes", nadika "half a muhurta",
    # muhurta "the 30th part of a day, 48 minutes", vipala "1/10 of a
    # breathing", prana "the time requisite for the pronunciation of 10 long
    # syllables = 1/6 vinadika".
    ("vipala", "Napumsaka"), ("prARa", "Pum"), ("pala", "Napumsaka"), ("GawikA", "Stri"),
    ("muhUrta", "Pum"), ("ahorAtra", "Pum"),
]
YUGAS = [  # first to last
    # MW has kritayuga, tretayuga and kaliyuga as headwords; dvaparayuga is
    # the same compound made with dvapara.
    ("kftayuga", "Napumsaka"), ("tretAyuga", "Napumsaka"), ("dvAparayuga", "Napumsaka"),
    ("kaliyuga", "Napumsaka"),
]
SPANS = [("mahAyuga", "Napumsaka"), ("manvantara", "Napumsaka"), ("kalpa", "Pum")]
RASHIS = [  # the Sun's twelve signs, Mesha first: each is in MW as the sign's name
    ("meza", "Pum"), ("vfzaBa", "Pum"), ("miTuna", "Napumsaka"), ("karkawa", "Pum"),
    ("siMha", "Pum"), ("kanyA", "Stri"), ("tulA", "Stri"), ("vfScika", "Pum"),
    ("Danus", "Napumsaka"), ("makara", "Pum"), ("kumBa", "Pum"), ("mIna", "Pum"),
]
WINDOWS = {  # keyed as engine.ts WindowKey
    # brahmamuhurta and abhijit ("the eighth muhurta of the day, about
    # midday") are in MW. The other three are almanac terms that MW does not
    # have: Drik Panchang's Hindi pages print them as rAhu kAla, yamagaNDa
    # and gulika kAla.
    "brahma": ("brAhmamuhUrta", "Pum"),
    "abhijit": ("aBijit", "Pum"),
    "yamaganda": ("yamagaRqa", "Pum"),
    "gulika": ("gulikakAla", "Pum"),
    "rahu": ("rAhukAla", "Pum"),
}
WORDS = {  # single words
    "adya": ("adya", None),          # today (indeclinable)
    "adhika": ("aDika", "Pum"),      # added, of a month
    "paksha": ("pakza", "Pum"),
    "tithi": ("tiTi", "Stri"),
    "masa": ("mAsa", "Pum"),
    "nakshatra": ("nakzatra", "Napumsaka"),
    "devanagari": ("devanAgarI", "Stri"),  # the script's own name, for the chooser
    "kala": ("kAla", "Pum"),               # time: the section's name
    "panchanga": ("paYcANga", "Napumsaka"),
    "vara": ("vAra", "Pum"),
    "yoga": ("yoga", "Pum"),
    "karana": ("karaRa", "Napumsaka"),
    "chandra": ("candra", "Pum"),
    "surya": ("sUrya", "Pum"),
    "samvatsara": ("saMvatsara", "Pum"),
    "ritu": ("ftu", "Pum"),
    "ayana": ("ayana", "Napumsaka"),
    "yuga": ("yuga", "Napumsaka"),
    "rashi": ("rASi", "Pum"),
    # MW: "passage of the sun from one sign into another". MW writes it with
    # an anusvara (saMkrAnti); the engine derives the class nasal either way.
    "sankranti": ("saNkrAnti", "Stri"),
    "suryodaya": ("sUryodaya", "Pum"),
    "suryasta": ("sUryAsta", "Pum"),
    # The present kalpa and manvantara. MW: "zveta-vArAha, a particular
    # kalpa, the first day in the month of Brahma (also zvetavArAha-kalpa)",
    # with a long a; and "vaivasvata, the 7th or present manvantara".
    # Bhagavata Purana 3.11.37 calls this kalpa vArAha, and 8.13.1 calls the
    # son of Vivasvat the seventh Manu, the present one.
    "shvetavarahakalpa": ("SvetavArAhakalpa", "Pum"),
    "vaivasvatamanvantara": ("vEvasvatamanvantara", "Napumsaka"),
}

# Stems the engine cannot inflect from the bare stem. Each override is itself
# checked: the kosha must know the form, or the engine must derive it another
# way (a suffix derivation), or this script stops.
NOM_FROM_KOSHA = {"Ayuzmat": "AyuzmAn"}
NOM_FROM_SUFFIX = {"varIyas": ("uru", "Iyasun")}
# Where the engine offers two seventh-case forms and the calendar's own phrase
# uses the second. The pick must be one of the engine's choices.
LOC_PICK = {"mAsa": "mAse"}
# Names that are plurals in Sanskrit: their two forms are the plural's.
PLURAL_NAMES = {"varzA"}
# The plural is kept only for these groups. The engine reads a long compound
# as one unbroken stem, so its plural of a compound can carry a retroflex n
# that the compound rule (8.4.11) leaves optional; nothing shows those.
PLURAL_GROUPS = ("WORDS", "UNITS")


def dev(slp: str) -> str:
    return lipi.transliterate(slp, lipi.Scheme.Slp1, lipi.Scheme.Devanagari)


def iast(slp: str) -> str:
    return lipi.transliterate(slp, lipi.Scheme.Slp1, lipi.Scheme.Iast)


def dev_to_iast(text: str) -> str:
    return lipi.transliterate(text, lipi.Scheme.Devanagari, lipi.Scheme.Iast)


def entry(slp: str, linga: str | None) -> dict:
    stem_dev = dev(slp)
    row = {"slp": slp, "dev": stem_dev, "iast": iast(slp)}
    if linga is None:
        row.update(nom=stem_dev, nomIast=iast(slp), loc="", locIast="", pl="",
                   attested=is_known_word(stem_dev), nomChoices=[stem_dev], locChoices=[])
        return row
    nom = derive_forms(pratipadika=stem_dev, linga=linga, vibhakti="Prathama", vacana="Eka")
    loc = derive_forms(pratipadika=stem_dev, linga=linga, vibhakti="Saptami", vacana="Eka")
    pl = derive_forms(pratipadika=stem_dev, linga=linga, vibhakti="Prathama", vacana="Bahu")
    if slp in NOM_FROM_KOSHA:
        form = dev(NOM_FROM_KOSHA[slp])
        if not is_known_word(form):
            raise SystemExit(f"{slp}: the kosha does not know {form}")
        nom = [form]
    if slp in NOM_FROM_SUFFIX:
        base, suffix = NOM_FROM_SUFFIX[slp]
        derived = derive_forms(pratipadika=dev(base), taddhita=suffix, linga=linga,
                               vibhakti="Prathama", vacana="Eka")
        if not derived:
            raise SystemExit(f"{slp}: the engine derives nothing from {base} + {suffix}")
        nom = derived
    if slp in PLURAL_NAMES:
        nom = pl
        loc = derive_forms(pratipadika=stem_dev, linga=linga, vibhakti="Saptami", vacana="Bahu")
    if slp in LOC_PICK:
        form = dev(LOC_PICK[slp])
        if form not in loc:
            raise SystemExit(f"{slp}: the engine does not offer {form}, only {loc}")
        loc = [form] + [x for x in loc if x != form]
    row.update(
        nom=nom[0] if nom else "", nomIast=dev_to_iast(nom[0]) if nom else "",
        loc=loc[0] if loc else "", locIast=dev_to_iast(loc[0]) if loc else "",
        pl=pl[0] if pl else "",
        attested=bool(nom) and (is_known_word(nom[0]) or is_known_word(stem_dev)),
        nomChoices=nom, locChoices=loc,
    )
    return row


KEEP = ("dev", "iast", "nom", "nomIast", "loc", "locIast", "pl", "attested")


def ts_rows(rows: list[dict]) -> str:
    return ",\n".join("  " + json.dumps({k: r[k] for k in KEEP}, ensure_ascii=False) for r in rows)


def ts_record(rows: dict[str, dict]) -> str:
    return ",\n".join(f"  {k}: " + json.dumps({f: r[f] for f in KEEP}, ensure_ascii=False) for k, r in rows.items())


def main() -> None:
    groups = {
        "MONTHS": [entry(*s) for s in MONTHS],
        "TITHIS": [entry(*s) for s in TITHIS],
        "FULL_NEW": [entry(*s) for s in FULL_NEW],
        "PAKSHAS": [entry(*s) for s in PAKSHAS],
        "WEEKDAYS": [entry(*s) for s in WEEKDAYS],
        "NAKSHATRAS": [entry(*s) for s in NAKSHATRAS],
        "SAMVATSARAS": [entry(*s) for s in SAMVATSARAS],
        "YOGAS": [entry(*s) for s in YOGAS],
        "KARANAS": [entry(*s) for s in KARANAS],
        "RITUS": [entry(*s) for s in RITUS],
        "AYANAS": [entry(*s) for s in AYANAS],
        "UNITS": [entry(*s) for s in UNITS],
        "YUGAS": [entry(*s) for s in YUGAS],
        "SPANS": [entry(*s) for s in SPANS],
        "RASHIS": [entry(*s) for s in RASHIS],
    }
    windows = {k: entry(*v) for k, v in WINDOWS.items()}
    words = {k: entry(*v) for k, v in WORDS.items()}
    for name, rows in list(groups.items()) + [("WINDOWS", list(windows.values()))]:
        if name not in PLURAL_GROUPS:
            for r in rows:
                r["pl"] = ""

    printable = list(groups.items()) + [("WINDOWS", list(windows.values())), ("WORDS", list(words.values()))]
    for name, rows in printable:
        print(f"\n{name}")
        for r in rows:
            flag = "known " if r["attested"] else "UNKNOWN"
            extra = ""
            if len(r["nomChoices"]) > 1 or len(r["locChoices"]) > 1:
                extra = f"   choices: {r['nomChoices']} / {r['locChoices']}"
            print(f"  {flag} {r['slp']:20s} {r['dev']:16s} nom {r['nom']:18s} loc {r['loc']:20s} pl {r['pl']}{extra}")

    header = (
        "// GENERATED by backend/scripts/gen_kala_names.py. Do not edit by hand.\n"
        "//\n"
        "// The house rule is never to write Sanskrit from memory. The stems are listed\n"
        "// in that script in SLP1; every string below was made from them by Vidyut:\n"
        "// vidyut.lipi for Devanagari and IAST, vidyut.prakriya for the first case\n"
        "// (`nom`, and `pl` for the plural) and the seventh case (`loc`). `attested`\n"
        "// says whether Vidyut's kosha knows the word.\n"
        "\n"
        "export interface SanskritName {\n"
        "  /** The stem, as it stands first in a compound. */\n"
        "  dev: string;\n"
        "  iast: string;\n"
        "  /** First case, singular. */\n"
        "  nom: string;\n"
        "  nomIast: string;\n"
        "  /** Seventh case, singular. Empty for an indeclinable. */\n"
        "  loc: string;\n"
        "  locIast: string;\n"
        "  /** First case, plural. Filled only in WORDS and UNITS. */\n"
        "  pl: string;\n"
        "  attested: boolean;\n"
        "}\n"
    )
    notes = {
        "MONTHS": "Amanta months, Chaitra first.",
        "TITHIS": "Tithis 1 to 14 of either half. The fifteenth is in FULL_NEW.",
        "FULL_NEW": "The full moon, then the new moon.",
        "PAKSHAS": "The bright half, then the dark half.",
        "WEEKDAYS": "Sunday first.",
        "NAKSHATRAS": "Ashwini first.",
        "SAMVATSARAS": "The sixty-year cycle, Prabhava first. Prabhava began in April 1987.",
        "YOGAS": "The 27 yogas, Vishkambha first.",
        "KARANAS": "The eleven karanas, in the order of KARANA_ORDER.",
        "RITUS": "The six seasons, Vasanta first: two amanta months each from Chaitra.",
        "AYANAS": "The Sun's northward half of the year, then its southward half.",
        "UNITS": "Units of time, small to large: vipala, prana, pala, ghatika, muhurta, the day and night.",
        "YUGAS": "The four ages, first to last.",
        "SPANS": "The four-age cycle, the manvantara and the kalpa.",
        "RASHIS": "The Sun's twelve signs, Mesha first.",
    }
    body = []
    for name, rows in groups.items():
        body.append(f"\n/** {notes[name]} */\nexport const {name}: SanskritName[] = [\n{ts_rows(rows)},\n];\n")
    body.append(
        "\n/** The names the engine gives the karanas, in the order of KARANAS. */\n"
        f"export const KARANA_ORDER = {json.dumps(KARANA_ORDER)};\n"
    )
    body.append(
        "\n/** The day's named stretches, keyed as engine.ts WindowKey. */\n"
        f"export const WINDOWS = {{\n{ts_record(windows)},\n}} satisfies Record<string, SanskritName>;\n"
    )
    body.append(f"\nexport const WORDS = {{\n{ts_record(words)},\n}} satisfies Record<string, SanskritName>;\n")
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(header + "".join(body))
    every = [r for rows in groups.values() for r in rows] + list(windows.values()) + list(words.values())
    unknown = [r["slp"] for r in every if not r["attested"]]
    print(f"\nwrote {OUT}: {len(every)} names, {len(unknown)} not in the kosha: {unknown}")


if __name__ == "__main__":
    main()
