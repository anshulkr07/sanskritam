"""Assemble optional readings from exact existing course passages.

No Sanskrit is generated. Keep the originals and their engine claims intact.
The added questions test passage comprehension in both guide languages.
"""
import copy
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2] / "backend/app/curriculum/content"


def bi(en, hi):
    return {"en": en, "hi": hi}


def question(cid, skills, prompt, answer, distractor, explanation):
    return {
        "id": cid, "kind": "practice", "mode": "choice", "skills": skills,
        "prompt": bi(*prompt), "explain": bi(*explanation),
        "options": [{"text": bi(*answer), "correct": True},
                    {"text": bi(*distractor), "why": bi(*explanation)}],
    }


def add(unit_dir, stem, title, source_lesson, source_card, skills, questions, summary, examples=False, source=None):
    folder = ROOT / unit_dir
    original = yaml.safe_load((folder / (source_lesson + ".yaml")).read_text(encoding="utf-8"))
    card = next(c for c in original["cards"] if c["id"] == source_card)
    # Sentence has the same supported fields as Example except its citation.
    passage = copy.deepcopy(card["examples"] if examples else card["passage"])
    for sentence in passage:
        sentence.pop("source", None)
    pivot = (len(passage) + 1) // 2
    lesson = {
        "id": stem + ".reading", "template": "episode", "title": bi(*title),
        "minutes": 4, "needs": skills, "review": "engine_ok",
        "sources": copy.deepcopy(original["sources"]),
        "cards": [{"id": "r1", "kind": "reading", "title": bi("Read the scene", "दृश्य पढ़ें"), "passage": passage[:pivot]},
                  question("p1", skills, *questions[0]),
                  {"id": "r2", "kind": "reading", "title": bi("Read on", "आगे पढ़ें"), "passage": passage[pivot:]},
                  question("p2", skills, *questions[1]),
                  {"id": "end", "kind": "summary", "points": [{"text": bi(*summary)}]}],
    }
    if source:
        lesson["sources"].append(source)
    target = folder / (stem + ".reading.yaml")
    if target.exists():
        raise FileExistsError(target)
    target.write_text(yaml.safe_dump(lesson, allow_unicode=True, sort_keys=False, width=110), encoding="utf-8")
    unit_file = folder / "unit.yaml"
    text = unit_file.read_text(encoding="utf-8")
    assert "\nreading:" not in text
    unit_file.write_text(text.rstrip() + "\nreading: " + stem + ".reading\n", encoding="utf-8")
    print(lesson["id"], len(passage), "sentences,", len(questions), "comprehension checks")


if __name__ == "__main__":
    add("acts/act-2/who-does", "who", ("Read the ghat scene", "घाट का दृश्य पढ़ें"), "who.does", "t2", ["verb.pres-3sg"], [
        (("What does the girl do?", "बालिका क्या करती है?"), ("She writes.", "वह लिखती है।"), ("She reads.", "वह पढ़ती है।"), ("The second sentence says that the girl writes.", "दूसरे वाक्य में बालिका लिखती है।")),
        (("Which one moves in the last sentence?", "अन्तिम वाक्य में कौन चलता है?"), ("The boat", "नाव"), ("The heron", "बगुला"), ("The heron stands. The boat moves.", "बगुला खड़ा है। नाव चलती है।")),
    ], ("You followed four actions at the ghat by finding who acts and what each one does.", "आपने घाट की चार क्रियाएँ पढ़ीं और पहचाना कि कौन क्या करता है।"), examples=True)
    add("acts/act-2/one-two-many", "num", ("Read one, two and many", "एक, दो और अनेक पढ़ें"), "num.agree", "t1", ["sent.agree-number"], [
        (("How many boys read in the second sentence?", "दूसरे वाक्य में कितने बालक पढ़ते हैं?"), ("Two", "दो"), ("One", "एक"), ("Both the noun and the verb in the second sentence show two.", "दूसरे वाक्य में संज्ञा और क्रिया, दोनों से दो का बोध होता है।")),
        (("Are there one or several boats in the last sentence?", "अन्तिम वाक्य में एक नाव है या अनेक?"), ("Several boats", "अनेक नावें"), ("One boat", "एक नाव"), ("The final sentence uses plural forms for the boats and for being.", "अन्तिम वाक्य में नाव और होने की क्रिया, दोनों बहुवचन में हैं।")),
    ], ("You read the same action with one, two and many people, then identified the boats in the plural.", "आपने एक, दो और अनेक लोगों के साथ वही क्रिया पढ़ी, फिर नावों का बहुवचन पहचाना।"), examples=True)
    add("acts/act-3/past", "past", ("Read the Vetāla's opening", "वेताल की कथा का आरम्भ पढ़ें"), "past.tell", "r1", ["verb.lan"], [
        (("Where did the king live before going to the forest?", "वन जाने से पहले राजा कहाँ रहता था?"), ("In the city", "नगर में"), ("In a tree", "पेड़ पर"), ("The second sentence says that he lived in the city. He went to the forest later.", "दूसरे वाक्य में वह नगर में रहता था। बाद में वह वन गया।")),
        (("Who speaks at the end of the passage?", "अंश के अन्त में कौन बोलता है?"), ("The corpse", "शव"), ("The tree", "पेड़"), ("The corpse was in the tree, and the final sentence says that the corpse spoke.", "पेड़ पर शव था, और अन्तिम वाक्य में शव बोला।")),
    ], ("You followed the king from the city into the forest and understood the surprise at the end.", "आपने नगर से वन तक राजा की कथा पढ़ी और अन्त का आश्चर्य समझा।"))
    add("acts/act-5/reading-kss", "kss", ("Read Naravāhanadatta's naming", "नरवाहनदत्त का नामकरण पढ़ें"), "kss.naming", "r1", ["kss.read"], [
        (("Where does the voice announcing the child's identity come from?", "बालक का परिचय देने वाली वाणी कहाँ से आती है?"), ("From the sky", "आकाश से"), ("From the forest", "वन से"), ("The second sentence identifies the sky as the source of the voice.", "दूसरे वाक्य में वाणी आकाश से आती है।")),
        (("What future is announced for the child?", "बालक के किस भविष्य की घोषणा होती है?"), ("He will be emperor of the Vidyādhara lords.", "वह विद्याधरेन्द्रों का चक्रवर्ती बनेगा।"), ("He will remain unnamed.", "वह बिना नाम का रहेगा।"), ("The voice gives him the name Naravāhanadatta and foretells his rule over the Vidyādhara lords.", "वाणी उसका नाम नरवाहनदत्त बताती है और विद्याधरेन्द्रों पर उसके शासन की भविष्यवाणी करती है।")),
    ], ("You followed a birth, an announcement from the sky, a name and a prophecy in Somadeva's Sanskrit.", "आपने सोमदेव की संस्कृत में जन्म, आकाशवाणी, नामकरण और भविष्यवाणी पढ़ी।"), source={
        "title": "Somadeva, Kathāsaritsāgara 4.3.64a, 72b–74 (excerpts)",
        "url": "https://gretil.sub.uni-goettingen.de/gretil/1_sanskr/5_poetry/4_narr/sokss_pu.htm",
        "licence": "public domain", "note": "Ancient source text, edition Durgaprasad and Parab 1915. GRETIL transcription checked 20 October 2026. Course word splitting, glosses and guide-language translations are original; the passage uses selected lines rather than continuous verses.",
    })
