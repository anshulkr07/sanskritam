"""Editorial review must be explicit and keyed to stable unit IDs."""
import csv
from pathlib import Path

import pytest
import yaml

from scripts.import_course_videos import HEADERS, plan, youtube_id


def review(tmp_path, rows):
    root = tmp_path / "content"
    for uid in ("vowels", "consonants"):
        directory = root / uid
        directory.mkdir(parents=True)
        (directory / "unit.yaml").write_text(f"# Keep this comment\nid: {uid}\ntitle: स्वराः\n", encoding="utf-8")
    file = tmp_path / "review.csv"
    with file.open("w", newline="", encoding="utf-8-sig") as stream:
        writer = csv.writer(stream)
        writer.writerow(HEADERS)
        writer.writerows(rows)
    return file, root


def choice(uid="vowels", decision="Approved", url="https://youtu.be/UfNXkiaGX9I", start="", end=""):
    return [uid, decision, url, "Reviewed title", "Reviewed publisher", start, end]


def test_pending_replacements_and_rejections_never_change_content(tmp_path):
    for decision in ("Pending", "Replace", "Reject"):
        file, root = review(tmp_path / decision, [choice(decision=decision)])
        assert plan(file, root) == []


def test_approval_uses_replacement_and_clips_and_preserves_other_text(tmp_path):
    file, root = review(tmp_path, [choice(url="https://www.youtube.com/watch?v=OAFO1yRzlTU", start="5", end="65")])
    changes = plan(file, root)
    assert len(changes) == 1
    uid, original, video, text = changes[0]
    assert uid == "vowels"
    assert video["youtube_id"] == "OAFO1yRzlTU"
    assert (video["start"], video["end"]) == (5, 65)
    assert text.startswith("# Keep this comment\nid: vowels\ntitle: स्वराः\n")
    assert "video" not in yaml.safe_load(original.read_text(encoding="utf-8")), "plan is a dry run"
    original.write_text(text, encoding="utf-8")
    assert plan(file, root) == [], "reimporting the same approval is idempotent"
    file.write_text(file.read_text(encoding="utf-8-sig").replace("Reviewed title", "Changed title"), encoding="utf-8")
    changed = plan(file, root)[0][3]
    assert changed.count("\nvideo:") == 1
    assert yaml.safe_load(changed)["video"]["title"] == "Changed title"


@pytest.mark.parametrize("row", [choice(start="-1"), choice(start="1.5"), choice(start="60", end="30"), choice(end="0"), choice(url="https://youtube.com.evil.test/watch?v=UfNXkiaGX9I"), choice(url="https://youtube.com/playlist?list=abc"), choice(uid="unknown"), choice(decision="=TRUE")])
def test_invalid_approvals_fail_before_any_file_write(tmp_path, row):
    # Exercise the invalid field itself, not the duplicate-ID guard.
    if row[0] != "unknown":
        row = ["consonants", *row[1:]]
    file, root = review(tmp_path, [choice(), row])
    before = {p: p.read_bytes() for p in root.rglob("unit.yaml")}
    with pytest.raises(ValueError):
        plan(file, root)
    assert all(p.read_bytes() == data for p, data in before.items())


def test_duplicate_unit_ids_are_rejected_even_when_one_is_pending(tmp_path):
    file, root = review(tmp_path, [choice(), choice(decision="Pending")])
    with pytest.raises(ValueError, match="duplicate Unit ID"):
        plan(file, root)


@pytest.mark.parametrize("url", ["https://youtu.be/UfNXkiaGX9I?t=10", "https://m.youtube.com/watch?v=UfNXkiaGX9I", "https://www.youtube.com/embed/UfNXkiaGX9I", "https://www.youtube.com/shorts/UfNXkiaGX9I"])
def test_common_youtube_links(url):
    assert youtube_id(url) == "UfNXkiaGX9I"


def test_delivered_story_pictures_match_the_app_manifest():
    import json
    from app.curriculum.loader import CONTENT_DIR, load
    manifest = json.loads((Path(__file__).resolve().parents[2] / "mobile/src/story/artwork/manifest.json").read_text(encoding="utf-8"))
    deliveries = load(CONTENT_DIR).deliveries
    assert set(deliveries) == set(manifest)
    for key, selected in manifest.items():
        assert {field: getattr(deliveries[key], field) for field in selected} == selected
        assert deliveries[key].text_verified
