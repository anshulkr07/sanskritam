"""Import manually approved rows from the video review XLSX or CSV.

Dry-run by default. Run from backend/:
    python scripts/import_course_videos.py ../outputs/learn-video-review/videos.xlsx
    python scripts/import_course_videos.py reviewed.csv --apply

Only Decision=Approved rows are applied. No network, database or deployment
changes. All rows are validated before any content file is changed.
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import re
import sys
import zipfile
from decimal import Decimal, InvalidOperation
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from xml.etree import ElementTree as ET

import yaml

CONTENT = Path(__file__).resolve().parents[1] / "app/curriculum/content"
HEADERS = ("Unit ID", "Decision", "Chosen URL", "Chosen title", "Chosen channel", "Start seconds", "End seconds")
NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def _xlsx_rows(path: Path):
    with zipfile.ZipFile(path) as archive:
        strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            strings = ["".join(n.itertext()) for n in ET.fromstring(archive.read("xl/sharedStrings.xml")).findall("s:si", NS)]
        book = ET.fromstring(archive.read("xl/workbook.xml"))
        sheets = book.findall("s:sheets/s:sheet", NS)
        chosen = next((s for s in sheets if s.attrib["name"] == "Video review"), None)
        if chosen is None:
            raise ValueError("Workbook must contain a 'Video review' sheet")
        relid = chosen.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
        rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        target = next(r.attrib["Target"] for r in rels if r.attrib["Id"] == relid)
        target = target.lstrip("/") if target.startswith("/") else "xl/" + target
        for row in ET.fromstring(archive.read(target)).findall("s:sheetData/s:row", NS):
            cells = {}
            for cell in row.findall("s:c", NS):
                col = 0
                for letter in re.match(r"[A-Z]+", cell.attrib["r"])[0]:
                    col = col * 26 + ord(letter) - 64
                value = cell.findtext("s:v", default="", namespaces=NS)
                if cell.attrib.get("t") == "s":
                    value = strings[int(value)]
                elif cell.attrib.get("t") == "inlineStr":
                    value = "".join(cell.find("s:is", NS).itertext())
                # Approval and chosen inputs must be actual values, not formulas.
                if cell.find("s:f", NS) is not None:
                    value = "=FORMULA"
                cells[col - 1] = value
            yield [cells.get(i, "") for i in range(max(cells, default=-1) + 1)]


def read_rows(path: Path):
    if path.suffix.lower() == ".xlsx":
        source = _xlsx_rows(path)
    elif path.suffix.lower() == ".csv":
        source = csv.reader(io.StringIO(path.read_text(encoding="utf-8-sig")))
    else:
        raise ValueError("Use an .xlsx or UTF-8 .csv file")
    headers = None
    for number, row in enumerate(source, 1):
        if headers is None:
            if set(HEADERS).issubset(row):
                headers = row
            continue
        if not any(str(v).strip() for v in row):
            continue
        yield number, {h: str(row[i]).strip() if i < len(row) else "" for i, h in enumerate(headers)}
    if headers is None:
        raise ValueError("Missing review table headers: " + ", ".join(HEADERS))


def youtube_id(value: str) -> str:
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", value):
        return value
    url = urlparse(value)
    if url.scheme != "https" or url.username or url.password or url.port:
        raise ValueError("Chosen URL must be an HTTPS YouTube video URL")
    host = url.hostname
    parts = url.path.strip("/").split("/")
    if host == "youtu.be" and len(parts) == 1:
        video = parts[0]
    elif host in ("youtube.com", "www.youtube.com", "m.youtube.com"):
        video = parse_qs(url.query).get("v", [""])[0] if url.path == "/watch" else (parts[1] if len(parts) == 2 and parts[0] in ("embed", "shorts", "live") else "")
    else:
        video = ""
    if not re.fullmatch(r"[A-Za-z0-9_-]{11}", video):
        raise ValueError("Chosen URL must identify one YouTube video, not a playlist or search")
    return video


def seconds(value: str, label: str):
    if not value:
        return None
    try:
        n = Decimal(value)
        if not n.is_finite() or n < 0 or n != int(n):
            raise ValueError
        return int(n)
    except (InvalidOperation, ValueError, OverflowError):
        raise ValueError(label + " must be blank or whole non-negative seconds") from None


def plan(path: Path, root: Path = CONTENT):
    units = {}
    for file in root.rglob("unit.yaml"):
        raw = yaml.safe_load(file.read_text(encoding="utf-8"))
        units[raw["id"]] = (file, raw)
    seen, changes = set(), []
    for number, row in read_rows(path):
        uid, decision = row.get("Unit ID", ""), row.get("Decision", "") or "Pending"
        if uid not in units:
            raise ValueError(f"Row {number}: unknown Unit ID {uid!r}")
        if uid in seen:
            raise ValueError(f"Row {number}: duplicate Unit ID {uid!r}")
        seen.add(uid)
        if decision not in ("Pending", "Approved", "Replace", "Reject"):
            raise ValueError(f"Row {number}: unrecognized Decision {decision!r}")
        if decision != "Approved":
            continue
        try:
            video = {"youtube_id": youtube_id(row["Chosen URL"]), "title": row["Chosen title"], "channel": row["Chosen channel"]}
            if not video["title"] or not video["channel"] or any(str(v).startswith("=") for v in video.values()):
                raise ValueError("Chosen title and channel must contain plain text")
            if "verify" in video["channel"].lower():
                raise ValueError("Confirm the actual publisher in Chosen channel before approving")
            start, end = seconds(row["Start seconds"], "Start"), seconds(row["End seconds"], "End")
            if end is not None and end <= (start or 0):
                raise ValueError("End seconds must be greater than Start seconds")
            if start is not None:
                video["start"] = start
            if end is not None:
                video["end"] = end
        except ValueError as exc:
            raise ValueError(f"Row {number} ({uid}): {exc}") from None
        file, raw = units[uid]
        if raw.get("video") != video:
            text = file.read_text(encoding="utf-8")
            # Replace only the top-level video field, preserving comments,
            # Sanskrit and all unrelated formatting in the original unit file.
            text = re.sub(r"(?m)^video:[^\n]*(?:\n(?:[ \t].*|[ \t]*))*(?:\n|$)", "", text)
            text = text.rstrip() + "\n" + yaml.safe_dump({"video": video}, allow_unicode=True, sort_keys=False)
            changes.append((uid, file, video, text))
    return changes


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("review", type=Path)
    parser.add_argument("--apply", action="store_true", help="Write approved, validated choices into unit YAML files")
    args = parser.parse_args(argv)
    try:
        changes = plan(args.review)
        print(json.dumps({"mode": "apply" if args.apply else "dry-run", "changed_units": [{"id": uid, **video} for uid, _, video, _ in changes]}, ensure_ascii=False, indent=2))
        if args.apply:
            for _, file, _, text in changes:
                file.write_text(text, encoding="utf-8")
        print(f"{len(changes)} approved change(s)." + (" Refresh the app's course index after deploying the backend." if args.apply else " No files changed. Use --apply after review."))
        return 0
    except (ValueError, KeyError, ET.ParseError, zipfile.BadZipFile) as exc:
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
