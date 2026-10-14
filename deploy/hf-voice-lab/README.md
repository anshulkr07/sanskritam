---
title: Sanskrit Voice Lab
emoji: 🎙️
colorFrom: yellow
colorTo: blue
sdk: gradio
sdk_version: 5.49.1
python_version: 3.10.13
app_file: app.py
pinned: false
license: apache-2.0
models:
  - ai4bharat/indic-parler-tts
---

# Sanskrit Voice Lab · Indic-Parler

Native Sanskrit TTS for a personal Voice Lab, running on **free ZeroGPU**.
Select ZeroGPU hardware in Space settings; metadata alone does not assign it.
The model is placed on CUDA at startup, as required by ZeroGPU. Generation runs
inside `@spaces.GPU(size="large")`; WAV encoding happens afterwards on the CPU.
There is no dedicated GPU held while the app is idle.

Add a **read-only, model-scoped HF_TOKEN** as a Space secret with access to
`ai4bharat/indic-parler-tts`. Accept that model's access conditions first.
The deployment script configures the Space with your existing token; you can
replace the secret with a narrowly scoped read token in Space settings.

## Backend connection

Set these only on your own FastAPI backend:

```env
VOICE_LAB_PARLER_SPACE=your-username/sanskrit-voice-lab
HF_TOKEN=your-token
```

Choose Voice Lab → Pipeline 2 → Indic-Parler. Aryan is the model's recommended
Sanskrit speaker. Other voices may be used as experiments with voice descriptions.
No frontend API key is needed. The backend uses authenticated Gradio requests
so quota is attributed to the token's Hugging Face account.

## API

`Client("your-username/sanskrit-voice-lab", token=..., download_files=False)`
then `submit(text, description, api_name="/synthesize")` returns:

```json
{"codec":"wav","sample_rate":44100,"audio_base64":"..."}
```

The sample rate is taken from the loaded model. WAVs are created in memory.
Requests are limited to 300 text characters and 500 description characters;
generation is capped at 768 decoder steps. Short clauses avoid wasted quota.
Queues are bounded and inference uses one GPU request at a time. Cancelling
queued work can save quota; a generation already running may still finish.

## Free quota

HF currently documents 300 GPU-seconds daily for signed-in free accounts.
This counts allocated GPU time during synthesis, including work inside the GPU
function, rather than Space uptime or generated speech duration. Remaining
quota can be queried using `HfApi(...).get_zero_gpu_quota()`.
The quota belongs to an account, not each Space. No paid hardware is requested
by this project. Queue delays and cold starts still affect response latency.

Free ZeroGPU hosting requires an eligible account and is limited to two Spaces.
The public Space source contains only this TTS service, not the Sanskrit app,
its environment files or learner data.

Sources: [ZeroGPU documentation](https://huggingface.co/docs/hub/spaces-zerogpu),
[Indic-Parler model](https://huggingface.co/ai4bharat/indic-parler-tts).
