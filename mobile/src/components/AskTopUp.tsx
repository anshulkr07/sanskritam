// "Watch a short ad to keep asking" (owner, 2026-11-06): shown when today's
// free questions are used up, only if the server says an ad can help (ads on
// for this account, a rewarded view left today, room in the shared budget).
// The extra allowance comes from Google's server-side confirmation.

import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { request } from "../api/client";
import { hasRewardedUnit, watchAskReward } from "../services/ads";
import { ADS_ENABLED } from "../services/adsState";
import { color } from "../theme";

export default function AskTopUp({ onGranted }: { onGranted: () => void }) {
  const [state, setState] = useState<"checking" | "ready" | "none" | "busy">("checking");
  const [message, setMessage] = useState("");
  useEffect(() => {
    let alive = true;
    if (!ADS_ENABLED || !hasRewardedUnit()) {
      setState("none");
      return;
    }
    request<{ available: boolean }>("/commerce/ads/ask-topup", {}, true)
      .then((r) => { if (alive) setState(r.available ? "ready" : "none"); })
      .catch(() => { if (alive) setState("none"); });
    return () => { alive = false; };
  }, []);
  if (state === "none" || state === "checking") return null;
  const watch = async () => {
    setState("busy"); setMessage("");
    try {
      const result = await watchAskReward();
      setMessage(result.message);
      setState("ready");
      if (result.granted) onGranted();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "The ad isn't available. Try later.");
      setState("ready");
    }
  };
  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => void watch()} disabled={state === "busy"} accessibilityRole="button"
        accessibilityLabel="Watch a short ad to keep asking today" style={[styles.button, state === "busy" && { opacity: 0.6 }]}>
        {state === "busy" ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Watch a short ad to keep asking</Text>}
      </Pressable>
      {!!message && <Text style={styles.message} accessibilityLiveRegion="polite">{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: "stretch", gap: 6, alignItems: "center" },
  button: { minHeight: 48, alignSelf: "stretch", paddingHorizontal: 16, backgroundColor: color.saffronBtn, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  message: { fontSize: 13, color: color.inkSoft, textAlign: "center" },
});
