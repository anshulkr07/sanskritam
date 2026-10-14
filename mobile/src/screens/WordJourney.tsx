// WordJourney — the screen behind the Home word card, top to bottom:
//
// 1. A deep maroon panel with the Sanskrit word, its roman form, its meaning
//    and "Found in" with the cited text, when there is one.
// 2. "The journey": the ladder from the Sanskrit word down to the word.
// 3. A plain line naming the label, and the hedge when dictionaries hedge.
// 4. "Also in": the other languages this Sanskrit word reached. Tapping one
//    redraws the ladder.
// 5. The note, when there is one.
// 6. "Sources": the dictionaries behind the card, each opening its site. A
//    word the daily pipeline found names the very page it was checked
//    against and carries a flag to report it.
// 7. "More words": earlier words, newest first.
//
// Read-only: opening it writes nothing. With an originId it shows that word;
// otherwise it shows the same "word-today" query as the card, so opening the
// card draws from memory.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, type WordOrigin, type WordToday } from "../api/client";
import { useAskContext } from "../ask/AskProvider";
import FetchError from "../components/FetchError";
import ReportButton from "../components/ReportButton";
import { useQuery } from "../hooks/useQuery";
import { useTypeScale } from "../hooks/useTypeScale";
import { Ghost, Panel, Sa, SectionLabel } from "../kala/ui";
import type { RootStackParamList } from "../navigation/types";
import { haptics } from "../services/haptics";
import { color, font, nativeScriptFace, onFill, space } from "../theme";
import { ensureScriptFont, isScriptLoaded } from "../services/scriptFonts";
import { plain } from "../utils/text";
import RouteLadder from "../words/RouteLadder";
import { fetchWordToday } from "../words/WordCard";
import { confidenceLine, headlineRoute, relationLine, sourcePage } from "../words/labels";

type Props = NativeStackScreenProps<RootStackParamList, "WordJourney">;

export default function WordJourneyScreen({ route, navigation }: Props) {
  const originId = route.params?.originId;
  const { sized } = useTypeScale();

  const key = originId ? `word-origin:${originId}` : "word-today";
  const { data, loading, failed, retry } = useQuery<WordToday | WordOrigin | null>(key, () =>
    originId ? api.wordOrigin(originId) : fetchWordToday(),
  );
  const more = useQuery("word-origins", api.wordOrigins, { ttlMs: 600000 });

  // The origin behind this screen: the addressed one, or today's.
  const origin: WordOrigin | null =
    originId != null && originId !== ""
      ? (data as WordOrigin | null)
      : ((data as WordToday | null)?.available ? ((data as WordToday).origin ?? null) : null);
  const headlineId = originId ? undefined : (data as WordToday | null)?.headline_route_id;

  const routes = (origin?.routes ?? []).filter((r) => (r.word ?? "").trim() !== "");
  const [, refreshFonts] = useState(0);
  const scripts = [...new Set(routes.map(r => r.script).filter(Boolean))].join(",");
  useEffect(() => { let alive = true; void Promise.all(scripts.split(",").filter(Boolean).map(ensureScriptFont)).then(() => { if (alive) refreshFonts(n => n + 1); }); return () => { alive = false; }; }, [scripts]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const tapped = selectedId == null ? null : routes.find((r) => r.id === selectedId);
  const selected = tapped ?? headlineRoute(routes, headlineId);

  const askSubject = selected
    ? [
        (selected.word ?? "").trim(),
        (selected.lang_name ?? "").trim(),
        (origin?.sanskrit?.iast ?? "").trim(),
        plain(origin?.gloss),
      ]
        .filter((p) => p !== "")
        .join(", ")
    : "";
  useAskContext("word", askSubject);
  // Set only on a word the daily pipeline found: the page it was checked on.
  const page = sourcePage(selected);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {loading ? (
          <Ghost lines={8} on="page" />
        ) : failed || !origin ? (
          failed ? (
            <FetchError label="Couldn't load this word." onRetry={retry} />
          ) : (
            <Text style={[styles.empty, { fontSize: sized(font.sizes.base) }]}>No word today.</Text>
          )
        ) : !selected ? (
          <Text style={[styles.empty, { fontSize: sized(font.sizes.base) }]}>No word today.</Text>
        ) : (
          <>
            <Text style={[styles.intro, { fontSize: sized(font.sizes.base) }]}>Explore words derived from Sanskrit, with related language paths clearly labelled.</Text>
            <Panel tone="maroon" style={{ borderRadius: 0 }}>
              {!!(origin.sanskrit?.dev ?? "").trim() && (
                <Sa size={30} weight="bold" on="fill">
                  {(origin.sanskrit?.dev ?? "").trim()}
                </Sa>
              )}
              {!!(origin.sanskrit?.iast ?? "").trim() && (
                <Text style={[styles.panelRoman, { fontSize: sized(font.sizes.base) }]}>
                  {(origin.sanskrit?.iast ?? "").trim()}
                </Text>
              )}
              {!!plain(origin.gloss) && (
                <Text style={[styles.panelGloss, { fontSize: sized(font.sizes.base) }]}>{plain(origin.gloss)}</Text>
              )}
              {!!plain(origin.attested) && (
                <View style={styles.found}>
                  <Text style={styles.foundLabel}>Found in</Text>
                  <Text style={[styles.foundText, { fontSize: sized(font.sizes.base) }]}>{plain(origin.attested)}</Text>
                </View>
              )}
            </Panel>

            {routes.length > 1 && (
              <>
                <SectionLabel>Across languages</SectionLabel>
                <View>
                  {routes.map((r) => {
                    const id = r.id ?? `${r.lang}-${r.word}`;
                    const active = r === selected;
                    const relation = r.relation === "related" ? "Related" : r.relation === "inherited" ? "Inherited" : r.relation === "borrowed" ? "Borrowed" : "Travelled";
                    return (
                      <Pressable key={id} onPress={() => { haptics.tap(); setSelectedId(r.id ?? null); }}
                        style={({ pressed }) => [styles.row, active && styles.rowActive, pressed && styles.pressed]}
                        accessibilityRole="button" accessibilityLabel={`Show ${plain(r.word)} in ${plain(r.lang_name)}`}
                        accessibilityState={{ selected: active }}>
                        <View style={styles.rowText}>
                          <Text style={[styles.rowWord, { fontSize: sized(20), fontFamily: r.script && r.script !== "latin" ? (isScriptLoaded(r.script) ? nativeScriptFace[r.script] : undefined) : "Nunito_700Bold" }]} numberOfLines={2}>{plain(r.word)}</Text>
                          {!!r.roman && <Text style={styles.rowLang}>{r.roman}</Text>}
                          {!!(r.lang_name ?? "").trim() && <Text style={[styles.rowLang, { fontSize: sized(font.sizes.sm) }]} numberOfLines={1}>{r.lang_name}</Text>}
                        </View>
                        <Text style={styles.relationTag}>{relation}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            <SectionLabel>The journey</SectionLabel>
            <RouteLadder origin={origin} route={selected} />

            {!!relationLine(selected) && (
              <Text style={[styles.relation, { fontSize: sized(font.sizes.base) }]}>{relationLine(selected)}</Text>
            )}
            {!!confidenceLine(selected) && (
              <Text style={[styles.confidence, { fontSize: sized(font.sizes.base) }]}>{confidenceLine(selected)}</Text>
            )}
            {page && (
              <Pressable
                onPress={() => {
                  haptics.tap();
                  void Linking.openURL(page.url).catch(() => null);
                }}
                style={({ pressed }) => [styles.pageRow, pressed && styles.pressed]}
                accessibilityRole="link"
                accessibilityLabel={`Source: ${page.site}. Opens the page.`}
              >
                <Text style={[styles.pageText, { fontSize: sized(font.sizes.base) }]} numberOfLines={2}>
                  {`Source: ${page.site}`}
                </Text>
                <Ionicons name="open-outline" size={18} color={color.inkSoft} />
              </Pressable>
            )}

            {!!plain(origin.note) && (
              <Text style={[styles.note, { fontSize: sized(15), lineHeight: Math.round(sized(15) * 1.5) }]}>
                {plain(origin.note)}
              </Text>
            )}

            {(origin.sources ?? []).length > 0 && (
              <>
                <SectionLabel>Sources</SectionLabel>
                <View>
                  {(origin.sources ?? []).map((s, i) => {
                    const name = (s.name ?? s.key ?? "").trim();
                    const url = (s.url ?? "").trim();
                    if (!name) return null;
                    return url ? (
                      <Pressable
                        key={s.key ?? `${name}-${i}`}
                        onPress={() => {
                          haptics.tap();
                          void Linking.openURL(url).catch(() => null);
                        }}
                        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                        accessibilityRole="link"
                        accessibilityLabel={`${name}. Opens ${(s.key ?? "").startsWith("page:") ? "the page" : "the dictionary site"}.`}
                      >
                        <View style={styles.rowText}>
                          <Text style={[styles.rowWord, { fontSize: sized(font.sizes.base) }]} numberOfLines={2}>
                            {name}
                          </Text>
                        </View>
                        <Ionicons name="open-outline" size={18} color={color.inkFaint} />
                      </Pressable>
                    ) : (
                      <View key={s.key ?? `${name}-${i}`} style={styles.row} accessible accessibilityLabel={name}>
                        <View style={styles.rowText}>
                          <Text style={[styles.rowWord, { fontSize: sized(font.sizes.base) }]} numberOfLines={2}>
                            {name}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {page && (
              <View style={styles.flagRow}>
                <ReportButton surface="word" question={selected.id ?? ""} answer={askSubject} noun="card" />
              </View>
            )}

            {!more.loading && !more.failed && (more.data?.origins ?? []).filter((o) => o.id !== origin.id && !!o.id).slice(0, 5).length > 0 && (
              <>
                <SectionLabel>More words</SectionLabel>
                <View>
                  {(more.data?.origins ?? [])
                    .filter((o) => o.id !== origin.id && !!o.id)
                    .slice(0, 5)
                    .map((o) => {
                      const langs = o.languages ?? [];
                      const count = `${langs.length} language${langs.length === 1 ? "" : "s"}`;
                      // Read aloud by its Sanskrit word first, as the row shows it.
                      const spoken = [(o.sanskrit?.iast ?? "").trim(), plain(o.gloss), count]
                        .filter((p) => p !== "")
                        .join(", ");
                      return (
                        <Pressable
                          key={o.id ?? `${o.sanskrit?.iast}`}
                          onPress={() => {
                            haptics.tap();
                            navigation.push("WordJourney", { originId: o.id ?? "" });
                          }}
                          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                          accessibilityRole="button"
                          accessibilityLabel={spoken}
                        >
                          <View style={styles.rowText}>
                            {!!(o.sanskrit?.dev ?? "").trim() && (
                              <Sa size={20} numberOfLines={1}>
                                {(o.sanskrit?.dev ?? "").trim()}
                              </Sa>
                            )}
                            {!!(o.sanskrit?.iast ?? "").trim() && (
                              <Text style={[styles.rowLang, { fontSize: sized(font.sizes.sm) }]} numberOfLines={1}>
                                {(o.sanskrit?.iast ?? "").trim()}
                              </Text>
                            )}
                          </View>
                          <Text style={[styles.rowCount, { fontSize: sized(font.sizes.sm) }]}>{count}</Text>
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
  intro: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft, lineHeight: 24, marginBottom: space.sm },
  panelRoman: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: onFill.soft, marginTop: 2 },
  panelGloss: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: onFill.text, marginTop: 4, lineHeight: 24 },
  found: { marginTop: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: onFill.faint },
  foundLabel: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: onFill.gold,
  },
  foundText: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: onFill.text, marginTop: 2, lineHeight: 24 },
  relation: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", color: color.ink, marginTop: space.md },
  confidence: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft, marginTop: 2 },
  note: { fontFamily: "Nunito_400Regular", fontWeight: "400", color: color.ink, marginTop: space.md },
  pageRow: { flexDirection: "row", alignItems: "center", gap: space.xs, minHeight: 44, marginTop: 2 },
  pageText: { flexShrink: 1, fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.inkSoft },
  flagRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", minHeight: 44, marginTop: space.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: 48,
    paddingVertical: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  rowActive: { borderLeftWidth: 3, borderLeftColor: color.saffron, paddingLeft: space.sm },
  relationTag: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 12, color: color.inkSoft },
  pressed: { opacity: 0.75 },
  rowText: { flex: 1, minWidth: 0 },
  rowWord: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.ink },
  rowLang: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", color: color.inkSoft },
  rowCount: { fontFamily: "Nunito_700Bold", fontWeight: "700", color: color.inkSoft },
});
