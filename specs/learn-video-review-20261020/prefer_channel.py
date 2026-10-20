"""Apply the owner's channel preference to the researched editorial shortlist."""
import copy
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent

# Topic fits are inferred from publisher titles/descriptions, not watched clips.
PREFERRED = {
    "vowels": ("a4rz9NbMq0M", "Vowel sound production. Full video 9:15; choose a short teaching clip. Check ऋ and ऌ against the course."),
    "consonants": ("dq5VdY69RMc", "Consonant pronunciation checkpoint. Full video 6:51; choose a short clip. Check all five rows, aspiration and voicing."),
    "joined-letters": ("s2hReqbgsL0", "Partial match: pronunciation of ज्ञ only. Full video 6:27; choose a short clip. The alternative covers conjuncts more broadly."),
    "one-two-many": ("7DgU79MgJaM", "Partial match: the 3×3 grammar-table layout. Confirm singular, dual and plural examples. Alternative is dedicated to the three numbers."),
    "he-she-it": ("6NaNNAjYhrs", "Practical pronoun examples. Full video 7:27; choose the सः / सा / तत् section after checking gender and agreement."),
    "i-and-you": ("6NaNNAjYhrs", "Shared pronoun lesson. Full video 7:27; choose the अहम् / त्वम् section and verify अस्मि coverage."),
    "calling": ("HzlO32hjJOc", "Partial match: addressing someone in conversation. Check हे / भोः and vocative endings; the alternative explains the case directly."),
    "pronouns-numbers": ("6NaNNAjYhrs", "Partial match: pronouns, not number inflection, relatives or telling time. Full video 7:27; choose a short clip. Keep the number lesson as a supplement."),
    "indeclinables": ("oVZExejYBWc", "Partial match: practical usage of एवम्. The alternative covers indeclinables more broadly, including इति if verified."),
    "metre-1": ("LjM5GSSe8mU", "Partial match: rhythm workshop, full length 1:41:03. Select a self-contained short clip about light/heavy syllables or śloka. Alternative directly teaches anuṣṭubh."),
    "metre-2": ("XhaYLon88NM", "Partial match: chandas and gaṇas, full length 1:43:24. Select a short worked example. Āryā and individual great metres still need the alternatives."),
    "reading-verse": ("DPLIg26NNEY", "Bhagavadgītā 1.2 tutorial. Confirm padaccheda, anvaya and explanation coverage. Alternative explicitly teaches split-and-reorder reading."),
}


def main():
    path = HERE / "candidates.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    details = json.loads((HERE / "preferred-channel-details.json").read_text(encoding="utf-8"))
    metadata = json.loads((HERE / "metadata.json").read_text(encoding="utf-8"))
    data.setdefault("previous_candidates", copy.deepcopy(data["candidates"]))
    original = {row[0]: row for row in data["previous_candidates"]}
    data["preferred_channel"] = {
        "name": "The Sanskrit Channel",
        "url": "https://www.youtube.com/c/TheSanskritChannel",
        "channel_id": "UCqFg6QnwgtVHo1iFgpxrx-A",
        "catalog_records_checked": 1041,
        "selection_rule": "Prefer relevant publicly playable lessons. Use topic-specific alternatives where no suitable match was identified. Partial matches and required clip selection remain explicit review tasks.",
    }
    data["method"] = "Publisher title/description research, public channel catalog (1041 video records), targeted topic searches and public player metadata for 17 preferred-channel candidates. No video was watched or approved. The topic fit is editorial inference; clips, captions, language, accuracy and actual app playback require manual review."
    data["selection_basis"] = {}
    updates = []
    for row in data["candidates"]:
        unit = row[0]
        old = original[unit]
        if unit in PREFERRED:
            video, fit = PREFERRED[unit]
            detail = details[video]
            assert detail["channel_id"] == data["preferred_channel"]["channel_id"]
            assert detail["playability"] == "OK" and detail["embeddable"] is True
            row[1:] = [video, detail["title"], detail["channel"], fit]
            basis = "Preferred channel. "
            previous_metadata = metadata.get(old[1], {})
            prior = f"https://www.youtube.com/watch?v={old[1]} ({previous_metadata.get('channel', old[3])})"
            alternatives = data["alternatives"].get(unit, "")
            if prior not in alternatives:
                alternatives = prior + ("; " + alternatives if alternatives else "")
            data["alternatives"][unit] = alternatives
        else:
            basis = "Alternative: no suitable topic-specific public lesson identified in the preferred channel catalog/search. "
            if unit == "panini-gateway":
                basis = "Alternative: the preferred channel's Maheshvara-sūtra lessons checked require membership. "
        data["selection_basis"][unit] = "preferred" if unit in PREFERRED else "alternative"
        actual = details.get(row[1], metadata.get(row[1], {}))
        notes = basis + row[4]
        if data["alternatives"].get(unit):
            notes += " Alternative: " + data["alternatives"][unit]
        updates.append({"id": unit, "old_url": "https://www.youtube.com/watch?v=" + old[1], "url": "https://www.youtube.com/watch?v=" + row[1], "title": actual.get("title", row[2]), "channel": actual.get("channel", row[3]), "notes": notes})
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (HERE / "workbook-update.json").write_text(json.dumps(updates, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"units": len(updates), "preferred_units": len(PREFERRED), "alternative_units": len(updates) - len(PREFERRED), "unique_videos": len({r[1] for r in data["candidates"]})}))


if __name__ == "__main__":
    main()
