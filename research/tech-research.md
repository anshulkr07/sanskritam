> **Read as a record, not a plan (banner added 2026-08-30).** Sanskritam is **API-only: no local models,
> anywhere** (architecture.md §1) — the app ships to phones and we run no inference servers, no GPU
> box and no local batch. Any self-hosted model evaluated below (Parler-TTS, Vāgdhenu, Su-śrotā, and
> anything requiring torch or CUDA) is **out of scope regardless of its verdict here.** Rule-based
> libraries such as Vidyut are unaffected: they carry no weights and no GPU, and run server-side.

# Sanskritam — Tech Research: Sanskrit Learning Backend

**Date:** 2026-08-29
**Scope:** NLP, forced alignment, TTS, adaptive learning, FastAPI infrastructure
**Constraint:** Pure-Python on Windows (no GPU, git-bash shell, Python 3.11)

---

## 1. Vidyut (ambuda-org/vidyut)

**Verdict: USE — core Sanskrit NLP backbone**

| Attribute | Detail |
|-----------|--------|
| PyPI package | `vidyut` (not `vidyut-cheda` or `vidyut-prakriya`) |
| Latest version | 0.4.0 |
| License | MIT |
| Stars | 132 |
| Windows wheels | **YES** — `win32` and `win_amd64` (`cp37-abi3`) are shipped on PyPI. No Rust toolchain needed. |
| Python req | >= 3.7 |
| Input encoding | **SLP1** (not Devanagari, not IAST). All functions expect SLP1 strings. |

### Modules (6)

| Module | Status | Purpose |
|--------|--------|---------|
| `vidyut.kosha` | **Production** | Word lookup: map a pada back to lemma + morphology. Ships ~100M entries. |
| `vidyut.prakriya` | **Production** | Word generation: derive forms from dhātu + lakāra + puruṣa + vacana, etc. |
| `vidyut.lipi` | **Production** | Transliteration between SLP1, Devanagari, IAST, Kannada, etc. |
| `vidyut.cheda` | **Experimental** | Sentence segmentation + morphological tagging |
| `vidyut.chandas` | **Experimental** | Metre analysis |
| `vidyut.sandhi` | **Experimental** | Sandhi utilities (helper for other modules) |

### Install commands

```bash
pip install vidyut

# Download linguistic data (~32 MB)
python -c "import vidyut; vidyut.download_data('vidyut-0.4.0')"
```

### Minimal code sample: word lookup + transliteration

```python
from vidyut.kosha import Kosha, PadaEntry
from vidyut.lipi import Scheme, transliterate

kosha = Kosha("vidyut-0.4.0/kosha")

# Look up "gacCati" (SLP1 for गच्छति)
for entry in kosha.get("gacCati"):
    dev = transliterate(entry.lemma, Scheme.Slp1, Scheme.Devanagari)
    match entry:
        case PadaEntry.Tinanta():
            print(f"{dev} = verb {entry.lekara} {entry.purusha} {entry.vacana}")
        case PadaEntry.Subanta():
            print(f"{dev} = nominal {entry.linga} {entry.vibhakti} {entry.vacana}")
```

### Code sample: segmentation with cheda (experimental)

```python
from vidyut.cheda import Cheda

# Load the segmenter — path to cheda data inside the downloaded dir
cheda = Cheda("vidyut-0.4.0/cheda")

# Split "bavatyev" (SLP1 for भवत्येव = भवति + एव)
tokens = cheda.split("bavatyev")
for token in tokens:
    print(token.text, token.tags)
```

### Code sample: word generation with prakriya

```python
from vidyut.prakriya import Prakriya, Dhatu

# Derive all forms of √bhū (bhvādi, parasmaipada)
dhatu = Dhatu.from_text("BU")  # SLP1 for भू
prakriya = Prakriya(dhatu, pada="parasmaipada")
forms = prakriya.derive()
for form in forms:
    print(form.text)  # भवति, भवतः, भवन्ति, etc.
```

### Caveats

- **SLP1 encoding** is the universal input. You must transliterate Devanagari/IAST → SLP1 before calling any Vidyut function. Use `vidyut.lipi.transliterate` for this.
- `cheda` is experimental — may over/under-generate. For production grading, you want `Kosha`-based lookup (which is production-grade).
- Data download is ~32 MB zip, extracts to ~200 MB. Cache it; don't re-download per deploy.
- Vidyut's Rust core means **zero Python overhead** for the hot path. This is the right choice for real-time grading.

---

## 2. sanskrit_parser (kmadathil/sanskrit_parser)

**Verdict: FALLBACK — use when Vidyut cannot parse a form; not primary**

| Attribute | Detail |
|-----------|--------|
| PyPI package | `sanskrit_parser` |
| Latest version | 0.2.6 |
| Stars | 92 |
| Windows support | Pure-Python wheel (`any`), **but optional deps `gensim` + `sentencepiece` need a C compiler** on Windows |
| Pure-Python core | Yes — base parser works without gensim |

### Install

```bash
pip install sanskrit_parser
# Without scoring (no C compiler needed):
pip install sanskrit_parser --no-deps
pip install indic-transliteration lxml networkx tinydb six
```

### Key APIs

- **Sandhi splitting:** `sanskrit_parser sandhi "भवत्येव"` (CLI) or Python `SandhiAnalyzer().split()`
- **Morphological tagging:** `sanskrit_parser tags "गच्छामि"` → lists all possible analyses
- **Sentence validation:** `sanskrit_parser vakya "रामः फलम् खादति"` → dependency graph

### Caveats

- The README **explicitly warns** about over-generation and under-generation. Both are common.
- Last updated July 2026 (recent) but the project states "still under development."
- The heavy dependency stack (Flask, SQLAlchemy, pandas, networkx, pydot) is packaged for the REST server the project includes — you don't need all of it. Strip deps aggressively.
- **Recommended role:** offline pipeline validation, not request-path. If Vidyut returns an empty set for a word, fall back to sanskrit_parser for a second opinion.

---

## 3. Other Sanskrit NLP libraries

### indic-transliteration (pip install indic-transliteration)

**Verdict: USE — best transliteration lib for Sanskritam**

| Attribute | Detail |
|-----------|--------|
| Version | 2.3.82 |
| License | MIT-ish (Apache-friendly) |
| Scripts | Devanagari, IAST, HK, SLP1, Kannada, Telugu, etc. |
| Pure Python | Yes |

```python
from indic_transliteration import sanscript
from indic_transliteration.sanscript import SchemeMap, SCHEMES, transliterate

# Devanagari → IAST
text = "गच्छामि"
iast = transliterate(text, sanscript.DEVANAGARI, sanscript.IAST)
# "gacchāmi"

# Devanagari → SLP1 (for Vidyut)
slp1 = transliterate(text, sanscript.DEVANAGARI, sanscript.SLP1)
# "gacCAmi"
```

**Why use this over vidyut.lipi?** Vidyut.lipi is also good (and faster — Rust), but `indic-transliteration` is more widely tested, has more script coverage (Telugu, Kannada, etc. for expansion), and is a pure-Python fallback. Use **both**: vidyut.lipi for the hot path, indic-transliteration for the CLI/admin tools and wider script support.

### indic-nlp-library (pip install indic-nlp-library)

**Verdict: SKIP** — primarily focused on modern Indian languages (Hindi, Bengali, etc.). Has a Sanskrit morphological analyzer but it's experimental and unmaintained. The library is an academic project (CFILT, IIT Bombay) for NLP benchmarking, not production use.

### sanskrit-data (pip install sanskrit-data)

**Verdict: MAYBE USEFUL** — provides curated lexical data files (DCS-derived, verb forms, noun declensions). Version 0.8.14, still maintained. Could supplement Vidyut's kosha data in the offline pipeline for generating additional practice sentences.

### sanskrit-util (pip install sanskrit-util)

**Verdict: SKIP** — tiny (v0.1.2), no real documentation, utility-only.

---

## 4. Forced Alignment for akshara-level pronunciation

**Verdict: USE CTC segmentation (ctc-segmentation) + a small CTC model — lightest CPU-only path**

### Options compared

| Approach | CPU-only | Windows | Sanskrit model | Real-time | Verdict |
|----------|----------|---------|----------------|-----------|---------|
| **CTC segmentation** `ctc-segmentation` | ✅ Yes | ✅ Yes | Any CTC model | ✅ Fast | **USE** |
| whisperX | ❌ GPU req (CUDA) | ⚠️ Partial | Whisper (no Sanskrit) | ❌ Heavy | SKIP |
| stable-ts | ❌ Needs Whisper (GPU) | ⚠️ | Same as Whisper | ❌ | SKIP |
| aeneas | ✅ Yes | 🔴 C-ext compile on Win | eSpeak only | ✅ | SKIP (frozen since 2017) |

### Recommended approach: CTC segmentation + small wav2vec2-CTC or IndicConformer

The architecture already specifies **forced alignment against a known target** (not open transcription). This is correct.

**Lightest CPU-only path:**

```bash
pip install ctc-segmentation
pip install torch --index-url https://download.pytorch.org/whl/cpu  # CPU-only torch
pip install transformers
```

```python
import torch
import numpy as np
import ctc_segmentation
from transformers import Wav2Vec2Processor, Wav2Vec2ForCTC

# Load a small CTC model (can swap for IndicConformer-CTC when available)
model_name = "facebook/wav2vec2-base-960h"  # placeholder — not Sanskrit-aware
processor = Wav2Vec2Processor.from_pretrained(model_name)
model = Wav2Vec2ForCTC.from_pretrained(model_name)

def align_known_text(audio: np.ndarray, text: str, sr: int = 16000):
    """
    Given a recording of a known Sanskrit sentence, return
    per-word or per-akshara timestamps.
    """
    inputs = processor(audio, sampling_rate=sr, return_tensors="pt")
    with torch.no_grad():
        logits = model(inputs.input_values).logits.cpu()[0]
    probs = torch.nn.functional.softmax(logits, dim=-1)

    char_list = list(processor.tokenizer.get_vocab().keys())
    config = ctc_segmentation.CtcSegmentationParameters(char_list=char_list)
    config.index_duration = audio.shape[0] / probs.size()[0] / sr

    words = text.split()
    ground_truth_mat, utt_begin_indices = ctc_segmentation.prepare_text(config, words)
    timings, char_probs, state_list = ctc_segmentation.ctc_segmentation(
        config, probs.numpy(), ground_truth_mat
    )
    segments = ctc_segmentation.determine_utterance_segments(
        config, utt_begin_indices, char_probs, timings, words
    )
    return [
        {"text": w, "start": s[0], "end": s[1], "confidence": s[2]}
        for w, s in zip(words, segments)
    ]
```

### The Sanskrit CTC model situation

- **Su-śrotā** (IndicConformer-CTC, ~129M params, 4.4% CER on in-the-wild Sanskrit) is the ideal model — but **no licence file is published**. Cannot ship on it until written permission is obtained (per architecture.md §9).
- **Workaround:** Use a generic wav2vec2 model fine-tuned on Hindi (there are several on HF) as a proxy during dev. For production, either get Su-śrotā permission or fine-tune a small wav2vec2-CTC on the DCS + Samskrita Bharati audio data.
- The abstention principle (§6.3 of architecture.md) protects against false accusations regardless of model quality.

### Recommendation: implement alignment abstraction

Build an abstract `ForcedAligner` interface so you can swap backends:

1. Dev: `ctc-segmentation + generic wav2vec2-CTC` (CPU, works now)
2. Staging/Prod: switch pointer to Su-śrotā once licensed, or a fine-tuned Indic wav2vec2

---

## 5. Lightweight Sanskrit-capable TTS for CPU-only dev testing

**Verdict: USE edge-tts with hi-IN voices for dev; Piper-tts with hi_IN voices as fallback**

### edge-tts (pip install edge-tts)

| Attribute | Detail |
|-----------|--------|
| Version | 7.2.8 |
| Windows | ✅ Pure Python, no native deps |
| Hindi voices | `hi-IN-MadhurNeural` (Male), `hi-IN-SwaraNeural` (Female) |
| Sanskrit | ❌ No `sa-IN` voice exists on Azure/Cognitive Services |
| Latency | ~200-500ms per sentence (network call) |
| Cost | Free (Edge API, rate-limited but generous) |

```bash
pip install edge-tts
```

```python
import edge_tts
import asyncio

async def speak(text: str, voice: str = "hi-IN-SwaraNeural"):
    tts = edge_tts.Communicate(text, voice)
    await tts.save("output.mp3")

# For Sanskrit text read with Hindi pronunciation:
asyncio.run(speak("गच्छामि", "hi-IN-MadhurNeural"))
```

**Limitation:** edge-tts uses Hindi phoneme inventory, so Sanskrit retroflexes (ṭ, ṭh, ḍ, ḍh) and three sibilants (ś, ṣ, s) are not distinguished. Fine for dev testing of pipeline wiring; unacceptable for production.

### Piper TTS (pip install piper-tts)

| Attribute | Detail |
|-----------|--------|
| Version | 1.7.0 |
| Windows | ⚠️ **No prebuilt wheels** — `piper-phonemize` is C++ and needs MSVC build tools |
| Hindi voices | `hi_IN-pratham-medium` (Male), `hi_IN-priyamvada-medium` (Female) — both on HuggingFace |
| Sanskrit | ❌ No Sanskrit voice |
| Latency | ~50ms per sentence (local, ONNX CPU) |
| Quality | Medium — eSpeak-based phonemizer |

```bash
# Windows challenge: needs C++ build tools for piper-phonemize
# Try prebuilt wheel from piper's releases if available
pip install piper-tts
# Download model:
# https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/hi/hi_IN/pratham/medium/hi_IN-pratham-medium.onnx
```

**Recommendation:** Use edge-tts for dev TTS (zero install friction). Piper is only worth the setup hassle if you need offline TTS for the dev machine — which you don't, since the architecture pre-renders all production audio offline and serves from CDN.

### Parler-TTS (pip install parler-tts)

| Attribute | Detail |
|-----------|--------|
| Version | 0.2.3 |
| Windows | ✅ Works (pure Python) |
| GPU | 🔴 **Requires GPU** for acceptable speed (the "Aryan" Sanskrit voice is an autoregressive model) |
| Verdict | ❌ Not for dev testing on CPU |

---

## 6. Adaptive Learning / Mastery Models

**Verdict: USE FSRS (Free Spaced Repetition Scheduler) — `pip install fsrs`**

### Comparison

| Model | Type | Formula complexity | Python lib | Suitability for feature mastery |
|-------|------|--------------------|------------|-------------------------------|
| **FSRS** | ML-parameterized SRS | 21 params, logistic | `fsrs` v6.3.2 ✅ | **Best fit** — each card maps to a feature |
| SM-2 | Heuristic SRS | Simple (6 vars) | DIY | Too simple — doesn't model feature relationships |
| Bayesian KT | Probabilistic | Hidden Markov | `pyBKT` / `pyskill` | Overkill — designed for tutor systems with skill prerequisites |

### Why FSRS wins

1. **Each feature = one card.** The architecture stores `feature_mastery{feature_id -> score}`. FSRS's card model maps 1:1: each Sanskrit feature (ACC.SG, PRES.1SG, vowel-sandhi) is an FSRS card. Mastery is the card's stability + retrievability.

2. **Easy integration with the selection engine.** FSRS's `scheduler.select_cards()` ordered by lowest retrievability directly implements "select the next challenge at the edge of what is known" (architecture §7).

3. **Well-maintained Python lib.** `fsrs` (Py-FSRS) is actively developed, MIT-licensed, and has 4 rating levels (Again/Hard/Good/Easy) that map naturally to learner performance.

### Implementation sketch

```bash
pip install fsrs
```

```python
from datetime import datetime, timezone, timedelta
from fsrs import Scheduler, Card, Rating

# One scheduler per learner (held server-side, per §8)
scheduler = Scheduler(
    desired_retention=0.9,
    maximum_interval=365,
    enable_fuzzing=True,
)

# Each Sanskrit feature is a Card
feature_cards: dict[str, Card] = {}  # feature_id -> Card

def record_attempt(feature_id: str, correct: bool):
    """After a learner answers a challenge, update the feature's card."""
    if feature_id not in feature_cards:
        feature_cards[feature_id] = Card()
    card = feature_cards[feature_id]

    # Map learner performance to FSRS rating
    if not correct:
        rating = Rating.Again    # forgot
    else:
        rating = Rating.Good     # remembered with some hesitation

    card, _ = scheduler.review_card(card, rating)

def next_challenge() -> str:
    """Pick the feature with the lowest retrievability."""
    best_feature = min(
        feature_cards,
        key=lambda fid: feature_cards[fid].get_retrievability(
            scheduler.parameters, datetime.now(timezone.utc)
        )
    )
    return best_feature
```

### The FSRS formula (reference for implementation)

FSRS v4 (simplified):

- **Stability after recall:** `S' = S * e^(w^8 * (G - 1) * (w^6 - 0.15 * ln(S) - w^9))`  
  where G = grade (Again=1, Hard=2, Good=3, Easy=4), w = parameters
- **Stability after forget:** `S' = w^11 * S^(w^12) * e^((1-G) * w^13)`
- **Difficulty:** `D' = D + w^7 * (5 - G)`  
  clamped to [1, 10]
- **Retrievability:** `R = 2^(-t/S)`  
  where t = time since last review

Full formula reference: [FSRS paper](https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler) and [py-fsrs docs](https://open-spaced-repetition.github.io/py-fsrs/fsrs.html)

### Caveats

- FSRS expects **explicit recall attempts** (user saw the card and tried to recall). Sanskritam's audio challenges are exactly this — play prompt, user speaks, system grades. Good fit.
- The 21 default parameters are trained on Anki data (flashcard reviews). For language feature mastery they may not be optimal. Plan to collect enough Sanskritam data to **optimize** the params (defaults work but won't be optimal for pronunciation-heavy features).
- The `fsrs` package includes an `Optimizer` class — run it against production data quarterly.
- `desired_retention=0.9` = 90% probability of recall at review time. This is aggressive for pronunciation features where 75-80% retention may be more motivating. Tune per feature type.

---

## 7. FastAPI Robustness Extras

**Verdict: USE all 4 — they are the current best-in-class**

### pydantic-settings (pip install pydantic-settings)

| Attribute | Detail |
|-----------|--------|
| Version | 2.15.0 |
| Purpose | Type-safe settings from env vars / `.env` |

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "sqlite:///shabd.db"
    gemini_api_key: str = ""
    sentry_dsn: str = ""
    vidyut_data_path: str = "vidyut-0.4.0"
    log_level: str = "INFO"
    ratelimit_per_minute: int = 60

    model_config = {"env_prefix": "SHABD_"}

settings = Settings()  # reads SHABD_DATABASE_URL etc.
```

### structlog (pip install structlog)

| Attribute | Detail |
|-----------|--------|
| Version | 26.1.0 |
| Purpose | Structured JSON logging |

```python
import structlog

logger = structlog.get_logger()

# In middleware / request handler
logger.info("learner_attempt", user_id=user.id, feature="ACC.SG", correct=True)

# Configure once
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer() if settings.log_level == "DEBUG"
        else structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)
```

**Why not standard logging:** Structured JSON logs are parsable by log aggregators (Datadog, Grafana Loki, etc.), enable per-user-id search, and won't need re-architecting at scale.

### slowapi (pip install slowapi)

| Attribute | Detail |
|-----------|--------|
| Version | 0.1.10 |
| Purpose | Rate limiting for FastAPI |

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from fastapi import FastAPI

limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(429, _rate_limit_exceeded_handler)

@app.post("/attempt")
@limiter.limit("30/minute")
async def create_attempt(request: Request, ...):
    ...
```

### httpx (pip install httpx)

| Attribute | Detail |
|-----------|--------|
| Version | 0.28.1 |
| Purpose | Async HTTP client for calling Gemini, Sarvam APIs |

```python
import httpx

async with httpx.AsyncClient(timeout=30.0) as client:
    resp = await client.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        json={"contents": [{"parts": [{"text": prompt}]}]},
        headers={"x-goog-api-key": settings.gemini_api_key},
    )
```

### Test patterns (no extra pip needed — TestClient is built into FastAPI)

```python
from fastapi.testclient import TestClient

def test_challenge_endpoint():
    with TestClient(app) as client:
        resp = client.post("/attempt", json={
            "challenge_id": "ch_001",
            "features": [{"id": "ACC.SG", "correct": True}],
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "next_challenge_id" in data
```

### Quick dependency checklist

```toml
# pyproject.toml (core)
fastapi = ">=0.115.0"
uvicorn = {extras = ["standard"], version = ">=0.30.0"}
pydantic-settings = ">=2.15.0"
structlog = ">=26.1.0"
slowapi = ">=0.1.10"
httpx = ">=0.28.1"
vidyut = ">=0.4.0"
indic-transliteration = ">=2.3.82"
fsrs = ">=6.3.2"

# optional / pipeline
ctc-segmentation = ">=1.7.4"
edge-tts = ">=7.2.8"

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "httpx",  # TestClient uses this
]
```

---

## Top 5 integration actions

<!-- VERIFIED-ORCHESTRATOR 2026-08-29: I independently validated #1 on this machine (venv, win_amd64 wheel, data zip auto-download ~few MB). -->
<!-- Confirmed working API (differs from docs/readthedocs which are stale): -->
<!--   pip install vidyut  (0.4.0); from vidyut import download_data; download_data(<dir>) -->
<!--   import vidyut.lipi as li, vidyut.cheda as ch -->
<!--   c = ch.Chedaka(<data_root_dir>)   # root dir, contains cheda/model.msgpack + kosha/padas.fst -->
<!--   slp = li.transliterate('ग्रामं गच्छामि', li.Scheme.Devanagari, li.Scheme.Slp1) -->
<!--   for t in c.run(slp): t.text, t.lemma, t.data  # PadaEntry.Subanta(vibhakti=Dvitiya, vacana=Eka, linga=Pum) / PadaEntry.Tinanta(lakara=Lat, purusha=Uttama, vacana=Eka) -->
<!--   Enum mapping: Vibhakti.Prathama=NOM, Dvitiya=ACC, ...; Vacana.Eka/Dvi/Bahu=SG/DUAL/PL; Lakara.Lat=PRES; Purusha.Uttama/Madhyama/Prathama=1st/2nd/3rd -->
<!--   NOTE: Chedaka(path) takes the DATA ROOT (not Kosha object; kosha subdir path fails with sandhi Io error). -->
<!-- VERIFIED-END -->


1. **Validate Vidyut on this Windows machine.** Run `pip install vidyut`, download linguistic data, run the Kosha lookup sample above on 3-5 Sanskrit words. If wheels install cleanly (they should), Vidyut is cleared for the critical path. **This is the gating dependency for the entire NLP layer.**

2. **Build an abstract transliteration layer** using both `vidyut.lipi` (hot path, Rust speed) and `indic-transliteration` (admin scripts, wider script support). Centralize SLP1 ↔ Devanagari ↔ IAST conversion in one module so Vidyut's SLP1 requirement is never a surprise.

3. **Implement forced alignment with ctc-segmentation** using a generic wav2vec2 checkpoint. Wire it behind an abstract `ForcedAligner` interface so the Sanskrit-specific CTC model (Su-śrotā or a custom fine-tune) can be swapped in later without changing the grading logic. Ship with "abstain" for low-confidence regions from day one.

4. **Integrate `pip install fsrs` for the feature mastery model.** Each Sanskrit feature is an FSRS card. The scheduler selects the next reviewable card with lowest retrievability. Use default parameters initially; add `Optimizer` batch runs after the first 10K attempts. This replaces the hand-rolled SM-2 or BKT approach with a library that has 100K+ hours of spaced repetition research behind it.

5. **Lock in the FastAPI extras in the first PR.** Add `pydantic-settings`, `structlog`, `slowapi`, and `httpx` to `pyproject.toml`. These are each a one-line install and prevent the "we'll add logging/rate-limiting later" trap. The alternative (DIY) wastes time that should go toward the Sanskrit-specific logic.

### Blocker

- **No Sanskrit CTC model available without licence uncertainty.** Su-śrotā (IndicConformer-CTC) is ideal but has no licence file. Contact Prof. Prathosh before shipping akshara-level pronunciation feedback. In the meantime, a generic wav2vec2-CTC (e.g. fine-tuned on Hindi) is a perfectly acceptable dev/staging proxy — the abstention principle (§6.3) protects against false accusations regardless of model quality.