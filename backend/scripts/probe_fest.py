"""Throwaway festival calibration probe (deleted after use)."""

import os
import sys
from datetime import date, timedelta

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import panchang as P

DELHI = {"lat": 28.6139, "lon": 77.2090, "tz": "Asia/Kolkata", "label": "New Delhi"}


def span(day, label):
    sr = P.sunrise(day, DELHI)
    n, end = P.tithi_at(sr)
    pak, name = P.tithi_name(n)
    from datetime import timezone
    import zoneinfo
    ist = zoneinfo.ZoneInfo("Asia/Kolkata")
    print(f"{label} {day} sunrise tithi: {pak} {name} ends {end.astimezone(ist).strftime('%d %H:%M')}")


for d in [date(2026, 3, 2), date(2026, 3, 3), date(2026, 3, 4)]:
    sr = P.sunrise(d, DELHI)
    ss = P.sunset(d, DELHI)
    pradosh_mid = ss + P._PRADOSH / 2
    n, _ = P.tithi_at(sr)
    n2, _ = P.tithi_at(pradosh_mid)
    print(d, "sunrise:", P.tithi_name(n), "pradosh-mid:", P.tithi_name(n2))

print("---- govardhan candidates")
print(P._dates_for_tithi(2026, DELHI, "Kartika", "Shukla", 1, None))
print("---- ugadi candidates")
print(P._dates_for_tithi(2026, DELHI, "Chaitra", "Shukla", 1, "sunrise"))
print("---- raksha candidates")
print(P._dates_for_tithi(2026, DELHI, "Shravana", "Shukla", 15, "afternoon"))
print("---- navami candidates")
print(P._dates_for_tithi(2026, DELHI, "Ashwina", "Shukla", 9, None))
for d in [date(2026, 8, 27), date(2026, 8, 28)]:
    span(d, "raksha")
for d in [date(2026, 10, 19), date(2026, 10, 20)]:
    span(d, "navami")
