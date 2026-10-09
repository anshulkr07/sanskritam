#!/usr/bin/env bash
# Set up the GB10 vast.ai host: venv-tts (Vagdhenu) + venv-asr (NeMo).
# Never pip install into the system Python (ComfyUI lives there).
set -euo pipefail
cd "$(dirname "$0")"

echo "== versions =="
nvidia-smi || true
ffmpeg -version | head -n 1 || { echo "ffmpeg missing"; exit 1; }
uv --version || { echo "uv missing"; exit 1; }
python3 -c "import torch, torchaudio; print(torch.__version__, torchaudio.__version__)" || { echo "container torch missing; this script expects NVIDIA container"; exit 1; }

for V in venv-tts venv-asr; do
  if [ ! -d "$V" ]; then uv venv --python /usr/bin/python3.12 --system-site-packages "$V"; fi
done

echo "== venv-tts =="
if [ ! -d vagdhenu ]; then git clone --depth 1 https://github.com/prathoshap/vagdhenu.git vagdhenu; fi
(cd vagdhenu && git fetch --depth 1 origin c18927a8a77775753e32248177a5a6bea1019a12 && git checkout c18927a8a77775753e32248177a5a6bea1019a12) || true
if [ ! -d BigVGAN ]; then git clone --depth 1 https://github.com/NVIDIA/BigVGAN.git; fi
# Vagdhenu's own requirements (IndicF5 from git at a fixed commit included),
# minus torch/torchaudio (container provides them) and minus the numpy pin
# (container numpy 2.1 is used as-is).
grep -viE '^[[:space:]]*(torch|torchaudio|numpy)[[:space:]><=~!]' vagdhenu/requirements.txt > /tmp/vagdhenu-reqs.txt || true
./venv-tts/bin/python -m pip install --no-deps -r /tmp/vagdhenu-reqs.txt || true
./venv-tts/bin/python -m pip install --no-deps -r requirements-tts.txt || ./venv-tts/bin/pip install -r requirements-tts.txt
# transformers 4.46.3 needs tokenizers 0.20.x; render_core needs toml.
./venv-tts/bin/python -m pip install "tokenizers==0.20.3" toml || true
./venv-tts/bin/python - <<'PY'
from huggingface_hub import hf_hub_download
for f in ["voice_steer_ema_2026-06-17.pt", "voc_bigvgan_EMA_2026-06-11.pth", "vocab.txt"]:
    hf_hub_download(repo_id="prathoshap/vagdhenu", filename=f, revision="0b8b7474c1899471b3d2b6a3ee919ab6c9373ebc", local_dir="models")
print("tts weights ok")
PY

echo "== venv-asr =="
# NeMo would pull an x86 torch wheel (no ARM CUDA build exists for torch==2.4.1
# cu121); install it with --no-deps so the container torch/torchaudio win, then
# add its runtime deps explicitly. Verified 2026-10-09 on the GB10 (torch 2.10,
# NeMo 2.7.3 loads v13b): tokenizers needs 0.20.3 for the venv-tts pin above;
# venv-asr additionally needed hydra-core, omegaconf, lightning<=2.4.0,
# torchmetrics, einops, scipy, sentencepiece, onnx, fiddle, cloudpickle,
# transformers~=4.57.0, webdataset, sacremoses, braceexpand, editdistance,
# jiwer, wget, pyannote, whisper_normalizer, optuna, lhotse, kaldialign,
# kaldi-python-io, marshmallow, pyloudnorm, resampy, pydub, ruamel.yaml,
# numexpr<2.14.0, fsspec==2024.12.0, protobuf~=5.29.5, nv_one_logger_*,
# and numpy<=2.3 (numba refuses numpy 2.5). All install INTO the venv only.
./venv-asr/bin/python -m pip install "nemo_toolkit[asr]==2.7.3" --no-deps || true
./venv-asr/bin/python -m pip install fastapi uvicorn python-multipart huggingface_hub datasets librosa soundfile numpy || true
./venv-asr/bin/python -m pip install hydra-core omegaconf "lightning<=2.4.0" torchmetrics einops scipy "sentencepiece<1.0.0" onnx lightning wget pyannote.metrics pyannote.core whisper_normalizer optuna text-unidecode inflect || true
./venv-asr/bin/python -m pip install fiddle cloudpickle "transformers~=4.57.0" webdataset sacremoses braceexpand editdistance jiwer || true
./venv-asr/bin/python -m pip install lhotse kaldialign kaldi-python-io marshmallow pyloudnorm resampy sacrebleu pydub || true
./venv-asr/bin/python -m pip install ruamel.yaml "numexpr<2.14.0" "fsspec==2024.12.0" "protobuf~=5.29.5" nv_one_logger_core nv_one_logger_training_telemetry nv_one_logger_pytorch_lightning_integration "numpy<=2.3" || true
./venv-asr/bin/python - <<'PY'
from huggingface_hub import hf_hub_download
hf_hub_download(repo_id="prathoshap/sushrota-sanskrit-asr", filename="sushrota_sanskrit_asr_v13b.nemo", revision="5452d080bbffa62ff879e3ddd53b42dfa7a1db64", local_dir="models")
print("asr weights ok")
PY

./venv-asr/bin/python - <<'PY'
import json, torch
try:
    import nemo
    nv = getattr(nemo, "__version__", "unknown")
except Exception as e:
    nv = f"missing: {e}"
print(json.dumps({"torch": torch.__version__, "nemo": nv}))
PY
echo "done. See README for next steps."
