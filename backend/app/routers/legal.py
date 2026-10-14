"""Public legal pages Google Play requires: the privacy policy (/privacy) and
the account-deletion page (/delete-account). Plain HTML, no auth, no learner
data — the Play listing links here, through the Cloudflare worker in
deploy/cloudflare/legal-site, and the app's Privacy screen shows the same page.

Every claim is checked against the code, not borrowed boilerplate:
- audio is not retained after transcription (routers/speech.py,
  retain_raw_audio=False); a practice recitation is transcribed by Sarvam
  (SCORER_URL=sarvam, services/scorer_client.py), its pauses and pace are
  measured on our server (services/recite_timing.py), and it is not kept
  (routers/recite.py stores only the result in ReciteAttempt); while
  recording, live captions stream the audio to Sarvam through our server
  (services/recite_stream.py), which keeps nothing but a seconds count;
- drawn handwriting never leaves the device, and a photo the learner chooses to
  check is sent to Sarvam to be read and is not kept on our side (routers/writing.py
  photo-check; models.WritingAttempt stores only the recognised text);
- Ask (routers/ask.py, services/ask_live.py) sends the question, and a birth chart
  or a match when one is asked for, to Google's Gemini; nothing per learner is
  stored but a usage count (models.UsageEvent); an answer is stored for others only
  when ask_live.shareable() allows it, with no learner id (models.AskAnswer);
  a birth chart or a match is marked private (ask_live.py) and so never takes the
  free route unless gemini_free_allow_personal is turned on (the setting's default
  is pinned in tests/test_legal_pages.py; the sentence on this page depends on it);
- competitions (routers/competitions.py): sign-in, public name, 18+, rules and
  recording consent are stored with the time (models.LearnerPublic); the best
  counted recording of each verse is kept privately and purged 30 days after
  the results (services/competitions.purge, competition_sets.entry_audio_keys); the camera summary is four ratios and an app
  version (the phone deletes each frame after the on-device face check,
  components/recite/EyesClosedTest.tsx); certificates are public pages;
- deletion covers every learner-owned table (routers/me.learner_owned_models),
  and the private competition recordings.
Change the code, change the page.
"""

from html import escape

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from app.config import settings

router = APIRouter()

UPDATED = "14 October 2026"

_STYLE = """
body{margin:0;background:#FFF8EE;color:#2B2118;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:44rem;margin:0 auto;padding:2rem 1.25rem 4rem}
h1{font-size:1.9rem;line-height:1.2;margin:0 0 .25rem}
h2{font-size:1.2rem;margin:2rem 0 .5rem}
.meta{color:#6B5B4B;margin:0 0 1.5rem}
li{margin:.35rem 0}
a{color:#B5441A}
.warn{background:#FDE7E3;color:#8A1F11;padding:.1rem .35rem;border-radius:.25rem}
"""


def _contact() -> str:
    email = settings.legal_contact_email.strip()
    if not email:
        # Visible, never blank: a policy with no contact must not look finished.
        return '<span class="warn">contact email not configured (set LEGAL_CONTACT_EMAIL)</span>'
    e = escape(email)
    return f'<a href="mailto:{e}">{e}</a>'


def _page(title: str, body: str) -> HTMLResponse:
    return HTMLResponse(
        f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(title)}</title>
<style>{_STYLE}</style>
</head>
<body><main>
{body}
</main></body>
</html>"""
    )


@router.get("/privacy", response_class=HTMLResponse, include_in_schema=False)
def privacy_policy() -> HTMLResponse:
    publisher = escape(settings.legal_entity_name)
    contact = _contact()
    return _page("Sanskritam — Privacy Policy", f"""
<h1>Privacy Policy</h1>
<p class="meta">Sanskritam · published by {publisher} · last updated {UPDATED}</p>

<p>Sanskritam is an app for learning Sanskrit. This policy explains what the app collects, why, who
processes it for us, and how to delete it. Questions and requests: {contact}.</p>

<h2>What we collect</h2>
<ul>
<li><strong>Your account.</strong> If you start without signing in, the app creates a random ID on your
device and an account linked to it. If you sign in with Google or Apple, we receive an account identifier
and your name, which becomes your display name (if no name is shared, we use the part of your email
address before the "@"). We don't store your email address.</li>
<li><strong>Your learning.</strong> Your answers, scores, lesson and review progress, streaks, daily
activity, and settings such as your language mix and time zone, so the app can check your answers, adapt
to you and keep your progress.</li>
<li><strong>Your voice.</strong> When you use a speaking feature, the recording is sent to Sarvam AI to be
turned into text. We keep the transcript and the result, and don't store the recording on our servers.</li>
<li><strong>Conversations with the tutor.</strong> What you say or type to the tutor in Practise, and its
replies, are stored with your account and sent to Sarvam AI's language model to write replies and
explanations.</li>
<li><strong>Questions in Ask.</strong> Your question, its language, any earlier turns of the same
conversation and, if you attach it, the text of your screen are sent to Google's Gemini models, which write
the answer. We send no name or account ID with them, and we don't keep your question with your account.
If you ask for a birth chart or a match, the birth date, time and place you enter, and the chart worked out
from them, are sent with that question; we use them for that answer and don't store them. To find verses in
the app's books that fit a question, the question is also sent to Google's embedding model. A short,
general question (200 characters or fewer, with no personal details) and its answer may be stored without
any account details and shown to other learners who ask the same thing.</li>
<li><strong>Reciting a verse.</strong> While you recite, the sound goes through our server to Sarvam AI,
which turns it into the rough text shown on screen as you speak. When you stop, the whole recording is sent
to Sarvam AI to be turned into text, and our server marks that text syllable by syllable and measures the
pauses and pace from the recording. It is not sent to Google's AI models, and we don't keep a practice
recording. We keep the result: the score and its parts, which syllables were right or wrong, how long it
was, and when the verse is next due for review.</li>
<li><strong>Competitions.</strong> Entering is optional and free, and only for people aged 18 or over who
sign in with Google or Apple. To enter you choose a public name, say that you are 18 or over, accept the
rules and agree to be recorded; we keep the name, each of those confirmations with the time, and the version
of the rules. Your public name and score are shown to other learners on the leaderboard, and on
certificates, which anyone with the link can open. Each attempt is scored the same way as
a practice recitation (see "Reciting a verse"). The front camera
checks that your eyes are closed: each picture is checked on your phone and deleted at once, and no picture
leaves it. Only a few totals are sent and kept with the attempt: the share of the time a face was seen,
your eyes were closed, a second face was seen and your mouth was moving, with the app version. We keep your
best counted recording of each verse in private storage until 30 days after the results, so entries can be checked, then
delete it; we may listen to it to check an entry. If you win a prize, we will ask you for the details needed
to send it and use them only for that.</li>
<li><strong>Handwriting.</strong> Letters you draw on the screen are read on your device. Only the
recognised letter and a confidence score reach us; the drawing never leaves your phone. If you choose to
check a photo of your handwriting, the photo is sent to Sarvam AI to be read. We keep the letter it read
and don't store the photo on our servers.</li>
<li><strong>Notifications.</strong> If you turn on reminders, a push token for your device, so we can send
them.</li>
<li><strong>Your place, for location-aware features.</strong> The app needs location access on your
device to work out your local tithi, sunrise and festival dates. If you allow it or pick a city, the app
sends an approximate place with each date query so the server can compute the correct times. It is used for
that answer and not stored. You can turn off location at any time in your device settings, though date
features will stop working.</li>
<li><strong>Your screen, only when you attach it.</strong> When you attach a screen to a question, its
text is read on your phone and only the text is sent, with your question, as described under Ask.</li>
<li><strong>Files on your device.</strong> The app may read and write lesson content and audio files on your
device so you can use them offline. We decide which files to store; the app does not browse your personal
files.</li>
<li><strong>Audio playback settings.</strong> The app adjusts your device's audio settings to play
pronunciations, chants and music clearly, and to keep a chant playing, with lock-screen controls, when
the screen is off. No listening data is collected.</li>
<li><strong>Usage limits and errors.</strong> How many characters, seconds of speech or recitation and AI
requests you use, so we can enforce daily limits; and server error records (which request failed and a
technical trace, with no answers, recordings or personal details).</li>
</ul>

<h2>What we don't do</h2>
<p>No ads. We don't sell your data, share it for advertising, use your device's advertising ID, or track
you across other apps and websites.</p>

<h2>Who processes data for us</h2>
<ul>
<li><strong>Sarvam AI</strong> — speech-to-text (including recitations, live and after you stop),
text-to-speech, the tutor's language model, and reading photos of your handwriting when you choose to check
one.</li>
<li><strong>Google (Gemini)</strong> — answers your questions in Ask and turns them into numbers to find
matching verses. Some questions go through Google's free Gemini service, whose terms let Google read what
is sent and use it to improve its products. A request with birth or match details never uses that service.
Please don't put personal details in a question, or attach a screen that shows them.</li>
<li><strong>Google Cloud</strong> — runs our server in its Mumbai region.</li>
<li><strong>Cloudflare</strong> — stores and delivers the lesson and chant audio files, and routes requests
for this page.</li>
<li><strong>Supabase</strong> — hosts our database.</li>
<li><strong>Google Sign-In and Sign in with Apple</strong> — only if you choose to sign in with them.</li>
<li><strong>YouTube</strong> — lesson videos play in YouTube's embedded player. When you play one, YouTube's
Terms of Service and Google's Privacy Policy apply.</li>
<li><strong>Google ML Kit</strong> — reads what you draw on your device, and checks that your eyes are closed
during a competition recitation; its recognition models are downloaded from Google.</li>
</ul>
<p>Some of these providers may process data outside India.</p>

<h2>How long we keep it, and deleting it</h2>
<p>We keep your data while your account exists, except that a competition recording is deleted 30 days
after the results. You can delete your account at any time in the app: open the side menu to reach
<strong>Settings</strong> and tap <strong>Delete account</strong>. That removes your account and learning
data, your recitation results, your competition entries, public name and certificates, and any competition
recording we still hold, from our systems straight away; backup copies, if any, are overwritten within 30
days. You can also ask us by email — see <a href="/delete-account">how to delete your account</a>.</p>

<h2>Children</h2>
<p>Sanskritam is not directed to children under 13, and we don't knowingly collect their data. If you
believe a child under 13 has used the app, contact us and we'll delete the account. Competitions are only
for people aged 18 or over; younger learners can learn and practise but cannot enter.</p>

<h2>Security</h2>
<p>Data travels between the app and our server over encrypted connections (HTTPS), and access to our
systems is restricted.</p>

<h2>Your choices</h2>
<p>You can ask us to access, correct or delete your data by writing to {contact}. We reply within 30
days.</p>

<h2>Changes</h2>
<p>If this policy changes, we'll update the date at the top of this page.</p>
""")


@router.get("/delete-account", response_class=HTMLResponse, include_in_schema=False)
def delete_account() -> HTMLResponse:
    publisher = escape(settings.legal_entity_name)
    contact = _contact()
    return _page("Delete your Sanskritam account", f"""
<h1>Delete your Sanskritam account</h1>
<p class="meta">Sanskritam · published by {publisher}</p>

<h2>In the app</h2>
<ol>
<li>Open the side menu to reach <strong>Settings</strong>.</li>
<li>Tap <strong>Delete account</strong>, then <strong>Delete</strong> to confirm.</li>
</ol>
<p>Your account and learning data are removed from our database straight away, and the app clears what it
stored on your phone.</p>

<h2>Without the app</h2>
<p>Email {contact} with the subject "Delete my Sanskritam account" and your display name as shown in
Settings. We don't store email addresses, so the display name is how we find your account; if we can't
tell which account is yours, we'll ask you a question about it before deleting anything. We delete it
within 30 days and reply to confirm.</p>

<h2>What is deleted</h2>
<ul>
<li>Your account and sign-in identifiers</li>
<li>Your answers, scores, lesson and review progress, streaks and daily activity</li>
<li>Your conversations with the tutor and your speaking-practice transcripts</li>
<li>Your handwriting results</li>
<li>Your recitation results and the review schedule for the verses you recited</li>
<li>Your competition entries, public name, confirmations, certificates, monthly-winner records, and any
competition recording we still hold (a certificate page stops working)</li>
<li>Your usage counts and device push tokens</li>
</ul>

<h2>What is kept</h2>
<p>Nothing that identifies you. Anonymous content statistics (for example, where learners got stuck) lose
any link to your account, and server error records contain no personal details. A general question and its
answer stored for other learners carry no account details, so they stay. Backup copies, if any, are
overwritten within 30 days.</p>
""")
