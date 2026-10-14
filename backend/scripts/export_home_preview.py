"""Export public seed content for the isolated browser preview, no learner data."""
import json, os, sys
from pathlib import Path
os.environ["SHABD_IGNORE_DOTENV"] = "1"
os.environ["DATABASE_URL"] = ""
os.environ["DB_PATH"] = ":memory:"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.seeds.home_insights import INSIGHTS
from app.seeds.story_cards import CHAPTERS, CARDS
from app.seeds.varnamala import VARNAMALA_DATA
from app.seeds.writing_paths import writing_paths
from app.services.iast import to_iast
from app.services.sandhi import split_candidates

destination = Path(sys.argv[1])
existing = json.loads(destination.read_text(encoding="utf-8"))
root = Path(__file__).resolve().parents[1] / "app/seeds"
origins = json.loads((root/"word_origins/batch-0001.json").read_text(encoding="utf-8"))["items"]
for item in origins:
    for route in item["routes"]:
        route["relation"] = "inherited" if route["kind"] == "inherit" else "borrowed"
        route["source_site"] = route.get("source_site", "")
ratri = next(item for item in origins if item["id"] == "ratri")
existing["origin"] = ratri
existing["origins"] = origins
existing["facts"] = INSIGHTS
existing["chapters"] = []
for cid, rank, en, hi, blurb in CHAPTERS:
    cards = []
    for card in CARDS:
        if card[1] != cid: continue
        keys = ["id","chapter_id","rank","title_en","title_hi","body","example_dev","example_gloss","deep_link","deep_link_label"]
        out = dict(zip(keys,card)); out["example_iast"] = to_iast(out["example_dev"]); cards.append(out)
    existing["chapters"].append(dict(id=cid,rank=rank,title_en=en,title_hi=hi,blurb=blurb,cards=cards))
existing["varnamala"] = VARNAMALA_DATA
existing["sandhiExamples"] = {word:{"candidates":split_candidates(word)} for word in ("विद्यालयः", "महेश्वरः", "सदैव")}
existing["festival"] = json.loads((root/"parva/sharad_navaratri.en.json").read_text(encoding="utf-8"))
words = [(1,w) for w in ["अ","आ","इ","क","ख","ग","त","द","म","र","ल"]] + [(2,w) for w in ["क","का","कि","की","कु","कू","कृ","के","कै","को","कौ"]] + [(3,w) for w in ["कमल","बालकः","गजः","पुस्तकम्"]]
existing["writing"] = [dict(id=f"sample-{tier}-{i}",tier=tier,sort_order=i,devanagari=w,iast=to_iast(w),gloss="lotus" if w=="कमल" else "",stroke_paths=writing_paths(w)) for i,(tier,w) in enumerate(words)]
destination.write_text(json.dumps(existing,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("Exported public preview fixtures: festival, five language branches, six insights, alphabet, writing and introduction.")
