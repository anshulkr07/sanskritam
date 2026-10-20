"""Expose existing narrated speech as structured lines without inventing Sanskrit."""
import json
import re
import os
import time
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2] / "backend/app/curriculum/content"
LINES = [
    ("nf2.u", "shuka", "गुरुः", "The teacher!", "गुरु!"),
    ("atm.both", "sevaka", "पचते", "He cooks for himself.", "वह अपने लिए पकाता है।"),
    ("part.ktva", "sankshepaka", "गत्वा", "Having gone.", "जाकर।"),
    ("part.kta", "sankshepaka", "गतः", "Gone.", "गया हुआ।"),
    ("part.shatr", "sankshepaka", "गच्छन्", "Going.", "जाता हुआ।"),
    ("part.tumun", "sankshepaka", "द्रष्टुम्", "To see.", "देखने के लिए।"),
    ("part.krtya", "vetala", "कर्तव्यम्", "What must be done.", "जो करना चाहिए।"),
    ("pc.cause", "vetala", "पाठयति", "He makes someone read.", "वह किसी को पढ़ाता है।"),
    ("pc.want", "vetala", "पिपासति", "He wants to drink.", "वह पीना चाहता है।"),
    ("past.tell", "vetala", "आसीत्", "There was.", "था।"),
    ("lit.said", "vetala", "उवाच", "He said.", "उसने कहा।"),
    ("vc1.cur", "vetala", "कथयति", "He tells.", "वह बताता है।"),
    ("vc1.div", "vetala", "नृत्यति", "He dances.", "वह नाचता है।"),
    ("vc1.tud", "vetala", "तुदति", "He pricks.", "वह चुभोता है।"),
    ("vc2.da", "vetala", "ददाति", "He gives.", "वह देता है।"),
    ("vc2.kr", "vetala", "शृणोति", "He hears.", "वह सुनता है।"),
    ("c1.karmadharaya", "samasika", "नीलोत्पलम्", "A blue lotus.", "नीला कमल।"),
    ("c1.nan", "samasika", "कुम्भकारः", "The pot-maker.", "कुम्हार।"),
    ("c1.tatpurusha", "samasika", "राजपुरुषः", "The king's man.", "राजा का आदमी।"),
    ("c2.avyayi", "malika", "यथाशक्ति", "As far as one's strength allows.", "शक्ति के अनुसार।"),
    ("c2.bahuvrihi", "malika", "नीलकण्ठः", "The one with a blue throat.", "नीले कण्ठ वाला।"),
    ("cs.nasal", "vyanjanika", "सन्मार्गः", "The good road.", "अच्छा मार्ग।"),
    ("cs.place", "vyanjanika", "सज्जनः", "A good person.", "अच्छा व्यक्ति।"),
    ("tad.having", "taddhitika", "धनवान्", "One who has wealth.", "जिसके पास धन है।"),
    ("tad.more", "taddhitika", "लघुतरः", "Lighter.", "अधिक हल्का।"),
    ("tad.ness", "taddhitika", "मनुष्यत्वम्", "Humanness.", "मनुष्य होने का भाव।"),
    ("tad.son", "taddhitika", "राघवः", "A descendant of Raghu.", "रघु का वंशज।"),
    ("vis.r", "visargika", "कविरस्ति", "The poet is.", "कवि है।"),
    ("vis.s", "visargika", "रामश्च", "And Rāma.", "और राम।"),
    ("vs.e-o", "svarika", "नाविकः", "The boatman.", "नाविक।"),
    ("vs.glide", "svarika", "इत्यादि", "And so on.", "इत्यादि।"),
    ("vs.guna", "svarika", "गणेशः", "Gaṇeśa.", "गणेश।"),
    ("vs.vrddhi", "svarika", "सदैव", "Always.", "सदा।"),
    ("pn.count", "ganaka", "एकम्", "One.", "एक।"),
]


def walk(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


if __name__ == "__main__":
    files = {p.stem: p for p in ROOT.glob("acts/**/*.yaml")}
    provenance = []
    for lesson, speaker, sa, en, hi in LINES:
        path = files[lesson]
        text = path.read_text(encoding="utf-8")
        raw = yaml.safe_load(text)
        card = next(c for c in raw["cards"] if c["kind"] == "story")
        assert sa in card["narration"]["en"], lesson + " would introduce new Sanskrit"
        assert speaker in card["image"]["cast"], lesson + " speaker is not present"
        line = {"speaker": speaker, "sa": sa, "gloss": {"en": en, "hi": hi}}
        candidates = [v["check"] for v in walk(raw) if v.get("sa") == sa and v.get("check")]
        if candidates:
            line["check"] = candidates[0]
        if card.get("lines"):
            assert card["lines"] == [line], lesson + " already has different dialogue"
            provenance.append({"lesson": lesson, "card": card["id"], "speaker": speaker, "sa": sa, "engine_claim_copied": bool(candidates), "source": "verbatim Sanskrit already in this card's narration"})
            continue
        block = yaml.safe_dump({"lines": [line]}, allow_unicode=True, sort_keys=False).rstrip()
        indented = "\n".join("  " + s for s in block.splitlines()) + "\n"
        start = text.index("- id: " + card["id"] + "\n")
        end = re.search(r"\n- id: ", text[start + 1:])
        assert end is not None, lesson
        at = start + 1 + end.start() + 1
        changed = text[:at] + indented + text[at:]
        after = yaml.safe_load(changed)
        card_after = next(c for c in after["cards"] if c["id"] == card["id"])
        assert card_after.pop("lines") == [line]
        assert after == raw  # every pre-existing field, including artwork, stays byte-equivalent in meaning
        temporary = path.with_suffix(".dialogue-tmp")
        for attempt in range(8):
            try:
                assert path.read_text(encoding="utf-8") == text, lesson + " changed during this edit"
                temporary.write_text(changed, encoding="utf-8")
                os.replace(temporary, path)
                break
            except OSError:
                if attempt == 7:
                    raise
                time.sleep(0.15)
        provenance.append({"lesson": lesson, "card": card["id"], "speaker": speaker, "sa": sa, "engine_claim_copied": bool(candidates), "source": "verbatim Sanskrit already in this card's narration"})
    target = Path(__file__).with_name("structured-dialogue-20261020.json")
    target.write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(len(provenance), "story cards exposed existing Sanskrit speech;", sum(p["engine_claim_copied"] for p in provenance), "existing engine claims carried over")
