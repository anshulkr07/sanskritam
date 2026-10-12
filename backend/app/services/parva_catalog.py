"""Machine-readable observance catalog (handover_observances section 3).

Date availability, content readiness, and publication remain separate
fields. A basic information page is never counted as a complete guide.

Rule verification references live in parva_rules.RULE_SOURCES; this module
only points at them and records the outcome per slug.
"""

from __future__ import annotations

from app.services import parva_rules as rules

# Observance types used by the shared page layout.
TYPES = (
    "single_day",
    "recurring_vrat",
    "sacred_period",
    "dated_series",
    "weekly_worship",
    "astronomical_event",
)

#: Stable catalog. `rule` names a parva_rules producer group; `rule_state`
#: is verified|partial|unverified. `content` lists which en/hi sections
#: exist in seeds; `missing` lists what is still absent. `shipped` mirrors
#: SHIPPED_RULES membership. `aliases` resolve user spelling to the slug.
CATALOG: list[dict] = [
    {
        "slug": "sharad_navaratri", "type": "dated_series", "recurrence": "yearly",
        "aliases": ["sharad navaratri", "navratri", "navaratri", "shardiya navratri", "ashwin navratri"],
        "traditions": ["north", "deccan", "gujarat", "tamil", "kerala", "bengal"],
        "rule": "sharad_navaratri", "rule_state": "verified",
        "rule_evidence": "RULE_SOURCES[sharad_navaratri]; fixtures navaratri.json 9/9 Delhi+Mumbai+Chennai 2026-28",
        "shipped": True, "priority": 10,
        "content": ["summary", "why", "series_days.names"],
        "missing": ["do.gather", "do.steps", "vrat", "texts", "regions", "ghatasthapana guide", "ashtami/navami practices"],
        "content_complete": False, "publication": "partial",
    },
    {
        "slug": "chaitra_navaratri", "type": "dated_series", "recurrence": "yearly",
        "aliases": ["chaitra navaratri", "vasant navratri", "chaitra navratri"],
        "traditions": ["north", "deccan", "gujarat", "tamil", "kerala", "bengal"],
        "rule": "chaitra_navaratri", "rule_state": "verified",
        "rule_evidence": "RULE_SOURCES[chaitra_navaratri]; fixtures navaratri.json 9/9 Delhi+Mumbai+Chennai 2026-28",
        "shipped": True, "priority": 10,
        "content": ["summary", "why", "series_days.names"],
        "missing": ["do.gather", "do.steps", "vrat", "texts", "regions"],
        "content_complete": False, "publication": "partial",
    },
    {
        "slug": "ekadashi", "type": "recurring_vrat", "recurrence": "twice-monthly",
        "aliases": ["ekadasi", "gyaras"],
        "traditions": ["north", "deccan", "gujarat", "tamil", "kerala", "bengal"],
        "rule": "ekadashi", "rule_state": "verified",
        "rule_evidence": "RULE_SOURCES[ekadashi]; fixtures ekadashi.json 24/24+25/25 Delhi/Mumbai/Chennai 2026-28",
        "shipped": True, "priority": 20,
        "content": ["generic guide", "nirjala variant", "prabodhini variant (draft)"],
        "missing": ["remaining 20+ variant guides", "parana UI already served via times"],
        "content_complete": False, "publication": "partial",
    },
    {
        "slug": "amavasya", "type": "recurring_vrat", "recurrence": "monthly",
        "aliases": ["amavas", "amavasai", "new moon"],
        "traditions": ["north", "deccan", "gujarat", "tamil", "kerala", "bengal"],
        "rule": "amavasya", "rule_state": "verified",
        "rule_evidence": "RULE_SOURCES[amavasya]; Drik amavasya year lists",
        "shipped": True, "priority": 30,
        "content": [],
        "missing": ["en/hi page seed deleted or absent; named-day variations (Somvati etc)"],
        "content_complete": False, "publication": "missing",
    },
    {
        "slug": "purnima", "type": "recurring_vrat", "recurrence": "monthly",
        "aliases": ["pournami", "full moon", "poornima"],
        "traditions": ["north", "deccan", "gujarat", "tamil", "kerala", "bengal"],
        "rule": "purnima", "rule_state": "verified",
        "rule_evidence": "RULE_SOURCES[purnima]; Drik purnima year lists; kartika vrat-day check 2027-11-13",
        "shipped": True, "priority": 30,
        "content": ["monthly satyanarayana guide (Skanda Reva 134)"],
        "missing": ["weekday-named variations review"],
        "content_complete": False, "publication": "partial",
    },
    {
        "slug": "kartika_purnima", "type": "single_day", "recurrence": "yearly",
        "aliases": ["kartik purnima", "karthika pournami", "dev deepawali"],
        "traditions": ["north", "deccan", "gujarat", "tamil", "kerala", "bengal"],
        "rule": "purnima:kartika_purnima", "rule_state": "verified",
        "rule_evidence": "purnima_occurrences variant kartika_purnima; vrat-day test",
        "shipped": True, "priority": 25,
        "content": ["bhishma-vow closing guide (Skanda 2.12, draft: no who_should_eat)"],
        "missing": ["who_should_eat source; complete guide status"],
        "content_complete": False, "publication": "draft",
    },
    {
        "slug": "janmashtami", "type": "single_day", "recurrence": "yearly",
        "aliases": ["janamashtami", "janmastami", "krishna jayanti", "gokulashtami"],
        "traditions": ["north", "deccan", "gujarat", "tamil", "kerala", "bengal"],
        "rule": "janmashtami", "rule_state": "verified",
        "rule_evidence": "RULE_SOURCES[janmashtami]; Drik Smarta 2026-09-04, 2027-08-25 (Ashtami at sunrise)",
        "shipped": True, "priority": 15,
        "content": [],
        "missing": ["en/hi vidhi/devotional content; smarta/vaishnava timing distinction"],
        "content_complete": False, "publication": "missing",
    },
    {
        "slug": "chaturmas", "type": "sacred_period", "recurrence": "yearly",
        "aliases": ["chaturmasa", "chaumasa"],
        "traditions": ["north", "deccan", "gujarat", "tamil", "kerala", "bengal"],
        "rule": "chaturmas", "rule_state": "verified",
        "rule_evidence": "RULE_SOURCES[chaturmas]; Devashayani to Prabodhini Ekadashi",
        "shipped": True, "priority": 80,
        "content": [],
        "missing": ["period page, practices, endpoint links"],
        "content_complete": False, "publication": "missing",
    },
    {
        "slug": "shravan", "type": "sacred_period", "recurrence": "yearly",
        "aliases": ["shravana", "sawan", "shravan month", "shravan somvar"],
        "traditions": ["north", "deccan", "gujarat", "tamil", "kerala", "bengal"],
        "rule": "shravan", "rule_state": "unverified",
        "rule_evidence": "lunar primitives exist; amanta/purnimanta + regional Monday mapping not verified against Drik",
        "shipped": False, "priority": 75,
        "content": [],
        "missing": ["tradition-aware boundaries", "somvar mapping", "period + daily content"],
        "content_complete": False, "publication": "missing",
    },
    {
        "slug": "shani_worship", "type": "weekly_worship", "recurrence": "weekly",
        "aliases": ["shani dev", "shanivar", "saturday worship", "shaniwar"],
        "traditions": ["north", "deccan", "gujarat", "tamil", "kerala", "bengal"],
        "rule": "shani_worship", "rule_state": "unverified",
        "rule_evidence": "no dedicated Saturday producer; weekly worship is a calendar convention, not an astronomical rule",
        "shipped": False, "priority": 60,
        "content": [],
        "missing": ["saturday devotional content; distinction from Jayanti"],
        "content_complete": False, "publication": "missing",
    },
    {
        "slug": "shani_jayanti", "type": "single_day", "recurrence": "yearly",
        "aliases": ["shani jayanti", "shani amavasya"],
        "traditions": ["north", "deccan", "gujarat", "tamil", "kerala", "bengal"],
        "rule": "shani_jayanti", "rule_state": "unverified",
        "rule_evidence": "no producer; Amavasya-based Jayanti date needs Drik verification",
        "shipped": False, "priority": 55,
        "content": [],
        "missing": ["verified date rule + devotional content"],
        "content_complete": False, "publication": "missing",
    },
    {
        "slug": "pitru_paksha", "type": "dated_series", "recurrence": "yearly",
        "aliases": ["pitra paksha", "pitru paksh", "shraddha paksha", "mahalaya paksha"],
        "traditions": ["north", "deccan", "gujarat", "tamil", "kerala", "bengal"],
        "rule": "pitru_paksha", "rule_state": "partial",
        "rule_evidence": "range 2026-09-27..10-10 verified; tithi mapping held to no Drik page yet",
        "shipped": False, "priority": 40,
        "content": ["shraddha-date tool (UI)"],
        "missing": ["daily tithi verification", "published content", "exception guidance"],
        "content_complete": False, "publication": "missing",
    },
    {
        "slug": "grahan_sutak", "type": "astronomical_event", "recurrence": "irregular",
        "aliases": ["grahan", "grahana", "eclipse", "sutak", "sootak", "chandra grahan", "surya grahan"],
        "traditions": ["north", "deccan", "gujarat", "tamil", "kerala", "bengal"],
        "rule": "grahan_sutak", "rule_state": "partial",
        "rule_evidence": "astronomy kind/contacts/visibility match Drik Mar-3-2026; sutak-BEGIN unresolved (05:16 vs 09:39); penumbral exclusion verified",
        "shipped": False, "priority": 50,
        "content": [],
        "missing": ["verified watch formula", "local visibility UI", "tradition applicability", "penumbral/non-visible states"],
        "content_complete": False, "publication": "missing",
    },
    {
        "slug": "diwali", "type": "single_day", "recurrence": "yearly",
        "aliases": ["deepavali", "deepawali", "diwali"],
        "traditions": ["north", "deccan", "gujarat", "tamil", "kerala", "bengal"],
        "rule": "diwali_days", "rule_state": "verified",
        "rule_evidence": "RULE_SOURCES[diwali_days]; Drik Delhi/Mumbai 2026-28",
        "shipped": True, "priority": 12,
        "content": ["lakshmi puja guide", "dhanteras/naraka/govardhan/bhai-dooj guides"],
        "missing": ["regional variation review"],
        "content_complete": False, "publication": "partial",
    },
    {
        "slug": "pradosh", "type": "recurring_vrat", "recurrence": "twice-monthly",
        "aliases": ["pradosham", "pradosh vrat"],
        "traditions": ["north", "deccan", "gujarat", "tamil", "kerala", "bengal"],
        "rule": "pradosh", "rule_state": "verified",
        "rule_evidence": "RULE_SOURCES[pradosh]; Drik Delhi 25+25 2026-27",
        "shipped": True, "priority": 35,
        "content": [],
        "missing": ["fasting guidance content"],
        "content_complete": False, "publication": "missing",
    },
    {
        "slug": "sankashti", "type": "recurring_vrat", "recurrence": "monthly",
        "aliases": ["sankashti chaturthi", "sankat hara"],
        "traditions": ["north", "deccan", "gujarat", "tamil", "kerala", "bengal"],
        "rule": "sankashti", "rule_state": "verified",
        "rule_evidence": "RULE_SOURCES[sankashti]; Drik Mumbai/Chennai 2028",
        "shipped": True, "priority": 35,
        "content": [],
        "missing": ["fasting guidance content"],
        "content_complete": False, "publication": "missing",
    },
    {
        "slug": "maha_shivaratri", "type": "single_day", "recurrence": "yearly",
        "aliases": ["shivratri", "shivaratri", "maha shivratri"],
        "traditions": ["north", "deccan", "gujarat", "tamil", "kerala", "bengal"],
        "rule": "maha_shivaratri", "rule_state": "verified",
        "rule_evidence": "RULE_SOURCES[maha_shivaratri]; nishitha window",
        "shipped": True, "priority": 18,
        "content": [],
        "missing": ["en/hi guide content"],
        "content_complete": False, "publication": "missing",
    },
    {
        "slug": "rama_navami", "type": "single_day", "recurrence": "yearly",
        "aliases": ["ram navami", "sri rama navami"],
        "traditions": ["north", "deccan", "gujarat", "tamil", "kerala", "bengal"],
        "rule": "rama_navami", "rule_state": "verified",
        "rule_evidence": "RULE_SOURCES[rama_navami]; madhyahna window",
        "shipped": True, "priority": 18,
        "content": [],
        "missing": ["en/hi guide content"],
        "content_complete": False, "publication": "missing",
    },
    {
        "slug": "ganesh_chaturthi", "type": "single_day", "recurrence": "yearly",
        "aliases": ["ganesh chaturthi", "vinayaka chaturthi annual", "ganpati", "vinayagar"],
        "traditions": ["north", "deccan", "gujarat", "tamil", "kerala", "bengal"],
        "rule": "ganesh_chaturthi", "rule_state": "verified",
        "rule_evidence": "RULE_SOURCES[ganesh_chaturthi]; Drik Delhi+Mumbai 2027-28",
        "shipped": True, "priority": 18,
        "content": [],
        "missing": ["en/hi guide content"],
        "content_complete": False, "publication": "missing",
    },
    {
        "slug": "karwa_chauth", "type": "single_day", "recurrence": "yearly",
        "aliases": ["karva chauth", "karwa chauth"],
        "traditions": ["north"],
        "rule": "karwa_chauth", "rule_state": "verified",
        "rule_evidence": "RULE_SOURCES[karwa_chauth]; Drik Delhi 2026-27",
        "shipped": True, "priority": 22,
        "content": [],
        "missing": ["page deleted in audit: Narada Purana 113 unopenable; needs new source"],
        "content_complete": False, "publication": "missing",
    },
    {
        "slug": "chhath", "type": "single_day", "recurrence": "yearly",
        "aliases": ["chhath puja", "surya shashthi"],
        "traditions": ["north", "bengal"],
        "rule": "chhath", "rule_state": "verified",
        "rule_evidence": "RULE_SOURCES[chhath]; Drik Delhi 2026-27",
        "shipped": True, "priority": 22,
        "content": [],
        "missing": ["en/hi guide content (seeds deleted in tree)"],
        "content_complete": False, "publication": "missing",
    },
    {
        "slug": "raksha_bandhan", "type": "single_day", "recurrence": "yearly",
        "aliases": ["rakhi", "raksha bandhan"],
        "traditions": ["north", "deccan", "gujarat"],
        "rule": "raksha_bandhan", "rule_state": "verified",
        "rule_evidence": "RULE_SOURCES[raksha_bandhan]",
        "shipped": True, "priority": 22,
        "content": [],
        "missing": ["en/hi guide content"],
        "content_complete": False, "publication": "missing",
    },
]

_SLUG_INDEX: dict[str, dict] = {c["slug"]: c for c in CATALOG}
_ALIAS_INDEX: dict[str, str] = {}
for _c in CATALOG:
    _ALIAS_INDEX[_c["slug"].lower()] = _c["slug"]
    for _a in _c.get("aliases", []):
        _ALIAS_INDEX[_a.lower()] = _c["slug"]


def resolve_slug(text: str) -> str:
    """Resolve user spelling to a stable internal slug."""
    key = (text or "").strip().lower()
    if key in _SLUG_INDEX:
        return key
    if key in _ALIAS_INDEX:
        return _ALIAS_INDEX[key]
    norm = key.replace("_", " ").strip()
    return _ALIAS_INDEX.get(norm, key)


def catalog_report(pages: set[tuple[str, str]] | None = None) -> list[dict]:
    """Catalog rows with live publication status joined from page keys."""
    pages = pages or set()
    out: list[dict] = []
    for c in CATALOG:
        slug = c["slug"]
        has = any(s == slug for s, _v in pages)
        row = dict(c)
        row["shipped"] = slug in rules.SHIPPED_RULES or c["shipped"] and slug in rules.SHIPPED_RULES
        # Recompute shipped strictly from the allowlist.
        row["shipped"] = slug in rules.SHIPPED_RULES or (
            slug in ("diwali",) and "diwali" in rules.SHIPPED_RULES
        )
        if slug == "kartika_purnima":
            row["shipped"] = "kartika_purnima" in rules.SHIPPED_RULES
        if slug == "shravan":
            row["shipped"] = "shravan" in rules.SHIPPED_RULES
        if slug in ("shani_worship", "shani_jayanti"):
            row["shipped"] = False
        row["has_published_page"] = has
        out.append(row)
    return out


def availability_for(slug: str, has_page: bool) -> str:
    """verified calendar info vs basic detail vs complete guide.

    - shipped rule + published complete content -> complete_guide
    - shipped rule + published page (minimal) -> basic_detail
    - shipped rule, no page -> verified_dates (basic detail endpoint still works)
    - unshipped rule -> unavailable_tradition_or_unverified
    """
    entry = _SLUG_INDEX.get(slug)
    shipped = slug in rules.SHIPPED_RULES or (
        slug == "kartika_purnima" and "kartika_purnima" in rules.SHIPPED_RULES
    )
    if entry is not None and not shipped:
        return "unavailable_unverified"
    if has_page:
        if entry is not None and entry.get("content_complete"):
            return "complete_guide"
        return "basic_detail"
    if shipped:
        return "verified_dates"
    return "unavailable_unverified"
