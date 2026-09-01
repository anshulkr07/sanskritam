# Shabd — Architecture

Audio-first Sanskrit learning app built on adaptive code-switching.
Last updated: 2026-08-30

---

## 1. Product

A voice tutor that speaks in a blend of every language the learner already knows, accepts broken Sanskrit without penalty, and gradually raises the Sanskrit share over months.

**Surfaces**

| Surface | Register | Purpose |
| --- | --- | --- |
| Varṇamālā + pronunciation | — | Entry surface. Alphabet, articulation, minimal pairs. Free, offline-capable (§13) |
| Audio challenges | Laukika | Core learning loop. Prompt → attempt → diagnose → retry without revealing the answer |
| Daily shloka | Classical / Vedic | Acquisition + retention. One verse, grammar breakdown, explained in the learner's languages |
| Guided conversation | Laukika | Graph-backed dialogue, pre-rendered, sub-second turns. Free tier (§12) |
| Open conversation | Laukika | Free-form talk with live synthesis. Metered, premium tier (§12) |
| Grammar reference | Pāṇinian | Serves both registers |
| Text challenges | Both | Silent-friendly variant of audio challenges |

### Decisions locked

- **Platform**: React Native + Expo
- **No local models. Anywhere.** Every model Shabd uses is a hosted API. We do not run inference servers, we do not ship weights, and nothing in this document should be read as self-hosting a model — not in the request path, not in a nightly batch, not on a build box. The app ships to phones, and phones cannot hold models. This constraint is **load-bearing and costs us two things** — metre-aware chant and true forced alignment — both accounted for below (§4.1, §6.2) rather than wished away.
- **Sanskrit TTS**: **Sarvam Bulbul v3 `sa-IN`** — granted through the startup programme, requested 2026-08-29, ETA 2–3 days. This is the single biggest change to this document since it was written (§4.1, §12).
- **Registers**: both classical/Vedic and laukika, assigned to different surfaces (see §5)
- **Bridge languages**: English + Hindi at launch, plus Hinglish as a distinct third mode. Telugu next.
- **First language**: Sanskrit only. Konkani / Maithili / Sindhi / Odia / Bengali / Tamil later — and Sarvam ASR and translation already cover all four differentiator languages today (§4.5).
- **Not building**: a scripture library app. Vedapath shipped that and got 5K downloads against 1M+ for single-text Gītā apps, and a fleet of per-text apps violates Apple Guideline 4.3 and Google's Repetitive Content policy.

---

## 2. Organising principle: cost gradient

Marginal cost per surface differs by two orders of magnitude. That gradient, not the feature list, decides where code lives.

| Tier | Marginal cost | Surfaces | Strategy |
| --- | --- | --- | --- |
| Pre-computed | ~₹0 | Varṇamālā, challenges, daily shloka, grammar, guided conversation | Render once offline, serve from CDN |
| Cheap live | ₹0.5–2 | ASR, tutor reasoning, diagnosis | Call per request, no metering |
| Expensive live | ₹2.5–18 | Open conversation — live TTS per turn | Meter, gate behind paid tier |

Push everything possible into tier one. Speech synthesis is 75–90% of variable cost, so the pre-render + CDN path is the single highest-leverage decision in the system.

**This survives Bulbul sa-IN unchanged.** Live Sanskrit TTS removes a *latency* constraint, not a *cost* one. At ₹30/10K characters a talkative tutor still costs ₹15–18 per 10-minute session, which is the number that forces diaspora pricing. Anything that can be pre-rendered still must be.

---

## 3. System

```
RUNTIME (per request)

  Client (Expo)  --- turn / attempt --->  API server  ---> Saaras v4 ASR (codemix)
   expo-audio                              auth        ---> Gemini Flash + RAG (2 indexes)
   expo-sqlite                             entitlements---> Vidyut (morphology)
   audio cache                             learner model--> Forced aligner (grading)
       |                                   metering    ---> Bulbul v3 sa-IN  [metered, open convo]
       |                                                          |
       +--- fetch audio pack (offline-capable) ---> CDN <---------+
                                                     ^
OFFLINE PIPELINE (nightly batch, never in request path)
                                                                  |
  Corpora -> LLM drafts -> Vidyut validate -> spot-check -> TTS render -> publish
                                |
                                +--- regenerate on failure
```

The offline pipeline is where quality comes from. Nothing in it is latency-sensitive, so it can afford slow, validated generation with a human in the loop, and everything it produces is free to serve forever.

**Ordering note, revised 2026-08-30.** This section used to say "build it before the client." Bulbul `sa-IN` makes a working client possible without any authoring pipeline at all — live synthesis covers every turn, expensively. So the client can come first now, and the pipeline becomes a cost optimisation landing behind it rather than a prerequisite. See §11 for what that trade costs if the pipeline slips.

---

## 4. Third-party stack

### 4.1 Speech — one voice, one vendor

Every surface that makes sound uses one hosted engine.

| Model | Use | Notes |
| --- | --- | --- |
| **Sarvam Bulbul v3** | **All synthesised audio — Sanskrit *and* bridge, live and pre-rendered** | ₹30/10K chars, ~300 ms. `sa-IN` arriving via the startup programme. 30+ voices; one speaker id carries the whole code-switched turn. Returns 22050 Hz mono regardless of the requested rate. |

That is the entire synthesis stack. There is no second engine and no fallback engine, which is a deliberate cost of the no-local-models rule and is tracked as the top risk in §10.

#### What this costs: chant

Sanskrit verse is *chanted*, with metre (छन्दस्) governing syllable length and phrase boundaries. The only metre-aware Sanskrit TTS that exists is Vāgdhenu (IISc, Apache-2.0) and it is a self-hosted model, so it is out of scope. **No hosted API synthesises Sanskrit chant.** Bulbul reads verse as prose.

So daily śloka ships as *spoken recitation*, not chant. Be honest about that in the product: it is still useful for learning the words, the sandhi and the meaning, and it is not what a learner would hear from a teacher. Three ways out, in order of realism:

1. **Licensed human recordings.** The śloka set is small and fixed — a few hundred verses, recorded once. This is a content-acquisition problem, not an engineering one, and it produces better audio than any model.
2. **Ask Sarvam for a chant voice.** They now have a Sanskrit model and a relationship with us; metre-aware rendering is a plausible ask (§4.5).
3. **Accept prose reading for v1**, and mark the surface as such rather than implying chant.

Do not solve this by quietly self-hosting Vāgdhenu. The constraint is the constraint.

#### One voice across the code-switch boundary

This is the part worth reading twice. Shabd's thesis is code-switching *within a single turn* — "तव नाम किम्? What's your name?" is one sentence from one person. The previous design synthesised the Sanskrit half with Parler and the bridge half with Bulbul, which meant two timbres in one breath. §12 called this a casting problem and solved it by pre-rendering both. It was never actually solved; it was deferred.

With one engine speaking both halves it stops being a problem at all. Same speaker id, same prosody model, same sample rate — the seam disappears. **The unlock is not "Sanskrit audio exists"; it is "the persona is one person."** That is worth more to the product than the latency gain.

### 4.2 Recognition — two paths

| Path | Use | Source |
| --- | --- | --- |
| **Sarvam Saaras v4** | Conversation. Mixed Hindi/English/Sanskrit input | Commercial API, ₹30/hr. Supports `sa-IN` and a `codemix` output mode — built for exactly our input shape. ₹25K credits ≈ 830 hrs. |
| **Saaras against a known target** | Varṇamālā, challenge and śloka grading | See §6.2. Constrained comparison, not true forced alignment — no hosted API returns phone-level alignments. |

**Move to `saaras:v4`.** v4 is live and ungated on our key today (§4.5). Early signal worth confirming with `scripts/bench_asr.py` before switching: on one second of digital silence, `saaras:v3` returned `अस्तु अस्तु` and `saaras:v4` returned empty. One sample is not a benchmark, but a hallucinated transcript in a grading loop is a false accusation against a learner who said nothing — precisely the failure §6.3 exists to prevent. Bench it, then switch.

Saaras is the only recogniser. There is no second ASR path and no local aligner — see §6.2 for what that does to pronunciation grading, and §10 for the vendor risk it concentrates.

### 4.3 Validation and reasoning

| Component | Role |
| --- | --- |
| **Vidyut** (`ambuda-org/vidyut`) | Rust + Python bindings. `vidyut-cheda` segments and annotates morphology; `vidyut-prakriya` derives forms. Fast enough for real-time. |
| sanskrit_parser (`kmadathil/sanskrit_parser`) | Pure Python fallback for lexical/morphological analysis |
| **Gemini Flash** | Default tutor brain. Best measured zero-shot on Sanskrit (GEMBA 87.04) and cheapest tier |
| Frontier model | Reserved for hard error diagnosis where reasoning pays |

Do **not** use Indic-specialist *translation* models — IndicTrans2 scored 12.23 GEMBA and NLLB 8.08, against Gemma3-27B at 64.55.

**Correction (2026-08-29).** An earlier draft said "Sarvam-105B does not support Sanskrit at all." That is measured false. `backend/app/evals` benchmarks candidate models on our own 37 seed challenges, scored by the same Vidyut analyzer that grades learners:

| Model | yield | gate | feat | diag | falseacc | p50 | INR / accepted |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `sarvam-105b-conversations` | 100% | 100% | 95% | 73% | 14% | 2.1 s | **₹0.0055** |
| `gemini-3.7-flash` | 100% | 100% | 95% | **100%** | **5%** | 3.2 s | ₹0.0623 |
| `sarvam-105b` (reasoning) | **59%** | 100% | 100% | 92% | 0% | **42.8 s** | ₹0.3128 |

Three findings that decide model routing:

1. **Sarvam authors valid Sanskrit.** 100% of its output cleared the Vidyut gate, at **1/11th of Gemini's cost per accepted sentence** and faster. For offline content generation it is the better buy, and the ₹25K credits cover roughly 400K sentences.
2. **Sarvam cannot handle the dual.** Splitting diagnosis by number: on non-dual cases it false-accuses at 3%, identical to Gemini. On dual cases it false-accuses at **50%** and its explanations argue the dual should be plural. The likely cause is that its training concentrates on the 10 most-spoken Indian languages, **none of which has a productive dual** — Sanskrit does, and we teach it. Nominal 22-language coverage does not reach a feature no modern training language exercises.
3. **Never use `sarvam-105b` (the reasoning variant) in a request path.** It spends its whole token budget thinking: 41% of generate calls returned nothing at all, and p50 latency was 42.8 s.

### 4.4 Corpora — two indexes, never merged

| Index | Sources | Serves |
| --- | --- | --- |
| Classical | DCS (4.8M tagged words), GRETIL, Mitrasaṃgraha (391K pairs, largely CC0) | Daily śloka, grammar reference |
| Laukika | Samskrita Bharati graded readers, Balamodini stories (Internet Archive) | Conversation, challenges |

Enforce the split at the retrieval layer, not by prompt instruction. A shared index makes the tutor answer "what did you eat?" in Purāṇic register.

Licence care: verify per item on Internet Archive — an uploader name is not a licence. Do not voice-clone identifiable speakers. Note that CC0 translations are Victorian (Griffith 1896, Ganguly, Bühler) and often inaccurate by modern standards; use them as source text, not as authoritative meanings.

### 4.5 Sarvam API surface — audited against our key, 2026-08-29

Public docs describe an 11-language product. The API is a 23-language product with 12 languages gated per account. Probed directly rather than read off the docs; re-probe before assuming any row still holds.

| Surface | Sanskrit / Konkani / Maithili / Sindhi | Status |
| --- | --- | --- |
| `/text-to-speech` `bulbul:v3` | 400 *"request beta access"* — 12 codes gated | **Granted, landing in 2–3 days** |
| `/speech-to-text` `saaras:v4` | ✅ all four, ungated | Available now — we pin `saaras:v3` |
| `/translate` `sarvam-translate:v1` | ✅ all four, ungated | Available now — the default `mayura:v1` rejects all four |
| `/transliterate` | ❌ 11-language enum, no beta message | **Genuine gap.** Build IAST/ITRANS ourselves |
| `/text-lid` | ❌ returns `null` for Sanskrit | **Genuine gap.** See below |
| `/v1/chat/completions` | `sarvam-105b`, `sarvam-105b-conversations` only | Sufficient — the tutor brain is Gemini anyway |

Two of these change what we build:

- **Transliteration is ours to write.** `script_ratio` (§7) is a core dial and it needs Devanagari↔IAST both ways. Sarvam covers 11 languages and Sanskrit is not one of them, with no beta path offered. Vidyut and `indic-transliteration` handle this locally and deterministically, which is better anyway — romanisation should not cost a network round trip.
- **Language ID cannot see Sanskrit.** `/text-lid` returns `language_code: null, script_code: null` for Sanskrit input while correctly returning `hi-IN / Deva` for Hindi in the same script. So `sanskrit_ratio` measurement cannot use it. Measure the ratio from **Vidyut parse coverage** instead — the fraction of tokens Vidyut resolves as Sanskrit morphology — which is more accurate for our purpose than any LID, because it is the same signal we already grade on.

### 4.6 Retrieval — smaller than it looks

§4.4 says two indexes, never merged. It never said what builds them, and the answer changes the size of the job.

**Ask first where the LLM actually runs** (§12): not in the guided turn path at all. So retrieval serves exactly three callers —

| Caller | When | Latency budget |
| --- | --- | --- |
| Authoring the dialogue graph | Offline, batch | Unbounded |
| "Why was I wrong?" explanations | Live, off the turn path | ~2 s |
| Open conversation | Live, premium tier | ~2–4 s |

None of them is the free product's hot path. **So there is no production vector database in v1.** The corpus is small (thousands of graded sentences, not millions of documents), it changes only when we author, and a flat file of embeddings loaded into memory answers all three callers in single-digit milliseconds. Reach for pgvector when the corpus outgrows RAM, and not before — this is infrastructure the current design does not need.

**Embeddings need a second vendor.** Sarvam has no embeddings endpoint (probed 2026-08-29: `/v1/embeddings` and `/embeddings` both 404, as do the rerank paths). Gemini already supplies the tutor brain, so its embedding API is the natural pick and keeps the vendor count at two.

> **Measure it, do not assume it.** Multilingual embedding quality on Sanskrit is unknown, and §4.3 is the precedent: published benchmarks said Indic-specialist models were the right call and our own evals said the opposite. Retrieval quality is testable the same way — hold out a set of laukika sentences, ask whether the right ones come back, and check specifically that a classical query never retrieves laukika or the reverse. That test is the whole point of the two-index split (§4.4) and it is currently unverified.

**Chunk on Vidyut boundaries, not on characters.** Sanskrit fuses word boundaries through sandhi and builds compounds (समास) of arbitrary length, so any character- or token-window chunker will cut mid-compound and produce fragments that mean nothing. Vidyut already segments — the tool is in the repo for grading — so reuse it as the chunker. Verse is chunked by verse; prose by sentence.

**The register split is enforced at retrieval, not by prompt** (§4.4). In practice that means two separate stores with no shared query path, so crossing registers requires writing new code rather than forgetting an instruction.

---

## 5. Register routing

| Surface | Register | Corpus | Voice |
| --- | --- | --- | --- |
| Daily śloka | Classical / Vedic | Classical index | Bulbul (pre-rendered) or licensed human recording — spoken, not chanted (§4.1) |
| Varṇamālā | — | — | Bulbul (pre-rendered akṣara bank) |
| Audio challenges | Laukika | Laukika index | Bulbul (pre-rendered) |
| Guided conversation | Laukika | Laukika index | Bulbul (pre-rendered) |
| Open conversation | Laukika | Laukika index | Bulbul (live) |
| Grammar | Pāṇinian | Classical index | — |

One rule: **register is a first-class routing key.** It selects the corpus, the voice, and the difficulty ordering. Never let a request cross registers implicitly.

The voice column is now constant. That is the point of §4.1 — routing complexity moved from *which engine* to *pre-rendered or live*, which is a caching question rather than an identity question.

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

**Fix:** for varṇamālā, challenges and śloka recitation we always know the target text. So verify *against the known target* rather than accepting an open-vocabulary transcription at face value.

**What we can actually build, given no local models.** True forced alignment needs frame-level access to an acoustic model, and no hosted API exposes that — Saaras returns a transcript, not a phone lattice. So the honest implementation is **constrained comparison**: transcribe the attempt, compare it akṣara-by-akṣara against the known target, and treat any divergence as a *candidate* error rather than a confirmed one. This is weaker than alignment in one specific way — it cannot tell "said the wrong sound" from "the recogniser misheard" — which is exactly why §6.3 does the safety work. Set the bar high and stay quiet when unsure.

Two consequences to design around, not around which to hope:

- **Single-akṣara audio is the worst case for ASR.** A model trained on connected speech has almost no context to work with on an isolated ट. Expect low confidence, and let §13 ship self-comparison instead of scoring until it is measured.
- **Prefer whole words to isolated sounds** wherever the pedagogy allows. `पटः` gives the recogniser context that `ट` does not, and the contrast is still testable through the minimal pair.

### 6.3 Abstain rather than falsely accuse

Vāgbodhinī uses decode-consensus with abstention: flag a syllable only when multiple model outputs agree, and stay silent when uncertain.

Adopt this as a product principle. **A missed error costs far less than a false accusation.** A learner wrongly told they mispronounced something loses trust immediately and permanently.

---

## 7. Data model

```
Feature            id, kind (case|number|tense|voice|sandhi), rank
                   e.g. ACC.SG, DUAL, PRES.1SG, vowel-sandhi

Varna              id, devanagari, iast, kind (svara|sparsha|antahstha|ushman|ayogavaha),
                   sthana (kantha|talu|murdhan|danta|oshtha),
                   prayatna (aspirated, voiced, nasal),
                   audio_url, example_word, minimal_pairs[] -> varna ids

Challenge          id, prompt_l1, prompt_lang, target_sanskrit,
                   features[]          -> what it exercises
                   accepted_parses[]   -> feature sets, NOT strings
                   audio_url           -> pre-rendered, CDN
                   register            -> laukika | classical

Shloka             id, date, source_ref, devanagari, iast, metre,
                   word_breakdown[], features[], audio_url

Learner            id, bridge_langs[], sanskrit_ratio, script_ratio,
                   feature_mastery{feature_id -> score},
                   varna_mastery{varna_id -> score},
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
| Sanskrit voice | **Bulbul v3 `sa-IN`, one engine for every surface** | Any self-hosted engine | One persona needs one timbre, and phones cannot hold models. Costs us chant (§4.1) |
| Speech delivery | Hybrid: pre-render by default, live only where pre-rendering cannot reach | All live / all pre-generated | Cuts cost ~6×. The cost argument stands even though the latency argument is gone |
| Conversation transport | Turn-based request/response | Streaming WebSocket / Pipecat | Survives poor mobile networks, trivially debuggable. Revisit for open conversation once it has users |
| Learner model | Server-side | Client-side | The adaptive algorithm will be retuned constantly in year one; server-side means no app release |
| Model routing | **Sarvam offline, Gemini for dual + diagnosis** | Single model everywhere | Measured, not assumed (§4.3). Sarvam is 11× cheaper and clears the Vidyut gate at 100%, but false-accuses half of all dual sentences. Route by measurement, re-run the evals when either ships a new model. |
| Pronunciation grading | Constrained comparison against a known target, with abstention | True forced alignment | No hosted API returns phone-level alignments (§6.2). Ship self-comparison first; add scoring only per contrast, once measured |
| Transliteration | Server-side rule libraries (Vidyut / `indic-transliteration`) | Sarvam `/transliterate` | Sarvam has no Sanskrit there and offers no beta path (§4.5). These are deterministic rule engines, not models — they carry no weights and no GPU |
| `sanskrit_ratio` measurement | Vidyut parse coverage | Sarvam `/text-lid` | LID returns null for Sanskrit (§4.5). Parse coverage is the signal we already grade on |
| Inference hosting | **None. Every model is a hosted API** | Serverless GPU / dedicated / on-device | The app ships to phones. We run no inference, hold no weights, and maintain no GPU box — including for batch |
| Secrets | Server only | Client-side keys | Prompts and corpus are the asset |

---

## 9. Relationship to Prof. Prathosh's work

His stack (IISc Bengaluru) covers **chanting and śāstric recitation**. Ours covers **conversational production**. They are complements, not substitutes.

| His | Ours |
| --- | --- |
| Vāgdhenu — metre-aware chant TTS | Bulbul, hosted — spoken, not chanted (§4.1) |
| Su-śrotā — recitation ASR | Saaras, hosted — mixed-language conversation ASR |
| Vāgbodhinī — chant practice against a known verse | Adaptive code-switching tutor, laukika production |

**We adopt his ideas and none of his weights.** Both his models are self-hosted, and §1 rules that out — the app ships to phones and we run no inference. So the relationship is intellectual rather than technical, and that is worth being precise about:

1. **Adopt the patterns, which carry no licence question and no weights.** Verification against a *known target* rather than open transcription (§6.2), and **abstention over accusation** (§6.3). These are the two best ideas in his stack and they are design, not code. Both are already load-bearing here.
2. **Do not adopt the models.** Vāgdhenu is Apache-2.0 and would otherwise be usable; Su-śrotā publishes no licence at all, which means all rights reserved. Neither matters now — the constraint excludes both before the licences do.
3. **Contact him anyway.** He open-sources actively, and the valuable thing is not code: Sanskrit content validation is a real bottleneck for us, and there are very few people who can grade Sanskrit pronunciation output properly. A collaboration or an advisory relationship is worth more to Shabd than either model would have been.
4. Do not repeat unverified claims from social media about this work — the "1,500 contributors" and "automated Śikṣā/Chandas verification engine" framing came from a third-party post whose author flagged it as their own interpretation. What is documented is metre-aware rendering and akṣara-level verification against a known target.

**Vāgbodhinī partially overlaps our daily-śloka feature** and validates that syllable-level pronunciation feedback works — useful evidence that §13 is buildable at all. It does not do conversation, code-switching, adaptive ratio, or laukika Sanskrit, so our lane stays open.

---

## 10. Risks

| Risk | Mitigation |
| --- | --- |
| ASR silently repairs learner errors | Forced alignment against known target, not open transcription (§6.2) |
| Register bleed — tutor answers in Purāṇic Sanskrit | Two RAG indexes enforced at retrieval layer (§4.4) |
| False accusation destroys trust | Decode-consensus with abstention (§6.3) |
| **Single-vendor dependency on Sarvam, with no fallback** — voice, ASR and offline authoring all sit on one commercial API, and `sa-IN` is a *beta flag on our account* that can be withdrawn. No-local-models means there is no cold standby to fall back to | **This is now the top risk in the document and it has no cheap mitigation.** What we can do: (a) keep the renderer engine-agnostic behind one interface so a vendor swap is a config change, never a rewrite; (b) **own our audio** — every pre-rendered clip is a durable asset that survives losing the API, which is another argument for pre-rendering aggressively; (c) keep the Sarvam relationship warm, since the beta flag is a relationship, not a contract; (d) accept that a withdrawal degrades us to text-only, and know that in advance rather than discovering it |
| **Bulbul `sa-IN` quality is unknown, and there is no plan B** | It is a beta flag on a model whose Sanskrit nobody outside Sarvam has heard. **Listening test before anything is pre-rendered at volume** — visarga, anusvāra, the three sibilants, retroflex series, vowel quantity. If it fails there is no second engine to fall back to, so the fallback is a *product* decision: ship text-first surfaces, or buy human recordings for the fixed content |
| **Pronunciation grading may not reach useful accuracy** on hosted ASR alone (§6.2) | §13 ships self-comparison, which is useful with zero grading risk. Add automated scoring one contrast at a time, only where measured. Never ship a contrast that has not cleared the bar |
| **Live TTS re-inflates cost** — the easy path is to synthesise everything and never build the pipeline | Meter open conversation from day one. Track pre-rendered vs live character share as a first-class metric; if live share climbs, the pipeline is behind |
| Sarvam ships wrong duals into pre-rendered content | Vidyut catches malformed morphology but not a *valid form in the wrong number*. Route dual-bearing content to Gemini, and keep dual items in the human spot-check sample |
| Dialogue graph feels canned / learner goes off-script | Bounded turn space is pedagogically correct at beginner level, but measure escape rate: log every ASR result with no matching edge. That log is the backlog for the next authoring batch |
| Cost per session at scale | Pre-render by default; meter voice minutes; keep free tier CDN-only |
| Sanskrit register mismatch in corpus | Laukika corpus from Samskrita Bharati readers, never from epics |

---

## 11. Build order

Revised 2026-08-30: **the client moves to the front.**

The previous revision moved conversation ahead of the challenge loop because pre-rendering took it out of the expensive tier. This revision goes further, for a different reason: with live Bulbul `sa-IN`, a working app no longer *depends* on the authoring pipeline. Live synthesis covers every turn from day one — expensively, but it covers them. The pipeline stops being a prerequisite and becomes the thing that makes the app affordable at scale.

So build the client against live synthesis, then move content into the pre-rendered tier behind it.

1. ~~**Voice spike**~~ — closed. Self-hosted renderers are out of scope entirely (§1); the existing Parler and Vāgdhenu wrappers are dead code to be removed, not standby.
2. **ASR bench** — extend rather than repeat: bench `saaras:v4` against `v3` on real code-mixed audio, including the silence-hallucination case (§4.2).
3. **Bulbul `sa-IN` listening test** — the moment the flag lands. Blocks every downstream decision about voice, and the risk table says why.
4. **Client — React Native + Expo.** Record, upload, play, one working turn end to end against the existing API. Live TTS, no pre-rendering, no offline pack.
5. **Varṇamālā + pronunciation** (§13) — first real surface. Smallest content set in the app, fully pre-renderable, and it exercises record → align → grade → feedback, which every other surface reuses.
6. **Guided conversation** — dialogue graph, turn loop, edge matching, repair moves, escape logging. Move its audio into the pre-rendered tier.
7. **Authoring pipeline at volume** — Sarvam drafts → Vidyut gates → human spot-check → Bulbul renders → CDN.
8. **Challenge loop and daily śloka** — share the same pipeline and learner model, so nothing is rebuilt.

**What building the client first costs.** Every session runs on live synthesis until step 7, at roughly ₹20 rather than ₹5 (§2). That is affordable for a 20–30 person beta on the ₹25K grant and unaffordable at any real scale. The risk is not the money — it is that a working live path removes the pressure to build the pipeline. Treat step 7 as scheduled work, not as an optimisation to do later.

---

## 12. Conversation — the voice tutor

Goal: a named Sanskrit-speaking tutor a learner talks to out loud and it answers like a person. Voice persona only — no lip-sync, no 3D.

### What changed

This section used to open with "there is no fast Sanskrit TTS" and derive an absolute rule from it: *no Sanskrit is synthesised in the request path, ever.* That rule rested on the only Sanskrit voice then available being a self-hosted model that took 10–15 s a sentence. It was over-determined — it had a latency argument and a cost argument, and it only ever needed one to survive. Bulbul `sa-IN` removes the latency argument, and §1 removes that engine from consideration altogether. The cost argument stands on its own.

So the rule relaxes rather than disappears:

> **Pre-render everything that can be pre-rendered. Synthesise live only what cannot.**

What genuinely cannot be pre-rendered is a short list, and it is exactly the list that was previously impossible:

- Open conversation past the edge of the graph
- Anything containing the learner's own words — their name, their sentence read back to them, their error corrected in place
- Arbitrary text the learner types or points at

That third category is why the varṇamālā and grammar surfaces get read-aloud for free now, and it is worth more than it sounds.

### Two conversation modes

| | Guided | Open |
| --- | --- | --- |
| Content | Authored dialogue graph | Free-form |
| Sanskrit audio | Pre-rendered, CDN | Live Bulbul |
| LLM in turn path | None | Yes |
| Turn latency | ~600–900 ms | ~2–4 s |
| Marginal cost | ~₹0 | ₹15–18 / 10 min |
| Tier | Free | Metered, premium |

These are different experiences, not quality tiers of one experience. Guided is fast, bounded, and feels like drilling with a patient teacher. Open is slower, unbounded, and feels like a conversation over a bad phone line. **Ship guided first** — it is the one that is pedagogically correct for beginners and the one whose latency humans tolerate.

### The guided turn loop

```
learner speaks
   |
   +-> Saaras v4 ASR (codemix)          ~500-800 ms   <- the ONLY live model call
   +-> Vidyut grade + diagnose            ~10 ms      <- local, already built
   +-> adaptive engine picks next turn      ~5 ms     <- local, already built
   +-> play pre-rendered audio              ~0 ms     <- device cache / CDN
   =                                   ~600-900 ms per turn
```

Human turn-taking tolerates roughly a second. This fits. Every component except ASR is already in the repo.

### The open turn loop

```
learner speaks
   |
   +-> Saaras v4 ASR (codemix)          ~500-800 ms
   +-> Gemini Flash composes the reply   ~1000-3000 ms   <- the new cost, in time and money
   +-> Vidyut validates the reply           ~10 ms       <- do NOT skip this
   +-> Bulbul sa-IN synthesises            ~300 ms
   =                                   ~2-4 s per turn
```

**Vidyut validation stays in the loop even though it costs latency.** The whole premise of §8 is that a probabilistic system becomes checkable, and that premise is not suspended because the learner paid. A tutor that speaks ungrammatical Sanskrit to a paying learner is worse than one that pauses. On a failed gate, regenerate once, then fall back to a bridge-language reply rather than voicing bad Sanskrit.

### The dialogue graph

Conversation is a graph, authored offline and rendered to audio before anyone hears it.

| | |
| --- | --- |
| **Node** | One tutor turn: pre-rendered audio, Devanagari, IAST, gloss, register, `sanskrit_ratio` band |
| **Edge** | An expected learner response, keyed by **feature set, not string** |
| **Authoring** | Sarvam drafts → Vidyut gates → human spot-checks → Bulbul renders → CDN |

Edges reuse `grading/engine.py` untouched. That matters more than it looks: free word order, morphological ambiguity, and the abstention rule are already correct there, so `ग्रामं गच्छामि` and `गच्छामि ग्रामम्` traverse the same edge for free, and an ambiguous form never takes a wrong one.

**Why a bounded turn space is not a cop-out.** Beginner conversation *is* bounded — that is what makes it learnable. A graph with good coverage of the first 500 turns is a better tutor than a free-form model that occasionally invents ungrammatical Sanskrit, and it is the only version that answers in under a second.

### Going off-script

Before any of this: some utterances are not moves in the graph at all. "What does that mean?", "say it again", "translate that" are questions *about* the line, and treating them as failed answers was the single worst thing the runtime did — the learner asked a reasonable question and got a repair prompt for a question they had not asked. `services/meta_intent.py` classifies them deterministically (a phrase table over Devanagari, romanized Hinglish and English — **no model**, so the turn stays ~20 ms), holds the node, and grades nothing. `repeat` is answered by replaying audio the client already has; `explain` and `translate` are answered by a **second** call to `/conversation/explain`, which is what keeps the model off the turn path.

The learner will still say something with no matching edge. There are now three responses, in order of preference:

1. **Repair move** — a pre-rendered "ask again", narrower prompt, or drop to the bridge language. Free, instant, and usually correct at beginner level.
2. **Live synthesis**, for learners on the paid tier, when the utterance is coherent and the graph simply has no edge for it. Costs a turn's latency and money, and needs the Vidyut gate above.
3. **Log it with the node it arrived at, always** — regardless of which of the two fired. That log is the authoring backlog, ranked by frequency, and it is how live turns become pre-rendered ones.

Escape rate remains the health metric for the whole feature. Falling escape rate means the graph is converging on how learners actually talk. **Watch it alongside live-character share** (§10): the two together say whether the pipeline is keeping up with the users.

### Code-switching is the pressure valve

Shabd's core dial is `sanskrit_ratio`, and it doubles as the coverage valve. Bridge-language turns are cheap to author and unbounded in a way Sanskrit turns are not, so when the graph has no Sanskrit edge it can always fall back to Hindi or English without breaking character. As `sanskrit_ratio` rises the graph carries more of the load — which is exactly the product's own progression curve.

The old note here said v1 pre-renders both languages to avoid two timbres for one persona. **That constraint is gone** (§4.1): one engine speaks every surface, so mixing pre-rendered Sanskrit with live bridge audio — or the reverse — no longer changes who the learner hears. Pre-render both anyway, for cost, and because owned audio is the only hedge against losing the vendor (§10). But it is now a cost decision rather than an identity one, which means it can be relaxed per surface without the persona fracturing.

### Where the LLM lives

| When | Model | Why |
| --- | --- | --- |
| **Offline, authoring the graph** | `sarvam-105b-conversations` | 100% Vidyut gate pass at ₹0.0055/sentence. ₹25K of credits ≈ 400K sentences. Latency is irrelevant here, which is the whole point |
| **Offline, any dual-bearing content** | Gemini | Sarvam false-accuses 50% of dual sentences and argues the dual should be plural (§4.3). Vidyut catches malformed morphology, **not a valid form in the wrong number** |
| **Live, off the turn path** | `sarvam-105b-conversations` | "Why was I wrong?" / "what does that mean?" — `POST /conversation/explain`. Tolerates 2 s because nobody is waiting mid-conversation. **Was Gemini; changed 2026-08-30** to keep the live path on one vendor. Measured 1.3–3.0 s. The dual caveat below is the known cost |
| **Live, guided turn path** | **none** | There is no model in the loop. That is what buys the sub-second turn |
| **Live, open turn path** | Gemini Flash + Vidyut gate | The premium tier is paying for exactly this. Never ungated |

### Open items specific to §12

- Saaras v4 p50/p95 on real code-mixed audio (build order step 2).
- Bulbul `sa-IN` quality and latency, measured not assumed (step 3).
- Voice casting listening test before the persona is locked — now a single-engine decision, so it is one speaker id chosen from 30+ rather than a cross-engine compromise.
- Whether forced alignment (§6.2) or open ASR is right for conversation. §6.2 chose alignment for *challenges* because the target is known; in free conversation it is not, so conversation likely needs open ASR with the abstention rule doing the safety work.

---

## 13. Varṇamālā and pronunciation

The entry surface, and the one the app is currently missing entirely. A learner who cannot pronounce त versus ट cannot be graded fairly on anything else, and a diaspora learner who cannot read Devanagari has no way in at all.

### Why it is nearly free to build

The varṇamālā is **finite and small**: 13 vowels, 33 consonants, 2 ayogavāha, plus a working set of conjuncts — roughly 60–120 audio assets including example words. That is the cheapest tier-one asset in the entire app (§2): a single render batch, shipped inside the app bundle rather than the CDN. It works offline, forever, at zero marginal cost.

### The pedagogical ordering is already done

Sanskrit orders its own alphabet by **place of articulation** — कण्ठ्य (velar), तालव्य (palatal), मूर्धन्य (retroflex), दन्त्य (dental), ओष्ठ्य (labial) — and within each वर्ग by voicing, aspiration and nasality. That ordering *is* the teaching sequence. No other language hands you a phonetically-sorted alphabet, and it means the progression needs no invention: teach by वर्ग, and every row is a controlled minimal-pair set by construction.

Store `sthana` (place) and `prayatna` (effort) per varṇa (§7) so feedback can name the actual articulator: not "wrong sound" but "that was dental — curl the tongue tip back to the roof of the mouth."

### Grading is the hard part, not synthesis

Producing the audio is trivial. Judging the learner's attempt is where this surface lives or dies, and the contrasts that matter are exactly the ones ASR is weakest on:

| Contrast | Example | Why it is hard |
| --- | --- | --- |
| Dental vs retroflex | त / ट, द / ड, न / ण | Absent from English; Hindi speakers have it, English-first diaspora do not |
| Three sibilants | श / ष / स | Collapses to two or one in most learners' L1 |
| Aspiration | क / ख, ग / घ | Phonemic in Sanskrit, allophonic or absent in English |
| Vowel quantity | अ / आ, इ / ई | Changes meaning; easy to hear, hard to produce consistently |

This is the most constrained case in the app — the target is a single known akṣara — but §6.2 is the limit on what we can do with it. No hosted API returns phone-level alignments, so we compare a transcript against a known target and never actually measure acoustic distance. On an isolated sound that is a weak signal, because a recogniser trained on connected speech has no context to work from.

So **abstention (§6.3) is not a refinement here, it is the design.** These contrasts are exactly where recogniser confidence is lowest, so the bar for "you said ष not श" must be very high, and where the pedagogy allows, drill the contrast inside a *word* (`पटः` vs `पतः`) rather than on a bare letter — the recogniser gets context and the contrast is still tested.

### Scope for v1

Ship the drill and the feedback loop; hold phoneme-level scoring until the aligner is measured on real learner audio. A varṇamālā that plays reference audio, records an attempt, plays both back for self-comparison, and tracks coverage is **already useful** and carries no false-accusation risk at all. Add automated scoring per contrast only as each one clears a measured confidence bar — one contrast at a time, hardest last.

---

## 14. Platform and operations

Everything above is the part of Shabd that is hard because it is Sanskrit. This section is the part that is hard because it is an app, and until now the document has been almost silent on it. Treat the items marked **unresolved** as real gaps, not as details.

### 14.1 Backend hosting — **unresolved**

SQLite on a local file (`backend/app.db`) is right for building and wrong for production: most managed hosts give you an ephemeral disk, so the database disappears on every deploy. **Move to managed Postgres before the first real user.** SQLAlchemy keeps this a config change, which is why it was chosen (DECISIONS.md).

Pick a boring host. The API is a single stateless FastAPI process calling third-party APIs — there is no GPU, no queue, and no local model (§1), so nothing here justifies Kubernetes. Requirements: managed Postgres, persistent object storage for audio, a scheduled-job runner for the authoring batch, and a region close to the users. India for domestic, and note §14.6 before defaulting to a US region.

### 14.2 Audio storage and CDN — **unresolved**

"Serve from CDN" appears throughout this document and has never been specified. It carries the entire cost model (§2), so it needs a real answer: object storage plus a CDN in front, immutable content-hashed filenames, long cache headers, and pre-signed URLs if the audio is ever entitlement-gated.

**Pre-rendered audio is an owned asset, not a cache.** §10 lists single-vendor dependency as the top risk, and every clip already rendered is a clip that survives losing the API. Back it up accordingly and never treat it as regenerable-on-demand.

### 14.3 Identity — **unresolved**

The backend has a token table and no real identity. Before shipping:

- **Sign in with Apple is mandatory** if any third-party sign-in is offered (App Store Guideline 4.8). Adding Google sign-in without it fails review.
- **In-app account deletion is mandatory** for any app with account creation (Guideline 5.1.1(v)) — not an email link, a path inside the app.
- Anonymous-first is worth considering: the varṇamālā (§13) is genuinely useful before login, and forcing signup at the door costs installs on a free surface that has near-zero marginal cost.

### 14.4 Payments — **unresolved, and it changes the unit economics**

Nothing in this document has mentioned billing, and the pricing thesis depends on it. Voice minutes are metered (§12) and open conversation is a paid tier, so this is core, not peripheral.

**Store commission is a real line item.** Apple and Google take 30%, reduced to 15% under their small-business programmes (below ~$1M/year), which is where Shabd will sit for a long time. At $9.99/month that is roughly ₹880 gross → **~₹750 net**. Against ~₹400/month of inference for an engaged learner, the margin is ~47% rather than the ~55% modelled — and if the app ever crosses into the 30% tier without prices changing, ~35%.

Consequence worth planning around: **the live-synthesis build order (§11) roughly quadruples per-session cost until the pre-render pipeline lands.** That is affordable for a small beta and it is not affordable alongside a store commission at scale. Two reasons to build the pipeline, not one.

### 14.5 Client — React Native + Expo, both platforms

Yes, one codebase covers iOS and Android. The parts that will actually cost time are audio, and they are not symmetric:

- **iOS silences audio when the hardware mute switch is on** unless the audio session category is set explicitly. For an audio-first app this reads to the user as "the app is broken", and it is invisible in the simulator. Set the category, and test on a physical device with the switch on.
- **Recording formats differ.** iOS and Android default to different container/codec combinations; pin an explicit format so what reaches Saaras is the same on both.
- **Microphone permission** needs a purpose string on both stores, and the copy is user-visible — write it deliberately.
- **Simulator microphones are poor.** Audio quality work needs real devices, which is why the dev setup is a phone on the LAN.
- **Offline audio pack** is referenced throughout (§2, §13) and unspecified: what is bundled at install versus fetched, how it updates, and how much disk it may use.
- **Expo Go until something needs more.** Moving to a dev build is a reversible decision; make it when a library forces it, not in advance.

### 14.6 Privacy and compliance — **unresolved**

The `Attempt` model stores `raw_audio` (§7). **Recordings of a person's voice are personal data**, and India's DPDP Act 2023 applies to Indian learners while GDPR applies to any in the EU — which the diaspora thesis guarantees.

Decide and write down: how long raw audio is retained, whether it is retained at all after grading, whether it may be used to improve the product, where it is stored, and how a learner deletes it. Both stores also require privacy labels that must match actual behaviour. **A learning app will attract minors** regardless of target market, so age handling needs a deliberate answer rather than a default.

The cheapest good answer to most of this: **do not keep raw audio.** Grade it, keep the derived features and the verdict (§7 already models those separately), discard the recording. Keep it only with explicit opt-in, for learners who agree to help improve the tutor.

### 14.7 Abuse and rate limiting — **unresolved**

**Voice minutes are money.** Every ASR call and every live synthesis costs real rupees on a prepaid grant, and there is currently no rate limiting anywhere in the API. A leaked token or a trivial script could burn the ₹25K credit grant in a day.

Per-learner quotas on ASR seconds and synthesised characters, enforced server-side, before any public build. `voice_minutes_used` exists on `Learner` (§7) and is not yet enforced against anything.

### 14.8 Observability — **unresolved**

§10 and §12 name two metrics as the health of the product — **escape rate** and **pre-rendered vs live character share** — and no system collects either. Neither is optional: escape rate is the authoring backlog, and live share is the early warning that the cost model is drifting. Add structured logging and a place to look at these before the features that generate them ship.

Also worth capturing from day one: per-vendor API latency and error rate (Sarvam is a single point of failure), Vidyut gate pass rate on authored content, and cost per session, broken down by surface.

---

## 15. Open questions

- **Name.** A shipped Sanskrit product called SHABDA exists (svami.in). Decide before buying domains.
- ~~**Bulbul Sanskrit roadmap.**~~ **CLOSED 2026-08-30** — `sa-IN` granted via the startup programme, landing in 2–3 days. The API was never missing Sanskrit; it was gated per account (§4.5). Drove the §12 rewrite.
- **Bulbul `sa-IN` quality.** Now the highest-value unknown in this document. Nobody outside Sarvam has heard this model's Sanskrit, and §11 step 3 is a hard gate on the rest of the build.
- **Odia code.** ~~Docs say `od-IN`, website says `or-IN`.~~ **Resolved against the live API: `od-IN`** — it is the value carried in the `/text-to-speech` and `/translate` enums.
- ~~**Parler-TTS latency on target GPU.**~~ **CLOSED** — self-hosted engines are out of scope (§1).
- ~~**Voice casting across languages.**~~ **CLOSED** — one engine speaks every surface, so this is a single speaker-id choice (§4.1).
- **Chant.** Daily śloka ships as spoken recitation because no hosted API chants (§4.1). Decide between licensed human recordings, asking Sarvam for a chant voice, or shipping prose reading and saying so plainly. This is the largest open product question created by the no-local-models rule.
- **How accurate can pronunciation grading get on hosted ASR alone?** Unmeasured, and it caps how much of §13 can ever be automated. Measure per contrast on real learner audio before promising any of it.
- **Saaras v4 versus v3.** Bench before switching (§4.2). The silence-hallucination signal needs confirming on more than one sample.
- **Transliteration library.** Vidyut versus `indic-transliteration` for Devanagari↔IAST. Server-side rule engines either way (§4.5); pick on round-trip fidelity for the conjuncts.
- **Retrieval quality on Sanskrit is unmeasured** (§4.6). Specifically: does a classical query ever retrieve laukika? That crossover is the one thing the two-index split exists to prevent, and nothing tests it yet.

### Open — platform (§14)

These are gaps, not details. Every one of them is unresolved and each blocks a real ship:

| # | Question | Blocks |
| --- | --- | --- |
| 14.1 | Which host, and when does SQLite become Postgres? | First real user |
| 14.2 | Which object store + CDN, and what is the backup policy for owned audio? | Any pre-rendered content at volume |
| 14.3 | Identity: anonymous-first? Sign in with Apple + in-app deletion are mandatory | App Store review |
| 14.4 | Billing, and pricing that survives a 15–30% store commission | Revenue |
| 14.6 | Do we retain `raw_audio` at all? DPDP + GDPR apply, and minors will show up | Any public build |
| 14.7 | Per-learner quotas on ASR seconds and synthesised characters | Any public build — a leaked token burns the grant |
| 14.8 | Where do escape rate and live-character share actually get recorded? | Knowing whether the product works |
