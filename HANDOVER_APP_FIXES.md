# Sanskritam app fixes: handover

Written 2026-09-30 for the implementing agent. The owner tested the closed-testing build on an Android
phone and reported the problems below. Section 1 (app icon) is already done in the working tree and only
needs a release. Everything else is to do. Every cause listed here was found by reading the code; the
file and line references are from 2026-09-30.

---

## 0. Rules for this work

- **Don't commit.** The owner commits. Leave changes in the working tree and summarise them at the end.
- **Owner's own uncommitted edits are in the tree:** `mobile/src/utils/name.ts` (new, `firstName()`) and
  its use in `Home.tsx`, `Progress.tsx`, `Settings.tsx`. Keep them and use `firstName()` wherever a name
  is shown. The owner also deleted the old `HANDOVER.md`, `UI_HANDOVER.md` and the old concept icons in
  `deploy/`. Don't restore them.
- **Don't deploy the backend yourself.** `gcloud run deploy --source=.` uploads the whole working tree
  (uncommitted work included), and production config lives in two `.env.deploy` files that have drifted
  apart. Ask the owner. Every backend change below must keep working with the app build already in
  testing, and the new app must still work until the backend is deployed.
- **Expo SDK 57.** Read the versioned docs before writing code (`mobile/AGENTS.md`):
  https://docs.expo.dev/versions/v57.0.0/
- **Copy rule, whole app.** The owner's words: "no em dashes and no large AI generated texts like
  paragraph anywhere across app".
  - No `—` and no spaced ` – ` in any user-visible string, including `accessibilityLabel` (TalkBack
    can read the dash aloud).
  - No explanatory paragraphs. A screen gets a title, a section gets a short label. Helper text only
    when it tells the user something they can't see, and then one short line.
  - Errors say what happened and what to do, in one line. Drop lines like "Not a mistake.", "no
    penalty", and privacy essays.
  - Text from the server or the model goes through `plain()` (`mobile/src/utils/text.ts`) where it is
    rendered as prose. See §11.
- **More colour, same brand.** The brand is the icon: saffron `#E85B25` on cream `#FFF6ED`, with the
  guru mascot (the same character `GuruNative` draws). Add accents (§2). Don't replace saffron.
- **Check on a real Android build**, not only the web preview: ML Kit, the camera, digital ink and the
  keyboard only behave for real there. `npx tsc --noEmit -p mobile` and the backend tests
  (`cd backend` then `./.venv/Scripts/python.exe -m pytest -q`) must pass.

---

## 1. App icon (done, needs a release)

**Reported:** the phone still shows the default Expo icon after installing, although the new icon was
uploaded in Play Console.

**Cause:** the Play Console icon is only the store listing. Google's help says "The app icon does not
replace your app's launcher icon". The launcher icon is built into the app from `mobile/assets/`, and
those files were still the Expo template images from Aug 30.

**Done in the working tree:**
- `mobile/assets/icon.png`, `android-icon-foreground.png`, `android-icon-background.png`,
  `android-icon-monochrome.png`, `splash-icon.png`, `favicon.png` are now made from
  `deploy/icons/icon.jpg`. The art is unchanged: the foreground is the art fitted inside Android's 66dp
  safe circle (so no launcher mask clips it), the background is the art's own cream `#FFF6ED`, and the
  monochrome is its silhouette for Android 13 themed icons.
- `deploy/icons/icon-512.png`: the same art as a 512×512 32-bit PNG. Play's stated requirement for
  the listing icon is "32-bit PNG (with alpha)", 512×512, max 1024 KB; `icon.jpg` is a JPEG.
- `mobile/app.json`: `version` 1.0.2, `android.versionCode` 3 (Play rejects a version code it has
  seen; 2 was set on Sep 29), adaptive icon and splash background `#FFF6ED`.
- `deploy/build_launcher_icons.py` rebuilds all of the above from `icon.jpg` if the art ever changes.

**Owner steps to get it onto phones:**
1. Build with EAS, which regenerates the native project from `app.json` and so picks up the icons:
   `cd mobile`, then `npx eas-cli build --platform android --profile production`.
2. In Play Console, create a new release on the closed testing track, upload the `.aab`, roll it out.
3. In the main store listing, set the app icon to `deploy/icons/icon-512.png` if it isn't already
   a PNG of this art.
4. Testers update from Play. Some launchers cache icons; if the old one sticks, remove and re-add the
   home-screen icon or restart the phone.

**Don't** make the Play build from `mobile/android/`: it was generated on Sep 15 with the default
icons, and its `app/build.gradle` signs release builds with the debug key. If a local build is ever
needed, run `npx expo prebuild --platform android --clean` first and register
`./plugins/withReleaseSigning` in `app.json` plugins (the file exists but isn't registered).

The `splash` block in `app.json` does nothing on SDK 57 without the `expo-splash-screen` config
plugin, which isn't installed. Android 12+ shows the launcher icon on its system splash, so the new
icon appears there anyway. For a custom splash: `npx expo install expo-splash-screen` and configure it
per the SDK 57 docs.

---

## 2. Design system (do this first)

### Palette

Keep `color.saffron #E85B25`, `color.bg #FFF8EE`, `color.ink #3B2E25` in `mobile/src/theme.ts`. Add
an accent family drawn from the brand art and the Play feature graphic (whose app mock uses peach,
sage, blush and slate cards):

| accent | text or icon on light (`fg`) | tint background (`bg`) | gradient for white text |
|---|---|---|---|
| saffron | `#B23D10` | `#FFE3D3` | `#D9531E` to `#B23D10` |
| teal (peacock) | `#1F6E73` | `#DDEFEE` | `#1F7A7C` to `#17535C` |
| sage (tulsi) | `#44703F` | `#E5EEDC` | `#4A7F44` to `#35603C` |
| rose (lotus) | `#AE3F5A` | `#F9E1E5` | `#C04D6E` to `#962F4E` |
| gold (turmeric) | `#8E6108` | `#FBEFD2` | `#B07410` to `#8A5608` |
| slate | `#3C5A8E` | `#E3E9F4` | `#4F6AA3` to `#2F4677` |

Contrast was computed with the WCAG formula: every `fg` is at least 4.8:1 on its tint and 5.1:1 on
the cream background; white text is at least 3.9:1 on the lighter gradient stop and 5.9:1 on the
darker one. So small white text (under 18px bold) belongs over the darker half of a gradient.

Rules: saffron stays the colour of primary actions and the brand. Accents mark categories (a unit, a
tile, a daily card), one accent per card. `expo-linear-gradient` is already installed.

Worth telling the owner: white on the current primary button `#E85B25` is 3.53:1, fine for bold labels
of 18px and up but low for 16px. Darkening the fill to `#D2461F` gives 4.53:1.

### Buttons ("the buttons look AI generated")

`Button` (`mobile/src/components/ui.tsx:35-127`) is the Duolingo "3D" style: a solid darker
under-shadow (`shadowRadius: 0`, `shadowOpacity: 1`), a press that moves it down 1px, and uppercase
ghost labels. `shadow.button` in `theme.ts` is the same solid shadow and is spread into many
hand-rolled buttons across the app.

Replace with flat fills and a soft lift, keeping the props (`label`, `tone`, `size`, `block`,
`loading`, `icon`) so call sites don't change:
- Sizes: lg min height 54, md 46, sm 36. Radius 14 (sm 10). Label 16px Nunito ExtraBold (sm 14px).
  Horizontal padding 24.
- Tones: `primary` (saffron, white label), `tonal` (`saffronLight` fill, `#B23D10` label), `neutral`
  (`surfaceMuted`, ink), `ghost` (transparent, saffron label, not uppercase), `ok`, `danger`, `dark`
  (ink fill).
- Only solid fills get a shadow: offset (0, 4), opacity 0.18, radius 10, elevation 3, in the fill's
  deeper colour. Tonal and ghost are flat.
- Pressed: opacity 0.88 and scale 0.98. Disabled: opacity 0.5.
- Change `shadow.button` in `theme.ts` to the same soft values so the hand-rolled buttons follow.

### Screen chrome

- Tab screens: `SafeAreaView edges={["top"]}`, a large title (28px ExtraBold), no subtitle.
- Horizontal padding 20 to 24 on every screen.
- Scroll views on screens that show the Ask bubble end with `paddingBottom` of at least 120, so the
  bubble never covers the last item.

### Helpers already in the tree (added this session, not wired up yet)

- `mobile/src/utils/streak.ts`: `dayStreak(history, today)`, `lastSevenDays(history, today)`,
  `isActiveDay(day)`, `localToday()`. Use these for every streak the app shows (see §4).
- `mobile/src/utils/text.ts`: `plain(text)` removes em dashes from server and model prose.
- `mobile/src/components/ProgressRing.tsx`: an SVG ring with a slot for centred content.

---

## 3. Login screen

The owner calls this "the home page" (it is what a new user sees). File: `mobile/src/screens/Login.tsx`.

**Remove:**
- the tagline "Speak Sanskrit. A word at a time." (line 156)
- the "नमस्ते 🙏" heading and "Sign in to save your progress across devices — or just jump in as a
  guest." (160-163)
- the "or" divider and "No account needed — start learning in seconds." (230)
- the footnote "Your tutor speaks a little Sanskrit and a lot of your language, and raises the
  Sanskrit share as you grow." (235-238)
- the fake Google logo (a blue circle with the letter G) and the "श्" badge
- developer-facing errors: "Google sign-in isn't configured yet (GOOGLE client ID missing)…" becomes
  "Google sign-in isn't available in this build."; "Could not connect. Is the backend running?"
  becomes "Couldn't connect. Check your internet and try again."

**New layout:**
- Background: the icon's cream `#FFF6ED`, with a soft saffron glow at the top.
- Upper part: the guru mascot, `GuruNative` at about 200dp with `gesture={Gesture.Anjali}` (the same
  character and pose as the icon), then the wordmark "संस्कृतम्" in saffron (Baloo 2 ExtraBold, about
  40px) with "Sanskritam" small underneath. This mirrors the store icon.
- Lower panel: three full-width buttons, 54dp tall, radius 14, 12dp apart:
  1. Continue with Google: white fill, 1px `color.border`, the real four-colour Google "G" drawn with
     `react-native-svg` (Google's sign-in branding guidelines ask for the official mark).
  2. Continue with Apple: iOS only (keep the `appleAvailable` logic), black fill, `Ionicons` `logo-apple`.
  3. Continue as guest: tonal saffron.
- One error line under the buttons when there is an error, and a small "Privacy policy" link at the
  bottom (`${BASE_URL}/privacy`).
- Keep all sign-in logic as it is.

**Done when** the only text on screen is the wordmark, the three button labels, the error (if any) and
the privacy link, and it looks right on a 360×640 phone and a tall 412×915 one.

---

## 4. Home (after login)

File: `mobile/src/screens/Home.tsx`.

**What's wrong:**
- The two pills at the top right (lines 171-187) show `learner.streak` beside a flame and
  `sanskrit_ratio` as "30%" beside a language icon. Neither has a label.
- `learner.streak` is **not a day streak**. `backend/app/adaptive.py:170` adds 1 for each correct
  challenge answer and resets it to 0 on a wrong one (called from `backend/app/routers/attempts.py:69`).
  Someone who practises every day sees 0 after one mistake.
- `sanskrit_ratio` is how much Sanskrit the tutor mixes into conversation; it starts at 0.3. "30%"
  with no label reads as a placeholder.
- Filler: "Ready for today's practice?" (line 200), "The mouth-map of Sanskrit.", "One word a day,
  scored on the mouth-map.", and the hero line "From zero to grammar · 12/80 · Resume".

**New layout, top to bottom** (every number has an endpoint already):
1. Top bar: hamburger on the left; a streak chip on the right with a flame and "N days". The day
   streak is `dayStreak(history, daily.date)`, with `history = api.progressHistory(90)` and
   `daily = api.progressDaily()`. Hide the chip until both load.
2. Greeting: `GuruNative` at 72dp, "नमस्ते" small (Baloo), and the first name at 28px ExtraBold
   (`firstName()`). No second line.
3. Today card (white): a 72dp `ProgressRing` with today's XP over `goal_xp` (green once `goal_met`),
   the title "Today's goal" or "Goal met today", "20 of 50 XP", and a 7-day strip from
   `lastSevenDays()` (filled dot for a practised day, ring for today). Skeleton while loading;
   "Couldn't load today. Tap to retry." if it fails.
4. Continue card: a gradient (teal or saffron from §2) with "Continue · Unit N", the lesson title in
   Devanagari (use the unit's when the lesson's is empty) and English, the unit progress bar with %, an
   "N to review" pill when `api.reviewDue(1).due_count > 0`, and a white round play button. Keep the
   current target logic (first unit with progress below 1).
5. "Daily": two tiles side by side.
   - Śloka (rose tint): the first line of today's verse, two lines at most. Opens `Shloka`.
   - Daily word (teal tint): the clue in quotes, like “lotus”, plus "Find the word"; or "Solved" with
     the answer; or "Played. New word tomorrow."; and tries used, like "2/6". Opens `DailyWord`.
6. "Explore": a 2×2 grid. Each tile has a gradient icon badge, an English title and the Sanskrit name:
   Alphabet वर्णमाला (gold, `Varnamala`), Write लेखनम् (slate, `Writing`), Discover परिचयः (saffron,
   `Story`, with its "12/80" position), Words शब्दाः (sage, `Vocab`).

Refresh today's XP, the daily word and the review count on focus (`useFocusEffect`), because they
change while Home sits behind other screens.

---

## 5. Ask (the floating help button)

Files: `mobile/src/ask/AskProvider.tsx`, `mobile/src/components/AskSheet.tsx`,
`backend/app/routers/explain.py`, `backend/app/services/explainer.py`.

**Why it's "not floating, broken and doesn't work":**
1. On most screens a tap does nothing. `onPress={() => current && open(current)}`
   (`AskProvider.tsx:94`) only works after a screen calls `setContext`. Challenge, Grammar,
   GrammarTopic, Lesson, Shloka and WordLab do. Home, Path, Talk, Play, Varnamala, DailyWord, Writing,
   Progress and Story never do. (Reader, Vocab and the lesson `VisualGrid` call `open()` from their
   own buttons; keep those working.)
2. Where it opens, it often can't answer. The backend rejects an empty subject with HTTP 422
   (`explain.py:164-165`). Grammar sets `subject: ""` (`Grammar.tsx:163`) and the long-press fallback
   sends `current?.subject ?? ""` (`AskProvider.tsx:98`).
3. The context goes stale. Nothing clears it, so after visiting Śloka the button on Home asks about
   that verse.
4. It is a fixed pill at `bottom: 108, right: 16` (`AskProvider.tsx:116-120`) that covers content and
   can't be moved. It also shows on the Login screen, because the provider wraps the navigator that
   renders Login.
5. Suspected, confirm on a phone: the sheet is an RN `Modal` (`AskSheet.tsx:92`) with the text box at
   the very bottom. Android is edge-to-edge on this SDK (Expo's prebuild notes "Android 16 makes
   edge-to-edge mandatory"), and `react-native-keyboard-controller` may not manage a Modal's window,
   so the keyboard likely covers the input and the Ask button.

**Build:**
- **Bubble.** A 56dp circle (saffron, white `chatbubble-ellipses` icon, soft shadow), draggable with
  `Gesture.Pan()` and Reanimated. On release it snaps to the nearer side; its height is kept between
  `insets.top + 72` and `height - insets.bottom - 64 - 72` (64 is about the tab bar). Remember
  `{side, y}` in AsyncStorage inside try/catch. Tap opens the sheet.
- **Where it hides.** On Login (not onboarded) and on the `Conversation`, `Writing` and `DailyWord`
  routes, which own the bottom of the screen. To know the route, create a ref in `App.tsx` with
  `useNavigationContainerRef()`, store `navRef.getCurrentRoute()?.name` in state from `onReady` and
  `onStateChange`, and pass it to `AskProvider`. Keep `setSuppressed` (Challenge and Lesson hide the
  bubble during a verdict).
- **Context per screen.** Add `useAskContext(surface, subject)`: set the context in `useFocusEffect`
  and clear it on blur, only if it is still the one this screen set. Replace the
  `useEffect(() => setContext(...))` calls in Challenge, Grammar, GrammarTopic, Lesson, Shloka and
  WordLab. Varnamala should pass the selected letter.
- **Sheet.** Replace the RN `Modal` with an overlay that `AskProvider` renders after `children`
  (absolute fill, dimmed backdrop, sheet at the bottom). Lift it above the keyboard with
  `KeyboardAvoidingView` from `react-native-keyboard-controller` (behavior "padding") or its
  `KeyboardStickyView`. The Android back button closes it (`BackHandler`). Contents:
  - the title "Ask"; with a context, a removable chip "About: {subject}";
  - three suggestion chips that ask straight away, so most questions need no typing. With a context:
    "What does this mean?", "How do I say it?", "Explain the grammar". Without one: "How do I say
    hello?", "What is sandhi?", "What are the cases?". On Śloka: "What does this verse mean?", "Split
    it into words", "What metre is this?";
  - a multiline input with a send icon button;
  - the answer: engine answers keep the sūtra cards, with the badge text "From the grammar engine";
    model answers show `plain(data.explanation)` with no badge; an "Ask something else" button.
  - Remove the hint paragraph at `AskSheet.tsx:114`.
- **Questions with no context.** The current backend needs a subject, so until the backend change is
  deployed, send `surface = "general"` and `subject = question`. After it's deployed, send an empty
  subject.

**Backend (keeps the old app working):**
- `explain.py`: when `subject` is empty but `question` isn't, don't return 422; skip the engine route
  and use a general prompt. Both empty still returns 422.
- `explainer.py`: add a general-question version of the prompt ("A beginner asks a question about
  Sanskrit. Answer it.") with the same rules (two or three short sentences, the answer language, no
  grading). Add "Never use em dashes." to `_SYSTEM_PROMPT` (line 60) and to the new prompt.
- Tests in `backend/tests/` with the model mocked: empty subject plus a question returns 200; both
  empty returns 422; `surface="general"` with the question as the subject (the app's interim path)
  still returns an answer.

**Done when** the bubble shows and can be dragged on Home, Path, Play, Grammar, Read, Varnamala and in
lessons; a tap always opens the sheet; a suggestion chip returns an answer; typing works with the
keyboard open; back closes it; no answer contains an em dash.

---

## 6. Daily word without typing

Files: `mobile/src/screens/DailyWord.tsx`, `mobile/src/components/VarnaGrid.tsx`,
`backend/app/services/daily_word.py`, `backend/app/routers/daily_word.py`, `backend/app/schemas.py`.

**Why it's "not working / not good":**
1. The guess has to be typed in Devanagari (`DailyWord.tsx:172`). Most learners can't.
2. Length is counted in Unicode code points, not letters: `"word_length": len(word.answer)`
   (`daily_word.py:111`). पुस्तक is 6 (`प ु स ् त क`), संस्कृत is 7, चन्द्र is 6. The learner must type
   exactly that many code points, and Home says "A 6-sound word".
3. Scoring is per code point, so result tiles hold lone vowel signs and viramas (`ु`, `्`).
4. The tile flip animates `rotateX` from 0 to 180deg (`VarnaGrid.tsx:114`), so each revealed letter
   ends upside down. The shared value is also set during render (line 108).
5. Past guesses vanish when you come back: GET returns only `guesses_used`, and `DailyWordPlay` stores
   no guesses. The board shows "3/6" with no rows.
6. With no word (`available: false`) the screen still shows an empty board and the input.

**The game to build: tap letters from a bank.**
- Show the clue large ("means “lotus”"), a row of empty slots (one per akṣara), and a bank of 6 to 10
  akṣara tiles: the answer's akṣaras plus near-misses on the mouth-map.
- Tap a bank tile to fill the next slot (the bank tile greys out); tap a filled slot to send it back;
  a backspace button; "Check" once every slot is full.
- Each checked row shows each slot's state with a colour and a glyph or word, never colour alone:
  Right, Close (one step away on the mouth-map; name the axis: voicing, aspiration, place or length),
  Elsewhere, Not in the word. Keep six tries.
- Flip from `rotateX(90deg)` to `0deg` (or scale in), started in a `useEffect`.
- Save checked rows in AsyncStorage under the puzzle's date so reopening restores the board. (Keeping
  them on the server is optional and needs an Alembic migration adding a JSON `guesses` column to
  `daily_word_plays`.)
- Remove the subtitle "Daily word · scored on the mouth-map grid" and the "Hint:" prefix. The solved
  note "You read the mouth map perfectly. Sådhū!" (it also has a typo) becomes "साधु! Solved."

**Backend** (the app already in testing must keep working):
- Add `aksharas(word) -> list[str]`. This regex handles every curated word (checked on all 30 in
  `backend/app/seeds/daily_words.py`, joining back to the original):
  ```python
  C = "[क-हक़-य़]़?"          # consonant, optional nukta
  AKSHARA = re.compile(
      "(?:" + C + "्)*" + C + "[ा-ौॢॣ]?[ँ-ः]?"  # conjunct + sign
      "|[अ-औॠॡ][ँ-ः]?"                               # vowel letter
      "|(?:" + C + "्)+$"                                                     # final half letter
  )
  ```
  It gives पुस्तक → पु स्त क, संस्कृत → सं स्कृ त, चन्द्र → च न्द्र, विद्या → वि द्या, भ्राता → भ्रा ता,
  वृक्ष → वृ क्ष, अग्नि → अ ग्नि, पर्वत → प र्व त. Put these in unit tests.
- `GET /daily-word` adds `letters` (the akṣara count) and `bank` (akṣara strings). The bank is the
  answer's akṣaras plus one distractor for each: move the first consonant one step on the grid with
  `app/services/varna_distance.py` (क to ग or ख, and so on), or swap vowel length (ि/ी, ु/ू).
  De-duplicate, shuffle with `random.Random(date)` so it's the same all day, cap at 10.
- `POST /daily-word/guess` accepts `{guess, mode: "akshara"}`. In that mode compare akṣara lists:
  exact; present (counting repeats); near when the first consonants are at most one step apart on
  the grid and the rest of the akṣara matches, or only vowel length differs (axis "length"); otherwise
  absent. Each tile's `character` is the whole akṣara. Without `mode`, keep today's code-point
  behaviour for the old app.
- Tests: segmentation, the bank is stable for a date, near / present / absent cases, legacy mode
  unchanged.
- Order: deploy the backend first (it's backward compatible), then release the app. If the app ever
  gets a puzzle with no `bank` (old backend), fall back to the current text input so the screen never
  breaks.

---

## 7. Varnamala (the alphabet)

Files: `mobile/src/screens/Varnamala.tsx`, `mobile/src/components/VocalTract.tsx`, `mobile/src/phonetics.ts`.

**What's wrong:**
- The order is: an intro paragraph, a "Write these letters →" button, "स्पर्श · The 5×5 stops" with a
  coordinates paragraph, the 5×5 grid, and only then the mouth animation (line 295, and only after a
  letter is picked), then vowels, then "Others". A tap plays the sound and starts the 2.2-second
  animation below the grid, so it has finished by the time you scroll to it.
- "Others · अयोगवाह" (line 468) labels य र ल व श ष स ह as ayogavāha; only ं and ः are.
- Paragraphs to remove: the intro (260-263), the coordinates note (282-286), the minimal-pair hint
  (329-332), the long articulation summary under the diagram, and the dashes in the phase captions
  (`VocalTract.tsx:124-137`, `phonetics.ts:182-188`).

**Target layout:**
- A **panel pinned at the top**, outside the ScrollView, always visible: the vocal-tract drawing on the
  left (about 170 to 190dp tall, keeping its 300:260 shape) and, on the right, the letter (48px), its
  IAST, a chip with its place in the place colour (`PLACE_COLORS`), and three icon buttons: replay
  (sound and animation), slow, and mic (the existing pronunciation attempt). Under it, one short
  caption line for the current phase, no dashes. No summary paragraph.
- Select अ (or क) on load so the panel is never empty.
- Below it, the scrolling letters in this order: Vowels स्वराः (14), Consonants व्यञ्जनानि (the 5×5
  grid of stops and nasals, rows tinted in their place colours), Semivowels अन्तःस्थाः (य र ल व),
  Sibilants ऊष्माणः (श ष स ह), Anusvāra and visarga (ं ः). The API groups are `vowels`,
  `consonants` (the 20 stops), `nasals` (5) and `others` (the other 10; their `kind` is semivowel,
  sibilant, aspirate, anusvara or visarga).
- A tap on a letter: haptic, highlight the cell, update the panel, start the animation at once, play
  the sound. The API already sends `audio_url` for each letter (`backend/app/routers/varnamala.py`),
  but the app's `VarnamalaChar` type doesn't include it, so every tap is a text-to-speech round trip
  (about 900 ms according to the code comment). When `audio_url` is non-empty, play it directly and
  fall back to `speak()`.
- Writing: a small "Write" icon button in the panel or the header, not a full-width outlined button.
- Cells at least 44dp, letter 20 to 24px, IAST 10px.

**Done when**, on a 360×640 phone, tapping any letter shows its animation without scrolling, the
animation stays in view the whole time, and vowels come before consonants.

---

## 8. Writing

Files: `mobile/src/screens/Writing.tsx`, `mobile/src/components/writing/WritingCanvas.tsx`,
`mobile/src/components/writing/PhotoCapture.tsx`, `mobile/src/services/inkRecogniser.ts`,
`mobile/src/services/photoRecogniser.ts`; backend `backend/app/routers/writing.py`,
`backend/app/services/sarvam.py`, `backend/app/services/quota.py`, `backend/app/config.py`,
`backend/app/routers/legal.py`.

### Why drawing on the phone doesn't work

1. **The canvas never draws.** `Gesture.Pan().onBegin/onUpdate/onEnd` (`WritingCanvas.tsx:81-95`) call
   React state setters. With Reanimated installed, gesture callbacks "are automatically workletized and
   run on the UI thread" (Gesture Handler docs), where those setters can't run. Fix:
   `Gesture.Pan().runOnJS(true)…`, or keep the points in shared values and draw the path with
   `useAnimatedProps`.
2. **Strokes scroll the page.** The canvas sits in a vertical ScrollView (`Writing.tsx:115`). Use
   `ScrollView` from `react-native-gesture-handler` with a ref and `pan.blocksExternalGesture(scrollRef)`,
   or lay the screen out so the canvas area doesn't scroll. Remove the nested `GestureHandlerRootView`
   (`WritingCanvas.tsx:133`); the app root already has one.
3. **The first "Check" does nothing.** The ML Kit adapter starts downloading its model and returns
   `null` (`inkRecogniser.ts:96-105`), so nothing appears. Start the download when the screen opens,
   show "Preparing handwriting…" on the Check button until it's ready, and if the download fails use
   the stroke-template matcher (`strokeMatcher.ts`) instead of returning null.

### A clearer layout

- Header: a segmented control for Letters · Mātrās · Words, and "3 / 14" with previous and next arrows.
- The target: the letter large (96px), its IAST, the meaning for words, and a "Watch strokes" button
  that plays `StrokePathPlayer` in the same card.
- Two tabs with icons: Draw (brush) and Photo (camera). Remove the extra "Wrote it on paper instead?
  Photograph it →" link.
- Draw: a square canvas (full width minus padding, at most 340dp) with the faint letter and the
  headline guide; Undo, Clear and Check under it.
- Photo: the viewfinder with its frame guide and a round shutter button; after the shot, the thumbnail
  and "Checking…".
- Result, one line: correct is "Correct" (green); unsure is "Couldn't read that clearly. Try again."
  (violet, never red); wrong is "That looks like क. Try again." (red, only when confident). Then Try
  again and Next.
- Remove the subtitle "Trace the strokes, then draw it yourself. Nothing you write leaves this device.",
  the photo hint paragraphs (`PhotoCapture.tsx:115-117`, `134-136`) and the "From paper — coming with the
  dev build" card.

### Checking photos with Sarvam Document Intelligence

The owner wants photos checked on the backend with Sarvam. Today a photo is read on the phone by ML Kit
and only the recognised text goes to the server (`POST /writing/attempt`), which grades it. Sending
the photo reverses an earlier decision (photos never leave the device) and changes what the privacy
policy promises, so this has three parts: backend, app, and policy.

**Facts checked on docs.sarvam.ai (2026-09-30):**
- Base URL `https://api.sarvam.ai/doc-ai/v1`, header `api-subscription-key`.
- `POST /job/digitise`, multipart fields `file`, `language` (`sa-IN` is listed; `hi-IN` is worth
  comparing), `output_format` (`md`). It returns `{"job_id": ..., "status": "pending"}`.
- `GET /job/{job_id}/status` gives `status`: `pending`, `running`, `completed`,
  `partially_completed`, `failed` or `rejected`.
- `GET /job/{job_id}/download-url` gives `{"method": "GET", "url": ...}`, a ZIP holding the main file,
  `metadata/page_NNN.json` and `manifest.json`.
- Accepts PDF, PNG and JPEG. ₹0.5 per page. **10 requests per minute on every plan**; upgrading
  doesn't raise it. Processing time isn't documented; the docs' example polls every 5 seconds.

**Backend:**
- `SarvamClient.digitise_image(data, filename, mime, language="sa-IN")` in `sarvam.py`: create the
  job, poll the status every 2 seconds or so (give up after about 40), get the download URL, fetch the
  ZIP (the signed URL needs no API key), return the text of the `.md` inside. Log the raw responses
  once while developing to confirm the field names. Handle 429.
- `POST /writing/photo-check` in `routers/writing.py`, multipart `item_id` and `file`: reject files
  over 4 MB; `check_and_consume(db, learner, "doc_pages", 1, surface="writing_photo")`; call Sarvam;
  refund on failure; normalise the text (NFC, Devanagari only, no spaces, dandas or markdown); grade
  with `grade_writing(item.devanagari, text, confidence, "photo")`, passing 0.95 for an exact match and
  0.5 otherwise, so a mismatch comes back `unsure` rather than `wrong` (the existing photo policy);
  record the attempt as `/writing/attempt` does (move that code into a shared helper); return the
  usual response plus `recognised_text`. Never write the image to disk or to the logs.
- `quota.py` and `config.py`: a new kind `doc_pages` with a per-learner daily limit (30, say) and
  `price_doc_inr_per_page = 0.5`, included in `_price_inr` and `_cost_inr` so it counts toward the
  ₹300 daily service budget.
- Tests with the Sarvam client mocked: correct, unsure, Sarvam failure (refund, then 503), quota
  exceeded (429).

**App:**
- After the photo is taken, upload it with `FormData` (`{ uri, name: "writing.jpg", type:
  "image/jpeg" }`) to `/writing/photo-check`, following the existing multipart helper `uploadSpeech` in
  `mobile/src/api/client.ts`. Show "Checking…".
- If the endpoint isn't there yet (404 or 405), is rate-limited (429) or fails (5xx or no network),
  fall back to reading the photo on the phone with ML Kit and calling `/writing/attempt`, as today.
- Under the result, show "We read: {recognised_text}".

**Policy (owner action before this reaches testers):**
- `legal.py:85-87` says photos never leave the phone and `legal.py:107-108` lists only ML Kit. Rewrite:
  photos you choose to check are sent to Sarvam AI to be read and then discarded, and we keep only the
  recognised text. Add Sarvam AI (reading photographed handwriting) to the list of processors and
  update `UPDATED`.
- In Play Console, App content, Data safety: declare Photos (collected, processed ephemerally, not
  shared). Do this before the build that uploads photos rolls out.

---

## 9. Path

File: `mobile/src/screens/Path.tsx`.

- **Top padding bug.** `<SafeAreaView edges={["bottom"]}>` (line 173) leaves out the top inset, so
  "Your Path" sits under the status bar. Use `edges={["top"]}`; the tab bar takes care of the bottom.
- **"[staged]" lessons.** The local database has 102 lessons titled "[staged] …" (imported guide
  pages at rank 900), and `/units` returns every lesson without filtering
  (`backend/app/services/lessons.py:100-104`). Check production's `/units`. If they are there, filter
  them on the server (title prefix, or rank 900 and above), or at least in the app.

**Netflix-style layout** (the owner: "this list like thing looks AI generated and boring"):
- Header: the title "Path" and a chip "Unit 2 of 11".
- A hero poster for the current unit (the first with progress below 1): a full-width gradient card in
  the unit's accent, the unit title in Devanagari (large) over a big faint letter, the English title,
  the next lesson, a progress bar, and a white "Continue" pill with a play icon.
- One horizontal rail per unit, in order. The rail header reads "Unit 1 · वर्णाः · Sounds" with its
  progress %, or a lock icon when locked. Cards about 150×190dp: a gradient in the unit's accent (units
  take saffron, teal, sage, rose, gold and slate in turn), the lesson number, a faint big letter,
  `title_hi` (two lines), `title_en` (one line), and at the bottom "8 steps" and a video badge.
- Locked units stay visible, dimmed, with a lock; tapping one says "Finish Unit N first". Keep today's
  unlock rule (the previous unit has any progress).
- The lesson sheet, replacing the two large pill buttons: a drag handle, `title_hi`, `title_en`, chips
  for steps and videos, then two tinted tiles side by side (radius 16): Learn (book icon, "N steps")
  and Practice (target icon, "Quiz"). Tapping the backdrop or pressing back closes it.
- Remove the subtitle "Eleven units, from the mouth-map to the sentence." and "Check your connection —
  your progress is safe."
- Keep pull-to-refresh and `refetchOnFocus`. A vertical `FlatList` of rails with horizontal
  `FlatList`s inside.

---

## 10. The left menu (drawer) and Progress

Files: `mobile/src/navigation/AppDrawer.tsx`, `mobile/src/screens/Settings.tsx`,
`mobile/src/screens/Progress.tsx`.

Today the drawer has a row "Learn" whose hint literally says "Tabs", a row "Progress / Streak ·
mastery", and then the whole Settings panel squeezed in as cards (Account, Sound & feel, Text size,
About with a YouTube paragraph). Its top padding is a fixed 32 (line 164) instead of the status-bar
inset.

**Is Progress connected to the backend?** Mostly, with problems worth telling the owner:
- Live data: `/me` (profile, ratios, mastery), `/progress/daily` (today's XP), `/progress/streak`,
  `/progress/history` (the calendar).
- The "Streak" number is `learner.streak`, the correct-answer count from §4, not days.
- "Use a freeze" (`POST /progress/repair`, `backend/app/routers/progress.py:97-111`) adds 1 to that
  count whenever a freeze is left, whether or not a day was missed. It doesn't repair anything, and the
  card's promise ("A missed day can be repaired within 48 hours…") isn't what the code does.
- Achievements live only on the phone (AsyncStorage, `mobile/src/services/achievements.ts`), so they
  are lost on reinstall or a new phone.
- "Sanskrit vs Bridge" is the tutor's language mix, not progress.

**Drawer:**
- Header: an avatar circle (first letter on a saffron gradient), the first name (`firstName()`), and
  one small line with the day streak.
- Rows, icon and label only: Home, Progress, Settings, Licences, Privacy policy. The current row is
  tinted.
- Footer: Sign out. Use `useSafeAreaInsets()` for the top and bottom padding.
- Move Settings out of the drawer into its own screen (a drawer screen with a header, like Progress)
  with sections: Account (name, Sign out, Delete account), Sound and haptics, Reduce motion, Text size,
  About (Licences, Privacy, YouTube Terms). Keep one short line for YouTube, "Videos play on YouTube
  under YouTube's Terms of Service.", because the code cites YouTube's API policy requiring the Terms
  link and binding users to them (`Settings.tsx:216-230`). Keep the delete-account confirmation
  (it's a destructive action), shortened.
- Remove "XL is elder mode — Sanskrit body text never drops below 18pt." and "Sanskritam — learn
  Sanskrit by evidence, not guesswork."

**Progress:**
- Stat tiles at the top: day streak (`dayStreak`), today (a ring with XP over the goal), and days
  practised in the last 90.
- Keep the 35-day calendar; add weekday headers; sage for a practised day, a saffron ring when the
  goal was met.
- Remove the Streak freezes card (lines 412-434), unless the owner wants the feature rebuilt on the
  server properly.
- Replace the mastery "rings" (`MasteryRing`, a rotating border that doesn't show a proportion) with
  `ProgressRing`.
- Clear labels: "Tutor's Sanskrit mix" with its percentage, and "Devanagari in lessons" for the script
  dial.
- Feature detail: show the top six with readable names, or drop it (ids like `case_nominative` aren't
  for learners).
- Remove paragraphs: the freeze explanation, "Your ceiling: … The system drifts beneath it as you
  grow.", and "No practice recorded yet — your days will fill in here as you learn." (make it "No
  practice yet.").

---

## 11. Copy sweep (the whole app)

Find what to fix:
```bash
cd mobile
grep -rn "—" src --include=*.tsx --include=*.ts | grep -vE ":[0-9]+:\s*(//|\*|/\*)"
grep -rnE "^\s{6,}[A-Z\"'][^{}=;<>]{55,}$" src --include=*.tsx
```
The first lists about 120 non-comment lines with em dashes (strings, JSX text, accessibility labels);
the second lists long JSX paragraphs. Known ones beyond the screens above: `Play.tsx` (the subtitle "The
lab — explore freely…", the closing note, several mode rules), `Pingala.tsx` (90-92, 114, 134-137,
176, 208, 219), `Challenge.tsx` (246, 324), `Lesson.tsx` (216, 222), `StoryDeck.tsx` (184),
`Conversation.tsx` (471, 538-541), `Reader.tsx` (776), `WordOrder.tsx` (80, 145), `VerdictSheet.tsx`
(112), `VideoSection.tsx` (183, 195, 237, 314), `SessionShell.tsx` (94), `components/steps/*`
("Practice — not graded." and similar), `utils/announce.ts` (20, 22), `SandhiVisual.tsx` (119),
`Paradigm.tsx` (92), `Licences.tsx` (43), `AskSheet.tsx` (78, 207).

Rewrite rather than swap the dash: "Couldn't reach the verse." rather than "Couldn't reach the verse —
check your connection."; "Practice. Not graded." or nothing.

Text from the server: render through `plain()` in the Ask sheet (explanations), Home and Path (unit
blurbs), `StoryDeck` cards, lesson step prose (`components/steps/*`), `grammar/BlockRenderer.tsx`
(which also puts "— " before quote sources, line 86), `VerdictSheet` explanations and Conversation
explanations. Don't run `plain()` over whole API responses: scansion data uses "—" as a long-syllable
mark (`Shloka.tsx:39`).

In the backend, add "Never use em dashes." to the explainer and tutor prompts.

---

## 12. Padding and safe areas

| Screen | Today | Fix |
|---|---|---|
| Home, Talk, Play, Grammar, Read (tabs) | `edges={["top"]}` | fine |
| Path (tab) | `edges={["bottom"]}` | `["top"]` |
| DailyWord (no header) | top and bottom | fine |
| Stack screens with a header (Varnamala, Writing, Lesson, Challenge, …) | the header handles the top | fine |
| Drawer content | fixed `paddingTop: 32` | `insets.top` |
| Scrolling screens that show the Ask bubble | varies | `paddingBottom` of at least 120 |

Horizontal padding is 20 to 24 everywhere. Path rails can scroll to the screen edge but should start
at the same inset as the title.

---

## 13. Order of work and checks

1. Design system (§2): theme accents, `Button`, `shadow.button`.
2. Quick fixes: the Path top inset (§9), the writing canvas (`runOnJS` and the scroll conflict, §8), the
   Ask bubble working everywhere (§5, app side).
3. Home (§4) and Login (§3).
4. Varnamala (§7).
5. Path redesign (§9); drawer, Settings screen and Progress (§10).
6. Daily word (§6): backend first, then the app.
7. The Ask backend change (§5) and the Sarvam photo check (§8) with the policy update.
8. Copy sweep (§11) and the padding check (§12).

After each step: `npx tsc --noEmit -p mobile`; the backend tests; a device build
(`npx eas-cli build --platform android --profile preview` gives an installable APK) checked on a small
(360dp) and a large phone; screenshots of every changed screen for the owner. Don't change
`versionCode` again until the next Play upload (it is 3 now, for the icon release).

---

## Sources checked on 2026-09-30

- Play Console Help, preview assets (the listing icon doesn't replace the launcher icon; 32-bit PNG with
  alpha, 512×512, up to 1024 KB): https://support.google.com/googleplay/android-developer/answer/9866151
- Expo SDK 57 splash screen: https://docs.expo.dev/versions/v57.0.0/sdk/splash-screen/ and app icons:
  https://docs.expo.dev/develop/user-interface/app-icons/
- Sarvam Document Intelligence: https://docs.sarvam.ai/api-reference-docs/document-intelligence ,
  https://docs.sarvam.ai/api/api-guides-tutorials/document-intelligence/overview , pricing
  https://docs.sarvam.ai/api/getting-started/pricing , rate limits
  https://docs.sarvam.ai/api/getting-started/ratelimits
- Gesture Handler with Reanimated:
  https://docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/reanimated-interactions/
