"""Pure scoring code (handover_recite 6.4). No torch. No numpy needed.

canon, aksharas, align, bands, percent, score, cer.
"""

from __future__ import annotations

import re
import unicodedata


def canon(s: str) -> str:
    s = unicodedata.normalize("NFC", s or "")
    # Collapse a combining mark (Mn or Mc) repeated twice into one.
    out: list[str] = []
    for ch in s:
        cat = unicodedata.category(ch)
        if out and cat in ("Mn", "Mc") and out[-1] == ch:
            continue
        out.append(ch)
    s = "".join(out)
    # Word-final m + virama becomes anusvara.
    s = re.sub(r"म्(?=\s|[।॥]|$)", "ं", s)
    # Digits, dandas, avagraha, Om, Vedic accents -> space.
    s = re.sub(r"[0-9०-९]", " ", s)
    s = s.replace("।", " ").replace("॥", " ")
    s = s.replace("ऽ", " ").replace("ॐ", " ")
    s = "".join(
        c for c in s
        if not ("\u0951" <= c <= "\u0954" or "\u1cd0" <= c <= "\u1cff" or "\ua8e0" <= c <= "\ua8ff")
    )
    # Keep Devanagari block + spaces only.
    s = "".join(c for c in s if c == " " or "\u0900" <= c <= "\u097f")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _is_base(ch: str) -> bool:
    o = ord(ch)
    return (
        0x0904 <= o <= 0x0939
        or 0x0958 <= o <= 0x0961
        or 0x0972 <= o <= 0x097F
    )


def aksharas(s: str) -> list[str]:
    """Split canon text into aksharas. Spaces are dropped."""
    c = canon(s)
    out: list[str] = []
    cur = ""
    prev = ""
    for ch in c:
        if ch == " ":
            prev = " "
            continue
        if _is_base(ch) and prev != "\u094d":
            if cur:
                out.append(cur)
            cur = ch
        else:
            cur = cur + ch if cur else ch
            # A leading mark with no base yet starts its own cluster.
            if not cur:
                cur = ch
        prev = ch
    if cur:
        out.append(cur)
    # Drop empty / stray-space clusters.
    return [a for a in out if a.strip()]


def align(ref: list[str], hyp: list[str]) -> list[tuple[str, str]]:
    """Levenshtein per reference akshara: match/sub/del. Insertions dropped.

    Ties prefer match, then sub, then del.
    """
    n, m = len(ref), len(hyp)
    # dp[i][j] = cost to align ref[:i] with hyp[:j]
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        dp[i][0] = i
    for j in range(1, m + 1):
        dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost_sub = 0 if ref[i - 1] == hyp[j - 1] else 1
            dp[i][j] = min(
                dp[i - 1][j - 1] + cost_sub,
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
            )
    # Backtrack with preference match > sub > del > insert.
    ops: list[tuple[str, str]] = []
    i, j = n, m
    rev: list[tuple[str, str]] = []
    while i > 0 or j > 0:
        if i > 0 and j > 0 and ref[i - 1] == hyp[j - 1] and dp[i][j] == dp[i - 1][j - 1]:
            rev.append(("match", ""))
            i -= 1
            j -= 1
        elif i > 0 and j > 0 and dp[i][j] == dp[i - 1][j - 1] + 1:
            # Prefer sub over del/insert when tied (checked before del/insert).
            # But only take sub if it is actually on a cheapest path that is
            # not better explained as del+insert; dp equality is the test.
            # When both del and sub tie, sub wins per spec.
            if ref[i - 1] != hyp[j - 1]:
                rev.append(("sub", hyp[j - 1]))
                i -= 1
                j -= 1
            elif i > 0 and dp[i][j] == dp[i - 1][j] + 1:
                rev.append(("del", ""))
                i -= 1
            else:
                j -= 1  # insertion, not reported
        elif i > 0 and dp[i][j] == dp[i - 1][j] + 1:
            rev.append(("del", ""))
            i -= 1
        elif j > 0 and dp[i][j] == dp[i][j - 1] + 1:
            j -= 1  # insertion, not reported
        else:
            # Fallback (should not happen): prefer del over insert.
            if i > 0:
                if j > 0 and ref[i - 1] != hyp[j - 1]:
                    rev.append(("sub", hyp[j - 1]))
                    i -= 1
                    j -= 1
                else:
                    rev.append(("del", ""))
                    i -= 1
            else:
                j -= 1
    rev.reverse()
    # rev holds one entry per ref akshara (insertions skipped).
    ops = rev
    return ops


def bands(
    ref: list[str], hyps: list[list[str]], strict: bool
) -> list[dict]:
    aligns = [align(ref, h) for h in hyps]
    out: list[dict] = []
    for k, t in enumerate(ref):
        ops = [a[k][0] if k < len(a) else "del" for a in aligns]
        heard = ""
        for a in aligns:
            if k < len(a) and a[k][0] == "sub" and a[k][1]:
                heard = a[k][1]
                break
        if strict:
            if all(o == "match" for o in ops):
                band = "green"
            elif all(o != "match" for o in ops):
                band = "red"
            else:
                band = "amber"
        else:
            if any(o == "match" for o in ops):
                band = "green"
            else:
                subs = [a[k][1] if k < len(a) else "" for a in aligns]
                if all(o == "sub" for o in ops) and len(set(subs)) == 1:
                    band = "red"
                else:
                    band = "amber"
        out.append({"t": t, "band": band, "heard": heard if band == "red" or (not strict and band == "amber" and heard) else (heard if band == "red" else "")})
        # Spec: heard = first sub's heard or "". Keep it simple: red carries
        # heard; amber carries "" in strict mode.
        if strict and band == "amber":
            out[-1]["heard"] = ""
    return out


def percent(b: list[dict], strict: bool) -> float:
    g = sum(1 for x in b if x.get("band") == "green")
    r = sum(1 for x in b if x.get("band") == "red")
    a = sum(1 for x in b if x.get("band") == "amber")
    if strict:
        d = g + r + a
        return (g / d) if d else 0.0
    d = g + r
    return (g / d) if d else 0.0


def score(
    reference_lines: list[str], p_decodes: list[str], strict: bool = True
) -> dict:
    line_aksh: list[list[str]] = [aksharas(ln) for ln in reference_lines]
    lengths = [len(x) for x in line_aksh]
    ref: list[str] = [a for ln in line_aksh for a in ln]
    hyps = [aksharas(h) for h in p_decodes]
    hypo0 = hyps[0] if hyps else []
    if len(ref) < 3 or len(hypo0) < 2:
        return {
            "status": "unclear",
            "lines": [],
            "percent_strict": 0.0,
            "percent_liberal": 0.0,
            "n": {"green": 0, "red": 0, "amber": 0},
            "heard": p_decodes[0] if p_decodes else "",
        }
    b_all = bands(ref, hyps, strict)
    # Split back by line.
    lines: list[list[dict]] = []
    pos = 0
    for ln_len in lengths:
        lines.append(b_all[pos:pos + ln_len])
        pos += ln_len
    # Both percents from their own bandings.
    b_strict = bands(ref, hyps, True)
    b_liberal = bands(ref, hyps, False)
    ps = percent(b_strict, True)
    pl = percent(b_liberal, False)
    n = {
        "green": sum(1 for x in b_all if x["band"] == "green"),
        "red": sum(1 for x in b_all if x["band"] == "red"),
        "amber": sum(1 for x in b_all if x["band"] == "amber"),
    }
    return {
        "status": "scored",
        "lines": lines,
        "percent_strict": ps,
        "percent_liberal": pl,
        "n": n,
        "heard": p_decodes[0] if p_decodes else "",
    }


def _lev(a: str, b: str) -> int:
    n, m = len(a), len(b)
    dp = list(range(m + 1))
    for i in range(1, n + 1):
        prev = dp[0]
        dp[0] = i
        for j in range(1, m + 1):
            cur = dp[j]
            dp[j] = min(dp[j] + 1, dp[j - 1] + 1, prev + (0 if a[i - 1] == b[j - 1] else 1))
            prev = cur
    return dp[m]


def cer(ref: str, hyp: str) -> float:
    r = canon(ref).replace(" ", "")
    h = canon(hyp).replace(" ", "")
    if not r:
        return 0.0 if not h else 1.0
    return _lev(r, h) / len(r)
