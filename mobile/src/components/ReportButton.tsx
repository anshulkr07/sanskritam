// ReportButton — flag AI-generated content without leaving the app.
//
// Google Play's AI-Generated Content policy requires in-app reporting for
// chatbots. A small flag sits at the end of a reply's tab row; tapping it
// swaps the row for one confirm line, and reporting shows "Reported" for two
// seconds. Shared by Talk replies, Ask answers and the two daily cards
// (the word journey and Do you know), which a model also writes.

import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";

import { api } from "../api/client";
import { haptics } from "../services/haptics";
import { color, font } from "../theme";

export default function ReportButton({
  surface,
  question,
  answer,
  noun = "reply",
}: {
  surface: "talk" | "ask" | "fact" | "word" | "voice-lab";
  question: string;
  answer: string;
  /** What is being reported, for the wording: "reply" or "card". */
  noun?: string;
}) {
  const [phase, setPhase] = useState<"idle" | "confirm" | "sent">("idle");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  if (phase === "sent") {
    return (
      <View style={styles.sentRow} accessibilityRole="text" accessibilityLabel="Reported">
        <Ionicons name="checkmark" size={14} color={color.okText} />
        <Text style={styles.sent}>Reported</Text>
      </View>
    );
  }

  if (phase === "confirm") {
    return (
      <View style={styles.confirmRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.confirmText}>{`Report this ${noun}?`}</Text>
          <TextInput value={reason} onChangeText={setReason} maxLength={1000} placeholder="Reason (optional)" accessibilityLabel="Report reason" style={{ color: color.ink, minHeight: 40 }} />
          {!!error && <Text accessibilityRole="alert" style={{ color: color.badText }}>{error}</Text>}
        </View>
        <Pressable
          disabled={sending}
          onPress={async () => {
            if (sending) return;
            haptics.tap(); setSending(true); setError("");
            try {
              await api.reportContent({ surface, question, answer, reason });
              setPhase("sent"); setReason("");
              timer.current = setTimeout(() => setPhase("idle"), 3000);
            } catch {
              setError("Report was not sent. Check your connection and retry, or contact sanskritam@vedicvalor.com.");
            } finally { setSending(false); }
          }}
          style={styles.report}
          accessibilityRole="button"
          accessibilityLabel={`Report this ${noun}`}
          hitSlop={8}
        >
          <Text style={styles.reportText}>{sending ? "Sending…" : "Report"}</Text>
        </Pressable>
        <Pressable
          disabled={sending}
          onPress={() => { setPhase("idle"); setError(""); }}
          style={styles.cancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel reporting"
          hitSlop={8}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        setPhase("confirm");
      }}
      style={styles.flag}
      accessibilityRole="button"
      accessibilityLabel={`Report this ${noun}`}
      hitSlop={6}
    >
      <Ionicons name="flag-outline" size={16} color={color.inkFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flag: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 32,
  },
  confirmText: {
    flex: 1,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
  },
  report: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  reportText: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.sm,
    color: color.badText,
  },
  cancel: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
  },
  sentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 32,
  },
  sent: {
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    fontSize: font.sizes.sm,
    color: color.okText,
  },
});
