// Path — the winding journey through Shabd's content taxonomy.
// A vertically scrolling path of nodes mapped to feature bands from the
// content taxonomy. Node states: locked, available, current, complete, mastered.
// The path is drawn with react-native-svg as a single curved path.
// Progress derives from Learner.feature_mastery.
//
// U3-1: Created per UI_HANDOVER.md spec.

import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@react-native-vector-icons/ionicons";

import { useAuth } from "../store/auth";
import { color, font, radius, script, shadow, space } from "../theme";
import { Button, Card } from "../components/ui";
import type { TabScreenProps } from "../navigation/types";

// ── Feature band taxonomy ─────────────────────────────────────────────
// These correspond to the feature bands from HANDOVER.md P2-1.
// The path visualises these bands; each node = one unit.

interface PathNodeData {
  id: string;
  label: string;
  labelSa: string;
  mastery: number;     // 0..1 from Learner.feature_mastery
  features: string[];
}

type NodeStatus = "locked" | "available" | "current" | "complete" | "mastered";

function getStatus(mastery: number, isCurrent: boolean, prevCompleted: boolean): NodeStatus {
  if (mastery >= 1) return "mastered";
  if (mastery >= 0.8) return "complete";
  if (isCurrent) return "current";
  if (prevCompleted) return "available";
  return "locked";
}

const STATUS_COLORS: Record<NodeStatus, string> = {
  locked:    color.inkFaint,
  available: color.saffron,
  current:   color.saffron,
  complete:  color.gold,
  mastered:  color.gold,
};

const BANDS: PathNodeData[] = [
  { id: "greetings",        label: "Greetings",         labelSa: "नमस्ते",               mastery: 0, features: ["greeting"] },
  { id: "nominals",         label: "Noun basics",       labelSa: "नामानि",               mastery: 0, features: ["noun", "gender"] },
  { id: "verbs-present",    label: "Present tense",     labelSa: "वर्तमानकालः",          mastery: 0, features: ["verb_present"] },
  { id: "accusative",       label: "Accusative case",   labelSa: "द्वितीया विभक्तिः",    mastery: 0, features: ["case_accusative"] },
  { id: "adjectives",       label: "Adjectives",        labelSa: "विशेषणानि",            mastery: 0, features: ["adjective"] },
  { id: "sandhi-basic",     label: "Sound joining",     labelSa: "सन्धिः",               mastery: 0, features: ["sandhi"] },
  { id: "past-tense",       label: "Past tense",        labelSa: "भूतकालः",              mastery: 0, features: ["verb_past"] },
  { id: "instrumental",     label: "Instrumental case", labelSa: "तृतीया विभक्तिः",      mastery: 0, features: ["case_instrumental"] },
  { id: "dative",           label: "Dative case",       labelSa: "चतुर्थी विभक्तिः",     mastery: 0, features: ["case_dative"] },
  { id: "genitive",         label: "Genitive case",     labelSa: "षष्ठी विभक्तिः",       mastery: 0, features: ["case_genitive"] },
  { id: "locative",         label: "Locative case",     labelSa: "सप्तमी विभक्तिः",      mastery: 0, features: ["case_locative"] },
  { id: "dual",             label: "The dual number",   labelSa: "द्विवचनम्",            mastery: 0, features: ["dual"] },
  { id: "compounds",        label: "Word compounds",    labelSa: "समासाः",               mastery: 0, features: ["compound"] },
  { id: "voice",            label: "Active & middle",   labelSa: "परस्मैपदम्",           mastery: 0, features: ["voice"] },
  { id: "conversation",     label: "Free conversation", labelSa: "संभाषणम्",             mastery: 0, features: ["conversation"] },
];

// ── PathNode component ─────────────────────────────────────────────────

function PathNode({
  data,
  index,
  onTap,
}: {
  data: PathNodeData;
  index: number;
  onTap: (data: PathNodeData) => void;
}) {
  // Determine status based on mastery
  const isFirstCompleted = index === 0 || BANDS.slice(0, index).some((b) => b.mastery >= 0.8);
  const status = getStatus(data.mastery, data.id === "greetings", isFirstCompleted);
  const colorFill = STATUS_COLORS[status];

  return (
    <Pressable
      onPress={() => onTap(data)}
      style={[styles.node, status === "locked" && styles.nodeLocked]}
      accessibilityRole="button"
      accessibilityLabel={`${data.labelSa} — ${data.label}, ${status}`}
    >
      {/* Node circle */}
      <View
        style={[
          styles.nodeCircle,
          {
            backgroundColor: status === "current" ? color.saffron : color.surface,
            borderColor: colorFill,
            borderWidth: status === "current" ? 3 : 2,
          },
          (status === "complete" || status === "mastered") && { backgroundColor: colorFill },
        ]}
      >
        {status === "mastered" ? (
          <Ionicons name="checkmark-circle" size={18} color={color.white} />
        ) : status === "complete" ? (
          <Ionicons name="checkmark" size={16} color={color.white} />
        ) : (
          <Text
            style={[
              styles.nodeIndex,
              { color: status === "locked" ? color.inkFaint : color.saffron },
            ]}
          >
            {index + 1}
          </Text>
        )}
      </View>

      {/* Label */}
      <Text
        style={[
          styles.nodeLabel,
          status === "locked" && styles.nodeLabelLocked,
          { color: status === "locked" ? color.inkFaint : color.ink },
        ]}
      >
        {data.labelSa}
      </Text>
      <Text style={[styles.nodeGloss, status === "locked" && { color: color.inkFaint }]}>
        {data.label}
      </Text>
    </Pressable>
  );
}

// ── Path screen ────────────────────────────────────────────────────────

export default function PathScreen({ navigation }: TabScreenProps<"Path">) {
  const { learner, refresh } = useAuth();
  const [selectedNode, setSelectedNode] = useState<PathNodeData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Merge backend mastery data into bands
  const bands = useMemo(() => {
    const mastery = learner?.feature_mastery ?? {};
    return BANDS.map((b) => ({
      ...b,
      mastery: mastery[b.id] ?? 0,
    }));
  }, [learner]);

  const onNodeTap = useCallback((data: PathNodeData) => {
    setSelectedNode(data);
    setSheetOpen(true);
  }, []);

  const onStartUnit = useCallback(() => {
    if (!selectedNode) return;
    // Close the sheet FIRST so the learner never sees it over the pushed
    // screen (U8-0), then launch a practice session scoped to this unit's
    // feature bands.
    setSheetOpen(false);
    navigation.navigate("Challenge", { features: selectedNode.features });
  }, [selectedNode, navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>Your Path</Text>
        <Text style={styles.subtitle}>A journey through Sanskrit, step by step.</Text>

        <View style={styles.path}>
          {bands.map((band, i) => (
            <React.Fragment key={band.id}>
              {/* Connector line (except after last) */}
              {i > 0 && <View style={styles.connector} />}
              <PathNode data={band} index={i} onTap={onNodeTap} />
            </React.Fragment>
          ))}
        </View>
      </ScrollView>

      {/* Unit detail sheet */}
      {sheetOpen && selectedNode && (
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setSheetOpen(false)} />
          <View style={styles.sheet}>
            <Text style={[styles.sheetTitle, script("bold")]}>{selectedNode.labelSa}</Text>
            <Text style={styles.sheetSub}>{selectedNode.label}</Text>
            <View style={styles.sheetMastery}>
              <View style={styles.sheetMasteryTrack}>
                <View
                  style={[
                    styles.sheetMasteryFill,
                    { width: `${Math.round(selectedNode.mastery * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.sheetMasteryText}>
                {Math.round(selectedNode.mastery * 100)}% mastered
              </Text>
            </View>
            {selectedNode.features.length > 0 && (
              <View style={styles.sheetFeatures}>
                <Text style={styles.sheetFeaturesTitle}>Teaches:</Text>
                {selectedNode.features.map((f) => (
                  <Text key={f} style={styles.sheetFeature}>
                    · {f.replace(/_/g, " ")}
                  </Text>
                ))}
              </View>
            )}
            <Button
              label="Start unit"
              onPress={onStartUnit}
              block
              style={{ marginTop: space.md }}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, paddingBottom: space.xxl * 2 },
  title: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.xl,
    color: color.ink,
  },
  subtitle: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginBottom: space.lg,
    lineHeight: 20,
  },
  path: { alignItems: "center" },
  connector: {
    width: 3,
    height: 24,
    backgroundColor: color.border,
    borderRadius: 1.5,
  },
  node: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.lg,
    width: "100%",
    maxWidth: 300,
  },
  nodeLocked: { opacity: 0.5 },
  nodeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  nodeIndex: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.sm,
  },
  nodeLabel: {
    fontFamily: script("bold").fontFamily,
    fontWeight: script("bold").fontWeight,
    fontSize: font.sizes.base,
    flex: 1,
  } as any,
  nodeGloss: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    position: "absolute",
    right: space.md,
  },
  nodeLabelLocked: {},
  sheetOverlay: {
    position: "absolute",
    inset: 0,
    justifyContent: "flex-end",
    zIndex: 100,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  sheet: {
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.lg,
    ...shadow.card,
  },
  sheetTitle: { fontSize: font.sizes.lg, color: color.ink },
  sheetSub: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginTop: 2,
  },
  sheetMastery: { marginTop: space.md, flexDirection: "row", alignItems: "center", gap: space.sm },
  sheetMasteryTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.border,
    overflow: "hidden",
  },
  sheetMasteryFill: { height: 8, borderRadius: 4, backgroundColor: color.saffron },
  sheetMasteryText: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.xs,
    color: color.inkSoft,
    minWidth: 50,
    textAlign: "right",
  },
  sheetFeatures: { marginTop: space.md },
  sheetFeaturesTitle: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginBottom: 4,
  },
  sheetFeature: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.ink,
    lineHeight: 20,
  },
});