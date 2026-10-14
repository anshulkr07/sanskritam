"""Gradio ZeroGPU Space. Model loads once; only generation allocates the GPU."""
import os

import gradio as gr
import numpy as np
import spaces
import torch
from parler_tts import ParlerTTSForConditionalGeneration
from transformers import AutoTokenizer

from audio_payload import gpu_duration, validate_inputs, wav_payload

MODEL_ID = "ai4bharat/indic-parler-tts"
HF_TOKEN = os.environ.get("HF_TOKEN")

# ZeroGPU emulates CUDA placement outside decorated functions. Loading here
# avoids repeated download/placement work for each short speech clause.
model = ParlerTTSForConditionalGeneration.from_pretrained(
    MODEL_ID, token=HF_TOKEN, torch_dtype=torch.float32,
).to("cuda").eval()
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, token=HF_TOKEN)
description_tokenizer = AutoTokenizer.from_pretrained(model.config.text_encoder._name_or_path, token=HF_TOKEN)


@spaces.GPU(duration=gpu_duration, size="large")
def generate_audio(text, description):
    prompt = tokenizer(text, return_tensors="pt").to("cuda")
    caption = description_tokenizer(description, return_tensors="pt").to("cuda")
    with torch.inference_mode():
        result = model.generate(
            input_ids=caption.input_ids, attention_mask=caption.attention_mask,
            prompt_input_ids=prompt.input_ids, prompt_attention_mask=prompt.attention_mask,
            max_new_tokens=768, do_sample=True,
        )
    return result.detach().cpu().numpy().reshape(-1)


def synthesize(text, description):
    try:
        text, description = validate_inputs(text, description)
    except ValueError as exc:
        raise gr.Error(str(exc)) from None
    audio = generate_audio(text, description)
    # Encoding happens after releasing the GPU and stays in memory.
    pcm = np.rint(np.clip(audio, -1, 1) * 32767).astype("<i2").tobytes()
    return wav_payload(pcm, model.config.sampling_rate)


def preview(text, description):
    result = synthesize(text, description)
    return f'<audio controls autoplay src="data:audio/wav;base64,{result["audio_base64"]}"></audio>'


with gr.Blocks(title="Sanskrit Voice Lab · Indic-Parler") as demo:
    gr.Markdown("# Sanskrit Voice Lab\nNative Sanskrit speech with Indic-Parler on shared ZeroGPU hardware. "
                "Sign in to Hugging Face for your account's daily GPU allowance.")
    text = gr.Textbox(label="Sanskrit text", value="नमस्ते। अद्य भवतः दिनं कथम् अस्ति?", max_lines=4)
    description = gr.Textbox(label="Voice direction", value="Aryan speaks Sanskrit in a warm, gentle tone with a balanced pitch at a moderate pace. Very clear studio audio with no background noise.")
    button = gr.Button("Listen", variant="primary")
    playback = gr.HTML()
    button.click(preview, [text, description], playback, api_name=False, concurrency_limit=1, concurrency_id="speech")
    # Dedicated API returns a JSON payload, so clients never download temporary
    # files or need a second audio URL. Client.submit(api_name='/synthesize').
    api_button = gr.Button(visible=False)
    api_result = gr.JSON(visible=False)
    api_button.click(synthesize, [text, description], api_result,
                     api_name="synthesize", concurrency_limit=1, concurrency_id="speech")
    gr.Markdown("Short requests only (300 characters). Audio is encoded in memory; no conversation history is stored by this app. "
                "Queued calls can be cancelled; an already running generation may finish and consume GPU quota.")

if __name__ == "__main__":
    demo.queue(max_size=8, default_concurrency_limit=1).launch(show_error=False)
