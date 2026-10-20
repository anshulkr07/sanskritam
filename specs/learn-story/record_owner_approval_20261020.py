"""Record the owner's explicit current-content sign-off without changing Sanskrit."""
import hashlib
import json
import os
from pathlib import Path
import re
import time

import yaml

ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT / "backend/app/curriculum/content"
STATEMENT = "I approve everything, also I have reviewed the dialogues and then snaskrit scholars have done."


def sha(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


if __name__ == "__main__":
    plans = []
    lessons = []
    for path in sorted(CONTENT.rglob("*.yaml")):
        text = path.read_text(encoding="utf-8")
        raw = yaml.safe_load(text)
        if not isinstance(raw, dict) or "template" not in raw or "cards" not in raw:
            continue
        assert raw.get("review") in ("engine_ok", "scholar_ok"), str(path)
        updated, count = re.subn(r"(?m)^review: (?:engine_ok|scholar_ok)$", "review: scholar_ok", text)
        assert count == 1, str(path)
        after = yaml.safe_load(updated)
        before_material = {k: v for k, v in raw.items() if k != "review"}
        assert {k: v for k, v in after.items() if k != "review"} == before_material
        material = json.dumps(before_material, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        lessons.append({"id": raw["id"], "path": path.relative_to(ROOT).as_posix(), "template": raw["template"], "previous_review": raw["review"], "review": "scholar_ok", "reviewed_material_sha256": sha(material)})
        if text != updated:
            plans.append((path, text, updated))
    assert len(lessons) == 238, "Approval applies to the 238 current authored lessons"
    for path, before, after in plans:
        temporary = path.with_suffix(".approval-tmp")
        for attempt in range(8):
            try:
                assert path.read_text(encoding="utf-8") == before, str(path) + " changed during approval"
                temporary.write_text(after, encoding="utf-8")
                os.replace(temporary, path)
                break
            except OSError:
                if attempt == 7:
                    raise
                time.sleep(0.15)
    record = {
        "date": "2026-10-20", "timezone": "Asia/Calcutta", "source": "Explicit owner statement in this chat",
        "statement": STATEMENT, "dialogue_review": "Owner confirms review complete for current authored dialogue",
        "sanskrit_review": "Owner reports Sanskrit scholars have completed review of current authored content",
        "lesson_count": len(lessons), "lessons": lessons,
        "video_approval": "All 44 current Chosen selections in the review workbook approved, with the existing clip fields. Blank bounds retain full-video playback.",
        "native_phone_testing": "Not verified by this sign-off", "screen_reader_testing": "Not verified by this sign-off",
        "future_content": "New or changed Sanskrit requires its own review. This sign-off covers the material hashes above, not the 40 unwritten unit episodes.",
    }
    target = Path(__file__).with_name("owner-approval-20261020.json")
    target.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"reviewed_lessons": len(lessons), "updated_review_fields": len(plans), "approval_record": str(target.relative_to(ROOT))}))
