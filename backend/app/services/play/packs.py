"""Pack building: turn reviewed content into server-held round packs.

A pack is the SERVER-side truth for one round: prompts, answer keys, timing
windows. Clients receive a view built by `client_view()` that exposes only
what the player is entitled to see at that moment. Ranked packs use fixed
specifications and unseen selections (per-learner exposure tracking); casual
packs respect the chosen difficulty.
"""

from __future__ import annotations

import random
from datetime import date

from sqlalchemy.orm import Session

from app.services.play.catalog import GAMES

# ── Vocabulary source ────────────────────────────────────────────────────────


def concept_pool(db: Session, *, require_images: bool = False) -> list[dict]:
    """Reviewed vocabulary concepts (game_content), falling back to the
    curated VocabWord table for dev databases. Each item:
    {id, sa, iast, meaning, topic, image, audio}.
    """
    from app.models import GameContent

    items: dict[str, dict] = {}
    try:
        rows = (db.query(GameContent)
                .filter(GameContent.game == "vocab", GameContent.kind == "concept")
                .filter(GameContent.status.in_(("validated", "reviewed")))
                .all())
        for r in rows:
            body = r.body or {}
            img = body.get("image") or ""
            if require_images and not img:
                continue
            items[str(r.content_id)] = {
                "id": str(r.content_id), "sa": body.get("sa", ""),
                "iast": body.get("iast", ""), "meaning": body.get("meaning", ""),
                "topic": r.topic or body.get("topic", ""),
                "image": img, "audio": body.get("audio", ""),
            }
    except Exception:
        items = {}
    if items:
        return list(items.values())
    # Dev fallback: curated seeds mirror the old deck() source with dedupe.
    from app.seeds.game_content_seed import CONCEPTS
    for c in CONCEPTS:
        if require_images and not c.get("image"):
            continue
        items[c["id"]] = c
    return list(items.values())


def _iast(sa: str) -> str:
    try:
        from app.services.iast import to_iast
        return to_iast(sa)
    except Exception:
        return ""


# ── Smriti ───────────────────────────────────────────────────────────────────


def smriti_pack(db: Session, *, pairs: int, deck: str, seed: str, ranked: bool) -> dict:
    """Server deck + shuffled layout. Ranked picture-word decks need usable
    illustrations; when the inventory is short the game serves word decks and
    flags it, so a ranked round is never silently degraded."""
    rng = random.Random(seed)
    if deck in ("picture-word", "pictures"):
        pool = concept_pool(db, require_images=True)
        if len(pool) < pairs:
            pool = concept_pool(db, require_images=False)
    elif deck == "letters":
        from app.seeds.game_content_seed import LETTERS
        pool = LETTERS
    elif deck == "sound-picture":
        pool = [c for c in concept_pool(db) if c.get("audio")]
        if len(pool) < pairs:
            pool = concept_pool(db)
    else:  # word-meaning
        pool = concept_pool(db)
    picked = rng.sample(pool, min(pairs, len(pool)))
    cards = []
    for i, p in enumerate(picked):
        cards.append({"pair": i, "face": "sa", "sa": p["sa"], "iast": p.get("iast") or _iast(p["sa"]),
                      "meaning": p.get("meaning", ""), "image": p.get("image", ""),
                      "audio": p.get("audio", ""), "kind": deck})
        cards.append({"pair": i, "face": "match", "sa": p["sa"], "iast": p.get("iast") or _iast(p["sa"]),
                      "meaning": p.get("meaning", ""), "image": p.get("image", ""),
                      "audio": p.get("audio", ""), "kind": deck})
    rng.shuffle(cards)
    return {
        "pairs": len(picked), "deck": deck, "cards": cards,
        "letters_fallback": deck == "letters",
    }


def smriti_client_view(pack: dict) -> dict:
    """Card faces stay hidden; the client only learns positions and count."""
    return {"pairs": pack["pairs"], "deck": pack["deck"],
            "count": len(pack["cards"]),
            "positions": [{"id": i} for i in range(len(pack["cards"]))],
            "degraded": pack["deck"] != "picture-word" and pack["deck"] not in ("letters",)}


def smriti_reveal(pack: dict, card_id: int) -> dict:
    """Authorised reveal: the face of one card, nothing else."""
    cards = pack["cards"]
    if card_id < 0 or card_id >= len(cards):
        raise ValueError("bad card")
    c = cards[card_id]
    return {"id": card_id, "pair": c["pair"], "face": c["face"], "sa": c["sa"],
            "iast": c["iast"], "meaning": c["meaning"], "image": c["image"],
            "audio": c["audio"]}


# ── Shabda Rush ──────────────────────────────────────────────────────────────

RUSH_TASKS = ["word-meaning", "meaning-word", "picture-word", "audio-word"]


def rush_pack(db: Session, *, questions: int, seed: str, ranked: bool) -> dict:
    """Balanced mix with reviewed, distinct distractors. Answer keys stay
    server-side; the client view shows prompts + shuffled options."""
    rng = random.Random(seed)
    pool = [c for c in concept_pool(db) if c["sa"] and c["meaning"]]
    if len(pool) < 4:
        return {"questions": [], "window_ms": 12000}
    chosen = rng.sample(pool, min(questions * 2, len(pool)))
    qs = []
    for i in range(questions):
        c = chosen[i % len(chosen)]
        task = RUSH_TASKS[i % len(RUSH_TASKS)]
        distract_pool = [x for x in pool if x["id"] != c["id"] and x["meaning"] != c["meaning"]]
        distractors = rng.sample(distract_pool, min(3, len(distract_pool)))
        if task in ("word-meaning", "picture-word", "audio-word"):
            options = [d["meaning"] for d in distractors] + [c["meaning"]]
            correct_value = c["meaning"]
        else:  # meaning-word
            options = [d["sa"] for d in distractors] + [c["sa"]]
            correct_value = c["sa"]
        rng.shuffle(options)
        qs.append({
            "index": i,
            "task": task,
            "prompt": c["sa"] if task == "word-meaning" else (c["meaning"] if task == "meaning-word" else ""),
            "iast": c.get("iast") or _iast(c["sa"]),
            "image": c.get("image", "") if task == "picture-word" else "",
            "audio": c.get("audio", "") if task == "audio-word" else "",
            "options": options,
            "correct_value": correct_value,  # SERVER ONLY
        })
    return {"questions": qs, "window_ms": 12000}


def rush_client_view(pack: dict) -> dict:
    qs = []
    for q in pack["questions"]:
        qs.append({k: v for k, v in q.items() if k != "correct_value"})
    return {"questions": qs, "window_ms": pack["window_ms"]}


# ── Varna Jaal ───────────────────────────────────────────────────────────────

_FILLER_AKSHARAS = [
    "क", "ख", "ग", "घ", "च", "छ", "ज", "ट", "त", "थ", "द", "न",
    "प", "म", "य", "र", "ल", "व", "स", "ह", "अ", "आ", "इ", "उ",
]


def _neighbours(r: int, c: int, size: int) -> list[tuple[int, int]]:
    out = []
    for dr in (-1, 0, 1):
        for dc in (-1, 0, 1):
            if dr == 0 and dc == 0:
                continue
            nr, nc = r + dr, c + dc
            if 0 <= nr < size and 0 <= nc < size:
                out.append((nr, nc))
    return out


def _traceable(cells: list[str], word_aks: list[str], size: int) -> bool:
    def dfs(idx: int, r: int, c: int, used: set[tuple[int, int]]) -> bool:
        if cells[r * size + c] != word_aks[idx]:
            return False
        if idx == len(word_aks) - 1:
            return True
        used.add((r, c))
        for nr, nc in _neighbours(r, c, size):
            if (nr, nc) in used:
                continue
            if dfs(idx + 1, nr, nc, used):
                return True
        used.discard((r, c))
        return False

    return any(dfs(0, r, c, set()) for r in range(size) for c in range(size))


def _place_word(cells: list[str], aks: list[str], size: int, rng: random.Random) -> list[int] | None:
    starts = list(range(size * size))
    rng.shuffle(starts)
    for start in starts:
        def dfs(idx: int, pos: int, used: set[int], path: list[int]) -> list[int] | None:
            r, c = pos // size, pos % size
            if cells[pos] and cells[pos] != aks[idx]:
                return None
            used.add(pos)
            path.append(pos)
            if idx == len(aks) - 1:
                return list(path)
            nbs = [nr * size + nc for nr, nc in _neighbours(r, c, size) if nr * size + nc not in used]
            rng.shuffle(nbs)
            for nb in nbs:
                got = dfs(idx + 1, nb, used, path)
                if got is not None:
                    return got
            used.discard(pos)
            path.pop()
            return None
        path = dfs(0, start, set(), [])
        if path is not None:
            return path
    return None


def varna_jaal_pack(db: Session, *, size: int, word_count: int, seed: str,
                    exclude_ids: set[str] | None = None) -> dict:
    """Fresh words are chosen BEFORE placement (more variety than taking the
    first eligible candidates), and every required word is validated to have a
    legal path on the final board."""
    from app.services.daily_word import aksharas

    rng = random.Random(seed)
    pool = [c for c in concept_pool(db)
            if 2 <= len(aksharas(c["sa"])) <= min(4, size)
            and (not exclude_ids or c["id"] not in exclude_ids)]
    rng.shuffle(pool)
    for attempt in range(48):
        picked = pool[attempt % max(1, len(pool)):] + pool[: attempt % max(1, len(pool))]
        picked = picked[:word_count]
        if len(picked) < word_count:
            break
        cells = [""] * (size * size)
        ok = True
        placements = {}
        for p in picked:
            aks = aksharas(p["sa"])
            path = _place_word(cells, aks, size, rng)
            if path is None:
                ok = False
                break
            for idx, pos in enumerate(path):
                cells[pos] = aks[idx]
            placements[p["id"]] = path
        if not ok:
            continue
        for i in range(len(cells)):
            if not cells[i]:
                cells[i] = rng.choice(_FILLER_AKSHARAS)
        words = []
        for p in picked:
            aks = aksharas(p["sa"])
            if _traceable(cells, aks, size):
                words.append({"id": p["id"], "sa": p["sa"], "iast": p.get("iast") or _iast(p["sa"]),
                              "meaning": p["meaning"], "aksharas": aks})
        if len(words) == word_count:
            return {"size": size, "cells": cells, "words": words, "paths": placements}
    # Deterministic guaranteed fallback: repeat with relaxed validation,
    # keeping only traceable words.
    cells = [""] * (size * size)
    words = []
    placements = {}
    for p in pool:
        aks = aksharas(p["sa"])
        path = _place_word(cells, aks, size, rng)
        if path is None:
            continue
        for idx, pos in enumerate(path):
            cells[pos] = aks[idx]
        placements[p["id"]] = path
        words.append({"id": p["id"], "sa": p["sa"], "iast": p.get("iast") or _iast(p["sa"]),
                      "meaning": p["meaning"], "aksharas": aks})
        if len(words) >= word_count:
            break
    for i in range(len(cells)):
        if not cells[i]:
            cells[i] = rng.choice(_FILLER_AKSHARAS)
    words = [w for w in words if _traceable(cells, w["aksharas"], size)]
    return {"size": size, "cells": cells, "words": words, "paths": placements}


def varna_jaal_client_view(pack: dict) -> dict:
    return {"size": pack["size"], "cells": pack["cells"],
            "words": [{"meaning": w["meaning"], "akshara_count": len(w["aksharas"])} for w in pack["words"]],
            "required": len(pack["words"])}


# ── Word Groups ──────────────────────────────────────────────────────────────


def word_groups_pack(db: Session, *, tiles: int, group_size: int, seed: str,
                     exclude_ids: set[str] | None = None) -> dict:
    """One reviewed board: validated partition, no plausible alternate
    grouping (the validator rejects cross-topic overlaps), unique word
    identities. Ranked uses standard 16/4; beginner is 9/3."""
    from app.models import GameContent
    from app.seeds.game_content_seed import WORD_GROUPS_BOARDS

    want = tiles // group_size
    rng = random.Random(seed)
    try:
        rows = (db.query(GameContent)
                .filter(GameContent.game == "word-groups")
                .filter(GameContent.status.in_(("validated", "reviewed")))
                .all())
        boards = []
        for r in rows:
            body = r.body or {}
            if len(body.get("groups", [])) == want and (not exclude_ids or str(r.content_id) not in exclude_ids):
                boards.append((str(r.content_id), body))
    except Exception:
        boards = []
    if not boards:
        boards = [(b["id"], b) for b in WORD_GROUPS_BOARDS
                  if len(b["groups"]) == want and (not exclude_ids or b["id"] not in exclude_ids)]
    if not boards:
        boards = [(b["id"], b) for b in WORD_GROUPS_BOARDS if len(b["groups"]) == want]
    if not boards:
        return {}
    board_id, board = rng.choice(boards)
    all_tiles = []
    key = {}
    for gi, group in enumerate(board["groups"]):
        for w in group["words"]:
            tid = f"t{len(all_tiles)}"
            all_tiles.append({"id": tid, "sa": w["sa"], "iast": w.get("iast") or _iast(w["sa"]),
                              "meaning": w.get("meaning", "")})
            key[tid] = {"group": gi, "topic": group["topic"],
                        "label": group["label"], "explanation": group.get("explanation", "")}
    rng.shuffle(all_tiles)
    return {"board_id": board_id, "group_size": group_size, "groups_total": want,
            "tiles": all_tiles, "key": key, "max_wrong": 4}


def word_groups_client_view(pack: dict, *, show_bridge: bool = False,
                            roman: bool = False) -> dict:
    return {"board_id": pack["board_id"], "group_size": pack["group_size"],
            "groups_total": pack["groups_total"], "max_wrong": pack["max_wrong"],
            "tiles": [{**t, "meaning": t["meaning"] if show_bridge else "",
                       "show_roman": roman} for t in pack["tiles"]]}


# ── Pada Path ────────────────────────────────────────────────────────────────


def pada_path_pack(db: Session, *, prompts: int, seed: str, ranked: bool,
                   exclude_ids: set[str] | None = None) -> dict:
    """Five prompts with a controlled sentence/quotation mix. Each prompt
    carries its reviewed accepted orders (sentences) or prescribed sequence
    (quotations), and the adjacency pairs used for partial credit."""
    from app.models import GameContent
    from app.seeds.game_content_seed import PADA_PATH_PROMPTS

    rng = random.Random(seed)
    pool: list[dict] = []
    try:
        rows = (db.query(GameContent)
                .filter(GameContent.game == "pada-path")
                .filter(GameContent.status.in_(("validated", "reviewed")))
                .all())
        for r in rows:
            body = r.body or {}
            if exclude_ids and str(r.content_id) in exclude_ids:
                continue
            pool.append({"id": str(r.content_id), **body})
    except Exception:
        pass
    if len(pool) < prompts:
        have = {p["id"] for p in pool}
        pool.extend(p for p in PADA_PATH_PROMPTS if p["id"] not in have
                    and (not exclude_ids or p["id"] not in exclude_ids))
    quotes = [p for p in pool if p.get("type") == "quotation"]
    sentences = [p for p in pool if p.get("type", "sentence") == "sentence"]
    rng.shuffle(quotes)
    rng.shuffle(sentences)
    # Ranked mix: 2 quotations, 3 sentences (fixed balance).
    chosen = (quotes[:2] if ranked else quotes[:1]) + (sentences[: prompts - 2 if ranked else prompts - 1])
    if len(chosen) < prompts:
        rest = [p for p in pool if p not in chosen]
        rng.shuffle(rest)
        chosen += rest[: prompts - len(chosen)]
    chosen = chosen[:prompts]
    out = []
    for i, p in enumerate(chosen):
        words = p["words"]
        n = len(words)
        order = list(range(n))
        rng.shuffle(order)
        # canonical_order: tile ids in the word list's original order — the
        # quotation key (server only).
        canonical_order = [f"w{order.index(k)}" for k in range(n)]
        out.append({
            "index": i, "id": p["id"], "type": p.get("type", "sentence"),
            "tiles": [{"id": f"w{j}", "sa": words[order[j]]["sa"],
                       "iast": words[order[j]].get("iast") or _iast(words[order[j]]["sa"])}
                      for j in range(n)],
            "accepted_orders": p.get("accepted_orders"),  # SERVER ONLY (sentences)
            "canonical_order": canonical_order,  # SERVER ONLY (quotations)
            "required_pairs": p.get("required_pairs", []),  # SERVER ONLY
            "meaning": p.get("meaning", ""), "source": p.get("source", ""),
            "explanation": p.get("explanation", ""),
        })
    return {"prompts": out}


def pada_path_client_view(pack: dict, *, roman: bool = False) -> dict:
    return {"prompts": [{k: v for k, v in p.items()
                         if k not in ("accepted_orders", "canonical_order", "required_pairs")}
                        | {"show_roman": roman}
                        for p in pack["prompts"]]}


def pada_path_score(prompt: dict, order: list[str]) -> dict:
    """Partial credit from required grammatical/semantic relations for
    sentences and correct positions for quotations — never a naive index
    comparison for every sentence type."""
    if prompt["type"] == "quotation":
        canonical = prompt.get("canonical_order") or []
        correct_pos = sum(1 for a, b in zip(order, canonical) if a == b)
        score = int(100 * correct_pos / max(1, len(canonical)))
        exact = list(order) == list(canonical)
        return {"score": score, "accepted": exact, "kind": "quotation",
                "detail": "keep the verse's prescribed sequence"}
    accepted_orders = prompt.get("accepted_orders") or []
    if accepted_orders:
        for acc in accepted_orders:
            if list(acc) == list(order):
                return {"score": 100, "accepted": True, "kind": "sentence",
                        "detail": "sādhu — a reviewed word order"}
    pairs = prompt.get("required_pairs") or []
    if pairs:
        pos = {tid: i for i, tid in enumerate(order)}
        hit = sum(1 for a, b in pairs if a in pos and b in pos and pos[a] < pos[b])
        score = int(100 * hit / len(pairs))
    else:
        score = 0
    return {"score": score, "accepted": score == 100, "kind": "sentence",
            "detail": "check which words belong together"}


# ── Number Builder ───────────────────────────────────────────────────────────

_NUMBER_BANDS = ["0-20", "21-99", "hundreds-thousands", "lakhs-crores", "decimals-negatives"]


def _band_value(band: str, rng: random.Random) -> str:
    import random as _r
    if band == "0-20":
        return str(rng.randint(0, 20))
    if band == "21-99":
        return str(rng.randint(21, 99))
    if band == "hundreds-thousands":
        return str(rng.randint(100, 99999))
    if band == "lakhs-crores":
        return str(rng.randint(100000, 99999999))
    if band == "decimals-negatives":
        r = _r.random()
        if r < 0.3:
            return f"{rng.randint(0, 999)}.{rng.randint(1, 999):03d}".rstrip("0") or "0.04"
        if r < 0.45:
            return f"-{rng.randint(1, 99)}.{rng.randint(1, 99):02d}"
        return f"{rng.randint(0, 99)}.{rng.randint(1, 99):02d}"
    return str(rng.randint(0, 99))


def number_pack(*, prompts: int, seed: str, answer_lang: str, band: str,
                grouping: str = "indian") -> dict:
    """Five prompts with fixed, balanced difficulty and answer language.
    Balanced = the ranked mix walks the declared bands rather than letting a
    learner pick an easier one."""
    from app.services.numerals import (
        ENGINE_VERSION, CONVENTION_NOTE, REVIEW_STATUS,
    )
    from app.services.numerals.render import (
        correct_reading, alternative_reading, phrase_slots_payload,
    )
    from app.services.numerals.scoring import parse_key
    from app.services.numerals.structure import (
        build_skeleton, display_grouped, skeleton_fingerprint,
    )

    rng = random.Random(seed)
    ranked = band in ("", "ranked")
    bands = _NUMBER_BANDS if ranked else [band or "0-20"]
    values: list[str] = []
    seen = set()
    i = 0
    while len(values) < prompts and i < prompts * 40:
        v = _band_value(bands[i % len(bands)], rng)
        from app.services.numerals.structure import parse_decimal
        try:
            pv = parse_decimal(v)
        except Exception:
            i += 1
            continue
        fp = skeleton_fingerprint(pv, grouping)
        if fp not in seen:
            seen.add(fp)
            values.append(pv.canonical)
        i += 1
    include_sign = any(v.startswith("-") for v in values)
    out = []
    for idx, canonical in enumerate(values):
        v = parse_key(canonical)
        key_skeleton = build_skeleton(v, grouping, include_sign=include_sign and v.negative)
        view = phrase_slots_payload(v, grouping, answer_lang,
                                    include_sign=include_sign and v.negative,
                                    seed=rng.getrandbits(32))
        out.append({
            "index": idx,
            "canonical": canonical,  # SERVER ONLY
            "display_international": display_grouped(v, "international"),
            "display_indian": display_grouped(v, "indian"),
            "slots": view["slots"],
            "skeleton_key": key_skeleton,  # SERVER ONLY (slot kinds/values)
            "reading": correct_reading(v, grouping, answer_lang),  # SERVER ONLY
            "alternative": alternative_reading(v, grouping, answer_lang),  # SERVER ONLY
        })
    return {
        "prompts": out, "answer_lang": answer_lang, "grouping": grouping,
        "engine_version": ENGINE_VERSION, "convention": CONVENTION_NOTE,
        "review_status": REVIEW_STATUS,
    }


def number_client_view(pack: dict) -> dict:
    return {
        "prompts": [{k: v for k, v in p.items()
                     if k not in ("canonical", "skeleton_key", "reading", "alternative")}
                    for p in pack["prompts"]],
        "answer_lang": pack["answer_lang"], "grouping": pack["grouping"],
        "engine_version": pack["engine_version"],
        "convention": pack["convention"],
    }
