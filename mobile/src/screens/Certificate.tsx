// Certificate: cream page, maroon band, share via view-shot + expo-sharing.

import { captureRef } from "react-native-view-shot";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { RootStackParamList } from "../navigation/types";
import { api } from "../api/client";
import { color, fill, onFill } from "../theme";
import { plain } from "../utils/text";

type Props = NativeStackScreenProps<RootStackParamList, "Certificate">;

const PLACE = ["", "First place", "Second place", "Third place"];

export default function CertificateScreen({ route }: Props) {
  const code = (route.params as { code?: string } | undefined)?.code ?? "";
  const [cert, setCert] = useState<{ rank: number; kind: string; piece_ref: string; month: string | null } | null>(null);
  const ref = useRef<View | null>(null);

  useEffect(() => {
    api.myCertificates().then((r) => {
      const found = (r.certificates ?? []).find((c) => c.code === code);
      if (found) setCert({ rank: found.rank, kind: found.kind, piece_ref: found.piece_ref, month: found.month });
    }).catch(() => {});
  }, [code]);

  const share = async () => {
    try {
      const uri = await captureRef(ref, { format: "png", result: "tmpfile" });
      // expo-sharing is a build-time dependency (1.2.0); guarded for old builds.
      let shareAsync: ((u: string) => Promise<void>) | null = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Sharing = require("expo-sharing") as { shareAsync?: (u: string) => Promise<void> };
        shareAsync = Sharing.shareAsync ?? null;
      } catch { shareAsync = null; }
      if (shareAsync) await shareAsync(uri);
      const FS = await import("expo-file-system/legacy");
      await FS.deleteAsync(uri, { idempotent: true }).catch(() => {});
    } catch { /* keep */ }
  };

  return (
    <View style={styles.page}>
      <View ref={ref} collapsable={false} style={styles.card}>
        <View style={styles.band}>
          <Text style={styles.certTitle}>Certificate</Text>
          <Text style={styles.place}>{PLACE[cert?.rank ?? 0] ?? ""}</Text>
        </View>
        <Text style={styles.code}>{code}</Text>
        {!!cert?.piece_ref && <Text style={styles.ref}>{plain(cert.piece_ref)}</Text>}
        <Text style={styles.verify}>Verify at certificates/{code}</Text>
      </View>
      <Pressable onPress={() => void share()} accessibilityRole="button" accessibilityLabel="Share certificate" style={styles.share}>
        <Text style={styles.shareText}>Share</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FFF8EE", padding: 16, gap: 12 },
  card: { borderWidth: 6, borderColor: fill.maroon, borderRadius: 12, padding: 16, gap: 8, backgroundColor: "#FFF8EE" },
  band: { backgroundColor: fill.maroon, borderRadius: 8, padding: 12 },
  certTitle: { color: onFill.text, fontSize: 24, fontWeight: "800" },
  place: { color: onFill.gold, fontSize: 16, fontWeight: "700" },
  code: { color: color.ink, fontWeight: "700" },
  ref: { color: color.ink },
  verify: { color: color.inkSoft, fontSize: 12 },
  share: { minHeight: 48, alignItems: "center", justifyContent: "center", backgroundColor: color.ink, borderRadius: 12 },
  shareText: { color: onFill.text, fontWeight: "800" },
});
