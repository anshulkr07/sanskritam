# Shabd — Architecture

Audio-first Sanskrit learning app built on adaptive code-switching.
Last updated: 2026-08-29

---

## 1. Product

A voice tutor that speaks in a blend of every language the learner already knows, accepts broken Sanskrit without penalty, and gradually raises the Sanskrit share over months.

**Surfaces**

| Surface | Register | Purpose |
| --- | --- | --- |
| Audio challenges | Laukika | Core learning loop. Prompt → attempt → diagnose → retry without revealing the answer |
| Daily shloka | Classical / Vedic | Acquisition + retention. One verse, grammar breakdown, explained in the learner's languages |
| Avatar conversation | Laukika | Premium tier. Mixed-language dialogue with a correction budget |
| Grammar reference | Pāṇinian | Serves both registers |
| Text challenges | Both | Silent-friendly variant of audio challenges |

### Decisions locked

- **Platform**: React Native + Expo
- **Registers**: both classical/Vedic and laukika, assigned to different surfaces (see §5)
- **Bridge languages**: English + Hindi at launch, plus Hinglish as a distinct third mode. Telugu next.
- **First language**: Sanskrit only. Konkani / Maithili / Sindhi / Odia / Bengali / Tamil later.
- **Not building**: a scripture library app. Vedapath shipped that and got 5K downloads against 1M+ for single-text Gītā apps, and a fleet of per-text apps violates Apple Guideline 4.3 and Google's Repetitive Content policy.

---

## 2. Organising principle: cost gradient

Marginal cost per surface differs by two orders of magnitude. That gradient, not the feature list, decides where code lives.

| Tier | Marginal cost | Surfaces | Strategy |
| --- | --- | --- | --- |
| Pre-computed | ~₹0 | Challenges, daily shloka, grammar | Render once offline, serve from CDN |
| Cheap live | ₹0.5–2 | ASR, tutor reasoning, diagnosis | Call per request, no metering |
| Expensive live | ₹2.5–18 | Streaming speech for conversation | Meter, gate behind paid tier |

Push everything possible into tier one. Speech synthesis is 75–90% of variable cost, so the pre-render + CDN path is the single highest-leverage decision in the system.

---

## 3. System

```
RUNTIME (per request)

  Client (Expo)  --- turn / attempt --->  API server  ---> Saaras v3 ASR (codemix)
   expo-audio                              auth        ---> Gemini Flash + RAG (2 indexes)
   expo-sqlite                             entitlements---> Vidyut (morphology)
   audio cache                             learner model--> Forced aligner (grading)
       |                                   metering    ---> TTS GPU  [metered, premium]
       |                                                          |
       +--- fetch audio pack (offline-capable) ---> CDN <---------+
                                                     ^
OFFLINE PIPELINE (nightly batch, never in request path)
                                                                  |
  Corpora -> LLM drafts -> Vidyut validate -> spot-check -> TTS render -> publish
                                |
                                +--- regenerate on failure
```

The offline pipeline is where quality comes from. Nothing in it is latency-sensitive, so it can afford slow, validated generation with a human in the loop, and everything it produces is free to serve forever. **Build it before the client.**

---

## 4. Third-party stack

### 4.1 Speech — two TTS models, routed by register

This mirrors the two-index RAG split. Register determines both retrieval *and* voice.

| Model | Use | Licence | Notes |
| --- | --- | --- | --- |
| **Vāgdhenu** | Daily shloka, any chanted verse | **Apache-2.0** | Metre-aware śloka-to-chant. IndicF5/F5-TTS flow-matching DiT ~337M + BigVGAN-v2 vocoder. Expert MOS ~4.6. Retroflex series, three sibilants, aspiration, visarga sandhi, homorganic anusvāra all kept distinct. Single speaker. **Chant only — not conversational.** |
| **Indic Parler-TTS** | Conversation, laukika challenges | **Apache-2.0** | AI4Bharat + HuggingFace. Sanskrit voice "Aryan" scores 99.79% NSS, highest of its 21 languages. Also covers Konkani/Maithili/Sindhi for later expansion. Autoregressive, so slower. |
| Sarvam Bulbul v3 | Hindi/English bridge audio | Commercial API | ₹30/10K chars. **No Sanskrit.** Bridge-language speech only. |

Vāgdhenu: `github.com/prathoshap/vagdhenu` · `huggingface.co/prathoshap/vagdhenu`
Requires Python 3.10 + CUDA 12.1. Batch renderer (`src/render.py`, shard JSON) and single-verse API (`src/render_production.py`). No REST layer — wrap it yourself. Built on IndicF5 (MIT), redistributed under original terms. Ethics note asks that it not be used to impersonate.

### 4.2 Recognition — two paths

| Path | Use | Source |
| --- | --- | --- |
| **Sarvam Saaras v3** | Conversation. Mixed Hindi/English/Sanskrit input | Commercial API, ₹30/hr. Supports `sa-IN` and has a `codemix` output mode — built for exactly our input shape. ₹25K credits ≈ 830 hrs. |
| **Forced alignment** | Challenge + śloka grading | See §6. Su-śrotā is the reference implementation. |

**Su-śrotā** — IndicConformer-CTC, ~129M params, CTC head with greedy decoding.
Reported (v13b-ep3): studio lecture 4.4% CER / 20.2% WER · Bhāgavata chant 6.0% / 46.3% · Vedānta prose 7.2% / 30.4% · **in-the-wild user audio 4.4% CER / 30.4% WER**.
`github.com/prathoshap/sushrota-sanskrit-asr`

> **LICENCE BLOCKER — Su-śrotā does not state a licence.** No licence means all rights reserved by default, not free use. Vāgdhenu is explicitly Apache-2.0 and safe. Before shipping anything built on Su-śrotā, email Prof. Prathosh A P (IISc Bengaluru) and get written permission, or ask him to add a licence file. Until then treat the *approach* as adoptable and the *weights* as not.

### 4.3 Validation and reasoning

| Component | Role |
| --- | --- |
| **Vidyut** (`ambuda-org/vidyut`) | Rust + Python bindings. `vidyut-cheda` segments and annotates morphology; `vidyut-prakriya` derives forms. Fast enough for real-time. |
| sanskrit_parser (`kmadathil/sanskrit_parser`) | Pure Python fallback for lexical/morphological analysis |
| **Gemini Flash** | Default tutor brain. Best measured zero-shot on Sanskrit (GEMBA 87.04) and cheapest tier |
| Frontier model | Reserved for hard error diagnosis where reasoning pays |

Do **not** use Indic-specialist translation models — IndicTrans2 scored 12.23 GEMBA and NLLB 8.08, against Gemma3-27B at 64.55. Sarvam-105B does not support Sanskrit at all.

### 4.4 Corpora — two indexes, never merged

| Index | Sources | Serves |
| --- | --- | --- |
| Classical | DCS (4.8M tagged words), GRETIL, Mitrasaṃgraha (391K pairs, largely CC0) | Daily śloka, grammar reference |
| Laukika | Samskrita Bharati graded readers, Balamodini stories (Internet Archive) | Conversation, challenges |

Enforce the split at the retrieval layer, not by prompt instruction. A shared index makes the tutor answer "what did you eat?" in Purāṇic register.

Licence care: verify per item on Internet Archive — an uploader name is not a licence. Do not voice-clone identifiable speakers. Note that CC0 translations are Victorian (Griffith 1896, Ganguly, Bühler) and often inaccurate by modern standards; use them as source text, not as authoritative meanings.

---

## 5. Register routing

| Surface | Register | Corpus | Voice |
| --- | --- | --- | --- |
| Daily śloka | Classical / Vedic | Classical index | Vāgdhenu |
| Audio challenges | Laukika | Laukika index | Indic Parler-TTS |
| Conversation | Laukika | Laukika index | Indic Parler-TTS |
| Grammar | Pāṇinian | Classical index | — |

One rule: **register is a first-class routing key.** It selects the corpus, the voice, and the difficulty ordering. Never let a request cross registers implicitly.

---

## 6. Grading design

### 6.1 Grade by parse, not by string

Sanskrit has free word order. `ग्रामं गच्छामि` and `गच्छामि ग्रामम्` are both correct. String comparison marks right answers wrong, and a learner told they are wrong when they are right will uninstall.

Compare **morphological feature sets** from Vidyut:

```
ग्रामं गच्छामि   -> {grāma: ACC.SG} {√gam: PRES.1SG}   accepted
गच्छामि ग्रामम्  -> {grāma: ACC.SG} {√gam: PRES.1SG}   accepted (identical)
ग्रामः गच्छामि   -> {grāma: NOM.SG} {√gam: PRES.1SG}   one feature off
                                    -> "the object takes the accusative"
```

The wrong answer yields a *specific* diagnosis, not "incorrect". That specificity is the product.

### 6.2 Forced alignment, not open transcription

**Risk this solves:** Saaras is trained on correct Sanskrit. A learner's mangled attempt can transcribe as the *valid* form, silently erasing the very error the app exists to catch.

**Fix:** for challenges and śloka recitation we always know the target text. So do akṣara-level verification against the known target rather than open-vocabulary transcription. This is the Vāgbodhinī approach and it is correct regardless of whose code we use.

### 6.3 Abstain rather than falsely accuse

Vāgbodhinī uses decode-consensus with abstention: flag a syllable only when multiple model outputs agree, and stay silent when uncertain.

Adopt this as a product principle. **A missed error costs far less than a false accusation.** A learner wrongly told they mispronounced something loses trust immediately and permanently.

---

## 7. Data model

```
Feature            id, kind (case|number|tense|voice|sandhi), rank
                   e.g. ACC.SG, DUAL, PRES.1SG, vowel-sandhi

Challenge          id, prompt_l1, prompt_lang, target_sanskrit,
                   features[]          -> what it exercises
                   accepted_parses[]   -> feature sets, NOT strings
                   audio_url           -> pre-rendered, CDN
                   register            -> laukika | classical

Shloka             id, date, source_ref, devanagari, iast, metre,
                   word_breakdown[], features[], audio_url

Learner            id, bridge_langs[], sanskrit_ratio, script_ratio,
                   feature_mastery{feature_id -> score},
                   streak, voice_minutes_used

Attempt            learner_id, challenge_id, raw_audio, alignment[],
                   parsed_features[], diff[], verdict, abstained[], ts
```

**Two independent ratios.** `sanskrit_ratio` governs how much target language appears; `script_ratio` governs how much Devanagari replaces IAST romanisation. They move separately because the two markets need opposite settings — a diaspora beginner may handle Sanskrit words but cannot read the script; a Hindi speaker reads Devanagari natively and needs the language faded in slowly.

**Feature mastery is the dial's input.** Raise the Sanskrit ratio as mastery broadens; select the next challenge at the edge of what is known rather than by a global difficulty number. Vidyut can detect which features a sentence requires, so the whole corpus can be auto-tagged.

Sanskrit-specific ordering note: the **dual number** (द्विवचन) is alien to English and Hindi speakers and appears constantly. Give it its own slot in the progression; do not fold it into plural.

---

## 8. Key decisions and alternatives

| Decision | Chosen | Rejected | Why |
| --- | --- | --- | --- |
| Correctness | LLM proposes, Vidyut validates, regenerate | Trust the model / fully rule-based | Turns a probabilistic system into a checkable one. No other language allows this. |
| Speech delivery | Hybrid: pre-render + live for conversation only | All live / all pre-generated | Cuts cost ~6× and removes latency from the habit loop |
| Conversation transport | Turn-based request/response | Streaming WebSocket / Pipecat | Survives poor mobile networks, trivially debuggable. Sarvam ships a Pipecat integration for v2. |
| Learner model | Server-side | Client-side | The adaptive algorithm will be retuned constantly in year one; server-side means no app release |
| Model routing | Gemini Flash default | Single frontier model everywhere | Best measured on Sanskrit and cheapest; reserve frontier for hard diagnosis |
| GPU hosting | Serverless, scale-to-zero | Dedicated | Pipeline work is bursty. Move to dedicated when live conversation volume justifies it |
| Secrets | Server only | Client-side keys | Prompts and corpus are the asset |

---

## 9. Relationship to Prof. Prathosh's work

His stack (IISc Bengaluru) covers **chanting and śāstric recitation**. Ours covers **conversational production**. They are complements, not substitutes.

| His | Ours |
| --- | --- |
| Vāgdhenu — chant TTS | Indic Parler-TTS — conversational voice |
| Su-śrotā — recitation ASR | Saaras codemix — mixed-language conversation ASR |
| Vāgbodhinī — chant practice against a known verse | Adaptive code-switching tutor, laukika production |

**Vāgbodhinī partially overlaps our daily-śloka feature** and validates that syllable-level pronunciation feedback works. It does not do conversation, code-switching, adaptive ratio, or laukika Sanskrit — our lane stays open.

### Integration plan

1. Use **Vāgdhenu under Apache-2.0** for all chanted audio, with attribution in the app's licences screen. Wrap `render_production.py` behind our own service.
2. Adopt the **forced-alignment + abstention** grading pattern (§6.2, §6.3) as design, which carries no licence question.
3. **Contact Prof. Prathosh before using Su-śrotā weights** — no licence file is published. Worth a direct approach anyway: he open-sources actively, and a collaboration or data-sharing arrangement is plausible. He would also be a strong candidate for the expert content validation we need regardless.
4. Do not repeat unverified claims from social media about this work — the "1,500 contributors" and "automated Śikṣā/Chandas verification engine" framing came from a third-party post whose author flagged it as their own interpretation. What is documented is metre-aware rendering and akṣara-level verification against a known target.

---

## 10. Risks

| Risk | Mitigation |
| --- | --- |
| ASR silently repairs learner errors | Forced alignment against known target, not open transcription (§6.2) |
| Register bleed — tutor answers in Purāṇic Sanskrit | Two RAG indexes enforced at retrieval layer (§4.4) |
| False accusation destroys trust | Decode-consensus with abstention (§6.3) |
| Su-śrotā licence unresolved | Do not ship on it until written permission is obtained |
| Parler-TTS latency in live conversation | Pre-render everything possible; benchmark before building conversation |
| Cost per session at scale | Self-host TTS; meter voice minutes; keep free tier CDN-only |
| Sanskrit register mismatch in corpus | Laukika corpus from Samskrita Bharati readers, never from epics |

---

## 11. Build order

Each step de-risks the next. Nothing is thrown away.

1. **Voice spike** — Vāgdhenu renders 20 śloka; Indic Parler-TTS renders 20 laukika sentences; Vidyut validates both. Send audio to three Sanskrit speakers. Closes the largest unknown.
2. **ASR spike** — record genuinely code-mixed Hindi/English/Sanskrit speech, run through Saaras `codemix`. Confirm it neither collapses nor silently repairs errors.
3. **Content pipeline** — corpora in, validated pre-rendered challenges out.
4. **API + learner model** — auth, entitlements, feature taxonomy, selection engine.
5. **Expo client, challenges only** — habit loop, offline-capable, CDN-served. Ship and get users.
6. **Daily śloka** — same pipeline, one item a day, Vāgdhenu voice.
7. **Conversation, metered** — premium tier, once people already pay for the free loop.

---

## 12. Open questions

- **Name.** A shipped Sanskrit product called SHABDA exists (svami.in). Decide before buying domains.
- **Su-śrotā licence.** Blocking for that component only.
- **Bulbul Sanskrit roadmap.** One email to Sarvam via the startup programme.
- **Odia code.** Docs say `od-IN`, website says `or-IN`. Confirm against the live API.
- **Parler-TTS latency on target GPU.** Decides whether live conversation ships at v1 or v2.
