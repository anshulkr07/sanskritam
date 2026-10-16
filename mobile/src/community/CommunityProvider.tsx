import ProfileImage from "../components/ProfileImage";
import Modal from "../components/AudioModal";
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
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useAudioPlayer } from "expo-audio";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, type IoniconsIconName } from "@react-native-vector-icons/ionicons";
import { useAuth } from "../store/auth";
import { fill } from "../theme";
import { CREAM, CREAM_FAINT, CREAM_SOFT, GOLD, T, fillFor, initials, ui } from "./look";
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
  /** True once the first status has arrived for this sign-in. */
  ready: boolean;
  revision: number;
  active: CallInfo | null;
  busy: boolean;
  error: string;
  call: Call | null;
  client: StreamVideoClient | null;
  join: (info: CallInfo) => Promise<void>;
  leave: () => Promise<void>;
  expand: () => void;
  /** Fetch the status; screens reload when it changed (always, unless `quiet`). */
  refresh: (quiet?: boolean) => Promise<void>;
  recordingNote: boolean;
  setRecordingNote: (value: boolean) => void;
}
const Context = createContext<AudioContextValue | null>(null);
const empty: Status = {
  unread: 0,
  live: 0,
  requests: 0,
  card: false,
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
    [ready, setReady] = useState(false),
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
    lock = useRef(false),
    lastStatus = useRef("");
  const [ignored, setIgnored] = useState<string[]>([]);
  const generation = useRef(0);
  const cancelJoinRef = useRef<((message: string) => void) | null>(null);
  const [connectingTitle, setConnectingTitle] = useState<string | null>(null);
  // A socket event or an action always reloads the open Group screen. The
  // 30-second keep-alive is `quiet`: it reloads only when the status moved,
  // so an idle screen is not refetched twice a minute for nothing.
  const refresh = useCallback(
    async (quiet = false) => {
      if (!token) return;
      const s = await get<Status>("/status");
      const key = JSON.stringify(s);
      setStatus(s);
      setReady(true);
      if (!quiet || key !== lastStatus.current) setRevision((x) => x + 1);
      lastStatus.current = key;
    },
    [token],
  );
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
    setReady(false);
    lastStatus.current = "";
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
        void refresh(true).catch(() => {});
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
    ready,
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
            <ActivityIndicator color={T.action} />
            <Text style={styles.dialogTitle}>Connecting audio</Text>
            <Text style={styles.dialogText}>{connectingTitle}</Text>
            <Text style={styles.hint}>Your microphone starts off.</Text>
            <Action
              label="Cancel"
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
            <View style={styles.ringRow}>
              <View style={[styles.ringAvatar, { backgroundColor: fillFor(incoming?.conversation_id ?? "call") }]}>
                <Text style={styles.ringInitials}>{initials(incoming?.title ?? "")}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.overline}>INCOMING AUDIO CALL</Text>
                <Text style={styles.dialogTitle} numberOfLines={1}>
                  {incoming?.title}
                </Text>
              </View>
            </View>
            <Text style={styles.hint}>Your microphone starts off.</Text>
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
/** A square button for the call surfaces (and older Group code). */
export function Action({
  label,
  onPress,
  primary = false,
  disabled = false,
  danger = false,
  icon,
  light = false,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  danger?: boolean;
  icon?: IoniconsIconName;
  /** On a deep fill: cream outline and type. */
  light?: boolean;
}) {
  const color = primary ? T.white : danger ? T.wrongInk : light ? CREAM : T.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary
          ? styles.primary
          : danger
            ? styles.danger
            : light
              ? styles.light
              : styles.outline,
        disabled && { opacity: 0.45 },
        pressed && !disabled && { opacity: 0.82 },
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={color} /> : null}
      <Text style={[styles.buttonText, { color }]} numberOfLines={1}>
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
        accessibilityLabel={`Open ${active?.title ?? "audio room"}`}
        onPress={expand}
        style={styles.miniInfo}
      >
        <View style={styles.miniLive} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={styles.miniTitle}>
            {active?.title}
          </Text>
          <Text numberOfLines={1} style={styles.miniSub}>
            {error ||
              `${participants.length} in the ${active?.kind === "audio_room" ? "room" : "call"} · ${isMute ? "Mic off" : "Mic on"}`}
          </Text>
        </View>
      </Pressable>
      <MiniButton
        icon={allowed ? (isMute ? "mic-off" : "mic") : "hand-left-outline"}
        label={allowed ? (isMute ? "Unmute" : "Mute") : "Raise hand"}
        disabled={working}
        onPress={action}
      />
      <MiniButton
        icon="exit-outline"
        label="Leave"
        disabled={working}
        onPress={() => void leave().catch(() => {})}
      />
    </View>
  );
}
function MiniButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: IoniconsIconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.miniBtn,
        disabled && { opacity: 0.45 },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Ionicons name={icon} size={20} color={CREAM} />
    </Pressable>
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
  const room = info.kind === "audio_room";
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={minimize}>
      <View
        style={[
          styles.stage,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 },
        ]}
      >
        <View style={styles.stageTop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Minimize"
            onPress={minimize}
            hitSlop={6}
            style={styles.stageIcon}
          >
            <Ionicons name="chevron-down" size={24} color={CREAM} />
          </Pressable>
          <View style={styles.stageLive}>
            <View style={styles.stageDot} />
            <Text style={styles.stageLiveText}>
              {room ? "LIVE ROOM · AUDIO ONLY" : "AUDIO CALL"}
            </Text>
          </View>
        </View>
        <Text style={styles.stageTitle}>{info.title}</Text>
        <Text style={styles.stageSub}>
          {state === CallingState.RECONNECTING
            ? "Reconnecting…"
            : `${participants.length} connected · ${isMute ? "your mic is off" : "your mic is on"}`}
        </Text>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: 22, paddingVertical: 22 }}
        >
          <Text style={styles.section}>{room ? "On the stage" : "In the call"}</Text>
          <View style={styles.grid}>
            {speakers.map((p) => (
              <View key={p.sessionId} style={styles.person}>
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: fillFor(p.userId) },
                    p.isSpeaking && styles.speaking,
                  ]}
                >
                  <Text style={styles.avatarText}>
                    {initials(p.name || p.userId)}
                  </Text>
                  <ProfileImage uri={`/people/${p.userId}/photo`} />
                </View>
                <Text style={styles.personName} numberOfLines={1}>
                  {p.userId === learner?.id ? "You" : p.name || "Learner"}
                </Text>
                <Text style={styles.personRole}>
                  {p.userId === info.host_id
                    ? "Host"
                    : p.publishedTracks.includes(1)
                      ? "Speaking"
                      : "Mic off"}
                </Text>
                {isHost && room && p.userId !== learner?.id && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Move ${p.name || "learner"} to listeners`}
                    disabled={working}
                    onPress={() => answer(p.userId, false)}
                    style={styles.smallLink}
                  >
                    <Text style={styles.smallLinkText}>To listeners</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
          {isHost && hands.length > 0 && (
            <View style={styles.queue}>
              <Text style={styles.section}>Raised hands</Text>
              {hands.map((p) => (
                <View key={p.id} style={styles.handRow}>
                  <Ionicons name="hand-left" size={18} color={GOLD} />
                  <Text style={[styles.dialogTextLight, { flex: 1 }]} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Action
                    label="Let speak"
                    primary
                    disabled={working}
                    onPress={() => answer(p.id, true)}
                  />
                  <Action
                    label="Not now"
                    light
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
                    <View
                      style={[
                        styles.avatar,
                        styles.avatarSmall,
                        { backgroundColor: fillFor(p.userId) },
                      ]}
                    >
                      <Text style={[styles.avatarText, { fontSize: 18 }]}>
                        {initials(p.name || "L")}
                      </Text>
                      <ProfileImage uri={`/people/${p.userId}/photo`} />
                    </View>
                    <Text style={styles.personName} numberOfLines={1}>
                      {p.userId === learner?.id ? "You" : p.name || "Learner"}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
        {!!error && (
          <Text accessibilityRole="alert" style={styles.stageError}>
            {error}
          </Text>
        )}
        <View style={styles.controls}>
          {canSpeak ? (
            <StageButton
              icon={isMute ? "mic-off" : "mic"}
              label={isMute ? "Unmute" : "Mute"}
              on={!isMute}
              disabled={working}
              onPress={() => run(() => microphone.toggle())}
            />
          ) : (
            <StageButton
              icon="hand-left-outline"
              label={asked ? "Hand raised" : "Raise hand"}
              on={asked}
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
          {canSpeak && !isHost && room && (
            <StageButton
              icon="arrow-down-circle-outline"
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
          <StageButton
            icon="exit-outline"
            label="Leave"
            leave
            disabled={working}
            onPress={() => run(leave)}
          />
        </View>
        {(isHost || info.kind === "default") && (
          <Pressable
            accessibilityRole="button"
            disabled={working}
            onPress={() =>
              run(async () => {
                if (info.kind === "default")
                  await post(`/conversations/${info.conversation_id}/call/end`);
                await leave();
              })
            }
            style={styles.endAll}
          >
            <Text style={styles.endAllText}>
              {isHost ? "End the room for everyone" : "End the call for everyone"}
            </Text>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}
function StageButton({
  icon,
  label,
  onPress,
  disabled,
  on = false,
  leave = false,
}: {
  icon: IoniconsIconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  on?: boolean;
  leave?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected: on }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.stageBtn,
        on && styles.stageBtnOn,
        leave && styles.stageBtnLeave,
        disabled && { opacity: 0.5 },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Ionicons name={icon} size={24} color={on ? T.ink : CREAM} />
      <Text style={[styles.stageBtnText, on && { color: T.ink }]}>{label}</Text>
    </Pressable>
  );
}
// Shared bindings hook works for both adapters and does not initialize native code on web.
import {
  useCall as useJoinedCall,
  StreamCallProvider,
} from "@stream-io/video-react-bindings";
const STAGE = fill.teal;
const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: T.scrim,
    justifyContent: "center",
    padding: 24,
  },
  dialog: {
    backgroundColor: T.paper,
    padding: 22,
    gap: 14,
    borderTopWidth: 4,
    borderTopColor: T.action,
  },
  dialogTitle: { ...ui("bold"), fontSize: 21, lineHeight: 27, color: T.ink },
  dialogText: { ...ui("medium"), fontSize: 16, lineHeight: 22, color: T.ink2 },
  dialogTextLight: { ...ui("semibold"), fontSize: 16, color: CREAM },
  overline: { ...ui("bold"), fontSize: 12, letterSpacing: 1.3, color: T.ink3 },
  hint: { ...ui("regular"), fontSize: 13.5, lineHeight: 19, color: T.ink3 },
  ringRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  ringAvatar: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  ringInitials: { ...ui("bold"), fontSize: 22, color: CREAM },
  row: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  error: { ...ui("medium"), color: T.wrongInk, fontSize: 14, lineHeight: 20 },
  button: {
    minHeight: 46,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  primary: { backgroundColor: T.action },
  outline: { borderWidth: 1.5, borderColor: T.ink },
  danger: { borderWidth: 1.5, borderColor: T.wrong },
  light: { borderWidth: 1.5, borderColor: CREAM },
  buttonText: { ...ui("semibold"), fontSize: 15 },
  mini: {
    backgroundColor: STAGE,
    paddingLeft: 12,
    paddingRight: 4,
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  miniInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minHeight: 54 },
  miniLive: { width: 9, height: 9, backgroundColor: "#7BD99A" },
  miniTitle: { ...ui("semibold"), fontSize: 15, lineHeight: 20, color: CREAM },
  miniSub: { ...ui("regular"), fontSize: 12.5, lineHeight: 17, color: CREAM_SOFT },
  miniBtn: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: CREAM_FAINT,
    marginLeft: 4,
  },
  stage: { flex: 1, backgroundColor: STAGE, paddingHorizontal: 20 },
  stageTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stageIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginLeft: -10 },
  stageLive: { flexDirection: "row", alignItems: "center", gap: 7 },
  stageDot: { width: 8, height: 8, backgroundColor: "#7BD99A" },
  stageLiveText: { ...ui("bold"), fontSize: 12, letterSpacing: 1.3, color: GOLD },
  stageTitle: { ...ui("bold"), fontSize: 26, lineHeight: 33, color: CREAM, marginTop: 10 },
  stageSub: { ...ui("regular"), fontSize: 14.5, lineHeight: 20, color: CREAM_SOFT, marginTop: 2 },
  section: { ...ui("bold"), fontSize: 13, letterSpacing: 1.2, color: GOLD, textTransform: "uppercase" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 18 },
  person: { alignItems: "center", width: 88, gap: 4 },
  avatar: {
    width: 68,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "transparent",
  },
  avatarSmall: { width: 52, height: 52 },
  speaking: { borderColor: "#7BD99A" },
  avatarText: { ...ui("bold"), fontSize: 24, color: CREAM },
  personName: { ...ui("semibold"), fontSize: 14, color: CREAM, maxWidth: 88 },
  personRole: { ...ui("regular"), fontSize: 12.5, color: CREAM_SOFT },
  smallLink: { minHeight: 32, justifyContent: "center" },
  smallLinkText: { ...ui("semibold"), fontSize: 12.5, color: GOLD, textDecorationLine: "underline" },
  queue: { borderWidth: 1, borderColor: CREAM_FAINT, padding: 14, gap: 12 },
  handRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  stageError: { ...ui("medium"), fontSize: 14, lineHeight: 20, color: CREAM, backgroundColor: "rgba(179,38,30,0.85)", padding: 10 },
  controls: { flexDirection: "row", gap: 10, paddingTop: 12 },
  stageBtn: {
    flex: 1,
    minHeight: 68,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1.5,
    borderColor: CREAM_FAINT,
  },
  stageBtnOn: { backgroundColor: CREAM, borderColor: CREAM },
  stageBtnLeave: { backgroundColor: T.wrong, borderColor: T.wrong },
  stageBtnText: { ...ui("semibold"), fontSize: 13.5, color: CREAM },
  endAll: { minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: 8 },
  endAllText: { ...ui("semibold"), fontSize: 14, color: CREAM, textDecorationLine: "underline" },
});
