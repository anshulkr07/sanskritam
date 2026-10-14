from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class LabConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    pipeline: Literal[1, 2, 3, 4] = 1
    persona: Literal["guru", "mother", "friend", "scholar"] = "guru"
    tts_model: Literal["bulbul:v3", "bulbul:v4-flash"] = "bulbul:v3"
    speaker: str = Field("ashutosh", min_length=1, max_length=100)
    language: Literal["hi-IN", "te-IN", "kn-IN", "mr-IN"] = "te-IN"
    pace: float = Field(0.88, ge=0.5, le=2)
    pitch: float = Field(-2, ge=-12, le=12)
    loudness: float = Field(1, ge=0.3, le=2)
    temperature: float = Field(0.6, ge=0.1, le=1)
    emotion: str = Field("calm, authoritative, encouraging", max_length=160)
    thinking_budget: int = Field(0, ge=0, le=4096)
    web_search: bool = False
    filler_phrases: bool = True
    transliterate: bool = True
    visarga_expansion: bool = True
    schwa_fix: bool = True
    open_provider: Literal["edge_tts_prosody", "ai4bharat_indic_parler"] = "edge_tts_prosody"
    live_model: Literal["gemini-3.8-live", "gemini-3.1-flash-live-preview", "gemini-2.5-flash-native-audio-preview-12-2025"] = "gemini-3.8-live"


PERSONAS = {
    "guru": "You are a traditional Sanskrit teacher. Speak clear classical Paninian Sanskrit. Gently correct vibhakti, dhatu and sandhi by repeating the corrected sentence with one sentence of explanation. Reply in 2–3 concise sentences.",
    "mother": "You are an affectionate Sanskrit mother. Use simple household Vyavaharika Sanskrit. Encourage the learner warmly; never lecture. Ask about their day and meals. Reply in 2 short sentences.",
    "friend": "You are a witty casual Sanskrit-speaking peer. Discuss daily life, hobbies, technology, sports and exams. Reply in 1–2 snappy sentences.",
    "scholar": "You are a Sanskrit scholar. Explain shastras, shlokas, nirukta and current events in Sanskrit, citing dhatu and pratyaya when relevant. Keep spoken replies concise and cite search sources when used.",
}


def instruction(c: LabConfig) -> str:
    return (PERSONAS[c.persona] + " Speak exclusively in Sanskrit using Devanagari, with no Markdown. "
            f"Use a {c.emotion} tone, a {c.pace}x pace and a {c.pitch:+g} semitone register.")
