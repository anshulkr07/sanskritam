// VideoSection (P24) — the lesson's watch-first block, played IN-APP.
//
// Embed rows mount YouTube's official IFrame player *inside* the app
// (react-native-youtube-iframe over react-native-webview), so a tap never
// leaves for the YouTube app or an external browser: playback, views and
// native ads all accrue to the creator through YouTube's own player, under
// YouTube's Terms of Service.
//
// Rules this component obeys:
// - Watching writes nothing: no mastery, no XP, no review item. There is no
//   attempt endpoint for videos by design (YouTube Playback Integrity
//   forbids incentivised viewing), so this block never calls attemptStep.
// - A missing/failed catalogue hides the section, never the lesson: the
//   lesson must render correctly with its video missing (§5.5).
// - One player at a time: rows are thumbnail facades until tapped; only the
//   active row mounts a WebView player. Mounting every embed at once (U1
//   carries six) would burn memory and push the steps far down the page.
// - Not too much, not too little: the first INITIAL_LIMIT rows show, the
//   rest sit behind a "Show all N videos" expander. Every unit ships at
//   least one video, so the section never renders empty when given rows.
// - Never leave the app: link-out rows (playlists, course pages — nothing
//   an iframe can play) open in the in-app browser (expo-web-browser's
//   Custom Tab / Safari sheet), never via Linking.openURL, which is exactly
//   what hands YouTube links to the YouTube app. An embed that errors
//   (e.g. the owner disabled embedding — that switch gates iframes only)
//   falls back to the same in-app browser, never to an external app.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import React, { useCallback, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import * as WebBrowser from "expo-web-browser";
import YoutubePlayer from "react-native-youtube-iframe";

import type { VideoItem } from "../api/client";
import { color, font, radius, shadow, space } from "../theme";

// How many rows show before the expander. U1's seven videos stay one tap
// away without burying the steps; single-video units render unchanged.
const INITIAL_LIMIT = 3;

function langLabel(lang: string): string {
  return lang === "hi" ? "Hindi" : "English";
}

// Link-out rows (playlists, course pages) have no single video to embed,
// so they open in the modal in-app browser. Deliberately NOT Linking:
// Linking.openURL fires a VIEW intent that Android hands to the YouTube
// app — the exact bounce this screen exists to avoid. A failure shows
// inline text instead of leaving the app.
async function openInApp(url: string): Promise<boolean> {
  try {
    // createTask false: open on top of the app, not through the transparent
    // proxy activity that left the app dead to touch after a hardware back.
    await WebBrowser.openBrowserAsync(url, { createTask: false });
    return true;
  } catch {
    return false;
  }
}

function Thumb({ youtubeId }: { youtubeId: string }) {
  return (
    <View style={styles.thumbWrap}>
      <Image
        source={{ uri: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` }}
        style={styles.thumb}
        accessibilityIgnoresInvertColors
      />
      <View style={styles.playBadge}>
        <Ionicons name="play" size={18} color={color.white} />
      </View>
    </View>
  );
}

interface EmbedRowProps {
  video: VideoItem;
  active: boolean;
  playing: boolean;
  playerHeight: number;
  onActivate: (id: string) => void;
  onDeactivate: () => void;
  onPlayingChange: (playing: boolean) => void;
}

function EmbedRow({
  video,
  active,
  playing,
  playerHeight,
  onActivate,
  onDeactivate,
  onPlayingChange,
}: EmbedRowProps) {
  const [errored, setErrored] = useState(false);
  const [browserFailed, setBrowserFailed] = useState(false);

  const onStateChange = useCallback(
    (state: string) => {
      if (state === "playing") onPlayingChange(true);
      else if (state === "paused" || state === "ended") onPlayingChange(false);
    },
    [onPlayingChange],
  );

  // The owner disabled embedding, or the player failed another way: the
  // watch page still works, so offer it in the in-app browser (§5.5:
  // a broken embed hides the player, never the lesson).
  const onPlayerError = useCallback(() => setErrored(true), []);

  const onFallbackPress = useCallback(async () => {
    setBrowserFailed(false);
    const ok = await openInApp(video.url);
    if (!ok) setBrowserFailed(true);
  }, [video.url]);

  const onFacadePress = useCallback(() => onActivate(video.id), [onActivate, video.id]);

  return (
    <View style={styles.rowWrap}>
      {active && !errored && video.youtube_id ? (
        <View
          accessible
          accessibilityLabel={`Now playing in the app: ${video.title}, by ${video.channel}`}
        >
          <View style={[styles.playerWrap, { height: playerHeight }]}>
            <YoutubePlayer
              height={playerHeight}
              videoId={video.youtube_id}
              play={playing}
              onChangeState={onStateChange}
              onError={onPlayerError}
              initialPlayerParams={{ rel: false, playsinline: 1 }}
              webViewProps={{
                allowsFullscreenVideo: true,
                allowsInlineMediaPlayback: true,
              }}
            />
          </View>
          <View style={styles.activeMeta}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle} numberOfLines={2}>
                {video.title}
              </Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {video.channel} · {langLabel(video.lang)} · playing in the app
              </Text>
            </View>
            <Pressable
              onPress={onDeactivate}
              style={styles.collapseBtn}
              accessibilityRole="button"
              accessibilityLabel={`Close the player for ${video.title}`}
            >
              <Ionicons name="chevron-up" size={20} color={color.inkSoft} />
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={errored ? onFallbackPress : onFacadePress}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          accessibilityRole="button"
          accessibilityLabel={
            errored
              ? `Watch on YouTube in the in-app browser: ${video.title}, by ${video.channel}`
              : `Play in the app: ${video.title}, by ${video.channel}, in ${langLabel(video.lang)}`
          }
        >
          {video.youtube_id && !errored ? (
            <Thumb youtubeId={video.youtube_id} />
          ) : (
            <View style={[styles.thumbWrap, styles.linkThumb]}>
              <Ionicons name="logo-youtube" size={22} color={color.saffron} />
            </View>
          )}
          <View style={styles.rowText}>
            <Text style={styles.rowTitle} numberOfLines={2}>
              {video.title}
            </Text>
            <Text style={styles.rowMeta} numberOfLines={1}>
              {video.channel} · {langLabel(video.lang)}
            </Text>
            <Text style={styles.rowCredit} numberOfLines={1}>
              {errored ? "Tap to open" : "Tap to play"}
            </Text>
          </View>
          <Ionicons
            name={errored ? "open-outline" : "play-circle-outline"}
            size={20}
            color={color.inkFaint}
          />
        </Pressable>
      )}
      {browserFailed && (
        <Text style={styles.openFailed} accessibilityRole="text">
          Couldn't open that video. Check your connection.
        </Text>
      )}
    </View>
  );
}

function LinkRow({ video }: { video: VideoItem }) {
  const [openFailed, setOpenFailed] = useState(false);

  const onPress = useCallback(async () => {
    setOpenFailed(false);
    const ok = await openInApp(video.url);
    if (!ok) setOpenFailed(true);
  }, [video.url]);

  return (
    <View style={styles.rowWrap}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Open in the in-app browser: ${video.title}, by ${video.channel}`}
      >
        <View style={[styles.thumbWrap, styles.linkThumb]}>
          <Ionicons name="open-outline" size={22} color={color.saffron} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle} numberOfLines={2}>
            {video.title}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {video.channel} · {langLabel(video.lang)}
          </Text>
          <Text style={styles.rowCredit} numberOfLines={1}>
            Opens here in the app · {video.url.replace(/^https?:\/\//, "").split("/")[0]}
          </Text>
        </View>
        <Ionicons name="open-outline" size={20} color={color.inkFaint} />
      </Pressable>
      {openFailed && (
        <Text style={styles.openFailed} accessibilityRole="text">
          Couldn't open that link. Check your connection.
        </Text>
      )}
    </View>
  );
}

export default function VideoSection({ videos }: { videos: VideoItem[] }) {
  const { width } = useWindowDimensions();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const onActivate = useCallback((id: string) => {
    setActiveId(id);
    setPlaying(true);
  }, []);
  const onDeactivate = useCallback(() => {
    setActiveId(null);
    setPlaying(false);
  }, []);

  if (!videos.length) return null;

  // 16:9 inside the Lesson body padding (space.lg) and this card's
  // padding (space.md) on each side.
  const playerHeight = Math.round(((width - 2 * space.lg - 2 * space.md) * 9) / 16);
  const visible = expanded || videos.length <= INITIAL_LIMIT ? videos : videos.slice(0, INITIAL_LIMIT);

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`${videos.length} lesson ${videos.length === 1 ? "video" : "videos"}, played in the app`}
    >
      <View style={styles.header}>
        <Ionicons name="play-circle" size={18} color={color.saffron} />
        <Text style={styles.heading}>Watch first</Text>
        <Text style={styles.count}>
          {videos.length} {videos.length === 1 ? "video" : "videos"}
        </Text>
      </View>
      {visible.map((v) =>
        v.playback !== "link" && v.youtube_id ? (
          <EmbedRow
            key={v.id}
            video={v}
            active={activeId === v.id}
            playing={activeId === v.id && playing}
            playerHeight={playerHeight}
            onActivate={onActivate}
            onDeactivate={onDeactivate}
            onPlayingChange={setPlaying}
          />
        ) : (
          <LinkRow key={v.id} video={v} />
        ),
      )}
      {videos.length > INITIAL_LIMIT && (
        <Pressable
          onPress={() => setExpanded((e) => !e)}
          style={styles.expander}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={expanded ? "Show fewer videos" : `Show all ${videos.length} videos`}
        >
          <Text style={styles.expanderText}>
            {expanded ? "Show fewer" : `Show all ${videos.length} videos`}
          </Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={color.saffron}
          />
        </Pressable>
      )}
      <Text style={styles.tosNote}>
        Videos play in YouTube's player.
      </Text>
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
  playerWrap: {
    borderRadius: radius.sm,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  activeMeta: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.xs },
  collapseBtn: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  expander: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 44,
  },
  expanderText: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.sm,
    color: color.saffron,
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
