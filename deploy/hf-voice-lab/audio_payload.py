"""Pure helpers, tested locally without loading Torch or the model."""
import base64
import io
import wave

MAX_TEXT = 300


def validate_inputs(text, description):
    text, description = text.strip(), description.strip()
    if not text or len(text) > MAX_TEXT:
        raise ValueError(f"Send between 1 and {MAX_TEXT} characters per speech request.")
    if not description or len(description) > 500:
        raise ValueError("Voice description must contain 1–500 characters.")
    return text, description


def gpu_duration(text, description):
    # Small 1x GPU allocation. This is a maximum reservation, not a count of
    # spoken seconds. Keep generation within 30 s for short live-call clauses.
    return min(30, max(10, 10 + len(text) // 15))


def wav_payload(pcm16, sample_rate):
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(sample_rate)
        output.writeframes(pcm16)
    return {"codec": "wav", "sample_rate": sample_rate,
            "audio_base64": base64.b64encode(buffer.getvalue()).decode("ascii")}
