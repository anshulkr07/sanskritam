"""Publish only the standalone TTS Space, always using free ZeroGPU hardware.

Run from backend/: .venv/Scripts/python scripts/deploy_voice_lab_hf.py
Requires HF_TOKEN in the existing .env. Never prints credential values.
"""
import argparse
import json
import re
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings

UPLOAD_FILES = ("app.py", "audio_payload.py", "requirements.txt", "README.md")


def deploy(name="sanskrit-voice-lab", update=False):
    import httpx
    from huggingface_hub import HfApi, CommitOperationAdd

    if not settings.hf_token:
        raise RuntimeError("Set HF_TOKEN in your local .env before deploying.")
    api = HfApi(token=settings.hf_token)
    account = api.whoami()["name"]
    repo_id = f"{account}/{name}"
    folder = Path(__file__).resolve().parents[2] / "deploy" / "hf-voice-lab"
    for filename in UPLOAD_FILES:
        if not (folder / filename).is_file():
            raise RuntimeError(f"Missing Space source: {filename}")
    # Verify gated-model access without downloading multi-GB weights locally.
    response = httpx.get("https://huggingface.co/ai4bharat/indic-parler-tts/resolve/main/config.json",
                         headers={"Authorization": f"Bearer {settings.hf_token}"}, timeout=30)
    if response.status_code not in (200, 302, 307):
        raise RuntimeError("Accept Indic-Parler model access on Hugging Face using this account before deploying.")
    if update:
        runtime = api.get_space_runtime(repo_id)
        hardware = runtime.requested_hardware or runtime.hardware
        if hardware != "zero-a10g":
            raise RuntimeError("Refusing to update a Space that is not configured for free ZeroGPU.")
    else:
        api.create_repo(repo_id=repo_id, repo_type="space", private=False,
                        space_sdk="gradio", space_hardware="zero-a10g",
                        space_secrets=[{"key": "HF_TOKEN", "value": settings.hf_token}])
    api.create_commit(repo_id=repo_id, repo_type="space",
                      operations=[CommitOperationAdd(path_in_repo=filename, path_or_fileobj=folder / filename)
                                  for filename in UPLOAD_FILES],
                      commit_message="Add Sanskrit Indic-Parler ZeroGPU voice service")
    return {"repo_id": repo_id, "url": f"https://huggingface.co/spaces/{repo_id}", "hardware": "zero-a10g"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--name", default="sanskrit-voice-lab")
    parser.add_argument("--update", action="store_true", help="Update an existing ZeroGPU Space instead of creating one")
    args = parser.parse_args()
    try:
        print(json.dumps(deploy(args.name, args.update)))
    except Exception as exc:
        # HTTP exceptions may include request internals; report server response
        # status and a safe service message, never authorization headers.
        response = getattr(exc, "response", None)
        status = getattr(response, "status_code", None)
        detail = re.sub(r"hf_[A-Za-z0-9]+", "[redacted]", str(exc).replace(settings.hf_token, "[redacted]") if settings.hf_token else str(exc))
        print(json.dumps({"error": detail[:1200], "error_type": type(exc).__name__, "status": status}))
        sys.exit(1)
