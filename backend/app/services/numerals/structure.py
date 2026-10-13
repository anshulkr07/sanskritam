"""Exact decimal decomposition for Number Builder.

Numbers are decimal strings — never floats. A canonical value carries an
optional sign, an integer part of at most 9 digits (0 .. 999,999,999) and an
optional fraction of at most 3 digits whose trailing zeros are significant
("10.00" keeps two spoken zeros; ".340" keeps three spoken digits).

Indian grouping (… crore, lakh, thousand, rest) and international grouping
(… million, thousand, rest) both decompose into ordered place-value groups
whose coefficients never exceed 99, except the leading international group
(millions/thousands-of-thousands) which may reach 999 and is therefore split
into a hundreds coefficient slot and a 0-99 remainder slot.
"""

from __future__ import annotations

from dataclasses import dataclass

MAX_INT_DIGITS = 9
MAX_FRAC_DIGITS = 3


class DecimalParseError(ValueError):
    """The string is not a number this engine accepts."""


@dataclass(frozen=True)
class DecimalNumber:
    """Canonical parsed value. int_part has no leading zeros ("0" for zero)."""

    negative: bool
    int_part: str
    frac_part: str  # "" when the prompt has no fraction

    @property
    def has_fraction(self) -> bool:
        return self.frac_part != ""

    @property
    def is_zero(self) -> bool:
        return set(self.int_part) == {"0"} and set(self.frac_part) in ({"0"}, set())

    @property
    def canonical(self) -> str:
        s = self.int_part
        if self.frac_part:
            s = f"{s}.{self.frac_part}"
        return ("-" if self.negative and not self.is_zero else "") + s

    @property
    def int_value(self) -> int:
        return int(self.int_part)


def parse_decimal(raw: str) -> DecimalNumber:
    """Parse a decimal string strictly; raise DecimalParseError when out of range."""
    s = (raw or "").strip().replace(",", "").replace("_", "")
    if not s:
        raise DecimalParseError("empty")
    negative = s.startswith("-")
    if s.startswith(("+", "-")):
        s = s[1:]
    if "." in s:
        int_s, _, frac_s = s.partition(".")
    else:
        int_s, frac_s = s, ""
    if not int_s.isdigit() or (frac_s and not frac_s.isdigit()):
        raise DecimalParseError(f"not a decimal number: {raw!r}")
    if len(int_s.lstrip("0") or "0") > MAX_INT_DIGITS:
        raise DecimalParseError("integer part beyond 999,999,999")
    if len(frac_s) > MAX_FRAC_DIGITS:
        raise DecimalParseError("more than three fractional digits")
    int_norm = int_s.lstrip("0") or "0"
    return DecimalNumber(negative=negative, int_part=int_norm, frac_part=frac_s)


def display_grouped(value: DecimalNumber, grouping: str) -> str:
    """International (104,847,322.34) or Indian (10,48,47,322.34) display."""
    digits = value.int_part.lstrip("0") or "0"
    if grouping not in ("indian", "international"):
        raise ValueError(f"unknown grouping {grouping!r}")
    if grouping == "indian":
        parts: list[str] = []
        if len(digits) > 3:
            head, tail = digits[:-3], digits[-3:]
            parts.append(tail)
            while len(head) > 2:
                parts.append(head[-2:])
                head = head[:-2]
            parts.append(head)
        else:
            parts.append(digits)
        out = ",".join(reversed(parts))
    else:
        out = f"{int(digits):,}"
    if value.frac_part:
        out = f"{out}.{value.frac_part}"
    return ("-" + out) if value.negative and not value.is_zero else out


@dataclass(frozen=True)
class PlaceGroup:
    """One nonzero place-value group in reading order (largest scale first).

    kind: "crore"|"lakh"|"million"|"thousand"|"hundred"|"unit"
    hundreds_part: 1..9 only for leading international groups >= 100; 0 otherwise.
    tens: the 0-99 remainder coefficient of the group.
    """

    kind: str
    hundreds_part: int
    tens: int

    @property
    def value(self) -> int:
        return self.hundreds_part * 100 + self.tens

    @property
    def is_split(self) -> bool:
        """A coefficient needing two reviewed pieces (hundreds word + remainder)."""
        return self.hundreds_part > 0


def integer_groups(value: DecimalNumber, grouping: str) -> list[PlaceGroup]:
    """Nonzero groups, largest first. Zero renders as one unit group of 0."""
    n = value.int_value
    if grouping == "indian":
        crore, n = divmod(n, 10_000_000)
        lakh, n = divmod(n, 100_000)
        thousand, n = divmod(n, 1000)
        hundred, unit = divmod(n, 100)
        raw = [("crore", crore), ("lakh", lakh), ("thousand", thousand),
               ("hundred", hundred), ("unit", unit)]
        split_ok = False  # Indian group coefficients never exceed 99.
    elif grouping == "international":
        million, n = divmod(n, 1_000_000)
        thousand, n = divmod(n, 1000)
        hundred, unit = divmod(n, 100)
        raw = [("million", million), ("thousand", thousand),
               ("hundred", hundred), ("unit", unit)]
        split_ok = True  # million/thousand coefficients can reach 999.
    else:
        raise ValueError(f"unknown grouping {grouping!r}")
    out: list[PlaceGroup] = []
    for kind, coefficient in raw:
        if coefficient == 0 and kind != "unit":
            continue
        if coefficient == 0 and kind == "unit" and out:
            continue  # an exact multiple of the larger scale has no unit group
        hundreds_part = (coefficient // 100) if split_ok and kind in ("million", "thousand") else 0
        tens = coefficient % 100 if split_ok and kind in ("million", "thousand") else coefficient
        if coefficient == 0 and kind == "unit" and not out:
            out.append(PlaceGroup("unit", 0, 0))
            continue
        out.append(PlaceGroup(kind, hundreds_part, tens))
    return out


def _slot(slot_id: str, kind: str, *, group: str | None = None,
          coef_kind: str | None = None, value: int | None = None,
          digit_index: int | None = None) -> dict:
    return {
        "id": slot_id,
        "kind": kind,  # sign | coef | unit | scale | marker | digit
        "group": group,
        "coef_kind": coef_kind,  # hundreds | tens | simple
        "value": value,
        "digit_index": digit_index,
    }


def build_skeleton(value: DecimalNumber, grouping: str, *, include_sign: bool = False) -> list[dict]:
    """The dropdown phrase skeleton: one entry per slot, in reading order.

    Zero-valued integer groups are omitted; fractional zeros are preserved as
    digit slots; the sign slot appears only when the pack includes negatives.
    A split coefficient (international millions/thousands >= 100) expands into
    [coef 1-9][hundred scale][coef 0-99][outer scale] — the tens slot is
    omitted when the remainder is zero ("one hundred thousand", never
    "one hundred zero thousand").
    `value` fields are the answer key — never send this list to a client; use
    `phrase_slots_payload` (render.py) for the client view.
    """
    slots: list[dict] = []
    if include_sign and value.negative:
        slots.append(_slot("sign", "sign", value=1))
    for idx, g in enumerate(integer_groups(value, grouping)):
        gid = f"g{idx}"
        if g.kind == "unit":
            slots.append(_slot(f"{gid}-coef", "unit", group="unit", coef_kind="simple", value=g.tens))
            continue
        if g.is_split:
            slots.append(_slot(f"{gid}-coef-h", "coef", group=g.kind, coef_kind="hundreds", value=g.hundreds_part))
            slots.append(_slot(f"{gid}-scale-h", "scale", group="hundred", value=g.hundreds_part))
            if g.tens > 0:
                slots.append(_slot(f"{gid}-coef-t", "coef", group=g.kind, coef_kind="tens", value=g.tens))
        else:
            slots.append(_slot(f"{gid}-coef", "coef", group=g.kind, coef_kind="simple", value=g.value))
        slots.append(_slot(f"{gid}-scale", "scale", group=g.kind, value=g.value))
    if value.has_fraction:
        slots.append(_slot("marker", "marker", value=1))
        for i, ch in enumerate(value.frac_part):
            slots.append(_slot(f"d{i}", "digit", value=int(ch), digit_index=i))
    return slots


def skeleton_fingerprint(value: DecimalNumber, grouping: str) -> str:
    """Stable fingerprint of a prompt's shape (used for unseen-pack dedupe)."""
    groups = ",".join(f"{g.kind}:{g.value}" for g in integer_groups(value, grouping))
    return f"{value.canonical}|{grouping}|{groups}|f{len(value.frac_part)}"
