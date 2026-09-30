// Display names are surfaced as the FIRST name only across the app — the Home
// greeting ("नमस्ते, Kumar!"), the Progress header, and the Settings account
// row. A full display_name (e.g. a Google full name) is never shown in full.
//
// Returns "" for an empty/whitespace name so each caller can apply its own
// placeholder ("learner", "Learner", "…"). The same goes for the placeholder
// the backend generates for a guest or a sign-in that shared no name
// ("Learner_fa8fafeb", routers/auth_router.py): that is an id, not a name, and
// greeting someone with it reads as a bug.

const GENERATED = /^Learner_[A-Za-z0-9-]{4,}$/;

export function firstName(name?: string | null): string {
  const trimmed = (name ?? "").trim();
  if (GENERATED.test(trimmed)) return "";
  return trimmed.split(/\s+/)[0] ?? "";
}
