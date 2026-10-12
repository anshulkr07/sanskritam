"""Akshara agreement with a single STT transcript, not phonetic confidence."""

from __future__ import annotations

import re
import unicodedata


def aksharas(text: str) -> list[str]:
    text = unicodedata.normalize("NFC", text or "")
    text = re.sub(r"म्(?=\s|[।॥]|$)", "ं", text)
    # Ignore punctuation, verse numbers, accents and joiners, not vowels/signs.
    text = "".join(c for c in text if c.isspace() or
                   ("\u0900" <= c <= "\u097f" and c not in "।॥ऽॐ०१२३४५६७८९॒॑॓॔"))
    out: list[str] = []
    current = ""
    previous = ""
    for c in text:
        if c.isspace():
            if current:
                out.append(current)
                current = ""
            previous = ""
            continue
        base = ("\u0904" <= c <= "\u0939" or "\u0958" <= c <= "\u0961"
                or "\u0972" <= c <= "\u097f")
        if base and previous != "्":
            if current:
                out.append(current)
            current = c
        else:
            # Collapse duplicated combining signs emitted by STT.
            if not (c == previous and unicodedata.category(c) in ("Mn", "Mc")):
                current += c
        previous = c
    if current:
        out.append(current)
    return out


def score_transcript(reference_lines: list[str], heard: str) -> dict:
    groups = [aksharas(line) for line in reference_lines]
    ref = [a for group in groups for a in group]
    hyp = aksharas(heard)
    unclear = {"status": "unclear", "lines": [], "percent_strict": 0.0,
               "percent_liberal": 0.0, "n": {"green": 0, "red": 0, "amber": 0},
               "heard": heard, "insertions": 0}
    if len(ref) < 3 or len(hyp) < 2:
        return unclear
    n, m = len(ref), len(hyp)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            dp[i][j] = min(dp[i - 1][j - 1] + (ref[i - 1] != hyp[j - 1]),
                           dp[i - 1][j] + 1, dp[i][j - 1] + 1)
    # Each operation retains its reference position for per-line feedback.
    ops = []
    i, j = n, m
    while i or j:
        if i and j and dp[i][j] == dp[i - 1][j - 1] + (ref[i - 1] != hyp[j - 1]):
            match = ref[i - 1] == hyp[j - 1]
            ops.append((i - 1, {"t": ref[i - 1], "band": "green" if match else "red",
                                "heard": "" if match else hyp[j - 1]}))
            i, j = i - 1, j - 1
        elif i and dp[i][j] == dp[i - 1][j] + 1:
            ops.append((i - 1, {"t": ref[i - 1], "band": "red", "heard": ""}))
            i -= 1
        else:
            ops.append((min(i, n - 1), {"t": "+", "band": "red", "heard": hyp[j - 1]}))
            j -= 1
    ops.reverse()
    owners = [idx for idx, group in enumerate(groups) for _ in group]
    lines: list[list[dict]] = [[] for _ in groups]
    for pos, row in ops:
        lines[owners[pos]].append(row)
    green = sum(row["band"] == "green" for _, row in ops)
    pct = green / len(ops)
    return {"status": "scored", "lines": lines, "percent_strict": pct,
            "percent_liberal": pct, "n": {"green": green, "red": len(ops) - green, "amber": 0},
            "heard": heard, "insertions": sum(row["t"] == "+" for _, row in ops)}
