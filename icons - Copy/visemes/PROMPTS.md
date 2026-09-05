# Ready-to-paste prompts

Paste **BLOCK A** then the **MOUTH** line for the plate you want, as one prompt.
Generate all six in the same session back-to-back if your tool keeps context —
the beard staying consistent between plates matters more than any single plate
being perfect.

Source image: `../b3dd0e00-9ff6-4064-859c-8b9ef5d8f240.png`
Mask: `_mouth_mask.png` (white = repaint) or `_mouth_mask_cutout.png` (hole = repaint)

---

## BLOCK A — paste this first, every time

```
Edit ONLY the masked mouth region. Every pixel outside the mask must stay
identical. Do not resize, recrop or re-render the image.

Style to match exactly: flat vector cartoon illustration, thick clean dark
outlines, cel shading in flat colour blocks, no gradients, no texture, no
noise. Warm saffron skin #fa9532 with shadow #814c19. Near-black hair and
beard, #181009 in the moustache and #21170f through the beard. Lips #b64407
on the upper, #ed6e1f on the lower. Same line weight, same shading style,
same lighting direction as the rest of the face.

Keep the moustache the same shape, thickness and colour — it may move with
the upper lip, but it must read as the same moustache, not a new one. Keep
the beard the same style and density. Do not change the skin tone, the
lighting, the nose, or anything above the nose. No smile, no expression
change — only the mouth position changes.

Mouth interior, where it is visible: flat dark maroon-brown #3a1508, with a
simple off-white #f2e2c8 band for the upper teeth — one shape, no individual
teeth, no highlights. Tongue, if visible, is a single flat darker-red shape.

MOUTH:
```

---

## MOUTH lines — pick one

**`v1_ee.png`**
```
Held mid-way through the vowel of इति — the "ee" in "see", sustained. Lips
parted into a wide, thin horizontal slit, roughly six times wider than it is
tall. Upper and lower teeth almost touching, a narrow strip of upper teeth
showing. Lip corners pulled outward and slightly back. The moustache
stretches wide with the upper lip.
```

**`v2_aa.png`**
```
Held mid-way through the first syllable of नमः — the "a" in "cup". Mouth open
a moderate amount into a rounded oval about twice as wide as it is tall.
Upper teeth just visible along the top edge, dark interior below. Lips
relaxed — neither rounded nor stretched.
```

**`v3_aah.png`**
```
Held at the widest point of आत्मा — the "a" in "father", mouth wide. Jaw
dropped well down; the opening is a tall oval, close to as tall as it is
wide. Upper teeth visible along the top, large dark interior, a flat
suggestion of tongue low in the mouth. The beard on the chin is pulled
downward with the jaw. The moustache sits higher, following the raised
upper lip.
```

**`v4_oh.png`**
```
Held mid-way through योग — the "o" in "go". Lips rounded into a medium O and
pushed slightly forward, so the opening is a vertical oval a little taller
than it is wide. Small dark interior, teeth barely visible. The moustache is
pinched inward at both corners by the rounding.
```

**`v5_oo.png`**
```
Held mid-way through गुरु — the "oo" in "boot". Lips pursed tight and pushed
forward into a small circle, no wider than a third of the mouth's resting
width. Tiny dark opening, no teeth visible. The moustache is visibly
compressed inward from both sides.
```

**`v6_fv.png`** *(optional — skip if the other five are hard enough)*
```
Held on the "v" of विद्या. The lower lip is drawn up and tucked under the
upper front teeth, so a strip of upper teeth rests on the lower lip. Narrow
opening, mouth otherwise nearly closed. Upper lip and moustache raised
slightly to reveal the teeth.
```

---

## Negative prompt, if your tool takes one

```
photorealistic, 3d render, photographic, texture, film grain, gradient shading,
changed skin tone, different moustache, extra facial hair, smiling, changed
eyes, changed nose, changed hair, blurry edges, soft focus, watermark, text,
different lighting, resized, cropped
```

---

## Per-tool notes

**Photoshop / Adobe Express generative fill** — brush a selection matching
`_mouth_mask.png`, then paste BLOCK A + MOUTH. Export at the original
1254 × 1254.

**OpenAI image edit** — `image` = the original, `mask` = `_mouth_mask_cutout.png`
(the transparent area is what gets repainted), `prompt` = BLOCK A + MOUTH.

**Gemini / conversational image editors** — attach the original, then BLOCK A +
MOUTH with "change only the mouth region, keep everything else identical"
already covered by BLOCK A. These tools tend to re-render the whole image, so
check the output is still exactly 1254 × 1254 before sending it over.

## What to send me

Three or four variants per shape if it is cheap to generate them — consistency
between plates is the hard part, and having options lets me pick the set that
holds together rather than the best individual plate.

If a plate comes back **shifted** I can register it back. If it comes back
**rescaled or recropped**, I cannot recover it cleanly — regenerate that one.
