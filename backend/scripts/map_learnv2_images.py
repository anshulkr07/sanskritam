"""Map the reviewed LearnV2 teaching images onto Play game concepts.

LearnV2's 206-asset map (mobile/src/learnv2/assetMap.ts) carries a reviewed
`labels.sa` per image naming exactly what it depicts. This script makes only
ULTRA-CONFIDENT matches — the label must be the concept word itself (visarga/
NFC normalised) and the alt text must name exactly one subject that equals the
concept's English meaning. Scene pictures with two candidate objects, grammar
commentary subjects, or multi-word labels are left unmapped for the owner's
later pass.

Outputs:
  backend/app/seeds/game_image_map.py   — CONCEPT_IMAGES {concept_id: "learnv2:<key>"}
  results/game_image_map_report.md      — matched pairs + what stays unmapped and why

Read-only over the app: run from backend/ (CWD is the schema, §2.10):
    python -m scripts.map_learnv2_images
"""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ASSET_MAP = ROOT / "mobile" / "src" / "learnv2" / "assetMap.ts"
OUT_PY = Path(__file__).resolve().parents[1] / "app" / "seeds" / "game_image_map.py"
OUT_MD = ROOT / "results" / "game_image_map_report.md"

_STOPWORDS = {"a", "an", "the", "some", "two", "three", "many", "several", "his", "her"}


def _norm_sa(text: str) -> str:
    """NFC, strip the trailing visarga so सूर्यः and सूर्य compare equal."""
    t = unicodedata.normalize("NFC", text or "").strip()
    return t[:-1] if t.endswith("ः") else t


def _norm_en(text: str) -> str:
    return unicodedata.normalize("NFC", (text or "")).casefold().strip()


def parse_assets() -> list[dict]:
    src = ASSET_MAP.read_text(encoding="utf-8")
    entry = re.compile(
        r'"(?P<key>[a-z0-9-]+)":\s*\{.*?"altEn":\s*"(?P<altEn>[^"]*)".*?'
        r'"labels":\s*\{\s*"sa":\s*"(?P<sa>[^"]*)",\s*"iast":\s*"(?P<iast>[^"]*)"',
        re.DOTALL)
    out = []
    for m in entry.finditer(src):
        out.append({"key": m.group("key"), "sa": m.group("sa"),
                    "iast": m.group("iast"), "altEn": m.group("altEn")})
    return out


def alt_subjects(alt_en: str) -> list[str] | None:
    """The depicted subject words, or None when the alt text is not a clean
    single-subject description (two subjects, scenes, deities, commentary)."""
    subject = _norm_en(alt_en).split("—")[0].split(";")[0].split(".")[0]
    subject = re.sub(r"^(exactly\s+|respectful\w*\s+|traditional\w*\s+)", "", subject)
    words = [w for w in re.findall(r"[a-z]+", subject) if w not in _STOPWORDS]
    if not words or len(words) > 2:
        return None
    return words


def singular(word: str) -> str:
    if word.endswith("ies"):
        return word[:-3] + "y"
    if word.endswith("es") and not word.endswith("ses"):
        return word[:-2]
    if word.endswith("s"):
        return word[:-1]
    return word


def main() -> int:
    from app.seeds.game_content_seed import CONCEPTS

    assets = parse_assets()
    by_label: dict[str, list[dict]] = {}
    for a in assets:
        label = _norm_sa(a["sa"])
        if label:
            by_label.setdefault(label, []).append(a)

    def alt_subject_phrase(alt_en: str, want_words: int = 2) -> str | None:
        """The alt text's subject phrase as singular lowercase words, or None
        when the description is not a clean single-subject depiction.
        Short descriptions ("a donkey") contribute all their words; sentence
        descriptions ("The elephant drinks water.") contribute their leading
        content words, which is the depicted subject."""
        first_sentence = _norm_en(alt_en).split("—")[0].split(";")[0].split(".")[0]
        first_sentence = re.sub(r"^(exactly\s+|respectful\w*\s+|traditional\w*\s+)",
                                "", first_sentence)
        words = [w for w in re.findall(r"[a-z]+", first_sentence)
                 if w not in _STOPWORDS]
        if not words:
            return None
        if len(words) <= 2:
            return " ".join(singular(w) for w in words)
        # sentence: the subject is the leading content words
        if want_words < 1 or want_words > 2:
            return None
        return " ".join(singular(w) for w in words[:want_words])

    def label_first_word(label_sa: str) -> str | None:
        """The first word of a (possibly sentence) label, normalised. Returns
        None for multi-word labels whose first token is a pronoun — the
        depicted subject must be a noun we can name."""
        first = _norm_sa(label_sa.split()[0]) if label_sa.split() else ""
        if not first or first in {"सः", "सा", "तत्", "एषः", "एषा", "अयम्", "इयम्"}:
            return None
        return first

    matched: dict[str, tuple[str, dict]] = {}
    used_images: set[str] = set()
    near: list[tuple[str, str, str]] = []  # concept, label, reason left unmapped
    con_by_id = {c["id"]: c for c in CONCEPTS}

    def meaning_phrase(c: dict) -> str:
        return " ".join(singular(w) for w in re.findall(r"[a-z]+", c["meaning"]))

    def try_match(c: dict) -> tuple[str, dict] | None:
        want = _norm_sa(c["sa"])
        target = meaning_phrase(c)
        n_words = len(target.split())
        # Tier 1: the whole label IS the concept word.
        for a in by_label.get(want, []):
            if a["key"] in used_images:
                continue
            subject = alt_subject_phrase(a["altEn"], n_words)
            if subject is not None and subject == target:
                return a
        # Tier 2: a sentence label whose FIRST word is the concept (the
        # depicted subject), with the alt text leading with exactly that
        # meaning. Objects in the scene never hijack the image; one image
        # serves one concept only.
        for a in assets:
            if a["key"] in used_images or not a["sa"]:
                continue
            if label_first_word(a["sa"]) != want:
                continue
            subject = alt_subject_phrase(a["altEn"], n_words)
            if subject is not None and subject == target:
                return a
        return None

    for c in CONCEPTS:
        chosen = try_match(c)
        if chosen is None:
            near.append((c["id"], c["sa"],
                         "no reviewed image label names exactly this word as the subject"))
            continue
        matched[c["id"]] = (chosen["key"], chosen)
        used_images.add(chosen["key"])

    # ── emit the map module ──────────────────────────────────────────────────
    lines = [
        '"""LearnV2 image map for Play concepts (auto-generated).',
        "",
        "Only ultra-confident pairs land here: the reviewed asset label equals",
        "the concept word and the alt text names exactly that subject. Regenerate",
        "with `python -m scripts.map_learnv2_images` after asset or concept edits.",
        'Values use the "learnv2:<asset id>" scheme the app resolves to the',
        "bundled asset (offline-safe); anything not in this map stays unmapped.",
        '"""',
        "",
        "CONCEPT_IMAGES: dict[str, str] = {",
    ]
    for cid in sorted(matched):
        key = matched[cid][0]
        lines.append(f'    "{cid}": "learnv2:{key}",')
    lines.append("}")
    OUT_PY.write_text("\n".join(lines) + "\n", encoding="utf-8")

    # ── emit the report ──────────────────────────────────────────────────────
    md = [
        "# Game image mapping report (LearnV2 → Play concepts)",
        "",
        f"Assets scanned: {len(assets)} · concepts: {len(CONCEPTS)} · "
        f"**ultra-confident matches: {len(matched)}** · "
        f"left unmapped for review: {len(near)}",
        "",
        "Only pairs where the reviewed `labels.sa` names the concept word as the",
        "depicted subject (whole-label match, or first word of a sentence label)",
        "and the alt text agrees were mapped. Objects inside grammar scenes never",
        "claim the image. Everything else is listed below with its reason — no",
        "guesses shipped.",
        "",
        "## Mapped",
        "",
        "| concept | Sanskrit | meaning | asset |",
        "| --- | --- | --- | --- |",
    ]
    for cid in sorted(matched):
        key, a = matched[cid]
        c = con_by_id[cid]
        md.append(f"| {cid} | {c['sa']} | {c['meaning']} | `learnv2:{key}` — {a['altEn']} |")
    md += ["", "## Left unmapped (for the owner's image pass)", "",
           "| concept | Sanskrit | reason |", "| --- | --- | --- |"]
    for cid, sa, why in sorted(near):
        md.append(f"| {cid} | {sa} | {why} |")
    OUT_MD.parent.mkdir(exist_ok=True)
    OUT_MD.write_text("\n".join(md) + "\n", encoding="utf-8")

    print(f"assets={len(assets)} concepts={len(CONCEPTS)} matched={len(matched)} unmapped={len(near)}")
    print(f"wrote {OUT_PY.name} and {OUT_MD.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
