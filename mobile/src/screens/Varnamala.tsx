// Varnamala — the alphabet, grouped by place of articulation.
// U4-1: Renders the true 5×5 sparśa matrix (rows=place, columns=voicing/aspiration).
// Selecting a varṇa plays it and runs the articulation gesture that makes it in
// an animated sagittal cross-section of the mouth and throat (see VocalTract).
// Colour-codes the five rows by place, matching the same colours wherever
// place is referenced in the app.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, type VarnamalaChar, type VarnamalaResponse } from "../api/client";
import { haptics } from "../services/haptics";
import { speak } from "../services/speech";
import { color, font, radius, script, shadow, space } from "../theme";
import VocalTract from "../components/VocalTract";
import { PLACE_COLORS, PLACE_LABEL, PLACE_ORDER, articulationFor } from "../phonetics";

export { PLACE_COLORS };

// ── Sparśa matrix — the 5×5 grid ─────────────────────────────────────

function SparsaMatrix({
  chars,
  onCharPress,
  speaking,
}: {
  chars: VarnamalaChar[];
  onCharPress: (c: VarnamalaChar) => void;
  speaking: string | null;
}) {
  // The nasal completes each row of the traditional 5×5, so it belongs in the
  // matrix under the "Nasal" header — it arrives from the API as kind "nasal",
  // in its own list, which is why it used to leave that column empty.
  const sparsa = useMemo(
    () => chars.filter((c) => c.place && (c.kind === "consonant" || c.kind === "nasal")),
    [chars],
  );

  return (
    <View style={styles.matrix}>
      {/* Column headers: voicing/aspiration */}
      <View style={styles.matrixRow}>
        <View style={styles.matrixCorner} />
        {["Unvoiced\nunasp.", "Unvoiced\nasp.", "Voiced\nunasp.", "Voiced\nasp.", "Nasal"].map((h, i) => (
          <View key={i} style={styles.matrixHeader}>
            <Text style={styles.matrixHeaderText}>{h}</Text>
          </View>
        ))}
      </View>

      {/* Rows: place of articulation */}
      {PLACE_ORDER.map((place) => {
        const inPlace = sparsa.filter((c) => c.place === place);
        const row = [
          ...inPlace.filter((c) => c.kind === "consonant").slice(0, 4),
          ...inPlace.filter((c) => c.kind === "nasal").slice(0, 1),
        ];
        if (row.length === 0) return null;
        return (
          <View key={place} style={styles.matrixRow}>
            <View style={[styles.matrixLabel, { backgroundColor: PLACE_COLORS[place] || color.surfaceMuted }]}>
              <Text style={styles.matrixLabelSa}>{PLACE_LABEL[place]?.sa ?? place}</Text>
              <Text style={styles.matrixLabelEn}>{PLACE_LABEL[place]?.en ?? ""}</Text>
            </View>
            {row.map((c, i) => (
              <Pressable
                key={c.iast}
                onPress={() => onCharPress(c)}
                style={[styles.matrixCell, speaking === c.devanagari && { backgroundColor: color.saffronLight }]}
              >
                <Text style={[styles.matrixCellDev, script("bold")]}>{c.devanagari}</Text>
                <Text style={styles.matrixCellIast}>{c.iast}</Text>
              </Pressable>
            ))}
          </View>
        );
      })}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────

export default function VarnamalaScreen() {
  const [grid, setGrid] = useState<VarnamalaResponse | null>(null);
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [selectedChar, setSelectedChar] = useState<VarnamalaChar | null>(null);
  // Bumped when playback starts; VocalTract replays its gesture on every change.
  const [playToken, setPlayToken] = useState(0);

  useEffect(() => {
    api.varnamala().then(setGrid).catch(() => setGrid(null));
  }, []);

  const playChar = useCallback(async (c: VarnamalaChar) => {
    haptics.tap();
    setSpeaking(c.devanagari);
    // Start the gesture on the tap, not when the audio arrives. A TTS round
    // trip sits in front of playback (measured ~900ms here, and it still costs
    // that when the call fails), and holding a silent, still diagram for that
    // long reads as a broken tap. The gesture also has to work at all when
    // there is no audio — offline, or once the TTS quota is spent.
    setPlayToken((n) => n + 1);
    try {
      await speak(c.devanagari, "sa");
    } catch {
      /* no audio — the diagram still teaches the shape */
    } finally {
      setSpeaking(null);
    }
  }, []);

  const onCharPress = useCallback((c: VarnamalaChar) => {
    if (c.devanagari === selectedChar?.devanagari) {
      setSelectedChar(null);
    } else {
      setSelectedChar(c);
    }
    playChar(c);
  }, [selectedChar, playChar]);

  // All chars from the grid for minimal pair lookup
  const allChars = useMemo(() => {
    if (!grid) return [];
    return [...(grid.vowels ?? []), ...(grid.consonants ?? []), ...(grid.nasals ?? []), ...(grid.others ?? [])];
  }, [grid]);

  // The articulation drives the cross-section. Null for anusvāra/visarga,
  // which have no place and nothing honest to draw.
  const articulation = useMemo(
    () => (selectedChar ? articulationFor(selectedChar) : null),
    [selectedChar],
  );

  // Find minimal pair for the selected character
  const minimalPair = useMemo(() => {
    if (!selectedChar?.place) return null;
    return allChars.find(
      (c) => c.place === selectedChar.place && c.devanagari !== selectedChar.devanagari,
    );
  }, [selectedChar, allChars]);

  if (!grid) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}><Text style={styles.muted}>Loading the alphabet…</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.intro}>
          Sanskrit orders its alphabet by where your tongue goes in your mouth.
          The five rows below are five places of articulation — throat to lips.
        </Text>

        {/* 5×5 Sparśa matrix */}
        <Text style={styles.sectionTitle}>स्पर्श · The 5×5 stops</Text>
        <SparsaMatrix
          chars={[...(grid.consonants ?? []), ...(grid.nasals ?? [])]}
          onCharPress={onCharPress}
          speaking={speaking}
        />

        {/* Animated cross-section of the mouth making the selected sound */}
        {selectedChar && articulation && (
          <VocalTract
            articulation={articulation}
            char={selectedChar.devanagari}
            iast={selectedChar.iast}
            playToken={playToken}
          />
        )}

        {/* Minimal pair comparison */}
        {minimalPair && articulation && (
          <View style={styles.minimalPair}>
            <View style={styles.minimalPairRow}>
              <Text style={styles.minimalPairTitle}>Compare with</Text>
              <Pressable
                onPress={() => onCharPress(minimalPair)}
                accessibilityRole="button"
                accessibilityLabel={`Compare with ${minimalPair.iast}`}
                style={[styles.minimalPairChip, { backgroundColor: PLACE_COLORS[articulation.place] || color.surfaceMuted }]}
              >
                <Text style={styles.minimalPairChipText}>{minimalPair.devanagari}</Text>
              </Pressable>
            </View>
            <Text style={styles.minimalPairHint}>
              Same place ({PLACE_LABEL[articulation.place]?.en}), different sound.
              This contrast is what English speakers find hardest.
            </Text>
          </View>
        )}

        {/* Other groups */}
        {renderGroup(grid.vowels, "vowels", allChars, onCharPress, speaking)}
        {/* Nasals are not listed again here: they now complete the 5×5 rows above. */}
        {renderGroup(grid.others, "others", allChars, onCharPress, speaking)}
      </ScrollView>
    </SafeAreaView>
  );
}

function renderGroup(
  items: VarnamalaChar[] | undefined,
  key: string,
  allChars: VarnamalaChar[],
  onCharPress: (c: VarnamalaChar) => void,
  speaking: string | null,
) {
  if (!items || items.length === 0) return null;

  const GROUP_LABEL: Record<string, string> = {
    vowels: "Vowels · स्वर",
    consonants: "Other Consonants",
    nasals: "Nasals · अनुनासिक",
    others: "Others · अयोगवाह",
  };

  return (
    <View key={key} style={styles.group}>
      <Text style={styles.groupLabel}>{GROUP_LABEL[key] ?? key}</Text>
      <View style={styles.flex}>
        {items.map((c, i) => (
          <Pressable key={i} style={styles.char} onPress={() => c.devanagari && onCharPress(c)}>
            <Text style={[styles.charDev, script("bold")]}>{c.devanagari}</Text>
            <Text style={styles.charIast}>{c.iast}</Text>
            {speaking === c.devanagari && <Ionicons name="volume-high" size={10} color={color.saffron} style={{ marginTop: 2 }} />}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  muted: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.base, color: color.inkSoft },
  body: { padding: space.lg },
  intro: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.sm, color: color.inkSoft, marginBottom: space.lg, lineHeight: 20 },
  sectionTitle: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.md,
    color: color.ink,
    marginBottom: space.sm,
  },
  // ── Matrix ──
  matrix: { marginBottom: space.lg, overflow: "hidden" },
  matrixRow: { flexDirection: "row", marginBottom: 2 },
  matrixCorner: { width: 60 },
  matrixHeader: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 4 },
  matrixHeaderText: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: 8, color: color.inkSoft, textAlign: "center", lineHeight: 11 },
  matrixLabel: {
    width: 60,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: space.xs,
    borderRadius: radius.sm,
    marginRight: 2,
  },
  matrixLabelSa: { fontFamily: script("bold").fontFamily as string, fontSize: font.sizes.xs, color: color.white },
  matrixLabelEn: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: 8, color: "rgba(255,255,255,0.9)", marginTop: 1 },
  matrixCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surface,
    borderRadius: radius.sm,
    paddingVertical: space.xs,
    marginHorizontal: 1,
    ...shadow.card,
  },
  matrixCellDev: { fontSize: 16, color: color.ink },
  matrixCellIast: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: 8, color: color.inkSoft, marginTop: 1 },
  // ── Minimal pair ──
  minimalPair: { marginBottom: space.lg, backgroundColor: color.surfaceMuted, borderRadius: radius.md, padding: space.md },
  minimalPairRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  minimalPairTitle: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.sm, color: color.ink },
  minimalPairChip: { paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.pill },
  minimalPairChipText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: color.white },
  minimalPairHint: { fontFamily: "Nunito_400Regular", fontWeight: "400", fontSize: font.sizes.sm, color: color.inkSoft, marginTop: space.xs, lineHeight: 18 },
  // ── Other groups ──
  group: { marginBottom: space.lg },
  groupLabel: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.ink, marginBottom: space.sm },
  flex: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  char: {
    width: "22%",
    aspectRatio: 1,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  charDev: { fontSize: 24, color: color.ink },
  charIast: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.xs, color: color.inkSoft, marginTop: 2 },
});