// WordLab — look up any Sanskrit word and see the engine build it.
//
// The search that used to sit under the old Grammar tab, moved to its own
// screen and made bilingual. A typed word is first sent to GET /grammar/lookup,
// which names the form (रामेण → राम, instrumental singular) — every reading it
// returns was re-derived by the engine to the exact word typed. An inflected
// form opens on the confirmed reading; a bare stem or root (देव, गम्) keeps its
// own build, and the manual noun/verb and gender controls stay for anything the
// lookup can't explain. Two words separated by a space show their sandhi.
//
// Rules carried from the old screen: render only what GET /grammar/derive,
// /paradigm, /sandhi and /lookup return (§U7); an underivable word says so
// honestly (P9-1.4); recent lookups persist on the device.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import api from "../api/client";
import type { DeriveParams, GuideLang, WordLookupCandidate } from "../api/client";
import { useAsk } from "../ask/AskProvider";
import DerivationPlayer from "../components/derivation/DerivationPlayer";
import SandhiVisual from "../components/derivation/SandhiVisual";
import LangToggle from "../components/grammar/LangToggle";
import { GUIDE_UI } from "../components/grammar/strings";
import { useGuideLang } from "../hooks/useGuide";
import type { RootStackParamList } from "../navigation/types";
import { haptics } from "../services/haptics";
import { color, font, radius, script, shadow, space } from "../theme";
import ParadigmScreen from "./Paradigm";

type Props = NativeStackScreenProps<RootStackParamList, "WordLab">;
type Kind = "noun" | "verb";
type Linga = "Pum" | "Stri" | "Napumsaka";

const RECENT_KEY = "shabd.grammar.recent";
const VIRAMA = "्";
const DEVANAGARI_RE = /[ऀ-ॿ]/;

const WL = {
  hint: {
    en: "Type any form like {{रामेण}}, a noun stem like {{देव}} or a verb root like {{गम्}}. Two words with a space show the sandhi between them.",
    hi: "{{रामेण}} जैसा कोई रूप, {{देव}} जैसा शब्द या {{गम्}} जैसी धातु लिखिए। बीच में खाली जगह वाले दो शब्द उनकी सन्धि दिखाते हैं।",
  },
  placeholder: { en: "Type a word… e.g. रामेण or गम्", hi: "शब्द लिखिए… जैसे रामेण या गम्" },
  noun: { en: "Noun", hi: "संज्ञा" },
  verb: { en: "Verb root", hi: "धातु" },
  masc: { en: "Masculine", hi: "पुंलिंग" },
  fem: { en: "Feminine", hi: "स्त्रीलिंग" },
  neut: { en: "Neuter", hi: "नपुंसकलिंग" },
  build: { en: "How it's built", hi: "कैसे बना" },
  table: { en: "All forms", hi: "सभी रूप" },
  recent: { en: "Recent", hi: "हाल में देखे" },
  search: { en: "Look up", hi: "देखें" },
  lookUpAgain: { en: "Look up again", hi: "फिर देखें" },
  found: { en: "This word is", hi: "यह शब्द है" },
  checked: { en: "Each reading is checked by the grammar engine.", hi: "हर पहचान व्याकरण-इंजन से जाँची गई है।" },
} as const;

/** A root is typed with a final virāma (गम्, पठ्) or is a known vowel root. */
function guessKind(word: string): Kind {
  const w = word.trim();
  if (!w) return "noun";
  if (w.endsWith(VIRAMA)) return "verb";
  if (["भू", "पा", "दा", "स्था", "नी", "जि", "कृ", "हृ", "श्रु", "ज्ञा"].includes(w)) return "verb";
  return "noun";
}

/** Stems in -ā or -ī are usually feminine. */
function guessLinga(word: string): Linga {
  const w = word.trim();
  return w.endsWith("ा") || w.endsWith("ी") ? "Stri" : "Pum";
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  lang,
}: {
  options: { value: T; label: { en: string; hi: string } }[];
  value: T;
  onChange: (v: T) => void;
  lang: GuideLang;
}) {
  return (
    <View style={styles.segment} accessibilityRole="radiogroup">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              haptics.tap();
              onChange(o.value);
            }}
            style={[styles.segmentOption, active && styles.segmentActive]}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={o.label[lang]}
          >
            <Text style={[styles.segmentText, lang === "hi" && script("semibold"), active && styles.segmentTextActive]}>
              {o.label[lang]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function HintText({ text }: { text: string }) {
  // The hint carries {{…}} Sanskrit spans; render them in script.
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return (
    <Text style={styles.hint}>
      {parts.map((p, i) =>
        p.startsWith("{{") ? (
          <Text key={i} style={[script("semibold"), styles.hintSa]}>
            {p.slice(2, -2)}
          </Text>
        ) : (
          <Text key={i} style={DEVANAGARI_RE.test(p) ? script("regular") : undefined}>
            {p}
          </Text>
        ),
      )}
    </Text>
  );
}

/** A lookup reading: Devanagari runs in script, the rest in the UI face. */
function ReadingText({ text }: { text: string }) {
  const parts = text.split(/([ऀ-ॿ]+)/g).filter(Boolean);
  return (
    <Text style={styles.foundText}>
      {parts.map((p, i) => (
        <Text key={i} style={DEVANAGARI_RE.test(p) ? [script("semibold"), styles.foundSa] : undefined}>
          {p}
        </Text>
      ))}
    </Text>
  );
}

export default function WordLabScreen({ route, navigation }: Props) {
  const initial = route.params?.word?.trim() ?? "";
  const { lang, setLang } = useGuideLang();
  const { setContext } = useAsk();
  const [query, setQuery] = React.useState(initial);
  const [submitted, setSubmitted] = React.useState<string | null>(initial || null);
  const [kind, setKind] = React.useState<Kind>(guessKind(initial));
  const [linga, setLinga] = React.useState<Linga>(guessLinga(initial));
  const [view, setView] = React.useState<"build" | "table">("build");
  const [recent, setRecent] = React.useState<string[]>([]);
  const [readings, setReadings] = React.useState<WordLookupCandidate[] | null>(null);
  const [picked, setPicked] = React.useState<WordLookupCandidate | null>(null);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: GUIDE_UI.wordLab[lang],
      headerRight: () => <LangToggle lang={lang} onChange={setLang} />,
    });
  }, [navigation, lang, setLang]);

  React.useEffect(() => {
    setContext({ surface: "grammar", subject: submitted ?? "" });
  }, [submitted, setContext]);

  React.useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY)
      .then((v) => {
        if (v) setRecent(JSON.parse(v));
      })
      .catch(() => {});
  }, []);

  const pick = React.useCallback((c: WordLookupCandidate | null) => {
    setPicked(c);
    if (!c || c.kind === "indeclinable") return;
    setKind(c.kind === "verb" ? "verb" : "noun");
    if (c.linga) setLinga(c.linga as Linga);
  }, []);

  // Name the typed form. A typed stem or root keeps its own build; an
  // inflected form (रामेण, गच्छति) opens on the reading the engine confirmed.
  React.useEffect(() => {
    setReadings(null);
    setPicked(null);
    const word = submitted?.trim() ?? "";
    if (!word || /\s/.test(word) || !DEVANAGARI_RE.test(word)) return;
    let alive = true;
    api
      .lookupWord(word)
      .then((res) => {
        if (!alive) return;
        setReadings(res.candidates);
        const first = res.candidates.find((c) => c.kind !== "indeclinable");
        if (first && first.lemma !== word) pick(first);
      })
      .catch(() => {
        if (alive) setReadings([]);
      });
    return () => {
      alive = false;
    };
  }, [submitted, pick]);

  const search = React.useCallback((text: string) => {
    const word = text.trim();
    if (!word) return;
    haptics.tap();
    setQuery(word);
    setSubmitted(word);
    setKind(guessKind(word));
    setLinga(guessLinga(word));
    setView("build");
    setRecent((prev) => {
      const next = [word, ...prev.filter((w) => w !== word)].slice(0, 8);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const multiWord = !!submitted && /\s/.test(submitted);
  const confirmed = picked && picked.kind !== "indeclinable" ? picked : null;
  const stem = confirmed ? confirmed.lemma : (submitted ?? "");
  const buildParams: DeriveParams = confirmed
    ? (confirmed.derive_params as DeriveParams)
    : kind === "noun"
      ? { pratipadika: stem, linga }
      : { dhatu: stem };
  const resultKey = `${submitted}-${kind}-${linga}-${view}-${confirmed ? JSON.stringify(confirmed.derive_params) : ""}`;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <HintText text={WL.hint[lang]} />

        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => search(query)}
            placeholder={WL.placeholder[lang]}
            placeholderTextColor={color.inkFaint}
            style={[styles.input, script("semibold")]}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel={WL.placeholder[lang]}
          />
          <Pressable
            onPress={() => search(query)}
            style={styles.searchBtn}
            accessibilityRole="button"
            accessibilityLabel={WL.search[lang]}
          >
            <Ionicons name="search" size={22} color={color.white} />
          </Pressable>
        </View>

        {submitted && !multiWord && readings && readings.length > 0 && (
          <View style={styles.found} accessibilityRole="radiogroup" accessibilityLabel={WL.found[lang]}>
            <Text style={[styles.foundTitle, lang === "hi" && script("bold")]}>{WL.found[lang]}</Text>
            {readings.map((c, i) => {
              const active = picked === c;
              return (
                <Pressable
                  key={`${c.kind}-${c.lemma}-${c.linga ?? c.lakara ?? i}`}
                  onPress={() => {
                    haptics.tap();
                    pick(active ? null : c);
                  }}
                  style={[styles.foundRow, active && styles.foundRowActive]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={`${c.lemma_iast}: ${c.plain[lang]}`}
                >
                  <Ionicons
                    name={active ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={active ? color.saffronText : color.inkFaint}
                  />
                  <ReadingText text={c.plain[lang]} />
                </Pressable>
              );
            })}
            <Text style={[styles.foundNote, lang === "hi" && script("regular")]}>{WL.checked[lang]}</Text>
          </View>
        )}

        {submitted && !multiWord && (
          <View style={styles.controls}>
            <Segmented
              lang={lang}
              value={kind}
              onChange={(v) => {
                setPicked(null);
                setKind(v);
              }}
              options={[
                { value: "noun", label: WL.noun },
                { value: "verb", label: WL.verb },
              ]}
            />
            {kind === "noun" && (
              <Segmented
                lang={lang}
                value={linga}
                onChange={(v) => {
                  setPicked(null);
                  setLinga(v);
                }}
                options={[
                  { value: "Pum", label: WL.masc },
                  { value: "Stri", label: WL.fem },
                  { value: "Napumsaka", label: WL.neut },
                ]}
              />
            )}
            <Segmented
              lang={lang}
              value={view}
              onChange={setView}
              options={[
                { value: "build", label: WL.build },
                { value: "table", label: WL.table },
              ]}
            />
          </View>
        )}

        {submitted && multiWord ? (
          <View style={styles.result}>
            <SandhiVisual key={resultKey} joined={submitted} autoPlay />
          </View>
        ) : submitted && view === "table" ? (
          <View style={styles.table}>
            <ParadigmScreen
              key={resultKey}
              pratipadika={kind === "noun" ? stem : undefined}
              linga={kind === "noun" ? linga : undefined}
              dhatu={kind === "verb" ? stem : undefined}
              lakara={confirmed?.lakara ?? undefined}
            />
          </View>
        ) : submitted ? (
          <View style={styles.result}>
            <DerivationPlayer key={resultKey} word={stem} kind={kind} params={buildParams} />
          </View>
        ) : null}

        {recent.length > 0 && (
          <View style={styles.recentBlock}>
            <Text style={[styles.sectionTitle, lang === "hi" && script("bold")]}>{WL.recent[lang]}</Text>
            <View style={styles.recentRow}>
              {recent.map((w) => (
                <Pressable
                  key={w}
                  onPress={() => search(w)}
                  style={styles.recentChip}
                  accessibilityRole="button"
                  accessibilityLabel={`${WL.lookUpAgain[lang]}: ${w}`}
                >
                  <Text style={[styles.recentText, script("semibold")]}>{w}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  hint: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.sm, color: color.inkSoft, lineHeight: 22 },
  hintSa: { color: color.saffronText },
  searchRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  input: {
    flex: 1,
    borderWidth: 2,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: font.sizes.md,
    color: color.ink,
    backgroundColor: color.surface,
  },
  searchBtn: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: color.saffron, alignItems: "center", justifyContent: "center", ...shadow.button },
  found: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.md, gap: space.xs, ...shadow.card },
  foundTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.inkSoft },
  foundRow: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 44, paddingHorizontal: space.sm, borderRadius: radius.md },
  foundRowActive: { backgroundColor: color.surfaceMuted },
  foundText: { flex: 1, fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.base, color: color.ink, lineHeight: 24 },
  foundSa: { color: color.saffronText },
  foundNote: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.xs, color: color.inkFaint },
  controls: { gap: space.xs },
  segment: { flexDirection: "row", backgroundColor: color.surfaceMuted, borderRadius: radius.md, padding: 4 },
  segmentOption: { flex: 1, minHeight: 36, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  segmentActive: { backgroundColor: color.surface, ...shadow.card },
  segmentText: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.inkSoft },
  segmentTextActive: { color: color.saffronText },
  result: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.md, ...shadow.card },
  table: { height: 520 },
  recentBlock: { gap: space.xs },
  sectionTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.ink },
  recentRow: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  recentChip: { backgroundColor: color.surface, borderRadius: radius.pill, paddingHorizontal: space.md, minHeight: 40, justifyContent: "center", ...shadow.card },
  recentText: { fontSize: font.sizes.base, color: color.ink },
});
