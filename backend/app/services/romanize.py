"""Roman letters for Russian (Word journey, handover_language 5.3).

One fixed table, never typed per word. Batch 0 was built with this table;
its 21 Russian words pin the function in a test.
"""

from __future__ import annotations

_RU = {
    "а": "a",
    "б": "b",
    "в": "v",
    "г": "g",
    "д": "d",
    "е": "e",
    "ё": "yo",
    "ж": "zh",
    "з": "z",
    "и": "i",
    "й": "y",
    "к": "k",
    "л": "l",
    "м": "m",
    "н": "n",
    "о": "o",
    "п": "p",
    "р": "r",
    "с": "s",
    "т": "t",
    "у": "u",
    "ф": "f",
    "х": "kh",
    "ц": "ts",
    "ч": "ch",
    "ш": "sh",
    "щ": "shch",
    "ъ": "",
    "ы": "y",
    "ь": "'",
    "э": "e",
    "ю": "yu",
    "я": "ya",
}


def romanize_ru(text: str) -> str:
    """Lower-case, then one fixed Cyrillic table. Other chars pass through."""
    out: list[str] = []
    for ch in (text or "").lower():
        if ch in _RU:
            out.append(_RU[ch])
        else:
            out.append(ch)
    return "".join(out)
