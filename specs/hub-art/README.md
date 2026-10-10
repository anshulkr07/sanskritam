# Play and Grammar artwork

Production OTA: [release record](./production-ota.md), published for existing Android runtime 1.1.0 on 9 October 2026.

34 new paintings generated using the built-in ImageGen tool in generate mode, with one distinct prompt per asset. They match the Indian storybook watercolor and gouache style of Read and Path.

Final optimized assets: `mobile/assets/hubs/` (34 WebPs, 3,280,266 bytes / 3.13 MiB).

- 18 Grammar chapter paintings, mapped to the backend's stable chapter IDs.
- Four Play games: Shabda Rush, Smriti, Varna Jaal, and Daily word.
- Three Play banners: Today's challenge, Competition, and Recite.
- Four Grammar tools: Word Lab, Sound map, Word order, and Rhythm. Word order and Rhythm are also used for Play practice thumbnails.
- Four additional practice paintings: Sandhi, Paradigms, Words, and Challenges.
- One Grammar Continue reading banner.

The final prompt set, semantic scene descriptions, asset filenames, and preserved original source paths are in [manifest.json](./manifest.json). All entries are complete. Original PNGs remain in the Codex generated-images directory; production uses only the workspace WebPs.

30 portrait assets are 600 × 750 and four wide assets are 1200 × 600, encoded at WebP quality 86. `mobile/scripts/build-hub-art.cjs` reproduces optimization from the source paths in the manifest and leaves originals intact.

## Integration

`mobile/src/components/artwork/hubs.ts` uses static requires so the images bundle for offline use. Play and Grammar render the shared decorative background and thumbnail components. Titles, Sanskrit labels, actions, and progress remain native elements. The paintings do not receive touches and are hidden from accessibility trees.

Portrait cards reserve the bottom for titles and progress. Wide paintings fit to banner height and anchor to the right, preserving faces on shallow cards. A dark fill and gradients keep labels readable. The challenge play button sits below the subject's face. Two-column grids fit small phones.

## Verification

- `npx tsc --noEmit` passed.
- Android Expo export passed and included all 34 hub assets. Export output and logs are in the ignored `mobile/.expo/hub-art-export/` and `mobile/.expo/hub-art-export-check.log`.
- Scoped `git diff --check` passed.
- The live Expo web renderer loaded 36 image placements with all 34 unique assets successfully. All image elements have an aria-hidden ancestor.
- Inspected 320 px and 390 px phone layouts, all chapter paintings, long English titles, Hindi titles, practice thumbnails, tools, and banner crops. Confirmed card callbacks for games, Grammar chapters, and tools.

Preview: [Play and Grammar](http://localhost:8082/hub-art-preview.html). It renders the production card components with offline bilingual curriculum fixtures and sample banner data. Preview callbacks report taps; they do not call the backend, start games, or enter competitions. Native device runtime was not exercised; Android bundling was verified.

Saved visual proof: [both tabs](./both-tabs.jpg), [Play at 390 px](./play-390.jpg), [practice](./play-practice-390.jpg), [Grammar at 390 px](./grammar-390.jpg), and [Hindi at 320 px](./grammar-hi-320.jpg).
