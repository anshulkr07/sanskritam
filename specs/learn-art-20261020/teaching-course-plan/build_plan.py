"""Build a reviewable planning inventory from current YAML; does not edit the app."""
from __future__ import annotations

import csv
import hashlib
import json
from collections import Counter
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
CONTENT = ROOT / "backend/app/curriculum/content"
FORMATS = {
    "I": "illustrated meaning",
    "D": "live diagram",
    "T": "explanatory table",
    "W": "worked example",
    "R": "reading alignment",
    "A": "sound-linked visual",
}


def read(path):
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def write_json(name, value):
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def cell(value):
    return str(value).replace("|", "/").replace("\n", " ")


manual = {}
for line in (HERE / "lesson-sequences.txt").read_text(encoding="utf-8").splitlines():
    if not line or line.startswith("#"):
        continue
    lesson_id, *parts = line.split(" | ")
    assert lesson_id not in manual, lesson_id
    modules = []
    for i, part in enumerate(parts, 1):
        kind, purpose = part.split(": ", 1)
        assert kind in FORMATS
        modules.append({
            "id": f"{lesson_id}.visual-{i}",
            "format": FORMATS[kind],
            "purpose": purpose,
            "status": "proposal; existing assets and widgets may be reused",
        })
    manual[lesson_id] = modules

units, lessons, cards, revision_rows, depth_cards, source_hashes = [], [], [], [], [], {}
for act_file in sorted((CONTENT / "acts").glob("*/act.yaml")):
    act = read(act_file)
    for part in act["parts"]:
        for unit_id in part["units"]:
            unit_file = act_file.parent / unit_id / "unit.yaml"
            unit = read(unit_file)
            entry = {
                "act": act["id"], "act_title": act["title"]["en"],
                "id": unit_id, "title": unit["title"]["en"], "skills": unit["skills"],
                "main_lessons": unit["lessons"], "revision": unit["revision"],
                "check": unit["check"], "reading": unit.get("reading"),
            }
            units.append(entry)
            ids = unit["lessons"] + [unit["revision"]]
            if unit.get("reading"):
                ids.append(unit["reading"])
            ids.append(unit["check"])
            for lesson_id in ids:
                path = unit_file.parent / f"{lesson_id}.yaml"
                lesson = read(path)
                relative = path.relative_to(ROOT).as_posix()
                source_hashes[relative] = hashlib.sha256(path.read_bytes()).hexdigest()
                lesson_entry = {
                    "act": act["id"], "unit": unit_id, "id": lesson_id,
                    "title": lesson["title"]["en"], "template": lesson["template"],
                    "source": relative, "cards": [], "modules": manual.get(lesson_id, []),
                    "scope": {
                        "scene": "Implement the named visual sequence; retain source examples and qualifications.",
                        "revision": "Reuse prior visual explanations; fully teach every new_here rule; add retrieval and error repair.",
                        "check": "Use explanatory visuals in post-answer feedback; preserve independent text answers.",
                        "episode": "Add line-specific context, grammatical alignment and a guided-to-independent reading sequence.",
                    }[lesson["template"]],
                }
                lessons.append(lesson_entry)
                for card in lesson["cards"]:
                    key = f"{lesson_id}#{card['id']}"
                    lesson_entry["cards"].append(key)
                    cards.append({
                        "act": act["id"], "unit": unit_id, "lesson": lesson_id,
                        "key": key, "kind": card["kind"], "depth": card.get("depth", "core"),
                        "image": card.get("image", {}).get("id"),
                        "content": card,
                    })
                    if card["kind"] == "teach" and card.get("depth") == "panini":
                        depth_cards.append({
                            "target": key, "act": act["id"], "unit": unit_id,
                            "title": card.get("title", {}).get("en"), "source_body": card["body"]["en"],
                            "sutras": card.get("sutras", []),
                            "review_plan": "Show the technical term or condition, a verified worked example and the limits of application. Use a derivation only where appropriate; do not turn every definition into a transformation.",
                        })
                    if card["kind"] == "revision":
                        for index, row in enumerate(card["rows"], 1):
                            revision_rows.append({
                                "target": key, "row": index, "act": act["id"], "unit": unit_id,
                                "skill": row.get("skill"), "new_here": bool(row.get("new_here")),
                                "taught_in": row.get("taught_in"), "rule": row.get("rule", {}).get("en"),
                                "formula": row.get("formula"), "example": row.get("example"),
                                "review_plan": "Author a full visual micro-explanation, a contrast and a checked example before assessment."
                                if row.get("new_here") else "Reuse the linked teaching visual, hide help for recall, and offer targeted explanation after response.",
                            })

expected = {l["id"] for l in lessons if l["template"] == "scene"}
assert set(manual) == expected, {"missing": sorted(expected - manual.keys()), "extra": sorted(manual.keys() - expected)}
keys = {c["key"] for c in cards}
assert all(not r["taught_in"] or r["taught_in"] in keys for r in revision_rows)
assert all(l["cards"] for l in lessons)
modules = [m for l in lessons for m in l["modules"]]
counts = Counter(c["kind"] for c in cards)

narrative = []
for path in [CONTENT / "prologue/prologue.yaml", *sorted((CONTENT / "tales").glob("*.yaml"))]:
    item = read(path)
    narrative.append({
        "id": item["id"], "title": item["title"]["en"], "cards": len(item["cards"]),
        "scope": "Retain narrative and existing art. Use a passage as a reading transfer task only after mapping its language to taught prerequisites.",
    })
    source_hashes[path.relative_to(ROOT).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()

act_rows = []
for act in sorted({u["act"] for u in units}):
    ul = [u for u in units if u["act"] == act]
    ll = [l for l in lessons if l["act"] == act]
    cc = [c for c in cards if c["act"] == act]
    mm = [m for l in ll for m in l["modules"]]
    act_rows.append({
        "act": act, "title": ul[0]["act_title"], "units": len(ul),
        "main_lessons": sum(l["template"] == "scene" for l in ll),
        "core_teaching_cards": sum(c["kind"] == "teach" and c["depth"] == "core" for c in cc),
        "proposed_modules": len(mm),
        "formats": dict(Counter(m["format"] for m in mm)),
        "new_revision_rules": sum(r["new_here"] and r["act"] == act for r in revision_rows),
    })

stats = {
    "review_date": "2026-10-20",
    "scope": "All current 44 units in authored course order. Prologue and seven tales tracked separately.",
    "counts_are": "Named planning modules, not generated files, missing-image counts, final UI cards, or proven learning improvements.",
    "units": len(units), "unit_lessons": len(lessons), "main_lessons": len(expected),
    "narrative_lessons": len(narrative), "all_course_lessons": len(lessons) + len(narrative),
    "unit_cards": len(cards), "cards_by_kind": dict(counts),
    "skills": sum(len(u["skills"]) for u in units),
    "proposed_main_lesson_modules": len(modules),
    "formats": dict(Counter(m["format"] for m in modules)),
    "revision_rows": len(revision_rows),
    "revision_rows_with_teaching_links": sum(bool(r["taught_in"]) for r in revision_rows),
    "new_here_revision_rules": sum(r["new_here"] for r in revision_rows),
    "optional_depth_teaching_cards": len(depth_cards),
    "acts": act_rows,
}
write_json("coverage.json", stats)
write_json("lesson-plan.json", {"units": units, "lessons": lessons, "narrative": narrative})
write_json("revision-review.json", revision_rows)
write_json("depth-review.json", depth_cards)
write_json("source-hashes.json", source_hashes)

with (HERE / "lesson-plan.csv").open("w", encoding="utf-8-sig", newline="") as stream:
    fields = ["act", "unit", "lesson", "title", "template", "module_count", "source_cards", "visual_sequence_or_scope"]
    writer = csv.DictWriter(stream, fieldnames=fields)
    writer.writeheader()
    for lesson in lessons:
        writer.writerow({
            "act": lesson["act"], "unit": lesson["unit"], "lesson": lesson["id"],
            "title": lesson["title"], "template": lesson["template"],
            "module_count": len(lesson["modules"]), "source_cards": "; ".join(lesson["cards"]),
            "visual_sequence_or_scope": " → ".join(m["format"] + ": " + m["purpose"] for m in lesson["modules"]) or lesson["scope"],
        })

with (HERE / "card-coverage.csv").open("w", encoding="utf-8-sig", newline="") as stream:
    writer = csv.writer(stream)
    writer.writerow(["act", "unit", "card", "kind", "depth", "existing_image", "review_action"])
    actions = {
        "story": "Keep context concise; connect existing art to language only where it actually explains it.",
        "teach": "Storyboard against the named lesson sequence; keep every example and qualification.",
        "table": "Choose image headers, pattern highlighting, focus view or worked cells; keep all source forms live.",
        "reading": "Map words, roles and meaning; add context and progressively remove support.",
        "explore": "Extend or reuse the widget for the lesson's explanatory sequence.",
        "practice": "Retain independent response; add targeted visual feedback or a scene prompt where useful.",
        "summary": "Reuse a compact visual reference and require recall before revealing it.",
        "revision": "Review each row in revision-review.json; new material needs full teaching.",
    }
    for c in cards:
        writer.writerow([c["act"], c["unit"], c["key"], c["kind"], c["depth"], c["image"], actions[c["kind"]]])

md = [
    "# Lesson-by-lesson visual teaching plan",
    "",
    "Each numbered item is a proposed teaching module. Several can share an illustration, and one can need multiple panels or states. These are not finished storyboards or generated image files.",
    "",
    "The sequence preserves full source teaching. Exact insertion points within cards must be determined during storyboarding; source card IDs are included for review.",
    "",
]
for unit in units:
    md += [f"## {unit['act']} — {unit['title']}", ""]
    for lesson in [l for l in lessons if l["unit"] == unit["id"]]:
        md += [f"### {lesson['id']} — {lesson['title']}", "", f"Source: `{lesson['source']}`", ""]
        if lesson["modules"]:
            md += [f"{i}. **{m['format']}**: {m['purpose']}." for i, m in enumerate(lesson["modules"], 1)]
        else:
            md += [lesson["scope"]]
        md += ["", "Cards: " + ", ".join(f"`{k}`" for k in lesson["cards"]), ""]
(HERE / "LESSON-PLAN.md").write_text("\n".join(md), encoding="utf-8")

matrix = [
    "# Unit coverage", "",
    "Counts below cover named main-lesson modules only. Revision, optional depth and checks are separate review work, not added to the module total.", "",
    "| Act | Unit | Main lessons | Core teaching cards | Tables | Named modules | New revision rules |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: |",
]
for unit in units:
    cc = [c for c in cards if c["unit"] == unit["id"]]
    mm = [m for l in lessons if l["unit"] == unit["id"] for m in l["modules"]]
    matrix.append("| " + " | ".join(map(cell, [
        unit["act"], unit["title"], len(unit["main_lessons"]),
        sum(c["kind"] == "teach" and c["depth"] == "core" for c in cc),
        sum(c["kind"] == "table" for c in cc), len(mm),
        sum(r["unit"] == unit["id"] and r["new_here"] for r in revision_rows),
    ])) + " |")
(HERE / "UNIT-COVERAGE.md").write_text("\n".join(matrix) + "\n", encoding="utf-8")

write_json("validation.json", {
    "main_lessons_planned": len(expected), "missing_main_lessons": [],
    "duplicate_module_ids": len(modules) != len({m["id"] for m in modules}),
    "all_revision_teaching_links_resolve": True,
    "source_lessons_hashed": len(source_hashes),
    "all_current_unit_cards_in_review_ledger": len(cards),
    "app_changed": False, "images_generated": 0,
    "validation_scope": "Coverage and source references only; proposed Sanskrit additions require authoring and review.",
})
print(json.dumps(stats, ensure_ascii=False, indent=2))
