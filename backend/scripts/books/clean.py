"""Text cleaning and verse splitting (handover_reading_shelf.md 5.3-5.4).

Pure functions only: no network, no database. Every verse from every source
passes through verse_text in the same order.
"""

from __future__ import annotations

import re
import unicodedata

_BENGALI = re.compile("[\u0980-\u09ff]")
_MALAYALAM = re.compile("[\u0d00-\u0d7f]")
_HTML_TAG = re.compile(r"<[^>]+>")
_TEMPLATE = re.compile(r"\{\{[^{}]*\}\}")
_FILE_LINK = re.compile(r"\[\[File:[^\]]*\]\]|\[\[Image:[^\]]*\]\]", re.I)
_WIKILINK_PIPE = re.compile(r"\[\[([^\]|]+)\|([^\]]+)\]\]")
_WIKILINK = re.compile(r"\[\[([^\]]+)\]\]")
_REF_TAG = re.compile(r"<ref[^>]*>.*?</ref>", re.S | re.I)
_LINE_MARKUP = re.compile(r"^[ \t]*[:;*#]+", re.M)
_BOLD3 = "'''"
_BOLD2 = "''"

# Verse-end numbers: danda(s) + number + danda(s), or a newline for Mahimna.
# Numbers may be Devanagari or ASCII: 1, 1.2, 81.1, 1,108.1, 1- 1, 12.8.60.
# A trailing "*" or "?" is an editor's footnote mark (Raghuvamsha "॥ १.३४* ॥").
# The opening danda can be single ("। १ ॥" opens every Bhagavata adhyaya) —
# a half-verse "।" is never followed by a number, so this stays unambiguous.
_NUM = r"[0-9०-९]+(?:[.,\-–\s]*[0-9०-९]+)*"
_MARK = r"[\*?]*"
_DEVA_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")
_DANDA = r"(?:॥|।)"
# Closing can be ॥, । or line end: Raghuvamsha numbers its verses
# "। । १२.१ । ।" (spaced double single-dandas on both sides).
_VERSE_END = re.compile(_DANDA + r"\s*(" + _NUM + r")" + _MARK + r"\s*[॥।]?")
_VERSE_END_NL = re.compile(_DANDA + r"\s*(" + _NUM + r")" + _MARK + r"\s*(?:॥|।|\n|$)")
_SPEAKER = re.compile(
    r"(.+?(उवाच|ऊचुः|उवाच्|अब्रवीत्|अब्रवीताम्|अब्रूताम्))\s*[।॥—–-]?\s*$"
)
# A whole short line that is only a speech verb ("राजोवाच", "सूतोवाच" —
# note rājovāca does NOT contain "उवाच").
_SPEAKER_ONLY = re.compile(r"^[ऀ-ॿ]{2,15}(?:वाच|अब्रवीत्|अब्रवीताम्|अब्रूताम्|ऊचुः)\s*[।॥]?\s*$")
_SPEAKER_LABEL = re.compile(r"^[ऀ-ॿ]+ः\s*[-–—]")
# Drama pages also type the label with an ASCII colon ("राजाः: -एष …").
_SPEAKER_LABEL2 = re.compile(r"^[ऀ-ॿ]{2,15}:\s*[-–—]")
_HEADING = re.compile(
    r"(॥\s*अथ\s+[^॥]+॥|.*(अध्यायः?|ऽध्यायः?|सर्गः|पादः|काण्डम्|अङ्कः|ऽङ्कः|प्रश्नः|वल्ली|खण्डः|प्रारभ्यते)\s*[०-९]*\s*[।॥\s]*$)"
)
# "॥ गीतम् ५ ॥" song/section headers: danda + word(s) + number + danda, no
# verse text — always structure, never a verse.
_SECTION_HEADER = re.compile(r"^॥\s*[^\॥\d][^\॥]*[०-९०-९]\s*॥\s*$")
_AUSPICIOUS_ONLY = re.compile(r"^॥?\s*(श्रीः?|ॐ|ओम्)\s*॥?\s*$")
# "॥ श्री ललितामहात्रिपुरसुन्दर्यै नमः ॥" invocation header above a stotra.
_NAMAH_HEADER = re.compile(r"^॥\s*[^॥]*नमः\s*॥$")
_COLOPHON = re.compile(r"(इति\s+.+(सम्पूर्णम्|समाप्तम्|समाप्ता)|इति\s+श्री.+)")
# "इति वैश्यवर्गः ९ अत्र मूलश्लोकाः ११" (Amarakosha), "इत्यमरसिंहकृतौ …
# काण्डो": a line that opens with iti and names a section is a colophon.
_COLOPHON_SECTION = re.compile(
    r"^इति\S*\s+.*?(काण्ड|वर्ग|अध्याय|सर्ग|खण्ड|सूक्त|प्रपाठक|तरङ्ग|आश्वास|उल्लास)")
_ATRA_COUNT = re.compile(r"अत्र\s+मूलश्लोकाः")
_STAGE_DIR = re.compile(r"^\([^)]*\)\s*[।॥]?\s*$")
# Scanned-page artefacts ("81(78)" on the Devimahatmya page).
_PAGE_ARTIFACT = re.compile(r"^\d+\(\d+\)$")
_ANUVAKA_COUNT = re.compile(r"^\s*॥?\s*इति\s+श्री")

_ALLOWED_EXTRA = set("॥।ऽ \n")


def _is_devanagari_letter(ch: str) -> bool:
    o = ord(ch)
    return 0x0900 <= o <= 0x097F


def strip_wiki_markup(text: str) -> str:
    """Remove wiki markup per 5.3 step 2."""
    out = text or ""
    out = _REF_TAG.sub("", out)
    out = _FILE_LINK.sub("", out)
    # Rendered pages carry their chrome in <table> blocks (ambox notices,
    # {{rh}} running headers with title/author/page-number): drop them whole.
    for _ in range(20):
        new = re.sub(r"<table\b.*?</table>", "", out, flags=re.S | re.I)
        if new == out:
            break
        out = new
    # Templates: repeat until none (nested {{..}} are rare here).
    for _ in range(5):
        new = _TEMPLATE.sub("", out)
        if new == out:
            break
        out = new
    out = _WIKILINK_PIPE.sub(r"\2", out)
    out = _WIKILINK.sub(r"\1", out)
    out = _HTML_TAG.sub("", out)
    out = out.replace(_BOLD3, "").replace(_BOLD2, "")
    out = _LINE_MARKUP.sub("", out)
    # Wiki section headings "== ... ==" are structure, not verse text.
    # Drop the heading line (chapter assignment uses section order).
    kept = []
    for ln in out.split("\n"):
        s = ln.strip()
        if re.fullmatch(r"==+.*==+", s):
            continue
        if "An image should appear" in ln:
            continue
        kept.append(ln)
    out = "\n".join(kept)
    return out


def remove_vedic_marks(text: str) -> str:
    """Sāmaveda/Yajurveda step: ꣳ -> ं, then delete accent ranges."""
    out = (text or "").replace("ꣳ", "ं")
    keep = []
    for ch in out:
        o = ord(ch)
        if 0x0951 <= o <= 0x0954:
            continue
        if 0x1CD0 <= o <= 0x1CFF:
            continue
        if 0xA8E0 <= o <= 0xA8F2:
            continue
        keep.append(ch)
    return "".join(keep)


def verse_text(raw: str, *, vedic: bool = False) -> str:
    """Clean one verse (5.3 steps 1-7)."""
    t = unicodedata.normalize("NFC", raw or "")
    t = strip_wiki_markup(t)
    # U+200B (zero-width space, seen in Ramaraksa TEI) joins words invisibly;
    # drop it alongside 200C/200D. U+A8F3 (vedic anusvara, seen in Mandukya
    # "इदꣳ") is always a plain anusvara here.
    t = t.replace("‌", "").replace("‍", "").replace("​", "").replace("ꣳ", "ं")
    # Drop Bengali-script lines (the Chanakya page repeats titles in Bengali)
    # and Malayalam lines (the Lalita page carries an ml: interwiki echo).
    lines = [ln for ln in t.split("\n")
             if not _BENGALI.search(ln) and not _MALAYALAM.search(ln)]
    t = "\n".join(lines)
    if vedic:
        t = remove_vedic_marks(t)
    # Dandas.
    t = t.replace("।।", "॥")
    t = t.replace(" // ", " ॥ ").replace("//", " ॥ ")
    # GRETIL single slash between spaces: " / " -> danda.
    t = re.sub(r"\s+/\s+", " । ", t)
    # Wiki transcription punctuation (2026-10-09, seen in Yoga Sutra 1.30:
    # "विक्षेपास्. तेऽन्तरायाः" and 1.41 commas): ASCII full stops and commas
    # between Devanagari words are transcription noise, not Sanskrit. They
    # would otherwise fail the character check below for 17 of 195 sutras.
    # The verse's own number keeps its separator: "॥ १.१ ॥" stays as printed.
    t = re.sub(r"(?<![0-9०-९])[.,]|[.,](?![0-9०-९])", " ", t)
    t = re.sub(r"(?<=[0-9०-९])\s*[-–]\s*(?=[0-9०-९])", "-", t)
    # Ambuda TEI line-break hyphens (Bhaja Govindam: "सक्त-\nस्ताव"): a hyphen
    # at the end of a line splits one word across lines; join it. Ramaraksa
    # has the same split with a space ("स्पृशा- वक्ष"): join any hyphen
    # between two Devanagari letters.
    t = re.sub(r"-\s*\n\s*", "", t)
    # Letters and signs only: a hyphen between digits ("१८-९५") is the verse
    # number's own separator and must stay, or chapter 18 verse 95 reads as 1895.
    t = re.sub(r"(?<=[ऀ-॥॰-ॿ])-\s*(?=[ऀ-॥॰-ॿ])", "", t)
    # Kena page uses "|" as a danda ("चक्षुः |"): a pipe surrounded by space
    # or at the end of a line is a danda typo. Fullwidth and box-drawing
    # pipes appear on the same pages as the ASCII one.
    t = t.replace("\uff5c", "|").replace("\u2502", "|")
    t = re.sub(r"\s+\|\s*", " । ", t)
    t = re.sub(r"\|\s*$", " ।", t, flags=re.M)
    # Vedic vowel-length notation sits inside a word ("व्यद्युतदा३इतीन्" in
    # Kena): a digit run between two Devanagari letters is a scholarly length
    # marker, never part of the text. Verse numbers always carry a danda or
    # space around them, so they are untouched. The marker can also close a
    # word ("न्यमीमिषदा३"), so a digit run directly after a vowel sign goes
    # too. The Sāmaveda page writes the same notation in ASCII ("न्य3ऽत्रिणम्").
    t = re.sub(r"(?<=[ऀ-ॿ])[०-९0-9०-९]+(?=[ऀ-ॿ])", "", t)
    # …and the marker can follow an anusvara/visarga ("प्रतीव्यां३", Sāmaveda)
    # or an avagraha ("रथ्याऽ३").
    t = re.sub(r"(?<=[ािीुूृॄॢॣेैोौंःऽ])[०-९0-9०-९]+", "", t)
    # Private-use-area characters ride along with font-encoded pages
    # (Sāmaveda U+F131); they are never text.
    t = re.sub(r"[\ue000-\uf8ff]", "", t)
    # English editorial glosses and uncertainty marks ("विरजो (or विरतो)" on
    # the Vishnusahasranama page, "शश्वद्(?)" in Raghuvamsha).
    t = re.sub(r"\s*\((?:or|and)\s[^)]*\)", "", t)
    t = t.replace("(?)", "")
    # "तस्मि/श्च" (Prashna): a slash jammed between two Devanagari letters is
    # a danda typo inside a word — drop it. Spaced slashes were already
    # converted to a danda above.
    t = re.sub(r"(?<=[ऀ-ॿ])\s*/\s*(?=[ऀ-ॿ])", "", t)
    # "उवाच --इतीदं" (Vishnusahasranama) and "वासगृहे - ध्रुवम्" (Gitagovinda):
    # speaker dashes and dhruva tags; ASCII full stops, commas, !, ? between
    # Devanagari words are transcription noise ("भगवन् ! का हि"). A hyphen
    # between digits stays (the verse number's own separator).
    t = t.replace("--", " ")
    # "चिदग्रि – कुण्ड" (Lalita), "उद्भानु -सहस्राभा": dashes as compound
    # separators; "कुशल:" (Saundarya) is a visarga typed as an ASCII colon.
    t = re.sub(r"(?<=[ऀ-ॿ])\s*[-–]\s*(?=[ऀ-ॿ])", " ", t)
    t = re.sub(r"(?<=[ऀ-ॿ]):", "ः", t)
    t = re.sub(r"\s+-\s+", " ", t)
    t = re.sub(r"(?<![0-9०-९])[.,!?;]|[,!?;](?![0-9०-९])", " ", t)
    # "(श्लोकः)या सृष्टिः…" (Shakuntala): a short stage-direction prefix glued
    # to the verse's first line.
    t = re.sub(r"(?m)^\([^)]{1,40}\)\s*", "", t)
    # Whatever parentheses, brackets and quotation marks survive the
    # stage-direction and annotation drops are page noise; a stray apostrophe
    # likewise ("हार्द' ", Lalita). Braces ride in from templates
    # ("{श्रीमद्भागवतपुराणम्स्कन्धः}"), an ASCII letter from a typo
    # ("ज्ञात्वागाt "), "…" from drama stage chatter.
    t = re.sub(r"[()\[\]{}“”‘’\"']", " ", t)
    t = re.sub(r"[a-zA-Z]+", " ", t)
    t = t.replace("…", " ")
    # A final catch-all: any hyphen or en-dash left near the text is
    # typography, never Sanskrit.
    t = t.replace("-", " ").replace("–", " ")
    # Keep only Devanagari, dandas and whitespace: every other codepoint
    # that survived the line-level drops (Latin letters like the "ë" in
    # Raghuvamsha, backslashes, %, math signs, leftover digits) is page
    # noise by definition. The character check below enforces the same set.
    t = re.sub(r"[^\u0900-\u097F॥। \n]+", " ", t)
    t = re.sub(r"[ \t]+", " ", t)
    # Collapse whitespace; keep one line break between half-verses.
    parts = [re.sub(r"[ \t\u00a0]+", " ", p).strip() for p in t.split("\n")]
    parts = [p for p in parts if p]
    t = "\n".join(parts)
    t = re.sub(r"[ \t]+", " ", t)
    if t and "॥" not in t:
        t = t.rstrip() + " ॥"
    else:
        t = re.sub(r"॥\s*॥", "॥", t)
        # Ensure " ॥" at the end when the verse has a danda run.
        if t and not t.rstrip().endswith("॥"):
            t = t.rstrip() + " ॥"
    return t.strip()


def strip_verse_number(text: str) -> str:
    """Remove the trailing verse number (dandas + number) before the check."""
    t = (text or "").strip()
    # The opening danda can be single ("। १ ॥" closes Bhagavata verse 1)
    # and the tail can be a danda/space run ("। २.१ । ॥" in Raghuvamsha).
    t = re.sub(r"\s*" + _DANDA + r"\s*" + _NUM + _MARK + r"[\s॥।|]*$", "", t).strip()
    t = re.sub(r"\s*" + _NUM + _MARK + r"\s*$", "", t).strip() if re.search(r"\d\s*$", t.translate(_DEVA_DIGITS)) and "॥" not in t[-8:] and "।" not in t[-8:] else t
    return t


def char_check(text: str) -> list[str]:
    """Offending characters per 5.3: anything outside the allowed set stops
    the build for that book. Returns the sorted distinct offenders."""
    body = strip_verse_number(text)
    bad: set[str] = set()
    for ch in body:
        if ch in _ALLOWED_EXTRA or ch == "\u200c" or ch == "\u200d":
            continue
        if _is_devanagari_letter(ch):
            o = ord(ch)
            if 0x0966 <= o <= 0x096F:  # Devanagari digits
                bad.add(ch)
                continue
            if ch in "॥।":
                continue
            continue
        if ch in (" ", "\n", "\t"):
            continue
        bad.add(ch)
    return sorted(bad)


def check_verses(verses: list[str]) -> list[dict]:
    """First 20 offenders across a book (5.6)."""
    out = []
    for i, v in enumerate(verses):
        bad = char_check(v)
        if bad:
            out.append({"index": i, "preview": (v or "")[:120], "bad": bad})
            if len(out) >= 20:
                break
    return out


def norm_number(num: str) -> str:
    """ASCII-normalised number: Devanagari digits -> ASCII, separators kept."""
    return (num or "").translate(_DEVA_DIGITS).strip()


def number_parts(num: str) -> list[int]:
    """Last-component split: '12.8.60' -> [12, 8, 60]; '1- 1' -> [1, 1]."""
    t = norm_number(num)
    nums = [int(n) for n in re.findall(r"\d+", t)]
    return nums


def verse_number_of(num: str) -> int:
    """The verse's own number is the last component (5.4)."""
    parts = number_parts(num)
    if not parts:
        raise ValueError(f"no number in {num!r}")
    return parts[-1]


def chapter_of_numbers(parts: list[int]) -> str:
    """Every number but the last, joined by '.' ('' for one number)."""
    if len(parts) <= 1:
        return ""
    return ".".join(str(p) for p in parts[:-1])


def split_numbered_verses(text: str) -> list[tuple[str, str]]:
    """Split sa.wikisource/GRETIL numbered pages at verse numbers.

    Returns [(number_raw, verse_text)]. The verse's own number is the last
    component (take the last number for '12.8.60'). A danda with no number
    inside a verse is a half-verse end and stays.
    """
    # Normalise the double-danda used as verse end first. Zero-width chars
    # are dropped before matching: the Shivatandava page hides a U+200D
    # inside the marker itself ("॥५॥"), which the end regex would otherwise
    # not recognise and two verses would merge into one chunk. A bare
    # number on its own line is a page artefact, never a verse.
    t = (text or "").replace("।।", "॥").replace("‌", "").replace("‍", "").replace("​", "")
    t = re.sub(r"(?m)^\s*[०-९0-9]{1,4}\s*$", "", t)
    # Line-end pipes act as closing dandas on rendered pages ("॥ २५ |").
    t = re.sub(r"\|\s*$", " ॥", t, flags=re.M)
    # Vetala prose numbers its verse insertions with pipes ("|११ |") —
    # normalise to dandas so they split like any marker.
    t = re.sub(r"\|\s*([0-9०-९]+(?:\.[0-9०-९]+)*)\s*\|", r"॥\1॥", t)
    out: list[tuple[str, str]] = []
    # Find every "danda number danda-or-newline" end.
    pat = re.compile(_DANDA + r"\s*(" + _NUM + r")" + _MARK + r"\s*(?:॥|।|(?=\n|$))")
    last = 0
    for m in pat.finditer(t):
        num_raw = m.group(1).strip()
        body = t[last:m.start()].strip(" \n\t।॥")
        # The verse text since the previous end, plus the closing dandas.
        verse = (t[last:m.end()]).strip()
        if verse:
            if "*" in m.group(0)[1:]:
                # Raghuvamsha prints variant readings against the same
                # number ("॥ १.३४* ॥") right after the main verse; the
                # builder drops starred rows as variants.
                num_raw = num_raw + "*"
            out.append((num_raw, verse))
        last = m.end()
    return out


def is_dropped_line(line: str) -> bool:
    """Speaker / heading / colophon lines dropped before a verse (5.4)."""
    t = (line or "").strip().strip("।॥ —–-")
    if not t:
        return True
    # Colophons first: "इति श्रीमद्भागवते … अध्यायः ॥ ८ ॥" closes with a
    # number, and the verse-end check below would otherwise keep it.
    if _COLOPHON.search(t):
        return True
    if _COLOPHON_SECTION.search(line.strip()):
        return True
    if _ATRA_COUNT.search(line):
        return True
    # "अथ योगानुशासनम् ॥ १.१ ॥" opens with the word a heading opens with, but
    # it carries the verse's own number: it is the verse, not a heading.
    if _VERSE_END.search(line):
        return False
    if _AUSPICIOUS_ONLY.match(line.strip()):
        return True
    if _NAMAH_HEADER.match(line.strip()):
        return True
    if _STAGE_DIR.match(line.strip()):
        # A fully parenthesised stage direction ("(पञ्चमो वेतालः ।)").
        return True
    if _SECTION_HEADER.match(line.strip()):
        # "॥ गीतम् ५ ॥" song header — structure, not a verse.
        return True
    if _SPEAKER.search(line.strip()):
        return True
    if _SPEAKER_ONLY.match(line.strip()):
        return True
    if _SPEAKER_LABEL.match(line.strip()):
        # "विदूषकः - (निःश्वस्य) …" drama speaker label before prose.
        return True
    if _SPEAKER_LABEL2.match(line.strip()):
        return True
    if _PAGE_ARTIFACT.match(line.strip()):
        return True
    if re.fullmatch(r"[\s०-९0-9]+", line.strip()):
        # A bare page-number line (ProofreadPage artefact on rendered pages).
        return True
    if line.strip().startswith("[") and line.strip().endswith("]"):
        # Sāmaveda accent-annotation blocks ("[स्वड 16 । उड 5 । …]").
        return True
    if _HEADING.search(line.strip()):
        # Only drop short headings, never a verse line.
        if len(t) <= 60:
            return True
    return False


def drop_leading_junk(verse: str) -> str:
    """Drop speaker/heading/colophon lines before the verse."""
    lines = (verse or "").split("\n")
    kept = []
    for ln in lines:
        # Normalise wiki line endings before matching: "<br>", "==" heads.
        probe = re.sub(r"<[^>]+>", "", ln).strip()
        probe = re.sub(r"^==+.*==+$", "", probe).strip()
        if not probe:
            continue
        if _AUSPICIOUS_ONLY.match(probe):
            continue
        if _SPEAKER.search(probe):
            continue
        if is_dropped_line(probe):
            continue
        kept.append(ln)
    return "\n".join(kept).strip() or verse.strip()
