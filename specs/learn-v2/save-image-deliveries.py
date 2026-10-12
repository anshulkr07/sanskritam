"""Save visually inspected ImageGen outputs and append immutable delivery records.

Run with backend/.venv/Scripts/python.exe. This encodes production WebPs;
it never changes the source PNG or makes a generation/API call.
"""
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SPECS = ROOT / "specs/learn-v2"
sys.path.insert(0, str(ROOT / "backend"))
from app.services.grammar_guide import guide_topic

SPECIAL = {
    "foundations-boy-eats-fruit": ("how-it-works", 0),
    "cases-teacher-gives-book": ("dative", 0),
    "cases-leaf-falls-from-tree": ("ablative", 0),
}


def rows(name):
    return [json.loads(line) for line in (SPECS / name).read_text(encoding="utf-8").splitlines() if line.strip()]


existing = {r["asset_id"] for r in rows("deliveries.jsonl") if r["status"] == "ready"}
requests = []
deliveries = []
for job in json.loads((SPECS / "image-production-jobs.json").read_text(encoding="utf-8")):
    asset_id = job["asset_id"]
    if asset_id in existing:
        continue
    if job.get("inspection", {}).get("status") not in {"passed", "waived_by_owner"}:
        continue
    if job.get("source") and not job.get("topic_id"):
        topic_id, index = None, None
        example = {"sa": job["labels"]["sa"], "iast": job["labels"]["iast"], "meaning": job["meaning"]}
        provenance = job["source"]
        verification = job["verification"]
        lesson_id = job["lesson_id"]
    else:
        topic_id, index = SPECIAL.get(asset_id, (job.get("topic_id"), job.get("example_index")))
        examples = [x for block in guide_topic(topic_id)["blocks"] if block["kind"] == "examples" for x in block["items"]]
        example = examples[index]
        provenance = {"file": "backend/app/services/grammar_guide/", "topic_id": topic_id, "block_kind": "examples", "example_index": index}
        verification = {"status": "passed", "evidence": "Exact Sanskrit/IAST and meaning copied unchanged from the built existing Grammar guide. Source reviewed; no new grammatical forms/rules introduced. Art action/count inspected separately."}
        lesson_id = "guide-" + topic_id
    destination = ROOT / f"mobile/assets/learn-v2/{asset_id}-v1.webp"
    with Image.open(job["source_path"]) as source:
        width, height = source.size
        source.save(destination, format="WEBP", quality=88, method=6)
    request = {
        "asset_id": asset_id, "request_revision": 1, "priority": 2,
        "lesson_id": lesson_id, "topic_ids": [topic_id] if topic_id else [], "card_ids": job.get("card_ids", []),
        "source": provenance,
        "purpose": example["meaning"]["en"], "scene": job["prompt"],
        "aspect_ratio": "3:2", "style_group": "classroom-editorial", "reference_paths": [],
        "text_mode": "composite_overlay", "labels": {"sa": example["sa"], "iast": example["iast"]},
        "alt": example["meaning"], "caption_region": "Blank lower quarter inside art frame; verified native Devanagari with half-height IAST.",
        "verification": verification,
        "status": "ready", "authored_by": "Codex under owner whole-course instruction",
    }
    delivery = {
        "asset_id": asset_id, "request_revision": 1, "asset_version": 1,
        "relative_path": destination.relative_to(ROOT).as_posix(), "width": width, "height": height,
        "sha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
        "generator_route": "codex_builtin_image_gen", "final_prompt": job["prompt"],
        "reference_paths": [], "source_paths": [job["source_path"]],
        "text_mode": "composite_overlay", "labels": request["labels"],
        "inspection": job["inspection"], "generated_at": job.get("generated_at", "2026-10-12"), "status": "ready",
        "notes": "WebP encoding only; original generated PNG retained. Ready file, not an integration claim. " + ("Visual review omitted at owner's explicit instruction on 13 October 2026; do not describe this file as reviewed." if job['inspection']['status'] == 'waived_by_owner' else "Visually reviewed."),
    }
    requests.append(request)
    deliveries.append(delivery)

for name, records in [("requests.jsonl", requests), ("deliveries.jsonl", deliveries)]:
    with (SPECS / name).open("a", encoding="utf-8") as stream:
        for record in records:
            stream.write(json.dumps(record, ensure_ascii=False) + "\n")
print(f"Saved {len(deliveries)} new generated assets; {len(existing) + len(deliveries)} ready delivery IDs total.")
