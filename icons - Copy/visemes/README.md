# Viseme plates — what to generate

Drop the finished PNGs in this folder. Nothing else here needs touching;
the three `_`-prefixed files are references I generated.

## Why this exists

The lips in the source art are painted **shut**. The rig can rotate the jaw,
but rotating a sealed mouth just slides a closed line around — it can never
read as speech, and at any real rotation it also tears open a visible seam
across his cheek. The only fix is a set of mouth images that get swapped
(and cross-faded) as he talks. This is how 2D lip sync is normally done.

## The rule that matters most

**Inpaint. Do not regenerate.**

Load `../b3dd0e00-9ff6-4064-859c-8b9ef5d8f240.png` (the 1254 x 1254 original),
apply `_mouth_mask.png` as the mask, and let the model repaint **only inside
the mask**. Save the result at the same 1254 x 1254 size with every pixel
outside the mask byte-identical.

This is the same instruction that worked for `no_mala.png` and failed for the
first `no_head.png` — that one came back rescaled to 0.9706 and shifted 218 px,
because it had been regenerated rather than masked. I check every plate for
this (phase correlation against the original, plus an RGB delta on the
untouched region) and will send back anything that has drifted, so it is worth
getting the flow right once.

Mask region: **x 495-775, y 515-705**, rounded corners. It covers the
moustache, the lips, the chin patch and a little of the surrounding beard —
enough room for the mouth to open without the shape being clipped.

## The six plates

See `_viseme_spec.png` for the target aperture drawn over the real face.

| file | shape | Sanskrit | English |
|---|---|---|---|
| `v1_ee.png`  | lips slightly parted and stretched **wide**, teeth almost together, thin horizontal gap | इ ई | ee, and most of s/t/k |
| `v2_aa.png`  | **medium open** oval, upper teeth just visible, dark interior | अ | ah, eh, short vowels |
| `v3_aah.png` | **wide open**, tall oval, jaw well down, teeth and dark interior clearly visible | आ ऐ | long aa, ai |
| `v4_oh.png`  | lips **rounded** into a medium O, pushed slightly forward | ओ औ | oh |
| `v5_oo.png`  | lips **pursed tight** into a small forward circle | उ ऊ व | oo, w |
| `v6_fv.png`  | *(optional)* lower lip tucked under the upper teeth, narrow gap | फ़ व | f, v |

There is no plate for "closed" — the original art already is that, and under
a moustache a pressed M/B/P lip is indistinguishable from rest.

## Prompt each shape with a word, not a description

Image models are much better at "his mouth caught mid-word saying X" than at
"an elliptical aperture 106 px tall". Use a word to *get* the shape — but the
output is still one of the six plates above, not a plate per word. Six shapes
cover every word in the language; a plate per word would need thousands and
still could not be sequenced.

Freeze the word at the vowel's peak, not at its start or release.

| plate | prompt it as | English equivalent |
|---|---|---|
| `v1_ee.png`  | mid-way through **इति** / **कीर्ति** — the ee held | the "ee" in *see*, sustained |
| `v2_aa.png`  | mid-way through **नमः** — the a of *na* | the "a" in *cup* |
| `v3_aah.png` | mid-way through **आत्मा** or **शान्ति** — jaw at its lowest | the "a" in *father*, mouth wide |
| `v4_oh.png`  | mid-way through **ॐ** / **योग** — lips rounded | the "o" in *go* |
| `v5_oo.png`  | mid-way through **गुरु** / **भूमि** — lips pushed forward | the "oo" in *boot* |
| `v6_fv.png`  | mid-way through **विद्या** with the lip tucked | the "v" in *very* |

Same face, same lighting, same moustache, same everything — only the mouth is
mid-word. If a prompt makes the model change his expression (a smile creeping
in, eyes narrowing), say so and use a flatter one; the six plates have to be
interchangeable frame to frame or the swap reads as his whole face twitching.

## Things that will make me reject a plate

- Any change outside the mask (this includes the model "improving" his eyes).
- The moustache changing **style** between plates rather than just moving.
  It has to look like the same moustache in a different position, or the
  swap flickers.
- Beard texture regenerating differently plate to plate — same reason.
- A different lighting or colour grade. If the skin tone shifts even slightly,
  the patch edge shows.

If the model keeps drifting the beard, tell me — I can mask down to just the
lips and moustache and keep the beard from the base plate. That loses a little
motion but is completely flicker-free.

## After you drop them in

I upload each plate's mouth region as a Rive image, stack them over the mouth
inside `head_group`, and drive them from a new `viseme` input on `GuruInputs`.
Opacity per plate is `max(0, 1 - abs(viseme - n)) * 100`, which means a
**fractional** viseme value cross-fades between two shapes instead of hard
cutting — much smoother than a plain swap at 8-12 shapes per second.
`mobile/src/components/guru/viseme.ts` already has the Devanagari to viseme
mapper and the timing driver; it just needs the plates to exist.
