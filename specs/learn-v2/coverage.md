# Learn v2 — coverage map (Muse Spark, 12 Oct 2026)

> Current audit correction, 12 October: the owner has authorized images across the whole learning curriculum. See [WHOLE-COURSE-AUDIT.md](WHOLE-COURSE-AUDIT.md). The seven lessons / 62 cards below remain the exact live local catalogue. Three generated PNGs have been delivered, but the app currently uses three different prototype JPG illustrations; these are not PNG derivatives. Their baked captions are clipped out by the corrected renderer and replaced with verified native text. References below to a generation hold, photos, or no Codex delivery are historical wording superseded by this audit. Pens and pencils are allowed.

Workspace: `C:/Users/AnshulKumar/PycharmProjects/sanskrit`.
Starting git status captured before edits: extensive uncommitted work on main
(parva/recite/mobile); no reset/clean/stash performed. Learn v2 is purely
additive: new `mobile/src/learnv2/*`, two new screens, one new tab, three new
stack routes. No edits to Lesson/Path/Grammar/GrammarTopic/GrammarChapter
behaviour, no progress-key migration, no backend change, no version bump.

Expo SDK 57 verified before coding (docs.expo.dev/versions/v57.0.0):
React Native 0.86 / React 19.2.3. Implementation uses only the app's existing
deps (react-navigation tabs + native-stack, reanimated, gesture-handler,
safe-area, async-storage). No new dependency.

## Shipped catalogue (live, validated) — 7 lessons, 62 cards

| Lesson ID | Outcome | Cards | Prereq | Source | Verification | Visual purpose |
| --- | --- | --- | --- | --- | --- | --- |
| verbs-number | Connect पठति / पठतः / पठन्ति to 1 / exactly 2 / 3+ readers; split stem + ending | 10 (8 teach + 2 retrieval) | Recognise Devanagari sounds | learnsanskrit.org core verbs + present-tense pages (CC BY 4.0), adapted into original short cards + Hindi | Manual review 12 Oct 2026: forms paṭhati/paṭhataḥ/paṭhanti are standard 3rd-person present parasmaipada of पठ्; stem split paṭha+ti/taḥ/nti follows the teaching convention and is labelled as such; sa/sā contrast standard | 3 production photos (1 / exactly 2 / group reading) with native text overlay: Devanagari large, IAST at half height inside the art frame |
| sandhi-boundary | Find the two meeting sounds + setting before choosing any rule | 9 (8 + 1) | Devanagari/IAST sounds | Sandhi pilot ch.1, after Whitney §§109–125,149 (public domain) | Manual review: rāmaḥ+asti→rāmo'sti, sītā+api→sītāpi, marut+bhiḥ→marudbhiḥ all standard; pause/internal settings correctly distinguished | Native boundary diagram (a + a · t + a · ḥ + a); no bitmap needed |
| sandhi-like-vowels | Apply savarṇa-dīrgha for a/i/u families (all 4 length combos → long) | 9 (8 + 1) | sandhi-boundary | Pilot ch.2 after Whitney §126; devālaya/ati+iva→atīva/su+uktam→sūktam standard examples | Manual review: ā+a→ā, i+i→ī, u+u→ū correct; ṛ row correctly marked rare/reference | Native formula tiles (ā+a→ā, i+i→ī, u+u→ū); anchored sītāpi analysis on cards 1–3 |
| sandhi-a-combinations | Distinguish guṇa (a+i→e, a+u→o, a+ṛ→ar) from vṛddhi (a+e→ai, a+o→au) | 9 (8 + 1) | sandhi-like-vowels | Pilot ch.3 after Whitney §127 | Manual review: devendra, maheśvara, hitopadeśaḥ, maharṣiḥ, sadaiva, jalaughaḥ all standard; direction contrast (a+i→e vs i+a→ya) correct | Native decision map card; formula tiles per family |
| sandhi-glides | Apply yaṇ: i/ī→y, u/ū→v, ṛ→r before a dissimilar vowel; keep that vowel | 9 (8 + 1) | sandhi-a-combinations | Pilot ch.4 after Whitney §129 | Manual review: ityapi, nadyatra, svāgatam, pitrādeśaḥ, ityeva standard; same-family (atīva) and consonant (nadī vahati) negatives correct | Native glide tiles (i+a→ya, u+ā→vā, ṛ+ā→rā) |
| sandhi-e-o | Distinguish internal ay/av from external elision (te+api→te'pi) and retained hiatus | 8 (7 + 1) | sandhi-glides | Pilot ch.5 after Whitney §§131–135 | Manual review: nayanti/bhavanti labelled schematic internal formations; te'pi / ta āgatāḥ / ta iha / tasyā api / tāveva patterns standard; visarga-o warning correct | Native e/o contrast tiles |
| sandhi-protected | Recognise pragṛhya dual endings, amī/particles, pluta, and prefix/augment specials | 8 (7 + 1) | sandhi-e-o | Pilot ch.6 after Whitney §§136–138 | Manual review: agnī apaśyam / bāhū udyacchati / labhete aśvān / amī atra protection correct; upārcchati / upetavya / aita augment correctly marked specialist | No bitmap; grammar-tag chips (dual, particle, prefix+root, augment) |

Card counts: 10+9+9+9+9+8+8 = 62. Every lesson: one point per card,
example + immediate reason together, observe → notice → explain → vary →
misconception → apply → retrieve → scoped summary. No "A closer look" or any
expandable/disclosure control anywhere (owner 12 Oct revision). Essential
qualifications from the pilot's notes are merged into main card bodies as
plain second sentences, never hidden.

## Drafts (NOT in the live catalogue)

Remaining pilot lessons (stops, nasals, a-visarga, visarga-more, internal,
retroflex, reading): full manuscripts retained in the prototype folder, not
yet adapted/verified to the no-disclosure card contract — each needs its
qualifications re-authored into the main path. Verse-rhythm course
(48-lesson manuscript): secondary expansion; needs re-authoring into steps,
not mechanical splitting. Beginner foundations beyond verbs-number
(Devanāgarī sounds, verb person, first sentences): outlined, not authored.
None of these ship behind any button.

## Reusable material

- Quiet-deck card layout + anchored-visual variant (stable image region while
  2–3 explanations change) from the accepted prototype direction.
- Gesture contract from the rulebook: swipe ≥55px, horizontal-dominant
  (1.5×), Back/Next buttons always, no auto-advance, no wrap, reduced-motion
  shortening, screen-reader announcements, vertical scroll never hijacked.
- Theme tokens, Button/ProgressBar, haptics, useTypeScale (18pt Sanskrit
  floor), useReducedMotion, announce, guideLang prefs, LearnV2 progress
  service modelled on grammarGuide/storyProgress.
- Licence registry already covers learnsanskrit (CC BY 4.0), vidyut-data
  (MIT), public-domain Sanskrit sources — no backend change needed.

## Gaps

- No generated Sandhi illustrations yet (by design: Codex starts only on
  owner instruction). Sandhi lessons ship with native formula diagrams,
  which the handover prefers over AI bitmaps for formulas.
- No audio: pronunciation must be learned from a competent speaker; no
  synthetic chanting shipped; unavailable audio controls hidden.
- Practice is local retrieval with immediate feedback; it does not write
  mastery/XP/reviews. Tracking limits are stated on the map and lesson end.

## Source → licence evidence (checked 12 Oct 2026)

- learnsanskrit.org guide pages carry a CC BY 4.0 footer; each adapted page
  is recorded per-card in sources.jsonl with URL + adaptation notes.
- Whitney Sanskrit Grammar (1889) ch. III via Wikisource: public-domain
  original (author d. 1894). Pilot manuscripts cite section numbers; kept.
- Vidyut repo is MIT for code; dataset terms checked per dataset — no
  dataset text is copied into Learn v2, so no additional licence row needed.
- Prototype JPGs (verb-reading-*.jpg): art candidates from the accepted
  pilot; copied verbatim into mobile/assets/learn-v2/ as production files.
  Shipped code references only repo-relative requires, never the absolute
  preview path.
