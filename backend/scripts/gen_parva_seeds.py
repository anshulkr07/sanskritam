"""Generate Parva seed drafts from opened sources (handover 8.4).

Every line a user can read comes from a named source the author opened (see
SOURCES below, each with its URL and read date). Nothing is worked out by
the app in these files: computed times are shown at runtime by the phone,
never as seed lines, so no seed item carries basis calc. Sanskrit shown in
texts[] comes only from the app's own shlokas rows (none qualifies under
8.3's kinds yet, so texts[] stays empty; the Gita and Subhashita wisdom below
appears as one-sentence retellings with refs, never quoted).

Customs without an opened source are dropped, not guessed: these pages carry
no food colours, no regional notes, and no unsourced lamp customs (lamp
lines on Kartika pages come from Skanda 2.12 itself). The health line rests
on the Bhima inability precedent (Padma Purana 6.351) on the two Ekadashi
pages it belongs to; Prabodhini and Kartika carry no health line because no
text states an exemption there (their empty who_should_eat fails check_draft
on purpose, holding them at draft). The modern group list still needs a
pastoral or clinical source (hand-back).

Writes backend/app/seeds/parva/<slug>[.<variant>].<lang>.json (status draft)
plus passages.json (ref -> {text_name, url, read_on}) for the automatic
checks. Run: cd backend && ./.venv/Scripts/python.exe scripts/gen_parva_seeds.py
"""

from __future__ import annotations

import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "app" / "seeds" / "parva"

WS_API = "https://sa.wikisource.org/w/api.php?action=parse&pageid={}&prop=wikitext&format=json"

SOURCES = {
    "Padma 6.36": ("Padma Purana, Uttarakhanda", WS_API.format(25044)),
    "Padma 6.351": ("Padma Purana, Uttarakhanda", WS_API.format(44623)),
    "Skanda 2.12": ("Skanda Purana, Kartika-mahatmya", WS_API.format(23011)),
    "Bhagavata 10.25": ("Bhagavata Purana", "https://vedabase.io/en/library/sb/10/25/"),
    "Bhagavata 10.59": ("Bhagavata Purana", "https://vedabase.io/en/library/sb/10/59/"),
    "Bhagavata 8.8": ("Bhagavata Purana", "https://vedabase.io/en/library/sb/8/8/"),
    "Garga 2.2": ("Garga Samhita, Vrindavana-khanda", WS_API.format(25073)),
    "Gita 9.27": ("Bhagavad Gita", "shlokas row e37433d3bb7d4bad"),
    "Gita 4.7": ("Bhagavad Gita", "shlokas row 744d5388ec4b4cf7"),
    "Gita 4.8": ("Bhagavad Gita", "shlokas row 7e54ccbca104496d"),
    "Pancatantra 1.217": ("Pancatantra", "shlokas row 11ce8c5d2aa743f3"),
    "Bhavishya 4.14": ("Bhavishya Purana, Uttara-parva",
                        WS_API.format(32093)),
    "Devi Kavacha": ("Devi Kavacha",
                     WS_API.format(10855)),
    "Skanda Reva 134": ("Skanda Purana, Avantikhanda, Reva Khanda",
                         WS_API.format(162838)),
}
# NOTE (content audit 2026-10-11): Narada Purana 113 was cited by URL but the
# page does not exist on sa.wikisource (404), GRETIL's Sansknet links are
# dead, and the Gita Press Hindi volume is NC-ND. With no openable source the
# Karwa Chauth page is deleted (rule stays shipped, rows untappable).


def T(text: str, ref: str) -> dict:
    name, url = SOURCES[ref]
    return {"text": text, "basis": "text", "text_name": name, "ref": ref, "source_url": url}


def C(text: str) -> dict:
    return {"text": text, "basis": "calc"}


def page(slug: str, variant: str, lang: str, summary: str, why: list, gather: list,
         steps: list, vrat: dict, dont: list) -> dict:
    vrat_items = [it for key in ("eat", "avoid", "break", "who_should_eat")
                  for it in (vrat or {}).get(key, [])]
    return {
        "slug": slug, "variant": variant, "lang": lang, "status": "draft",
        "body": {
            "summary": summary, "why": why,
            "do": {"gather": gather, "steps": steps},
            "vrat": vrat, "dont": dont, "texts": [], "regions": [],
            "series_days": [],
        },
        "sources": [
            {"text_name": SOURCES[d["ref"]][0], "ref": d["ref"],
             "url": SOURCES[d["ref"]][1], "read_on": "2026-10-11"}
            # One entry per ref, vrat refs included: the old per-line list
            # duplicated rows and omitted every vrat-cited text.
            for d in {e["ref"]: e for e in (why + gather + steps + dont + vrat_items)
                      if e.get("basis") == "text"}.values()
        ],
    }


def bhima_who(lang: str) -> dict:
    if lang == "hi":
        return T("भीम ने व्यास से कहा कि वे हर पक्ष में व्रत नहीं रख सकते, तब व्यास ने उन्हें सभी का फल देने वाला एक निर्जला व्रत दिया।",
                 "Padma 6.351")
    return T("Bhima told Vyasa he could not fast every fortnight, so Vyasa gave him the single Nirjala fast with the fruit of all.",
             "Padma 6.351")


def vrat_full(lang: str) -> dict:
    if lang == "hi":
        return {
        "eat": [T("दूध, कंदमूल, फल, शाक और सात्त्विक अन्न लें।", "Skanda 2.12")],
        "avoid": [T("मदिरा और मांस से बचें।", "Skanda 2.12"),
                  T("व्रत के दिन अन्न न लें।", "Padma 6.351")],
        "break": [T("द्वादशी की सुबह ब्राह्मणों के साथ व्रत खोलें।", "Padma 6.351")],
        "who_should_eat": [bhima_who(lang)],
    }
    return {
        "eat": [T("Take milk, roots, fruit, shaka, and simple ascetic grains.", "Skanda 2.12")],
        "avoid": [T("Keep away from wine and meat.", "Skanda 2.12"),
                  T("Take no grain on the fast day.", "Padma 6.351")],
        "break": [T("Break the fast on Dwadashi morning with brahmanas.", "Padma 6.351")],
        "who_should_eat": [bhima_who(lang)],
    }


def build() -> dict[str, dict]:
    out: dict[str, dict] = {}

    # ── Ekadashi, the observance ──
    out["ekadashi.en"] = page(
        "ekadashi", "", "en", "The eleventh-day fast, kept twice in every lunar month.",
        [T("Yudhishthira asks Krishna for the name and story of the dark-half eleventh day of Chaitra.", "Padma 6.36"),
         T("Krishna answers through Lomasha, who tells King Mandhata the Papmochani story.", "Padma 6.36"),
         T("Vyasa teaches this vow as the easy means with great fruit.", "Padma 6.351"),
         T("Keep this vow lifelong for heaven.", "Padma 6.351")],
        [T("Keep flowers, incense, and a lamp ready.", "Skanda 2.12")],
        [T("Bathe in the morning and resolve to keep the fast.", "Skanda 2.12"),
         T("Worship Vishnu with flowers and incense.", "Skanda 2.12"),
         T("Light lamps in the evening.", "Skanda 2.12"),
         T("Eat on Dwadashi morning after worship.", "Padma 6.351")],
        vrat_full("en"),
        [T("Keep away from misconduct on the fast day.", "Skanda 2.12")],
    )
    out["ekadashi.hi"] = page(
        "ekadashi", "", "hi", "हर चंद्र मास में दो बार रखा जाने वाला एकादशी व्रत।",
        [T("युधिष्ठिर कृष्ण से चैत्र कृष्ण एकादशी का नाम और कथा पूछते हैं।", "Padma 6.36"),
         T("कृष्ण लोमश के माध्यम से राजा मांधाता को पापमोचनी कथा सुनाते हैं।", "Padma 6.36"),
         T("व्यास इस व्रत को सहज उपाय और महान फल वाला बताते हैं।", "Padma 6.351"),
         T("स्वर्ग के लिए यह व्रत जीवन भर रखें।", "Padma 6.351")],
        [T("फूल, धूप और दीप तैयार रखें।", "Skanda 2.12")],
        [T("सुबह स्नान कर व्रत का संकल्प लें।", "Skanda 2.12"),
         T("फूल और धूप से विष्णु की पूजा करें।", "Skanda 2.12"),
         T("शाम को दीप जलाएं।", "Skanda 2.12"),
         T("पूजा के बाद द्वादशी की सुबह भोजन करें।", "Padma 6.351")],
        vrat_full("hi"),
        [T("व्रत के दिन दुराचार से दूर रहें।", "Skanda 2.12")],
    )

    # ── Nirjala ──
    out["ekadashi.nirjala.en"] = page(
        "ekadashi", "nirjala", "en", "The waterless eleventh day of bright Jyeshtha, worth all twenty-four.",
        [T("Yudhishthira asks Krishna about the bright-half eleventh day of Jyeshtha.", "Padma 6.351"),
         T("Bhima says hunger never leaves him, so he cannot fast every fortnight.", "Padma 6.351"),
         T("Vyasa gives Bhima the single waterless Nirjala fast with the fruit of all.", "Padma 6.351"),
         T("Bhima keeps it and gains what the year's fasts give.", "Padma 6.351")],
        [T("Keep water pots ready for brahmanas.", "Padma 6.351")],
        [T("Bathe in the morning and resolve to keep the fast.", "Padma 6.351"),
         T("Keep the fast without food and without water.", "Padma 6.351"),
         T("Give water pots to brahmanas.", "Padma 6.351"),
         T("Break the fast on Dwadashi morning.", "Padma 6.351")],
        {"eat": [T("Nothing is eaten until the parana.", "Padma 6.351")],
         "avoid": [T("Take no grain on the fast day.", "Padma 6.351")],
         "break": [T("Break the fast on Dwadashi morning with brahmanas.", "Padma 6.351")],
         "who_should_eat": [bhima_who("en")]},
        [T("Do not break the fast before Dwadashi morning.", "Padma 6.351")],
    )
    out["ekadashi.nirjala.hi"] = page(
        "ekadashi", "nirjala", "hi", "ज्येष्ठ शुक्ल की निर्जल एकादशी, जो चौबीसों के बराबर है।",
        [T("युधिष्ठिर कृष्ण से ज्येष्ठ शुक्ल एकादशी के बारे में पूछते हैं।", "Padma 6.351"),
         T("भीम कहते हैं कि भूख उन्हें कभी नहीं छोड़ती, इसलिए वे हर पक्ष में व्रत नहीं रख सकते।", "Padma 6.351"),
         T("व्यास भीम को सभी का फल देने वाला एक निर्जला व्रत देते हैं।", "Padma 6.351"),
         T("भीम इसे रखते हैं और वर्ष के व्रतों का फल पाते हैं।", "Padma 6.351")],
        [T("ब्राह्मणों के लिए जल के घड़े तैयार रखें।", "Padma 6.351")],
        [T("सुबह स्नान कर व्रत का संकल्प लें।", "Padma 6.351"),
         T("बिना अन्न और बिना जल के व्रत रखें।", "Padma 6.351"),
         T("ब्राह्मणों को जल के घड़े दें।", "Padma 6.351"),
         T("द्वादशी की सुबह व्रत खोलें।", "Padma 6.351")],
        {"eat": [T("पारण तक कुछ न खाएं।", "Padma 6.351")],
         "avoid": [T("व्रत के दिन अन्न न लें।", "Padma 6.351")],
         "break": [T("ब्राह्मणों के साथ द्वादशी की सुबह व्रत खोलें।", "Padma 6.351")],
         "who_should_eat": [bhima_who("hi")]},
        [T("द्वादशी की सुबह से पहले व्रत न खोलें।", "Padma 6.351")],
    )

    # ── Prabodhini ──
    out["ekadashi.prabodhini.en"] = page(
        "ekadashi", "prabodhini", "en", "The Kartika bright-half eleventh day that opens the Bhishma vow.",
        [T("The Valakhilyas ask about the Kartika bright-half eleventh day.", "Skanda 2.12"),
         T("On Ekadashi one takes up a five-day vow ending on full moon.", "Skanda 2.12"),
         T("Bhishma keeps it with bathing, tarpana, gifts, and lamps.", "Skanda 2.12"),
         T("The vow ends on Purnima with worship, feeding brahmanas, and gifts.", "Skanda 2.12")],
        [T("Keep flowers, incense, a lamp, and water for tarpana ready.", "Skanda 2.12")],
        [T("Bathe in the morning and take up the five-day vow.", "Skanda 2.12"),
         T("Offer water tarpana to Bhishma.", "Skanda 2.12"),
         T("Worship Vishnu with lamps day and night.", "Skanda 2.12"),
         T("Feed brahmanas and give gifts on full moon.", "Skanda 2.12")],
        # No who_should_eat: no text states an exemption for this vow, and
        # the Bhima line belongs to Nirjala. The empty list fails check_draft
        # on purpose, so the page stays draft until a source is found.
        {"eat": [T("Take milk, roots, fruit, shaka, and simple ascetic grains.", "Skanda 2.12")],
         "avoid": [T("Keep away from wine and meat.", "Skanda 2.12"),
                   T("Take no grain on the fast day.", "Padma 6.351")],
         "break": [T("Break the fast on Dwadashi morning with brahmanas.", "Padma 6.351")],
         "who_should_eat": []},
        [T("Keep away from misconduct on the fast day.", "Skanda 2.12")],
    )
    out["ekadashi.prabodhini.hi"] = page(
        "ekadashi", "prabodhini", "hi", "कार्तिक शुक्ल एकादशी, जिससे भीष्म व्रत शुरू होता है।",
        [T("वालखिल्य कार्तिक शुक्ल एकादशी के बारे में पूछते हैं।", "Skanda 2.12"),
         T("एकादशी को पूर्णिमा तक चलने वाला पांच दिन का व्रत लिया जाता है।", "Skanda 2.12"),
         T("भीष्म इसे स्नान, तर्पण, दान और दीपों के साथ रखते हैं।", "Skanda 2.12"),
         T("पूर्णिमा को पूजा, ब्राह्मण भोजन और दान के साथ व्रत पूरा होता है।", "Skanda 2.12")],
        [T("फूल, धूप, दीप और तर्पण के लिए जल तैयार रखें।", "Skanda 2.12")],
        [T("सुबह स्नान कर पांच दिन का व्रत लें।", "Skanda 2.12"),
         T("भीष्म को जल तर्पण दें।", "Skanda 2.12"),
         T("दिन रात दीपों से विष्णु की पूजा करें।", "Skanda 2.12"),
         T("पूर्णिमा को ब्राह्मणों को खिलाएं और दान दें।", "Skanda 2.12")],
        {"eat": [T("दूध, कंदमूल, फल, शाक और सात्त्विक अन्न लें।", "Skanda 2.12")],
         "avoid": [T("मदिरा और मांस से बचें।", "Skanda 2.12"),
                   T("व्रत के दिन अन्न न लें।", "Padma 6.351")],
         "break": [T("द्वादशी की सुबह ब्राह्मणों के साथ व्रत खोलें।", "Padma 6.351")],
         "who_should_eat": []},
        [T("व्रत के दिन दुराचार से दूर रहें।", "Skanda 2.12")],
    )

    # ── Dhanteras ──
    out["diwali_days.dhanteras.en"] = page(
        "diwali_days", "dhanteras", "en", "The first Diwali day, when Dhanvantari rose with nectar.",
        [T("Gods and demons churn the milk ocean for nectar.", "Bhagavata 8.8"),
         T("Dhanvantari rises carrying the jug of nectar.", "Bhagavata 8.8"),
         T("The demons snatch the jug, and Vishnu takes Mohini form.", "Bhagavata 8.8"),
         T("Offer the day's acts, food, and gifts to Vishnu.", "Gita 9.27")],
        [],
        [T("Remember Dhanvantari's rise with nectar.", "Bhagavata 8.8"),
         T("Offer the day's acts, food, and gifts to Vishnu.", "Gita 9.27")],
        {},
        [],
    )
    out["diwali_days.dhanteras.hi"] = page(
        "diwali_days", "dhanteras", "hi", "दीपावली का पहला दिन, जब धन्वन्तरि अमृत लेकर निकले।",
        [T("देव और असुर अमृत के लिए क्षीरसागर का मंथन करते हैं।", "Bhagavata 8.8"),
         T("धन्वन्तरि अमृत का घड़ा लेकर निकलते हैं।", "Bhagavata 8.8"),
         T("असुर घड़ा छीन लेते हैं, और विष्णु मोहिनी रूप धरते हैं।", "Bhagavata 8.8"),
         T("दिन के कर्म, भोजन और दान विष्णु को अर्पित करें।", "Gita 9.27")],
        [],
        [T("अमृत सहित धन्वन्तरि के उदय का स्मरण करें।", "Bhagavata 8.8"),
         T("दिन के कर्म, भोजन और दान विष्णु को अर्पित करें।", "Gita 9.27")],
        {},
        [],
    )

    # ── Naraka Chaturdashi ──
    out["diwali_days.naraka_chaturdashi.en"] = page(
        "diwali_days", "naraka_chaturdashi", "en", "The day Krishna killed Narakasura and freed the captives.",
        [T("Indra complains to Krishna about Narakasura's thefts.", "Bhagavata 10.59"),
         T("Krishna and Satyabhama ride Garuda to Pragjyotisha.", "Bhagavata 10.59"),
         T("Krishna slays Mura, his sons, and then Naraka with the disc.", "Bhagavata 10.59"),
         T("Sixteen thousand captives are freed and Aditi's earrings returned.", "Bhagavata 10.59"),
         T("When dharma declines, Vishnu projects himself forth.", "Gita 4.7")],
        [],
        [T("Remember Krishna's killing of Narakasura.", "Bhagavata 10.59"),
         T("Remember Vishnu's descent when adharma rises.", "Gita 4.7")],
        {},
        [],
    )
    out["diwali_days.naraka_chaturdashi.hi"] = page(
        "diwali_days", "naraka_chaturdashi", "hi", "जिस दिन कृष्ण ने नरकासुर को मारा और बंदियों को छुड़ाया।",
        [T("इंद्र कृष्ण से नरकासुर की चोरियों की शिकायत करते हैं।", "Bhagavata 10.59"),
         T("कृष्ण सत्यभामा के साथ गरुड़ पर प्राग्ज्योतिष जाते हैं।", "Bhagavata 10.59"),
         T("कृष्ण मुर, उसके पुत्रों और फिर नरकासुर को चक्र से मारते हैं।", "Bhagavata 10.59"),
         T("सोलह हजार बंदी छूटते हैं और अदिति के कुंडल लौटते हैं।", "Bhagavata 10.59"),
         T("जब धर्म घटता है, विष्णु स्वयं को प्रकट करते हैं।", "Gita 4.7")],
        [],
        [T("नरकासुर पर कृष्ण की विजय का स्मरण करें।", "Bhagavata 10.59"),
         T("अधर्म बढ़ने पर विष्णु के अवतरण का स्मरण करें।", "Gita 4.7")],
        {},
        [],
    )

    # ── Lakshmi Puja ──
    out["diwali_days.lakshmi_puja.en"] = page(
        "diwali_days", "lakshmi_puja", "en", "The new-moon night when Lakshmi rose and chose Vishnu.",
        [T("Lakshmi rises from the churned ocean, shining like lightning.", "Bhagavata 8.8"),
         T("Gods, demons, and men all desire her, the source of opulence.", "Bhagavata 8.8"),
         T("She garlands Vishnu and takes her place at his chest.", "Bhagavata 8.8"),
         T("Unceasing effort brings Lakshmi, not fate.", "Pancatantra 1.217")],
        [T("Keep water, flowers, and ornaments ready for bathing.", "Bhagavata 8.8")],
        [T("Welcome Lakshmi as the gods welcomed her with bathing and song.", "Bhagavata 8.8"),
         T("Work with effort instead of waiting on fate.", "Pancatantra 1.217")],
        {},
        [],
    )
    out["diwali_days.lakshmi_puja.hi"] = page(
        "diwali_days", "lakshmi_puja", "hi", "अमावस्या की रात, जब लक्ष्मी निकलीं और विष्णु को चुना।",
        [T("लक्ष्मी मथे हुए सागर से बिजली सी चमकती निकलती हैं।", "Bhagavata 8.8"),
         T("देव, असुर और मनुष्य सभी ऐश्वर्य की स्रोत उन्हें चाहते हैं।", "Bhagavata 8.8"),
         T("वे विष्णु को माला पहनाती हैं और उनके वक्ष पर स्थान लेती हैं।", "Bhagavata 8.8"),
         T("भाग्य नहीं, निरंतर उद्यम लक्ष्मी लाता है।", "Pancatantra 1.217")],
        [T("स्नान के लिए जल, फूल और आभूषण तैयार रखें।", "Bhagavata 8.8")],
        [T("लक्ष्मी का वैसा ही स्वागत करें जैसा देवों ने स्नान और गीत से किया।", "Bhagavata 8.8"),
         T("भाग्य की प्रतीक्षा नहीं, उद्यम से काम करें।", "Pancatantra 1.217")],
        {},
        [],
    )

    # ── Govardhan Puja ──
    out["diwali_days.govardhan_puja.en"] = page(
        "diwali_days", "govardhan_puja", "en", "The day Krishna lifted Govardhan and its glory was sung.",
        [T("Pulastya brings Govardhan to Vrindavana, where Sananda's curse shrinks him.", "Garga 2.2"),
         T("Govardhan's clear story takes away great sins.", "Garga 2.2"),
         T("Indra floods Vraja in anger, and Krishna lifts the hill one-handed for seven days.", "Bhagavata 10.25"),
         T("Indra withdraws, Krishna sets the hill back, and the gods rain flowers.", "Bhagavata 10.25"),
         T("Vishnu protects the good and destroys the wicked, age after age.", "Gita 4.8")],
        [],
        [T("Remember Krishna holding the hill over Vraja for seven days.", "Bhagavata 10.25"),
         T("Bow to Govardhan and walk around it.", "Garga 2.2"),
         T("Offer worship for the protection of the good.", "Gita 4.8")],
        {},
        [],
    )
    out["diwali_days.govardhan_puja.hi"] = page(
        "diwali_days", "govardhan_puja", "hi", "जिस दिन कृष्ण ने गोवर्धन उठाया और उनकी महिमा गाई गई।",
        [T("पुलस्त्य गोवर्धन को वृंदावन लाते हैं, जहां सनंदन के शाप से वे घटते हैं।", "Garga 2.2"),
         T("गोवर्धन की निर्मल कथा बड़े पापों को हरती है।", "Garga 2.2"),
         T("इंद्र क्रोध में व्रज डुबोते हैं, और कृष्ण पहाड़ को एक हाथ से सात दिन उठाते हैं।", "Bhagavata 10.25"),
         T("इंद्र हटते हैं, कृष्ण पहाड़ रख देते हैं, और देव फूल बरसाते हैं।", "Bhagavata 10.25"),
         T("विष्णु साधुओं की रक्षा और दुष्टों का नाश करते हैं, युग युग में।", "Gita 4.8")],
        [],
        [T("सात दिन व्रज पर पहाड़ उठाए कृष्ण का स्मरण करें।", "Bhagavata 10.25"),
         T("गोवर्धन को नमस्कार कर परिक्रमा करें।", "Garga 2.2"),
         T("साधुओं की रक्षा के लिए पूजा अर्पित करें।", "Gita 4.8")],
        {},
        [],
    )

    # ── Kartika Purnima ──
    out["kartika_purnima.en"] = page(
        "kartika_purnima", "", "en", "Full moon ending the five-day Bhishma vow.",
        [T("On Ekadashi one takes up a five-day vow ending on full moon.", "Skanda 2.12"),
         T("Bhishma keeps it with bathing, tarpana, gifts, and lamps.", "Skanda 2.12"),
         T("Lamps are offered day and night.", "Skanda 2.12"),
         T("On Purnima day worship, feed brahmanas, and break the fast.", "Skanda 2.12")],
        [T("Keep lamps, water, flowers, and gifts ready.", "Skanda 2.12")],
        [T("Bathe in the morning.", "Skanda 2.12"),
         T("Offer lamps in the evening.", "Skanda 2.12"),
         T("Feed brahmanas and give gifts.", "Skanda 2.12"),
         T("Eat the closing meal with brahmanas on Purnima day.", "Skanda 2.12")],
        # No Bhima line and no grain rule here: both belong to the Ekadashi
        # fast, and no text states an exemption for this vow. The empty
        # who_should_eat fails check_draft on purpose (stays draft).
        {"eat": [T("Take milk, roots, fruit, shaka, and simple ascetic grains.", "Skanda 2.12")],
         "avoid": [T("Keep away from wine and meat.", "Skanda 2.12")],
         "break": [T("The vow closes with the Purnima meal shared with brahmanas.", "Skanda 2.12")],
         "who_should_eat": []},
        [T("Keep away from misconduct on the fast day.", "Skanda 2.12")],
    )
    out["kartika_purnima.hi"] = page(
        "kartika_purnima", "", "hi", "पांच दिन के भीष्म व्रत को पूरा करने वाली पूर्णिमा।",
        [T("एकादशी को पूर्णिमा तक चलने वाला पांच दिन का व्रत लिया जाता है।", "Skanda 2.12"),
         T("भीष्म इसे स्नान, तर्पण, दान और दीपों के साथ रखते हैं।", "Skanda 2.12"),
         T("दिन रात दीप अर्पित किए जाते हैं।", "Skanda 2.12"),
         T("पूर्णिमा के दिन पूजा करें, ब्राह्मणों को खिलाएं और व्रत खोलें।", "Skanda 2.12")],
        [T("दीप, जल, फूल और दान तैयार रखें।", "Skanda 2.12")],
        [T("सुबह स्नान करें।", "Skanda 2.12"),
         T("शाम को दीप अर्पित करें।", "Skanda 2.12"),
         T("ब्राह्मणों को खिलाएं और दान दें।", "Skanda 2.12"),
         T("पूर्णिमा के दिन ब्राह्मणों के साथ समापन भोजन करें।", "Skanda 2.12")],
        {"eat": [T("दूध, कंदमूल, फल, शाक और सात्त्विक अन्न लें।", "Skanda 2.12")],
         "avoid": [T("मदिरा और मांस से बचें।", "Skanda 2.12")],
         "break": [T("ब्राह्मणों के साथ पूर्णिमा भोजन से व्रत पूरा होता है।", "Skanda 2.12")],
         "who_should_eat": []},
        [T("व्रत के दिन दुराचार से दूर रहें।", "Skanda 2.12")],
    )
    # ── Bhai Dooj (Yama Dvitiya) ──
    out["diwali_days.bhai_dooj.en"] = page(
        "diwali_days", "bhai_dooj", "en", "The second day of bright Kartika, when Yama ate at Yamuna's house.",
        [T("On Kartika Shukla Dvitiya Yama was fed by Yamuna in his own house.", "Bhavishya 4.14"),
         T("The day is therefore called Yama Dvitiya in the world.", "Bhavishya 4.14"),
         T("On this day the wise do not eat at home.", "Bhavishya 4.14"),
         T("One eats from a sister's hand out of love, which nourishes and strengthens.", "Bhavishya 4.14"),
         T("Sisters are honoured with gifts of gold, ornaments, clothes, worship, and food.", "Bhavishya 4.14")],
        [T("Keep gifts of clothes and ornaments ready for sisters.", "Bhavishya 4.14")],
        [T("Eat the meal from your sister's hand.", "Bhavishya 4.14"),
         T("Honour every sister with gifts, worship, and food.", "Bhavishya 4.14")],
        {},
        [T("Do not eat at your own home on this day.", "Bhavishya 4.14")],
    )
    out["diwali_days.bhai_dooj.hi"] = page(
        "diwali_days", "bhai_dooj", "hi", "कार्तिक शुक्ल द्वितीया, जिस दिन यम ने यमुना के घर भोजन किया।",
        [T("कार्तिक शुक्ल द्वितीया को यम ने अपने घर में यमुना के हाथ से भोजन किया।", "Bhavishya 4.14"),
         T("इसलिए संसार में यह दिन यम द्वितीया कहलाता है।", "Bhavishya 4.14"),
         T("इस दिन ज्ञानी अपने घर में भोजन नहीं करते।", "Bhavishya 4.14"),
         T("स्नेह से बहन के हाथ से भोजन करें, जो पुष्टि और बल देता है।", "Bhavishya 4.14"),
         T("बहनों का स्वर्ण, आभूषण, वस्त्र, पूजा और भोजन से सम्मान करें।", "Bhavishya 4.14")],
        [T("बहनों के लिए वस्त्र और आभूषण के उपहार तैयार रखें।", "Bhavishya 4.14")],
        [T("बहन के हाथ से भोजन करें।", "Bhavishya 4.14"),
         T("हर बहन का उपहार, पूजा और भोजन से सम्मान करें।", "Bhavishya 4.14")],
        {},
        [T("इस दिन अपने घर में भोजन न करें।", "Bhavishya 4.14")],
    )

    # Karwa Chauth: DELETED in the content audit (2026-10-11). Every line cited
    # Narada Purana 113, whose sa.wikisource page does not exist (404), whose
    # GRETIL Sansknet links are dead, and whose Gita Press Hindi volume is
    # NC-ND. With no openable source the page goes; the rule stays shipped
    # and its rows stay untappable until a source is found.

    # ── Purnima (Satyanarayana vow, Skanda Reva Khanda 134) ──
    # Rewritten in the content audit: the old page pasted the Kartika
    # five-day vow and Ekadashi lines onto the monthly full moon.
    out["purnima.en"] = page(
        "purnima", "", "en", "The full-moon day of Satyanarayana worship and his story.",
        [T("Narada asks Narayana how suffering people are freed, and Narayana teaches this vow.", "Skanda Reva 134"),
         T("The vow is kept month after month with kin.", "Skanda Reva 134"),
         T("A poor Brahmana of Kashi keeps it with kin and is freed from all sorrows.", "Skanda Reva 134"),
         T("A woodcutter takes the vow, gains wealth, and keeps it lifelong.", "Skanda Reva 134")],
        [T("Keep bananas, sugar, ghee, milk, curd, and wheat flour ready with kin gathered.", "Skanda Reva 134")],
        [T("Resolve to keep the vow.", "Skanda Reva 134"),
         T("Worship Satyanarayana in the evening with kin.", "Skanda Reva 134"),
         T("Hear the story with faith.", "Skanda Reva 134"),
         T("Take water and prasada, and share it with all present.", "Skanda Reva 134")],
        {"eat": [T("Take the prasada of banana, sugar, ghee, milk, curd, and flour after worship.", "Skanda Reva 134")],
         "avoid": [],
         "break": [T("Close with water and prasada after the story.", "Skanda Reva 134")],
         "who_should_eat": [T("All who gather take the prasada with you.", "Skanda Reva 134")]},
        [],
    )
    out["purnima.hi"] = page(
        "purnima", "", "hi", "सत्यनारायण की पूजा और कथा वाली पूर्णिमा।",
        [T("नारद के पूछने पर नारायण दुखी जनों के लिए यह व्रत बताते हैं।", "Skanda Reva 134"),
         T("यह व्रत हर मास बंधु बांधवों सहित रखा जाता है।", "Skanda Reva 134"),
         T("काशी का निर्धन ब्राह्मण इसे रखकर सब दुखों से छूटता है।", "Skanda Reva 134"),
         T("लकड़हारा व्रत लेकर धनी होता है और जीवन भर इसे रखता है।", "Skanda Reva 134")],
        [T("केला, शक्कर, घी, दूध, दही और गेहूं का आटा तैयार रखें, बंधु बांधवों सहित।", "Skanda Reva 134")],
        [T("व्रत का संकल्प लें।", "Skanda Reva 134"),
         T("शाम को बंधु बांधवों सहित सत्यनारायण की पूजा करें।", "Skanda Reva 134"),
         T("श्रद्धा से कथा सुनें।", "Skanda Reva 134"),
         T("जल और प्रसाद लें, और सब में बांटें।", "Skanda Reva 134")],
        {"eat": [T("पूजा के बाद केला, शक्कर, घी, दूध, दही और आटे का प्रसाद लें।", "Skanda Reva 134")],
         "avoid": [],
         "break": [T("कथा के बाद जल और प्रसाद लेकर व्रत पूरा करें।", "Skanda Reva 134")],
         "who_should_eat": [T("जो जुटें, सभी प्रसाद लें।", "Skanda Reva 134")]},
        [],
    )

    # ── Navaratri series (nine names from the Kavacha; no dhyana verses) ──
    _FORMS_EN = ["Shailaputri", "Brahmacharini", "Chandraghanta", "Kushmanda",
                 "Skandamata", "Katyayani", "Kalaratri", "Mahagauri", "Siddhidatri"]
    _FORMS_HI = ["शैलपुत्री", "ब्रह्मचारिणी", "चंद्रघंटा", "कूष्मांडा",
                 "स्कंदमाता", "कात्यायनी", "कालरात्रि", "महागौरी", "सिद्धिदात्री"]
    _FORM_KEYS = ["shailaputri", "brahmacharini", "chandraghanta", "kushmanda",
                  "skandamata", "katyayani", "kalaratri", "mahagauri", "siddhidatri"]
    _TITHI_KEYS = ["pratipada", "dwitiya", "tritiya", "chaturthi", "panchami",
                   "shashthi", "saptami", "ashtami", "navami"]
    for _slug, _title_en, _title_hi in (("sharad_navaratri", "Sharad Navaratri", "शारदीय नवरात्रि"),
                                        ("chaitra_navaratri", "Chaitra Navaratri", "चैत्र नवरात्रि")):
        for _lang in ("en", "hi"):
            _forms = _FORMS_HI if _lang == "hi" else _FORMS_EN
            if _lang == "hi":
                _why = [T("कवच में नौ दुर्गाओं के नाम कहे गए हैं, जो ब्रह्मा ने स्वयं कहे।", "Devi Kavacha"),
                        T("पहले तीन दिन शैलपुत्री, ब्रह्मचारिणी और चंद्रघंटा के हैं।", "Devi Kavacha"),
                        T("बीच के तीन दिन कूष्मांडा, स्कंदमाता और कात्यायनी के हैं।", "Devi Kavacha"),
                        T("अंतिम तीन दिन कालरात्रि, महागौरी और सिद्धिदात्री के हैं।", "Devi Kavacha")]
                _series = [{"tithi_key": _TITHI_KEYS[i], "form_key": _FORM_KEYS[i], "summary": _forms[i],
                            "steps": [T(f"इस दिन {_forms[i]} का स्मरण करें।", "Devi Kavacha")]} for i in range(9)]
                _doc = page(_slug, "", "hi", f"नौ तिथियों का पर्व, {_forms[0]} से {_forms[8]} तक।",
                            _why, [], [],
                            {}, [])
            else:
                _why = [T("The Kavacha names the nine Durgas, spoken by Brahma himself.", "Devi Kavacha"),
                        T("The first three days are Shailaputri, Brahmacharini, and Chandraghanta.", "Devi Kavacha"),
                        T("The middle three days are Kushmanda, Skandamata, and Katyayani.", "Devi Kavacha"),
                        T("The last three days are Kalaratri, Mahagauri, and Siddhidatri.", "Devi Kavacha")]
                _series = [{"tithi_key": _TITHI_KEYS[i], "form_key": _FORM_KEYS[i], "summary": _forms[i],
                            "steps": [T(f"Remember {_forms[i]} on this day.", "Devi Kavacha")]} for i in range(9)]
                _doc = page(_slug, "", "en", f"The nine-tithi festival, from {_forms[0]} to {_forms[8]}.",
                            _why, [], [],
                            {}, [])
            _doc["body"]["series_days"] = _series
            out[f"{_slug}.{_lang}"] = _doc
    return out


def passages() -> dict:
    return {
        ref: {"text_name": name, "url": url, "read_on": "2026-10-11"}
        for ref, (name, url) in SOURCES.items()
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    data = build()
    for name, doc in data.items():
        fp = OUT / f"{name}.json"
        fp.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n",
                      encoding="utf-8", newline="\n")
    (OUT / "passages.json").write_text(
        json.dumps(passages(), ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8", newline="\n")
    print(f"wrote {len(data)} seed files + passages.json to {OUT}")


if __name__ == "__main__":
    main()
