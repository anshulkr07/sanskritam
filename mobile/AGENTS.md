# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Lessons and Sanskrit display

Every current and future Learn lesson must open in the shared swipeable card
player, with Continue/Back and completion progress. Exception (owner,
2026-10-20): the story course in `src/story` is swipe-only (`controls={false}`):
no Continue/Back buttons, a Finish button on the last card. Preserve the complete
source material; do not fall back to a long scrolling grammar page or replace
full teaching with an illustrated summary. Keep examples, tables, qualifications,
quick checks, audio and source attribution when converting content.

Across the app, Sanskrit examples, sound names, endings and rules are primarily
Devanagari, in English explanations as well as Hindi. Write अ + इ → ए, not a + i
→ e. Roman/IAST is optional secondary support: smaller and less prominent,
and may be omitted where space is tight. Keep intentional transliteration
instruction and input/search support functional. Do not change API identifiers,
stored answer values, source quotations or transliteration fields to enforce a
display preference.

# Artwork and reader backgrounds

Read [`../specs/artwork/ARTWORK.md`](../specs/artwork/ARTWORK.md) before generating
or changing artwork or its integration. Phones are primary: use one temporary
9:16 portrait original per verse, derive phone/tablet files, verify publication,
then discard originals without master backups. Preserve the complete painting
across orientations with contain fitting and explicit measured image bounds.
The painting goes On top of the verse page by default, or on its Own page, or
not at all (No image), persisted per reader, with independent text color/text
opacity (owner, 2026-10-20; the 48% painting-behind-text layout is retired). Keep startup/tutor/fallback art bundled;
larger paintings belong in R2 with device caching. Do not reintroduce static
`require()` references to migrated paintings when regenerating asset registries.
