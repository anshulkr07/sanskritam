// BlockRenderer — draws one typed grammar-guide block (GuideBlock).
//
// Everything Sanskrit here came from the backend with lipi IAST; nothing is
// composed on the device. Rules carried from the rest of the app: script() on
// every Devanagari node, the 18pt Sanskrit floor via sized(), a speaker only
// when a clip exists, table endings marked by weight AND colour (§U5-3), and
// wide tables scroll inside their own horizontal ScrollView.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type {
  GuideBlock,
  GuideCell,
  GuideExample,
  GuideLang,
  GuideSanskrit,
  Loc,
} from "../../api/client";
import TeachingArt from "../../learnv2/TeachingArt";
import { findGuideArt } from "../../learnv2/assetMap";
import { useTypeScale } from "../../hooks/useTypeScale";
import { haptics } from "../../services/haptics";
import { color, fill, font, onFill, radius, script, space, type FillName } from "../../theme";
import { splitAtAkshara } from "../../utils/akshara";
import { playClip } from "../../services/speech";
import AudioButton from "./AudioButton";
import InlineText from "./InlineText";
import { GUIDE_UI } from "./strings";

export interface GuideTextCtx {
  lang: GuideLang;
  t: (loc?: Loc | null) => string;
  tone?: FillName;
  topicId?: string;
}

export function CheckedMark({ lang }: { lang: GuideLang }) {
  return (
    <View accessible accessibilityLabel={GUIDE_UI.checked[lang]} style={styles.checked}>
      <Ionicons name="shield-checkmark-outline" size={16} color={color.okText} />
    </View>
  );
}

/** One Sanskrit string: Devanagari, its IAST, a speaker, the engine mark. */
export function SanskritLine({
  node,
  ctx,
  size = 22,
  meaning,
}: {
  node: GuideSanskrit;
  ctx: GuideTextCtx;
  size?: number;
  meaning?: Loc;
}) {
  const { sized } = useTypeScale();
  return (
    <View style={styles.saRow}>
      <View style={styles.saText}>
        <Text
          style={[script("semibold"), styles.sa, { fontSize: sized(size, { sanskrit: true }) }]}
          accessibilityLabel={[node.iast, meaning ? ctx.t(meaning) : ""].filter(Boolean).join(". ")}
        >
          {node.sa}
        </Text>
        <Text style={[styles.iast, { fontSize: sized(font.sizes.sm) }]}>{node.iast}</Text>
      </View>
      {node.checked && <CheckedMark lang={ctx.lang} />}
      <AudioButton url={node.audio_url} label={node.iast} />
    </View>
  );
}

function ExampleCard({ item, ctx, wild }: { item: GuideExample; ctx: GuideTextCtx; wild?: boolean }) {
  const { sized } = useTypeScale();
  const [open, setOpen] = React.useState(false);
  const artId = wild ? undefined : findGuideArt(ctx.topicId, item.sa, item.iast);
  const words = item.words ?? [];
  const showAll = words.length > 0 && words.length <= 5;
  const underline: FillName[] = ["saffron", "teal", "sage", "rose", "gold", "slate"];
  return (
    <View style={[styles.example, wild && styles.exampleWild]}>
      {artId ? <>
        <TeachingArt assetId={artId} sa={item.sa} iast={item.iast} />
        <View style={styles.saRow}>
          {item.checked && <CheckedMark lang={ctx.lang} />}
          <AudioButton url={item.audio_url} label={item.iast} />
        </View>
      </> : <SanskritLine node={item} ctx={ctx} size={22} meaning={item.meaning} />}
      <InlineText
        text={ctx.t(item.meaning)}
        lang={ctx.lang}
        style={[styles.meaning, { fontSize: sized(font.sizes.base) }]}
      />
      {!!item.source && (
        <InlineText
          text={ctx.t(item.source)}
          lang={ctx.lang}
          style={[styles.source, { fontSize: sized(font.sizes.xs) }]}
        />
      )}
      {showAll ? (
        <View style={styles.wordInline}>
          {words.map((wd, i) => (
            <View key={`${wd.sa}-${i}`} style={styles.wordCell}>
              <Text style={[script("semibold"), styles.sa, { fontSize: sized(18, { sanskrit: true }) }]}>{wd.sa}</Text>
              <Text style={[styles.wordGloss, { borderBottomColor: fill[underline[i % underline.length]] }]}>{ctx.t(wd.gloss)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <>
          {words.length > 0 && (
            <Pressable
              onPress={() => {
                haptics.tap();
                setOpen((o) => !o);
              }}
              style={styles.wordToggle}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              accessibilityLabel={open ? GUIDE_UI.hideWords[ctx.lang] : GUIDE_UI.wordByWord[ctx.lang]}
            >
              <Ionicons name={open ? "remove-circle-outline" : "add-circle-outline"} size={16} color={color.saffron} />
              <Text style={[styles.wordToggleText, ctx.lang === "hi" && script("semibold")]}>
                {open ? GUIDE_UI.hideWords[ctx.lang] : GUIDE_UI.wordByWord[ctx.lang]}
              </Text>
            </Pressable>
          )}
          {open &&
            words.map((wd, i) => (
              <View key={`${wd.sa}-${i}`} style={styles.wordRow}>
                <View style={styles.wordSa}>
                  <Text style={[script("semibold"), styles.sa, { fontSize: sized(18, { sanskrit: true }) }]}>{wd.sa}</Text>
                  <Text style={[styles.iast, { fontSize: sized(font.sizes.xs) }]}>{wd.iast}</Text>
                </View>
                <InlineText
                  text={ctx.t(wd.gloss)}
                  lang={ctx.lang}
                  style={[styles.gloss, { fontSize: sized(font.sizes.sm) }]}
                />
                {wd.checked && <CheckedMark lang={ctx.lang} />}
                <AudioButton url={wd.audio_url} label={wd.iast} />
              </View>
            ))}
        </>
      )}
    </View>
  );
}

function TableCellView({ cell, first, ctx }: { cell: GuideCell; first: boolean; ctx: GuideTextCtx }) {
  const { sized } = useTypeScale();
  if ("text" in cell) {
    return (
      <View style={[styles.td, styles.tdTextCol, first && styles.tdFirst]}>
        <InlineText text={ctx.t(cell.text)} lang={ctx.lang} style={[styles.tdText, { fontSize: sized(font.sizes.sm) }]} />
      </View>
    );
  }
  const [rawHead, rawTail] = cell.split ?? [cell.sa, ""];
  const [head, tail] = splitAtAkshara(rawHead, rawTail);
  const tone = ctx.tone ?? "saffron";
  const tappable = !!cell.audio_url;
  const play = () => {
    if (cell.audio_url) {
      haptics.tap();
      void playClip(cell.audio_url, () => {}).catch(() => {});
    }
  };
  const body = (
    <View style={[styles.td, styles.tdSaCol, first && styles.tdFirst]}>
      <View style={styles.cellTop}>
        <Text
          style={[script("semibold"), styles.sa, { fontSize: sized(18, { sanskrit: true }) }]}
          accessibilityLabel={`${cell.sa}. ${tappable ? "Tap to hear." : ""}`}
        >
          {head}
          {!!tail && <Text style={[script("extrabold"), { color: fill[tone] }]}>{tail}</Text>}
        </Text>
      </View>
      <Text style={[styles.iast, { fontSize: sized(font.sizes.xs) }]}>{cell.iast}</Text>
    </View>
  );
  if (!tappable) return body;
  return (
    <Pressable onPress={play} accessibilityRole="button" accessibilityLabel={`${cell.sa}. Tap to hear.`} style={styles.tdSaCol}>
      {body}
    </Pressable>
  );
}

function TableBlock({ block, ctx }: { block: Extract<GuideBlock, { kind: "table" }>; ctx: GuideTextCtx }) {
  const { sized } = useTypeScale();
  const checked = block.rows.some((row) => row.some((c) => "sa" in c && c.checked));
  const cols = block.columns.length;
  // Up to four columns never scroll: fold the second text column into the
  // first as a small second line (the case table becomes Case/question, Form, Meaning).
  const folded = cols >= 4 && block.rows.every((row) => row.length >= 2 && "text" in row[0] && "text" in row[1]);
  const showCols = folded ? [block.columns[0], ...block.columns.slice(2)] : block.columns;
  const needsScroll = (folded ? showCols.length : cols) >= 5;
  const table = (
    <View>
      <View style={styles.trHead}>
        {showCols.map((c, i) => (
          <View key={i} style={i === 0 ? styles.thCell : styles.thCellSa}>
            <InlineText text={ctx.t(c)} lang={ctx.lang} style={[styles.th, { fontSize: sized(10.5) }]} />
          </View>
        ))}
      </View>
      {block.rows.map((row, r) => {
        const cells = folded ? [row[0], ...row.slice(2)] : row;
        return (
          <View key={r} style={styles.tr}>
            {cells.map((c, i) => (
              <TableCellView key={i} cell={c} first={i === 0} ctx={ctx} />
            ))}
          </View>
        );
      })}
    </View>
  );
  return (
    <View style={styles.tableWrap}>
      <View style={styles.captionRow}>
        <InlineText text={ctx.t(block.caption)} lang={ctx.lang} style={[styles.caption, { fontSize: sized(font.sizes.base) }]} />
        {checked && <CheckedMark lang={ctx.lang} />}
        {needsScroll && <Text style={styles.swipeHint}>swipe →</Text>}
      </View>
      {needsScroll ? (
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.tableScroll}>{table}</ScrollView>
      ) : (
        table
      )}
      {!!block.note && (
        <InlineText text={ctx.t(block.note)} lang={ctx.lang} style={[styles.note, { fontSize: sized(font.sizes.sm) }]} />
      )}
    </View>
  );
}

function SaChip({ node, strong, tone }: { node: GuideSanskrit; strong?: boolean; tone?: FillName }) {
  const { sized } = useTypeScale();
  const solid = strong && tone ? fill[tone] : undefined;
  return (
    <View
      style={[styles.chip, styles.chipOutline, strong && tone ? { backgroundColor: solid, borderColor: solid } : null]}
      accessible
      accessibilityLabel={node.iast}
    >
      <Text
        style={[
          script(strong ? "bold" : "semibold"),
          styles.sa,
          { fontSize: sized(20, { sanskrit: true }), color: strong && tone ? onFill.text : color.ink },
        ]}
      >
        {node.sa}
      </Text>
      <Text
        style={[
          styles.iast,
          { fontSize: sized(font.sizes.xs), color: strong && tone ? onFill.soft : color.inkSoft },
        ]}
      >
        {node.iast}
      </Text>
    </View>
  );
}

export default function BlockRenderer({ block, ctx }: { block: GuideBlock; ctx: GuideTextCtx }) {
  const { sized } = useTypeScale();
  const body = [styles.body, { fontSize: sized(font.sizes.base), lineHeight: sized(font.sizes.base) * 1.55 }];

  switch (block.kind) {
    case "text":
      return <InlineText text={ctx.t(block.text)} lang={ctx.lang} style={body} />;

    case "analogy":
      return (
        <View style={styles.calloutPlain}>
          <View style={styles.panelHead}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={fill[ctx.tone ?? "saffron"]} />
            <Text style={[styles.panelLabel, { color: fill[ctx.tone ?? "saffron"] }, ctx.lang === "hi" && script("bold")]}>
              {GUIDE_UI.thinkOfIt[ctx.lang]}
            </Text>
          </View>
          <InlineText text={ctx.t(block.text)} lang={ctx.lang} style={body} />
        </View>
      );

    case "callout": {
      if (block.tone === "watch") {
        return (
          <View style={styles.watchBlock}>
            <View style={styles.panelHead}>
              <Ionicons name="alert-circle-outline" size={18} color={onFill.text} />
              <Text style={[styles.panelLabel, { color: onFill.text }, ctx.lang === "hi" && script("bold")]}>
                {GUIDE_UI[block.tone][ctx.lang]}
              </Text>
            </View>
            <InlineText text={ctx.t(block.text)} lang={ctx.lang} style={[body, styles.watchText]} />
          </View>
        );
      }
      const icon = block.tone === "fact" ? "sparkles-outline" : "bulb-outline";
      return (
        <View style={styles.calloutPlain}>
          <View style={styles.panelHead}>
            <Ionicons name={icon} size={18} color={fill[ctx.tone ?? "saffron"]} />
            <Text style={[styles.panelLabel, { color: fill[ctx.tone ?? "saffron"] }, ctx.lang === "hi" && script("bold")]}>
              {GUIDE_UI[block.tone][ctx.lang]}
            </Text>
          </View>
          <InlineText text={ctx.t(block.text)} lang={ctx.lang} style={body} />
        </View>
      );
    }

    case "steps":
      return (
        <View style={styles.steps}>
          {block.items.map((item, i) => (
            <View key={i} style={styles.stepRow}>
              <Text style={[styles.stepNumText, { color: fill[ctx.tone ?? "saffron"] }]}>{i + 1}</Text>
              <InlineText text={ctx.t(item)} lang={ctx.lang} style={[body, styles.stepText]} />
            </View>
          ))}
        </View>
      );

    case "examples":
      return (
        <View style={styles.group}>
          {!!block.title && (
            <InlineText text={ctx.t(block.title)} lang={ctx.lang} style={[styles.groupTitle, { fontSize: sized(font.sizes.md) }]} />
          )}
          {block.items.map((item, i) => (
            <ExampleCard key={`${item.sa}-${i}`} item={item} ctx={ctx} />
          ))}
        </View>
      );

    case "wild":
      return (
        <View style={styles.group}>
          <View style={styles.panelHead}>
            <Ionicons name="earth-outline" size={18} color={color.goldText} />
            <Text style={[styles.groupTitle, { color: color.goldText, fontSize: sized(font.sizes.md) }, ctx.lang === "hi" && script("bold")]}>
              {GUIDE_UI.wild[ctx.lang]}
            </Text>
          </View>
          {block.items.map((item, i) => (
            <ExampleCard key={`${item.sa}-${i}`} item={item} ctx={ctx} wild />
          ))}
        </View>
      );

    case "formula":
      return (
        <View style={styles.formula}>
          <View style={styles.formulaRow}>
            <SaChip node={block.a} tone={ctx.tone} />
            <Text style={styles.op} accessibilityLabel="plus">+</Text>
            <SaChip node={block.b} tone={ctx.tone} />
            <Ionicons name="arrow-forward" size={20} color={color.inkSoft} accessibilityLabel="becomes" />
            <SaChip node={block.result} strong tone={ctx.tone} />
            {block.result.checked && <CheckedMark lang={ctx.lang} />}
            <AudioButton url={block.result.audio_url} label={block.result.iast} />
          </View>
          <InlineText text={ctx.t(block.rule)} lang={ctx.lang} style={[styles.note, { fontSize: sized(font.sizes.sm) }]} />
        </View>
      );

    case "table":
      return <TableBlock block={block} ctx={ctx} />;

    default:
      return null;
  }
}

const styles = StyleSheet.create({
  body: { fontFamily: "Nunito_400Regular", fontWeight: "400", color: color.ink },
  sa: { color: color.ink },
  iast: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft, fontStyle: "italic" },
  saRow: { flexDirection: "row", alignItems: "center", gap: space.xs },
  saText: { flex: 1 },
  checked: { paddingHorizontal: 2 },
  meaning: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.ink, marginTop: space.xxs },
  source: { fontFamily: "Nunito_400Regular", fontWeight: "400", color: color.inkSoft, marginTop: space.xxs },
  example: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
    paddingVertical: space.sm,
    gap: 4,
  },
  exampleWild: { borderLeftWidth: 3, borderLeftColor: fill.gold, paddingLeft: space.sm },
  wordInline: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.xs },
  wordCell: { minWidth: 72, gap: 2 },
  wordGloss: { fontSize: font.sizes.xs, color: color.inkSoft, borderBottomWidth: 2, paddingBottom: 2, alignSelf: "flex-start" },
  wordToggle: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: space.xs, minHeight: 36, alignSelf: "flex-start" },
  wordToggleText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.saffronText },
  wordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingVertical: space.xxs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  wordSa: { minWidth: 96 },
  gloss: { flex: 1, fontFamily: "Nunito_400Regular", fontWeight: "400", color: color.ink },
  group: { gap: space.xs },
  groupTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink },
  calloutPlain: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, paddingTop: space.xs, gap: 4 },
  watchBlock: { backgroundColor: fill.gold, borderRadius: radius.md, padding: space.sm, gap: 4 },
  watchText: { color: onFill.text },
  panelHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  panelLabel: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm },
  steps: { gap: space.xs },
  stepRow: { flexDirection: "row", gap: space.xs, alignItems: "flex-start" },
  stepNumText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: 16, minWidth: 24 },
  stepText: { flex: 1 },
  tableWrap: { gap: space.xs },
  captionRow: { flexDirection: "row", alignItems: "center", gap: space.xs },
  caption: { flex: 1, fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink },
  swipeHint: { fontSize: 12, color: color.inkSoft, fontWeight: "700" },
  tableScroll: { paddingBottom: 4 },
  tr: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  trHead: { flexDirection: "row", borderBottomWidth: 1.5, borderBottomColor: color.ink },
  thCell: { flex: 1.3, paddingHorizontal: 6, paddingVertical: 6, justifyContent: "center" },
  thCellSa: { flex: 1, paddingHorizontal: 6, paddingVertical: 6, justifyContent: "center" },
  td: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    justifyContent: "center",
  },
  tdTextCol: { flex: 1.3 },
  tdSaCol: { flex: 1 },
  tdFirst: { flex: 1.3 },
  th: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.inkSoft, textTransform: "uppercase" },
  tdText: { fontFamily: "Nunito_400Regular", fontWeight: "400", color: color.ink },
  cellTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  note: { fontFamily: "Nunito_400Regular", fontWeight: "400", color: color.inkSoft },
  formula: { gap: space.xs, paddingVertical: space.xs },
  formulaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: space.xs },
  chip: { borderRadius: radius.sm, paddingHorizontal: space.xs, paddingVertical: 4, alignItems: "center" },
  chipOutline: { borderWidth: 1.5, borderColor: color.border, backgroundColor: color.white },
  op: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.lg, color: color.inkSoft },
});
