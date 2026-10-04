// Licences and credits (U15-7 — gated on P23-4a only).
//
// Settings' row was onPress={() => {}} — a live row with a chevron that did
// nothing, while we already shipped MIT vidyut-data and a CC BY-SA 3.0
// transcription no screen rendered. This screen renders GET /licences and
// nothing else: per source the name, what we took, the licence named
// exactly, and the credit line VERBATIM. It decides nothing.
//
// It does NOT block P23-4 (the import). What it gates is the RELEASE of
// attributed content — and it is owed for content we already ship today.

import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, type Licence } from "../api/client";
import { Button } from "../components/ui";
import { Skeleton } from "../components/Skeleton";
import { color, font, radius, shadow, space } from "../theme";

export default function LicencesScreen() {
  const [rows, setRows] = useState<Licence[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    api
      .licences()
      .then((r) => setRows(r))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      {/* A drawer screen: the header carries the title and the hamburger. */}
      <ScrollView contentContainerStyle={styles.body}>
        {loading && !rows ? (
          <>
            <Skeleton style={{ height: 90 }} />
            <Skeleton style={{ height: 90, marginTop: space.sm }} />
          </>
        ) : failed || !rows ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Couldn't load the licences.</Text>
            <Text style={styles.errorSub}>Check your connection and try again.</Text>
            <Button label="Retry" onPress={load} style={{ marginTop: space.md }} />
          </View>
        ) : (
          rows.map((r) => (
            <View
              key={r.key}
              style={styles.card}
              accessible
              accessibilityLabel={`${r.name}. Licence ${r.licence}. ${r.credit}`}
            >
              <Text style={styles.name}>{r.name}</Text>
              <Text style={styles.licence}>{r.licence}</Text>
              <Text style={styles.credit}>{r.credit}</Text>
              {!!r.taken && <Text style={styles.taken}>Used for: {r.taken}</Text>}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, paddingBottom: 120 },
  sub: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginBottom: space.md,
    lineHeight: 20,
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.md,
    marginBottom: space.md,
    ...shadow.card,
  },
  name: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.base,
    color: color.ink,
  },
  licence: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.sm,
    color: color.saffronDeep,
    marginTop: 2,
  },
  credit: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.ink,
    marginTop: space.xs,
    lineHeight: 20,
  },
  taken: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginTop: space.xs,
    lineHeight: 20,
  },
  errorCard: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, ...shadow.card },
  errorTitle: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base, color: color.ink },
  errorSub: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginTop: 4,
  },
});
