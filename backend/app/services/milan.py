"""Gun milan: the ashtakoota match of two birth charts, by calculation.

Owner instruction 2026-10-05: "Let kundali go to any extent", then "build"
gun milan. The eight kootas are scored here from each person's Moon (sign,
nakshatra and degree), which services/kundli.py calculates; the model only
explains the result.

The eight kootas and their weights (1 to 8, 36 in all) and the reading of
the total (31-36 excellent, 21-30 very good, 17-20 middling, 0-16
inauspicious) are as Drik Panchang's Kundali Match tutorial gives them (read
2026-10-05). Its Vashya page gives the five Vashya groups used below, Sagittarius and Capricorn split at 15
degrees. Drik Panchang does not publish its point tables, so the owner's
benchmark was its calculator itself: on 2026-10-05, 127 invented pairs
of 1996 births (10:00 IST, New Delhi) were entered and every koota read
back. The Yoni table below is Drik's, all 105 cells seen (31 differ from the
table first used here); Gana and Vashya each had one or two cells changed to
Drik's; Varna, Tara, Graha Maitri and plain Bhakoot matched throughout.

Nadi and Bhakoot carry Drik's exceptions, read off its results rather than a
text: a shared Nadi scores 8, not 0, when both Moons are in the same sign, or
in the same nakshatra in different signs. When both Moons are in the same
nakshatra and the same sign, Drik scores Bhakoot and Nadi 0 unless the padas
differ and the nakshatra is one of EKA_NAKSHATRA_PASS (one pair per
nakshatra was tried, plus two pairs in a shared pada).
"""

from __future__ import annotations

from typing import Optional

from app.services import kundli, panchang

# ── what each Moon carries ────────────────────────────────────────────────

VARNAS = ["Shudra", "Vaishya", "Kshatriya", "Brahmin"]  # rank 0..3
#: Varna of each Moon sign, Mesha first.
SIGN_VARNA = [2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3]

VASHYA_GROUPS = ["Chatushpada", "Manava", "Jalachara", "Vanachara", "Keeta"]

#: Yoni animal of each nakshatra, Ashwini first.
YONI_ANIMALS = ["Horse", "Elephant", "Sheep", "Serpent", "Dog", "Cat", "Rat",
                "Cow", "Buffalo", "Tiger", "Deer", "Monkey", "Mongoose", "Lion"]
NAK_YONI = [0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9, 8, 9, 10, 10, 4, 11, 12, 11, 13, 0, 13, 7, 1]

GANAS = ["Deva", "Manushya", "Rakshasa"]
NAK_GANA = [0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0]

NADIS = ["Adi", "Madhya", "Antya"]
NAK_NADI = [0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2]

# ── point tables (boy's row, girl's column) ────────────────────────────────

#: Vashya: Chatushpada, Manava, Jalachara, Vanachara, Keeta. As Drik
#: Panchang scores them (Vanachara with Vanachara was not seen there).
VASHYA_POINTS = [
    [2.0, 1.0, 1.0, 0.0, 1.0],
    [1.0, 2.0, 0.5, 0.0, 1.0],
    [1.0, 0.5, 2.0, 1.0, 1.0],
    [0.0, 0.0, 1.0, 2.0, 0.0],
    [1.0, 1.0, 1.0, 0.0, 2.0],
]

#: Yoni, in the order of YONI_ANIMALS, as Drik Panchang scores it (every cell
#: seen there; boy and girl swapped gave the same points). 4 same animal, 0
#: the sworn enemies (horse-buffalo, elephant-lion, sheep-monkey,
#: serpent-mongoose, dog-deer, cat-rat, cow-tiger).
YONI_POINTS = [
    [4, 2, 3, 1, 2, 3, 3, 3, 0, 1, 3, 2, 2, 1],
    [2, 4, 2, 2, 2, 3, 2, 2, 3, 1, 2, 2, 2, 0],
    [3, 2, 4, 1, 2, 3, 2, 3, 3, 1, 3, 0, 3, 1],
    [1, 2, 1, 4, 1, 1, 1, 1, 2, 2, 1, 1, 0, 2],
    [2, 2, 2, 1, 4, 1, 1, 1, 2, 1, 0, 2, 1, 1],
    [3, 3, 3, 1, 1, 4, 0, 2, 2, 2, 2, 2, 2, 2],
    [3, 2, 2, 1, 1, 0, 4, 2, 2, 2, 2, 2, 2, 1],
    [3, 2, 3, 1, 1, 2, 2, 4, 3, 0, 2, 2, 2, 1],
    [0, 3, 3, 2, 2, 2, 2, 3, 4, 1, 3, 2, 2, 1],
    [1, 1, 1, 2, 1, 2, 2, 0, 1, 4, 1, 1, 2, 2],
    [3, 2, 3, 1, 0, 2, 2, 2, 3, 1, 4, 2, 2, 1],
    [2, 2, 0, 1, 2, 2, 2, 2, 2, 1, 2, 4, 2, 2],
    [2, 2, 3, 0, 1, 2, 2, 2, 2, 2, 2, 2, 4, 2],
    [1, 0, 1, 2, 1, 2, 1, 1, 1, 2, 1, 2, 2, 4],
]

#: Gana: Deva, Manushya, Rakshasa, as Drik Panchang scores it.
GANA_POINTS = [
    [6, 6, 0],
    [5, 6, 0],
    [1, 0, 6],
]

#: Nakshatras (Ashwini = 0) in which Drik Panchang lets a couple share the
#: birth nakshatra and sign without Bhakoot and Nadi falling to 0, provided
#: their padas differ. Read off its calculator one pair each, 2026-10-05; the
#: other twelve (Bharani to Punarvasu, Purva Phalguni to Chitra, Vishakha,
#: Dhanishta) scored 0 and 0, as did a shared pada in Magha and in Pushya.
EKA_NAKSHATRA_PASS = frozenset({0, 7, 8, 9, 14, 16, 17, 18, 19, 20, 21, 23, 24, 25, 26})

#: Natural friendships (naisargika maitri) of the seven grahas.
FRIENDS = {
    "Sun": {"Moon", "Mars", "Jupiter"},
    "Moon": {"Sun", "Mercury"},
    "Mars": {"Sun", "Moon", "Jupiter"},
    "Mercury": {"Sun", "Venus"},
    "Jupiter": {"Sun", "Moon", "Mars"},
    "Venus": {"Mercury", "Saturn"},
    "Saturn": {"Mercury", "Venus"},
}
ENEMIES = {
    "Sun": {"Venus", "Saturn"},
    "Moon": set(),
    "Mars": {"Mercury"},
    "Mercury": {"Moon"},
    "Jupiter": {"Mercury", "Venus"},
    "Venus": {"Sun", "Moon"},
    "Saturn": {"Sun", "Moon", "Mars"},
}

KOOTAS = [("varna", "Varna", 1), ("vashya", "Vashya", 2), ("tara", "Tara", 3),
          ("yoni", "Yoni", 4), ("graha_maitri", "Graha Maitri", 5), ("gana", "Gana", 6),
          ("bhakoot", "Bhakoot", 7), ("nadi", "Nadi", 8)]

TARA_NAMES = ["Janma", "Sampat", "Vipat", "Kshema", "Pratyari", "Sadhaka", "Vadha", "Mitra", "Ati-mitra"]


def vashya_group(moon_lon: float) -> int:
    sign = kundli.sign_of(moon_lon)
    deg = moon_lon % 30.0
    if sign in (2, 5, 6, 10) or (sign == 8 and deg < 15.0):
        return 1  # Manava
    if sign in (0, 1) or (sign == 8 and deg >= 15.0) or (sign == 9 and deg < 15.0):
        return 0  # Chatushpada
    if sign in (3, 11) or (sign == 9 and deg >= 15.0):
        return 2  # Jalachara
    if sign == 4:
        return 3  # Vanachara
    return 4  # Keeta (Vrishchika)


def relation(a: str, b: str) -> str:
    """How graha ``a`` regards graha ``b``: friend, neutral or enemy."""
    if b in FRIENDS[a]:
        return "friend"
    if b in ENEMIES[a]:
        return "enemy"
    return "neutral"


def maitri_points(boy_lord: str, girl_lord: str) -> float:
    if boy_lord == girl_lord:
        return 5.0
    pair = sorted((relation(boy_lord, girl_lord), relation(girl_lord, boy_lord)))
    return {
        ("friend", "friend"): 5.0,
        ("friend", "neutral"): 4.0,
        ("neutral", "neutral"): 3.0,
        ("enemy", "friend"): 1.0,
        ("enemy", "neutral"): 0.5,
        ("enemy", "enemy"): 0.0,
    }[tuple(pair)]


def tara_of(from_nak: int, to_nak: int) -> int:
    """Tara 1-9 of ``to_nak`` counted from ``from_nak`` (inclusive)."""
    count = (to_nak - from_nak) % 27 + 1
    return (count - 1) % 9 + 1


def tara_points(boy_nak: int, girl_nak: int) -> float:
    bad = {3, 5, 7}
    return 1.5 * (tara_of(girl_nak, boy_nak) not in bad) + 1.5 * (tara_of(boy_nak, girl_nak) not in bad)


def bhakoot_points(boy_sign: int, girl_sign: int) -> float:
    count = (girl_sign - boy_sign) % 12 + 1
    return 0.0 if count in (2, 12, 5, 9, 6, 8) else 7.0


def bhakoot_and_nadi(b_nak: int, g_nak: int, b_pada: int, g_pada: int,
                     b_sign: int, g_sign: int) -> tuple[float, float, str]:
    """Bhakoot and Nadi points with Drik Panchang's exceptions, and a note
    saying which exception (if any) decided them ("" when none did)."""
    bhakoot = bhakoot_points(b_sign, g_sign)
    if b_nak == g_nak and b_sign == g_sign:
        if b_pada != g_pada and b_nak in EKA_NAKSHATRA_PASS:
            return bhakoot, 8.0, "same nakshatra and sign in different padas, which this nakshatra allows"
        why = "same pada" if b_pada == g_pada else "this nakshatra does not allow it"
        return 0.0, 0.0, f"same nakshatra and sign ({why})"
    if NAK_NADI[b_nak] != NAK_NADI[g_nak]:
        return bhakoot, 8.0, ""
    if b_sign == g_sign:
        return bhakoot, 8.0, "same Nadi, cancelled because both Moons are in the same sign"
    if b_nak == g_nak:
        return bhakoot, 8.0, "same Nadi, cancelled because the same nakshatra falls in different signs"
    return bhakoot, 0.0, ""


def verdict(total: float) -> str:
    if total >= 31:
        return "excellent"
    if total >= 21:
        return "very good"
    if total >= 17:
        return "middling"
    return "inauspicious"


def moon_of(chart: dict) -> dict:
    return next(p for p in chart["planets"] if p["key"] == "moon")


def match(boy_chart: dict, girl_chart: dict) -> dict:
    """The eight kootas for two charts made by ``kundli.chart``."""
    bm, gm = moon_of(boy_chart), moon_of(girl_chart)
    b_sign, g_sign = bm["sign"], gm["sign"]
    b_nak, _ = kundli.nakshatra_of(bm["lon"])
    g_nak, _ = kundli.nakshatra_of(gm["lon"])
    b_vashya, g_vashya = vashya_group(bm["lon"]), vashya_group(gm["lon"])
    b_lord, g_lord = kundli.SIGN_LORD[b_sign], kundli.SIGN_LORD[g_sign]
    b_yoni, g_yoni = NAK_YONI[b_nak], NAK_YONI[g_nak]
    bhakoot, nadi, exception = bhakoot_and_nadi(b_nak, g_nak, bm["pada"], gm["pada"], b_sign, g_sign)

    points = {
        "varna": 1.0 if SIGN_VARNA[b_sign] >= SIGN_VARNA[g_sign] else 0.0,
        "vashya": VASHYA_POINTS[b_vashya][g_vashya],
        "tara": tara_points(b_nak, g_nak),
        "yoni": float(YONI_POINTS[b_yoni][g_yoni]),
        "graha_maitri": maitri_points(b_lord, g_lord),
        "gana": float(GANA_POINTS[NAK_GANA[b_nak]][NAK_GANA[g_nak]]),
        "bhakoot": bhakoot,
        "nadi": nadi,
    }
    shown = {
        "varna": (VARNAS[SIGN_VARNA[b_sign]], VARNAS[SIGN_VARNA[g_sign]]),
        "vashya": (VASHYA_GROUPS[b_vashya], VASHYA_GROUPS[g_vashya]),
        "tara": (TARA_NAMES[tara_of(g_nak, b_nak) - 1], TARA_NAMES[tara_of(b_nak, g_nak) - 1]),
        "yoni": (YONI_ANIMALS[b_yoni], YONI_ANIMALS[g_yoni]),
        "graha_maitri": (b_lord, g_lord),
        "gana": (GANAS[NAK_GANA[b_nak]], GANAS[NAK_GANA[g_nak]]),
        "bhakoot": (bm["sign_roman"], gm["sign_roman"]),
        "nadi": (NADIS[NAK_NADI[b_nak]], NADIS[NAK_NADI[g_nak]]),
    }
    kootas = [
        {"key": key, "name": name, "max": float(top), "points": points[key],
         "boy": shown[key][0], "girl": shown[key][1]}
        for key, name, top in KOOTAS
    ]
    total = sum(k["points"] for k in kootas)
    return {
        "boy": {"nakshatra": panchang.NAKSHATRAS[b_nak], "pada": bm["pada"], "rashi": bm["sign_roman"],
                "rashi_en": bm["sign_en"], "manglik_from": boy_chart["manglik"]["counts_from"]},
        "girl": {"nakshatra": panchang.NAKSHATRAS[g_nak], "pada": gm["pada"], "rashi": gm["sign_roman"],
                 "rashi_en": gm["sign_en"], "manglik_from": girl_chart["manglik"]["counts_from"]},
        "kootas": kootas,
        "total": total,
        "max": 36.0,
        "verdict": verdict(total),
        "nadi_dosha": points["nadi"] == 0.0,
        "bhakoot_dosha": points["bhakoot"] == 0.0,
        "exception": exception,
    }


def _pts(x: float) -> str:
    return f"{x:g}"


def facts_text(m: dict, asker_is: Optional[str] = None) -> str:
    """The match as plain lines for the model, under a heading it must obey."""
    who = {"boy": "the boy", "girl": "the girl"}
    if asker_is in who:
        other = "girl" if asker_is == "boy" else "boy"
        who[asker_is] = f"the asker ({asker_is})"
        who[other] = f"their partner ({other})"
    lines = [
        "MATCH (ashtakoota gun milan calculated by the app; use the points exactly as given, "
        "never change or recompute them):",
        f"- {who['boy'].capitalize()}: Moon in {m['boy']['rashi']} ({m['boy']['rashi_en']}), "
        f"{m['boy']['nakshatra']} pada {m['boy']['pada']}.",
        f"- {who['girl'].capitalize()}: Moon in {m['girl']['rashi']} ({m['girl']['rashi_en']}), "
        f"{m['girl']['nakshatra']} pada {m['girl']['pada']}.",
    ]
    for k in m["kootas"]:
        lines.append(f"- {k['name']}: {_pts(k['points'])} of {_pts(k['max'])} (boy {k['boy']}, girl {k['girl']}).")
    lines.append(f"- Total: {_pts(m['total'])} of 36, {m['verdict']} by the usual reading "
                 "(31-36 excellent, 21-30 very good, 17-20 middling, 0-16 inauspicious).")
    lines.append(f"- Nadi dosha: {'yes' if m['nadi_dosha'] else 'no'}. Bhakoot dosha: {'yes' if m['bhakoot_dosha'] else 'no'}."
                 + (f" Decided by an exception: {m['exception']}." if m.get("exception") else ""))
    for side in ("boy", "girl"):
        counts = m[side]["manglik_from"]
        lines.append(f"- Manglik by the common rule for {who[side]}: "
                     + (f"Mars counts from {', '.join(counts)}." if counts else "no."))
    return "\n".join(lines)
