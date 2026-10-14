"""Original, sourced Raksha Bandhan guide in the existing editorial format."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "app" / "seeds" / "parva"
TIMING = "https://www.drikpanchang.com/festivals/raksha-bandhan/raksha-bandhan-date-time.html"
RITUAL = "https://dipika.org.za/wp-content/uploads/2024/07/Raksha-Bandhan-19th-August-2024.pdf"

def make(lang):
    hi = lang == "hi"
    def item(en, hindi, url=RITUAL): return {"text": hindi if hi else en, "basis":"custom", "region":"family", "source_url":url}
    body = {
        "summary": "राखी, स्नेह और एक-दूसरे की देखभाल का संकल्प।" if hi else "A thread, a blessing and a promise to care for one another.",
        "why": [
            item("Raksha Bandhan celebrates bonds of care through the tying of a protective thread.", "रक्षा बन्धन में रक्षा-सूत्र बाँधकर स्नेह और देखभाल का संकल्प लिया जाता है।"),
            item("The observance falls on Shravana Purnima; use the local window shown in Today.", "यह पर्व श्रावण पूर्णिमा पर आता है; आज वाले भाग में स्थानीय समय देखें।", TIMING),
            item("Aparahna is traditionally preferred, with Bhadra excluded from the chosen window.", "परम्परा में अपराह्न को प्राथमिकता दी जाती है और भद्रा का समय छोड़ते हैं।", TIMING),
            item("The Bali protection verse is a traditional invocation, not proof of one historical origin for every rakhi custom.", "बलि का रक्षा-मन्त्र एक पारम्परिक प्रार्थना है; सभी राखी-परम्पराओं का एक ही ऐतिहासिक आरम्भ सिद्ध नहीं होता।"),
        ],
        "do": {"gather":[item("Rakhi or clean cotton thread, a small plate, roli and rice.", "राखी या साफ सूती धागा, छोटी थाली, रोली और चावल।"), item("A small sweet or fruit; a safely placed diya if used in your family.", "थोड़ी मिठाई या फल; परिवार में चलन हो तो सुरक्षित स्थान पर दीपक।")], "budget":[item("Use a simple cotton thread and an offering already at home.", "सादा सूती धागा और घर में उपलब्ध फल या मिठाई लें।"), item("A handwritten promise of care can accompany the thread; an expensive gift is unnecessary.", "धागे के साथ देखभाल का लिखित संकल्प दें; महंगा उपहार आवश्यक नहीं।")], "steps":[item("Prepare the plate and gather during the listed local window.", "थाली तैयार करें और बताए गए स्थानीय समय में साथ बैठें।", TIMING),item("Offer a brief prayer to your family's deity.", "अपने परिवार के आराध्य को छोटी प्रार्थना अर्पित करें।"),item("Apply tilak and rice if customary, and tie the thread gently.", "चलन के अनुसार तिलक और चावल लगाएँ, फिर धागा धीरे से बाँधें।"),item("Exchange blessings and share a sweet or fruit.", "शुभकामनाएँ दें और मिठाई या फल बाँटें।") ]},
        "vrat": {"types":[], "eat":[], "avoid":[], "break":[], "who_should_eat":[item("This guide does not prescribe a compulsory fast. Follow your own family observance.", "इस मार्गदर्शिका में अनिवार्य व्रत नहीं बताया गया है। अपने परिवार की परम्परा अपनाएँ।")]},
        "dont":[item("Avoid the Bhadra interval if your tradition follows that restriction.", "परम्परा में निषेध हो तो भद्रा के समय राखी न बाँधें।", TIMING),item("Do not tighten the thread enough to hurt the wrist.", "धागा इतना कसकर न बाँधें कि कलाई में दर्द हो।")],
        "texts":[{"kind":"mantra", "title":"रक्षा-सूत्र की प्रार्थना" if hi else "Traditional protection invocation", "devanagari":"येन बद्धो बली राजा दानवेन्द्रो महाबलः।\nतेन त्वामभिबध्नामि रक्षे मा चल मा चल॥", "iast":"yena baddho balī rājā dānavendro mahābalaḥ | tena tvām abhibadhnāmi rakṣe mā cala mā cala ||", "meaning":"जिस रक्षा-सूत्र से बलशाली राजा बलि बँधे थे, उसी से तुम्हें बाँधता हूँ। हे रक्षा-सूत्र, स्थिर रहो।" if hi else "With the protection thread that bound mighty King Bali, I bind you. May this protection remain steady.", "source":"Traditional raksha-sutra invocation · Dipika ritual booklet", "source_url":RITUAL}],
        "regions":[],
    }
    return {"slug":"raksha_bandhan", "variant":"", "lang":lang, "status":"approved", "body":body, "sources":[{"text_name":"Raksha Bandhan timing convention", "url":TIMING, "read_on":"2026-10-14"},{"text_name":"Dipika ritual booklet", "url":RITUAL, "read_on":"2026-10-14"}]}

if __name__ == "__main__":
    for lang in ("en","hi"):
        (ROOT / f"raksha_bandhan.{lang}.json").write_text(json.dumps(make(lang), ensure_ascii=False, indent=1)+"\n", encoding="utf-8")
