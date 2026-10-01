# Sanskritam October overhaul: handover

Written 2026-10-01 for the implementing agent (Muse Spark in opencode). You arrive with no context, so
this file carries all of it.

The owner tested the Play closed-testing build (versionCode 3) on an Android phone and asked for six
things: fix the Write crash, rework Talk, make Play fun, upgrade the Ask bubble, restyle Grammar and
rebuild Read. The findings below come from that phone's crash log, the installed APK and the code. File
and line references are from 2026-10-01.

**Mockups.** `specs/mockups/overhaul-2026-10.html` holds twelve phone screens (open it in a browser).
The owner has seen and approved the direction, with one correction that is already applied in the file:
colour must be deep solid fills, never pale tint panels (section 2). Where this document and the mockup
disagree, this document wins on behaviour and the mockup wins on look.

**What "verified" means here.** Each finding says how it was checked. Anything marked *not verified* is
my reading of the code or the docs and you must check it before relying on it. Do the same in your own
hand-back: the owner treats an unverified claim stated as fact as a lie.

---

## 0. Rules for this work

- **Don't commit.** The owner commits. Leave changes in the working tree and summarise them at the end.
- **Don't deploy the backend and don't run an EAS build.** The owner does both. Production was deployed
  from a local tree and its config lives in two `.env.deploy` files that have drifted apart.
- **One release.** The owner wants the bug fixes and the redesigns in one build. Set `mobile/app.json`
  `version` to 1.1.0 and `android.versionCode` to 4 as part of this work (they are 1.0.2 and 3 now).
  The app has no over-the-air updates (`expo-updates` is not installed), so nothing reaches a phone
  without that build.
- **Both directions must keep working.** The build now on phones (versionCode 3) must keep working
  against the new backend, and the new app must work against the old backend until the owner deploys.
  So every new request field is optional and every new response field is read defensively.
- **The product is called Sanskritam.** "Shabd" is the old name. It survives in the folder name, the
  `shabd.*` AsyncStorage keys, the `shabd-digital-ink` module and the `shabd-api` service. Leave those
  identifiers alone, never show "Shabd" to a user, and keep the `shabd.` prefix for new storage keys.
- **Stack.** Expo SDK 57, React Native 0.86.3, new architecture on, Reanimated 4.5.1 with
  react-native-worklets 0.10.1, gesture-handler 2.32, Skia 2.6.2. Read the versioned docs before using
  any Expo API (`mobile/AGENTS.md`): https://docs.expo.dev/versions/v57.0.0/
- **Copy rule, whole app.** No em dashes and no spaced en dashes in anything a user can read,
  including `accessibilityLabel`. No explanatory paragraphs: a screen gets a title, a section gets a
  short label, an error is one line that says what happened and what to do. Text from the server or the
  model goes through `plain()` (`mobile/src/utils/text.ts`) where it is rendered as prose. Never run
  `plain()` over scansion data, where a long dash marks a long syllable.
- **Look rule (section 2).** Deep solid colour fills with light text. No pale tint panels, no solid
  under-shadow buttons, no lists of rounded pills, no coloured left bar on a rounded card. Cream paper
  stays as the page ground. Consistent 16dp side padding. Nothing under the status bar.
- **Accessibility rules already in the code stay.** Every `Pressable` has a role and a label, targets
  are at least 44dp, colour is never the only signal, Sanskrit text is never below 18pt (`sized()` in
  `hooks/useTypeScale.tsx`), every animation has a Reduce Motion path (`hooks/useReducedMotion.ts`),
  and an "unsure" result is never shown as a mistake.
- **Never write Sanskrit from memory.** Verses, forms and festival dates come from an engine, a dataset
  or a named source. This applies to you and to every prompt you write for the model.
- **Checks that must pass before you hand back.**
  - `cd mobile && npx tsc --noEmit`
  - `cd mobile && node scripts/check-contrast.mjs`
  - `cd backend && ./.venv/Scripts/python.exe -m pytest -q` (the venv has Vidyut; the system Python
    does not, so always use the venv)
  - The on-device list in section 10. Several things here only exist on a real Android build.
- **Shell notes for this Windows machine.** `adb` is at `/h/Sdk/platform-tools`. Git Bash rewrites
  `/sdcard/...` arguments into Windows paths: prefix `MSYS_NO_PATHCONV=1`. Long heredocs fail in Git
  Bash, so write scripts to a file and run the file.

---

## 1. Release build fixes (do these first)

### 1.1 Write kills the app

**Reported.** Tapping Write closes the app.

**Evidence (verified on the phone).** `adb logcat -d -b crash` shows, three times:

```
FATAL EXCEPTION: mqt_v_native
com.facebook.react.common.JavascriptException: Error: Cannot find native module 'ShabdDigitalInk'
  requireNativeModule ... metroRequire ... getInkRecogniser ... WritingScreen
```

The APK pulled from the phone has no `libdigitalink.so` and no trace of the module in its dex files. The
APK built on this PC on 27 Sep (`mobile/android/app/build/outputs/apk/release/app-release.apk`) has both.

**Cause 1: the module's native code never reached EAS (verified).** The repo-root `.easignore` line 18
is `android/` with no leading slash, so it matches every folder named `android`, including
`mobile/modules/shabd-digital-ink/android/`. EAS CLI 24.8.0 reads only the `.easignore` at the git root
(`eas-cli/build/vcs/clients/git.js` joins it to `git rev-parse --show-toplevel`), so
`mobile/.easignore` is never used. With the Kotlin source missing, autolinking skipped the module.

**Cause 2: the fallback cannot catch it (verified).** `getInkRecogniser()`
(`mobile/src/services/inkRecogniser.ts:163`) wraps `require("shabd-digital-ink")` in try/catch. That
module calls `requireNativeModule` at load time (`mobile/modules/shabd-digital-ink/src/index.ts:35`).
Metro's `guardedLoadModule` (`node_modules/metro-runtime/src/polyfills/require.js`) reports any error
thrown while loading a module to `ErrorUtils.reportFatalError` before the caller's catch can see it. In
a release build that is fatal. So a lazy `require` in a try/catch is not a guard for a native module.

**What to do.**

1. In the repo-root `.easignore`, change `android/` to `/mobile/android/` and `ios/` to `/mobile/ios/`.
   Delete `mobile/.easignore` or leave it; it has no effect. Keep the `/results/` line that was added
   on 2026-10-01: once an `.easignore` exists EAS stops reading `.gitignore`, and `results/` now holds
   about 1 GB of 4K cover masters that must not go into the build archive.
2. Prove the archive is right before the owner spends a build:
   - `git -c core.excludesFile=.easignore check-ignore -v --no-index mobile/modules/shabd-digital-ink/android/build.gradle`
     must print nothing.
   - `cd mobile && npx eas-cli build:inspect -p android -e production -s archive -o ../.eas-inspect --force`
     then confirm `ShabdDigitalInkModule.kt` is inside `.eas-inspect`. Delete that folder afterwards.
     (The command exists in the installed CLI. I did not run it: it needs the owner's Expo login.)
3. Make a missing module harmless. In `mobile/modules/shabd-digital-ink/src/index.ts` use
   `requireOptionalNativeModule` from `expo-modules-core` (it exists in the installed version and
   returns `null` instead of throwing). Export `isAvailable = Native != null`. Each exported function
   rejects with a clear error when `Native` is null. In `getInkRecogniser()` return `localAdapter(mod)`
   only when `mod.isAvailable`, otherwise the matcher. Add a comment saying why try/catch is not enough.
4. Check the other lazy requires for the same trap: `mobile/src/services/photoRecogniser.ts:44-50`
   (already gates on `NativeModules.TextRecognition` first, which is right) and
   `mobile/src/services/push.ts:35`.
5. Upgrade the handwriting library (next section) in the same change.

### 1.2 The handwriting library is too old to ship

`mobile/modules/shabd-digital-ink/android/build.gradle:21` pins
`com.google.mlkit:digital-ink-recognition:16.1.0`, a 2021 release. Three problems, all verified:

- Its `libdigitalink.so` is aligned to 4 KB pages (I read the ELF headers in the 27 Sep APK). Every
  other native library in the current Play build is 16 KB aligned. Google Play has required 16 KB
  support for apps targeting Android 15 and later since 1 November 2025, and this app targets SDK 36.
  The current Play build passed only because the library was missing from it.
- Google's release notes list a fix in 17.0.1 for a runtime exception "when the app targets API level
  31 and runs on Android S". 16.1.0 predates that fix.
- The build resolved `com.google.mlkit:common` to 18.11.0 (pulled up by text recognition), three major
  versions past what 16.1.0 was built against.

**What to do.** Move to `com.google.mlkit:digital-ink-recognition:19.0.0` (29 August 2025, "updated
Digital Ink Recognition SDK to support 16 KB page sizes"). Follow Google's Android guide for any API
change (https://developers.google.com/ml-kit/vision/digital-ink-recognition/android) and adjust
`ShabdDigitalInkModule.kt`. Keep the `work-runtime` pin unless the dependency tree shows 2.7 or later
without it (the comment in `build.gradle` explains why it exists). Then:

- Compile it. `cd mobile && npx expo prebuild --platform android --clean`, then in `mobile/android` run
  `./gradlew :shabd-digital-ink:compileReleaseKotlin`. `mobile/android` is generated and gitignored; it
  must never be used for a Play build (it signs with the debug key).
- After a full local or EAS build, re-check alignment: every `lib/arm64-v8a/*.so` must have LOAD
  segments aligned to 0x4000.
- Nobody has ever run the handwriting model in a release build. It needs the device test in section 10.

Also make `modelFor()` and the `AsyncFunction` bodies in the Kotlin module catch `Throwable`, not
`Exception`, and reject the promise. A `NoSuchMethodError` from a library mismatch should become a
rejected promise that falls back to the matcher, not a dead app.

### 1.3 Pages will not turn forward in Read

**Reported.** "I am not able to flip the pages. The slider is working."

**Reproduced on the phone (verified).** With a book open, `adb shell input swipe 900 1500 250 1500 350`
(a left swipe) never changes the page. The reverse swipe on page 2 goes back to page 1. Next and the
slider work.

**Cause (verified in source).** `mobile/src/components/book/PageCurlBook.tsx:553` picks the direction
when the pan activates: `const d = e.translationX < 0 ? FORWARD : BACK`. On Android, gesture-handler's
`PanGestureHandler.activate()` calls `resetProgress()` first, which sets the start point to the current
point, so `translationX` is exactly 0 in `onStart`. Zero is not less than zero, so every drag is BACK.
On page 1 a BACK turn is not allowed, so nothing happens at all.

**What to do.** Decide the direction from the first real movement:

- In `onStart` only set `released`, `ignored` and a new shared value `dir = 0`.
- In `onUpdate`, when `dir.value === 0` and `Math.abs(e.translationX) >= 2`, set the direction from the
  sign and run what `onStart` does today (allowed, turning, radius, travel, lay the sheet or ask for a
  snapshot). Then continue as now.
- In `onEnd` and `onFinalize`, if `dir.value === 0` just mark released and return: no turn started.
- Search the app for any other gesture that reads `translationX` or `translationY` inside `onStart` or
  `onBegin`. I found none (`AskProvider` and `WordBank` read them in `onUpdate`, which is fine).

**Check on the phone.** The left swipe above takes page 1 to 2; the right swipe takes it back. A slow
swipe (`input swipe 950 1300 200 1300 3000`) with a `screencap` half way shows the page curling.

### 1.4 Snapshot noise from Skia (know about it, don't chase it)

Every page snapshot logs `E SkiaScreenshot: couldn't invoke dispatchOverflowDraw() on ReactViewGroup`
many times. Cause (verified): React Native 0.86.3 has no `dispatchOverflowDraw` method, and Skia 2.6.2,
the version Expo SDK 57 pins, still looks it up by reflection. Children are still drawn; only overflow
clipping is skipped in the snapshot. It is not caused by the code shrinker, so a ProGuard keep rule
does nothing. Do not upgrade Skia past the SDK pin for this. Do check by eye that a curling page looks
like the page it came from (no content spilling past the page edge).

### 1.5 One thing to watch

On the grammar topic screen, Android back once needed two presses to leave (seen once, after scrolling,
not reproduced). Test it. If it repeats, find what consumes the first press.

---

## 2. Colour: deep fills, not tints

**Owner's words on the first mockups:** "The background color looks a bit ai generated." That was about
the pale panels and tiles (peach, mint, pale teal, lavender, pale yellow on cream). The shelf with deep
solid covers and the dark reading page were called "great". This reverses part of the September
handover, which introduced the pale `accent.*.bg` tiles.

**Rule for every screen this handover touches.** A coloured surface is a deep solid fill with cream
text on it. Never use `accent.*.bg`, `color.saffronLight`, `color.tutorBg`, `color.learnerBg`,
`color.okBg`, `color.unsureBg`, `color.warnBg` or `color.surfaceMuted` as the background of a card,
panel, bubble, tile, chip or button. Plain content sits directly on the cream page with type hierarchy
and hairlines, not in a white rounded box. Screens outside this handover keep their current look.

Add to `mobile/src/theme.ts`:

```ts
/** Deep solid fills. Text on them is onFill.text. */
export const fill = {
  saffron: "#B23D10", teal: "#17535C", sage: "#35603C", rose: "#962F4E",
  gold: "#8A5608", slate: "#2F4677", ink: "#3B2E25", maroon: "#5E2216",
  ok: "#25833E", bad: "#B3261E",
} as const;
export type FillName = keyof typeof fill;
export const FILL_CYCLE: FillName[] = ["saffron", "teal", "sage", "rose", "gold", "slate"];
export const fillAt = (i: number): FillName => FILL_CYCLE[((i % 6) + 6) % 6];
export const onFill = {
  text: "#FFF8EE",
  soft: "rgba(255,248,238,0.78)",
  faint: "rgba(255,248,238,0.20)", // watermark letters, progress tracks
  gold: "#F2C879",                 // small labels; see the table for where it is allowed
} as const;
/** 1.5dp outline for inputs and outlined round buttons on paper. */
export const outline = "#D9C9AE";
```

Also add `color.tutorText = "#3F627F"`. The current `color.tutor` (#5A7D9A) is 4.12:1 on paper, below
AA for body text; `#3F627F` is 6.1:1.

Contrast I measured (WCAG ratio):

| Fill | Cream text `#FFF8EE` | Gold label `#F2C879` |
|---|---|---|
| saffron `#B23D10` | 5.58 | 3.73, do not use |
| teal `#17535C` | 8.20 | 5.48 |
| sage `#35603C` | 6.89 | 4.61 |
| rose `#962F4E` | 7.08 | 4.73 |
| gold `#8A5608` | 5.83 | 3.90, do not use |
| slate `#2F4677` | 8.80 | 5.88 |
| ink `#3B2E25` | 12.42 | 8.30 |
| maroon `#5E2216` | 11.60 | 7.76 |
| ok `#25833E` | 4.53 | 3.03, do not use |

So small labels on saffron, gold and ok fills are cream, not gold. Add these pairs to
`mobile/scripts/check-contrast.mjs` so the script guards them.

**Buttons.** Primary: solid `color.saffronBtn` with white text (4.53:1), as now. Secondary: transparent
with a 1.5dp `color.ink` outline and ink icon or text. Round icon buttons are 40dp. Selected state of a
secondary: solid `fill.ink` with cream.

---

## 3. Talk

File: `mobile/src/screens/Conversation.tsx` (955 lines). Server: `backend/app/routers/speech.py`,
`backend/app/services/learner_stt.py`, `backend/app/services/tutor.py`,
`backend/app/routers/conversation.py`. Mockup: the two Talk phones.

### 3.1 Show a mixed sentence the way it was said

**Asked.** "When I speak a mix of language, I want that mix to show. Namaste in Devanagari, aaj ka in
Hindi, temperature is how much in English, nivu heli in Kannada. Not convert the whole sentence to one
language and send."

**How it works today.** For a voice turn the app calls `POST /speech/stt` with
`language_code=unknown`. `transcribe_learner()` runs two Saaras calls at once (auto-detect and pinned
`sa-IN`) and `pick_transcript()` keeps one whole transcript. The docstring records the measurements
behind that design; read it before touching it. The result is one script for the whole sentence.

**What Sarvam documents (read 2026-10-01).** The speech-to-text `mode` parameter has a `codemix` value:
"Code-mixed text with English words in English and Indic words in native script", example
`मेरा phone number है 9840950950`. The docs list the modes under saaras:v3 and name saaras:v4 as the
default model. The same page says that when several languages are detected the response returns the
code of "the most predominant" one. So Hindi plus English is documented. Two Indian languages in one
sentence is not.

**Not verified:** whether `codemix` works on saaras:v4 (our model), and what it writes for a sentence
that mixes Hindi and Kannada. Measure first, then build.

**Step A: measure.** Write `backend/scripts/bench_codemix.py`, modelled on `scripts/bench_asr.py`. For
each audio file in `backend/tests/fixtures/codemix/` it calls Saaras with (`unknown`, `transcribe`),
(`unknown`, `codemix`), (`sa-IN`, `transcribe`) on saaras:v4 and (`unknown`, `codemix`) on saaras:v3,
and prints the four transcripts and detected languages per file. The owner will record these lines on
the phone (ask for them; if they are not in the folder, voice lines 1, 2 and 5 with Bulbul as stand-ins
and say so in the hand-back):

1. `नमस्ते, आज का temperature कितना है?` (Hindi and English)
2. `मम नाम अंशुलः, and I live in Bengaluru.` (Sanskrit and English)
3. `ನನಗೆ ಸಂಸ್ಕೃತ ಕಲಿಯಬೇಕು, please help me.` (Kannada and English)
4. `आज का weather अच्छा है, ನೀವು ಹೇಳಿ.` (Hindi, English and Kannada)
5. `अहं गच्छामि, but कल नहीं.` (Sanskrit, English and Hindi)
6. One pure Sanskrit line and one pure Hindi line, as controls.

Write the results into the `learner_stt.py` docstring the way the existing measurements are recorded.

**Step B: build what the measurements support.**

- Add a third concurrent pass (`unknown`, `codemix`) in `transcribe_learner()`. Return a new field
  `display` next to `transcript`. `transcript` keeps its current meaning and still feeds the tutor.
  `display` is the codemix transcript when the auto pass won and the codemix pass returned text;
  otherwise it equals `transcript`. If the codemix pass fails, log it and fall back. A failed extra pass
  must never fail the request.
- If the controls show `codemix` is as faithful as `transcribe` for single-language speech, you may
  feed the tutor the codemix text as well. If not, keep them separate. Record which you chose and why.
- `STTResponse` (`backend/app/schemas.py:532`) gains `display: str = ""`. Old apps ignore it.
- Cost: one more STT call per voice turn, about ₹0.04 for five seconds at ₹30 an hour. Meter it the
  same way the second pass is metered today (it is not: quota is charged once per request, keep that).

**Step C: words from a second Indian language.** If line 4 comes back with the Kannada words in
Devanagari (likely, since only one language is labelled), let the tutor model re-script them:

- Add two keys to the tutor's JSON output in `_SYSTEM_PROMPT` (`backend/app/services/tutor.py:518`):
  `"heard"`: the learner's latest line copied word for word, changing only the script, each word in the
  script of the language it belongs to (Hindi and Sanskrit in Devanagari, Kannada in Kannada script,
  Tamil in Tamil script, English in Latin letters), no word translated, corrected, added or dropped,
  empty when unsure. `"heard_langs"`: the languages used, in order of first appearance, as English
  names.
- Do not trust it blindly. Add `faithful(heard, transcript)`: transliterate every script run of both
  strings to one Latin skeleton with `vidyut.lipi` (already used in `services/iast.py`), lowercase,
  drop punctuation and vowel length, and accept only if the word count differs by at most one and
  `difflib.SequenceMatcher` ratio is at least 0.80. Otherwise send `heard` as an empty string.
- Only voice turns use it (the turn request carries `stt_lang` for those). A typed line is always shown
  exactly as typed.
- `TalkOut` in `routers/conversation.py` (line 108) gains `heard: str = ""` and
  `heard_langs: list[str] = []`, and `TalkTurn` in `mobile/src/api/client.ts` gains the same two as
  optional fields.
- The tutor prompt is tuned and measured. Before you touch it, run `tests/test_tutor.py` and the live
  regression suite `./.venv/Scripts/python.exe -m app.evals.talk` and keep the output. Run both again
  after. The suite calls Sarvam, so it needs the key in `backend/.env` and costs a few rupees. If any
  invariant that passed before now fails, take the two keys out and ship steps A and B only.

**App side.** `api.stt()` returns `display`. The learner bubble shows `display || transcript`
immediately. When the turn comes back with a non-empty `talk.heard`, replace the bubble text with it.
Under the text show `heard_langs` joined with " · " when there are two or more. The text sent to
`conversationTurn()` stays `transcript`.

### 3.2 The reply, less cluttered, nothing removed

**Asked.** "There is a sanskrit reply, then roman sanskrit, then translation, then why and say it like
this. This looks a bit cluttered. Can we improve that without removing much?"

Rebuild `TutorTurn` (`Conversation.tsx:102-210`) in this order:

1. **Sanskrit reply.** `sanskritText(24)` in `color.ink`, with a 36dp outlined round button on its right
   that replays it (`speakAgain(talk.reply_devanagari, "sa")`). The line itself stays pressable.
2. **Roman.** 13pt italic, `color.inkSoft`, directly under.
3. **The reply in the learner's language.** 16pt in `color.tutorText`, tap to hear, as now.
4. **Two small tabs on one row**, only when they have content:
   - "Say it like this" when `fix.needed && fix.devanagari`. Solid `fill.saffron`, cream text.
   - "Why" when `explain_en` or `read_back` exists. Solid `fill.teal`, cream text.
   Each tab is 32dp high with 8dp radius, 12pt extra-bold label and a chevron that flips. They are
   toggles (`accessibilityState={{ expanded }}`), not a list of pills.
5. **Panels under the tabs.** "Say it like this" starts open, because a correction should be seen.
   "Why" starts closed. A panel is a solid fill in its tab's colour with 12dp radius and 12dp padding:
   - Correction: small cream label, `fix.devanagari` in `sanskritText(20)` cream (tap to hear),
     `fix.roman` in `onFill.soft`, `fix.note_en` in cream 13pt.
   - Why: `read_back` in `onFill.soft` 12pt, then `explain_en` in cream 14pt, line height 21.
   Use `FadeIn.duration(120)` for the reveal and nothing under Reduce Motion.

`read_back` moves from above the turn into the Why panel. Everything else is kept.

Restyle the rest of the thread the same way: the learner bubble is solid `fill.ink` with cream text,
14dp radius with a 4dp bottom-right corner and no shadow. `aside` becomes plain `inkSoft` text with no
box and no left bar. The error line is an icon and `badText` on the page. The listening banner is a
solid `fill.ink` strip with 8dp radius. The done card is solid `fill.sage` with cream text.

### 3.3 Input bar

**Asked.** "The speaker can be removed from input panel and the input panel height can be decreased."

In the `inputBar` block (`Conversation.tsx:645-711`, styles from line 900):

- Remove the replay `Pressable`. Replay now lives on the reply (3.2).
- Bar: `paddingVertical: 8`, `paddingHorizontal: 12`, `alignItems: "center"`, `gap: 8`.
- Mic: 40dp round, 1.5dp ink outline, ink icon. While recording: solid `fill.bad`, white stop icon,
  the existing pulse.
- Text field: `minHeight: 40`, `maxHeight: 96`, `paddingVertical: 8`, 1.5dp `outline` border, 12dp
  radius, white fill. Placeholder "Say or type". The old placeholder wrapped to two lines at 360dp,
  which is most of why the bar looked tall.
- Send: 40dp round, solid `color.saffronBtn`, white icon.

The bar goes from about 105dp to about 57dp at rest. Measure both with a screenshot and report them.

### 3.4 What stays

The guru keeps his size. The owner said no to shrinking him. `HEADER_H = 172` and the keyboard fold
stay as they are.

### 3.5 Report a reply

Google Play's AI-Generated Content policy says apps that generate content with AI "must contain in-app
user reporting or flagging features that allow users to report or flag offensive content to developers
without needing to exit the app", and it names chatbots where the chatbot is a central feature (read
2026-10-01). The app has no such control today. Add a small flag icon button at the right end of the
tab row (32dp, `inkFaint`, label "Report this reply"). Tapping it swaps the row for one line "Report
this reply?" with Report and Cancel. Report calls `POST /feedback/report` (section 8) and shows
"Reported" for two seconds. The same control goes on Ask answers (section 4.7).

---

## 4. Ask

Files: `mobile/src/ask/AskProvider.tsx`, `mobile/src/components/AskSheet.tsx`,
`backend/app/routers/explain.py`, `backend/app/services/explainer.py`. Mockup: the two Ask phones.

### 4.1 No bounce

**Asked.** "Clicking on ask bubble is bringing the ask section in juggling animation way which is bad."

`AskSheet.tsx:164` enters with `SlideInDown.springify().damping(22)`. Replace it with
`SlideInDown.duration(180).easing(Easing.out(Easing.cubic))`, exit `SlideOutDown.duration(140)`, and no
animation at all under Reduce Motion.

### 4.2 A mic

Pull the recorder preset and the record, stop and transcribe logic out of `Conversation.tsx` into
`mobile/src/hooks/useVoiceInput.ts`, returning `{ recording, busy, toggle }` and calling back with
`{ transcript, display, language_code }`. Talk and Ask both use it. In Ask the result goes into the
question box (`display || transcript`) so the user can read it and press send. Keep the existing error
lines for a recording over 30 seconds (413), the voice limit (429) and a denied mic.

### 4.3 "This screen"

**Asked.** "It should have an option to screenshot what is currently on screen." The owner agreed that
reading the text on the phone is enough, so no image is uploaded.

- Install the capture library: `npx expo install react-native-view-shot` (SDK 57 pins 5.1.0).
- In `AskProvider`, wrap `{children}` in `<View ref={contentRef} collapsable={false} style={{flex:1}}>`.
  Capturing that ref leaves the bubble and the sheet out of the picture, so the capture can run when
  the user taps the button, with the sheet already open.
- The sheet's input row gets a round "This screen" button (scan icon, label "Attach this screen") to
  the left of the mic. On tap:
  1. `captureRef(contentRef, { format: "jpg", quality: 0.6, result: "tmpfile" })`.
  2. Text: start with what the screen registered through `useAskContext(surface, subject)`. Then run
     the on-device reader on the image (`getPhotoRecogniser().recognise(uri)`,
     `services/photoRecogniser.ts`, ML Kit with the Devanagari script) and append what it reads. Trim to
     1500 characters.
  3. Show an attachment row above the question: a 34x46 thumbnail, "This screen", the screen's name and
     a remove button. If there is no text at all, show "Nothing to read on this screen" for two seconds
     and attach nothing.
  4. Delete the temp file when the sheet closes or the attachment is removed.
- Send the text as the new optional `screen_text` field (4.4). The image never leaves the phone.
- **Not verified:** that the ML Kit text reader works in the release build. It is a legacy native
  module reached through the new architecture's interop layer and has only ever been a fallback. Test
  it on the phone. If it is unreachable, ship with the registered context only.
- With a screen attached, the suggestions are "What does this mean?", "Explain the grammar", "Give me
  one more example". Without one: "How do I say hello?", "What is today's tithi?", "What is sandhi?".
  Suggestions are plain rows with a hairline and a chevron, not chips.

### 4.4 Wider questions, answered in a shape

**Asked.** "It should be connected to an LLM maybe of Sarvam to answer other things and present in a
good way. For example, when is pitra paksh and how to follow it, or what is the tithi today, or what is
the ayurvedic remedy for cold."

**Today.** Ask already calls Sarvam's `sarvam-105b-conversations` (`settings.explain_provider`). But
`_GENERAL_PROMPT` (`explainer.py:83-100`) says to refuse anything that is not about Sanskrit and to
answer in at most 60 words of plain prose, and `explain_max_tokens` is 220.

**Request (`AskRequest` in `routers/explain.py`), all new fields optional:**

```
screen_text: str = ""            # text read from the screen, at most 2000 characters
place: {lat: float, lon: float, tz: str, label: str} | None
cards: bool = False              # the app can render a card
```

**Response (`AskResponse`) gains `card: dict | None = None`:**

```json
{
  "title": "Pitru Paksha",
  "title_sa": "पितृपक्षः",
  "title_iast": "pitṛpakṣaḥ",
  "when": {"text": "27 Sep to 10 Oct 2026", "note": "For Bengaluru"},
  "summary": "Sixteen lunar days for remembering your ancestors.",
  "sections": [
    {"heading": "How to observe", "style": "steps", "items": ["...", "..."]}
  ],
  "terms": [{"sa": "तर्पणम्", "iast": "tarpaṇam", "meaning": "water offering"}],
  "caution": "",
  "place_needed": false
}
```

`explanation` is always filled as well, with the card flattened to text, so the old app, the cache and
any future read-aloud have something to use.

**Routing.** The engine-first path for a Sanskrit subject stays exactly as it is. The new path is taken
when `cards` is true and either there is no subject or `screen_text` is present.

**The new prompt (`_WIDE_PROMPT`).** One JSON object, no markdown. It must say, in substance:

- You may answer about: the Sanskrit language; Sanskrit texts and their ideas; Hindu festivals, vratas
  and rituals and what they mean; the panchang, using only the FACTS given; Ayurveda and yoga as
  traditional practice; stories, epics and deities.
- Anything else gets one sentence saying what you can help with: news and politics, comparing or
  judging religions, predictions about a person's future, medical diagnosis or prescription, legal or
  money advice, coding.
- Never state a date, a tithi or a time that is not in FACTS. If the question needs one and FACTS has
  none, say you cannot calculate that yet.
- Health: general traditional home practice only. No doses. Nothing for infants or pregnancy. Never
  say something cures a disease. Always fill `caution` with one line on when to see a doctor.
- Sanskrit terms: only well-known single words or short standard phrases, in Devanagari. Never compose
  a Sanskrit sentence. Do not transliterate: the server adds the roman.
- Shape: title of at most 6 words; summary of one sentence; at most 3 sections; at most 5 items each,
  one short sentence per item; at most 4 terms. No em dashes.
- Answer in the language named in the final line (keep using `reply_language()`).

**Server-side handling.** Add `ask_card_max_tokens: int = 700` to `config.py`. Parse leniently, the
way `tutor.py` parses its JSON. Then enforce: strip markup and dashes with the existing helpers, clip
the lengths above, drop any term whose `sa` is not pure Devanagari, fill `iast` with `to_iast()`, and
set `when` yourself from the calculated facts. The model never writes `when`. If parsing fails, fall
back to the prose path and return `card: null`.

**Cache.** Today's key is `(surface, subject, normalised question)`. For an answer that used
calculated facts, add the learner-local date and the place rounded to one decimal, or a tithi answer
would be replayed tomorrow.

**Quota.** One `llm_calls` unit per answer, as now.

**App.** When `data.card` exists, render it as in the mockup: title with `title_sa` beside it; the
`when` strip in solid `fill.gold` with cream text and the note at the right; the summary; each section
as a small uppercase label and a numbered or dotted list; terms as rows (Devanagari, roman, meaning);
`caution` as one line with an alert icon in `badText`; then the report flag and "Ask something else".
No white rounded box around the whole answer. When `card.place_needed` is true show one row under the
`when` strip, "Set your place", which opens the place chooser (4.6) and re-sends the question.

### 4.5 Tithi and festival dates are calculated, never recalled

A model asked for a tithi or a festival date will invent one. The server calculates and hands the
result to the model as FACTS.

**Library.** `astronomy-engine` from PyPI (2.1.19 on 2026-10-01). MIT licence, no dependencies,
accuracy within one arcminute of NOVAS according to its README. Add it to `backend/requirements.txt`
and to the licences registry (`backend/app/seeds/licences.py`). Do not use Swiss Ephemeris or anything
built on `pyswisseph`: it is AGPL or commercial.

**New module `backend/app/services/panchang.py`.** Pure functions, no network, no database.

- Sunrise, sunset and moonrise for a place and local date (`SearchRiseSet`).
- Tithi: the Moon's elongation from the Sun divided by 12 degrees (`MoonPhase` gives the elongation).
  Index 0 to 29: 1 to 15 are Shukla, ending in Purnima; 16 to 30 are Krishna, ending in Amavasya. The
  end time is when the elongation reaches the next multiple of 12 (`SearchMoonPhase`). The day's tithi
  is the one current at local sunrise; also report the next one and the time it starts.
- Nakshatra (Moon's sidereal longitude in 27 parts), yoga (Sun plus Moon sidereal longitude in 27
  parts), karana (half tithis), weekday. Sidereal means tropical minus the Lahiri ayanamsa, about
  24.2 degrees in late 2026. Take the ayanamsa formula from a named source and cite it in the code.
  The fixture below will tell you if it is wrong.
- Lunar month, both conventions. Amanta: find the new moon that began the month and take the Sun's
  sidereal sign at that moment; Sun in Mina gives Chaitra, Mesha gives Vaishakha, and so on. If the
  next new moon has the Sun in the same sign, the month is an adhika month. Purnimanta: the Krishna
  half belongs to the following month's name.
- `day(date_local, place) -> dict` with all of the above as plain words and local clock times.
- `festival(name_or_alias, year, place) -> date or date range`, from a rule table.

**Fixture for `day()` (Drik Panchang, New Delhi, 1 October 2026, read 2026-10-01).** Sunrise 06:14,
sunset 18:07. Krishna Panchami until 12:35, then Shashthi. Nakshatra Rohini until 04:27 on 2 October.
Yoga Siddhi until 21:18. Karana Taitila until 12:35, then Garaja until 23:24. Thursday. Amanta month
Bhadrapada, Purnimanta month Ashwina. Vikram Samvat 2083, Shaka 1948. New Delhi is 28.6139 N,
77.2090 E, Asia/Kolkata. Accept two minutes of difference on sunrise, sunset and the tithi end, and
three on nakshatra, yoga and karana.

**Festival rules.** Each festival is a row: names and aliases (English, Hindi, common roman
spellings), the amanta month, the paksha, the tithi, and the part of the day in which that tithi has to
be current. The parts of the day are: sunrise; forenoon; midday (the middle fifth of the daytime);
afternoon (the fourth fifth); pradosh (the first 2 hours 24 minutes after sunset); midnight; moonrise.
Appendix B has the starting rules and the dates they must reproduce. These rules are the usual ones but
I have not run them. **Ship only the festivals whose rule reproduces both the 2026 and the 2027 date in
appendix B for New Delhi.** For one that fails, read how Drik Panchang decides that festival, fix the
rule, and test again. Never hardcode a date to make a test pass. A festival that still fails is left
out, and Ask answers that it cannot calculate that one yet.

**FACTS.** Before the model call, look for a calendar question: words like tithi, panchang, nakshatra,
today, aaj, आज, when is, kab hai, कब, or any festival alias. If found, compute `day()` for today and the
festival's next occurrence, and add a block to the user message:

```
FACTS (calculated for <label>; use exactly as given, never change or add to them):
- Today, 1 Oct 2026: Krishna Panchami until 12:35, then Shashthi. Month Ashwina (Purnimanta).
- Pitru Paksha: 27 Sep to 10 Oct 2026.
```

Set `card.when` from the same facts. With no `place` in the request, calculate for New Delhi, say so
in `when.note` ("For New Delhi") and set `place_needed: true`.

**Tests.** `tests/test_panchang.py` for the fixture and for every shipped festival in both years.
`tests/test_ask_cards.py` with a fake provider: the card is parsed and clipped, the dates come from
FACTS, a refusal stays one line, a broken JSON falls back to prose, and the cache key changes with the
date.

### 4.6 Place

**Owner's decision.** "Get the user's location. If they deny, let the user manually choose, maybe in
the hamburger."

- `npx expo install expo-location` (SDK 57 pins ~57.0.14). In `app.json` add the plugin with
  `locationWhenInUsePermission` set to "Sanskritam uses your place to work out today's tithi and
  festival dates". The library adds both `ACCESS_COARSE_LOCATION` and `ACCESS_FINE_LOCATION`: add
  `android.permission.ACCESS_FINE_LOCATION` to `android.blockedPermissions` so only approximate
  location is ever requested. No background location.
- `mobile/src/services/place.ts`: `getPlace()`, `setPlace()`, `useDevicePlace()`. Stored under
  `shabd.place` as `{ lat, lon, tz, label, source: "device" | "city" }`. `useDevicePlace()` calls
  `requestForegroundPermissionsAsync()`, then `getLastKnownPositionAsync()` and, if that is null,
  `getCurrentPositionAsync({ accuracy: Accuracy.Lowest })`. Round latitude and longitude to one decimal
  (about 11 km) before storing. The label is the nearest city in the bundled list. Do not call
  `reverseGeocodeAsync`.
- `mobile/src/data/cities.ts`: about 80 entries, `{ name, lat, lon, tz }`. Indian state capitals and
  large cities, plus the cities where the diaspora is large (London, New York, the Bay Area, Toronto,
  Dubai, Singapore, Sydney and so on). Take coordinates from a named public source and cite it.
- Ask for the permission only when it is needed: the first time an answer comes back with
  `place_needed`, the "Set your place" row opens a chooser with two rows, "Use my location" and "Choose
  a city" (a searchable list). After a choice, re-send the question.
- Settings (`mobile/src/screens/Settings.tsx`, reached from the drawer) gets a row "Place" showing the
  current label or "Not set", opening the same chooser. That is the manual route the owner asked for.
- The place goes to the server in the POST body only, never in a URL, and only with Ask requests. The
  server uses it for the calculation and does not store or log it.

### 4.7 Report an answer

Same control and endpoint as 3.5, on every Ask answer.

---

## 5. Play

**Asked.** "The play section needs some good games which hook the user. Currently those are very
basic." Then: "Implement all games and improve the current ones."

**Today (verified in code).** `mobile/src/screens/Play.tsx` shows seven tiles. None has a score, a
clock, a level or a best. "Paradigms" navigates to the Grammar tab. "Sandhi" opens a lesson. The engine
can already produce and grade unlimited exercises (`POST /exercises/generate` and `/exercises/grade`,
`backend/app/services/exercise_gen.py`, with `api.generateExercise` and `api.gradeExercise` already in
the client), and nothing in Play uses it.

Mockup: the three Play phones.

### 5.1 The hub

- Title "Play" with the daily-challenge streak at the right (flame icon and "4 days").
- **Today's challenge.** One solid `fill.teal` block: small label, the game's name, the goal in one
  line, a round play button. Done state: solid `fill.sage`, a check, "Done for today".
- **Games.** Two-column grid of solid tiles, one fill each: Shabda Rush (saffron), Smriti (rose), Varna
  Jaal (slate), Daily word (gold). Each shows its name, its Sanskrit name, one stat line, and a large
  faint Devanagari letter as the only decoration.
- **Practice.** Plain rows with a hairline: a 26dp solid square, the name, a stat at the right. Word
  order, Sandhi, Paradigms, Words, Piṅgala, Challenges.
- Bottom padding 120dp so the Ask bubble never covers the last row.

### 5.2 Shared game layer

New folder `mobile/src/games/`:

- `GameShell.tsx`: top row with close, a progress or time bar and a number; a score and combo row.
- `ResultSheet.tsx`: score, best, "New best" when it is one, points earned, "Play again" and "Done".
- `bests.ts`: AsyncStorage `shabd.games.best`, `{ [game:mode]: { value, at } }`.
- `api.ts`: `gamesDeck()`, `gamesDaily()`, `gamesResult()`, `varnaJaal()`.

New root-stack routes, all `headerShown: false`, all added to `HIDDEN_ROUTES` in `AskProvider.tsx`:
`ShabdaRush`, `Smriti`, `VarnaJaal`, `PracticeRound`. Register them in `App.tsx` and
`navigation/types.ts`.

Rules for every game: haptics through `services/haptics`, sounds through `services/sfx`, no red flash
for a miss beyond the solid `fill.bad` state of the tapped tile, and a Reduce Motion path. A learner
who needs more time is not failing: every timed game has a no-clock mode with its own best.

### 5.3 Shabda Rush (शब्द-वेगः), word and meaning against the clock

- Start card: "Play, 60 seconds" (primary) and "No clock, 15 words" (secondary).
- A Sanskrit word in large type with its roman under it, four meanings below. From a score of 100 the
  direction alternates: a meaning on top, four Sanskrit words below.
- Correct: `10 x multiplier`, where the multiplier is `1 + floor(streak / 3)`, capped at 5. The tapped
  tile turns solid `fill.ok`, a "+30" rises, next question after 350 ms.
- Wrong: no points, streak to zero, the tapped tile turns solid `fill.bad`, the right one turns solid
  `fill.ok`, next question after 900 ms. Never negative points.
- Distractors come from the same deck, never two options with the same meaning, never the answer's own
  meaning under another spelling.
- Ends at 0:00 or after 15 words in no-clock mode. Then the result sheet.
- Deck: `GET /games/deck?game=rush&topic=<slug>` (5.7).

### 5.4 Smriti (स्मृतिः), memory pairs

- Start card: a set (Letters, Words) and a size (12, 16 or 20 cards).
- Letters pair a Devanagari letter with its roman form. Words pair a Sanskrit word with its meaning.
  Tapping a letter card plays the letter through the existing `playLetter()`.
- Two cards face up at a time. A match stays up as a solid fill. A miss turns back after 700 ms.
- Score is the number of moves; fewer is better. Best is kept per set and size. No clock.

### 5.5 Varna Jaal (वर्ण-जालम्), the letter net

- One 4x4 board of akṣaras per learner-local day, built by the server (5.7).
- Under the board, one clue per hidden word: its meaning. Drag across neighbouring cells (eight
  directions, no cell twice) to spell the word for a clue.
- On release: if the path spells a hidden word, the clue turns into a solid `fill.slate` chip showing
  the Sanskrit word, with a haptic. Otherwise the path shakes once and clears.
- The bar shows words found out of the total. Time counts up and is shown, with nothing to beat.
- Finding every word completes the day. The tile on the hub shows "5 of 8 today".
- The drag is one `Gesture.Pan()` on the board. Convert the touch point to a cell from the board's
  measured layout. Use `runOnJS(true)` like `WritingCanvas.tsx`, or keep the path in shared values.
  Do not read `translationX` at the start of the gesture (section 1.3).

### 5.6 The current modes, improved

`PracticeRound` is one screen for all four engine-backed drills. Params: `{ kind, title }`.

- Eight items per round. Each comes from `api.generateExercise(kind, params, seed)`, with params and
  seed taken from the pool the server sends (5.7). Wrap the item as
  `{ rank, kind, payload: item, abstained }` and render it with the existing `StepRenderer`
  (`mobile/src/components/steps/`). Grade with `api.gradeExercise`. Show the verdict with the existing
  `VerdictSheet` vocabulary, as `Lesson.tsx` does.
- 10 points for correct, 5 for one step off, nothing for incorrect. An abstained item or an "unsure"
  verdict is skipped and replaced: it is never counted against the learner.
- No clock. The result sheet shows the score out of 80 and the best.

| Row | Becomes |
|---|---|
| Word order | `PracticeRound` with `reorder`. The old sandbox stays reachable from Grammar tools. |
| Sandhi | `PracticeRound` mixing `sandhi_join` and `sandhi_split`, instead of opening a lesson. |
| Paradigms | `PracticeRound` mixing `grid_fill` and `contrast`, instead of jumping to Grammar. |
| Piṅgala | `PracticeRound` with `scan_metre`. The start card links "How it works" to the old screen. |
| Words | `Vocab.tsx` gets a "Play these" button that opens Shabda Rush with that topic. |
| Challenges | Unchanged. Its row shows today's count from `/progress/daily`. |
| Daily word | After the game ends, a "Share" button sends the result as text through React Native's `Share`: the date, the number of tries and the grid as tile symbols, never the answer. |

### 5.7 Server

New router `backend/app/routers/games.py`, service `backend/app/services/games.py`.

- `GET /games/deck?game=rush|smriti&set=letters|words&topic=<slug>`. Word and meaning pairs from
  `vocab_words` (87 rows in the seed, so also add the words in `shlokas.word_breakdown` that have a
  meaning, with duplicates removed and anything longer than six akṣaras dropped). Letters come from the
  varṇamālā data. Each item: `{ sa, iast, meaning, topic }`. At least 40 items or the game is not
  offered.
- `GET /games/varna-jaal`. Deterministic for the learner-local date (`services/localtime.py`). Pick 6
  to 8 words of 2 to 4 akṣaras (split with `aksharas()` from `services/daily_word.py`). Place each as a
  path of neighbouring cells, re-using a cell where the akṣara matches, with backtracking. Fill the
  rest with common akṣaras. Seed a `random.Random` with the date; if placement fails, try the next
  seed. Returns `{ date, size: 4, cells: [16 strings], words: [{ aksharas, sa, iast, meaning }] }`.
  The app checks paths locally.
- `GET /games/pools?kind=...` returns the params lists for `PracticeRound`. Put them in
  `backend/app/seeds/game_pools.py`. The generator's defaults are tiny (three sentences, four joins,
  two verses, four stems), so build real pools: joins from the grammar guide's `formula` blocks that
  are marked `checked`; verse lines from the first line of each reader verse; stems and sentences from
  lesson and guide examples. A test must generate every pool entry and round-trip it through
  `correct_answer()` and `grade()`. Drop any entry the engine abstains on. The engine has wrong outputs
  that a round trip will not catch, because it agrees with itself (measured 2026-09-15): feminine ā and
  ī stems decline wrongly unless the stem type comes from `prakriya.auto_stem_type`; इदम्, त्रि, वारि,
  भवत् and agent nouns like दातृ give wrong forms; there is no compound support; the sandhi splitter
  returns a final visarga as स् or र्. So keep stems to plain masculine and neuter a-stems and
  ā-stems that go through `auto_stem_type`, and take joins only from guide blocks marked `checked`.
- `GET /games/daily` returns `{ date, game, goal: { type, value, label }, done, streak }`. The game
  rotates by weekday. Goals: Shabda Rush "Score 300", Smriti "16 cards in 14 moves", Varna Jaal "Find
  every word", a Sandhi round "60 of 80". The streak counts consecutive learner-local days with the
  goal met, computed like `_solved_streak` in `services/daily_word.py`.
- `POST /games/result` with `{ game, mode, score, moves, duration_ms, daily, found }`. Stores a row,
  awards points through `record_activity()` and returns `{ xp, best, is_best, daily_done, streak }`.
  Points: Shabda Rush `min(30, score // 20)`; Smriti `10 + pairs`; Varna Jaal 5 per newly found word;
  a practice round 3 per correct item. At most 30 per result and 60 per day from games, so games
  cannot fill the daily goal on their own.
- Table `game_results`: `id, learner_id, date (learner-local), game, mode, score, moves, duration_ms,
  daily, goal_met, created_at`, indexed on `(learner_id, date)`. Add the model to `app/models.py` and an
  Alembic migration in `backend/migrations/versions/`. Account deletion must delete these rows: follow
  how the existing per-learner tables are handled in `routers/me.py`.
- No vendor calls anywhere in games, so no quota.
- Tests: deck shape and minimum size; the board is the same for the same date and different for the
  next; every word in a board is actually traceable in its cells; the daily streak; the point caps.

---

## 6. Grammar

**Asked.** "Good content but needs an overhaul in UI. It is currently just list and texts and boxes and
the content inside is also not properly laid out. Use more colors and improve the UI and UX so that the
user is happy to read."

Files: `mobile/src/screens/Grammar.tsx`, `mobile/src/screens/GrammarTopic.tsx`,
`mobile/src/components/grammar/*`. Content: `GET /grammar/guide`, 18 chapters, 105 topics, block kinds
`text, analogy, callout, steps, examples, wild, formula, table`. Do not change the content or its data
shape. Mockup: the three Grammar phones.

**Bugs seen on the phone (verified with screenshots).**

1. Tables run off the right edge. Cells are a fixed 128dp wide (`BlockRenderer.tsx:362-370`) inside a
   horizontal scroll with nothing to show it scrolls. "The eight cases of राम" has four columns and the
   phone shows two and a half.
2. Highlighted endings draw a dotted circle: "राम◌ः", "राम◌ाय". `BlockRenderer.tsx:137-147` puts the
   ending in a nested `<Text>`, and the data splits before a vowel sign (`split: ["राम", "ः"]`).
   Android shapes each styled run on its own, so a run that starts with a combining mark gets a
   placeholder circle.
3. The Ask bubble sits on top of table cells.

### 6.1 Chapters (Grammar.tsx)

- Title, the EN | हिं toggle, the search box (1.5dp `outline` border, white fill).
- "Continue" as one solid `fill.ink` block with a gold label and the topic title.
- Level filter as underlined text tabs (All, Beginner, Intermediate, Advanced), with the same filtering
  behaviour as today.
- Chapters as a two-column grid of solid tiles. Fill is `fillAt(chapter.rank)`. Each tile shows the
  title, `title_sa`, a thin progress bar (`onFill.faint` track, cream bar) and, large and faint in the
  corner, the first akṣara of `title_sa`. Write `firstAkshara()` in `mobile/src/utils/akshara.ts`.
  `Intl.Segmenter` is not reliable on Hermes, so walk the code points: leading consonants joined by
  virāma, then one consonant or independent vowel, then any vowel sign and any of ं ः ँ.
- Tapping a tile opens a new stack screen `GrammarChapter: { chapterId }`: a band in the chapter's fill
  with the title, `title_sa`, the blurb and the progress, then the topics as a numbered list with
  hairlines. Each row: number, title, one line of summary, level and minutes as plain text, and a check
  when read. No cards inside cards. The old `Collapsible` chapter card goes away.
- Tools (Word Lab, Sound map, Word order, Rhythm) as four small solid tiles in one row.

### 6.2 Topic page (GrammarTopic.tsx and BlockRenderer.tsx)

Pass the chapter's fill through `GuideTextCtx` as `tone: FillName`.

- A 3dp progress line under the header: this topic's position in its chapter, in the tone.
- Eyebrow "Topic 1 of 10" in the tone, the title at 24pt, then "Beginner · 4 min" as plain text.
  `LevelPill` stops being a tinted pill.
- The key term as one solid block in the tone: the Sanskrit at 30pt in cream, roman and meaning in
  `onFill.soft`, a cream speaker icon.
- The one-line summary as bold 17pt text on the page. No label, no box, no left bar.
- **Tables fit the screen.** Up to four columns never scroll sideways:
  - If there are four or more columns and the first two are text in every row, fold the second into
    the first as a small second line (the case table becomes Case with the question under it, Form,
    Meaning).
  - Columns flex to the width: text columns weight 1.3, Sanskrit columns 1. Cell padding 6dp.
  - Header: uppercase 10.5pt labels over a 1.5dp ink rule. Rows separated by hairlines. No outer
    rounded border, no zebra fill.
  - No speaker button inside a cell. A cell with `audio_url` plays on tap and says so in its label.
  - Five or more columns after folding: keep the horizontal scroll and put a small "swipe" hint with
    an arrow in the caption row.
- **Endings.** Write `splitAtAkshara(head, tail)` in `utils/akshara.ts`: when `tail` starts with a
  combining mark (U+0900 to U+0903, U+093A to U+094F, U+0951 to U+0957, U+0962, U+0963), move the last
  akṣara of `head` onto the front of `tail`. `["राम", "ः"]` becomes `["रा", "मः"]`. Colour the tail
  with `fill[tone]` and make it bold. Weight and colour together keep the rule that colour is never the
  only signal. Add unit-style checks for the eight case forms of राम.
- Analogy, tip and fact callouts lose their boxes: an icon and a label in the tone, then the text,
  with a hairline above. A "watch" callout is the one that keeps a block: solid `fill.gold`, cream text.
- Examples are full-width strips separated by hairlines: the Sanskrit at 22pt, the roman, the meaning.
  When an example has five or fewer `words`, show them at once under the sentence, each word over its
  gloss, the words underlined in cycling fill colours. With more than five keep the "Word by word"
  toggle. The data has no case information for these words, so do not label them by case.
- Steps: the number in the tone, no tinted circle. Formula: `a` and `b` outlined, the result a solid
  block in the tone.
- Quick check (`QuickCheck.tsx`): options are outlined rows; the chosen right answer turns solid
  `fill.ok`, a wrong one solid `fill.bad`, each with an icon as well.
- "Go deeper", key terms and related topics become plain rows with hairlines and chevrons.
- A solid `fill.ink` bar at the bottom: "Next" and the next topic's title. It marks the topic read and
  opens the next. The separate previous and next cards go; "Mark as read" stays as an outlined button
  above the bar.
- Ask: on this screen hide the bubble (`setHiddenBy("grammar-topic", true)` while focused) and put an
  Ask icon in the header next to the language toggle. Nothing floats over a table.

---

## 7. Read

**Asked.** "The read section is ugly too. Each book can have an image and shown better. I am not able
to flip the pages. Remove previous and next buttons or turn this into full screen and hide the slider,
the user can always bring it up. Introduce a dark mode too."

Files: `mobile/src/screens/Reader.tsx` (1334 lines), `mobile/src/components/book/*`,
`mobile/src/components/ReaderSlider.tsx`, `mobile/src/services/readingProgress.ts`. Mockup: the three
Read phones. The owner called the shelf and the dark page "great".

### 7.1 Shelf

- Title "Read".
- **Continue.** One solid block in the book's cover colour: a small cover, the title, "Chapter 2 ·
  verse 13", a thin progress bar and a "Continue" button. It shows the most recently read book, taken
  from `getReadingPositions()`. Not shown when nothing has been opened.
- **Rails.** Horizontal rows of covers, each cover about 104x148dp with the English title and "51 of
  700" under it. Rails and their books, by `slug`:
  - Scriptures: `gita`, `isha`, `katha`, `mundaka`, `ramayana`, `mahabharata`
  - Stories and wisdom: `hito`, `pancha`, `niti`, `subhashita`, `simhasana`, `ayurveda`
  - Graded reading: the three tiers (Simple, Sandhi, Compounds)
  - More: "All verses", "Other verses", and any slug not listed above
- A book with no verses stays visible at 55% opacity with "Soon" on it, as today.

### 7.2 Covers

New `mobile/src/components/book/CoverArt.tsx`. It draws a painted cover when the book has one in a
static `require` map (`covers.ts`), and otherwise a vector cover.

**Painted covers. They exist; do not generate, redraw or replace them.** The owner chose the style on
2026-10-01: a Pahari miniature in a thin gold frame on a plain ground. The files are in
`mobile/assets/covers/<key>.webp`, 600x900 (2:3), each under 150 KB. Keys: the catalogue slugs
`gita`, `isha`, `katha`, `mundaka`, `ramayana`, `mahabharata`, `hito`, `pancha`, `niti`,
`subhashita`, `simhasana`, `ayurveda`; `graded-1`, `graded-2`, `graded-3` for the tiers; `all` and
`other`; and `sayings` for the book section 7.5 adds (use that key for it).

- `covers.ts` exports one `Record<string, ImageSourcePropType>` with a literal
  `require("../../../assets/covers/gita.webp")` per key. Metro resolves only literal paths, and a
  `require` of a missing file fails the bundle, so list exactly the files in the folder.
- Draw the image edge to edge, `resizeMode="cover"`. The cover box is 2:3 at every size, so nothing
  is cropped. No spine band, no motif and no tint over a painted cover.
- The frame ends at 71% of the height; the lower 29% is empty ground with no lettering. Set the
  Devanagari title there, centred both ways, inset 8% from the sides, in the foreground colour from
  appendix C, at most two lines, shrinking to fit (`adjustsFontSizeToFit`, `minimumFontScale={0.6}`).
  At shelf size (104x148dp) that area is about 87x38dp.
- The colour column in appendix C is the ground colour of each painted cover. Use it for the
  Continue block and anywhere else the design tints something with the book's colour. Do not
  sample colours from the image.

**Vector covers** are the fallback for a book with no file, such as a new slug in the catalogue: the
book's colour, a line-art motif drawn with `react-native-svg` in the foreground colour, a darker
spine band at the left, and the Devanagari title. Table in appendix C. The motif path data for six
of them is in the mockup file's `<symbol>` elements; draw the others in the same weight.

`BookCover.tsx` (the card on the contents screen and the full cover that turns away when a book opens)
uses `CoverArt` at its two sizes.

### 7.3 Contents (the BOOK posture)

Keep the flow, restyle it: a band with the cover, the title, the caption and one solid button ("Open
book", or "Continue · 2.13"); then each chapter as a small uppercase label and numbered rows with
hairlines. No white cards.

The Gītā is about to have 700 verses in 18 chapters (section 7.5). Today's contents screen renders every
row inside a plain `ScrollView`. Make it a `SectionList` with chapters collapsed to a header row by
default and the chapter being read open, so opening the book never mounts 700 rows.

### 7.4 The reading page

Move the PAGE posture out of the tab into a root-stack screen, `Book: { bookKey: string; index?:
number }`, registered with `headerShown: false`. This is what makes full screen possible: a stack
screen covers the tab bar, Android back closes it with no `BackHandler` code, and the drawer's edge
swipe is no longer in the way, so the `swipeEnabled` effect in `Reader.tsx` can go. Put the logic that
builds a book from the verses, the canon and the graded tiers into `mobile/src/hooks/useReaderBooks.ts`
and use it from both `Reader.tsx` and the new `mobile/src/screens/Book.tsx`. Add `Book` to
`HIDDEN_ROUTES` in `AskProvider.tsx`.

**The page (controls hidden, the default).**

- Page colour fills the screen, with safe-area padding at the top and bottom.
- A small centred running head: the book, then the chapter.
- The verse, printed as a verse and centred: break `verse.devanagari` after each danda, in
  `sanskritText(22 * readerScale)`. Short pages are centred vertically (`flexGrow: 1`,
  `justifyContent: "center"` on the scroll content); long ones scroll.
- The roman under it, italic and soft. A short rule in the accent colour. Then `translation_en`, then
  `translation_hi` in the soft colour, whichever exist.
- "Word by word" with an up chevron, centred above the folio. It opens a bottom sheet that lists every
  entry of `word_breakdown`: the word, its roman, its meaning and its features. The verse text itself
  is not tappable. The printed verse is sandhi-joined and the breakdown words are not, so a word in the
  verse cannot be matched to its meaning reliably, and a page where some words respond and others do
  not feels broken.
- The folio at the bottom ("2.11 · 1 of 51") and a 3dp progress hairline along the bottom edge.
- No Previous, no Next, no slider.

**Touch.**

- Swipe left or right turns the page (the fixed `PageCurlBook`).
- A tap on the left 25% of the page goes back, on the right 25% goes forward, in the middle shows or
  hides the controls. Use one `Gesture.Tap()` on the page container combined with the pan through
  `Gesture.Exclusive(pan, tap)`. The page has no pressable children, which is why Word by word lives in
  a sheet.
- Reduce Motion: turns are instant. Taps still work.

**Controls (after a tap in the middle).** A top bar: back, the book title, "Aa", theme, contents (jumps
to the contents screen) and Ask (opens Ask about this verse; the old inline "Ask about this verse" link
goes). A bottom bar: the existing `ReaderSlider` and the position text. They stay until the next tap in
the middle. "Aa" opens a small panel: three theme swatches (Light, Sepia, Dark), a five-step text size
and a "Roman" switch.

**Themes.** New `mobile/src/screens/readerTheme.ts`:

| | Light | Sepia | Dark |
|---|---|---|---|
| page | `#FFFDF7` | `#F1E3C6` | `#1B1714` |
| bar | `#FFFFFF` | `#E9D8B6` | `#26201B` |
| text | `#3B2E25` | `#4A3A28` | `#EDE3D3` |
| soft text | `#7A6A5C` | `#6B5842` | `#A89B8A` |
| accent | `#E85B25` | `#B23D10` | `#F08A5D` |
| line | `#EFE3CE` | `#D9C6A0` | `#3A322B` |

Measured: Dark text 14.0:1, soft 6.6:1, accent 7.2:1. Sepia text 8.6:1, soft 5.3:1, accent 4.6:1.
Store the theme under `shabd.read.theme` and the size step under `shabd.read.size` (0.85, 1, 1.15,
1.3, 1.5; it multiplies the app's global text size and keeps the 18pt floor). Use
`<StatusBar style="light" />` while the dark theme is on screen and restore it on blur. Dark is for the
reading page only; the rest of the app stays light.

**PageCurlBook in full screen.** Remove the cloth board, the page-block edges and the padding
(`styles.board`, `styles.edge`): pages run edge to edge. Keep the gutter shadow in Light and Sepia and
drop it in Dark. `PAPER_BACK`, the colour of the back of a turning page, becomes a prop: about
`[0.984, 0.953, 0.886]` for Light, `[0.90, 0.84, 0.72]` for Sepia and `[0.16, 0.13, 0.11]` for Dark,
each with the existing show-through. Snapshots are re-shot when the theme or size changes: pages
already call `invalidate()` on every render, so check it rather than assume it. The cover still turns
away when a book opens.

### 7.5 What the reader contains

Polish will not help if the text is wrong, and a lot of it is.

**Audit of the 51 seeded Gītā rows** against the `deepakrakshit/bhagavad-gita-dataset` payload
(`backend/results/imports/gita.payload.json`, MIT, 700 verses with Hindi and English), done 2026-10-01
by comparing letters only:

| Count | What the row holds | Examples |
|---|---|---|
| 26 | the verse | 2.14, 2.22, 4.8, 18.63 |
| 7 | part of the verse | 2.11, 2.18, 4.7 (second row), 6.25 |
| 9 | another verse's text | "2.13" is 2.27, "2.17" is 15.16, "2.19" is 2.23, "6.29" is 6.31, "9.31" is 9.22, "12.4" is 18.66, "12.7" is 10.11 |
| 8 | text that is not that verse | "2.12" `भोगा विषयाः सर्वे।`, "13.8" `देहं पृथग्बुद्धेर्यो ज्ञानी।`, "5.24", "6.31" and one "2.47" (`ते वर्धमानं।`) are not Gītā lines; "14.22" is a line of 14.24 |
| 1 | a verse number that does not exist | "8.30" (chapter 8 has 28 verses; the text is 8.8) |

Five references appear more than once (2.47 four times; 2.13, 2.20, 4.7 and 6.5 twice), so the 51 rows
cover 44 references. Outside the Gītā, many Hitopadeśa, Pañcatantra, Nītiśataka and Siṃhāsana rows are
short lines with no verse number, such as `एकः कर्ता।` and `मित्री च उपकारः च।`.

Production holds exactly these 96 seed rows and no translations (a read-only count on 2026-10-01).

**Already done in the working tree (2026-10-01).** `backend/scripts/import_text.py` gained two opt-in
flags and one safer default, with tests in `tests/test_p21_import.py`:

- `--fix-existing`: when a row already has the incoming reference but its text is not that verse, the
  row's text, roman, metre, word breakdown and translations are replaced with the incoming verse, in
  place. Its id and date do not change, so the daily schedule and the seed's `(source_ref, date)` key
  are untouched and the startup seed does not put the old row back.
- `--min-words 0`: keeps the two verses the analyzer reads fewer than two words of (2.64 and 5.8).
- Default: a translation is filled on an existing row only when the row's text is the incoming verse.
  Before, the right translation would have been attached to the wrong Sanskrit.
- `backend/scripts/prod_import.py` runs the importer against production: it reads the connection
  string from Secret Manager, saves the whole `shlokas` table to `results/backups/` first, and can put
  that backup back with `--restore`.

**Rehearsed on a scratch database seeded like production:** 657 verses added, 24 rows replaced, the
43 remaining references skipped as duplicates, "8.30" reported as a reference the text does not have.
Afterwards 707 of the 708 Gītā rows match the dataset and carry both translations, a second run
changes nothing, and re-running the startup seed adds nothing back. The owner runs it on production
(appendix D).

**What is still yours.**

1. The seed file is still wrong, so a fresh database starts wrong. In `backend/app/seeds/shlokas.py`
   give every Gītā row the dataset's text for its reference. Copy from the payload. Do not type
   Sanskrit.
2. The import cannot remove the seven extra rows of the five repeated references, or renumber "8.30":
   the seed finds rows by `(source_ref, date)`, so changing a reference in the database only makes the
   seed insert the old row again. Change the seed AND add a corrections step in
   `backend/app/seeds/seed.py`, keyed on the old reference and date, that updates existing databases
   the same way. Each repeated row gets the reference of the verse its text came from where that is
   known (the audit table), and "8.30" becomes "8.8". A row that then duplicates an imported verse is
   deleted by the corrections step.
3. A line with no verse number does not belong in a book. Give those rows the reference prefix "Sūkti"
   (again in the seed and in the corrections step) and show them in one book, "Sayings" (सूक्तयः), on
   the More rail. The daily verse on Home is unaffected.
4. Imported verses have no English word meanings. The importer's word breakdown is the analyzer's: the
   `meaning` field holds the word's stem in Devanagari. In the Word by word sheet, show that column as
   "Stem" when it is Devanagari, and as the meaning otherwise.
5. `GET /shlokas` returns the whole corpus in one response: about 1.2 MB after the import. Add
   `GZipMiddleware` in `app/main.py`, and keep the reader working from that one cached response.
6. From 12 December 2026 the daily verse on Home walks through the imported Gītā in order, one verse a
   day until September 2028, because imported rows are dated after the seed's last day. That is the
   importer's design. Tell the owner; do not change it without asking.

---

## 8. Backend summary

| Change | Where |
|---|---|
| `display` on the STT response, third Saaras pass | `services/learner_stt.py`, `routers/speech.py`, `schemas.py` |
| `heard`, `heard_langs` on a talk turn | `services/tutor.py`, `routers/conversation.py` |
| `screen_text`, `place`, `cards` in, `card` out | `routers/explain.py`, `services/explainer.py` |
| Panchang and festivals | new `services/panchang.py`, `requirements.txt`, `seeds/licences.py` |
| Games | new `routers/games.py`, `services/games.py`, `seeds/game_pools.py`, model and migration |
| Reports | new `POST /feedback/report` |
| Reader corrections | `seeds/shlokas.py`, `seeds/seed.py`, new `scripts/audit_reader_seed.py` |
| Privacy page | `routers/legal.py` |
| Settings | `config.py`: `ask_card_max_tokens = 700` |

`POST /feedback/report`, body `{ surface: "talk" | "ask", question, answer, reason }`, each clipped to
2000 characters. Store in a new table `content_reports` (`id, learner_id, surface, question, answer,
reason, created_at`) with a migration, list them in the admin router and delete them with the account.
Returns 204. Rate limit: 20 a day per learner.

Register new routers in `app/main.py`. Every new endpoint uses `require_learner`. Nothing may log a
place or a screen's text.

---

## 9. For the owner, not for you

Put these in your hand-back so they are not lost. Do not do them.

- **Build and release.** With `app.json` at 1.1.0 and versionCode 4: `cd mobile && npx eas-cli build
  --platform android --profile production`, then a new closed-testing release.
- **Deploy the backend** before or with the release. The new app tolerates the old backend, but Ask
  cards, games and place need the new one. The games and reports tables need the migration.
- **Privacy page** (`/privacy`): two new lines, written in `routers/legal.py` for the owner to review.
  Place: "If you allow it or pick a city, the app sends an approximate place with a question about
  dates so the server can work out sunrise and tithi. It is used for that answer and not stored."
  Screen text: "When you attach a screen to a question, its text is read on your phone and only the
  text is sent."
- **Play Console.** Data safety: approximate location is sent with some requests and not stored;
  decide how to declare it (an earlier check found Google does not count in-memory-only processing as
  collection). There is a Play Console declaration for AI-generated content (help article 17262077)
  and a Health apps declaration; with Ask now answering wider questions, including home remedies, both
  need a look. I have not read either form.
- **Recordings** for section 3.1, in `backend/tests/fixtures/codemix/`.
- **Cover images** are done: eighteen painted covers in `mobile/assets/covers/` (section 7.2), with
  4K masters in `results/covers/miniature/` on the owner's machine. A new book needs a new painting
  from the owner's side; until then it shows the vector cover.
- **Import the full Gītā** (appendix D). The importer and a production wrapper are ready and were
  rehearsed on a scratch database; the run against production is the owner's to start.
- **Stroke data.** Not part of this work and still open: the animated stroke paths behind "Watch
  strokes" do not match real letterforms (stems on the wrong side for 26 of 33 consonants). Once Write
  opens again, testers will see it.

---

## 10. Order of work and checks

1. Section 1. It is small, and nothing else matters if Write still crashes.
2. Section 2 tokens.
3. Talk, then Ask app-side, then the Ask server path with panchang.
4. Read (the corrections first, then shelf, then the Book screen).
5. Grammar.
6. Play last. It is the largest and the most separable.

**On the phone.** The owner will connect it (model IV2201, Android 13, 1080x2400 at 3x, so 360dp wide,
three-button navigation). The phone runs the Play-signed build, so a locally signed APK will not install
over it. Either ask the owner for an EAS `preview` build, or make a local build with a different
`applicationId` so both can sit side by side.

- Crash log: `adb logcat -d -b crash`. Live errors: `adb logcat -d -T "<MM-DD HH:MM:SS.000>"` filtered
  by `adb shell pidof <package>`.
- Screenshot: `adb exec-out screencap -p > shot.png`. Screen text: `adb shell "uiautomator dump
  /sdcard/Download/x.xml; cat /sdcard/Download/x.xml"`. This phone has no `screenrecord`.
- Bottom tabs at y=2196: Home 90, Path 270, Talk 450, Play 630, Grammar 810, Read 990.

Device checklist:

- [ ] Write opens. "Preparing handwriting" turns into Check. Drawing अ and pressing Check gives a
      result. In flight mode on a fresh install the offline matcher answers instead of a crash.
- [ ] Write, Photo tab: the camera opens and a photo is checked.
- [ ] Read: left swipe goes forward, right swipe goes back, edge taps turn, a middle tap toggles the
      controls, the three themes and five sizes apply, the slider jumps, back closes the book.
- [ ] A curling page looks like the page it came from, in all three themes.
- [ ] Talk: the bar is about 57dp. A voice line shows as spoken. The correction panel opens by itself.
      The keyboard does not cover the field.
- [ ] Ask: no bounce. Mic fills the box. "This screen" attaches text on Grammar, Read and Home.
      "What is today's tithi?" gives a card whose date matches Drik Panchang for the chosen place.
- [ ] Place: allowing location sets a label; denying it leaves the city list usable; Settings shows it.
- [ ] Play: each game starts, ends and stores a best. Today's challenge flips to done.
- [ ] Grammar: no table needs sideways scrolling up to four columns. No dotted circles. Back takes one
      press.
- [ ] At 360dp nothing is clipped, and nothing sits under the status bar.

**Hand back** a short summary: what changed, per section; what you verified and how; what you could not
verify; the measured numbers this document asks for; and the owner list from section 9. No commit.

---

## Appendix A. Mockup map

| Phone | Shows |
|---|---|
| Talk, reply closed | mixed-script bubble, reply hierarchy, the slim input bar |
| Talk, reply opened | correction and Why panels |
| Ask, about the screen | attachment row, suggestion rows, the four-control input row |
| Ask, wider question | the answer card |
| Play hub | challenge block, game tiles, practice rows |
| Shabda Rush, Varna Jaal | the two in-game layouts |
| Grammar chapters, topic top, topic further down | tiles, term block, fitted table, examples, next bar |
| Read shelf, page light, page dark with controls | covers and rails, the bare page, bars and the Aa panel |

The phones are drawn 320 wide for a 360dp screen, so multiply a mockup size by 1.125 for dp. The
tokens at the top of the file's `<style>` are the ones in section 2.

## Appendix B. Festival rules and the dates they must reproduce

Dates are from Drik Panchang's festival calendar for New Delhi, read on 2026-10-01 through a page
summary. If a test disagrees by a day, open the page before changing a rule.

| Festival | Starting rule (amanta month, paksha, tithi, part of day) | 2026 | 2027 |
|---|---|---|---|
| Makara Sankranti | Sun enters sidereal Makara | 14 Jan | 15 Jan |
| Vasant Panchami | Magha, Shukla, 5, forenoon | 23 Jan | 11 Feb |
| Maha Shivaratri | Magha, Krishna, 14, midnight | 15 Feb | 6 Mar |
| Holika Dahan | Phalguna, Purnima, pradosh | 3 Mar | 21 Mar |
| Holi | the day after Holika Dahan | 4 Mar | 22 Mar |
| Ugadi, Gudi Padwa | Chaitra, Shukla, 1, sunrise | 19 Mar | 7 Apr |
| Rama Navami | Chaitra, Shukla, 9, midday | 26 Mar | 15 Apr |
| Buddha Purnima | Vaishakha, Purnima, sunrise | 1 May | 20 May |
| Guru Purnima | Ashadha, Purnima, sunrise | 29 Jul | 18 Jul |
| Raksha Bandhan | Shravana, Purnima, afternoon | 28 Aug | 17 Aug |
| Krishna Janmashtami | Shravana, Krishna, 8, midnight | 4 Sep | 25 Aug |
| Ganesh Chaturthi | Bhadrapada, Shukla, 4, midday | 14 Sep | 4 Sep |
| Pitru Paksha | Bhadrapada, Krishna, 1 to Amavasya, afternoon | 27 Sep to 10 Oct | not read |
| Durga Ashtami | Ashwina, Shukla, 8 | 19 Oct | 7 Oct |
| Maha Navami | Ashwina, Shukla, 9 | 19 Oct | 8 Oct |
| Dussehra | Ashwina, Shukla, 10, afternoon | 20 Oct | 9 Oct |
| Karwa Chauth | Ashwina, Krishna, 4, moonrise | 29 Oct | 18 Oct |
| Diwali, Lakshmi Puja | Ashwina, Amavasya, pradosh | 8 Nov | 29 Oct |
| Govardhan Puja | Kartika, Shukla, 1 | 10 Nov | 30 Oct |
| Bhai Dooj | Kartika, Shukla, 2, afternoon | 11 Nov | 31 Oct |
| Chhath Puja | Kartika, Shukla, 6 | 15 Nov | 4 Nov |
| Kartik Purnima | Kartika, Purnima | 24 Nov | 14 Nov |

Notes. The Pitru Paksha dates came from several secondary sites that agree (Purnima Shraddha on 26
September, Sarva Pitru Amavasya on 10 October), not from Drik Panchang. In 2026 Durga Ashtami and Maha
Navami fall on one day and Govardhan Puja is two days after Diwali: a rule that only looks at sunrise
will get these wrong, which is the point of testing against the table. 2026 has an extra lunar month
before these festivals; I believe it is an adhika Jyeshtha running from about 17 May to 15 June, but I
did not check it, so confirm it on Drik Panchang and add it as a test of the month naming.

## Appendix C. Covers

Colour is the ground of the painted cover and the book's colour everywhere else. Foreground is the
title colour on it; each pair was checked on 2026-10-01 and is 4.8:1 or better. Motif is for the
vector fallback only.

| key | Devanagari title | Colour | Foreground | Motif |
|---|---|---|---|---|
| `gita` | श्रीमद्भगवद्गीता | `#561722` | `#F2C879` | chariot wheel |
| `isha` | ईशावास्योपनिषद् | `#2F4677` | `#F3D27A` | sun with rays |
| `katha` | कठोपनिषद् | `#4B3B7A` | `#EAD9A8` | flame |
| `mundaka` | मुण्डकोपनिषद् | `#17535C` | `#FCE9C2` | two birds on a branch |
| `ramayana` | रामायणम् | `#2F5B3C` | `#F2D9A0` | bow and arrow |
| `mahabharata` | महाभारतम् | `#3B2E25` | `#F2C879` | crossed arrows |
| `hito` | हितोपदेशः | `#1F6E73` | `#FCE9C2` | lotus |
| `pancha` | पञ्चतन्त्रम् | `#8A5608` | `#FFF3D6` | tree |
| `niti` | नीतिशतकम् | `#962F4E` | `#FBE1C8` | scales |
| `subhashita` | सुभाषितम् | `#35603C` | `#F2E3B8` | lamp |
| `simhasana` | सिंहासनद्वात्रिंशिका | `#5E2216` | `#F2C879` | crown |
| `ayurveda` | आयुर्वेदसंहिताः | `#44703F` | `#F6EBC8` | leaf |
| `graded-1` | the tier's title (Simple) | `#17535C` | `#FFF8EE` | one step |
| `graded-2` | the tier's title (Sandhi) | `#35603C` | `#FFF8EE` | two steps |
| `graded-3` | the tier's title (Compounds) | `#8A5608` | `#FFF8EE` | three steps |
| `all`, `other`, `sayings` | सर्वम्, अन्यत्, सूक्तयः | `#3C5A8E` | `#FFF8EE` | stacked lines |

Titles come from `title_sa` in the catalogue; this column is for reference. The Gītā's colour is
`#561722` here and `#7A2E1E` in the mockup: the table is right, it was measured from the cover the
owner approved.

**How the painted covers were made** (for the record; nothing here is yours to do). The owner picked
the miniature style from nine candidates (`specs/mockups/cover-candidates/google/`). The recipe is
`specs/covers/covers.json`: Google's Nano Banana Pro painted only the miniature for each book, 4:5 at
4K (`results/covers/paintings/`, which git ignores). `specs/covers/compose_covers.py` set every
painting into the same frame, measured from the approved Gītā cover, on the colour in the table
(`results/covers/miniature/`, 3392x5088), and `specs/covers/export_covers.py` wrote the 600x900 files
the app ships. Do not generate, download or invent cover images yourself, and do not edit the files
in `mobile/assets/covers/`.

## Appendix D. Importing the full Gītā (owner)

Dry run first. It connects to production, reads, and writes nothing:

```
backend/.venv/Scripts/python.exe backend/scripts/prod_import.py --file results/imports/gita.payload.json --fix-existing --min-words 0
```

It should report 657 verses to add and 24 rows to replace, and list each row it would replace with
its old text. Then the real run, which saves a backup of the table before it writes:

```
backend/.venv/Scripts/python.exe backend/scripts/prod_import.py --file results/imports/gita.payload.json --fix-existing --min-words 0 --live
```

To undo it: `backend/.venv/Scripts/python.exe backend/scripts/prod_import.py --restore
results/backups/prod-shlokas-<time>.json --live`.

The script needs `gcloud` signed in to the project that holds the `shabd-database-url` secret. It
never prints the connection string. The build now on phones reads the same table, so the 700 verses
appear in the current app as soon as the import finishes; its contents screen will be slow to open
until the `SectionList` change in section 7.3 ships.

## Sources checked on 2026-10-01

- The phone's crash buffer, the installed APK (`base.apk` and the arm64 split) and the 27 Sep local APK.
- `eas-cli` 24.8.0 source in the global npm folder (which `.easignore` is read; `build:inspect` flags).
- `metro-runtime/src/polyfills/require.js` (`guardedLoadModule`).
- `react-native-gesture-handler` 2.32.0, `PanGestureHandler.kt` (`activate()` resets progress).
- React Native 0.86.3 `ReactViewGroup.kt` and Skia 2.6.2 `ViewScreenshotService.java`.
- `expo/bundledNativeModules.json` (the versions SDK 57 pins).
- Sarvam speech-to-text API reference, docs.sarvam.ai (the `mode` values, models, language code).
- Google ML Kit release notes (Digital Ink Recognition 17.0.1, 18.1.0, 19.0.0).
- Android Developers Blog and developer.android.com on the 16 KB page size requirement.
- Google Play Console Help, AI-Generated Content policy (article 13985936).
- Expo SDK 57 docs: Location, BuildProperties, captureRef.
- PyPI and GitHub for `astronomy-engine` (version, licence, functions).
- Drik Panchang: the day panchang for 1 October 2026 and the 2026 and 2027 festival calendars, New Delhi.
