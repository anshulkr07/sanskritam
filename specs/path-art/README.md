# Path artwork — complete curriculum

Generated with the built-in imagegen tool on 2026-10-09. The set contains 11 wide unit banners and 49 topic paintings, covering every released Path lesson. The original four approved paintings are retained; 56 new paintings extend their Indian storybook watercolor and gouache style.

## Coverage

| Unit | Name | Banners | Topics |
| --- | --- | --- | --- |
| 1 | Sounds | 1 | 1 |
| 2 | First Words | 1 | 3 |
| 3 | More Cases | 1 | 7 |
| 4 | Numbers | 1 | 8 |
| 5 | Persons | 1 | 6 |
| 6 | Sandhi | 1 | 4 |
| 7 | Genders | 1 | 3 |
| 8 | More Tenses | 1 | 5 |
| 9 | Voices | 1 | 2 |
| 10 | Compounds | 1 | 4 |
| 11 | Kāraka | 1 | 6 |

`manifest.json` records each unit/topic ID, filename, scene, palette, exact generation prompt, and original source path. `curriculum.json` is the released seed snapshot, checked against the local database read-only. Artwork matches stable unit and feature IDs rather than rail order.

## Integration and sizing

All 60 WebP assets live in `mobile/assets/path`. Banners are 1200×600; lesson paintings are 600 px wide. WebP quality 86 keeps the complete set to 5.67 MiB. The app bundles every painting through static requires for offline use.

Banners crop from the right to preserve the subjects on narrow phones. Sanskrit unit titles scale within the quiet left area. Lesson backgrounds fill the existing 150×190 cards, with a dark lower gradient behind native labels. Locked paintings retain the existing dimming and lock feedback. Decorative images are excluded from accessibility; text and interaction stay native. Unknown future IDs retain the gradient fallback.

## Local preview

From `mobile`, run `npm run web -- --port 8082`, then open `http://localhost:8082/path-art-preview.html`. Unit buttons show each actual Hero and horizontal lesson rail. Show all artwork presents all 60 backgrounds in their real card components. The fixture uses released curriculum titles, sample 24% progress, and seven steps per card; it does not exercise backend loading or full app navigation.

## Validation

- TypeScript `tsc --noEmit` passed.
- Android Expo export passed with all 60 paintings bundled.
- All 60 unique gallery images loaded; every unit and topic crop was inspected.
- Every Sanskrit banner title fits at 320 px. The 360 and 390 px phone layouts were also inspected.
- Continue, lesson callbacks, locked feedback, and image loading were verified. No browser errors were reported.
- Native runtime was not exercised; no running emulator was available.

Screenshots: `preview-gallery.jpg`, `preview-320.jpg`, `preview-karaka-320.jpg`, `preview-390.jpg`, `preview-topics-7-9.jpg`, and `preview-topics-10-11.jpg`.

`mobile/scripts/build-path-art.cjs` optimizes missing outputs from their manifest source paths while preserving originals. It requires sharp locally or a sharp module path as its first argument. The app needs only the committed WebP assets, not the generated source files or optimizer.

## Original four prompts

All 60 exact prompts are in `manifest.json`; the original four are also retained below.

### u1-varna-hero.webp

Use case: illustration-story. Asset type: wide background artwork for Unit 1 Varna (Sanskrit sounds) Continue card in a mobile learning app. Create a single landscape image, approximately 2:1 aspect ratio. Rich hand-painted watercolor and gouache, Indian storybook editorial illustration with fine natural textures, same warm crafted quality as a traditional painted book cover. Scene: in the RIGHT half only, a young learner in simple cream clothing seated under a banyan tree on an ochre courtyard, practicing speech with a wooden writing tablet. A few graceful golden ripples of sound curve around the tablet; three tasteful chalk letters अ क म on it, not a full alphabet. Warm golden morning light through leaves, terracotta and saffron with muted leafy green. Composition must be designed as a UI BACKGROUND: LEFT 55 percent is quiet deep burnt sienna / reddish ochre textured shadow with very little detail, suitable for white title and subtitle overlaid by app. Important faces and tablet confined to rightmost 40 percent, above bottom 25 percent. Bottom quarter quiet dark earthy shadow across width for progress bar and button. Full bleed painting, no border, no frame, no UI, no English words, no title, no watermark, no floating random letters. Inviting, beautifully painted, natural anatomy, not photorealistic, not cartoon vector, not glossy 3D.

### u1-sounds.webp

Use case: illustration-story. Asset type: portrait full bleed background for a small 150x190 mobile lesson card, Sanskrit Unit 1 Sounds first then singulars. One image, aspect ratio approximately 4:5. Hand painted watercolor and gouache Indian storybook illustration, richly crafted natural textures. Upper 60 percent: close composition of a young learner in simple cream clothing under banyan leaves, joyfully pronouncing a sound while holding a small wooden tablet inscribed only अ. Gentle golden arcs suggest spoken sound. Warm saffron and terracotta palette, dark burnt sienna edges, soft gold dappled sunlight, natural anatomy. Lower 40 percent transitions seamlessly to quiet deep reddish ochre painted shadow, almost no detail, for app overlaid white Sanskrit title and step count. Keep face and tablet above the lower text area, center-right; upper left corner quiet for small number badge. Painting only, no title, no English text, no frame, no border, no watermark, no UI, no collage. Beautiful premium painted cover artwork; not vector or glossy 3D.

### u2-doer.webp

Use case: illustration-story. Asset type: portrait full bleed background for Sanskrit Unit 2 lesson card 'What is a case?' (the doer), small mobile card at 150x190. One image, approximately 4:5 aspect ratio. Rich hand painted watercolor and gouache Indian storybook style. Upper 60 percent: a young learner in simple cream garments seated and reading an open palm leaf manuscript in a quiet gurukul courtyard, banyan leaves overhead, terracotta ink pot alongside. Depict the learner visibly performing the action of reading. Palette: deep teal shadows and edges, muted green foliage, warm golden cream light, handcrafted brush texture, natural anatomy. Lower 40 percent dissolves into quiet deep teal painted shadow, very little detail, for overlaid white Sanskrit lesson title. Important face, hands, manuscript stay above that lower region. Top left corner dark quiet space for number badge. Full bleed artwork only, no lettering, no title, no visible script, no border, no frame, no watermark, no UI, no collage, not flat vector, not glossy 3D.

### u2-object.webp

Use case: illustration-story. Asset type: portrait full bleed mobile lesson card background for Sanskrit Unit 2 'The object: whom the action reaches'. One image, aspect ratio approximately 4:5. Rich Indian storybook watercolor and gouache, detailed but soft hand painted textures. Upper 60 percent: a child's hand gently offering a ripe golden mango to another child's outstretched hand in a peaceful leafy gurukul courtyard. The fruit and receiving hand are the clear central subject; depict hands naturally, no extra fingers. Include soft terracotta courtyard and banyan greenery, warm morning light. Deep teal palette at edges with golden mango as focal point, coordinating with another teal reading lesson card. Lower 40 percent blends seamlessly into quiet dark teal painted texture for white Sanskrit title overlaid in app. Leave top left corner quiet dark for a small number badge. Full bleed art, no frame, no border, no lettering, no title, no watermark, no UI, no collage, not vector, not glossy 3D.

