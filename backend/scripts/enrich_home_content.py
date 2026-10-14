"""Update the version-controlled Home editorial data; does not write a database."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "app" / "seeds"
def save(path, data):
    content = json.dumps(data, ensure_ascii=False, indent=1) + "\n"
    if path.exists() and path.read_text(encoding="utf-8") == content: return
    pending = path.with_suffix(path.suffix + ".pending")
    pending.write_text(content, encoding="utf-8")
    pending.replace(path)
def route(oid, lang, name, word, script, url, site, kind="loan", hops=None, roman=""):
    return dict(id=f"{oid}.{lang}.reviewed", status="approved", lang=lang, lang_name=name, word=word, script=script, roman=roman, gloss={"ratri":"night", "yoga":"yoga", "mantra":"sacred utterance", "sharkara":"sugar"}[oid], kind=kind, confidence="certain", hops=hops or [], sources=[], lookup=word, checked_on="2026-10-14", checked_by="hand", source_url=url, source_site=site)

def main():
    # Etymological labels distinguish inherited Indo-Aryan forms from loans.
    ratri = dict(id="ratri", status="approved", mw_key="rAtri", sanskrit={"dev":"रात्रि", "iast":"rātri"}, gloss="night", attested="Monier-Williams, rātri", note="Hindi and Urdu rāt continue an Indo-Aryan word through Middle Indo-Aryan. Kannada and Tamil forms are Sanskrit loans. Tamil also has the native word iravu: not every word for night derives from Sanskrit.", routes=[
        route("ratri", "kn", "Kannada", "ರಾತ್ರಿ", "kannada", "https://dsal.uchicago.edu/dictionaries/kittel/", "Kittel · Kannada dictionary", roman="rātri"),
        route("ratri", "ta", "Tamil", "இராத்திரி", "tamil", "https://dsal.uchicago.edu/dictionaries/tamil-lex/", "University of Madras · Tamil Lexicon", roman="irāttiri"),
        route("ratri", "te", "Telugu", "రాత్రి", "telugu", "https://dsal.uchicago.edu/dictionaries/brown/", "Brown · Telugu dictionary", roman="rātri"),
        route("ratri", "hi", "Hindi", "रात", "devanagari", "https://dsal.uchicago.edu/dictionaries/platts/", "Platts · rā t / rāt", kind="inherit", hops=[{"lang":"Middle Indo-Aryan", "form":"ratti"}], roman="rāt"),
        route("ratri", "ur", "Urdu", "رات", "arabic", "https://dsal.uchicago.edu/dictionaries/platts/", "Platts · rāt", kind="inherit", hops=[{"lang":"Middle Indo-Aryan", "form":"ratti"}], roman="rāt"),
    ])
    mantra = dict(id="mantra", status="approved", mw_key="mantra", sanskrit={"dev":"मन्त्र", "iast":"mantra"}, gloss="a sacred utterance; counsel", attested="Monier-Williams, mantra", note="The same Sanskrit word appears in several international languages. Each branch cites that language's dictionary; the modern meanings need not be identical.", routes=[route("mantra","es","Spanish","mantra","latin","https://dle.rae.es/mantra","RAE · Diccionario de la lengua española"), route("mantra","it","Italian","mantra","latin","https://www.treccani.it/vocabolario/mantra/","Treccani · Vocabolario"), route("mantra","de","German","Mantra","latin","https://www.duden.de/rechtschreibung/Mantra","Duden · Mantra")])
    save(ROOT / "word_origins" / "batch-0001.json", dict(batch="0001", start_date="2026-10-13", made_on="2026-10-14", maker="Original glosses; dictionary references listed per route.", items=[mantra, ratri]))
    path = ROOT / "word_origins" / "batch-0000.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    additions = {
        "yoga": [route("yoga","es","Spanish","yoga","latin","https://dle.rae.es/yoga","RAE · Diccionario de la lengua española"), route("yoga","it","Italian","yoga","latin","https://www.treccani.it/vocabolario/yoga/","Treccani · Vocabolario"), route("yoga","pt","Portuguese","ioga","latin","https://www.infopedia.pt/dicionarios/lingua-portuguesa/ioga","Porto Editora · Infopédia")],
        "sharkara": [route("sharkara","es","Spanish","azúcar","latin","https://dle.rae.es/azúcar","RAE · Diccionario de la lengua española", hops=[{"lang":"Middle Persian","form":"šakar"},{"lang":"Greek","form":"sákchari"},{"lang":"Classical Arabic","form":"sukkar"},{"lang":"Andalusian Arabic","form":"assúkkar"}])],
    }
    for item in data["items"]:
        for extra in additions.get(item["id"], []):
            item["routes"] = [r for r in item["routes"] if r["id"] != extra["id"]]
            item["routes"].insert(0, extra)
    save(path, data)
    # Modest options supplement each existing, sourced festival guide.
    for path in (ROOT / "parva").glob("*.json"):
        if path.name == "passages.json": continue
        data = json.loads(path.read_text(encoding="utf-8")); body = data.get("body", {})
        if data.get("lang") not in ("en", "hi"): continue
        hi = data["lang"] == "hi"
        url = next((s.get("url", "") for s in data.get("sources", []) if s.get("url")), "https://sanskritdocuments.org/")
        item = lambda text: dict(text=text, basis="custom", region="family", source_url=url)
        body.setdefault("do", {})["budget"] = [item(t) for t in (["घर में उपलब्ध साफ चौकी या कपड़ा और देवता का चित्र उपयोग करें।", "पानी, थोड़ा चावल और उपलब्ध मौसमी फल लें; महंगे उपहार आवश्यक नहीं।", "अपने परिवार की परम्परा के अनुसार सरल प्रार्थना करें; सुरक्षित स्थान पर दीपक रखें।"] if hi else ["Reuse a clean cloth and the deity's picture already at home.", "Set aside water and a small seasonal offering from what you have.", "Keep the observance simple: prayer and attention, with any lamp placed safely."])]
        if "navaratri" in data.get("slug", ""):
            body.setdefault("vrat", {})["types"] = [item(t) for t in (["फलाहार: फल और परिवार में मान्य व्रत का भोजन।", "एक समय भोजन: अपनी क्षमता और परम्परा के अनुसार सरल भोजन।", "पहले और अंतिम दिन का व्रत: कुछ परिवार पूरी अवधि के बजाय चुने हुए दिन रखते हैं।"] if hi else ["Phalahar: fruit and foods accepted in your family's vrat tradition.", "One-meal observance: a simple meal rather than a complete fast.", "Selected-day observance: some families keep the first and last days instead of all nine."])]
        save(path, data)

if __name__ == "__main__": main()
