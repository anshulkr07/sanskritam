import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import {
  AppState,
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useAudioPlayer } from "expo-audio";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useAuth } from "../store/auth";
import { color } from "../theme";
import { get, post, socketUrl, CallInfo, Status } from "./api";
import {
  StreamVideoClient,
  StreamVideo,
  StreamCall,
  OwnCapability,
  CallingState,
  useCallStateHooks,
  RemoteAudio,
  Call,
} from "./sdk";
interface AudioContextValue {
  status: Status;
  revision: number;
  active: CallInfo | null;
  busy: boolean;
  error: string;
  call: Call | null;
  client: StreamVideoClient | null;
  join: (info: CallInfo) => Promise<void>;
  leave: () => Promise<void>;
  expand: () => void;
  refresh: () => Promise<void>;
  recordingNote: boolean;
  setRecordingNote: (value: boolean) => void;
}
const Context = createContext<AudioContextValue | null>(null);
const empty: Status = {
  unread: 0,
  live: 0,
  incoming: [],
  audio_enabled: false,
};
export function useCommunity() {
  const c = useContext(Context);
  if (!c) throw Error("Missing CommunityProvider");
  return c;
}
export function CommunityProvider({ children }: { children: React.ReactNode }) {
  const { token, learner } = useAuth();
  const [recordingNote, setRecordingNote] = useState(false);
  const [foreground, setForeground] = useState(
    AppState.currentState === "active",
  );
  const [status, setStatus] = useState(empty),
    [revision, setRevision] = useState(0);
  const [client, setClient] = useState<StreamVideoClient | null>(null),
    [call, setCall] = useState<Call | null>(null);
  const [active, setActive] = useState<CallInfo | null>(null),
    [expanded, setExpanded] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const activeRef = useRef<CallInfo | null>(null),
    callRef = useRef<Call | null>(null),
    clientRef = useRef<StreamVideoClient | null>(null),
    lock = useRef(false);
  const [ignored, setIgnored] = useState<string[]>([]);
  const generation = useRef(0);
  const cancelJoinRef = useRef<((message: string) => void) | null>(null);
  const [connectingTitle, setConnectingTitle] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (!token) return;
    const s = await get<Status>("/status");
    setStatus(s);
    setRevision((x) => x + 1);
  }, [token]);
  const leave = useCallback(async () => {
    const current = callRef.current,
      c = clientRef.current,
      info = activeRef.current;
    if (!current && !c) return;
    const lastParticipant = !!current && current.state.participants.length <= 1;
    lock.current = true;
    setBusy(true);
    callRef.current = null;
    clientRef.current = null;
    activeRef.current = null;
    setActive(null);
    setCall(null);
    setClient(null);
    setExpanded(false);
    try {
      if (current) {
        await current.microphone.disable().catch(() => {});
        if (current.state.callingState !== CallingState.LEFT)
          await current.leave().catch(() => {});
      }
      if (c) await c.disconnectUser().catch(() => {});
      if (info?.kind === "audio_room" && info.host_id === learner?.id)
        await post(`/rooms/${info.id}/end`).catch(() => {});
      else if (info?.kind === "default" && lastParticipant)
        await post(`/conversations/${info.conversation_id}/call/end`).catch(
          () => {},
        );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, [learner?.id]);
  useEffect(() => {
    generation.current++;
    void leave().catch(() => {});
    setStatus(empty);
    setIgnored([]);
    if (!token) return;
    let cancelled = false,
      ws: WebSocket | null = null,
      retry: ReturnType<typeof setTimeout> | undefined;
    const connect = async () => {
      if (cancelled || AppState.currentState === "background") return;
      try {
        const { ticket } = await post<{ ticket: string }>("/realtime-ticket");
        if (cancelled) return;
        ws = new WebSocket(socketUrl());
        ws.onopen = () => ws?.send(ticket);
        ws.onmessage = (e) => {
          try {
            if (JSON.parse(e.data).type === "refresh")
              void refresh().catch(() => {});
          } catch {}
        };
        ws.onerror = () => ws?.close();
        ws.onclose = () => {
          if (!cancelled) retry = setTimeout(connect, 4000);
        };
      } catch {
        if (!cancelled) retry = setTimeout(connect, 6000);
      }
    };
    void refresh().catch(() => {});
    void connect();
    const keep = setInterval(() => {
      if (AppState.currentState !== "background") {
        void post("/presence").catch(() => {});
        void refresh().catch(() => {});
      }
    }, 30000);
    const sub = AppState.addEventListener("change", (s) => {
      setForeground(s === "active");
      if (s === "active") {
        void refresh().catch(() => {});
        if (!ws || ws.readyState === WebSocket.CLOSED) void connect();
      } else {
        ws?.close();
      }
    });
    return () => {
      cancelled = true;
      clearInterval(keep);
      clearTimeout(retry);
      sub.remove();
      ws?.close();
    };
  }, [token, refresh, leave]);
  const join = useCallback(
    async (info: CallInfo) => {
      if (recordingNote)
        throw Error(
          "Finish or cancel your voice note before answering a call.",
        );
      if (lock.current)
        throw Error("Audio is connecting or leaving. Try again in a moment.");
      if (activeRef.current) {
        if (activeRef.current.id === info.id) {
          setExpanded(true);
          return;
        }
        throw Error(
          "Leave your current audio room before joining another call.",
        );
      }
      lock.current = true;
      setBusy(true);
      setError("");
      const epoch = generation.current;
      let c: StreamVideoClient | null = null,
        newCall: Call | null = null;
      let cancelled = false,
        rejectJoin: ((e: Error) => void) | undefined;
      setConnectingTitle(info.title);
      cancelJoinRef.current = (message) => {
        cancelled = true;
        rejectJoin?.(Error(message));
        void newCall?.leave().catch(() => {});
      };
      const timeout = setTimeout(
        () =>
          cancelJoinRef.current?.(
            "Could not connect audio. Check your network and retry.",
          ),
        30000,
      );
      try {
        const fetchToken = () =>
          post<{ token: string; user_id: string; api_key: string }>(
            "/stream-token",
            info,
          );
        const credentials = await fetchToken();
        if (epoch !== generation.current) return;
        if (cancelled) throw Error("Connection cancelled.");
        c = new StreamVideoClient({
          apiKey: credentials.api_key,
          user: { id: credentials.user_id, name: learner?.display_name },
          tokenProvider: async () => (await fetchToken()).token,
        });
        newCall = c.call(info.kind, info.id);
        // Camera is disabled before EVERY join. The server also disables video,
        // screen sharing, recordings and transcription for every created call.
        await newCall.camera.disable();
        await newCall.microphone.disable();
        const interrupted = new Promise<never>((_, reject) => {
          rejectJoin = reject;
        });
        await Promise.race([newCall.join(), interrupted]);
        if (epoch !== generation.current) {
          await newCall.leave();
          await c.disconnectUser();
          return;
        }
        clientRef.current = c;
        callRef.current = newCall;
        activeRef.current = info;
        setClient(c);
        setCall(newCall);
        setActive(info);
        setExpanded(true);
        setIgnored((v) => [...v, info.id]);
      } catch (e) {
        if (newCall) await newCall.leave().catch(() => {});
        if (c) await c.disconnectUser().catch(() => {});
        if (info.kind === "audio_room" && info.host_id === learner?.id)
          await post(`/rooms/${info.id}/end`).catch(() => {});
        if (info.kind === "default" && info.initiated)
          await post(`/conversations/${info.conversation_id}/call/end`).catch(
            () => {},
          );
        setError(e instanceof Error ? e.message : "Could not connect audio.");
        throw e;
      } finally {
        clearTimeout(timeout);
        cancelJoinRef.current = null;
        setConnectingTitle(null);
        lock.current = false;
        setBusy(false);
      }
    },
    [learner?.display_name, learner?.id, recordingNote],
  );
  useEffect(() => {
    if (active?.kind !== "audio_room" || active.host_id !== learner?.id) return;
    const beat = () =>
      void post(`/rooms/${active.id}/heartbeat`).catch(() => {});
    beat();
    const t = setInterval(beat, 25000);
    return () => clearInterval(t);
  }, [active, learner?.id]);
  const incoming = status.incoming.find(
    (c) => !ignored.includes(c.id) && c.id !== active?.id,
  );
  useEffect(() => {
    if (!incoming?.expires_at) return;
    const t = setTimeout(
      () => setIgnored((v) => [...v, incoming.id]),
      Math.max(0, Date.parse(incoming.expires_at) - Date.now()),
    );
    return () => clearTimeout(t);
  }, [incoming?.id, incoming?.expires_at]);
  const value = {
    recordingNote,
    setRecordingNote,
    status,
    revision,
    active,
    busy,
    error,
    call,
    client,
    join,
    leave,
    refresh,
    expand: () => setExpanded(true),
  };
  const body = (
    <Context.Provider value={value}>
      {children}
      {client && call && active && (
        <StreamVideo client={client}>
          <StreamCall call={call}>
            <RemoteAudio />
            <Stage
              info={active}
              visible={expanded}
              minimize={() => setExpanded(false)}
            />
            <CallWatcher leave={leave} />
          </StreamCall>
        </StreamVideo>
      )}
      <Modal
        visible={!!connectingTitle}
        transparent
        animationType="fade"
        onRequestClose={() => cancelJoinRef.current?.("Connection cancelled.")}
      >
        <View style={styles.scrim}>
          <View style={styles.dialog}>
            <ActivityIndicator color={color.saffron} />
            <Text style={styles.title}>Connecting audio</Text>
            <Text style={styles.text}>{connectingTitle}</Text>
            <Action
              label="Cancel connection"
              onPress={() => cancelJoinRef.current?.("Connection cancelled.")}
            />
          </View>
        </View>
      </Modal>
      <Modal
        visible={!!incoming && !active && !busy && foreground}
        transparent
        animationType="fade"
        onRequestClose={() =>
          incoming && setIgnored((v) => [...v, incoming.id])
        }
      >
        <View style={styles.scrim}>
          <View style={styles.dialog}>
            <Ionicons name="call" size={36} color={color.okText} />
            <Text style={styles.title}>Incoming audio call</Text>
            <Text style={styles.text}>{incoming?.title}</Text>
            <Text style={styles.hint}>Microphone starts muted.</Text>
            {!!error && <Text style={styles.error}>{error}</Text>}
            <View style={styles.row}>
              <Action
                label="Decline"
                onPress={() => {
                  if (incoming) {
                    setIgnored((v) => [...v, incoming.id]);
                    void post(
                      `/conversations/${incoming.conversation_id}/call/decline`,
                      { id: incoming.id },
                    ).catch(() => {});
                  }
                }}
              />
              <Action
                label="Answer"
                primary
                onPress={() => incoming && void join(incoming).catch(() => {})}
              />
            </View>
          </View>
        </View>
      </Modal>
      {!!incoming && !active && !busy && foreground && <Ringtone />}
    </Context.Provider>
  );
  return body;
}
function Ringtone() {
  const player = useAudioPlayer(require("../../assets/group-ring.wav"));
  useEffect(() => {
    player.loop = true;
    player.volume = 0.6;
    player.play();
    return () => player.pause();
  }, [player]);
  return null;
}
function CallWatcher({ leave }: { leave: () => Promise<void> }) {
  const { useCallCallingState } = useCallStateHooks();
  const state = useCallCallingState();
  useEffect(() => {
    if (state === CallingState.LEFT) void leave().catch(() => {});
  }, [state, leave]);
  return null;
}
export function Action({
  label,
  onPress,
  primary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        primary && styles.primary,
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text style={[styles.buttonText, primary && { color: "white" }]}>
        {label}
      </Text>
    </Pressable>
  );
}
export function AudioMiniPlayer() {
  const { active, client, call } = useCommunity();
  if (!active || !client || !call) return null;
  return (
    <StreamCallProvider call={call}>
      <MiniControls />
    </StreamCallProvider>
  );
}
function MiniControls() {
  const { active, expand, leave } = useCommunity();
  const call = useJoinedCall()!;
  const { useMicrophoneState, useOwnCapabilities, useParticipants } =
    useCallStateHooks();
  const { microphone, isMute } = useMicrophoneState(),
    caps = useOwnCapabilities(),
    participants = useParticipants();
  const [working, setWorking] = useState(false),
    [error, setError] = useState("");
  const allowed = caps?.includes(OwnCapability.SEND_AUDIO);
  const action = () => {
    setWorking(true);
    setError("");
    void (
      allowed
        ? microphone.toggle()
        : call.requestPermissions({ permissions: [OwnCapability.SEND_AUDIO] })
    )
      .catch((e) => setError(e.message || "Try opening the room."))
      .finally(() => setWorking(false));
  };
  return (
    <View style={styles.mini}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open audio room"
        onPress={expand}
        style={{ flex: 1 }}
      >
        <Text numberOfLines={1} style={styles.buttonText}>
          ● {active?.title}
        </Text>
        <Text style={styles.hint}>
          {error ||
            `${participants.length} connected · ${isMute ? "Mic off" : "Mic on"}`}
        </Text>
      </Pressable>
      <Action
        label={allowed ? (isMute ? "Unmute" : "Mute") : "Raise hand"}
        disabled={working}
        onPress={action}
      />
      <Action
        label="Leave"
        disabled={working}
        onPress={() => void leave().catch(() => {})}
      />
    </View>
  );
}
function Stage({
  info,
  visible,
  minimize,
}: {
  info: CallInfo;
  visible: boolean;
  minimize: () => void;
}) {
  const { learner } = useAuth();
  const { leave } = useCommunity();
  const insets = useSafeAreaInsets();
  const {
    useParticipants,
    useOwnCapabilities,
    useMicrophoneState,
    useCallCallingState,
  } = useCallStateHooks();
  const participants = useParticipants(),
    caps = useOwnCapabilities(),
    { microphone, isMute } = useMicrophoneState(),
    state = useCallCallingState();
  const isHost = info.host_id === learner?.id,
    canSpeak =
      info.kind === "default" || caps?.includes(OwnCapability.SEND_AUDIO);
  const [hands, setHands] = useState<{ id: string; name: string }[]>([]),
    [asked, setAsked] = useState(false),
    [error, setError] = useState(""),
    [working, setWorking] = useState(false);
  // This uses the already joined call instance; never makes a second call.
  const contextCall = useJoinedCall()!;
  useEffect(() => {
    const off = contextCall.on("call.permission_request", (e) => {
      if (e.permissions.includes(OwnCapability.SEND_AUDIO))
        setHands((v) =>
          v.some((p) => p.id === e.user.id)
            ? v
            : [...v, { id: e.user.id, name: e.user.name || "Learner" }],
        );
    });
    const updated = contextCall.on("call.permissions_updated", (e) => {
      if (e.user.id === learner?.id) setAsked(false);
    });
    return () => {
      off();
      updated();
    };
  }, [contextCall, learner?.id]);
  const run = (fn: () => Promise<unknown>) => {
    setWorking(true);
    setError("");
    void fn()
      .catch((e) => setError(e instanceof Error ? e.message : "Action failed."))
      .finally(() => setWorking(false));
  };
  const answer = (uid: string, allow: boolean) =>
    run(async () => {
      await post(`/rooms/${info.id}/permission`, { user_id: uid, allow });
      setHands((v) => v.filter((p) => p.id !== uid));
    });
  const speakers = participants.filter(
    (p) =>
      info.kind === "default" ||
      p.userId === info.host_id ||
      p.roles?.includes("speaker") ||
      p.publishedTracks.includes(1),
  );
  const listeners = participants.filter((p) => !speakers.includes(p));
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={minimize}>
      <View
        style={[
          styles.stage,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
        ]}
      >
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hint}>संभाषणम् · AUDIO ONLY</Text>
            <Text style={styles.title}>{info.title}</Text>
          </View>
          <Action label="Minimize" onPress={minimize} />
        </View>
        <Text style={styles.hint}>
          {state === CallingState.RECONNECTING
            ? "Reconnecting…"
            : `${participants.length} connected · ${isMute ? "Your mic is muted" : "Your mic is on"}`}
        </Text>
        <ScrollView contentContainerStyle={{ gap: 20, paddingVertical: 24 }}>
          <Text style={styles.section}>Stage</Text>
          <View style={styles.grid}>
            {speakers.map((p) => (
              <View key={p.sessionId} style={styles.person}>
                <View style={[styles.avatar, p.isSpeaking && styles.speaking]}>
                  <Text style={styles.avatarText}>
                    {(p.name || p.userId).slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.text} numberOfLines={1}>
                  {p.name || "Learner"}
                </Text>
                <Text style={styles.hint}>
                  {p.userId === info.host_id
                    ? "Host"
                    : p.publishedTracks.includes(1)
                      ? "Speaking"
                      : "Muted"}
                </Text>
                {isHost && p.userId !== learner?.id && (
                  <Action
                    label="Move to audience"
                    disabled={working}
                    onPress={() => answer(p.userId, false)}
                  />
                )}
              </View>
            ))}
          </View>
          {isHost && hands.length > 0 && (
            <View style={styles.queue}>
              <Text style={styles.section}>Raised hands</Text>
              {hands.map((p) => (
                <View key={p.id} style={styles.row}>
                  <Text style={[styles.text, { flex: 1 }]}>{p.name}</Text>
                  <Action
                    label="Allow mic"
                    disabled={working}
                    onPress={() => answer(p.id, true)}
                  />
                  <Action
                    label="Dismiss"
                    disabled={working}
                    onPress={() => answer(p.id, false)}
                  />
                </View>
              ))}
            </View>
          )}
          {listeners.length > 0 && (
            <>
              <Text style={styles.section}>Listening</Text>
              <View style={styles.grid}>
                {listeners.map((p) => (
                  <View key={p.sessionId} style={styles.person}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(p.name || "L").slice(0, 1)}
                      </Text>
                    </View>
                    <Text style={styles.text}>{p.name || "Learner"}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
        {!!error && (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        )}
        <View style={styles.row}>
          {canSpeak ? (
            <Action
              primary
              label={isMute ? "Unmute" : "Mute"}
              disabled={working}
              onPress={() => run(() => microphone.toggle())}
            />
          ) : (
            <Action
              primary
              label={asked ? "Hand raised" : "Raise hand · हस्तम् उत्थापयतु"}
              disabled={working || asked}
              onPress={() =>
                run(async () => {
                  await contextCall.requestPermissions({
                    permissions: [OwnCapability.SEND_AUDIO],
                  });
                  setAsked(true);
                })
              }
            />
          )}
          {canSpeak && !isHost && info.kind === "audio_room" && (
            <Action
              label="Step down"
              disabled={working}
              onPress={() =>
                run(async () => {
                  await microphone.disable();
                  await post(`/rooms/${info.id}/permission`, {
                    user_id: learner?.id,
                    allow: false,
                  });
                })
              }
            />
          )}
          <Action label="Leave" disabled={working} onPress={() => run(leave)} />
        </View>
        {(isHost || info.kind === "default") && (
          <Action
            label={isHost ? "End room for everyone" : "End call for everyone"}
            disabled={working}
            onPress={() =>
              run(async () => {
                if (info.kind === "default")
                  await post(`/conversations/${info.conversation_id}/call/end`);
                await leave();
              })
            }
          />
        )}
      </View>
    </Modal>
  );
}
// Shared bindings hook works for both adapters and does not initialize native code on web.
import {
  useCall as useJoinedCall,
  StreamCallProvider,
} from "@stream-io/video-react-bindings";
const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "#3B2E2580",
    justifyContent: "center",
    padding: 24,
  },
  dialog: { backgroundColor: color.bg, borderRadius: 24, padding: 24, gap: 16 },
  stage: { flex: 1, backgroundColor: color.bg, paddingHorizontal: 20, gap: 14 },
  title: { fontFamily: "Nunito_800ExtraBold", fontSize: 24, color: color.ink },
  text: { fontFamily: "Nunito_600SemiBold", fontSize: 16, color: color.ink },
  hint: {
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12,
    color: color.inkSoft,
  },
  section: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 18,
    color: color.ink,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 18 },
  person: { alignItems: "center", width: 95, gap: 6 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: color.surfaceMuted,
    borderWidth: 3,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  speaking: { borderColor: color.ok },
  avatarText: {
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 24,
    color: color.ink,
  },
  queue: {
    backgroundColor: color.surface,
    padding: 12,
    borderRadius: 18,
    gap: 12,
  },
  button: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: color.surfaceMuted,
  },
  primary: { backgroundColor: color.saffronBtn },
  buttonText: { fontFamily: "Nunito_700Bold", fontSize: 14, color: color.ink },
  mini: {
    backgroundColor: color.okBg,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderColor: color.border,
  },
  error: { color: color.badText, fontSize: 14 },
});
