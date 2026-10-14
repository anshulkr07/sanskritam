import { useIsFocused } from "@react-navigation/native";
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Platform,
  AppState,
} from "react-native";
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { get, post, uploadMedia, Message, clientId } from "./api";
import { Action, useCommunity } from "./CommunityProvider";
import { color } from "../theme";
import { cachedMedia, removeCachedMedia } from "./mediaCache";
import { settledRecordingUri } from "../utils/recording";
export function ExpiredMediaPlaceholder({ kind }: { kind: string }) {
  return (
    <View style={s.expired}>
      <Text style={s.note}>
        {kind === "image" ? "Photo" : "Voice note"} expired · Kept for 48h
      </Text>
    </View>
  );
}
export function EphemeralMedia({ message }: { message: Message }) {
  const [url, setUrl] = useState(""),
    [expired, setExpired] = useState(false),
    [failure, setFailure] = useState(""),
    [zoom, setZoom] = useState(false),
    [attempt, setAttempt] = useState(0);
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
        else setFailure("Could not load attachment.");
      });
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [message.id, message.expires_at, attempt]);
  if (expired) return <ExpiredMediaPlaceholder kind={message.kind} />;
  if (failure)
    return (
      <View>
        <Text style={s.note}>{failure}</Text>
        <Action
          label="Retry attachment"
          onPress={() => setAttempt((v) => v + 1)}
        />
      </View>
    );
  if (!url) return <Text style={s.note}>Loading attachment…</Text>;
  return (
    <View style={{ gap: 6 }}>
      {message.kind === "image" ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enlarge photo"
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
            onRequestClose={() => setZoom(false)}
          >
            <View style={s.lightbox}>
              <Action label="Close photo" onPress={() => setZoom(false)} />
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
        <VoicePlayback url={url} onError={() => setExpired(true)} />
      )}
      <Text style={s.note}>48h · Auto-deleting attachment</Text>
    </View>
  );
}
function VoicePlayback({ url, onError }: { url: string; onError: () => void }) {
  const player = useAudioPlayer(url),
    status = useAudioPlayerStatus(player),
    [speed, setSpeed] = useState(1);
  useEffect(() => {
    if (status.error) onError();
  }, [status, onError]);
  return (
    <View style={s.row}>
      <Action
        label={status.playing ? "Pause" : "Play voice note"}
        onPress={() => {
          if (status.playing) player.pause();
          else {
            if (status.didJustFinish) void player.seekTo(0);
            player.play();
          }
        }}
      />
      <View style={{ flex: 1, minWidth: 45 }}>
        <View style={s.track}>
          <View
            style={[
              s.progress,
              {
                width: `${status.duration ? Math.min(100, (status.currentTime / status.duration) * 100) : 0}%`,
              },
            ]}
          />
        </View>
        <Text style={s.note}>
          {clock(status.currentTime)} / {clock(status.duration)}
        </Text>
      </View>
      <Action
        label={`${speed}×`}
        onPress={() => {
          const n = speed === 1 ? 1.5 : 1;
          setSpeed(n);
          player.setPlaybackRate(n);
        }}
      />
    </View>
  );
}
function clock(sec: number) {
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
}
export function Composer({
  cid,
  reply,
  clearReply,
  onSent,
}: {
  cid: string;
  reply: Message | null;
  clearReply: () => void;
  onSent: () => void;
}) {
  const { active, setRecordingNote } = useCommunity();
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
        if (mounted.current)
          setError(e.message || "Could not send. Try again.");
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
          throw Error("Microphone permission is needed for a voice note.");
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
                  "Two-minute limit reached. Tap Send note to share it.",
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
    <View style={s.composer}>
      {reply && (
        <View style={s.reply}>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>Reply to {reply.sender.name}</Text>
            <Text numberOfLines={1} style={s.note}>
              {reply.content || reply.kind}
            </Text>
          </View>
          <Action label="Cancel reply" onPress={clearReply} />
        </View>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      {hasNote ? (
        <View style={s.row}>
          <Text style={[s.note, { flex: 1 }]}>
            {recording ? "● Recording" : "Voice note ready"}{" "}
            {clock(rs.durationMillis / 1000)} / 2:00
          </Text>
          <Action
            label="Cancel"
            disabled={busy}
            onPress={() =>
              run(async () => {
                if (recordingRef.current) await stop();
                setHasNote(false);
              })
            }
          />
          <Action
            primary
            label="Send note"
            disabled={busy}
            onPress={sendNote}
          />
        </View>
      ) : (
        <View style={s.row}>
          <Action label="Photo" disabled={busy} onPress={photo} />
          <TextInput
            value={text}
            onChangeText={(v) => {
              setText(v);
              retryId.current = clientId();
            }}
            accessibilityLabel="Message in Sanskrit or any language"
            placeholder="नमस्ते…"
            multiline
            maxLength={4000}
            editable={!busy}
            style={s.input}
          />
          {text.trim() ? (
            <Action
              primary
              label={busy ? "Sending…" : "Send"}
              disabled={busy}
              onPress={() => run(() => send())}
            />
          ) : (
            <Action label="Mic" disabled={busy || !!active} onPress={start} />
          )}
        </View>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  composer: {
    padding: 12,
    backgroundColor: color.bg,
    borderTopWidth: 1,
    borderColor: color.border,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    padding: 12,
    borderRadius: 14,
    backgroundColor: color.surface,
    fontSize: 17,
    color: color.ink,
  },
  reply: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderLeftWidth: 3,
    borderColor: color.saffron,
    padding: 8,
    backgroundColor: color.surfaceMuted,
  },
  name: { fontFamily: "Nunito_700Bold", fontSize: 13, color: color.ink },
  note: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12,
    color: color.inkSoft,
  },
  error: { color: color.badText, fontSize: 13 },
  image: { width: 220, height: 180, borderRadius: 14 },
  expired: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: color.border,
    padding: 12,
    borderRadius: 12,
  },
  track: {
    height: 5,
    backgroundColor: color.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  progress: { height: 5, backgroundColor: color.saffron },
  lightbox: {
    flex: 1,
    backgroundColor: "#17120F",
    paddingTop: 50,
    paddingBottom: 40,
    paddingHorizontal: 20,
    gap: 20,
  },
});
