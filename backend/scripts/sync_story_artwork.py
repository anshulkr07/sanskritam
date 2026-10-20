"""Link the app's selected Learn paintings to the backend delivery registry.

The app manifest selects a version; verified delivery records prove its hashes,
text review and provenance. Never infer verification from a URL alone.
    python scripts/sync_story_artwork.py --apply
    python scripts/sync_story_artwork.py --check
Run after publishing or replacing Learn paintings.
"""
import argparse
import hashlib
import json
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / "mobile/src/story/artwork"
TARGET = ROOT / "backend/app/curriculum/content/images/deliveries.yaml"


def selected_deliveries():
    manifest = json.loads((APP / "manifest.json").read_text(encoding="utf-8"))
    records = []
    for source in (APP / "deliveries.json", ROOT / "specs/learn-art-20261020/deliveries.json"):
        records.extend(json.loads(source.read_text(encoding="utf-8")))
    out = []
    for key, selected in sorted(manifest.items()):
        matches = [r for r in records if r["id"] == key and all(r["variants"][v]["uri"] == selected[v] for v in ("phone", "tablet"))]
        if not matches or len({r["sha256"] for r in matches}) != 1:
            raise ValueError(f"{key}: missing or conflicting provenance for the selected URLs")
        # A verified replacement can also be carried forward into the older
        # delivery index. Matching hashes identify the same painting.
        record = matches[-1]
        if not record.get("text_verified") or record.get("master_retained") is not False:
            raise ValueError(f"{key}: text review or original cleanup is not verified")
        for variant in record["variants"].values():
            file = Path(variant["file"])
            if not variant.get("verified") or hashlib.sha256(file.read_bytes()).hexdigest() != variant["sha256"]:
                raise ValueError(f"{key}: derivative verification/hash mismatch: {file.name}")
        if (selected["width"], selected["height"]) != (record["width"], record["height"]):
            raise ValueError(f"{key}: selected dimensions differ from provenance")
        out.append({"id": key, **selected, "sha256": record["sha256"], "text_verified": True, "prompt": record["prompt"]})
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--apply", action="store_true")
    mode.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = selected_deliveries()
    if args.apply:
        TARGET.parent.mkdir(parents=True, exist_ok=True)
        TARGET.write_text(yaml.safe_dump(expected, allow_unicode=True, sort_keys=False), encoding="utf-8")
    actual = yaml.safe_load(TARGET.read_text(encoding="utf-8")) if TARGET.exists() else []
    if actual != expected:
        raise SystemExit("Backend/app artwork registry differs. Run --apply after checking the selected deliveries.")
    print(f"{len(expected)} selected paintings linked; both local derivative hashes and text review verified.")


if __name__ == "__main__":
    main()
