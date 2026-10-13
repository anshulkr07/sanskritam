// Word Groups (पद-वर्गाः): select tiles that belong together, submit the
// group. Solved groups lock and reveal their explanation; four wrong
// submissions end a standard round. Local alternating turns and live
// independent-board races run through the same session actions.

import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CatalogGame } from "../games/v2/client";
import { playApi, type WordGroupsPack } from "../games/v2/client";
import { useCatalogGame } from "../games/v2/useCatalog";
import { usePlaySession, loadRemembered } from "../games/v2/useSession";
import { ResultSheetV2, GameTopBar, SetupSheet, type SetupChoice } from "../games/v2/parts";
import { color, fill, font, onFill, radius, script, space } from "../theme";
import { haptics } from "../services/haptics";

type Props = {
  navigation: { goBack: () => void; navigate: (r: string, p?: object) => void };
};

export default function WordGroupsScreen({ navigation }: Props) {
  const { session, result, busy, error, start, answer, finish, reset, setBusy } = usePlaySession("word-groups");
  const [sel, setSel] = useState<string[]>([]);
  const [locked, setLocked] = useState<{ tiles: string[]; label: string }[]>([]);
  const [mistakesLeft, setMistakesLeft] = useState(4);
  const [note, setNote] = useState<string | null>(null);
  const [remembered, setRemembered] = useState<Record<string, unknown>>({});
  const game = useCatalogGame("word-groups");
  const pack = session?.pack as WordGroupsPack | undefined;

  React.useEffect(() => { void loadRemembered("word-groups").then(setRemembered); }, []);

  const tileState = useMemo(() => {
    const map: Record<string, "locked" | "sel"> = {};
    for (const l of locked) for (const t of l.tiles) map[t] = "locked";
    for (const t of sel) map[t] = "sel";
    return map;
  }, [locked, sel]);

  const toggle = (id: string) => {
    if (tileState[id] === "locked") return;
    haptics.tap();
    setSel((cur) => cur.includes(id) ? cur.filter((x) => x !== id)
      : cur.length < (pack?.group_size ?? 4) ? [...cur, id] : cur);
  };

  const submit = async () => {
    if (!pack || sel.length !== pack.group_size) return;
    setBusy(true);
    const res = await answer({ type: "submit_group", tiles: sel });
    setBusy(false);
    if (!res) return;
    const r = res as { accepted: boolean; label?: string; explanation?: string; tiles?: string[]; complete?: boolean; over?: boolean; mistakes_left?: number; locked?: boolean };
    if (r.locked) {
      setNote("That group is already solved.");
      setSel([]);
      return;
    }
    if (r.accepted) {
      haptics.correct();
      setLocked((cur) => [...cur, { tiles: r.tiles ?? [], label: r.label ?? "" }]);
      setNote(r.explanation || null);
    } else {
      haptics.incorrect();
      setNote("Not a group.");
      setMistakesLeft(r.mistakes_left ?? 0);
    }
    setSel([]);
    if (r.complete || r.over) void finish();
  };

  if (!session) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <GameTopBar title="Word Groups" sa="पद-वर्गाः" onClose={() => navigation.goBack()} />
        {!game || error ? (
          <Text style={styles.loading} accessibilityRole="alert">{error ?? "Loading…"}</Text>
        ) : (
          <SetupSheet game={game as CatalogGame} remembered={remembered}
            onStart={(c) => void start(c)} busy={busy} />
        )}
      </SafeAreaView>
    );
  }

  if (result) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.doneBody}>
          <ResultSheetV2 result={result}
            onAgain={() => { reset(); setLocked([]); setMistakesLeft(4); setSel([]); setNote(null); }}
            onDone={() => navigation.goBack()} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <GameTopBar title="Word Groups" sa="पद-वर्गाः"
        onClose={() => void finish().then(() => navigation.goBack())}
        right={<View style={{ alignItems: "flex-end", marginRight: space.sm }}>
          <Text style={styles.count}>{locked.length}/{pack?.groups_total ?? 4}</Text>
          <Text style={styles.countLabel}>{mistakesLeft} mistakes left</Text>
        </View>} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.tiles}>
          {pack?.tiles.map((t) => {
            const st = tileState[t.id];
            return (
              <Pressable key={t.id} onPress={() => toggle(t.id)} disabled={st === "locked"}
                accessibilityRole="button" accessibilityLabel={t.sa}
                accessibilityState={{ selected: st === "sel", disabled: st === "locked" }}
                style={[styles.tile, st === "sel" && styles.tileSel, st === "locked" && styles.tileLocked]}>
                <Text style={[styles.tileSa, script("semibold")]} numberOfLines={1}>{t.sa}</Text>
                {!!t.iast && st !== "locked" && <Text style={styles.tileIast} numberOfLines={1}>{t.iast}</Text>}
                {st === "locked" && !!t.meaning && <Text style={styles.tileMeaning} numberOfLines={1}>{t.meaning}</Text>}
              </Pressable>
            );
          })}
        </View>
        {!!note && <Text style={styles.note} accessibilityRole="alert">{note}</Text>}
      </ScrollView>
      <View style={styles.submitRow}>
        <Pressable onPress={() => void submit()}
          disabled={sel.length !== (pack?.group_size ?? 4) || busy}
          accessibilityRole="button"
          accessibilityLabel={`Submit group of ${sel.length}`}
          accessibilityState={{ disabled: sel.length !== (pack?.group_size ?? 4) || busy }}
          style={[styles.submit, sel.length !== (pack?.group_size ?? 4) && styles.submitIdle]}>
          <Text style={[styles.submitText, sel.length !== (pack?.group_size ?? 4) && styles.submitIdleText]}>
            Submit group{sel.length ? ` (${sel.length})` : ""}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, gap: space.md },
  doneBody: { padding: space.lg, justifyContent: "center", flexGrow: 1 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  tile: {
    width: "47.5%", minHeight: 64, borderRadius: radius.md, backgroundColor: color.surface,
    borderWidth: 1.5, borderColor: color.border, alignItems: "center", justifyContent: "center",
    padding: space.sm, gap: 2,
  },
  tileSel: { backgroundColor: fill.slate, borderColor: fill.slate },
  tileLocked: { backgroundColor: fill.sage, borderColor: fill.sage, opacity: 0.95 },
  tileSa: { fontSize: 20, color: color.ink, lineHeight: 30 },
  tileIast: { fontSize: font.sizes.xs, color: color.inkSoft },
  tileMeaning: { fontSize: font.sizes.xs, color: onFill.soft },
  note: { color: color.inkSoft, fontSize: font.sizes.sm, textAlign: "center" },
  submitRow: { padding: space.lg, paddingTop: space.sm },
  submit: { backgroundColor: color.saffronBtn, borderRadius: radius.md, minHeight: 52, alignItems: "center", justifyContent: "center" },
  submitIdle: { backgroundColor: color.surfaceMuted },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  submitIdleText: { color: color.inkFaint },
  count: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.lg, color: color.ink },
  countLabel: { fontSize: font.sizes.xs, color: color.inkSoft },
  loading: { textAlign: "center", marginTop: 40, color: color.inkSoft },
});
