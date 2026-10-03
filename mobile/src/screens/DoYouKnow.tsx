// DoYouKnow — the screen behind the Home fact card, top to bottom:
//
// 1. A deep teal panel with the fact, and one line saying who says so: the
//    text itself, its tradition, or a modern reading.
// 2. "The verse": the passage in Devanagari, its roman form, and where it
//    stands in the text.
// 3. "In English": the passage translated.
// 4. "What it says": a short explanation, when there is one.
// 5. "Source": the page that carries the verse, opening in the browser.
// 6. A flag to report the card.
// 7. "Earlier": earlier facts, newest first.
//
// Read-only: opening it writes nothing. With a factId it shows that fact;
// otherwise it shows the same "fact-today" query as the card, so opening the
// card draws from memory.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, type Fact, type FactToday } from "../api/client";
import { useAskContext } from "../ask/AskProvider";
import FetchError from "../components/FetchError";
import ReportButton from "../components/ReportButton";
import { fetchFactToday } from "../facts/FactCard";
import { claimLine, refLine, sourcePage, verseLines } from "../facts/labels";
import { useQuery } from "../hooks/useQuery";
import { useTypeScale } from "../hooks/useTypeScale";
import { Ghost, Panel, Sa, SectionLabel, labelOn } from "../kala/ui";
import type { RootStackParamList } from "../navigation/types";
import { haptics } from "../services/haptics";
import { color, font, onFill, space } from "../theme";
import { plain } from "../utils/text";

type Props = NativeStackScreenProps<RootStackParamList, "DoYouKnow">;

export default function DoYouKnowScreen({ route, navigation }: Props) {
  const factId = route.params?.factId;
  const { sized } = useTypeScale();

  const key = factId ? `fact:${factId}` : "fact-today";
  const { data, loading, failed, retry } = useQuery<FactToday | Fact | null>(key, () =>
    factId ? api.fact(factId) : fetchFactToday(),
  );
  const more = useQuery("facts", api.facts, { ttlMs: 600000 });

  // The fact behind this screen: the addressed one, or today's.
  const fact: Fact | null =
    factId != null && factId !== ""
      ? (data as Fact | null)
      : ((data as FactToday | null)?.available ? ((data as FactToday).fact ?? null) : null);

  const dev = (fact?.devanagari ?? "").trim();
  // Ask reads the verse on this screen the way it reads the daily śloka.
  useAskContext("shloka", dev);

  const body = plain(fact?.fact).trim();
  const lines = verseLines(dev);
  const iast = (fact?.iast ?? "").trim();
  const ref = refLine(fact);
  const claim = claimLine(fact);
  const translation = plain(fact?.translation).trim();
  const explanation = plain(fact?.explanation).trim();
  const page = sourcePage(fact);
  const earlier = (more.data?.facts ?? []).filter((f) => f.id !== fact?.id && plain(f.fact).trim() !== "");

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {loading ? (
          <Ghost lines={8} on="page" />
        ) : failed ? (
          <FetchError label="Couldn't load this fact." onRetry={retry} />
        ) : !fact || !body ? (
          <Text style={[styles.empty, { fontSize: sized(font.sizes.base) }]}>No fact today.</Text>
        ) : (
          <>
            <Panel tone="teal">
              {!!claim && <Text style={[styles.eyebrow, { color: labelOn("teal") }]}>{claim}</Text>}
              <Text
                style={[styles.fact, { fontSize: sized(20), lineHeight: Math.round(sized(20) * 1.4) }]}
                accessibilityRole="header"
              >
                {body}
              </Text>
            </Panel>

            {lines.length > 0 && (
              <>
                <SectionLabel>The verse</SectionLabel>
                <View accessible accessibilityLabel={iast ? `The verse. ${iast}` : "The verse"}>
                  {lines.map((line, i) => (
                    <Sa key={`${i}-${line}`} size={22}>
                      {line}
                    </Sa>
                  ))}
                </View>
                {!!iast && (
                  <Text style={[styles.iast, { fontSize: sized(font.sizes.base), lineHeight: Math.round(sized(font.sizes.base) * 1.5) }]}>
                    {iast}
                  </Text>
                )}
                {!!ref && <Text style={[styles.ref, { fontSize: sized(font.sizes.sm) }]}>{ref}</Text>}
              </>
            )}

            {!!translation && (
              <>
                <SectionLabel>In English</SectionLabel>
                <Text style={[styles.prose, { fontSize: sized(font.sizes.base), lineHeight: Math.round(sized(font.sizes.base) * 1.5) }]}>
                  {translation}
                </Text>
              </>
            )}

            {!!explanation && (
              <>
                <SectionLabel>What it says</SectionLabel>
                <Text style={[styles.prose, { fontSize: sized(font.sizes.base), lineHeight: Math.round(sized(font.sizes.base) * 1.5) }]}>
                  {explanation}
                </Text>
              </>
            )}

            {page && (
              <>
                <SectionLabel>Source</SectionLabel>
                <Pressable
                  onPress={() => {
                    haptics.tap();
                    void Linking.openURL(page.url).catch(() => null);
                  }}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  accessibilityRole="link"
                  accessibilityLabel={`${page.site}. Opens the page that carries the verse.`}
                >
                  <View style={styles.rowText}>
                    <Text style={[styles.rowTitle, { fontSize: sized(font.sizes.base) }]} numberOfLines={2}>
                      {page.site}
                    </Text>
                    <Text style={[styles.rowSub, { fontSize: sized(font.sizes.sm) }]} numberOfLines={2}>
                      The verse was found on this page
                    </Text>
                  </View>
                  <Ionicons name="open-outline" size={18} color={color.inkFaint} />
                </Pressable>
              </>
            )}

            <View style={styles.flagRow}>
              <ReportButton
                surface="fact"
                question={fact.id ?? ""}
                answer={[body, ref].filter((p) => p !== "").join(" ")}
                noun="card"
              />
            </View>

            {!more.loading && !more.failed && earlier.length > 0 && (
              <>
                <SectionLabel>Earlier</SectionLabel>
                <View>
                  {earlier.map((f) => {
                    const where = refLine(f);
                    const line = plain(f.fact).trim();
                    return (
                      <Pressable
                        key={f.id ?? line}
                        onPress={() => {
                          haptics.tap();
                          navigation.push("DoYouKnow", { factId: f.id ?? "" });
                        }}
                        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                        accessibilityRole="button"
                        accessibilityLabel={where ? `${line} From ${where}.` : line}
                      >
                        <View style={styles.rowText}>
                          <Text style={[styles.rowTitle, { fontSize: sized(font.sizes.base) }]} numberOfLines={3}>
                            {line}
                          </Text>
                          {!!where && (
                            <Text style={[styles.rowSub, { fontSize: sized(font.sizes.sm) }]} numberOfLines={1}>
                              {where}
                            </Text>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={color.inkFaint} />
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { paddingHorizontal: space.md, paddingTop: space.xs, paddingBottom: 120 },
  empty: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft, marginTop: space.lg },
  eyebrow: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  fact: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: onFill.text },
  iast: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft, marginTop: space.xs },
  ref: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.inkSoft, marginTop: space.xs },
  prose: { fontFamily: "Nunito_400Regular", fontWeight: "400", color: color.ink, marginTop: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: 48,
    paddingVertical: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  pressed: { opacity: 0.75 },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.ink },
  rowSub: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },
  flagRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", minHeight: 44, marginTop: space.sm },
});
