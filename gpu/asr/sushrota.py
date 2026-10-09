"""Su-srota loader + decoder (venv-asr). Needs torch + NeMo on the GPU host.

Kept import-light: importing this module must not import torch (tests import
scoring only). All torch/NeMo imports live inside functions.
"""

from __future__ import annotations

import subprocess


def load(path: str, device: str = "cuda"):
    """Restore the Su-srota checkpoint (AI4Bharat IndicConformer lineage).

    Stock NeMo 2.x cannot read it as-is: the checkpoint uses AI4Bharat's
    ``multilingual`` tokenizer type and ``multisoftmax`` decoder extensions.
    The compatibility recipe below (aggregate-tokenizer routing + stripping
    the AI4Bharat kwargs before instantiation + ``strict=False``) is the one
    the author's own HF Space demo runs in production
    (hugging-apps/sushrota-sanskrit-asr app.py, *read* 2026-10-09). We only
    ever use the encoder + CTC decoder, never the RNNT path.
    """
    from omegaconf import open_dict

    from nemo.collections.asr.models import EncDecHybridRNNTCTCBPEModel
    from nemo.collections.asr.parts.mixins.mixins import ASRBPEMixin

    orig_setup = ASRBPEMixin._setup_tokenizer

    def _patched_setup_tokenizer(self, tokenizer_cfg):
        t = (tokenizer_cfg.get("type") or "").lower()
        if t in ("agg", "multilingual"):
            self._setup_aggregate_tokenizer(tokenizer_cfg)
            self.tokenizer_type = "agg"
        else:
            orig_setup(self, tokenizer_cfg)
        self._derive_tokenizer_properties()

    ASRBPEMixin._setup_tokenizer = _patched_setup_tokenizer

    def _strip(cfg):
        for section in ("decoder", "joint"):
            if section in cfg:
                with open_dict(cfg[section]):
                    cfg[section].pop("multisoftmax", None)
                    for k in ("multilingual", "language_keys", "language_masks",
                              "token_id_offsets", "offset_token_ids_by_token_id"):
                        cfg[section].pop(k, None)
        if "aux_ctc" in cfg and "decoder" in cfg["aux_ctc"]:
            with open_dict(cfg.aux_ctc.decoder):
                cfg.aux_ctc.decoder.pop("multisoftmax", None)
        return cfg

    cls = EncDecHybridRNNTCTCBPEModel
    orig_from_config = cls.from_config_dict.__func__

    def _patched_from_config(cls_, config, trainer=None):
        return orig_from_config.__get__(cls_)(config=_strip(config), trainer=trainer)

    cls.from_config_dict = classmethod(_patched_from_config)
    try:
        model = cls.restore_from(path, strict=False)
    finally:
        cls.from_config_dict = classmethod(orig_from_config)
        ASRBPEMixin._setup_tokenizer = orig_setup
    model.eval()
    try:
        model = model.to(device)
    except Exception:
        pass
    return model


def to_16k_mono(path_or_bytes) -> "object":
    """Decode any audio to 16 kHz mono float32 via ffmpeg subprocess."""
    import numpy as np

    if isinstance(path_or_bytes, (bytes, bytearray)):
        data = bytes(path_or_bytes)
        cmd = ["ffmpeg", "-nostdin", "-i", "pipe:0", "-ac", "1", "-ar", "16000",
               "-f", "f32le", "pipe:1"]
        p = subprocess.run(cmd, input=data, capture_output=True)
        if p.returncode != 0:
            raise RuntimeError("ffmpeg decode failed")
        return np.frombuffer(p.stdout, dtype=np.float32).copy()
    else:
        cmd = ["ffmpeg", "-nostdin", "-i", str(path_or_bytes), "-ac", "1",
               "-ar", "16000", "-f", "f32le", "pipe:1"]
        p = subprocess.run(cmd, capture_output=True)
        if p.returncode != 0:
            raise RuntimeError("ffmpeg decode failed")
        import numpy as np
        return np.frombuffer(p.stdout, dtype=np.float32).copy()


def posteriors(model, wav16k, max_seconds: int = 45):
    """[T, 257] log-probabilities: 0.3 s pads, blank + 256 Sanskrit tokens."""
    import numpy as np
    import torch

    sr = 16000
    x = np.asarray(wav16k, dtype=np.float32)
    cap = int(max_seconds * sr)
    if len(x) > cap:
        x = x[:cap]
    pad = int(0.3 * sr)
    x = np.concatenate([np.zeros(pad, dtype=np.float32), x, np.zeros(pad, dtype=np.float32)])
    sig = torch.from_numpy(x).unsqueeze(0)
    sl = torch.tensor([sig.shape[1]], dtype=torch.long)
    dev = next(model.parameters()).device if hasattr(model, "parameters") else torch.device("cpu")
    sig = sig.to(dev)
    sl = sl.to(dev)
    with torch.no_grad():
        enc, _ = model.forward(input_signal=sig, input_signal_length=sl)
        lp = model.ctc_decoder(encoder_output=enc)[0]
    cols = [5632] + list(range(4096, 4352))
    lp = lp[:, cols]
    lp = lp - lp.logsumexp(dim=-1, keepdim=True)
    return lp.cpu().numpy()


def greedy(P, blank_penalty: float, model=None, tokenizer=None) -> str:
    """Argmax with blank penalty, collapse, drop blanks, map via tokenizer."""
    import numpy as np

    Q = np.asarray(P, dtype=np.float64).copy()
    Q[:, 0] = Q[:, 0] - float(blank_penalty)
    ids = Q.argmax(axis=1).tolist()
    # Collapse repeats, drop blank (0).
    seq: list[int] = []
    prev = -1
    for c in ids:
        if c != prev:
            if c != 0:
                seq.append(c)
            prev = c
        # same as prev: skip (repeat collapse)
    # Map c-1 through the Sanskrit tokenizer.
    toks: list[str] = []
    if model is not None:
        try:
            td = model.tokenizer.tokenizers_dict["sa"]
            toks = td.ids_to_tokens([c - 1 for c in seq])
        except Exception:
            toks = [str(c) for c in seq]
    elif tokenizer is not None:
        try:
            toks = tokenizer.ids_to_tokens([c - 1 for c in seq])
        except Exception:
            toks = [str(c) for c in seq]
    else:
        toks = [str(c) for c in seq]
    return "".join(toks).replace("▁", " ")
