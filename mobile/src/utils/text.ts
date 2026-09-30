// The app's copy rule is no em dashes. Our own strings follow it; text that
// arrives from the server (authored lessons, unit blurbs, model explanations)
// goes through plain() where it is rendered as prose.
//
// Not applied to API payloads wholesale: scansion data uses "—" as a
// long-syllable mark (Shloka.tsx), and rewriting it would change the data.

export function plain(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/^\s*[—–]\s*/gm, "") // a dash opening a line ("— source")
    .replace(/\s*[—–]\s*$/gm, "") // a dash closing a line ("Here it is —")
    .replace(/\s+[—–]\s+/g, ", ") // spaced dash between clauses
    .replace(/(\S)—(\S)/g, "$1, $2") // unspaced em dash between words
    .replace(/,\s*,/g, ",")
    .replace(/,\s*([.;:!?])/g, "$1");
}
