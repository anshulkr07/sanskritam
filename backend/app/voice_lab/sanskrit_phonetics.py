"""Speech-only normalization. Never alter the displayed learner transcript."""
import re


class SanskritPhoneticRouter:
    SCRIPT_MAP = {"hi-IN": "devanagari", "mr-IN": "devanagari", "te-IN": "telugu", "kn-IN": "kannada"}

    @classmethod
    def transform(cls, text: str, target_language_code="te-IN", visarga_expansion=True,
                  prevent_hindi_schwa_deletion=True, transliterate_script=True) -> str:
        text = text.strip()
        # Native Sanskrit beta reads the original text. Legacy hints are only
        # for an explicitly selected non-Sanskrit experimental voice.
        if target_language_code == "sa-IN":
            return text
        if visarga_expansion:
            # Include dependent vowel signs (रामः, हरिः, गुरुः), not just vowels.
            boundary = r"(?=\s|[।॥,.?!]|$)"
            text = re.sub(r"([इईएऐिीेै])ः" + boundary, r"\1हि", text)
            text = re.sub(r"([उऊओऔुूोौ])ः" + boundary, r"\1हु", text)
            text = re.sub(r"([आा])ः" + boundary, r"\1ह्", text)
            text = re.sub(r"([अक-ह])ः" + boundary, r"\1ह", text)
        text = text.replace("॥", ".").replace("।", ".")
        if target_language_code == "hi-IN" and prevent_hindi_schwa_deletion:
            # An explicit independent vowel is an audible hint, not a guarantee
            # of classical pronunciation. Virama/matra endings remain untouched.
            text = re.sub(r"([क-ह])(?=\s|[,.?!]|$)", r"\1अ", text)
        script = cls.SCRIPT_MAP[target_language_code]
        if transliterate_script and script != "devanagari":
            from indic_transliteration.sanscript import transliterate
            text = transliterate(text, "devanagari", script)
        return text


def take_clauses(text: str, final=False) -> tuple[list[str], str]:
    clauses = []
    while text:
        match = re.search(r"[,।॥?!\n.]|(?:\S+\s+){6}", text)
        if not match:
            break
        end = match.end()
        clause, text = text[:end].strip(), text[end:]
        if clause:
            clauses.append(clause)
    if final and text.strip():
        clauses.append(text.strip())
        text = ""
    return clauses, text
