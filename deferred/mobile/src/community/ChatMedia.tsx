import Modal from "../components/AudioModal";
import { useIsFocused } from "@react-navigation/native";
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  StyleSheet,
  Platform,
  AppState,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayerStatus,
} from "expo-audio";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { post, uploadMedia, Message, clientId, friendly, NEEDS_CARD } from "./api";
import { useCommunity } from "./CommunityProvider";
import { CREAM, CREAM_FAINT, CREAM_SOFT, T, ui } from "./look";
import { IconBtn } from "./parts";
import { cachedMedia, removeCachedMedia } from "./mediaCache";
import { settledRecordingUri } from "../utils/recording";
import { createManagedAudioPlayer } from "../services/managedAudio";
export function ExpiredMediaPlaceholder({ kind, own = false }: { kind: string; own?: boolean }) {
  return (
    <View style={[s.expired, own && { borderColor: CREAM_FAINT }]}>
      <Ionicons
        name={kind === "image" ? "image-outline" : "mic-outline"}
        size={16}
        color={own ? CREAM_SOFT : T.ink3}
      />
      <Text style={[s.expiredText, own && { color: CREAM_SOFT }]}>
        {kind === "image" ? "Photo" : "Voice note"} gone · kept for 48 hours
      </Text>
    </View>
  );
}
/** "Disappears in 31 h" / "in 40 min", for the line under a photo or note. */
function leftOf(expires: string | null) {
  const ms = expires ? Date.parse(expires) - Date.now() : 0;
  if (!(ms > 0)) return "";
  const h = Math.floor(ms / 3_600_000);
  return h >= 1
    ? `Disappears in ${h} h`
    : `Disappears in ${Math.max(1, Math.round(ms / 60000))} min`;
}
export function EphemeralMedia({
  message,
  own = false,
}: {
  message: Message;
  /** On your own (deep) bubble: cream controls. */
  own?: boolean;
}) {
  const [url, setUrl] = useState(""),
    [expired, setExpired] = useState(false),
    [failure, setFailure] = useState(""),
    [zoom, setZoom] = useState(false),
    [attempt, setAttempt] = useState(0);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    let alive = true;
    setUrl("");
    setExpired(false);
    setFailure("");
    const remaining = message.expires_at
      ? new Date(message.expires_at).getTime() - Date.now()
      : 0;
    if (remaining <= 0) {
      setExpired(true);
      void removeCachedMedia(message).catch(() => {});
      return;
    }
    const timer = setTimeout(() => {
      setExpired(true);
      setUrl("");
      setZoom(false);
      void removeCachedMedia(message).catch(() => {});
    }, remaining);
    void cachedMedia(message)
      .then((uri) => {
        if (alive) setUrl(uri);
      })
      .catch((e) => {
        if (!alive) return;
        if (e.status === 404 || e.status === 410 || e.message === "expired")
          setExpired(true);
        else setFailure("Could not load the attachment.");
      });
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [message.id, message.expires_at, attempt]);
  if (expired) return <ExpiredMediaPlaceholder kind={message.kind} own={own} />;
  const ink = own ? CREAM : T.ink;
  if (failure)
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => setAttempt((v) => v + 1)}
        style={[s.loading, own && s.loadingOwn]}
      >
        <Ionicons name="refresh" size={16} color={ink} />
        <Text style={[s.loadingText, { color: ink }]}>
          {failure} Tap to try again.
        </Text>
      </Pressable>
    );
  if (!url)
    return (
      <View style={[s.loading, own && s.loadingOwn]}>
        <ActivityIndicator size="small" color={ink} />
        <Text style={[s.loadingText, { color: ink }]}>
          Loading the {message.kind === "image" ? "photo" : "voice note"}…
        </Text>
      </View>
    );
  return (
    <View style={{ gap: 4 }}>
      {message.kind === "image" ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open the photo"
            onPress={() => setZoom(true)}
          >
            <Image
              source={{ uri: url }}
              style={s.image}
              resizeMode="cover"
              onError={() => setExpired(true)}
            />
          </Pressable>
          <Modal
            visible={zoom}
            transparent
            animationType="fade"
            onRequestClose={() => setZoom(false)}
            statusBarTranslucent
          >
            <View
              style={[
                s.lightbox,
                { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 },
              ]}
            >
              <View style={s.lightboxTop}>
                <IconBtn
                  icon="close"
                  label="Close the photo"
                  color={CREAM}
                  onPress={() => setZoom(false)}
                />
              </View>
              <Image
                source={{ uri: url }}
                style={{ flex: 1, width: "100%" }}
                resizeMode="contain"
                onError={() => setExpired(true)}
              />
            </View>
          </Modal>
        </>
      ) : (
        <VoicePlayback url={url} own={own} onError={() => setExpired(true)} />
      )}
      <Text style={[s.expiry, own && { color: CREAM_SOFT }]}>
        {leftOf(message.expires_at)}
      </Text>
    </View>
  );
}
function VoicePlayback({
  url,
  own,
  onError,
}: {
  url: string;
  own: boolean;
  onError: () => void;
}) {
  const player = useMemo(
      () => createManagedAudioPlayer(url, undefined, "Voice note"),
      [url],
    ),
    status = useAudioPlayerStatus(player),
    [speed, setSpeed] = useState(1);
  useEffect(() => () => player.remove(), [player]);
  useEffect(() => {
    if (status.error) onError();
  }, [status, onError]);
  const ink = own ? CREAM : T.ink;
  const pct = status.duration
    ? Math.min(100, (status.currentTime / status.duration) * 100)
    : 0;
  return (
    <View style={s.voice}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          status.playing ? "Pause the voice note" : "Play the voice note"
        }
        onPress={() => {
          if (status.playing) player.pause();
          else {
            if (status.didJustFinish) void player.seekTo(0);
            player.play();
          }
        }}
        style={[
          s.play,
          { backgroundColor: own ? CREAM : T.action },
        ]}
      >
        <Ionicons
          name={status.playing ? "pause" : "play"}
          size={20}
          color={own ? T.ink : T.white}
        />
      </Pressable>
      <View style={{ flex: 1, minWidth: 80, gap: 6 }}>
        <View style={[s.track, own && { backgroundColor: CREAM_FAINT }]}>
          <View
            style={[
              s.progress,
              { width: `${pct}%`, backgroundColor: own ? CREAM : T.action },
            ]}
          />
        </View>
        <Text style={[s.clock, { color: own ? CREAM_SOFT : T.ink3 }]}>
          {clock(status.currentTime)} / {clock(status.duration)}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Playback speed ${speed} times. Change it`}
        onPress={() => {
          const n = speed === 1 ? 1.5 : 1;
          setSpeed(n);
          player.setPlaybackRate(n);
        }}
        style={[s.speed, { borderColor: own ? CREAM_FAINT : T.lineStrong }]}
      >
        <Text style={[s.speedText, { color: ink }]}>{speed}×</Text>
      </Pressable>
    </View>
  );
}
function clock(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
}
export function Composer({
  cid,
  reply,
  clearReply,
  onSent,
  onNeedsCard,
}: {
  cid: string;
  reply: Message | null;
  clearReply: () => void;
  onSent: () => void;
  /** The server asked for a learner card first. */
  onNeedsCard?: () => void;
}) {
  const { active, setRecordingNote } = useCommunity();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused(),
    focusedRef = useRef(focused);
  focusedRef.current = focused;
  const [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [recording, setRecording] = useState(false);
  const webMime =
    typeof MediaRecorder !== "undefined" &&
    MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/mp4";
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    numberOfChannels: 1,
    sampleRate: 24000,
    bitRate: 32000,
    ios: { ...RecordingPresets.HIGH_QUALITY.ios, audioQuality: 32 },
    web: { mimeType: webMime, bitsPerSecond: 32000 },
  });
  const rs = useAudioRecorderState(recorder, 200);
  const recordingRef = useRef(false),
    starting = useRef(false),
    mounted = useRef(true),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    retryId = useRef(clientId());
  const stop = async () => {
    if (timer.current) clearTimeout(timer.current);
    recordingRef.current = false;
    setRecording(false);
    try {
      await recorder.stop();
    } finally {
      setRecordingNote(false);
      await setAudioModeAsync({ allowsRecording: false });
    }
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      setRecordingNote(false);
      if (timer.current) clearTimeout(timer.current);
      if (recordingRef.current) {
        recordingRef.current = false;
        void recorder
          .stop()
          .finally(() => setAudioModeAsync({ allowsRecording: false }))
          .catch(() => {});
      }
    };
  }, [recorder]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active" && recordingRef.current)
        void stop().catch(() => {});
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!focused && recordingRef.current) void stop().catch(() => {});
  }, [focused]);
  const run = (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    void fn()
      .catch((e) => {
        if (!mounted.current) return;
        if (e?.status === NEEDS_CARD && onNeedsCard) onNeedsCard();
        else setError(friendly(e, "Could not send. Try again."));
      })
      .finally(() => {
        if (mounted.current) setBusy(false);
      });
  };
  const send = async (media_id?: string) => {
    await post(`/conversations/${cid}/messages`, {
      client_id: retryId.current,
      content: text,
      media_id,
      reply_to: reply?.id,
    });
    retryId.current = clientId();
    setText("");
    clearReply();
    onSent();
  };
  const photo = () =>
    run(async () => {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
      });
      if (picked.canceled) return;
      const asset = picked.assets[0];
      const scale = Math.min(1, 1280 / Math.max(asset.width, asset.height));
      let uri = "",
        mime = "image/webp";
      for (const quality of [0.75, 0.55, 0.35, 0.2]) {
        const ctx = ImageManipulator.manipulate(asset.uri);
        const factor =
          quality === 0.75
            ? 1
            : quality === 0.55
              ? 0.85
              : quality === 0.35
                ? 0.7
                : 0.55;
        ctx.resize({
          width: Math.max(1, Math.round(asset.width * scale * factor)),
          height: Math.max(1, Math.round(asset.height * scale * factor)),
        });
        const image = await ctx.renderAsync();
        let out;
        try {
          out = await image.saveAsync({
            format: SaveFormat.WEBP,
            compress: quality,
          });
        } catch {
          mime = "image/jpeg";
          out = await image.saveAsync({
            format: SaveFormat.JPEG,
            compress: quality,
          });
        }
        uri = out.uri;
        const size =
          Platform.OS === "web"
            ? (await (await fetch(uri)).blob()).size
            : await import("expo-file-system/legacy").then(async (fs) => {
                const info = await fs.getInfoAsync(uri);
                return info.exists ? info.size : 0;
              });
        if (size <= 153600 && size > 0) break;
        if (quality === 0.2)
          throw Error("This photo is still too large. Crop it and try again.");
      }
      const attachment = await uploadMedia(cid, uri, mime);
      await send(attachment.id);
    });
  const start = () =>
    run(async () => {
      if (active)
        throw Error("Leave the live call before recording a voice note.");
      starting.current = true;
      setRecordingNote(true);
      try {
        const permission = await requestRecordingPermissionsAsync();
        if (!permission.granted)
          throw Error("Allow the microphone to record a voice note.");
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
        await recorder.prepareToRecordAsync();
        if (!mounted.current || !focusedRef.current) {
          await recorder.stop().catch(() => {});
          await setAudioModeAsync({ allowsRecording: false });
          return;
        }
        recorder.record();
        recordingRef.current = true;
        setRecording(true);
        timer.current = setTimeout(() => {
          if (recordingRef.current)
            void stop()
              .then(() =>
                setError(
                  "Two minutes is the limit. Send the note or record again.",
                ),
              )
              .catch(() => {});
        }, 120000);
      } finally {
        starting.current = false;
        if (!recordingRef.current) setRecordingNote(false);
      }
    });
  const [hasNote, setHasNote] = useState(false);
  useEffect(() => {
    if (recording) setHasNote(true);
  }, [recording]);
  const sendNote = () =>
    run(async () => {
      const duration = Math.min(
        120,
        Math.max(1, Math.ceil(rs.durationMillis / 1000)),
      );
      if (recordingRef.current) await stop();
      const uri = await settledRecordingUri(recorder);
      if (!uri) throw Error("No recording found. Record again.");
      const attachment = await uploadMedia(
        cid,
        uri,
        Platform.OS === "web" ? webMime : "audio/mp4",
        duration,
      );
      await send(attachment.id);
      setHasNote(false);
    });
  return (
    <View
      style={[s.composer, { paddingBottom: Math.max(insets.bottom, 8) + 4 }]}
    >
      {reply && (
        <View style={s.reply}>
          <Ionicons name="return-up-back" size={18} color={T.action} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.replyName} numberOfLines={1}>
              Replying to {reply.sender.name}
            </Text>
            <Text numberOfLines={1} style={s.replyText}>
              {reply.content ||
                (reply.kind === "image"
                  ? "Photo"
                  : reply.kind === "audio"
                    ? "Voice note"
                    : "Message")}
            </Text>
          </View>
          <IconBtn
            icon="close"
            label="Cancel the reply"
            size={40}
            color={T.ink2}
            onPress={clearReply}
          />
        </View>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      {hasNote ? (
        <View style={s.row}>
          <View style={s.recording}>
            <View
              style={[s.recDot, !recording && { backgroundColor: T.ink3 }]}
            />
            <Text style={s.recText}>
              {recording ? "Recording" : "Voice note ready"} ·{" "}
              {clock(rs.durationMillis / 1000)} / 2:00
            </Text>
          </View>
          <IconBtn
            icon="trash-outline"
            label="Discard the voice note"
            color={T.ink2}
            disabled={busy}
            onPress={() =>
              run(async () => {
                if (recordingRef.current) await stop();
                setHasNote(false);
              })
            }
          />
          <IconBtn
            icon={busy ? "hourglass-outline" : "send"}
            label="Send the voice note"
            filled
            disabled={busy}
            onPress={sendNote}
          />
        </View>
      ) : (
        <View style={s.row}>
          <IconBtn
            icon="image-outline"
            label="Send a photo"
            color={T.ink2}
            disabled={busy}
            onPress={photo}
          />
          <TextInput
            value={text}
            onChangeText={(v) => {
              setText(v);
              retryId.current = clientId();
            }}
            accessibilityLabel="Message"
            placeholder="Write in Sanskrit or any language"
            placeholderTextColor={T.ink3}
            multiline
            maxLength={4000}
            editable={!busy}
            style={s.input}
          />
          {text.trim() ? (
            <IconBtn
              icon={busy ? "hourglass-outline" : "send"}
              label="Send"
              filled
              disabled={busy}
              onPress={() => run(() => send())}
            />
          ) : (
            <IconBtn
              icon="mic-outline"
              label="Record a voice note"
              color={T.ink2}
              disabled={busy || !!active}
              onPress={start}
            />
          )}
        </View>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  composer: {
    paddingHorizontal: 8,
    paddingTop: 8,
    backgroundColor: T.paper,
    borderTopWidth: 1,
    borderColor: T.line,
    gap: 8,
  },
  input: {
    ...ui("regular"),
    flex: 1,
    minHeight: 44,
    maxHeight: 132,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.lineStrong,
    fontSize: 16.5,
    lineHeight: 24,
    color: T.ink,
  },
  reply: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 10,
    borderLeftWidth: 3,
    borderColor: T.action,
    backgroundColor: T.surface,
  },
  replyName: { ...ui("semibold"), fontSize: 13.5, color: T.ink },
  replyText: { ...ui("regular"), fontSize: 13.5, color: T.ink2 },
  error: {
    ...ui("medium"),
    color: T.wrongInk,
    fontSize: 13.5,
    lineHeight: 19,
    paddingHorizontal: 6,
  },
  recording: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.lineStrong,
  },
  recDot: { width: 10, height: 10, backgroundColor: T.wrong },
  recText: {
    ...ui("medium"),
    fontSize: 14.5,
    color: T.ink,
    fontVariant: ["tabular-nums"],
  },
  image: { width: 232, height: 186, backgroundColor: T.line },
  expired: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: T.lineStrong,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  expiredText: { ...ui("regular"), fontSize: 13, color: T.ink3 },
  loading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: T.line,
  },
  loadingOwn: { borderColor: CREAM_FAINT },
  loadingText: { ...ui("regular"), fontSize: 13.5 },
  expiry: { ...ui("regular"), fontSize: 11.5, color: T.ink3 },
  voice: { flexDirection: "row", alignItems: "center", gap: 10, minWidth: 210 },
  play: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  track: { height: 4, backgroundColor: T.line, overflow: "hidden" },
  progress: { height: 4 },
  clock: { ...ui("regular"), fontSize: 12, fontVariant: ["tabular-nums"] },
  speed: {
    minWidth: 40,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  speedText: { ...ui("semibold"), fontSize: 13 },
  lightbox: {
    flex: 1,
    backgroundColor: "#17120F",
    paddingHorizontal: 12,
    gap: 8,
  },
  lightboxTop: { flexDirection: "row", justifyContent: "flex-end" },
});
