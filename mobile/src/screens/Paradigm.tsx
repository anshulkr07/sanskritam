// Paradigm (U7-5) — śabdarūpa / dhāturūpa tables with a proof behind every
// cell. The 24-cell grid (8 vibhakti × 3 vacana, or the lakāra grid for a
// verb) is scrollable and tabular. Tapping a cell opens the animated
// derivation for that form (U7-1). A null cell renders as a dash and stays
// tappable-disabled — one underivable cell must never blank the table (P11-5).
// Colour the rows by the ending pattern they share.

import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";

import api from "../api/client";
import type { Paradigm, ParadigmCell } from "../api/client";
import DerivationPlayer from "../components/derivation/DerivationPlayer";
import type { RootStackParamList } from "../navigation/types";
import { color, font, script, space } from "../theme";

type ParadigmRoute = RouteProp<RootStackParamList, "Paradigm">;

interface Props {
  pratipadika?: string;
  linga?: string;
  dhatu?: string;
  lakara?: string;
  title?: string;
}

const VIBHAKTI_LABEL: Record<string, string> = {
  Prathama: "Nominative", Dvitiya: "Accusative", Trtiya: "Instrumental",
  Caturthi: "Dative", Panchami: "Ablative", Sasthi: "Genitive",
  Saptami: "Locative", Sambodhana: "Vocative",
};

const VACANA_LABEL: Record<string, string> = {
  Eka: "SG", Dvi: "DU", Bahu: "PL",
};

const ROW_TINTS = ["#FFFFFF", "#FBEED9", "#FFF8EE", "#FFFFFF", "#FBEED9", "#FFF8EE", "#FFFFFF", "#FBEED9"];

export default function ParadigmScreen({ pratipadika, linga, dhatu, lakara, title }: Props) {
  const route = useRoute<ParadigmRoute>();
  // Support both direct props and stack-route params so the screen works as a
  // standalone component and as `Stack.Screen name="Paradigm"`.
  const ep = route?.params ?? {};
  const effDhatu = dhatu ?? (ep.kind === "verb" ? ep.word : undefined);
  const effPratipadika = pratipadika ?? (ep.kind === "noun" ? ep.word : undefined);
  const hasWord = !!(effDhatu || effPratipadika);
  const [data, setData] = useState<Paradigm | null>(null);
  const [loading, setLoading] = useState(hasWord);
  const [openCell, setOpenCell] = useState<ParadigmCell | null>(null);

  useEffect(() => {
    if (!hasWord) {
      setData(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    const p = effDhatu
      ? api.paradigm({ dhatu: effDhatu, lakara: lakara ?? "Lat" })
      : api.paradigm({ pratipadika: effPratipadika as string, linga: linga ?? "Pum" });
    p.then((d) => alive && setData(d))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effDhatu, effPratipadika]);

  if (!hasWord) {
    return (
      <View style={styles.center}>
        <Text style={styles.heading}>No word chosen</Text>
        <Text style={styles.muted}>Look up a word in Grammar to see its full table here.</Text>
      </View>
    );
  }
  if (loading) {
    return <View style={styles.center}><Text style={styles.muted}>Loading…</Text></View>;
  }
  if (!data || !data.rows?.length) {
    return <View style={styles.center}><Text style={styles.muted}>No paradigm available.</Text></View>;
  }

  const isVerb = data.kind === "tinanta";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>
        {title ?? (isVerb ? `${effDhatu ?? ""} — present` : `${effPratipadika ?? ""} — declension`)}
      </Text>

      {/* Header row */}
      <View style={[styles.row, styles.headerRow]}>
        <Text style={[styles.cell, styles.headerCell, { width: 96 }]}></Text>
        {["एक", "द्वि", "बहु"].map((v, i) => (
          <Text key={i} style={[styles.cell, styles.headerCell, { flex: 1 }]}>{v}</Text>
        ))}
      </View>

      {data.rows.map((row, r) => (
        <View key={r} style={[styles.row, { backgroundColor: ROW_TINTS[r % ROW_TINTS.length] }]}>
          <Text style={[styles.cell, styles.vibhakti, { width: 96 }]}>
            {VIBHAKTI_LABEL[row[0]?.vibhakti?.split(".")[0] ?? ""] ?? row[0]?.vibhakti ?? ""}
          </Text>
          {row.map((cell, c) => (
            <Cell key={c} cell={cell} onOpen={() => setOpenCell(cell)} isVerb={isVerb} />
          ))}
        </View>
      ))}

      {openCell ? (
        <View style={styles.drawer}>
          <Text style={styles.drawerTitle}>Why {openCell.form}?</Text>
          <DerivationPlayer
            word={isVerb ? effDhatu ?? openCell.vibhakti ?? "" : effPratipadika ?? openCell.form ?? ""}
            kind={isVerb ? "verb" : "noun"}
            title={`${openCell.vibhakti} · ${VACANA_LABEL[openCell.vacana] ?? openCell.vacana}`}
            landOnEnd
          />
          <Pressable onPress={() => setOpenCell(null)} style={styles.close} accessibilityRole="button" accessibilityLabel="Close derivation">
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

function Cell({ cell, onOpen, isVerb }: { cell: ParadigmCell; onOpen: () => void; isVerb: boolean }) {
  if (cell.form == null) {
    // underivable cell — a dash, tappable-disabled, never blanks the grid
    return <View style={[styles.cell, { flex: 1 }]}><Text style={styles.dash}>—</Text></View>;
  }
  return (
    <Pressable
      onPress={onOpen}
      style={[styles.cell, { flex: 1 }]}
      accessibilityRole="button"
      accessibilityLabel={`${cell.form}. Show derivation.`}
    >
      <Text style={[styles.form, script("semibold")]} numberOfLines={1}>
        {cell.form}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: { padding: space.lg, paddingBottom: space.xxl },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.bg },
  heading: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.lg, color: color.ink, marginBottom: space.md },
  row: { flexDirection: "row", alignItems: "center", borderRadius: 8, marginVertical: 2, paddingVertical: 4 },
  headerRow: { backgroundColor: color.surfaceMuted },
  cell: { padding: space.xs, minHeight: 44, justifyContent: "center" },
  headerCell: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.inkSoft },
  vibhakti: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.inkSoft },
  form: { fontSize: font.sizes.base, color: color.ink },
  dash: { fontSize: font.sizes.base, color: color.inkFaint, textAlign: "center" },
  drawer: { marginTop: space.lg, backgroundColor: color.surface, borderRadius: 14, padding: space.md },
  drawerTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.ink, marginBottom: space.sm },
  close: { alignSelf: "center", marginTop: space.md, padding: space.sm },
  closeText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.saffronText },
  muted: { fontSize: font.sizes.sm, color: color.inkSoft },
});
