"""Build static asset/source-reading data from local delivery and manuscript records.

No generation, linguistic inference, image editing, or backend writes.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPECS = ROOT / "specs/learn-v2"
OUT = ROOT / "mobile/src/learnv2"

def records(name):
    return [json.loads(line) for line in (SPECS / name).read_text(encoding="utf-8").splitlines() if line.strip()]

def loc(text):
    # The manuscripts are English. The player explicitly announces this fallback.
    return {"en": text, "hi": text}

def clean(text):
    return re.sub(r"\[([^]]+)\]\([^)]+\)", r"\1", text).replace("**", "").strip()

ready = {x["asset_id"]: x for x in records("deliveries.jsonl") if x["status"] == "ready"}
requests = {x["asset_id"]: x for x in records("requests.jsonl") if x["status"] == "ready"}
queue = json.loads((SPECS / "manuscript-image-production-queue.json").read_text(encoding="utf-8"))
lines = ['// Generated from local ready deliveries. Static literal requires only.',
         'export interface LearnV2Asset { source: number; width: number; height: number; sceneHeight: number; captionColor: string; altEn: string; altHi: string; labels: { sa: string; iast: string }; topicId?: string; }',
         'export const LEARNV2_ASSETS = {']
for aid, d in ready.items():
    r = requests[aid]
    alt = r.get("alt", {})
    meta = {"width": d["width"], "height": d["height"], "sceneHeight": int(d["height"] * .75), "captionColor": "#073E40", "altEn": alt.get("en", r.get("purpose", aid)), "altHi": alt.get("hi", alt.get("en", r.get("purpose", aid))), "labels": d["labels"]}
    if r.get("topic_ids"):
        meta["topicId"] = r["topic_ids"][0]
    path = "../../assets/learn-v2/" + Path(d["relative_path"]).name
    lines.append(json.dumps(aid) + ': { source: require(' + json.dumps(path) + '), ' + json.dumps(meta, ensure_ascii=False)[1:-1] + ' },')
lines += ['} satisfies Record<string, LearnV2Asset>;', 'export type LearnV2AssetId = keyof typeof LEARNV2_ASSETS;',
          'export function getLearnV2Asset(id: string): LearnV2Asset | undefined { return (LEARNV2_ASSETS as Record<string, LearnV2Asset>)[id]; }',
          'export function findSandhiArt(sa: string, iast: string): string | undefined {',
          '  const normalize = (text: string) => text.normalize("NFC").replace(/[’]/g, "\u0027");',
          '  return Object.entries(LEARNV2_ASSETS).find(([id, asset]) => id.startsWith("sandhi-") && normalize(asset.labels.sa) === normalize(sa) && normalize(asset.labels.iast) === normalize(iast))?.[0];', '}',
          'export function findGuideArt(topicId: string | undefined, sa: string, iast: string): string | undefined {',
          '  if (!topicId) return undefined;',
          '  return Object.entries(LEARNV2_ASSETS).find(([, asset]) => (asset as LearnV2Asset).topicId === topicId && asset.labels.sa.normalize("NFC") === sa.normalize("NFC") && asset.labels.iast.normalize("NFC") === iast.normalize("NFC"))?.[0];', '}']
(OUT / "assetMap.ts").write_text("\n".join(lines) + "\n", encoding="utf-8")

proto = Path(queue[0]["source"]["file"]).parent
# Keep durable project copies so the app's sources no longer depend on .codex paths.
for name in ["sandhi-chapter-data.json", "verse-rhythm-course-content.md"]:
    if not (SPECS / name).exists():
        (SPECS / name).write_text((proto / name).read_text(encoding="utf-8"), encoding="utf-8")
sandhi = json.loads((SPECS / "sandhi-chapter-data.json").read_text(encoding="utf-8"))
lessons = []
units = []
sys.path.insert(0, str(ROOT / "backend"))
from app.services.grammar_guide import guide_topic
topic_ids = list(dict.fromkeys(r["topic_ids"][0] for r in requests.values() if r.get("topic_ids")))
for rank, topic_id in enumerate(topic_ids, 1):
    topic = guide_topic(topic_id)
    jobs = [r for r in requests.values() if r.get("topic_ids") == [topic_id]]
    lid = "guide-art-" + topic_id
    cards = []
    for j in jobs:
        cards.append({"id": lid + "-" + j["asset_id"], "kind": "teach", "title": topic["title"], "body": topic["summary"], "example": {"sa": j["labels"]["sa"], "iast": j["labels"]["iast"], "gloss": j["alt"], "alt": j["alt"]}, "assetIds": [j["asset_id"]]})
    lessons.append({"id": lid, "rank": rank, "unit": topic["chapter"]["title"], "chapterId": topic["chapter_id"], "title": topic["title"], "titleSa": topic["title_sa"], "titleIast": topic["title_iast"], "outcome": topic["summary"], "minutes": max(2, len(cards)*2), "prereqIds": [], "sourceReading": True, "sourceLanguage": "bilingual", "sourceUrls": [], "cards": cards, "sourcesLabel": {"en": "Examples and explanation copied from the existing Grammar guide. Reading only; use the course lesson for assessed practice.", "hi": "उदाहरण और व्याख्या मौजूदा व्याकरण मार्गदर्शिका से। केवल पठन; मूल्यांकित अभ्यास के लिए पाठ्यक्रम का पाठ खोलें।"}})
    uid = "guide-art-" + topic["chapter_id"]
    unit = next((u for u in units if u["id"] == uid), None)
    if unit is None:
        unit = {"id": uid, "rank": rank + 20, "title": topic["chapter"]["title"], "titleSa": topic["chapter"]["title_sa"], "lessonIds": []}
        units.append(unit)
    unit["lessonIds"].append(lid)
sid = []
for rank, lesson in enumerate(sandhi["lessons"], 1):
    lid = "sandhi-source-" + lesson["id"]
    sid.append(lid)
    cards = []
    for index, row in enumerate(lesson["cards"]):
        jobs = [j for j in queue if j["asset_id"].startswith("sandhi-") and j["source"]["lesson_id"] == lesson["id"] and j["source"]["card_index"] == index]
        cards.append({"id": lid + f"-{index+1:02d}", "kind": "teach", "title": loc(row[0]), "body": loc(" ".join(str(x) for x in row[5:] if x)), "example": {"sa": row[1] + " → " + row[2], "iast": row[3], "gloss": loc(row[4]), "alt": loc(row[0] + ". " + row[5])}, "assetIds": [j["asset_id"] for j in jobs]})
    urls = [sandhi["sources"][ref] for ref in lesson["refs"]]
    lessons.append({"id": lid, "rank": rank, "unit": loc("Sandhi: full source readings"), "title": loc(lesson["title"]), "titleSa": "सन्धिः", "titleIast": "sandhiḥ", "outcome": loc(lesson["goal"]), "minutes": max(5, len(cards)), "prereqIds": [], "sourceReading": True, "sourceUrls": urls, "cards": cards, "sourcesLabel": loc("Existing English Sandhi manuscript · " + lesson["sections"] + ". Source reading; no assessed mastery.")})
units.append({"id": "sandhi-source-readings", "rank": 3, "title": loc("Sandhi: full source readings"), "titleSa": "सन्धिः", "lessonIds": sid})

verse = (SPECS / "verse-rhythm-course-content.md").read_text(encoding="utf-8")
parts = re.split(r"^### (\d+)\. (.+)$", verse, flags=re.M)
needles = {"spoken": "spoken verse", "sung": "spoken verse", "yoga": "योग", "field": "क्षेत्र", "assembly": "धर्मक्षेत्रे", "poet": "कवि", "teacher": "आचार्य", "sita": "सीता", "fire": "अग्नि", "friend": "मित्र", "story": "कथा", "sorrow": "दुःख", "temple": "देवालय", "himalaya": "हिमालय", "separation": "yakṣa", "parents": "वागर्थ", "recitation": "Read", "agni": "अग्नि", "tradition": "tradition", "ocean": "ocean", "composition": "Write", "hermitage": "hermitage", "peer": "partner", "study": "completed reading"}
for i in range(1, len(parts), 3):
    number, title, body = int(parts[i]), parts[i+1], parts[i+2]
    # A module heading at the end of a section belongs to the next module.
    body = re.split(r"^## Module", body, flags=re.M)[0]
    module_headers = list(re.finditer(r"^## Module (\d+): (.+)$", verse[:verse.index("### " + str(number) + ". ")], re.M))
    module = module_headers[-1]
    module_id, module_title = int(module[1]), module[2]
    lid = f"verse-{number:02d}"
    outcome = re.search(r"\*\*Outcome:\*\* (.+)", body)[1]
    urls = re.findall(r"\[[^]]+\]\((https?://[^)]+)\)", body)
    paragraphs = [x.strip() for x in re.split(r"\n\s*\n", body) if x.strip()]
    cards = []
    section = "Understand"
    for para in paragraphs:
        if para.startswith("**Outcome:") or para.startswith("Sources:"):
            continue
        if para in ["**Cases and examples**", "**Go deeper**"]:
            section = "Cases and examples" if "Cases" in para else "Qualifications"
            continue
        # Each case is a separate card, including its explanation on the main path.
        for chunk in re.split(r"\n(?=- )", para):
            text = clean(chunk.removeprefix("- "))
            heading = "Reflection" if text.startswith("Reflect:") else "Explanation" if text.startswith("Explanation:") else section
            cards.append({"id": lid + f"-{len(cards)+1:02d}", "kind": "teach", "title": loc(heading), "body": loc(text)})
    for job in [j for j in queue if j["lesson_id"] == lid]:
        needle = needles[job["asset_id"].split("-", 2)[2]].casefold()
        target = next((c for c in cards if needle in c["body"]["en"].casefold()), cards[0])
        target.setdefault("assetIds", []).append(job["asset_id"])
    lessons.append({"id": lid, "rank": number, "unit": loc(module_title), "title": loc(title), "titleSa": "छन्दः", "titleIast": "chandaḥ", "outcome": loc(outcome), "minutes": max(5, len(cards)), "prereqIds": [], "sourceReading": True, "sourceUrls": urls, "cards": cards, "sourcesLabel": loc("Existing English Verse & Rhythm manuscript · sources accessed 11 October 2026. Source reading; specialist traditions require a teacher.")})
    uid = f"verse-module-{module_id:02d}"
    unit = next((u for u in units if u["id"] == uid), None)
    if unit is None:
        unit = {"id": uid, "rank": module_id+3, "title": loc("Verse & Rhythm: " + module_title), "titleSa": "छन्दः", "lessonIds": []}
        units.append(unit)
    unit["lessonIds"].append(lid)
(OUT / "sourceReadings.ts").write_text('import type { LearnV2Lesson, LearnV2Unit } from "./types";\n// Exact local manuscript adaptations; English source readings, not reviewed bilingual/graded lessons.\nexport const SOURCE_READING_LESSONS: LearnV2Lesson[] = ' + json.dumps(lessons, ensure_ascii=False, indent=2) + ';\nexport const SOURCE_READING_UNITS: LearnV2Unit[] = ' + json.dumps(units, ensure_ascii=False, indent=2) + ';\n', encoding="utf-8")
print(f"Built {len(ready)} literal asset mappings and {len(lessons)} source-reading lessons ({sum(len(x['cards']) for x in lessons)} cards).")
