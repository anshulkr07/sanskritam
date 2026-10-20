# Story course audio (Sarvam Bulbul → R2 → the lesson pack → the app)

Owner approved the Sarvam spend on 2026-10-20 ("cost is fine, implement everything").
Labels: **run** (measured), **read** (at the source), **estimate**, **not verified**.

## What exists now

| Part | Where | State |
| --- | --- | --- |
| Which strings get a clip, what the voice reads, clip names, deliveries, mp3 length | `backend/app/curriculum/audio.py` | built, 27 tests |
| Renderer: Sarvam → mp3 → R2 → deliveries | `backend/scripts/render_story_audio.py` | built; run (see Numbers) |
| Deliveries file | `backend/app/curriculum/content/audio/deliveries.json` | written by the renderer |
| Pack: lesson `audio` (text → url) and card `audio` (urls, reading order) | `pack.py` (`story_audio.attach`) | built; only for delivered clips |
| App: speaker beside Sanskrit lines, tap-to-hear table cells, letter sounds in the mouth map | `mobile/src/story/audio.tsx`, `cards/content.tsx`, `widgets/MouthMap.tsx` | built; browser-run, not on a phone |
| App: the buffering rule (card on screen + 3 ahead + 3 behind) | `story/audioWindow.ts`, `useAudioWindow.ts`, `holdClips` in `services/speech.ts` | built; browser-run with stand-in clips, not on a phone |
| Coverage report | `python -m app.curriculum audio [--missing]` | built |
| Release check | `check --release` warns when a letter or dialogue string has no clip | built |

## How it works

- **A clip is named by what it says and how it was made:** `sha1(rules|NFC text|voice|language|pace|codec)[:16]`.
  Change a sentence and it gets a new name, so a phone never plays old audio for new words; a re-render in another
  voice or pace sits beside the first and the old files simply stop being attached.
- **What the voice reads** (`speakable`): page separators (`+ = → · /`) become a pause, suffix hyphens, ellipses and
  line breaks are dropped. Strings with Roman letters or digits, and bare vowel signs, are not rendered.
- **Which strings** (`card_sources`): story dialogue and quoted verses, teach terms, rows, steps, examples and their
  words, summary lines, reading sentences and words, revision examples, table cells, mouth-map letters. **Practice
  cards have none:** hearing an option would give the answer away.
- **Voice:** Bulbul v3, `sa-IN`, speaker `aditya`, pace 1.0, 22,050 Hz, mp3 (the constants at the top of `audio.py`).
  One voice for every character. Nobody has listened to the clips (see "Listen first").
- **Storage:** R2 bucket `sanskritam`, key `audio/learn/<hash>.mp3`, public at `https://cdn.vedicvalor.com/audio/learn/<hash>.mp3`,
  `Cache-Control: public, max-age=31536000, immutable` (run: set by `R2Storage.store`, seen on a fetched clip).
- **Order of work:** letters, dialogue, sentences, words, table cells, so a run that stops early has done the most
  useful clips. Rate: 2.1 s between requests (Starter allows 30 a minute on bulbul:v3, read at docs.sarvam.ai), a 429
  or 5xx is retried after 5, 15, 30, 60, 120 s, and a limit that outlasts them stops the run; rerun to continue.
- **In the app:** with a lesson open, each Sanskrit line that has a clip shows a small speaker; tap to play, tap again
  to stop; moving to another card stops it. In a table, a cell with a clip is tap-to-hear ("Tap a form to hear it.").
  Choosing a letter on the mouth map sounds it. The clips of the card on screen and of three cards each way are
  buffered, so a swipe never waits on the network. No clip, no button.

## Numbers

Price read at sarvam.ai/api-pricing on 2026-10-20: Bulbul v3 ₹3.00 per 1,000 characters pay-as-you-go.
Plan (run, `python -m scripts.render_story_audio`, 2026-10-20): 2,874 strings with a speaker, 29,4xx characters,
about ₹88 at the pay-as-you-go price, about 2.5 hours at the paced rate.

| Tier | Strings |
| --- | ---: |
| letter | 99 |
| dialogue | 114 |
| sentence | 829 |
| word | 691 |
| cell | 1,141 |

(Results of the run are added below when it finishes.)

## Listen first

Run on the owner's key: `sa-IN` answered 200 on 2026-10-20 but answered 400 on 2026-10-08, and the Sarvam docs
page still lists no Sanskrit (read), so treat it as a beta that can change. Bulbul is not a Sanskrit-native voice: a
lone letter may be read as its name, and Sanskrit stress and metre are not its strength. **No one has listened to the
clips.** Samples: `results/story_audio_samples/` (git-ignored) and any clip on the CDN. To change voice, speaker or
pace, edit the constants in `audio.py` and run the renderer again (about ₹88).

## Extending

- New or changed Sanskrit: run `python -m app.curriculum audio` (what is missing, what is stale), then
  `python -m scripts.render_story_audio --live` (it renders only what has no clip).
- A sample: `--tier letter --limit 20`. A different pace between requests: `--pace 3`.
- Practice-card audio, widget readouts beyond the mouth map (form explorer, sandhi mixer, word factory) and the
  per-character voices are not built.
