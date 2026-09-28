// BlockRenderer — draws one typed grammar-guide block (GuideBlock).
//
// Everything Sanskrit here came from the backend with lipi IAST; nothing is
// composed on the device. Rules carried from the rest of the app: script() on
// every Devanagari node, the 18pt Sanskrit floor via sized(), a speaker only
// when a clip exists, table endings marked by weight AND colour (§U5-3), and
// wide tables scroll inside their own horizontal ScrollView.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { IoniconsIconName } from "@react-native-vector-icons/ionicons";
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
import { useTypeScale } from "../../hooks/useTypeScale";
import { haptics } from "../../services/haptics";
import { color, font, radius, script, shadow, space } from "../../theme";
import AudioButton from "./AudioButton";
import InlineText from "./InlineText";
import { GUIDE_UI } from "./strings";

export interface GuideTextCtx {
  lang: GuideLang;
  t: (loc?: Loc | null) => string;
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
  const words = item.words ?? [];
  return (
    <View style={[styles.example, wild && styles.exampleWild]}>
      <SanskritLine node={item} ctx={ctx} meaning={item.meaning} />
      <InlineText
        text={ctx.t(item.meaning)}
        lang={ctx.lang}
        style={[styles.meaning, { fontSize: sized(font.sizes.base) }]}
      />
      {!!item.source && (
        <InlineText
          text={`— ${ctx.t(item.source)}`}
          lang={ctx.lang}
          style={[styles.source, { fontSize: sized(font.sizes.xs) }]}
        />
      )}
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
    </View>
  );
}

function TableCellView({ cell, first, ctx }: { cell: GuideCell; first: boolean; ctx: GuideTextCtx }) {
  const { sized } = useTypeScale();
  if ("text" in cell) {
    return (
      <View style={[styles.td, first && styles.tdFirst]}>
        <InlineText text={ctx.t(cell.text)} lang={ctx.lang} style={[styles.tdText, { fontSize: sized(font.sizes.sm) }]} />
      </View>
    );
  }
  const [head, tail] = cell.split ?? [cell.sa, ""];
  return (
    <View style={[styles.td, first && styles.tdFirst]}>
      <View style={styles.cellTop}>
        <Text
          style={[script("semibold"), styles.sa, { fontSize: sized(18, { sanskrit: true }) }]}
          accessibilityLabel={cell.iast}
        >
          {head}
          {!!tail && <Text style={[script("extrabold"), styles.ending]}>{tail}</Text>}
        </Text>
        <AudioButton url={cell.audio_url} label={cell.iast} />
      </View>
      <Text style={[styles.iast, { fontSize: sized(font.sizes.xs) }]}>{cell.iast}</Text>
    </View>
  );
}

function TableBlock({ block, ctx }: { block: Extract<GuideBlock, { kind: "table" }>; ctx: GuideTextCtx }) {
  const { sized } = useTypeScale();
  const checked = block.rows.some((row) => row.some((c) => "sa" in c && c.checked));
  return (
    <View style={styles.tableWrap}>
      <View style={styles.captionRow}>
        <InlineText text={ctx.t(block.caption)} lang={ctx.lang} style={[styles.caption, { fontSize: sized(font.sizes.base) }]} />
        {checked && <CheckedMark lang={ctx.lang} />}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.tableScroll}>
        <View>
          <View style={[styles.tr, styles.thRow]}>
            {block.columns.map((c, i) => (
              <View key={i} style={[styles.td, i === 0 && styles.tdFirst]}>
                <InlineText text={ctx.t(c)} lang={ctx.lang} style={[styles.th, { fontSize: sized(font.sizes.xs) }]} />
              </View>
            ))}
          </View>
          {block.rows.map((row, r) => (
            <View key={r} style={[styles.tr, r % 2 === 1 && styles.trAlt]}>
              {row.map((c, i) => (
                <TableCellView key={i} cell={c} first={i === 0} ctx={ctx} />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      {!!block.note && (
        <InlineText text={ctx.t(block.note)} lang={ctx.lang} style={[styles.note, { fontSize: sized(font.sizes.sm) }]} />
      )}
    </View>
  );
}

function SaChip({ node, strong }: { node: GuideSanskrit; strong?: boolean }) {
  const { sized } = useTypeScale();
  return (
    <View style={[styles.chip, strong && styles.chipStrong]} accessible accessibilityLabel={node.iast}>
      <Text style={[script(strong ? "bold" : "semibold"), styles.sa, { fontSize: sized(20, { sanskrit: true }) }]}>
        {node.sa}
      </Text>
      <Text style={[styles.iast, { fontSize: sized(font.sizes.xs) }]}>{node.iast}</Text>
    </View>
  );
}

const CALLOUT: Record<"tip" | "watch" | "fact", { icon: IoniconsIconName; bg: string; fg: string }> = {
  tip: { icon: "bulb-outline", bg: color.saffronLight, fg: color.saffronText },
  watch: { icon: "alert-circle-outline", bg: color.warnBg, fg: color.warnText },
  fact: { icon: "sparkles-outline", bg: color.unsureBg, fg: color.unsureText },
};

export default function BlockRenderer({ block, ctx }: { block: GuideBlock; ctx: GuideTextCtx }) {
  const { sized } = useTypeScale();
  const body = [styles.body, { fontSize: sized(font.sizes.base), lineHeight: sized(font.sizes.base) * 1.55 }];

  switch (block.kind) {
    case "text":
      return <InlineText text={ctx.t(block.text)} lang={ctx.lang} style={body} />;

    case "analogy":
      return (
        <View style={[styles.panel, { backgroundColor: color.tutorBg }]}>
          <View style={styles.panelHead}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={color.tutor} />
            <Text style={[styles.panelLabel, { color: color.tutor }, ctx.lang === "hi" && script("bold")]}>
              {GUIDE_UI.thinkOfIt[ctx.lang]}
            </Text>
          </View>
          <InlineText text={ctx.t(block.text)} lang={ctx.lang} style={body} />
        </View>
      );

    case "callout": {
      const tone = CALLOUT[block.tone] ?? CALLOUT.tip;
      return (
        <View style={[styles.panel, { backgroundColor: tone.bg }]}>
          <View style={styles.panelHead}>
            <Ionicons name={tone.icon} size={18} color={tone.fg} />
            <Text style={[styles.panelLabel, { color: tone.fg }, ctx.lang === "hi" && script("bold")]}>
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
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
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
            <SaChip node={block.a} />
            <Text style={styles.op} accessibilityLabel="plus">+</Text>
            <SaChip node={block.b} />
            <Ionicons name="arrow-forward" size={20} color={color.inkSoft} accessibilityLabel="becomes" />
            <SaChip node={block.result} strong />
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
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: space.sm,
    borderWidth: 1,
    borderColor: color.border,
  },
  exampleWild: { borderColor: color.gold, borderLeftWidth: 4 },
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
  panel: { borderRadius: radius.md, padding: space.sm, gap: space.xxs },
  panelHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  panelLabel: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm },
  steps: { gap: space.xs },
  stepRow: { flexDirection: "row", gap: space.xs, alignItems: "flex-start" },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: color.saffronLight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepNumText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.saffronText },
  stepText: { flex: 1 },
  tableWrap: { gap: space.xs },
  captionRow: { flexDirection: "row", alignItems: "center", gap: space.xs },
  caption: { flex: 1, fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink },
  tableScroll: { borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: color.border },
  tr: { flexDirection: "row", backgroundColor: color.surface },
  thRow: { backgroundColor: color.surfaceMuted },
  trAlt: { backgroundColor: "#FFFCF7" },
  td: {
    width: 128,
    paddingHorizontal: space.xs,
    paddingVertical: 6,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: color.border,
    justifyContent: "center",
  },
  tdFirst: { width: 132 },
  th: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.inkSoft },
  tdText: { fontFamily: "Nunito_400Regular", fontWeight: "400", color: color.ink },
  cellTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ending: { color: color.saffronText, textDecorationLine: "underline" },
  note: { fontFamily: "Nunito_400Regular", fontWeight: "400", color: color.inkSoft },
  formula: { backgroundColor: color.surface, borderRadius: radius.md, padding: space.sm, gap: space.xs, ...shadow.card },
  formulaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: space.xs },
  chip: { backgroundColor: color.surfaceMuted, borderRadius: radius.sm, paddingHorizontal: space.xs, paddingVertical: 4, alignItems: "center" },
  chipStrong: { backgroundColor: color.saffronLight },
  op: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.lg, color: color.inkSoft },
});
