"""What an explore card ships: its params plus everything the engine must
supply, computed once at build time.

The app's widgets never decide Sanskrit. A mouth map gets each letter's
places from ``phonetics``; a form explorer gets every cell of its grid from
the engine; a word factory gets every root + suffix result; a rhythm tapper
gets the engine's light/heavy scan; a derivation stepper gets each sūtra
step. Every Sanskrit string in the result is listed in ``iast`` so the
widget can show the Roman letters under anything it displays (including
every join a letter builder can make).

``compute`` also returns problems: anything the engine could not make. The
course checker reports them (``engine.check_widgets``); the pack ships what
was made and leaves the rest out.
"""

from __future__ import annotations

import re
from typing import Any

from .phonetics import PLACE_NAMES, places_for
from .schema import (
    DerivationStepperParams, ExploreCard, FormExplorerParams, LetterBuilderParams,
    MouthMapParams, RhythmTapperParams, WordFactoryParams, widget_params,
)

DEVANAGARI = re.compile(r"[ऀ-ॿ]")

#: kṛt suffixes whose words are indeclinable (no gender, case or number).
AVYAYA_KRT = {"ktvA", "lyap", "tumun", "Ramul"}

_VIBHAKTI_ORDER = ["Prathama", "Dvitiya", "Trtiya", "Caturthi", "Panchami", "Sasthi", "Saptami", "Sambodhana"]
_VACANA_ORDER = ["Eka", "Dvi", "Bahu"]


def _strings(node: Any):
    if isinstance(node, str):
        if DEVANAGARI.search(node):
            yield node
    elif isinstance(node, dict):
        for k, v in node.items():
            if k not in ("en", "hi"):  # learner-language text is not Sanskrit
                yield from _strings(v)
    elif isinstance(node, list):
        for v in node:
            yield from _strings(v)


def _strip_checks(node: Any) -> Any:
    """Engine claims are server-only, inside params as everywhere else."""
    if isinstance(node, dict):
        return {k: _strip_checks(v) for k, v in node.items() if k != "check"}
    if isinstance(node, list):
        return [_strip_checks(v) for v in node]
    return node


def _iast_map(out: dict, extra: list[str] = ()) -> dict[str, str]:
    from app.services.iast import to_iast

    return {s: to_iast(s) for s in sorted(set(_strings(out)) | set(extra))}


def _noun_grid(stem: str, linga: str, stem_type, vibhaktis: list[str], vacanas: list[str]) -> tuple[list, list[str]]:
    from app.services import prakriya

    grid = prakriya.paradigm(pratipadika=stem, linga=linga, stem_type=stem_type)
    rows, missing = [], []
    for row in grid.get("rows", []):
        cells = []
        for cell in row:
            if vibhaktis and cell["vibhakti"] not in vibhaktis:
                continue
            if vacanas and cell["vacana"] not in vacanas:
                continue
            if not cell.get("form"):
                missing.append(f"{stem} {linga} {cell['vibhakti']} {cell['vacana']}")
            cells.append({"vibhakti": cell["vibhakti"], "vacana": cell["vacana"], "form": cell.get("form")})
        if cells:
            rows.append(cells)
    return rows, missing


def _verb_grid(dhatu: str, lakara: str, gana, prayoga, vacanas: list[str]) -> tuple[list, list[str]]:
    from app.services import prakriya

    grid = prakriya.paradigm(dhatu=dhatu, lakara=lakara, gana=gana, prayoga=prayoga)
    rows, missing = [], []
    for row in grid.get("rows", []):
        cells = []
        for cell in row:
            purusha = cell["vibhakti"].split(".")[0]
            if vacanas and cell["vacana"] not in vacanas:
                continue
            if not cell.get("form"):
                missing.append(f"{dhatu} {lakara} {purusha} {cell['vacana']}")
            cells.append({"purusha": purusha, "vacana": cell["vacana"], "form": cell.get("form")})
        if cells:
            rows.append(cells)
    return rows, missing


def compute(card: ExploreCard) -> tuple[dict, list[str]]:
    """(what the app receives as ``params``, problems the checker reports).
    Raises only when the params do not fit the widget's shape, which the
    checker reports first."""
    p = widget_params(card)
    out: dict[str, Any] = _strip_checks(p.model_dump(exclude_none=True))
    problems: list[str] = []
    extra: list[str] = []

    if isinstance(p, LetterBuilderParams):
        # Every join the learner can make, so its Roman letters are ready.
        extra += [b + s for b in p.bases for s in p.signs]
        extra += [h + b for h in p.halves for b in p.bases]
        extra += [h + b + s for h in p.halves for b in p.bases for s in p.signs]

    elif isinstance(p, MouthMapParams):
        out["places"] = places_for(p.letters)
        used = sorted({pl for x in out["places"].values() for pl in x})
        out["place_names"] = {k: PLACE_NAMES[k] for k in used}
        for x in p.letters:
            if x not in out["places"]:
                problems.append(f"no place for {x}")

    elif isinstance(p, FormExplorerParams):
        paradigms = []
        for st in p.stems:
            rows, missing = _noun_grid(st.stem, st.linga, st.stem_type, p.vibhaktis, p.vacanas)
            problems += [f"the engine has no form for {m}" for m in missing]
            paradigms.append({"stem": st.stem, "linga": st.linga, "rows": rows})
        for rt in p.roots:
            for lakara in rt.lakaras:
                rows, missing = _verb_grid(rt.dhatu, lakara, rt.gana, rt.prayoga, p.vacanas)
                problems += [f"the engine has no form for {m}" for m in missing]
                paradigms.append({"dhatu": rt.dhatu, "lakara": lakara, "rows": rows})
        out["paradigms"] = paradigms

    elif isinstance(p, WordFactoryParams):
        from app.services import prakriya

        results = {}
        for rt in p.roots:
            for sf in p.suffixes:
                kw: dict[str, Any] = {"dhatu": rt.dhatu, "krt": sf.krt, "gana": rt.gana}
                if sf.krt not in AVYAYA_KRT:
                    kw.update(linga=p.linga, vibhakti="Prathama", vacana="Eka")
                forms = prakriya.derive_forms(**kw)
                if forms:
                    results[f"{rt.dhatu}|{sf.krt}"] = forms[0]
                else:
                    problems.append(f"the engine makes nothing from {rt.dhatu} + {sf.krt}")
        out["results"] = results

    elif isinstance(p, RhythmTapperParams):
        from app.services import chandas

        scans = []
        for line in p.lines:
            scanned = chandas.scan(line)
            syl = [s for ln in scanned.get("lines") or [] for s in ln.get("syllables", [])]
            if not syl:
                problems.append(f"the engine could not scan {line}")
            from vidyut.lipi import Scheme, transliterate
            metre = scanned.get('metre')
            reasons = []
            for s in syl:
                text = s['syllable_devanagari']
                if s['weight'] == 'L':
                    reasons.append({'en':'A short, open syllable in this scan.','hi':'इस पाठ में ह्रस्व और खुला अक्षर।'})
                elif re.search('[आईऊॠॡाीूॄॣेैोौएऐओऔ]', text):
                    reasons.append({'en':'Its vowel is long.','hi':'इसका स्वर दीर्घ है।'})
                elif re.search('[ंः्]$', text):
                    reasons.append({'en':'The syllable closes with a consonant, anusvāra or visarga.','hi':'अक्षर व्यञ्जन, अनुस्वार या विसर्ग से बन्द होता है।'})
                else:
                    reasons.append({'en':'Heavy in this scan: examine the following sounds and the line boundary.','hi':'इस पाठ में गुरु: अगली ध्वनियों और पंक्ति के अन्त को जाँचें।'})
            scans.append({
                "line": line,
                "syllables": [s["syllable_devanagari"] for s in syl],
                "weights": "".join(s["weight"] for s in syl),
                "metre": metre,
                "metre_sa": transliterate(metre, Scheme.Slp1, Scheme.Devanagari) if metre else None,
                "reasons": reasons,
            })
        out["scan"] = scans

    elif isinstance(p, DerivationStepperParams):
        from app.services import prakriya

        spec = p.spec.model_dump(exclude_none=True)
        kind = spec.pop("type")
        kw = {k: spec.get(k) for k in ("dhatu", "lakara", "purusha", "vacana", "linga", "vibhakti",
                                        "gana", "prayoga", "sanadi", "prefixes", "krt", "taddhita",
                                        "stem_type")}
        if kind in ("subanta", "taddhita"):
            kw["pratipadika"] = spec.get("stem")
        der = prakriya.derive(expect=p.target, **{k: v for k, v in kw.items() if v is not None})
        from app.services.grammar_guide.model import pause_form

        if pause_form(der.get("result") or "") != pause_form(p.target):
            problems.append(f"the engine derives {der.get('result') or 'nothing'}, not {p.target}")
        out["steps"] = [{"sutra": st["code"], "sa": st["sutra_devanagari"], "result": st["result"]}
                        for st in der.get("steps", [])]
        out.pop("spec", None)

    out["iast"] = _iast_map(out, extra)
    return out, problems
