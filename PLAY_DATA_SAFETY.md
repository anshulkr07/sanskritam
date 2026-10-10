# Play Console: Data safety form, facts from the code (app 1.2.0)

Written 2026-10-10 to go with the privacy page (`backend/app/routers/legal.py`, "10 October 2026").
Each row says what the code does, with the file that does it. **Which Play category and tick-box a
fact belongs in is not decided here**: those rows are marked *owner to confirm*, because Google's
definitions of "collected", "shared" and "processed ephemerally" decide them, and a wrong tick is
the owner's to answer for. Nothing below was entered into Play Console.

Permissions declared (`mobile/app.json`): RECORD_AUDIO, CAMERA, INTERNET, MODIFY_AUDIO_SETTINGS,
READ/WRITE_EXTERNAL_STORAGE, and location while the app is in use (added by the expo-location plugin;
`Accuracy.Lowest`, `mobile/src/services/place.ts`). Not declared: background location, contacts,
SMS, calendar, advertising ID, billing.

## What leaves the phone, and where it goes

| Data | When | Goes to | Kept by us | Optional | Code |
|---|---|---|---|---|---|
| Random device ID, account ID | always (account starts without sign-in) | our server (Google Cloud, Mumbai) | yes, until the account is deleted | no | `routers/auth_router.py`, `models.Learner` |
| Google or Apple sign-in identifier, display name | only if the learner signs in with one | our server | yes (no email address stored) | yes | `routers/auth_router.py` |
| Answers, scores, lesson and review progress, streaks, daily activity, settings (language mix, time zone) | while learning | our server (database on Supabase) | yes | no | `models.py` |
| Voice recording for speaking practice | a speaking feature | Sarvam AI (speech to text) | no recording; transcript and result kept | yes | `routers/speech.py` (`retain_raw_audio=False`) |
| Tutor conversation (Practise) | learner types or speaks | our server, Sarvam AI language model | yes | yes | `routers/conversation.py` |
| Ask question, language, earlier turns, attached screen text | learner asks | Google Gemini (free tier first, paid Vertex after); Google embedding model for book search | no per-person question text; a count only; general questions of 200 characters or fewer with no personal details may be stored without account details | yes | `routers/ask.py`, `services/ask_live.py`, `services/gemini_pool.py`, `models.UsageEvent`, `models.AskAnswer` |
| Birth date, time, place and the chart worked out from them | learner asks for a chart or a match | Vertex only (never the free tier while `gemini_free_allow_personal` is False) | not stored | yes | `services/ask_live.py` (`private`) |
| Recitation recording (practice) | learner recites a verse | scoring server we run | no recording; score, syllable results, duration and next review date kept | yes | `routers/recite.py` |
| Competition entry: public name, 18+ confirmation, rules acceptance, recording consent (each with time and rules version) | learner enters | our server | yes, until deletion | yes (needs Google or Apple sign-in) | `routers/competitions.py`, `models.LearnerPublic` |
| Competition recording | each attempt | scoring server; best counted one to private storage | best one until 30 days after the results, then deleted; only if a private bucket is configured | yes | `services/competitions.py` (`purge`), `services/storage.py` |
| Camera pictures for the eyes-closed check | during a competition attempt | nowhere: checked on the phone, deleted after each check | no pictures. Four ratios (face seen, eyes closed, second face, mouth moving) and the app version are sent and kept with the attempt | part of entering | `mobile/src/components/recite/EyesClosedTest.tsx` |
| Public name, rank, piece on a certificate | top-3 finish, monthly winner | public page `/certificates/<code>`, anyone with the link | yes, until deletion | part of entering | `routers/certificates.py` |
| Prize delivery details | only if the learner wins a month | asked outside the app (the app stores only a claim code and the public name, `models.MonthlyWinner`) | nothing collected by the app; the policy promises they are used only to send the prize | n/a | `models.MonthlyWinner`, `config.prize_contact_email` (unused so far) |
| Handwriting drawn on screen | writing practice | stays on the phone (ML Kit); recognised letter and confidence reach us | letter and confidence | yes | `routers/writing.py` |
| Photo of handwriting | learner chooses "check a photo" | Sarvam AI (reads it) | the letter it read; not the photo | yes | `routers/writing.py` |
| Approximate place | date features (tithi, festivals); learner picks a city or allows location | our server with each date query | not stored | yes | `mobile/src/services/place.ts`, `routers/places.py` |
| Push token | learner turns on reminders | our server | yes | yes | `mobile/src/services/push.ts`, `routers/notify.py` |
| Characters, seconds of speech, requests used | always | our server | counts only | no | `models.UsageEvent` |
| Server error records | when a request fails | our logs | request and trace, no answers, recordings or personal details | no | server logging |

Lesson videos play in YouTube's embedded player (YouTube's terms apply). Lesson and chant audio files are served
from Cloudflare (R2 and the CDN, `https://cdn.vedicvalor.com`); the learner's request for a file is visible to Cloudflare.

## Same facts, in Play's vocabulary (owner to confirm every mapping)

| Play category | What the app has that could belong here | Owner to confirm |
|---|---|---|
| Personal info: name, user IDs | display name; random ID; Google/Apple identifier; public name | whether the public name counts as "name" shown to other users |
| Personal info: email address | not stored | none |
| Audio: voice or sound recordings | speaking practice (Sarvam, not kept); recitation (scoring server, not kept); competition recording (kept privately up to 30 days after results) | "collected" yes for competition; for the others whether "processed ephemerally" applies |
| Photos and videos | camera frames never leave the phone; handwriting photo goes to Sarvam on request | the handwriting photo |
| App activity: in-app actions, user-generated content | answers, progress, tutor conversation, Ask questions (not stored per person) | which of these Google counts as "collected" |
| Location: approximate | place sent with a date query, not stored | whether not stored means not collected |
| Device or other IDs | push token; random device ID | none |
| App info and performance: crash logs, diagnostics | server error records only; no crash SDK in the app | none |
| Financial info | none handled by the app | none |
| Health and fitness, messages, contacts, calendar, files | none | none |

Shared with third parties (what the code sends, to whom): Sarvam AI (speech, tutor, handwriting photo),
Google (Gemini and embeddings; Google Cloud hosting; Google Sign-In; YouTube player; ML Kit models downloaded),
Apple (Sign in with Apple), Cloudflare (audio files), Supabase (database). *Owner to confirm* which of these
Google treats as "service providers" and not as sharing.

Security practices: data in transit uses HTTPS. In-app account deletion removes the account and learner-owned tables
at once (`routers/me.py`), plus any private competition recording. A web route exists for people without the app:
`/delete-account` on the same public domain as `/privacy`. Independent security review: none.

Children: the privacy page says the app is not directed to children under 13; competitions are 18+. India's DPDP Act
treats under 18 as children; the Play "target audience" answer and that age line are the owner's to settle.

## Before you submit

1. Deploy the backend with the new `/privacy` and `/delete-account`; open both on the public domain and confirm the
   contact email shows (not "contact email not configured").
2. Make the Play form agree with the privacy page; if they differ, the page is the one the code backs.
3. Do not describe recitation or competitions in the store listing until the 1.2.0 build is live.
