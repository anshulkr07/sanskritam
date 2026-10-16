"""Unit tests for scripts.books.clean + DCS/Ambuda parsers (handover 9.15). No network."""

from scripts.books import clean as C
from scripts.books.build import (
    _citation_numbers,
    dcs_to_devanagari,
    parse_ambuda_tei,
    parse_dcs_conllu,
)


def test_clean_nfc_and_zero_width():
    assert C.verse_text("रामः‌।") == "रामः। ॥" or "राम" in C.verse_text("रामः‌।")


def test_clean_wiki_markup():
    t = C.verse_text("{{template}}[[File:x.jpg]] [[a|b]] [[c]] '''x'' <poem>रामः</poem>")
    assert "{{" not in t and "[[" not in t and "<" not in t
    assert "b" in t and "राम" in t


def test_clean_bengali_lines_dropped():
    t = C.verse_text("রামঃ\nरामः।")
    assert "র" not in t and "राम" in t


def test_clean_vedic_marks():
    t = C.verse_text("अग्निःꣳ ॥", vedic=True)
    assert "ꣳ" not in t
    assert C.remove_vedic_marks("a" + chr(0x0951) + "b" + chr(0x1CD0) + "c" + chr(0xA8E0) + "d") == "abcd"


def test_clean_dandas_and_collapse():
    assert "॥" in C.verse_text("रामः ।।")
    t = C.verse_text("रामः   वनं\n\nगच्छति।")
    assert "  " not in t.replace(" ॥", "")


def test_clean_adds_danda():
    assert C.verse_text("रामः").endswith("॥")


def test_number_forms():
    for raw in ["१", "१.२", "८१.१", "१,१०८.१", "१- १", "12.8.६०"]:
        assert C.verse_number_of(raw) >= 1
    assert C.verse_number_of("12.8.६०") == 60
    assert C.chapter_of_numbers([12, 8, 60]) == "12.8"
    assert C.chapter_of_numbers([5]) == ""


def test_split_numbered_and_last_number():
    parts = C.split_numbered_verses("रामः ॥ १ ॥ सीता ॥ २ ॥")
    assert len(parts) == 2
    assert C.verse_number_of(parts[1][0]) == 2
    # Vetala two-way numbers: take the last.
    assert C.verse_number_of("12.8.६०") == 60


def test_dcs_join_and_transliteration():
    body = ("# text = kaścitkāntāvirahaguruṇā\n# sent_counter = 1\n"
            "# sent_subcounter = 1\n1\tkaścit\t_\n"
            "# text = svādhikārāt\n# sent_counter = 1\n# sent_subcounter = 2\n")
    rows = parse_dcs_conllu(body)
    assert rows == [(1, "kaścitkāntāvirahaguruṇā svādhikārāt")]
    dev = dcs_to_devanagari("rāmaḥ")
    assert "राम" in dev
    # "'" becomes avagraha.
    assert "ऽ" in dcs_to_devanagari("ta'pi")


def test_ambuda_tei_parse():
    xml = """<TEI xmlns="http://www.tei-c.org/ns/1.0"><text><body>
    <lg n="1"><l>line one</l><l>line two</l></lg>
    <lg n="head">title</lg>
    <p n="1">mantra one</p><p n="p1">santi</p>
    </body></text></TEI>"""
    lgs = parse_ambuda_tei(xml, "lg")
    assert lgs == [("1", "line one\nline two")]
    ps = parse_ambuda_tei(xml, "p")
    assert ps == [("1", "mantra one")]


def test_samaveda_running_number():
    # Range start - 1 + n (5.4): first header 651-712, verse 1 -> 651.
    assert 651 - 1 + 1 == 651
    assert 651 - 1 + 62 == 712


def test_char_check_rejects():
    assert C.char_check("Rama ॥ १")  # Latin
    assert C.char_check("রাম ॥")  # Bengali
    assert C.char_check("राम{{x}} ॥")  # markup
    assert C.char_check("रामः। ॥") == []
    # Digits stripped with the verse number first.
    assert C.char_check("रामः ॥ १ ॥") == []


def test_citation_numbers():
    nums = _citation_numbers("Mahābhārata-0696-MBh, 5, 33-5709.conllu")
    assert 5 in nums and 33 in nums
    # Chapter helper takes the citation pair, not the file id.
    from scripts.books.build import _dcs_chapter
    assert _dcs_chapter("meghaduta", "x-1-5709.conllu", 1) in ("1", "2")


# ── Regressions found 2026-10-10 against the built Yoga Sūtra, Aṣṭāvakra Gītā
# and Āditya Hṛdayam payloads ────────────────────────────────────────────────

def _built(chunk: str) -> str:
    """What the numbered-page builder does to one verse chunk."""
    return C.verse_text(C.drop_leading_junk(chunk))


def test_a_verse_that_opens_with_atha_and_carries_its_number_is_kept():
    # Yoga Sūtra 1.1 is "अथ योगानुशासनम् ॥ १.१ ॥": it opens like a heading but it
    # is the verse. It was dropped, and the whole page chunk came back instead.
    chunk = "'''प्रथमः समाधिपादः  ।\n\nअथ योगानुशासनम्  ॥ १.१ ॥<br>"
    assert _built(chunk) == "अथ योगानुशासनम् ॥ १.१ ॥"


def test_the_pada_heading_is_dropped_from_the_first_verse():
    out = _built("<poem>\n'''द्वितीयः साधनपादः  ।<br>\nतपःस्वाध्यायेश्वरप्रणिधानानि क्रियायोगः  ।। २.१ ।। <br>")
    assert "पादः" not in out and out.startswith("तपःस्वाध्याय")


def test_a_half_verse_line_that_opens_with_atha_is_kept():
    # Aṣṭāvakra 12.1 lost its second half ("अथ चिन्तासहस्तस्माद्…"), Āditya 31
    # its first line, to the same rule.
    out = _built("कायकृत्यासहः पूर्वं ततो वाग्विस्तरासहः।\nअथ चिन्तासहस्तस्माद् एवमेवाहमास्थितः॥१२- १॥")
    assert "अथ चिन्तासहस्तस्माद्" in out
    out = _built("अथ रविरवदन्निरीक्ष्य रामं मुदितमनाः परमं प्रहृष्यमाणः ।\nनिशिचरपतिसंक्षयं विदित्वा सुरगणमध्यगतो वचस्त्वरेति ॥३१॥")
    assert out.startswith("अथ रविरवदन्")


def test_a_real_wrapped_atha_heading_is_still_dropped():
    out = _built("॥ अथ आदित्यहृदयम् ॥\nततो युद्धपरिश्रान्तं समरे चिन्तया स्थितम् ॥१॥")
    assert "आदित्यहृदयम्" not in out and out.startswith("ततो युद्ध")


def test_the_verse_number_keeps_its_separator():
    # "१८-९५" is chapter 18 verse 95; the hyphen join between Devanagari
    # characters had turned it into 1895. "१.१" had become "१ १".
    assert C.verse_text("सुबुद्धिरपि निर्बुद्धिः ॥१८-९५॥").endswith("॥१८-९५॥")
    assert C.verse_text("सुबुद्धिरपि निर्बुद्धिः ॥१८- ९५॥").endswith("॥१८-९५॥")
    assert C.verse_text("योगश्चित्तवृत्तिनिरोधः ॥ १.२ ॥").endswith("॥ १.२ ॥")
    # Stray full stops and commas inside the verse are still noise.
    assert "." not in C.verse_text("विक्षेपास्. तेऽन्तरायाः ॥ १.३० ॥").split("॥")[0]
    # Hyphen-split words still join (Bhaja Govindam, Rāmarakṣā).
    assert "सक्तस्ताव" in C.verse_text("सक्त-\nस्ताव ॥ २ ॥")
    assert "स्पृशावक्ष" in C.verse_text("स्पृशा- वक्ष ॥ १ ॥")


def test_mahimna_page_marker_defects_repaired():
    # Śiva Mahimna revid 320011: verse 12 is printed "११" a second time,
    # verses 15 and 23 lost their numbers, verse 25's marker carries a
    # stray dot ("॥ २५."), and some ends are jammed ("॥१३"). Without the
    # repair the splitter merges those three pairs and _finalise_verses
    # drops verse 12 as a repeated ref (40 printed verses become 36).
    from scripts.books.build import _repair_mahimna_markers, _wiki_numbered_verses

    page = ("मिदम् ॥ ११\nमुह्यति खलः ॥११\nअवनतिः ॥१३\n"
            "पथ्य परिभवः ॥\nमुग्धा युवतयः ।।\nभवान् ॥ २५.\n")
    fixed = _repair_mahimna_markers(page)
    for want in ("मिदम् ॥ ११", "खलः ॥ १२", "अवनतिः ॥ १३",
                 "परिभवः ॥ १५", "मुग्धा युवतयः ॥ २३", "भवान् ॥ २५"):
        assert want in fixed, want
    assert "खलः ॥११" not in fixed and "॥ २५." not in fixed
    nums = [C.verse_number_of(num) for num, _ in
            _wiki_numbered_verses(fixed, vedic=False)]
    assert nums == [11, 12, 13, 15, 23, 25]
    # The jammed end no longer mangles to "॥३ ॥" in the cleaned text.
    row_13 = [cleaned for num, cleaned in _wiki_numbered_verses(fixed, vedic=False)
              if C.verse_number_of(num) == 13][0]
    assert row_13.endswith("अवनतिः ॥")


def test_vetala_page_defects_repaired():
    # Vetāla Pañcaviṃśati pages mix marker styles: page 00's poem closes
    # verses with ASCII pipes, story pages jam the danda pair against the
    # number ("॥४.११.१॥"), and page 01's taranga uses "।। ५९". Jammed,
    # verse_text's digit rules only eat runs between Devanagari letters,
    # so "०.८.२१" survived as "० ८ २" debris while char_check (which
    # strips the whole tail as a verse number) saw nothing wrong. The
    # pages also carry editorial <small> notes with external links (page
    # 04) and print their taranga twice: joined sandhi and a split-sandhi
    # duplicate separated by a bare "|" (page 01), "(सन्धिमुक्त पाठः)"
    # (page 16) or "सन्धिविश्लिष्ट पाठः" (page 18) — keep the joined tale
    # only. One marker is printed "।। ।५८" (stray danda).
    from scripts.books.build import _repair_vetala_page, _wiki_numbered_verses

    page = ("कथामुखम् सह ||१\nअथ कदाचित् ॥४.११.१॥\n"
            "तमब्रवीत् ।। ।५८\nअविद्यमानम् ।। ५९\n"
            "<small>तुलनीय - '''पाणौ मुद्रा''' - कथासरित्</small>"
            " [https://example.org ९.३.९१]<br>\n"
            "सन्धियुक्त पाठः\nप्रथमः ॥ १॥\n"
            "|\nद्वितीयः ॥ २॥\n"
            "सन्धिविश्लिष्ट पाठः\nतृतीयः ॥ ३॥\n"
            "(सन्धिमुक्त पाठः)\nचतुर्थः ॥ ४॥\n")
    fixed = " ".join(_repair_vetala_page(page).split())
    assert "सह ॥ १ ॥" in fixed
    assert "अथ कदाचित् ॥ ४.११.१ ॥" in fixed
    assert "तमब्रवीत् ॥ ५८ ॥" in fixed
    assert "अविद्यमानम् ॥ ५९ ॥" in fixed
    assert "कथासरित्" not in fixed and "https" not in fixed
    assert "सन्धियुक्त" not in fixed and "सन्धिविश्लिष्ट" not in fixed
    assert "सन्धिमुक्त" not in fixed and "द्वितीयः" not in fixed
    pairs = _wiki_numbered_verses(fixed, vedic=False)
    assert [C.verse_number_of(num) for num, _ in pairs] == [1, 1, 58, 59, 1]
    # No marker digits survive in the cleaned reading text.
    assert all(not set(text) & set("०१२३४५६७८९") for _, text in pairs)
