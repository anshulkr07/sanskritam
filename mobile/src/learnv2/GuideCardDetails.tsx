import React from "react";
import { Text, View } from "react-native";
import AudioButton from "../components/grammar/AudioButton";
import InlineText from "../components/grammar/InlineText";
import { ProofBody } from "../components/grammar/ProofPanel";
import { useGuideLang } from "../hooks/useGuide";
import { useTypeScale } from "../hooks/useTypeScale";
import { T, sa, ui } from "../trail/theme";
import { splitAtAkshara } from "../utils/akshara";
import type { LearnV2Card } from "./types";

function Ending({ parts }: { parts: [string, string] }) {
  const [head, tail] = splitAtAkshara(...parts);
  return <>{head}<Text style={{ color: T.action, fontWeight: "bold" }}>{tail}</Text></>;
}

/** Guide details in the same typography as authored cards. Tables show small
 * labelled groups, so neither vertical walls nor nested swipe tables return. */
export default function GuideCardDetails({ card }: { card: LearnV2Card }) {
  const { lang, t } = useGuideLang();
  const { sized } = useTypeScale();
  const guide = card.guide;
  if (!guide) return null;
  const text = [ui("regular"), { color: T.ink, fontSize: sized(17), lineHeight: sized(26) }];
  const block = guide.block;
  const spoken = guide.sanskrit ?? guide.example;
  return <View style={{ gap: 12 }}>
    {spoken?.audio_url ? <AudioButton url={spoken.audio_url} label={spoken.sa} /> : null}
    {guide.sounds?.some(s => s.audio_url) ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {guide.sounds.filter(s => s.audio_url).map((s, i) => <View key={i} style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={[sa(sized(22, { sanskrit: true })), { color: T.ink }]}>{s.sa}</Text>
        <AudioButton url={s.audio_url} label={s.sa} />
      </View>)}
    </View> : null}
    {guide.example?.words?.map((word, i) => <View key={i} style={{ gap: 2, borderTopWidth: 1, borderTopColor: T.line, paddingTop: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={[sa(sized(24, { sanskrit: true })), { color: T.ink }]}>{word.sa}</Text>
        <AudioButton url={word.audio_url} label={word.sa} />
      </View>
      <Text style={[ui("regular"), { color: T.ink2, fontSize: sized(15) }]}>{word.iast}</Text>
      <InlineText text={t(word.gloss)} lang={lang} style={text} />
    </View>)}
    {block?.rows.map((row, r) => <View key={r} style={{ flexDirection: "row", gap: 10, padding: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.line }}>
      {row.map((cell, c) => <View key={c} style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <InlineText text={t(block.columns[c])} lang={lang} style={[ui("semibold"), { color: T.ink2, fontSize: sized(14) }]} />
        {"text" in cell ? <InlineText text={t(cell.text)} lang={lang} style={text} /> : <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <Text selectable style={[sa(sized(28, { sanskrit: true })), { color: T.ink }]}>
              {cell.split ? <Ending parts={cell.split} /> : cell.sa}
            </Text>
            <AudioButton url={cell.audio_url} label={cell.sa} />
          </View>
          <Text style={[ui("regular"), { color: T.ink2, fontSize: sized(15) }]}>{cell.iast}</Text>
        </>}
      </View>)}
    </View>)}
    {guide.proof ? <ProofBody proof={guide.proof} ctx={{ lang, t, topicId: guide.topicId }} /> : null}
  </View>;
}
