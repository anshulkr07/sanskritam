# Muse Spark execution instructions

Later owner scope (12 October): the full learning curriculum is now in scope for image planning, and a single Learn destination combining Path and Grammar is under consideration. Use [WHOLE-COURSE-AUDIT.md](WHOLE-COURSE-AUDIT.md) and the accompanying inventory to plan content/assessment coverage; the original slice below is completed initial work, not the project total. Generation is already authorized across batches. Retain all existing reference and assessed-practice access while planning consolidation.

Read [HANDOVER.md](HANDOVER.md). Start a separate task in your own environment. Build Learn additively; preserve Path/Grammar and their old lesson/reference flows. These instructions do not ask Codex to create a sidebar chat or silently dispatch work.

## 1. Audit and plan

Record starting Git status. Inspect the accepted rulebook, full Sandhi manuscript, verbs pilot and actual implementation. Write `coverage.md`: lesson IDs/outcomes/prerequisites, reusable material, gaps, source, verification state and visual purpose. Inspect old routes and progress before edits so preservation can be checked afterwards.

Prioritize a coherent beginner sequence and a working two-lesson slice. The existing 108 Sandhi cards are useful expansion material, not a quota or permission to skip verification. No need to cover all Sanskrit overnight.

## 2. Build the separate slice

Implement LearnV2 map/player routes and separate versioned resume state. Use the quiet card deck as the base and anchored visuals only where a multi-step explanation benefits. Provide Back/Next, a lesson endpoint, practice feedback, graceful missing-art layout, loading/error/exit/resume handling and readable large type. Do not add “A closer look,” expandable notes, disclosures or optional-detail controls. Include necessary explanation on the main cards. Swipes must not assign correctness/mastery.

Keep the old Lesson player and old Path/Grammar screens intact. Register Learn additively in navigation types, icons, labels and screen registrations. Inspect the seven-tab layout at narrow widths and larger font scale.

Finish introductory verb number and a scoped vowel-Sandhi lesson with checked Sanskrit, English/Hindi and meaningful retrieval. Include source presentation and content validation with the slice.

## 3. Content and image requests

Adapt existing manuscripts thoughtfully, then fill gaps from the shared handover's primary sources. Record sources in `sources.jsonl`. Exclude unreviewed/uncertain drafts from the released catalogue.

Write `requests.jsonl` early, one illustration per record, following `requests.example.jsonl`. The example is not a live queue. Complete grammatical verification before setting a request ready. Prioritize the slice, then reusable concepts. Not every card needs a generated image.

Codex generates after the owner starts it. Do not call OpenAI or another image provider yourself. Continue implementation while art is pending. Read `deliveries.jsonl` between active work stages, build a static registry from ready existing assets and record integration in `integration-status.jsonl`. Don't edit Codex's delivery log.

For changed labels/composition, append a higher request_revision for the same asset_id. Keep teaching facts fixed within each revision. Report rejected art by ID/revision/version and exact reason. Make the visual itself carry large, dominant Devanagari with optional Roman IAST directly underneath at about half its height in an art caption area. Prefer a native text overlay composited into the image frame over baked glyphs. Supply accessible text equivalents and avoid duplicate labels beneath the artwork unless they teach a separate point.

## 4. Expand and verify

After the slice works, adapt/validate the rest of the Sandhi pilot, then beginner foundations as capacity allows. Integrate delivered art. Do not ship broken catalogue entries or buttons leading to unfinished screens. Keep missing-art examples useful.

From mobile run `npx tsc --noEmit` and `node scripts/check-contrast.mjs`. Use `backend/.venv/Scripts/python.exe` for relevant grammar/lesson tests. Add meaningful tests for new validation/progress/grading behavior. Run the backend suite before hand-back where feasible; distinguish baseline failures from task failures with evidence.

Inspect 320/360dp and normal phone widths, English/Hindi, supported themes and large type. Check gestures versus scrolling/text selection, accessible labels, safe areas, image crop and absent images. Check Path/Grammar and their routes for regression. Verify exit/resume and that card viewing never awards mastery. Do not claim device-only behavior from a browser check.

## 5. Hand-back

Write `MUSE-RESULT.md`: exact preview/run steps, completed lessons/card counts, drafts, provenance/verification, integrated/pending/rejected asset IDs, changed files, checks, screenshots and known limits. Include how the owner can compare the same concepts in Path, Grammar and Learn. Don't delete old tabs, commit or deploy.

If time runs short, finish and verify the slice and preserve other work as drafts. Stop when useful scope is finished rather than changing things merely to consume six hours.
