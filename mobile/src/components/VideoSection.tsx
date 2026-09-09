// VideoSection (P24) — the lesson's watch-first block.
//
// A ranked list of lesson videos served as metadata from GET /videos. The
// app never downloads or re-hosts video: a tap opens the source page in an
// in-app browser (expo-web-browser, already a dependency), so playback runs
// in YouTube's own player — views and native ads accrue to the creator, and
// an owner disabling *embedding* cannot break us (that switch only gates
// iframe embeds, never the watch page).
//
// Rules this component obeys:
// - Watching writes nothing: no mastery, no XP, no review item. There is no
//   attempt endpoint for videos by design (YouTube Playback Integrity
//   forbids incentivised viewing), so this block never calls attemptStep.
// - A missing/failed catalogue hides the section, never the lesson: the
//   lesson must render correctly with its video missing (§5.5).
// - Upgrade path: swapping openBrowserAsync for an iframe player
//   (react-native-youtube-iframe) is contained to openVideo() below.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useState } from "react";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";

import type { VideoItem } from "../api/client";
import { color, font, radius, shadow, space } from "../theme";

function langLabel(lang: string): string {
  return lang === "hi" ? "Hindi" : "English";
}

async function openVideo(url: string): Promise<"ok" | "fallback" | "failed"> {
  try {
    await WebBrowser.openBrowserAsync(url);
    return "ok";
  } catch {
    try {
      await Linking.openURL(url);
      return "fallback";
    } catch {
      return "failed";
    }
  }
}

function VideoRow({ video }: { video: VideoItem }) {
  const [openFailed, setOpenFailed] = useState(false);
  const isEmbed = video.playback !== "link" && !!video.youtube_id;

  const onPress = useCallback(async () => {
    setOpenFailed(false);
    const result = await openVideo(video.url);
    if (result === "failed") setOpenFailed(true);
  }, [video.url]);

  const a11yLabel = isEmbed
    ? `Watch on YouTube: ${video.title}, by ${video.channel}, in ${langLabel(video.lang)}`
    : `Open link: ${video.title}, by ${video.channel}`;

  return (
    <View style={styles.rowWrap}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
      >
        {isEmbed && video.youtube_id ? (
          <View style={styles.thumbWrap}>
            <Image
              source={{ uri: `https://i.ytimg.com/vi/${video.youtube_id}/hqdefault.jpg` }}
              style={styles.thumb}
              accessibilityIgnoresInvertColors
            />
            <View style={styles.playBadge}>
              <Ionicons name="play" size={18} color={color.white} />
            </View>
          </View>
        ) : (
          <View style={[styles.thumbWrap, styles.linkThumb]}>
            <Ionicons name="open-outline" size={22} color={color.saffron} />
          </View>
        )}
        <View style={styles.rowText}>
          <Text style={styles.rowTitle} numberOfLines={2}>
            {video.title}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {video.channel} · {langLabel(video.lang)}
            {isEmbed ? "" : " · opens a link"}
          </Text>
          <Text style={styles.rowCredit} numberOfLines={1}>
            {isEmbed ? "Plays on YouTube — views support the creator" : video.url.replace(/^https?:\/\//, "").split("/")[0]}
          </Text>
        </View>
        <Ionicons name="logo-youtube" size={20} color={color.inkFaint} />
      </Pressable>
      {openFailed && (
        <Text style={styles.openFailed} accessibilityRole="text">
          Couldn't open that video — check your connection and try again.
        </Text>
      )}
    </View>
  );
}

export default function VideoSection({ videos }: { videos: VideoItem[] }) {
  if (!videos.length) return null;
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`${videos.length} lesson ${videos.length === 1 ? "video" : "videos"}`}
    >
      <View style={styles.header}>
        <Ionicons name="play-circle" size={18} color={color.saffron} />
        <Text style={styles.heading}>Watch first</Text>
        <Text style={styles.count}>
          {videos.length} {videos.length === 1 ? "video" : "videos"}
        </Text>
      </View>
      {videos.map((v) => (
        <VideoRow key={v.id} video={v} />
      ))}
      <Text style={styles.tosNote}>Videos play on YouTube, under YouTube's Terms of Service.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.md,
    marginBottom: space.md,
    ...shadow.card,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: space.sm },
  heading: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: font.sizes.base,
    color: color.ink,
    flex: 1,
  },
  count: {
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    fontSize: font.sizes.xs,
    color: color.inkSoft,
  },
  rowWrap: { marginBottom: space.sm },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 64 },
  rowPressed: { opacity: 0.7 },
  thumbWrap: {
    width: 96,
    height: 56,
    borderRadius: radius.sm,
    overflow: "hidden",
    backgroundColor: color.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  linkThumb: { borderWidth: 1, borderColor: color.border },
  thumb: { width: "100%", height: "100%" },
  playBadge: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1 },
  rowTitle: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.sm,
    color: color.ink,
    lineHeight: 19,
  },
  rowMeta: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.xs,
    color: color.inkSoft,
    marginTop: 2,
  },
  rowCredit: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.xs,
    color: color.inkFaint,
    marginTop: 1,
  },
  openFailed: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.xs,
    color: color.inkSoft,
    marginTop: 4,
  },
  tosNote: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.xs,
    color: color.inkFaint,
    marginTop: 2,
    lineHeight: 16,
  },
});
