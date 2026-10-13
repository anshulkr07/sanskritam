"""Play catalog: the seven games, their setup specs and ranked rules.

One registry drives the hub, setup screens, ranked round issuance and the
results sheet, so "ranked rounds clearly show their fixed rules" and casual
"remember previous settings" both come from the same source.
"""

from __future__ import annotations

from dataclasses import dataclass, field


RANKED_ATTEMPTS_PER_DAY = 3  # each game except daily-word
DAILY_WORD_ATTEMPTS = 1
TOP_GAMES_COUNT = 3  # combined daily total = best of three distinct games
GOAL_ROUNDS_PER_DAY = 3  # personal Play goal: completed valid rounds

GRACE_SUBMIT_SECONDS = 120  # a round started before close may finish within deadline + grace


@dataclass(frozen=True)
class GameDef:
    key: str
    title: str
    sa: str
    subtitle: str
    tint: str  # theme fill name
    ranked: bool
    ranked_spec: dict  # fixed round specification for ranked play
    casual_difficulties: list[dict] = field(default_factory=list)
    local_modes: list[str] = field(default_factory=list)  # pass-and-play / shared-board labels
    live_modes: list[str] = field(default_factory=list)
    setup_remember: list[str] = field(default_factory=list)  # casual settings remembered client-side
    rules_text: str = ""
    requires_media: str = ""  # non-empty = ranked availability gated on media inventory
    practice_only: bool = False


GAMES: dict[str, GameDef] = {g.key: g for g in [
    GameDef(
        key="smriti", title="Smriti", sa="स्मृतिः", subtitle="Memory pairs", tint="rose",
        ranked=True,
        ranked_spec={"pairs": 8, "deck": "picture-word", "time_limit_s": 240},
        casual_difficulties=[{"pairs": 6, "label": "6 pairs"}, {"pairs": 8, "label": "8 pairs"}, {"pairs": 10, "label": "10 pairs"}],
        local_modes=["turns"], live_modes=["race"],
        setup_remember=["deck", "pairs"],
        rules_text=("Find the pairs. Fewer committed attempts score higher. "
                    "Ranked uses eight picture-word pairs from a shared layout seed."),
        requires_media="illustrations",
    ),
    GameDef(
        key="rush", title="Shabda Rush", sa="शब्द-वेगः", subtitle="Vocabulary sprint", tint="saffron",
        ranked=True,
        ranked_spec={"questions": 10, "mix": ["word-meaning", "picture-word", "audio-word"],
                     "presentation_allowance_ms": 2500, "answer_window_ms": 12000},
        casual_difficulties=[{"questions": 10, "label": "10 questions"}, {"questions": 15, "label": "15 questions"}],
        local_modes=["pass-and-play"], live_modes=["simultaneous"],
        setup_remember=["questions"],
        rules_text=("Ten short prompts: meaning, picture and audio tasks. Correctness dominates; "
                    "speed adds at most a tenth. Everyone answers the same unseen pack."),
    ),
    GameDef(
        key="varna-jaal", title="Varna Jaal", sa="वर्ण-जालम्", subtitle="Accessible word search", tint="slate",
        ranked=True,
        ranked_spec={"size": 4, "words": 5, "time_limit_s": 300},
        casual_difficulties=[{"size": 3, "label": "3 × 3"}, {"size": 4, "label": "4 × 4"}],
        local_modes=["equivalent-boards"], live_modes=["race"],
        setup_remember=["size"],
        rules_text=("Drag across touching aksharas to find every hidden word. "
                    "Ranked uses a fixed 4 × 4 board specification."),
    ),
    GameDef(
        key="daily-word", title="Daily Word", sa="वर्ण-बन्धः", subtitle="A short daily ritual", tint="gold",
        ranked=True,
        ranked_spec={"guesses": 6, "puzzle": "daily"},
        casual_difficulties=[{"mode": "duel", "label": "Duel (casual)"}],
        local_modes=["duel"], live_modes=["duel"],
        setup_remember=[],
        rules_text=("One ranked puzzle a day, six guesses. Duel puzzles are casual and never reveal "
                    "the daily solution. The daily puzzle is Daily Word's only ranked contribution."),
    ),
    GameDef(
        key="word-groups", title="Word Groups", sa="पद-वर्गाः", subtitle="Find the related words", tint="teal",
        ranked=True,
        ranked_spec={"tiles": 16, "group_size": 4, "max_wrong": 4},
        casual_difficulties=[{"tiles": 9, "group_size": 3, "label": "Beginner 3 × 3"}, {"tiles": 16, "group_size": 4, "label": "Standard 4 × 4"}],
        local_modes=["alternating"], live_modes=["independent-race"],
        setup_remember=["size"],
        rules_text=("Select tiles that belong together and submit the group. Solve all groups; "
                    "four wrong submissions end a standard round."),
    ),
    GameDef(
        key="pada-path", title="Pada Path", sa="पद-पथः", subtitle="Build the phrase", tint="sage",
        ranked=True,
        ranked_spec={"prompts": 5, "mix": ["sentence", "quotation"]},
        casual_difficulties=[{"prompts": 3, "label": "3 prompts"}, {"prompts": 5, "label": "5 prompts"}],
        local_modes=["equivalent-packs"], live_modes=["simultaneous"],
        setup_remember=["prompts"],
        rules_text=("Assemble the word tiles into the phrase. Sentences accept every reviewed word "
                    "order; quotations keep their prescribed sequence."),
    ),
    GameDef(
        key="number", title="Number Builder", sa="सङ्ख्या-रचना", subtitle="Speak the number", tint="maroon",
        ranked=True,
        ranked_spec={"prompts": 5, "langs": ["sa"], "grouping": "indian"},
        casual_difficulties=[
            {"band": "0-20", "label": "0–20"},
            {"band": "21-99", "label": "21–99"},
            {"band": "hundreds-thousands", "label": "Hundreds & thousands"},
            {"band": "lakhs-crores", "label": "Lakhs & crores"},
            {"band": "decimals-negatives", "label": "Decimals & negatives"},
        ],
        local_modes=["equivalent-sets"], live_modes=["simultaneous"],
        setup_remember=["band", "answer_lang"],
        rules_text=("Build the spoken phrase from the dropdowns. Values, structure and construction "
                    "score separately. Sanskrit-mode results count for the main daily total; "
                    "English-only play has its own standings."),
    ),
]}

GAME_KEYS = list(GAMES.keys())
RANKED_GAME_KEYS = [k for k, g in GAMES.items() if g.ranked]

# Grammar exercises live in Learn/Practice — never duplicated inside Play.
PRACTICE_ROUTES = [
    {"name": "Word order", "kind": "reorder", "title": "Word order", "route": "PracticeRound"},
    {"name": "Sandhi", "kind": "sandhi_join", "title": "Sandhi", "route": "PracticeRound"},
    {"name": "Paradigms", "kind": "grid_fill", "title": "Paradigms", "route": "PracticeRound"},
    {"name": "Pingala", "kind": "scan_metre", "title": "Pingala", "route": "PracticeRound"},
]


def catalog_payload() -> dict:
    """Client catalog: setups, ranked rules, media gates. No answer keys."""
    games = []
    for g in GAMES.values():
        games.append({
            "key": g.key,
            "title": g.title,
            "sa": g.sa,
            "subtitle": g.subtitle,
            "tint": g.tint,
            "ranked": g.ranked,
            "ranked_spec": g.ranked_spec,
            "casual_difficulties": g.casual_difficulties,
            "local_modes": g.local_modes,
            "live_modes": g.live_modes,
            "setup_remember": g.setup_remember,
            "rules_text": g.rules_text,
            "requires_media": g.requires_media,
        })
    return {"games": games, "practice": PRACTICE_ROUTES,
            "ranked_attempts_per_day": RANKED_ATTEMPTS_PER_DAY,
            "goal_rounds": GOAL_ROUNDS_PER_DAY}


def is_ranked_game(key: str) -> bool:
    return key in GAMES and GAMES[key].ranked
