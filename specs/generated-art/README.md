# Saved project artwork, 2026-10-14

Generated with the built-in ImageGen tool. All final deity images use watercolor
and gouache, following the owner's latest direction. Restrictions prohibiting
deity images without sourced verses were removed from the festival art guidance.

## Saved files

- `mobile/assets/festivals/`: watercolor deity images, all nine Navadurga forms,
  festival scenes and retained alternative versions.
- `mobile/assets/games/`: Word Groups, Pada Path and Number Builder.
- `mobile/assets/learn/`: the Writing study image in ink and wash.
- `results/artwork-2026-10-14/originals/`: full-resolution PNG masters, saved locally
  for reuse. This directory is ignored by Git; optimized assets are trackable.
- `manifest.json`: exact generation and correction prompts, source paths, saved
  paths and selected status for every retained variant.
- `gallery.html`: selected artwork with links to originals and app versions.

Run `python specs/generated-art/save-assets.py` from the repository root to
reproduce missing optimized assets from the preserved originals. Existing assets
are left intact. Requires Pillow. Festival WebPs are 1200 x 800 at quality 86;
game and Writing images are 600 x 750.

## App integration

`festivals.ts` resolves festival and Navadurga day artwork through static requires.
Festival pages, share cards, the festival list and Home festival strip use these
offline assets, with uploaded art supported as an override. Deity images replace
the earlier symbolic scenes on corresponding pages. Symbolic and digital variants
remain saved independently for future use.

Play displays artwork on all seven game tiles and the recitation competition
banner, reusing four existing game paintings and generating the three missing
ones. Learn Library now shows chapter paintings, contextual tool thumbnails and
available lesson teaching images. Writing has its own new illustration.

Artwork stays decorative, separate from selectable titles and controls. Native
text provides the accurate Sanskrit labels; generated images do not replace
instructional diagrams or grammatical explanations.

## Verification

- 38 PNG masters and 38 optimized WebPs decoded successfully; every saved master
  matches its ImageGen source byte for byte. This includes 18 final watercolor
  deity paintings and preserved alternative images.
- Every static image reference in the festival and hub registries resolves.
- Android Expo export passed with 429 assets, including the new festival, game
  and Writing images. Output: `mobile/.expo/generated-art-export/`.
- Scoped Git whitespace validation passed.
- Final TypeScript check (`npx tsc --noEmit`) passed.
- Historical prompts in the manifest document how retained alternatives were
  produced; they do not constrain future generation.
