"""Public legal documents for the free Sanskritam release."""
from html import escape
from fastapi import APIRouter
from fastapi.responses import HTMLResponse
from app.config import settings
router = APIRouter()
UPDATED = "17 October 2026"

def _contact():
    email = settings.legal_contact_email.strip()
    return f'<a href="mailto:{escape(email)}">{escape(email)}</a>' if email else '<span>contact email not configured (set LEGAL_CONTACT_EMAIL)</span>'

def _page(title, body):
    return HTMLResponse(f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{escape(title)}</title>
<style>body{{margin:0;background:#fff8ee;color:#2b2118;font:16px/1.65 system-ui}}main{{max-width:46rem;margin:auto;padding:28px 20px}}h1{{line-height:1.2}}h2{{font-size:1.2rem;margin-top:2rem}}a{{color:#a13817}}</style></head><body><main>{body}</main></body></html>""")

@router.get("/privacy", response_class=HTMLResponse, include_in_schema=False)
def privacy_policy():
    return _page("Sanskritam — Privacy Policy", f"""
<h1>Privacy Policy</h1><p>Sanskritam · published by {escape(settings.legal_entity_name)} · updated {UPDATED}</p>
<p>Contact and privacy requests: {_contact()}.</p>
<h2>This release</h2><p>Sanskritam provides Sanskrit lessons, reading, prepared audio, games, handwriting and recitation practice, and AI-assisted questions and conversation. This release has no memberships, paid books or audio, purchases, advertising, referral payouts, paid event hosting, prize competitions, Group chat or Voice companions. The app does not initialise advertising SDKs or use an advertising ID.</p>
<h2>Account and learning data</h2><p>You may continue as a guest. We create a random installation identifier and an account linked to it; guest progress still exists on our server. Google or Apple sign-in supplies an account identifier and display name. We do not store your email address as an account field. We store answers, scores, progress, streaks, daily activity, language and time-zone preferences, and tutor conversation transcripts to deliver and improve your learning experience. If you enable reminders, we store a device push token and notification preferences.</p>
<p>An optional profile picture is cropped, stripped of image metadata and checked for harmful content through Google's Gemini on Vertex AI before storage in our private bucket. Your account picture is shown in your account; game rankings can display your chosen name and score to other learners. Do not upload identity documents or private contact details.</p>
<h2>Microphone and camera</h2><p>When you choose speaking or recitation practice, sound goes through our server to Sarvam AI for speech recognition; live captions may send audio while you record. We retain the recognised text and results, not practice audio on our servers. Your phone may temporarily hold recordings for playback; deleting the account clears app-local data.</p>
<p>Drawn handwriting is recognised on your device using Google ML Kit. When you choose to photograph handwriting, that photo is sent through our server to Sarvam AI for recognition and is not retained by Sanskritam. This is different from the optional eyes-closed recitation check: its camera frames are analysed and discarded on your phone and are not uploaded.</p>
<h2>AI questions and conversations</h2><p>The tutor sends your words and recent conversation to Sarvam AI to produce replies. Ask sends your question, recent turns, language, and any screen text you explicitly attach to Google's Gemini. If you provide birth date, time or place for an optional traditional chart, those details and the computed chart may be sent to Gemini. A request containing birth or match details does not use the free Gemini route unless the personal-data setting is explicitly enabled; that setting is off for this release.</p>
<p>Some general questions use Google's free Gemini service, whose terms permit Google to review submitted content and use it to improve products. Please do not include sensitive personal information or attach screens containing it. Personal questions are not stored as shared answers. General questions and answers may be cached for other learners without an account identifier. AI output can be inaccurate; religious interpretations and traditional health or astrology discussions are educational, not professional advice or guaranteed outcomes.</p>
<h2>Location</h2><p>You can select a city manually without granting location permission. With your permission the app uses approximate location to determine a city, tithi and festival dates. The selected place is stored on your phone; coordinates may accompany a calendar or chart question to calculate its answer and are not retained as a location history. You can revoke location permission in device settings.</p>
<h2>Safety reports and support</h2><p>Use the flag beside an AI answer or daily card to report harmful or inaccurate content inside the app. A report sends the question or card identifier, displayed answer, optional reason, account identifier and submission time to Vedic Valor. Our designated safety reviewer checks the queue daily, records decisions and can withdraw answers or daily cards. Report excerpts can be retained to investigate abuse and prevent the same content from being served again. Contact {_contact()} for urgent concerns or failed submissions. We do not claim automated filtering can catch every unsafe answer.</p>
<h2>Service providers</h2><ul>
<li>Sarvam AI: speech recognition, speech synthesis, tutor replies and selected handwriting photos.</li>
<li>Google Gemini / Vertex AI: Ask answers and profile-image safety checks; Google ML Kit: on-device handwriting and face checks, with model downloads from Google.</li>
<li>Google Cloud: server hosting in Mumbai; Supabase: database hosting; Cloudflare: public artwork and prepared audio delivery, private profile-image storage and these legal pages.</li>
<li>Google Sign-In or Apple: optional sign-in. YouTube: embedded lesson videos, governed by YouTube's Terms of Service and Google's Privacy Policy.</li>
</ul><p>Providers may process data outside India. We do not sell personal data or share it for advertising.</p>
<h2>Retention and deletion</h2><p>We keep account and learning data while the account exists. Delete your account from Settings → Delete account, or request deletion without the app using our <a href="/delete-account">account deletion page</a>. We remove your account, sign-in identifiers, profile picture, learning records, stored conversations, reports you submitted, device push tokens and local app data. Anonymous general-answer caches and aggregate daily vendor-cost totals without account identifiers can remain. Independently retained abuse reports may keep relevant excerpts for safety; backups, if any, are overwritten within 30 days.</p>
<p>If you previously used Group calls, we also request erasure of your account data from Stream. A minimal deletion task containing only the provider account ID remains until Stream confirms completion, with retries after failures. Historical community and financial records, if any, follow the same deletion process; only records needed for accounting, fraud prevention or legal obligations are retained, without a public profile. These legacy features are unavailable in this release.</p>
<h2>Children</h2><p>Sanskritam is not directed to children under 13. If you believe a child under 13 has supplied personal data, contact us so we can investigate and delete it. Store audience declarations must reflect the ages the app actually serves.</p>
<h2>Security and changes</h2><p>Data travels over HTTPS and access to administrative tools is restricted. Public artwork is cached on the device; selected text and audio downloads remain until removed or account deletion. We update this policy and the store disclosures when the app's data practices change.</p>
""")

@router.get("/delete-account", response_class=HTMLResponse, include_in_schema=False)
def delete_account():
    return _page("Delete your Sanskritam account", f"""
<h1>Delete your Sanskritam account</h1><p>Sanskritam · published by {escape(settings.legal_entity_name)}</p>
<h2>In the app</h2><ol><li>Open the side menu, then Settings.</li><li>Choose Delete account and confirm Delete.</li></ol>
<p>This removes the account and associated learning data from our active database and clears app-local data. Guest accounts can use the same option.</p>
<h2>Without the app</h2><p>Email {_contact()} with the subject “Delete my Sanskritam account” and the display name shown in Settings. If possible, include your account ID. We verify ownership before deletion and never ask for passwords, PINs or payment-card details. We complete verified requests within 30 days and confirm by reply.</p>
<h2>What is removed</h2><p>Account and sign-in identifiers, profile pictures, answers, scores, progress, streaks, conversations, handwriting and recitation results, notification tokens, and reports you submitted. Existing legacy Group messages, media, direct chats, hosted rooms and empty circles are also removed. A circle with other members may remain with another administrator; their independently filed abuse reports may retain relevant excerpts.</p>
<h2>Providers and retention</h2><p>For legacy Group users we request deletion from Stream and retry failures. Only the provider account ID needed to complete that erasure remains in a restricted deletion queue until confirmed. Backups, if any, are overwritten within 30 days. Anonymous shared educational answers may remain. Any historic financial records required for accounting, fraud prevention or legal obligations are retained without a public profile.</p>
<p>There are no subscriptions or purchases in this release. If you have a subscription from an earlier version, account deletion does not cancel it: cancel through Google Play or Apple's subscription settings. Contact {_contact()} for help.</p>
""")
