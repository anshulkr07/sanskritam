# Hand gesture plates — prompts

Four plates. Same flow as the visemes: **edit the original, don't regenerate.**
Load `../b3dd0e00-9ff6-4064-859c-8b9ef5d8f240.png`, mask with `_hand_mask.png`,
and add hands inside the masked region only. Output 1254 × 1254, everything
outside the mask untouched.

Unlike the mouth plates, I do **not** lift a rectangle out of these — I diff
each against the original and extract just the hand-and-forearm silhouette,
so the plate becomes a free-floating cutout I can slide and rotate. That is
what lets the gesture rise into frame and settle rather than just blink on.
It also means the hands need **crisp, closed outlines**; anything that fades
softly into the robe extracts badly.

## Where they go

See `_hand_spec.png`. Region **x 230–1030, y 800 to the bottom edge**.

- Forearms enter from the **bottom edge of the canvas** and run off it. No
  shoulders, no elbows, no join to the body — that way there is nothing to
  line up and nothing to hide.
- Palms sit around **y 900–1080**, in front of the mālā.
- **Both forearms are bare skin.** The robe is draped, not sleeved — check the
  meditation pose, where both forearms are bare with the cloth over the lap.
  The orange robe stays visible behind and beside the arms.
- Small **rudrāksha bead bracelets on both wrists**, matching the meditation
  pose.
- **Scale matters and models get this wrong:** a hand is about as long as his
  face — roughly 300 px tip-to-wrist, palm about 160 px across. If the hands
  look dainty, they are too small.

---

## Use your own full-body illustration as the style anchor

`../Adobe Express - file.png` already contains exactly the hand this needs:
abhaya mudrā, five clean fingers, bare forearm, rudrāksha wrist bracelet,
the same outline weight and skin shading. Its head is 264 px across against
the portrait's 333, so it is drawn at 0.79 the portrait's scale — close enough
that it is a good reference and **not** close enough to transplant, which is
why these are being generated fresh rather than lifted.

If your tool takes a reference image, give it that one and say "match the
hands in this reference". It is the single most useful thing you can do for
consistency.

## BLOCK A — paste first, every time

```
Add hands and forearms inside the masked region only. Every pixel outside the
mask must stay identical. Do not resize, recrop or re-render the image. Do not
change his face, hair, beard, robe, mālā or the background.

Style to match exactly: flat vector cartoon illustration, thick clean dark
outlines, cel shading in flat colour blocks, no gradients, no texture, no
noise. Skin #fa9532 with shadow #814c19 and the same warm highlight shapes
used on his chest and shoulder. Same line weight and same lighting direction
as the rest of the figure.

The forearms enter from the bottom edge of the canvas and run off it — no
shoulders, no elbows, no connection to the body. Both forearms are bare skin;
the orange robe stays behind and beside them, undisturbed. A small rudrāksha
bead bracelet on each wrist.

Proportion: a hand is about as long as his face, roughly 300 px from
fingertip to wrist with a palm about 160 px across. Draw them confidently
large, with clear separated fingers and a crisp closed outline — no soft or
faded edges anywhere.

GESTURE:
```

---

## GESTURE lines

**`anjali.png`** — greeting, session start
```
Añjali mudrā — namaste. Both palms pressed flat together, fingers pointing
up, thumbs against the sternum, held at centre chest directly in front of the
mālā. Both forearms rise symmetrically from the bottom edge. Elbows out of
frame.
```

**`abhaya.png`** — reassurance, encouragement, a correct answer
```
Abhaya mudrā. His right hand — the viewer's LEFT, the bare-shouldered side —
raised to chest height, palm facing the viewer, all four fingers extended
straight up and lightly together, thumb relaxed alongside. The other hand is
out of frame. One forearm only, rising from the bottom edge.
```

**`offer.png`** — presenting, explaining, speaking
```
An open upturned palm, offering. His left hand — the viewer's RIGHT — held at
lower chest height, palm facing up and slightly toward the viewer, fingers
relaxed and gently spread, as if presenting something resting on the palm.
The other hand is out of frame. One forearm only, rising from the bottom edge.
```

**`point.png`** — emphasis, "first...", thinking aloud
```
One raised index finger. His right hand — the viewer's LEFT — lifted to upper
chest height, index finger extended straight up, the other three fingers
curled into the palm, thumb resting against the middle finger. The other hand
is out of frame. One forearm only, rising from the bottom edge.
```

---

## Negative prompt

```
photorealistic, 3d render, photographic, texture, film grain, gradient shading,
extra fingers, six fingers, fused fingers, malformed hands, tiny hands,
disconnected floating hands, changed face, changed robe, changed mālā,
different skin tone, soft edges, blurry, watermark, text, resized, cropped
```

---

## What to check before sending

Hands are the thing image models fail at most, so glance at each one:

- **Five fingers per hand**, none fused, none extra.
- **Crisp outline** all the way round — a hand that dissolves into the robe
  cannot be extracted cleanly.
- **Big enough** — hand roughly face-length. This is the most common miss.
- Forearms **reach the bottom edge** and are cut off by it, not floating.

Send variants if they are cheap. Hands are worth two or three attempts each in
a way the mouth shapes were not.
