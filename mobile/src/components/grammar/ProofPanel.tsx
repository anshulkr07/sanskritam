// ProofPanel — "See it proved": the engine widget behind a topic's claim.
//
// Closed by default and mounted only when opened, so a topic page makes no
// engine request until the learner asks. Each proof reuses an existing proof
// surface (U7): DerivationPlayer, the Paradigm grid, SandhiVisual,
// ScansionStrip, or the WordOrder screen.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import { StyleSheet, View } from "react-native";

import type { GuideProof } from "../../api/client";
import type { RootStackParamList } from "../../navigation/types";
import ParadigmScreen from "../../screens/Paradigm";
import { color, font, radius, space } from "../../theme";
import DerivationPlayer from "../derivation/DerivationPlayer";
import SandhiVisual from "../derivation/SandhiVisual";
import ScansionStrip from "../ScansionStrip";
import { Button } from "../ui";
import type { GuideTextCtx } from "./BlockRenderer";
import Collapsible from "./Collapsible";
import InlineText from "./InlineText";
import { GUIDE_UI } from "./strings";

export function ProofBody({ proof, ctx }: { proof: GuideProof; ctx: GuideTextCtx }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const p = proof.params;
  switch (proof.type) {
    case "derive":
      return (
        <DerivationPlayer
          word={p.expect || p.pratipadika || p.dhatu || ""}
          kind={p.dhatu ? "verb" : "noun"}
          params={p}
        />
      );
    case "paradigm":
      return (
        <View style={styles.paradigm}>
          <ParadigmScreen pratipadika={p.pratipadika} linga={p.linga} dhatu={p.dhatu} lakara={p.lakara} />
        </View>
      );
    case "sandhi":
      return <SandhiVisual joined={p.joined} />;
    case "scansion":
      return <ScansionStrip text={p.text} />;
    case "word-order":
      return (
        <Button
          label={GUIDE_UI.openWordOrder[ctx.lang]}
          tone="neutral"
          size="md"
          onPress={() => navigation.navigate("WordOrder", { sentence: p.sentence })}
        />
      );
    default:
      return null;
  }
}

export default function ProofPanel({ proof, ctx }: { proof: GuideProof; ctx: GuideTextCtx }) {
  const label = ctx.t(proof.label);
  return (
    <Collapsible
      style={styles.card}
      accessibilityLabel={`${GUIDE_UI.seeItProved[ctx.lang]}: ${label}`}
      header={
        <View style={styles.head}>
          <Ionicons name="flask-outline" size={18} color={color.saffron} />
          <InlineText text={label} lang={ctx.lang} style={styles.label} />
        </View>
      }
    >
      <View style={styles.body}>
        <ProofBody proof={proof} ctx={ctx} />
      </View>
    </Collapsible>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.sm,
    borderWidth: 1,
    borderColor: color.border,
  },
  head: { flexDirection: "row", alignItems: "center", gap: space.xs },
  label: { flex: 1, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base, color: color.ink },
  body: { paddingBottom: space.sm },
  // The paradigm grid scrolls on its own; a fixed frame keeps the page from
  // jumping and leaves the outer scroll usable.
  paradigm: { height: 460 },
});
