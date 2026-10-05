"""Build the place list behind GET /places/search from GeoNames' cities5000.

Owner, 2026-10-06: a place of birth must be findable anywhere (Berlin, a small
town), searched through the server, cities5000 (every city above 5,000
people, plus regional capitals). Source: https://download.geonames.org/export/dump/
(cities5000.zip, admin1CodesASCII.txt, countryInfo.txt), licensed CC BY 4.0
(its readme.txt, read 2026-10-06); the credit is in seeds/licences.py.

Usage:
    cd backend && ./.venv/Scripts/python.exe scripts/build_places.py <dir with the three GeoNames files>

Writes app/seeds/places/cities5000.tsv.gz, one place a line:
    name, other names (ASCII or Devanagari, comma separated), region, country,
    lat, lon (two decimals, about 1 km), IANA time zone, population
"""

from __future__ import annotations

import gzip
import io
import os
import re
import sys

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "app", "seeds", "places", "cities5000.tsv.gz")

_DEVA = re.compile(r"^[ऀ-ॿ\s]+$")
_ASCII = re.compile(r"^[A-Za-z][A-Za-z .'\-]*$")
MAX_ALTS = 12


def main(src: str) -> None:
    countries: dict[str, str] = {}
    for line in io.open(os.path.join(src, "countryInfo.txt"), encoding="utf-8"):
        if line.startswith("#") or not line.strip():
            continue
        f = line.rstrip("\n").split("\t")
        countries[f[0]] = f[4]
    regions: dict[str, str] = {}
    for line in io.open(os.path.join(src, "admin1CodesASCII.txt"), encoding="utf-8"):
        f = line.rstrip("\n").split("\t")
        if len(f) >= 2:
            regions[f[0]] = f[1]
    rows = []
    for line in io.open(os.path.join(src, "cities5000.txt"), encoding="utf-8"):
        f = line.rstrip("\n").split("\t")
        if len(f) < 19:
            continue
        name, ascii_name, alts = f[1], f[2], f[3]
        lat, lon, cc, adm1, pop, tz = f[4], f[5], f[8], f[10], f[14], f[17]
        if not tz:
            continue
        seen = {name.casefold()}
        keep = []
        others = [a.strip() for a in alts.split(",")]
        # Devanagari names first (a few), so a Hindi search finds the place.
        ordered = [a for a in others if _DEVA.match(a)][:3] + [ascii_name] + others
        for a in ordered:
            a = a.strip()
            # Airport and short codes (BER, VNS, MUN) are not names people type.
            if not a or len(a) > 40 or a.casefold() in seen or re.fullmatch(r"[A-Z]{2,4}", a):
                continue
            if _ASCII.match(a) or _DEVA.match(a):
                seen.add(a.casefold())
                keep.append(a)
            if len(keep) >= MAX_ALTS:
                break
        rows.append("\t".join([
            name.replace("\t", " "), ",".join(keep), regions.get(f"{cc}.{adm1}", ""),
            countries.get(cc, cc), f"{float(lat):.2f}", f"{float(lon):.2f}", tz, pop or "0",
        ]))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with gzip.open(OUT, "wt", encoding="utf-8", newline="\n") as out:
        out.write("\n".join(rows) + "\n")
    print(f"{len(rows)} places -> {OUT} ({os.path.getsize(OUT) // 1024} KB)")


if __name__ == "__main__":
    main(sys.argv[1])
