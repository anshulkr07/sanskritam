# Read, Play and Learn artwork refresh

Artwork generated with the built-in ImageGen tool, one prompt per asset.
The exact prompts, selected source paths and application paths are recorded in
[manifest.json](./manifest.json). Four game illustrations were edited to remove
unwanted blank answer panels; their original prompts and sources are retained
in that manifest and the targeted correction prompts are in [edits.json](./edits.json).

## Saved assets

- `mobile/assets/covers/`: 39 new watercolor and gouache covers, completing the
  54 books in Read's defined shelves. Existing covers are retained.
- `mobile/assets/games/*-v2.webp`: 12 new illustrations: all seven games,
  leaderboards, friends, quick match, recitation competition and challenge.
  Clay renders, layered paper and isometric game scenes suit each activity.
- `mobile/assets/learn/*-v2.webp`: four new watercolor and ink illustrations
  for reference tables, advanced study, metre and rhythm, and the library.
- `results/art-refresh-20261015/originals/`: full-resolution selected PNG
  masters, saved locally and ignored by Git.

Read covers are 600 × 900, game and learning portraits 600 × 750, and the three
wide banners 1200 × 600. App assets use WebP quality 86 and static requires for
offline access. Run `python specs/art-refresh-20261015/save-assets.py` to rebuild
them from the saved masters or original generated files.

## Integration

Read and Audio share the completed cover registry. Play replaces all seven
game paintings, adds illustrated friends and quick-match cards, and uses the
new artwork in rank, goal, competition and practice cards. Leaderboards use a
trophy scene with stronger shading behind statistics. Secondary Play text now
uses the readable cream colour rather than the watermark colour.

Learn's Library adds imagery to tables, advanced topics, the full reference,
metre course and search results. Card lessons retain their existing teaching
images where available, with painted library/metre fallbacks. These decorative
illustrations do not replace instructional diagrams or example images.

## Visual verification

The offline [preview](http://localhost:8083/art-refresh-preview.html) renders
production Read covers, the Play screen, the leaderboard screen and Learn
thumbnail components. Play and leaderboard data are local fixtures; taps report
their destination instead of starting a game or creating a room.

- [Read at 390 px](./read-390.jpg), [Play at 390 px](./play-390.jpg), [games](./games-390.jpg),
  [narrow Play layout](./play-320.jpg), [leaderboard](./leaderboard-390.jpg),
  and [Learn thumbnails](./learn-thumbnails-390.jpg).
- [Game illustrations](./games-contact.jpg), [Learn illustrations](./learn-contact.jpg),
  and [Read covers](./covers-contact.jpg).

Phone previews check image loading, native label readability, clipping and
horizontal overflow. Decorative Play and Learn images are hidden from screen
readers and do not intercept touches. Native device installation is not part
of the visual preview checks.

Production publication and final bundle checks are recorded in
[production-ota.md](./production-ota.md).
