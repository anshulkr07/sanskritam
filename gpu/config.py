"""Shared pins for the GPU folder (handover_recite section 6)."""

VAGDHENU_REPO = "https://github.com/prathoshap/vagdhenu.git"
VAGDHENU_COMMIT = "c18927a8a77775753e32248177a5a6bea1019a12"
VAGDHENU_HF = "prathoshap/vagdhenu"
VAGDHENU_HF_REVISION = "0b8b7474c1899471b3d2b6a3ee919ab6c9373ebc"
SUSHROTA_HF = "prathoshap/sushrota-sanskrit-asr"
SUSHROTA_HF_REVISION = "5452d080bbffa62ff879e3ddd53b42dfa7a1db64"
SUSHROTA_FILE = "sushrota_sanskrit_asr_v13b.nemo"
VOICE = "vagdhenu-steer-2026-06-17"
FIRST_SEED = 60
RESEEDS = [61, 63, 64]
GAP_S = 0.55
GAP_HALANT_EXTRA_S = 0.20
LEAD_S = 0.20
TAIL_S = 0.50
MAX_SECONDS = 45
SOURCE_COMMIT = VAGDHENU_COMMIT
