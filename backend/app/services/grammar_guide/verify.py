"""Engine verification for the grammar guide's claims.

Every ``check`` in the guide runs through here in tests (and in the audio
script's dry run). A claim passes only when the engine itself produces the
Sanskrit the learner sees — optional forms included, a pause-form ं/म्
tolerated. A sandhi claim passes when the sandhi rule table yields exactly
that split; compound halves are stems rather than dictionary words, so no
lexicon filter applies there.
"""

from __future__ import annotations

from typing import Optional

from app.services import prakriya
from app.services.sandhi import rule_splits

from .model import pause_form, visarga_form


def forms_for(check: dict) -> list[str]:
    """Every form the engine derives for a non-sandhi check."""
    kind = check["type"]
    if kind == "subanta":
        return prakriya.derive_forms(
            pratipadika=check["stem"], linga=check.get("linga"),
            vibhakti=check.get("vibhakti"), vacana=check.get("vacana"),
            stem_type=check.get("stem_type"))
    if kind == "tinanta":
        return prakriya.derive_forms(
            dhatu=check["dhatu"], lakara=check.get("lakara"), purusha=check.get("purusha"),
            vacana=check.get("vacana"), prayoga=check.get("prayoga"),
            sanadi=check.get("sanadi"), prefixes=check.get("prefixes"), gana=check.get("gana"))
    if kind == "krdanta":
        return prakriya.derive_forms(
            dhatu=check["dhatu"], krt=check["krt"], linga=check.get("linga"),
            vibhakti=check.get("vibhakti"), vacana=check.get("vacana"),
            prefixes=check.get("prefixes"), gana=check.get("gana"))
    if kind == "taddhita":
        return prakriya.derive_forms(
            pratipadika=check["stem"], taddhita=check["taddhita"], linga=check.get("linga"),
            vibhakti=check.get("vibhakti"), vacana=check.get("vacana"),
            stem_type=check.get("stem_type"))
    raise ValueError(f"unknown check type {kind!r}")


def verify(check: dict, shown: str) -> Optional[str]:
    """None when the engine agrees with ``shown``; otherwise the reason why not."""
    if check["type"] == "sandhi":
        joined = check.get("joined") or shown
        want = (visarga_form(check["first"]), visarga_form(check["second"]))
        if any((visarga_form(a), visarga_form(b)) == want for a, b in rule_splits(joined)):
            return None
        return f"the sandhi table has no split {check['first']} + {check['second']} for {joined}"
    target = pause_form(check.get("form") or shown)
    forms = forms_for(check)
    if target in {pause_form(f) for f in forms}:
        return None
    return f"the engine derives {forms or 'nothing'}, not {target}"
