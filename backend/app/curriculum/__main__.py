"""Course tools. Run from backend/ with PYTHONUTF8=1.

    python -m app.curriculum check            structure, story, coverage
    python -m app.curriculum check --engine   … plus every engine claim/exercise
    python -m app.curriculum check --release  … plus scholar sign-off and images
    python -m app.curriculum stats            what is written, planned, missing
    python -m app.curriculum images [--out F] [--missing]
                                              picture requests for ChatGPT (JSONL)
    python -m app.curriculum schema [--out F] JSON Schema of the content files

``check`` exits 1 when there is any error.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .loader import CONTENT_DIR, load
from .schema import Bible, ExploreCard, ImageRef, Lesson, PracticeCard, Unit
from .validate import walk
from .validate import errors, validate


def _check(args) -> int:
    data = load(CONTENT_DIR)
    issues = validate(data, release=args.release)
    if args.engine:
        from .engine import run as engine_run

        issues += engine_run(data)
    if args.release:
        issues += _audio_gaps(data)
    for i in issues:
        print(i)
    bad = errors(issues)
    print(f"\n{len(bad)} errors, {len(issues) - len(bad)} warnings")
    return 1 if bad else 0


def _audio_gaps(data) -> list:
    """Release warnings: letters and dialogue lines with no recorded clip (the sounds the course leans on)."""
    from . import audio
    from .loader import Issue
    from .pack import build

    items = audio.collect(build(data).lessons)
    out = []
    for tier in ("letter", "dialogue"):
        gaps = [it for it in items if it["tier"] == tier and audio.clip_key(it["text"]) not in data.audio]
        if gaps:
            sample = ", ".join(it["text"] for it in gaps[:5])
            out.append(Issue("warning", "audio/deliveries.json", f"{len(gaps)} {tier} string(s) have no recorded clip (e.g. {sample}); run scripts.render_story_audio"))
    return out


def _stats(_args) -> int:
    data = load(CONTENT_DIR)
    units = [loc.obj for loc in data.units.values()]
    ready = [u for u in units if u.status == "ready"]
    lessons = [loc.obj for loc in data.lessons.values()]
    cards = [c for l in lessons for c in l.cards]
    active = sum(1 for c in cards if isinstance(c, (PracticeCard, ExploreCard)))
    images = sum(1 for _ in all_images(data))
    planned = sum(len(u.planned) for u in units)
    print(f"acts {len(data.acts)} · units {len(units)} ({len(ready)} ready) · skills {sum(len(u.skills) for u in units)}")
    print(f"lessons written {len(lessons)} · planned {planned} · cards {len(cards)} · practice/explore {active} · pictures {images}")
    by_review: dict[str, int] = {}
    for l in lessons:
        by_review[l.review] = by_review.get(l.review, 0) + 1
    print("review:", ", ".join(f"{k} {v}" for k, v in sorted(by_review.items())))
    return 0


def all_images(data):
    """(where, ImageRef) for every picture in the course: cards, portraits,
    freed ghosts, leaves and map backdrops. Shared instructional pictures occur
    once in the canonical generation inventory, including nested figure/cell art."""
    seen = set()
    b: Bible | None = data.bible
    if b:
        for c in b.characters:
            if c.portrait:
                yield f"portrait:{c.id}", c.portrait
        for g in b.ghosts:
            if g.freed_image:
                yield f"freed:{g.id}", g.freed_image
        for leaf in b.leaves:
            if leaf.image:
                yield f"leaf:{leaf.id}", leaf.image
    for act_id, loc in data.acts.items():
        if loc.obj.map:
            yield f"map:{act_id}", loc.obj.map
    for lid, loc in data.lessons.items():
        for card in loc.obj.cards:
            for relative, value in walk(card):
                if isinstance(value, ImageRef) and value.id not in seen:
                    seen.add(value.id)
                    yield f"{lid}#{card.id}{'.'+relative if relative else ''}", value


def _images(args) -> int:
    """One request per picture, with the fixed style and the looks of every
    character and place in it, so ChatGPT draws the same cast every time."""
    data = load(CONTENT_DIR)
    bible: Bible | None = data.bible
    looks = {c.id: c.look for c in (bible.characters if bible else [])}
    places = {p.id: p.look for p in (bible.places if bible else [])}
    out = []
    for where, img in all_images(data):
        if args.missing and img.id in data.deliveries:
            continue
        out.append({
            "id": img.id,
            "for": where,
            "delivered": img.id in data.deliveries,
            "ratio": img.ratio,
            "style": bible.style if bible else "",
            "brief": img.brief,
            "cast": {c: looks.get(c, "") for c in img.cast},
            "place": {img.place: places.get(img.place, "")} if img.place else {},
            "text_in_image": img.text_in_image,
            "alt": img.alt.en,
        })
    lines = "\n".join(json.dumps(o, ensure_ascii=False) for o in out)
    if args.out:
        Path(args.out).write_text(lines + "\n", encoding="utf-8")
        print(f"{len(out)} picture requests → {args.out}")
    else:
        print(lines)
    return 0


def _audio(args) -> int:
    """Which Sanskrit strings have a recorded clip, by tier. ``--missing`` lists the rest."""
    from . import audio
    from .pack import build

    data = load()
    pk = build(data)
    items = audio.collect(pk.lessons)
    done = {it["text"] for it in items if audio.clip_key(it["text"]) in data.audio}
    live = {audio.clip_key(it["text"]) for it in items}
    stale = [k for k in data.audio if k not in live]
    print(f"{len(done)} of {len(items)} strings with a speaker have a clip ({len(data.audio)} clips listed, {len(stale)} no longer used by any lesson)")
    for tier in audio.TIERS:
        mine = [it for it in items if it["tier"] == tier]
        have = sum(1 for it in mine if it["text"] in done)
        print(f"  {tier:9} {have:5} / {len(mine)}")
    if args.missing:
        for it in items:
            if it["text"] not in done:
                print(json.dumps({"tier": it["tier"], "text": it["text"], "first": it["first"]}, ensure_ascii=False))
    return 0


def _schema(args) -> int:
    from .schema import WIDGET_PARAMS, Act, Course, ImageDelivery

    schema = {
        "course": Course.model_json_schema(),
        "act": Act.model_json_schema(),
        "unit": Unit.model_json_schema(),
        "lesson": Lesson.model_json_schema(),
        "bible": Bible.model_json_schema(),
        "image_delivery": ImageDelivery.model_json_schema(),
        "widget_params": {name: model.model_json_schema() for name, model in WIDGET_PARAMS.items()},
    }
    text = json.dumps(schema, ensure_ascii=False, indent=1)
    if args.out:
        Path(args.out).write_text(text, encoding="utf-8")
        print(f"schema → {args.out}")
    else:
        print(text)
    return 0


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="python -m app.curriculum")
    sub = p.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("check")
    c.add_argument("--engine", action="store_true")
    c.add_argument("--release", action="store_true")
    sub.add_parser("stats")
    i = sub.add_parser("images")
    i.add_argument("--out")
    i.add_argument("--missing", action="store_true", help="only pictures not delivered yet")
    a = sub.add_parser("audio")
    a.add_argument("--missing", action="store_true", help="list the strings without a clip")
    s = sub.add_parser("schema")
    s.add_argument("--out")
    args = p.parse_args(argv)
    return {"check": _check, "stats": _stats, "images": _images, "audio": _audio, "schema": _schema}[args.cmd](args)


if __name__ == "__main__":
    sys.exit(main())
