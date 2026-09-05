// Path — the winding journey through Sanskritam's content taxonomy.
// P7-5: nodes now come from GET /grammar/path — the APPROVED-CONTENT SPINE —
// so the path reflects what is actually servable, not the brief catalogue.
// Node states: locked, available, current, complete, mastered. Progress
// derives from Learner.feature_mastery (server-merged into each node).
//
// Resilience (U10-3): a failed fetch shows a retryable error state, never a
// silent empty path, and falls back to the local taxonomy so the screen stays
// usable offline.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@react-native-vector-icons/ionicons";

import { api, type PathNode, type PathSpine } from "../api/client";
import { useAuth } from "../store/auth";
import { color, font, radius, script, shadow, space } from "../theme";
import { Button } from "../components/ui";
import type { TabScreenProps } from "../navigation/types";

type NodeStatus = "locked" | "available" | "current" | "complete" | "mastered";

const STATUS_COLORS: Record<NodeStatus, string> = {
  locked:    color.inkFaint,
  available: color.saffron,
  current:   color.saffron,
  complete:  color.gold,
  mastered:  color.gold,
};

function nodeStatus(
  mastery: number,
  approvedCount: number,
  prevUnlocked: boolean,
): NodeStatus {
  if (mastery >= 1) return "mastered";
  if (mastery >= 0.8) return "complete";
  if (approvedCount > 0 && prevUnlocked) return "current";
  if (prevUnlocked) return "available";
  return "locked";
}

// Offline fallback: a few taxonomy nodes the client knows even with no
// network. The live endpoint carries the same ids plus approved counts.
const FALLBACK_NODES: PathNode[] = [
  { id: "NOM.SG", feature: "NOM.SG", kind: "case", rank: 10, label_en: "Nominative Singular", label_hi: "प्रथमा विभक्तिः", approved_count: 0, pending_count: 0, mastery: 0 },
  { id: "ACC.SG", feature: "ACC.SG", kind: "case", rank: 11, label_en: "Accusative Singular", label_hi: "द्वितीया विभक्तिः", approved_count: 0, pending_count: 0, mastery: 0 },
  { id: "SG", feature: "SG", kind: "number", rank: 20, label_en: "Singular", label_hi: "एकवचनम्", approved_count: 0, pending_count: 0, mastery: 0 },
  { id: "PRES.3SG", feature: "PRES.3SG", kind: "tense", rank: 32, label_en: "Present 3rd Person", label_hi: "वर्तमान प्रथमपुरुषः", approved_count: 0, pending_count: 0, mastery: 0 },
];

interface PathNodeData {
  id: string;
  label: string;
  labelSa: string;
  mastery: number;
  approvedCount: number;
  features: string[];
}

function toNodeData(n: PathNode): PathNodeData {
  return {
    id: n.id,
    label: n.label_en || n.id,
    labelSa: n.label_hi || n.id,
    mastery: n.mastery ?? 0,
    approvedCount: n.approved_count ?? 0,
    features: [n.id],
  };
}

// ── PathNodeView component ─────────────────────────────────────────────

function PathNodeView({
  data,
  index,
  prevUnlocked,
  onTap,
}: {
  data: PathNodeData;
  index: number;
  prevUnlocked: boolean;
  onTap: (data: PathNodeData) => void;
}) {
  const status = nodeStatus(data.mastery, data.approvedCount, index === 0 || prevUnlocked);
  const hasContent = data.approvedCount > 0;
  const colorFill = STATUS_COLORS[status];

  return (
    <Pressable
      onPress={() => onTap(data)}
      style={[styles.node, status === "locked" && styles.nodeLocked]}
      accessibilityRole="button"
      accessibilityLabel={`${data.labelSa} — ${data.label}, ${status}, ${data.approvedCount} exercises`}
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
        {hasContent ? `${data.approvedCount}` : "—"}
      </Text>
    </Pressable>
  );
}

// ── Path screen ────────────────────────────────────────────────────────

export default function PathScreen({ navigation }: TabScreenProps<"Path">) {
  const { learner } = useAuth();
  const [spine, setSpine] = useState<PathSpine | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<PathNodeData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .pathSpine()
      .then((s) => {
        setSpine(s);
        setLoadFailed(false);
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const bands: PathNodeData[] = useMemo(
    () =>
      spine && spine.nodes.length > 0
        ? spine.nodes.map(toNodeData)
        : FALLBACK_NODES.map(toNodeData),
    [spine],
  );

  const onNodeTap = useCallback((data: PathNodeData) => {
    setSelectedNode(data);
    setSheetOpen(true);
  }, []);

  const onStartUnit = useCallback(() => {
    if (!selectedNode) return;
    // Close the sheet FIRST so the learner never sees it over the pushed
    // screen (U8-0), then launch a practice session scoped to this unit's
    // feature.
    setSheetOpen(false);
    navigation.navigate("Challenge", { features: selectedNode.features });
  }, [selectedNode, navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>Your Path</Text>
        <Text style={styles.subtitle}>A journey through Sanskrit, step by step.</Text>

        {loading && !spine ? (
          <Text style={styles.statusText}>Loading your path…</Text>
        ) : loadFailed ? (
          <View style={[styles.errorCard, shadow.card]}>
            <Text style={styles.errorTitle}>Couldn't load the path.</Text>
            <Text style={styles.errorSub}>
              Check your connection — your progress is safe.
            </Text>
            <Button label="Retry" onPress={load} style={{ marginTop: space.md }} />
          </View>
        ) : null}

        {!loading && (
          <View style={styles.path}>
            {bands.map((band, i) => (
              <React.Fragment key={band.id}>
                {i > 0 && <View style={styles.connector} />}
                <PathNodeView
                  data={band}
                  index={i}
                  prevUnlocked={
                    i === 0 ||
                    bands.slice(0, i).some((b) => b.mastery >= 0.8 || b.approvedCount > 0)
                  }
                  onTap={onNodeTap}
                />
              </React.Fragment>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Unit detail sheet */}
      {sheetOpen && selectedNode && (
        <View style={styles.sheetOverlay}>
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() => setSheetOpen(false)}
            accessibilityLabel="Close details"
          />
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
            {selectedNode.approvedCount === 0 ? (
              <Text style={styles.sheetEmptyNote}>
                No exercises ready here yet — you're ahead of us today. Try an
                earlier unit.
              </Text>
            ) : null}
            <Button
              label={selectedNode.approvedCount > 0 ? "Start unit" : "Practice anyway"}
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
  statusText: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginTop: space.md,
  },
  errorCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.lg,
  },
  errorTitle: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.base,
    color: color.ink,
  },
  errorSub: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginTop: 4,
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
  sheetEmptyNote: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginTop: space.md,
    lineHeight: 20,
  },
});
