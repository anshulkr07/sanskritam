# Codex illustration handover

Read [HANDOVER.md](HANDOVER.md). The owner explicitly authorized generation on 12 October 2026 and then expanded it to all lessons across the learning curriculum. That authorization persists across batches; do not ask again for each batch. Read [WHOLE-COURSE-AUDIT.md](WHOLE-COURSE-AUDIT.md) and [whole-course-inventory.json](whole-course-inventory.json) for the full inventory and estimates. Pens and pencils are allowed; this overrides the writing-tool exclusion in the original request revision 1. Codex performs visual QA and regenerates incorrect results without requiring manual owner review. Exact Sanskrit and teaching claims still need verification before a request becomes ready.

## Generation routes

Preferred: this chat's built-in `image_gen` tool, using the installed Image Generation skill. This route does not require the owner to supply OPENAI_API_KEY. It belongs to this Codex environment; Muse cannot assume opencode exposes the same tool.

Optional, only if the owner explicitly selects API/CLI use: OpenAI Images API or an appropriate Responses image tool. This needs separately configured API credentials/access and API billing. Do not assume Muse has API access through the owner's ChatGPT account. Consult [official documentation](https://developers.openai.com/api/docs/guides/image-generation) at execution time before choosing a model. Don't hard-code an outdated model, print keys or run paid calls without authorization. Codex CLI fallback follows the installed imagegen skill and bundled CLI rather than a custom SDK runner.

Planned division: Muse prepares/integrates, Codex generates here. Muse needs no API runner or paid image job. These files configure no automatic overnight execution.

## After the owner's start instruction

1. Re-read the owner's scope, this handover and `requests.jsonl`. `.example.jsonl` files are not live work. If actual requests aren't present, author them from approved lesson manuscripts, identify the source and verify the teaching facts before generating.
2. Choose the latest complete verified revision for each pending asset. Generate representative pilot art first, then extend the style consistently.
3. Inspect local reference images with view_image before editing/using them. Reuse approved verb scenes for continuity where helpful.
4. Use one built-in call per distinct illustration/variant. Follow the actual tool schema/skill; don't assume caller-controlled save destinations or a fixed underlying model.

## Art and inspection

- Respectful adult-first educational visuals with thoughtful composition, warm ink and matte colors. Approved classroom scenes use teal/terracotta/green. Maintain continuity within related examples without forcing every concept into one visual treatment.
- Each illustration demonstrates an action/count/contrast/mechanism. Exact counts matter: one, exactly two, or a countable group of three or more. No hidden or background people in number examples. Reading looks like reading; hands/books that establish it remain visible.
- Default scene composition is 3:2 landscape unless the request specifies otherwise. Leave caption space and crop-safe margins. Don't stretch or crop away the teaching evidence.
- Use the already-verified Devanagari and IAST strings exactly. Never add grammatical text from memory.
- The image card's visual must show Devanagari as the large, dominant label, with optional Roman IAST directly beneath at about half its height. Keep it in the image artwork area, not as a caption only after the image. Prefer `text_mode: composite_overlay`: generate scene art with an intentional caption region; Muse places selectable, verified Devanagari and smaller IAST over that region so the final visual has the requested hierarchy without risking generated lettering errors. Do not repeat the same labels beneath the art unless a separate teaching step needs that text.
- `text_mode: baked`: generate both exact labels and inspect every glyph, vowel sign, conjunct, visarga, macron and underdot. Preserve accessible equivalents. Unreadable labels need correction or an overlay-based alternative.
- Inspect action/count, ambiguity, context, spelling when present, contrast, style and crop. Art inspection is separate from grammatical verification.

## Safe delivery and coordination

Built-in results normally save under Codex-generated images. Inspect and copy selected assets into `mobile/assets/learn-v2/<asset_id>-v<asset_version>.png` or their actual extension. Create versions; don't overwrite existing deliveries. Retain the original and, if helpful, a sensible optimized rendition. Production references must not live only under `.codex`.

Write the file first, then append a complete record to `deliveries.jsonl`, following the example. Include request revision, asset version, project-relative path, actual dimensions/hash, generator route, final prompt, reference/provenance and inspection notes. `ready` means the inspected file exists, not that Muse has integrated it.

One writer per log: Codex owns deliveries/images, Muse owns requests/integration. Don't edit app/content code while Muse implements. Muse generates static asset imports from delivered existing files; missing files must never enter a require map. Revisions address changed composition/labels; don't rename files beneath integration.

Read new requests between active generation stages. Shared files do not trigger another turn or automatically wake a worker. If generation finishes and a later request arrives, the owner may need to resume Codex. No background scheduler is created by this handover.

## Hand-back and failures

After generation, write `CODEX-RESULT.md`: delivered IDs/versions/paths, final prompts, route, inspected/rejected output, remaining requests and limitations. Show representative images to the owner. Don't promise exact reproducibility from prompts/references alone.

If the built-in tool fails, report the failure. The installed imagegen skill requires offering CLI fallback and proceeding only when the owner explicitly chooses it. Don't switch routes/spend API credits silently. Follow any later owner stop/pause instruction and asset-count/budget limit.
