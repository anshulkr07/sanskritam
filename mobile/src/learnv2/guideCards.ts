// The full guide is the source of truth. New topics and blocks enter the
// same card player automatically; no second, abbreviated catalogue to maintain.
import type { GuideBlock, GuideTopic, Loc } from "../api/client";
import type { LearnV2Card, LearnV2Lesson } from "./types";

const empty: Loc = { en: "", hi: "" };
const labels = {
  example: { en: "See it in use", hi: "प्रयोग देखें" },
  rule: { en: "How it joins", hi: "कैसे जुड़ता है" },
  check: { en: "Try it", hi: "खुद जाँचें" },
  watch: { en: "Watch for this", hi: "इसका ध्यान रखें" },
  tip: { en: "Keep in mind", hi: "ध्यान रखें" },
  fact: { en: "Notice this", hi: "इस पर ध्यान दें" },
  analogy: { en: "Think of it this way", hi: "इसे ऐसे समझें" },
};

function unreachable(block: never): never {
  throw new Error(`Unsupported guide block: ${JSON.stringify(block)}`);
}

/** Keep every source item, with one example/step or two table rows per card.
 * Wide tables repeat the first (label) column instead of nesting a horizontal
 * scroller inside the swipe gesture. Notes have their own card. */
export function topicCards(topic: GuideTopic): LearnV2Card[] {
  const cards: LearnV2Card[] = [];
  const add = (key: string, card: Omit<LearnV2Card, "id">) => {
    cards.push({ id: `guide:${topic.id}:${key}`, ...card });
  };
  add("intro", { kind: "teach", title: topic.title, body: topic.summary,
    ...(topic.term ? { term: topic.term, guide: { topicId: topic.id, sanskrit: topic.term } } : {}) });

  const blockCards = (block: GuideBlock, key: string, heading: Loc) => {
    switch (block.kind) {
      case "text":
      case "analogy":
      case "callout":
        add(key, { kind: "teach", title: block.kind === "callout" ? labels[block.tone] : block.kind === "analogy" ? labels.analogy : heading, body: block.text });
        break;
      case "steps":
        block.items.forEach((body, i) => add(`${key}:${i}`, { kind: "teach", title: {
          en: `${heading.en} · Step ${i + 1} of ${block.items.length}`,
          hi: `${heading.hi} · चरण ${i + 1} / ${block.items.length}`,
        }, body }));
        break;
      case "examples":
      case "wild":
        block.items.forEach((ex, i) => add(`${key}:${i}`, {
          kind: "anchor", title: block.kind === "examples" ? block.title ?? labels.example : labels.example,
          body: ex.source ?? empty,
          example: { sa: ex.sa, iast: ex.iast, gloss: ex.meaning, alt: ex.meaning },
          guide: { topicId: topic.id, example: ex },
        }));
        break;
      case "formula":
        add(key, { kind: "teach", title: labels.rule, body: block.rule,
          example: { sa: block.result.sa, iast: block.result.iast, gloss: block.rule, alt: block.rule,
            formula: `${block.a.sa} + ${block.b.sa} → ${block.result.sa}` },
          steps: [block.a, block.b, block.result].map((s, i) => ({ ...s, label: i === 2 ? { en: "result", hi: "परिणाम" } : { en: `part ${i + 1}`, hi: `भाग ${i + 1}` } })),
          guide: { topicId: topic.id, sounds: [block.a, block.b, block.result] },
        });
        break;
      case "table": {
        // First column stays visible in every slice. No source cell is folded away.
        const groups = block.columns.length <= 3
          ? [block.columns.map((_, i) => i)]
          : Array.from({ length: Math.ceil((block.columns.length - 1) / 2) }, (_, i) =>
            [0, ...[i * 2 + 1, i * 2 + 2].filter((n) => n < block.columns.length)]);
        for (let row = 0; row < block.rows.length; row += 2) {
          groups.forEach((cols, col) => add(`${key}:${row}:${col}`, { kind: "teach", title: block.caption, body: empty,
            guide: { topicId: topic.id, block: { ...block, note: undefined,
              columns: cols.map((i) => block.columns[i]), rows: block.rows.slice(row, row + 2).map((r) => cols.map((i) => r[i])),
            } },
          }));
        }
        if (block.note) add(`${key}:note`, { kind: "teach", title: block.caption, body: block.note });
        break;
      }
      default: unreachable(block);
    }
  };

  topic.blocks.forEach((b, i) => blockCards(b, `b${i}`, topic.title));
  topic.deeper.forEach((d, i) => d.blocks.forEach((b, j) => blockCards(b, `d${i}:${j}`, d.title)));
  topic.quiz.forEach((q, i) => add(`q${i}`, { kind: "practice", title: labels.check, body: empty,
    practice: { prompt: q.prompt, explain: q.explain, choices: q.options.map((opt, index) => ({
      correct: index === q.answer,
      label: opt.sa ? { en: `${opt.sa} (${opt.iast ?? ""})`, hi: `${opt.sa} (${opt.iast ?? ""})` } : opt.text ?? empty,
    })) },
  }));
  topic.proofs.forEach((proof, i) => add(`proof${i}`, { kind: "teach", title: proof.label, body: empty,
    guide: { topicId: topic.id, proof },
  }));
  topic.terms.forEach((term, i) => add(`term${i}`, { kind: "summary", title: { en: "Remember this word", hi: "यह शब्द याद रखें" }, body: empty,
    term: { sa: term.term_sa, iast: term.term_iast, meaning: term.meaning },
    guide: { topicId: topic.id, sanskrit: { sa: term.term_sa, iast: term.term_iast, audio_url: term.audio_url } },
  }));
  return cards;
}

export function guideCardLesson(id: string, topics: GuideTopic[], title?: Loc): LearnV2Lesson {
  if (!topics.length) throw new Error(`No source topics for ${id}`);
  const first = topics[0];
  return {
    id, rank: first.rank, unit: first.chapter.title, title: title ?? first.title,
    titleSa: first.title_sa, titleIast: first.title_iast, outcome: first.summary,
    minutes: topics.reduce((n, t) => n + t.minutes, 0), prereqIds: [],
    topicIds: topics.map((t) => t.id), cards: topics.flatMap(topicCards),
    sourcesLabel: { en: [...new Set(topics.map((t) => t.attribution))].join("\n"), hi: [...new Set(topics.map((t) => t.attribution))].join("\n") },
  };
}
