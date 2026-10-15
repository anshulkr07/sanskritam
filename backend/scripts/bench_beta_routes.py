"""Budgeted, resumable live comparison; never connects to the app database.

Run from backend: python -m scripts.bench_beta_routes --live
The ledger reserves a conservative full request cost BEFORE every vendor call,
including retries. Unknown/failed calls retain their reservation. No parallel
runs: an exclusive lock protects the single cumulative INR 300 / USD 2 budget.
"""
from __future__ import annotations

import argparse
import asyncio
from dataclasses import asdict
import json
import os
from pathlib import Path
import time
import sqlite3

from app.config import settings
from app.evals.providers import LLMResponse, build_provider, price_for
from app.evals.runner import run_suite
from app.evals.tasks import build_cases
from app.evals.talk import CASES, _check
from app.services.tutor import ConversationTutor

OUT = Path(__file__).resolve().parents[2] / "results" / "beta-20261015"
MODELS = ["sarvam:sarvam-105b-conversations", "sarvam_v2:sarvam-105b",
          "sarvam_v2:gemma4", "sarvam_v2:deepseekv4.1-flash", "sarvam_v2:glm5.3",
          "vertex:gemini-3.8-flash", "vertex:gemini-3.7-flash"]


class Budget:
    def __init__(self, directory: Path):
        self.path = directory / "budget.json"
        self.data = json.loads(self.path.read_text()) if self.path.exists() else {
            "limits": {"sarvam_inr": 300.0, "google_usd": 2.0},
            "reserved": {"sarvam_inr": 0.0, "google_usd": 0.0}, "calls": []}
        self.reconcile()

    def reconcile(self):
        totals = {"sarvam_inr": 0.0, "google_usd": 0.0}
        for event in self.data["calls"]:
            amount = event["reserved"]
            pt, ct = event.get("prompt_tokens", 0), event.get("completion_tokens", 0)
            if pt or ct:
                model = event["label"].partition(":")[2]
                if event["pool"] == "google_usd":
                    measured_upper = 2 * (pt * 1.65 + ct * 8.25) / 1_000_000
                else:
                    pin, pout = price_for(model)
                    # Reserve above both current docs and the previous 105B rate.
                    pin, pout = max(pin, 29.28), max(pout, 73.20)
                    measured_upper = 2 * (pt * pin + ct * pout) / 1_000_000
                amount = measured_upper
                event["usage_cost_upper"] = amount
            totals[event["pool"]] += amount
        self.data["reserved"] = totals

    def reserve(self, pool, amount, label):
        # Fixed ceilings cannot be raised through the saved ledger.
        cap = {"sarvam_inr": 300.0, "google_usd": 2.0}[pool]
        if self.data["reserved"][pool] + amount > cap:
            raise RuntimeError(f"Testing budget exhausted: {pool}")
        self.data["reserved"][pool] += amount
        self.data["calls"].append({"pool": pool, "reserved": amount, "label": label})
        self.save()
        return self.data["calls"][-1]

    def save(self):
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(self.data, indent=2), encoding="utf-8")
        tmp.replace(self.path)


class Metered:
    def __init__(self, provider, budget):
        self.provider, self.budget = provider, budget

    def __getattr__(self, key):
        return getattr(self.provider, key)

    async def complete(self, system, user, **kwargs):
        if not self.configured:
            return LLMResponse(provider=self.name, model=self.model, error="Not configured")
        maximum = kwargs.get("max_tokens", 512)
        # UTF-8 bytes upper-bound text tokens; overhead and 2x margin are
        # reserved too. Output bound includes billed reasoning tokens.
        upper_input = len((system + user).encode("utf-8")) + 512
        if self.name == "vertex":
            pool = "google_usd"
            # Reserve the higher, non-promotional Flash rates.
            reserve = 2 * (upper_input * 1.65 + maximum * 8.25) / 1_000_000
        else:
            pool = "sarvam_inr"
            pin, pout = price_for(self.model)
            pin, pout = max(pin, 29.28), max(pout, 73.20)
            reserve = 2 * (upper_input * pin + maximum * pout) / 1_000_000
        event = self.budget.reserve(pool, reserve, self.label)
        response = await self.provider.complete(system, user, **kwargs)
        event.update(prompt_tokens=response.prompt_tokens, completion_tokens=response.completion_tokens,
                     ok=response.ok, latency_ms=response.latency_ms)
        self.budget.reconcile()
        self.budget.save()
        return response


async def speech_smoke(budget):
    import base64
    import io
    import wave
    from app.seeds.challenges import SEED_CHALLENGES
    from app.grading.analyzer import iast_to_devanagari
    from app.services.sarvam import get_sarvam_client
    client = get_sarvam_client()
    samples = []
    for index, case in enumerate(SEED_CHALLENGES[:3]):
        text = iast_to_devanagari(case["target_iast"])
        budget.reserve("sarvam_inr", len(text) * .003 * 2, "bulbul:v3:sa-IN")
        try:
            audio = base64.b64decode(await client.text_to_speech(text, "sa-IN"))
            with wave.open(io.BytesIO(audio)) as wav:
                seconds = wav.getnframes() / wav.getframerate()
            (OUT / f"sanskrit-{index}.wav").write_bytes(audio)
            budget.reserve("sarvam_inr", (seconds + 1) / 3600 * 30 * 2, "saaras:v4:sa-IN")
            result = await client.speech_to_text(audio, language_code="sa-IN")
            samples.append({"source": text, "transcript": result["transcript"], "seconds": seconds})
        except Exception as exc:
            samples.append({"error_type": type(exc).__name__, "detail": str(exc)[:250]})
    await client.close()
    return samples


async def main(args):
    OUT.mkdir(parents=True, exist_ok=True)
    lock = OUT / "run.lock"
    fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    os.close(fd)
    try:
        budget = Budget(OUT)
        refs = args.models or MODELS
        report = {"models": {}, "speech": [], "note": "Small regression sample; not a Sanskrit proficiency benchmark."}
        path = OUT / "report.json"
        if path.exists():
            report = json.loads(path.read_text(encoding="utf-8"))
        def save():
            report["reserved_upper_bound"] = dict(budget.data["reserved"])
            path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        if not args.live:
            print(json.dumps({"models": refs, "budget": budget.data["reserved"], "live": False}))
            return
        if args.voice_stream_only:
            from app.voice_lab.config import LabConfig, instruction
            from app.voice_lab.session import VoicePipelineSession
            from app.evals.talk import CASES
            for model in ["sarvam-105b-conversations", "sarvam-105b", "gemma4", "deepseekv4.1-flash", "glm5.3"]:
                ref = ("sarvam:" if model.endswith("-conversations") else "sarvam_v2:") + model
                row = report["models"].setdefault(ref, {})
                if "voice_stream" in row and not args.repeat_stream:
                    continue
                if "voice_stream" in row:
                    row["voice_stream_before_grammar_context"] = row["voice_stream"]
                config = LabConfig(llm_model=model, language="sa-IN")
                text = next(c.utterance for c in CASES if c.correct)
                messages = []
                async def send(message):
                    messages.append(message)
                async def meter(kind, amount):
                    if kind == "tts_chars":
                        budget.reserve("sarvam_inr", amount * .003 * 2, f"voice-stream:{model}:tts")
                    elif kind == "llm_calls":
                        pin, pout = price_for(model)
                        maximum = 2400 if model in {"sarvam-105b", "glm5.3", "deepseekv4.1-flash"} else 600
                        budget.reserve("sarvam_inr", 2 * ((len((instruction(config) + text).encode()) + 2048) * max(pin, 29.28) + maximum * max(pout, 73.2)) / 1_000_000, f"voice-stream:{model}:llm")
                session = VoicePipelineSession(config, send, meter)
                started = time.perf_counter()
                try:
                    await asyncio.wait_for(session.respond(text), 75)
                    import base64
                    chunks = [m for m in messages if m["type"] == "audio"]
                    row["voice_stream"] = {
                        "audio_chunks": len(chunks),
                        "audio_bytes": sum(len(base64.b64decode(m["data"])) for m in chunks),
                        "transcript": "".join(m.get("text", "") for m in messages if m["type"] == "transcript"),
                        "complete": any(m["type"] == "turn_complete" for m in messages),
                        "errors": [m.get("message") for m in messages if m["type"] in {"error", "fatal"}],
                        "latency_ms": (time.perf_counter() - started) * 1000}
                except TimeoutError:
                    row["voice_stream"] = {"complete": False, "errors": ["75-second test deadline"]}
                finally:
                    await session.tts.close()
                save()
                print(json.dumps({"voice_stream_model": model, "result": {k: v for k, v in row["voice_stream"].items() if k != "transcript"}, "reserved": budget.data["reserved"]}), flush=True)
            return
        if args.answers_only:
            # Local read-only corpus, never DATABASE_URL or production data.
            corpus = Path(__file__).resolve().parents[1] / "app.db"
            with sqlite3.connect(corpus.as_uri() + "?mode=ro", uri=True) as db:
                verses = db.execute("SELECT source_ref, devanagari, translation_en FROM shlokas WHERE translation_en IS NOT NULL AND translation_en != '' ORDER BY source_ref LIMIT 3").fetchall()
            for ref in refs:
                row = report["models"].setdefault(ref, {})
                if "answers" in row:
                    continue
                provider = Metered(build_provider(ref, timeout=45), budget)
                try:
                    answers = []
                    for source_ref, text, meaning in verses:
                        response = await provider.complete(
                            "Explain the supplied Sanskrit passage in plain English. Use only the supplied source and meaning. Return JSON with summary, quote, reference. Quote must exactly match the supplied Sanskrit; reference must exactly match the supplied reference. Do not invent quotations.",
                            json.dumps({"question": "What does this passage teach, and how can a beginner understand it?", "reference": source_ref, "sanskrit": text, "meaning": meaning}, ensure_ascii=False),
                            max_tokens=1800, json_mode=True)
                        try: card = json.loads(response.text)
                        except Exception: card = {}
                        answers.append({"reference": source_ref, "response": response.to_dict(),
                            "exact_quote": card.get("quote") == text,
                            "exact_reference": card.get("reference") == source_ref,
                            "has_summary": bool(card.get("summary"))})
                    row["answers"] = answers
                    save()
                    print(json.dumps({"answers_model": ref, "checks": [{k: v for k, v in a.items() if k != "response"} for a in answers], "reserved": budget.data["reserved"]}), flush=True)
                finally:
                    await provider.close()
            return
        if not report["speech"] and settings.sarvam_api_key:
            report["speech"] = await speech_smoke(budget)
            save()
        # Existing authored gold cases, including dual and plural controls.
        cases = build_cases(["generate", "diagnose", "translate"])
        chosen = []
        for task in ["generate", "diagnose", "translate"]:
            group = [c for c in cases if c.task == task]
            chosen.extend(group[:4])
            chosen.extend(c for c in group if "DU" in json.dumps(c.gold) and c not in chosen)
        # Bound the sample while retaining number-specific cases.
        chosen = chosen[:30]
        talk_cases = [c for c in CASES if c.correct or c.expect_fix][:4] + list(CASES[:2])
        settings.tutor_max_tokens = 2400
        for ref in refs:
            if ref in report["models"]:
                continue
            provider = Metered(build_provider(ref, timeout=45), budget)
            print(f"Evaluating {ref}", flush=True)
            try:
                summary, records = await run_suite([provider], chosen, concurrency=1,
                    cache_dir=str(OUT / "cache"), max_tokens=2048, retries=0)
                row = {"summary": summary[0].to_dict(), "cases": [r.to_dict() for r in records], "conversation": []}
                tutor = ConversationTutor(ref)
                tutor._provider = provider
                history = []
                for case in talk_cases:
                    started = time.perf_counter()
                    reply = await tutor.reply(transcript=case.utterance, history=history,
                        situation="A beginner practises introductions and daily activities.",
                        target_features=[], native_lang=case.lang or "en", want_heard=True)
                    failures = _check(reply, case, case.lang or "en")
                    row["conversation"].append({"id": case.id, "reply": asdict(reply),
                        "failures": failures, "latency_ms": (time.perf_counter() - started) * 1000})
                    history.extend([{"role": "learner", "text": case.utterance},
                                    {"role": "tutor", "text": reply.reply_sa + " " + reply.reply_native}])
                report["models"][ref] = row
                save()
                print(json.dumps({"model": ref, "summary": row["summary"], "reserved": budget.data["reserved"]}), flush=True)
            finally:
                await provider.close()
        report["reserved_upper_bound"] = budget.data["reserved"]
        save()
    finally:
        lock.unlink(missing_ok=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true")
    parser.add_argument("--models", nargs="+")
    parser.add_argument("--answers-only", action="store_true")
    parser.add_argument("--voice-stream-only", action="store_true")
    parser.add_argument("--repeat-stream", action="store_true")
    asyncio.run(main(parser.parse_args()))
