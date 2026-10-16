"""Explicit defaults; all real prices displayed by the app come from the stores."""
PREFIX = "com.sanskritam.app."
TIERS = {
    "free": {"slots": 5, "credits": 0},
    "lite": {"slots": 10, "credits": 120},
    "plus": {"slots": 20, "credits": 450},
    "pro": {"slots": None, "credits": 1800},
}
PRODUCTS = {
    **{PREFIX + tier + ".monthly": {"kind": "subscription", "tier": tier,
       "credits": TIERS[tier]["credits"], "inr": price}
       for tier, price in (("lite", 99), ("plus", 299), ("pro", 999))},
    **{PREFIX + "credits." + size: {"kind": "refill", "credits": credits, "inr": price}
       for size, price, credits in (("small", 99, 100), ("medium", 299, 330), ("large", 999, 1200))},
    **{PREFIX + "supporter." + size: {"kind": "supporter", "credits": 0, "inr": price}
       for size, price in (("bronze", 99), ("silver", 299), ("gold", 999))},
    PREFIX + "hosting": {"kind": "hosting", "credits": 0, "inr": 499},
}
ACTION_RATES = {"ask": 2, "analysis": 8, "voice": 20, "recitation": 5}
TITLE_PRICES = {"book": {"short": 30, "standard": 80, "long": 150},
                "audio": {"short": 80, "standard": 200, "long": 500}}
REGIONAL_MEMBERSHIPS = {"USD": [3.99, 8.99, 19.99], "EUR": [2.99, 6.99, 17.99],
                       "GBP": [2.49, 5.99, 14.99]}
