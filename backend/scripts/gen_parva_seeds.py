"""Generate Phase 1 Parva seed drafts (handover 8.4).

Writes backend/app/seeds/parva/<slug>[.<variant>].<lang>.json with status
draft. Content is short, numbered one-sentence steps and lists, no dashes,
no paragraphs. Custom items carry Drik URLs read in the handover as
placeholders; proper printed sources are pending owner review (see handover
result). No Sanskrit is typed: texts are empty and filled from source rows.
Run: cd backend && ./.venv/Scripts/python.exe scripts/gen_parva_seeds.py
"""

from __future__ import annotations

import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "app" / "seeds" / "parva"

DRIK = "https://www.drikpanchang.com"
SRC_NAV = f"{DRIK}/navratri/ashwin-shardiya-navratri-dates.html?year=2026"
SRC_CAL = f"{DRIK}/vrats/ekadashidates.html"


def item(text: str, basis: str = "custom", **kw) -> dict:
    d = {"text": text, "basis": basis}
    if basis == "custom":
        d["region"] = kw.get("region", "all")
        d["source_url"] = kw.get("source_url", SRC_CAL)
    if basis == "calc":
        pass
    d.update({k: v for k, v in kw.items() if k not in ("region", "source_url")})
    if basis == "custom":
        d.setdefault("region", "all")
        d.setdefault("source_url", SRC_CAL)
    return d


def calc(text: str) -> dict:
    return {"text": text, "basis": "calc"}


def vrat_block(lang: str) -> dict:
    if lang == "hi":
        return {
            "eat": [item("व्रत में फल, दूध और सिंघाड़े का आटा लें।", source_url=SRC_CAL),
                    item("सेंधा नमक का प्रयोग करें।", source_url=SRC_CAL)],
            "avoid": [item("अनाज, दाल, चावल और सामान्य नमक से बचें।", source_url=SRC_CAL),
                      item("प्याज, लहसुन और तामसिक भोजन से बचें।", source_url=SRC_CAL)],
            "break": [item("अगले दिन सूर्योदय के बाद पारण समय में व्रत खोलें।", source_url=SRC_CAL)],
            "who_should_eat": [item("गर्भवती, मधुमेह रोगी, दवा लेने वाले, बीमार, बच्चे और बुजुर्ग केवल फल लें।", source_url=SRC_CAL)],
        }
    return {
        "eat": [item("Take fruit, milk and water chestnut flour on the fast.", source_url=SRC_CAL),
                item("Use rock salt in fast cooking.", source_url=SRC_CAL)],
        "avoid": [item("Avoid grains, lentils, rice and common salt.", source_url=SRC_CAL),
                  item("Avoid onion, garlic and heavy food.", source_url=SRC_CAL)],
        "break": [item("Break the fast next morning in the parana window.", source_url=SRC_CAL)],
        "who_should_eat": [item("People who are pregnant, diabetic, on regular medicines, ill, children and the elderly take only fruit.", source_url=SRC_CAL)],
    }


def page(slug: str, variant: str, lang: str, summary: str, why: list, gather: list,
         steps: list, dont: list, regions: list | None = None) -> dict:
    return {
        "slug": slug, "variant": variant, "lang": lang, "status": "draft",
        "body": {
            "summary": summary,
            "why": why,
            "do": {"gather": gather, "steps": steps},
            "vrat": vrat_block(lang),
            "dont": dont,
            "texts": [],
            "regions": regions or [],
            "series_days": [],
        },
        "sources": [{"text_name": "", "ref": "", "url": SRC_CAL, "read_on": "2026-10-10"}],
    }


def build() -> dict[str, dict]:
    out: dict[str, dict] = {}
    # Ekadashi observance
    out["ekadashi.en"] = page(
        "ekadashi", "", "en", "Twice a month fast on the eleventh tithi.",
        [item("Ekadashi is the eleventh tithi of each half month.", source_url=SRC_CAL),
         item("Observers fast from sunrise to next morning.", source_url=SRC_CAL),
         item("The fast is broken in the parana window.", source_url=SRC_CAL),
         item("Each Ekadashi has its own name and story.", source_url=SRC_CAL)],
        [item("Clean the home altar in the morning.", source_url=SRC_CAL)],
        [item("Bathe and resolve to keep the fast.", source_url=SRC_CAL),
         item("Offer water and flowers to Vishnu.", source_url=SRC_CAL),
         item("Read the Ekadashi story of the day.", source_url=SRC_CAL),
         item("Stay awake for some time at night.", source_url=SRC_CAL),
         item("Break the fast in the parana window.", source_url=SRC_CAL)],
        [item("Do not take grains on the fast day.", source_url=SRC_CAL)],
    )
    out["ekadashi.hi"] = page(
        "ekadashi", "", "hi", "हर पक्ष की एकादशी को रखा जाने वाला व्रत।",
        [item("एकादशी हर पक्ष की ग्यारहवीं तिथि होती है।", source_url=SRC_CAL),
         item("व्रती सूर्योदय से अगले सूर्योदय तक व्रत रखते हैं।", source_url=SRC_CAL),
         item("व्रत पारण समय में खोला जाता है।", source_url=SRC_CAL),
         item("हर एकादशी का अपना नाम और कथा होती है।", source_url=SRC_CAL)],
        [item("सुबह घर के मंदिर की सफाई करें।", source_url=SRC_CAL)],
        [item("स्नान कर व्रत का संकल्प लें।", source_url=SRC_CAL),
         item("विष्णु को जल और फूल अर्पित करें।", source_url=SRC_CAL),
         item("उस दिन की एकादशी कथा पढ़ें।", source_url=SRC_CAL),
         item("रात में कुछ समय जागरण करें।", source_url=SRC_CAL),
         item("पारण समय में व्रत खोलें।", source_url=SRC_CAL)],
        [item("व्रत के दिन अनाज न लें।", source_url=SRC_CAL)],
    )
    for variant, en_name, hi_name in [
        ("papankusha", "Papankusha Ekadashi", "पापांकुशा एकादशी"),
        ("prabodhini", "Prabodhini Ekadashi", "प्रबोधिनी एकादशी"),
        ("nirjala", "Nirjala Ekadashi", "निर्जला एकादशी"),
    ]:
        out[f"ekadashi.{variant}.en"] = page(
            "ekadashi", variant, "en", f"{en_name}, kept on its eleventh tithi.",
            [item(f"{en_name} falls in its month and half.", source_url=SRC_CAL),
             item("Observers fast from sunrise to next morning.", source_url=SRC_CAL),
             item("The fast is broken in the parana window.", source_url=SRC_CAL),
             item("Its story is read on the fast day.", source_url=SRC_CAL)],
            [item("Keep the puja items ready.", source_url=SRC_CAL)],
            [item("Bathe and resolve to keep the fast.", source_url=SRC_CAL),
             item("Worship Vishnu with flowers.", source_url=SRC_CAL),
             item("Read the story of this Ekadashi.", source_url=SRC_CAL),
             item("Break the fast in the parana window.", source_url=SRC_CAL)],
            [item("Do not take grains on the fast day.", source_url=SRC_CAL)],
        )
        out[f"ekadashi.{variant}.hi"] = page(
            "ekadashi", variant, "hi", f"{hi_name}, अपनी एकादशी तिथि को रखा जाने वाला व्रत।",
            [item(f"{hi_name} अपने मास और पक्ष में आती है।", source_url=SRC_CAL),
             item("व्रती सूर्योदय से अगले सूर्योदय तक व्रत रखते हैं।", source_url=SRC_CAL),
             item("व्रत पारण समय में खोला जाता है।", source_url=SRC_CAL),
             item("उस दिन इसकी कथा पढ़ी जाती है।", source_url=SRC_CAL)],
            [item("पूजा की सामग्री तैयार रखें।", source_url=SRC_CAL)],
            [item("स्नान कर व्रत का संकल्प लें।", source_url=SRC_CAL),
             item("फूलों से विष्णु की पूजा करें।", source_url=SRC_CAL),
             item("इस एकादशी की कथा पढ़ें।", source_url=SRC_CAL),
             item("पारण समय में व्रत खोलें।", source_url=SRC_CAL)],
            [item("व्रत के दिन अनाज न लें।", source_url=SRC_CAL)],
        )
    # Purnima / Amavasya
    out["purnima.en"] = page(
        "purnima", "", "en", "Full moon day kept with fast and moon worship.",
        [item("Purnima is the fifteenth tithi of the bright half.", source_url=SRC_CAL),
         item("Observers fast till moonrise on this day.", source_url=SRC_CAL),
         item("The moon is offered water at night.", source_url=SRC_CAL),
         item("Some months have their own named Purnima.", source_url=SRC_CAL)],
        [item("Keep flowers, incense and sweets ready.", source_url=SRC_CAL)],
        [item("Bathe in the morning and resolve to fast.", source_url=SRC_CAL),
         item("Worship Vishnu or Lakshmi at home.", source_url=SRC_CAL),
         item("Offer water to the moon at moonrise.", source_url=SRC_CAL),
         item("Share food with family after moonrise.", source_url=SRC_CAL)],
        [item("Do not take non vegetarian food on this day.", source_url=SRC_CAL)],
    )
    out["purnima.hi"] = page(
        "purnima", "", "hi", "चंद्रोदय तक व्रत और चंद्र पूजा वाला पूर्णिमा दिन।",
        [item("पूर्णिमा शुक्ल पक्ष की पंद्रहवीं तिथि होती है।", source_url=SRC_CAL),
         item("व्रती इस दिन चंद्रोदय तक व्रत रखते हैं।", source_url=SRC_CAL),
         item("रात में चंद्रमा को जल अर्पित किया जाता है।", source_url=SRC_CAL),
         item("कुछ मासों की अपनी नाम वाली पूर्णिमा होती है।", source_url=SRC_CAL)],
        [item("फूल, धूप और मिठाई तैयार रखें।", source_url=SRC_CAL)],
        [item("सुबह स्नान कर व्रत का संकल्प लें।", source_url=SRC_CAL),
         item("घर में विष्णु या लक्ष्मी की पूजा करें।", source_url=SRC_CAL),
         item("चंद्रोदय पर चंद्रमा को जल दें।", source_url=SRC_CAL),
         item("चंद्रोदय के बाद परिवार के साथ भोजन करें।", source_url=SRC_CAL)],
        [item("इस दिन मांसाहार न लें।", source_url=SRC_CAL)],
    )
    out["amavasya.en"] = page(
        "amavasya", "", "en", "New moon day for rest, charity and remembrance.",
        [item("Amavasya is the thirtieth tithi ending the dark half.", source_url=SRC_CAL),
         item("Families give food and charity on this day.", source_url=SRC_CAL),
         item("The Mahalaya Amavasya closes Pitru Paksha.", source_url=SRC_CAL),
         item("Evening lamps are lit at home.", source_url=SRC_CAL)],
        [item("Keep lamps, sesame and charity items ready.", source_url=SRC_CAL)],
        [item("Bathe in the morning and clean the home.", source_url=SRC_CAL),
         item("Offer food and charity to the needy.", source_url=SRC_CAL),
         item("Light lamps in the evening.", source_url=SRC_CAL)],
        [item("Do not start quarrels on this day.", source_url=SRC_CAL)],
    )
    out["amavasya.hi"] = page(
        "amavasya", "", "hi", "विश्राम, दान और स्मरण का अमावस्या दिन।",
        [item("अमावस्या कृष्ण पक्ष की तीसवीं तिथि होती है।", source_url=SRC_CAL),
         item("परिवार इस दिन भोजन और दान देते हैं।", source_url=SRC_CAL),
         item("महालय अमावस्या पितृपक्ष का समापन करती है।", source_url=SRC_CAL),
         item("शाम को घर में दीप जलाए जाते हैं।", source_url=SRC_CAL)],
        [item("दीप, तिल और दान की वस्तुएं तैयार रखें।", source_url=SRC_CAL)],
        [item("सुबह स्नान कर घर की सफाई करें।", source_url=SRC_CAL),
         item("जरूरतमंदों को भोजन और दान दें।", source_url=SRC_CAL),
         item("शाम को दीप जलाएं।", source_url=SRC_CAL)],
        [item("इस दिन झगड़ा न करें।", source_url=SRC_CAL)],
    )
    # Sankranti
    out["sankranti.en"] = page(
        "sankranti", "", "en", "Monthly day when the Sun enters a new sign.",
        [item("Sankranti marks the Sun entry into a sign.", source_url=SRC_CAL),
         item("Bathing and charity are done on this day.", source_url=SRC_CAL),
         item("Makara Sankranti is the best known one.", source_url=SRC_CAL),
         item("The civil date follows the sunset rule.", source_url=SRC_CAL)],
        [item("Keep sesame, jaggery and charity items ready.", source_url=SRC_CAL)],
        [item("Bathe in the morning.", source_url=SRC_CAL),
         item("Offer water to the Sun.", source_url=SRC_CAL),
         item("Give food or money in charity.", source_url=SRC_CAL)],
        [item("Do not speak harshly on this day.", source_url=SRC_CAL)],
    )
    out["sankranti.hi"] = page(
        "sankranti", "", "hi", "सूर्य के राशि बदलने का मासिक दिन।",
        [item("संक्रांति सूर्य के राशि प्रवेश का दिन होती है।", source_url=SRC_CAL),
         item("इस दिन स्नान और दान किया जाता है।", source_url=SRC_CAL),
         item("मकर संक्रांति सबसे प्रसिद्ध संक्रांति है।", source_url=SRC_CAL),
         item("तिथि सूर्यास्त नियम से तय होती है।", source_url=SRC_CAL)],
        [item("तिल, गुड़ और दान की वस्तुएं तैयार रखें।", source_url=SRC_CAL)],
        [item("सुबह स्नान करें।", source_url=SRC_CAL),
         item("सूर्य को जल अर्पित करें।", source_url=SRC_CAL),
         item("भोजन या धन का दान दें।", source_url=SRC_CAL)],
        [item("इस दिन कठोर न बोलें।", source_url=SRC_CAL)],
    )
    # Diwali days variants
    diwali = [
        ("dhanteras", "Dhanteras, first day of the Diwali run.", "धनतेरस, दीपावली शृंखला का पहला दिन।"),
        ("naraka_chaturdashi", "Naraka Chaturdashi, second day of the run.", "नरक चतुर्दशी, शृंखला का दूसरा दिन।"),
        ("lakshmi_puja", "Lakshmi Puja on the new moon night.", "अमावस्या रात की लक्ष्मी पूजा।"),
        ("govardhan_puja", "Govardhan Puja on the first bright day.", "शुक्ल प्रतिपदा की गोवर्धन पूजा।"),
        ("bhai_dooj", "Bhai Dooj on the second bright day.", "शुक्ल द्वितीया की भाई दूज।"),
    ]
    for variant, en_sum, hi_sum in diwali:
        out[f"diwali_days.{variant}.en"] = page(
            "diwali_days", variant, "en", en_sum,
            [item("This day belongs to the five day Diwali run.", source_url=SRC_CAL),
             item("Homes are cleaned and lit with lamps.", source_url=SRC_CAL),
             item("Lakshmi is worshipped in the pradosh window.", source_url=SRC_CAL),
             item("Families share sweets and gifts.", source_url=SRC_CAL)],
            [item("Keep lamps, flowers and sweets ready.", source_url=SRC_CAL)],
            [item("Clean the home in the morning.", source_url=SRC_CAL),
             item("Light lamps at sunset.", source_url=SRC_CAL),
             item("Worship Lakshmi with family.", source_url=SRC_CAL),
             item("Share sweets with neighbours.", source_url=SRC_CAL)],
            [item("Do not leave lamps unattended.", source_url=SRC_CAL)],
        )
        out[f"diwali_days.{variant}.hi"] = page(
            "diwali_days", variant, "hi", hi_sum,
            [item("यह दिन पांच दिवसीय दीपावली शृंखला का भाग है।", source_url=SRC_CAL),
             item("घर साफ कर दीप जलाए जाते हैं।", source_url=SRC_CAL),
             item("प्रदोष समय में लक्ष्मी की पूजा होती है।", source_url=SRC_CAL),
             item("परिवार मिठाई और उपहार बांटते हैं।", source_url=SRC_CAL)],
            [item("दीप, फूल और मिठाई तैयार रखें।", source_url=SRC_CAL)],
            [item("सुबह घर की सफाई करें।", source_url=SRC_CAL),
             item("सूर्यास्त पर दीप जलाएं।", source_url=SRC_CAL),
             item("परिवार के साथ लक्ष्मी की पूजा करें।", source_url=SRC_CAL),
             item("पड़ोसियों में मिठाई बांटें।", source_url=SRC_CAL)],
            [item("जलते दीप अकेले न छोड़ें।", source_url=SRC_CAL)],
        )
    # Karwa Chauth / Chhath / Kartika Purnima
    out["karwa_chauth.en"] = page(
        "karwa_chauth", "", "en", "Fast kept for family welfare till moonrise.",
        [item("Karwa Chauth falls on Ashwina Krishna Chaturthi.", source_url=SRC_CAL),
         item("Observers fast without water till moonrise.", source_url=SRC_CAL),
         item("The moon is sighted through a sieve.", source_url=SRC_CAL),
         item("The fast is broken after moonrise.", source_url=SRC_CAL)],
        [item("Keep a sieve, lamp and sweets ready.", source_url=SRC_CAL)],
        [item("Bathe and resolve to keep the fast.", source_url=SRC_CAL),
         item("Listen to the Karwa story in the evening.", source_url=SRC_CAL),
         item("Offer water to the moon at moonrise.", source_url=SRC_CAL),
         item("Break the fast after moonrise.", source_url=SRC_CAL)],
        [item("Do not eat before moonrise.", source_url=SRC_CAL)],
    )
    out["karwa_chauth.hi"] = page(
        "karwa_chauth", "", "hi", "चंद्रोदय तक परिवार के लिए रखा जाने वाला व्रत।",
        [item("करवा चौथ आश्विन कृष्ण चतुर्थी को आती है।", source_url=SRC_CAL),
         item("व्रती चंद्रोदय तक निर्जल व्रत रखते हैं।", source_url=SRC_CAL),
         item("छलनी से चंद्रमा देखा जाता है।", source_url=SRC_CAL),
         item("चंद्रोदय के बाद व्रत खोला जाता है।", source_url=SRC_CAL)],
        [item("छलनी, दीप और मिठाई तैयार रखें।", source_url=SRC_CAL)],
        [item("स्नान कर व्रत का संकल्प लें।", source_url=SRC_CAL),
         item("शाम को करवा की कथा सुनें।", source_url=SRC_CAL),
         item("चंद्रोदय पर चंद्रमा को जल दें।", source_url=SRC_CAL),
         item("चंद्रोदय के बाद व्रत खोलें।", source_url=SRC_CAL)],
        [item("चंद्रोदय से पहले भोजन न करें।", source_url=SRC_CAL)],
    )
    out["chhath.en"] = page(
        "chhath", "", "en", "Two arghyas to the Sun at sunset and sunrise.",
        [item("Chhath falls on Kartika Shukla Shashthi.", source_url=SRC_CAL),
         item("The evening arghya is offered at sunset.", source_url=SRC_CAL),
         item("The morning arghya is offered at sunrise.", source_url=SRC_CAL),
         item("Families gather at a river or pond.", source_url=SRC_CAL)],
        [item("Keep bamboo baskets, fruits and thekuas ready.", source_url=SRC_CAL)],
        [item("Fast and stay clean through the day.", source_url=SRC_CAL),
         item("Offer the evening arghya at sunset.", source_url=SRC_CAL),
         item("Offer the morning arghya at sunrise.", source_url=SRC_CAL)],
        [item("Do not pollute the river bank.", source_url=SRC_CAL)],
    )
    out["chhath.hi"] = page(
        "chhath", "", "hi", "सूर्यास्त और सूर्योदय के दो अर्घ्य वाला पर्व।",
        [item("छठ कार्तिक शुक्ल षष्ठी को आता है।", source_url=SRC_CAL),
         item("सांझ का अर्घ्य सूर्यास्त पर दिया जाता है।", source_url=SRC_CAL),
         item("भोर का अर्घ्य सूर्योदय पर दिया जाता है।", source_url=SRC_CAL),
         item("परिवार नदी या तालाब पर जुटते हैं।", source_url=SRC_CAL)],
        [item("बांस की टोकरी, फल और ठेकुए तैयार रखें।", source_url=SRC_CAL)],
        [item("दिन भर स्वच्छ रहकर व्रत रखें।", source_url=SRC_CAL),
         item("सूर्यास्त पर सांझ का अर्घ्य दें।", source_url=SRC_CAL),
         item("सूर्योदय पर भोर का अर्घ्य दें।", source_url=SRC_CAL)],
        [item("नदी किनारा गंदा न करें।", source_url=SRC_CAL)],
    )
    out["kartika_purnima.en"] = page(
        "kartika_purnima", "", "en", "Full moon of Kartika with evening lamps.",
        [item("Kartika Purnima is the full moon of Kartika.", source_url=SRC_CAL),
         item("Lamps are floated on rivers in the evening.", source_url=SRC_CAL),
         item("Bathing and charity are done in the morning.", source_url=SRC_CAL),
         item("It is also called Dev Diwali.", source_url=SRC_CAL)],
        [item("Keep lamps, flowers and sweets ready.", source_url=SRC_CAL)],
        [item("Bathe early in the morning.", source_url=SRC_CAL),
         item("Give charity after bathing.", source_url=SRC_CAL),
         item("Float lamps in the evening.", source_url=SRC_CAL)],
        [item("Do not push near deep water.", source_url=SRC_CAL)],
    )
    out["kartika_purnima.hi"] = page(
        "kartika_purnima", "", "hi", "शाम के दीपों वाली कार्तिक पूर्णिमा।",
        [item("कार्तिक पूर्णिमा कार्तिक मास की पूर्णिमा होती है।", source_url=SRC_CAL),
         item("शाम को नदियों में दीप तैराए जाते हैं।", source_url=SRC_CAL),
         item("सुबह स्नान और दान किया जाता है।", source_url=SRC_CAL),
         item("इसे देव दीपावली भी कहते हैं।", source_url=SRC_CAL)],
        [item("दीप, फूल और मिठाई तैयार रखें।", source_url=SRC_CAL)],
        [item("सुबह जल्दी स्नान करें।", source_url=SRC_CAL),
         item("स्नान के बाद दान दें।", source_url=SRC_CAL),
         item("शाम को दीप तैराएं।", source_url=SRC_CAL)],
        [item("गहरे पानी के पास धक्का न दें।", source_url=SRC_CAL)],
    )
    return out


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, data in build().items():
        fp = OUT / f"{name}.json"
        fp.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    print(f"wrote {len(build())} seed files to {OUT}")


if __name__ == "__main__":
    main()
