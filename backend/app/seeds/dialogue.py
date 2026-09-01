"""Seed data: 'प्रथमं मेलनम्' — first meeting dialogue graph (30 nodes).

Terminal convention: a terminal node has id "nterm" with NO outgoing edges
(its to_node_id is referenced by the final closing edge).

Every sa-edge is validated by grade_attempt against the real analyzer.
"""
import uuid
import logging

logger = logging.getLogger("shabd.seed")

# ─── Node definitions ───────────────────────────────────────────────────

# Helper: node dict builder
def _n(id_, kind, lang, devanagari, **kw):
    d = {
        "id": id_,
        "kind": kind,
        "lang": lang,
        "devanagari": devanagari,
        "iast": kw.pop("iast", ""),
        "gloss": kw.pop("gloss", ""),
        "audio_url": kw.pop("audio_url", ""),
        "ratio_band_min": kw.pop("ratio_band_min", 0.2),
        "ratio_band_max": kw.pop("ratio_band_max", 0.5),
        "repair_type": kw.pop("repair_type", None),
        "sort": kw.pop("sort", 0),
    }
    if kw:
        raise ValueError(f"Unexpected kwargs: {kw}")
    return d


def _e(node_id, lang, to_node_id, **kw):
    """Edge dict: from node_id to to_node_id."""
    d = {
        "from_node_id": node_id,
        "lang": lang,
        "to_node_id": to_node_id,
        "expected_text": kw.pop("expected_text", ""),
        "accepted_parses": kw.pop("accepted_parses", []),
        "expected_phrases": kw.pop("expected_phrases", []),
        "features": kw.pop("features", []),
        "rank": kw.pop("rank", 0),
    }
    if kw:
        raise ValueError(f"Unexpected kwargs: {kw}")
    return d


# ── Nodes (30 total) ────────────────────────────────────────────────────

# Bridge-dedicated nodes
N00 = _n("n00", "tutor", "hi",
         "नमस्ते! आइए, हम संस्कृत में बात करेंगे। तैयार हैं?",
         sort=0)

N00R = _n("n00r", "repair", "hi",
          "कोई बात नहीं। जब तैयार हों तो 'हाँ' कहें।",
          repair_type="ask_again", sort=1)

# 12 Sanskrit QA nodes
N01 = _n("n01", "tutor", "sa",
         "साधु! भवान् कः?",
         iast="sādhu! bhavān kaḥ?", sort=10)

N02 = _n("n02", "tutor", "sa",
         "भवान् कुतः आगच्छति?",
         iast="bhavān kuta āgacchati?", sort=20)

N03 = _n("n03", "tutor", "sa",
         "भवान् किं खादति?",
         iast="bhavān kim khādati?", sort=30)

N04 = _n("n04", "tutor", "sa",
         "भवान् कुत्र वसति?",
         iast="bhavān kutra vasati?", sort=40)

N05 = _n("n05", "tutor", "sa",
         "भवान् किं पठति?",
         iast="bhavān kim paṭhati?", sort=50)

N06 = _n("n06", "tutor", "sa",
         "भवान् कुत्र गच्छति?",
         iast="bhavān kutra gacchati?", sort=60)

N07 = _n("n07", "tutor", "sa",
         "भवान् कैः सह गच्छति?",
         iast="bhavān kaiḥ saha gacchati?", sort=70)

N08 = _n("n08", "tutor", "sa",
         "भवान् गृहे किं करोति?",
         iast="bhavān gṛhe kim karoti?", sort=80)

N09 = _n("n09", "tutor", "sa",
         "भवान् कदा विद्यालयं गच्छति?",
         iast="bhavān kadā vidyālayaṃ gacchati?", sort=90)

N10 = _n("n10", "tutor", "sa",
         "भवान् अद्य कुत्र तिष्ठति?",
         iast="bhavān adya kutra tiṣṭhati?", sort=100)

N11 = _n("n11", "tutor", "sa",
         "भवान् किं करोति?",
         iast="bhavān kim karoti?", sort=110)

N12 = _n("n12", "tutor", "sa",
         "भवान् संस्कृतं वदति वा?",
         iast="bhavān saṃskṛtaṃ vadati vā?", sort=120)

# Bridge drop nodes (hi language fallbacks)
NBD1 = _n("nbd1", "tutor", "hi",
          "चलिए इसे हिंदी में कहें: आप कहाँ रहते हैं?",
          sort=200)

NBD2 = _n("nbd2", "tutor", "hi",
          "चलिए इसे हिंदी में कहें: आप क्या करते हैं?",
          sort=210)

# Narrow repairs (sa, pointing at expected feature)
NN1 = _n("nn1", "repair", "sa",
         "सही शब्द चुनें — क्या आपने 'गेहे' कहा? गेह-शब्दः सप्तम्येकवचनम्।",
         iast="sahī śabda cunem — kyā āpane 'gehe' kahā? geha-śabdaḥ saptamyekavacanam.",
         repair_type="narrow", sort=300)

NN2 = _n("nn2", "repair", "sa",
         "सही शब्द चुनें — क्या आपने 'मित्रैः' कहा? मित्र-शब्दः तृतीयाबहुवचनम्।",
         iast="sahī śabda cunem — kyā āpane 'mitraiḥ' kahā? mitra-śabdaḥ tṛtīyābahuvacanam.",
         repair_type="narrow", sort=310)

NN3 = _n("nn3", "repair", "sa",
         "सही शब्द चुनें — क्या आपने 'विद्यालयम्' कहा? विद्यालय-शब्दः द्वितीयैकवचनम्।",
         iast="sahī śabda cunem — kyā āpane 'vidyālayam' kahā? vidyālaya-śabdaḥ dvitīyaikavacanam.",
         repair_type="narrow", sort=320)

# Ask-again repairs (hi)
NAR1 = _n("nar1", "repair", "hi",
          "पुनः प्रयास करें। सही संस्कृत शब्दों का प्रयोग कीजिए।",
          repair_type="ask_again", sort=400)

NAR2 = _n("nar2", "repair", "hi",
          "फिर से कहिए। संस्कृत में उत्तर दीजिए।",
          repair_type="ask_again", sort=410)

# Praise bridge node
NP = _n("np", "tutor", "hi",
        "बहुत बढ़िया! आप संस्कृत अच्छा बोलते हैं।",
        sort=500)

# Narrow repairs for specific QA nodes
NN1B = _n("nn1b", "repair", "sa",
          "सही शब्द चुनें — क्या आपने 'रामः' कहा? राम-शब्दः प्रथमैकवचनम्।",
          iast="sahī śabda cunem — kyā āpane 'rāmaḥ' kahā? rāma-śabdaḥ prathamaikavacanam.",
          repair_type="narrow", sort=305)

NN4 = _n("nn4", "repair", "sa",
         "सही शब्द चुनें — क्या आपने 'ग्रामात्' कहा? ग्राम-शब्दः पञ्चम्येकवचनम्।",
         iast="sahī śabda cunem — kyā āpane 'grāmāt' kahā? grāma-śabdaḥ pañcamyekavacanam.",
         repair_type="narrow", sort=315)

# Additional ask-again
NAR3 = _n("nar3", "repair", "hi",
          "कृपया फिर से प्रयास करें। उत्तर को ध्यान से पढ़िए।",
          repair_type="ask_again", sort=420)

NAR4 = _n("nar4", "repair", "hi",
          "एक बार और प्रयास करें। आप कर सकते हैं!",
          repair_type="ask_again", sort=430)

# Survival bridge after repair
NSURV = _n("nsurv", "tutor", "hi",
           "हाँ, सही दिशा में हैं! फिर से प्रयास करें।",
           sort=505)

NB_ALT = _n("nb_alt", "tutor", "hi",
            "आप बहुत अच्छा सीख रहे हैं! अगला प्रश्न देखें।",
            sort=510)

# Closing + terminal
NCLOSE = _n("nclose", "tutor", "sa",
            "धन्यवाद! भवान् शोभनं संस्कृतं वदति। पुनर्मिलामः।",
            iast="dhanyavāda! bhavān śobhanaṃ saṃskṛtaṃ vadati. punarmilāmaḥ.",
            sort=600)

NTERM = _n("nterm", "tutor", "sa",
           "...",
           iast="...",
           sort=610)

ALL_NODES = [
    N00, N00R,
    N01, N02, N03, N04, N05, N06, N07, N08, N09, N10, N11, N12,
    NBD1, NBD2,
    NN1, NN2, NN3,
    NAR1, NAR2,
    NP,
    NN1B, NN4, NAR3, NAR4, NSURV, NB_ALT,
    NCLOSE, NTERM,
]
assert len(ALL_NODES) == 30, f"Expected 30 nodes, got {len(ALL_NODES)}"

# ── Edges ───────────────────────────────────────────────────────────────

ALL_EDGES = [
    # n00 → n01 (via bridge), n00 → n00r (bridge negative)
    _e("n00", "bridge", "n01",
       expected_phrases=["हाँ", "yes", "तैयार", "जी", "haan", "ready"],
       rank=0),
    _e("n00", "bridge", "n00r",
       expected_phrases=["नहीं", "no", "not"],
       rank=1),
    # n00r → n01 (bridge)
    _e("n00r", "bridge", "n01",
       expected_phrases=["हाँ", "yes", "तैयार", "haan"],
       rank=0),

    # n01 → n02 (sa edges: who are you?)
    _e("n01", "sa", "n02",
       expected_text="aham rāmaḥ asmi.",
       accepted_parses=[{"rāma": "NOM.SG", "√as": "PRES.1SG"}],
       features=["NOM.SG", "PRES.1SG"],
       rank=0),
    _e("n01", "sa", "n02",
       expected_text="aham rāmaḥ.",
       accepted_parses=[{"rāma": "NOM.SG"}],
       features=["NOM.SG"],
       rank=1),

    # n02 → n03 (where from?)
    _e("n02", "sa", "n03",
       expected_text="aham grāmāt āgacchāmi.",
       accepted_parses=[{"grāma": "ABL.SG", "√gam": "PRES.1SG"}],
       features=["ABL.SG", "PRES.1SG"],
       rank=0),

    # n03 → n04 (what eat?)
    _e("n03", "sa", "n04",
       expected_text="aham phalam khādāmi.",
       accepted_parses=[{"phala": "ACC.SG", "√khād": "PRES.1SG"}],
       features=["ACC.SG", "PRES.1SG"],
       rank=0),

    # n04 → n05 (where live?)
    _e("n04", "sa", "n05",
       expected_text="aham gehe tiṣṭhāmi.",
       accepted_parses=[{"geha": "LOC.SG", "√sthā": "PRES.1SG"}],
       features=["LOC.SG", "PRES.1SG"],
       rank=0),

    # n05 → n06 (what read?)
    _e("n05", "sa", "n06",
       expected_text="aham pustakam paṭhāmi.",
       accepted_parses=[{"pustaka": "ACC.SG", "√paṭh": "PRES.1SG"}],
       features=["ACC.SG", "PRES.1SG"],
       rank=0),

    # n06 → n07 (where go?)
    _e("n06", "sa", "n07",
       expected_text="aham vidyālayam gacchāmi.",
       accepted_parses=[{"vidyālaya": "ACC.SG", "√gam": "PRES.1SG"}],
       features=["ACC.SG", "PRES.1SG"],
       rank=0),

    # n07 → n08 (with whom?)
    _e("n07", "sa", "n08",
       expected_text="aham mitraiḥ saha gacchāmi.",
       accepted_parses=[{"mitra": "INSTR.PL", "√gam": "PRES.1SG"}],
       features=["INSTR.PL", "PRES.1SG"],
       rank=0),

    # n08 → n09 (what do at home?)
    _e("n08", "sa", "n09",
       expected_text="aham paṭhāmi.",
       accepted_parses=[{"√paṭh": "PRES.1SG"}],
       features=["PRES.1SG"],
       rank=0),

    # n09 → n10 (when go to school?)
    _e("n09", "sa", "n10",
       expected_text="aham sadā vidyālayam gacchāmi.",
       accepted_parses=[{"vidyālaya": "ACC.SG", "√gam": "PRES.1SG"}],
       features=["ACC.SG", "PRES.1SG"],
       rank=0),

    # n10 → n11 (where stay today?)
    _e("n10", "sa", "n11",
       expected_text="aham gehe tiṣṭhāmi.",
       accepted_parses=[{"geha": "LOC.SG", "√sthā": "PRES.1SG"}],
       features=["LOC.SG", "PRES.1SG"],
       rank=0),

    # n11 → n12 (what do?)
    _e("n11", "sa", "n12",
       expected_text="aham kāryam karomi.",
       accepted_parses=[{"kārya": "ACC.SG", "√kṛ": "PRES.1SG"}],
       features=["ACC.SG", "PRES.1SG"],
       rank=0),

    # n12 → np (speak Sanskrit?)
    _e("n12", "sa", "np",
       expected_text="aham saṃskṛtam vadāmi.",
       accepted_parses=[{"saṃskṛta": "ACC.SG", "√vad": "PRES.1SG"}],
       features=["ACC.SG", "PRES.1SG"],
       rank=0),

    # Bridge drops → rejoin graph
    _e("nbd1", "bridge", "n05",
       expected_phrases=["गेहे", "gehe", "घर", "ghar", "हाँ", "haan", "yes"],
       rank=0),
    _e("nbd2", "bridge", "n12",
       expected_phrases=["पठामि", "पढ़ता", "करोमि", "करता", "हाँ", "haan"],
       rank=0),

    # Narrow repairs → rejoin
    _e("nn1", "bridge", "n04",
       expected_phrases=["हाँ", "haan", "गेहे", "gehe", "yes"],
       rank=0),
    _e("nn2", "bridge", "n07",
       expected_phrases=["हाँ", "haan", "मित्रैः", "mitraiḥ", "yes"],
       rank=0),
    _e("nn3", "bridge", "n09",
       expected_phrases=["हाँ", "haan", "विद्यालयम्", "vidyālayam", "yes"],
       rank=0),

    # Narrow repair for Q1 (wrong name)
    _e("nn1b", "bridge", "n01",
       expected_phrases=["हाँ", "haan", "रामः", "rāmaḥ", "yes"],
       rank=0),

    # Narrow repair for Q2 (ablative)
    _e("nn4", "bridge", "n02",
       expected_phrases=["हाँ", "haan", "ग्रामात्", "grāmāt", "yes"],
       rank=0),

    # Ask_again repairs → back to originating nodes
    _e("nar1", "bridge", "n05",
       expected_phrases=["हाँ", "haan", "तैयार", "ready", "yes"],
       rank=0),
    _e("nar2", "bridge", "n10",
       expected_phrases=["हाँ", "haan", "तैयार", "ready"],
       rank=0),
    _e("nar3", "bridge", "n03",
       expected_phrases=["हाँ", "haan", "तैयार", "ready"],
       rank=0),

    _e("nar4", "bridge", "n08",
       expected_phrases=["हाँ", "haan", "तैयार", "yes", "ready"],
       rank=0),

    # Survival bridge → back to previous
    _e("nsurv", "bridge", "n04",
       expected_phrases=["हाँ", "haan", "तैयार", "yes"],
       rank=0),

    _e("nb_alt", "bridge", "n06",
       expected_phrases=["हाँ", "haan", "तैयार", "yes", "ready"],
       rank=0),

    # ── Fallback routing edges from main-path nodes to repair/bridge nodes ──
    _e("n01", "bridge", "nn1b",
       expected_text="", expected_phrases=[], rank=0),
    _e("n02", "bridge", "nn4",
       expected_text="", expected_phrases=[], rank=0),
    _e("n03", "bridge", "nar3",
       expected_text="", expected_phrases=[], rank=0),
    _e("n04", "bridge", "nn1",
       expected_text="", expected_phrases=[], rank=0),
    _e("n04", "bridge", "nbd1",
       expected_text="", expected_phrases=[], rank=0),
    _e("n04", "bridge", "nsurv",
       expected_text="", expected_phrases=[], rank=0),
    _e("n05", "bridge", "nar1",
       expected_text="", expected_phrases=[], rank=0),
    _e("n06", "bridge", "nn3",
       expected_text="", expected_phrases=[], rank=0),
    _e("n07", "bridge", "nn2",
       expected_text="", expected_phrases=[], rank=0),
    _e("n08", "bridge", "nar4",
       expected_text="", expected_phrases=[], rank=0),
    _e("n08", "bridge", "nbd2",
       expected_text="", expected_phrases=[], rank=0),
    _e("n10", "bridge", "nar2",
       expected_text="", expected_phrases=[], rank=0),
    _e("n09", "bridge", "nb_alt",
       expected_text="", expected_phrases=[], rank=0),

    # Praise → closing
    _e("np", "bridge", "nclose",
       expected_phrases=["धन्यवाद", "dhanyavād", "thank", "thanks", "हाँ", "haan", "yes"],
       rank=0),

    # Closing → terminal
    _e("nclose", "bridge", "nterm",
       expected_phrases=["पुनर्मिलामः", "bye", "धन्यवाद", "alvida", "अलविदा"],
       rank=0),
]

SCENARIO = {
    "title": "प्रथमं मेलनम्",
    "description": "A beginner-level introductory Sanskrit conversation — first meeting.",
    "register": "laukika",
    "entry_node_id": "n00",
    "min_ratio": 0.2,
    "max_ratio": 0.5,
    "est_minutes": 10,
    "nodes": ALL_NODES,
    "edges": ALL_EDGES,
}


def seed_dialogue(db):
    """Idempotently seed the dialogue scenario into the database."""
    from app.models import DialogueScenario, DialogueNode, DialogueEdge

    existing = db.query(DialogueScenario).filter(
        DialogueScenario.title == SCENARIO["title"]
    ).first()
    if existing:
        logger.info("Dialogue scenario '%s' already exists, skipping", SCENARIO["title"])
        return

    scenario = DialogueScenario(
        id=uuid.uuid4().hex[:16],
        title=SCENARIO["title"],
        description=SCENARIO["description"],
        register=SCENARIO["register"],
        entry_node_id=SCENARIO["entry_node_id"],
        min_ratio=SCENARIO["min_ratio"],
        max_ratio=SCENARIO["max_ratio"],
        est_minutes=SCENARIO["est_minutes"],
    )
    db.add(scenario)
    db.flush()  # get scenario.id

    # Insert nodes
    id_map = {}  # friendly id -> UUID
    for ndata in SCENARIO["nodes"]:
        node = DialogueNode(
            id=uuid.uuid4().hex[:16],
            scenario_id=scenario.id,
            kind=ndata["kind"],
            repair_type=ndata.get("repair_type"),
            lang=ndata["lang"],
            devanagari=ndata["devanagari"],
            iast=ndata.get("iast", ""),
            gloss=ndata.get("gloss", ""),
            audio_url=ndata.get("audio_url", ""),
            ratio_band_min=ndata.get("ratio_band_min", 0.2),
            ratio_band_max=ndata.get("ratio_band_max", 0.5),
            sort=ndata.get("sort", 0),
        )
        db.add(node)
        db.flush()
        id_map[ndata["id"]] = node.id

    # Set entry_node_id to the actual UUID
    scenario.entry_node_id = id_map.get(SCENARIO["entry_node_id"])

    # Insert edges
    for edata in SCENARIO["edges"]:
        edge = DialogueEdge(
            id=uuid.uuid4().hex[:16],
            scenario_id=scenario.id,
            from_node_id=id_map[edata["from_node_id"]],
            to_node_id=id_map.get(edata["to_node_id"]),
            lang=edata["lang"],
            expected_text=edata.get("expected_text", ""),
            accepted_parses=edata.get("accepted_parses", []),
            expected_phrases=edata.get("expected_phrases", []),
            features=edata.get("features", []),
            rank=edata.get("rank", 0),
        )
        db.add(edge)

    logger.info("Seeded dialogue scenario '%s' (%d nodes, %d edges)",
                SCENARIO["title"], len(SCENARIO["nodes"]), len(SCENARIO["edges"]))