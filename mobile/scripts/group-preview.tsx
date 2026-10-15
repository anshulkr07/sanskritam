// TEMPORARY web preview for the Group overhaul (delete after checking).
// Real Group screens and providers; fetch and WebSocket are stubbed with
// fixture data for three learners: new, started, active.
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Asset } from "expo-asset";
import { registerRootComponent } from "expo";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator, BottomTabBar } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useFonts } from "expo-font";
import { TypeScaleProvider } from "../src/hooks/useTypeScale";
import { AuthProvider } from "../src/store/auth";
import { AudioMiniPlayer, CommunityProvider, useCommunity } from "../src/community/CommunityProvider";
import GroupScreen from "../src/screens/Group";
import GroupChat from "../src/screens/GroupChat";
import GroupInfo from "../src/screens/GroupInfo";
import GroupCircles from "../src/screens/GroupCircles";
import GroupPeople from "../src/screens/GroupPeople";
import GroupCard from "../src/screens/GroupCard";
import GroupNew from "../src/screens/GroupNew";
import { color } from "../src/theme";

type Any = any; // eslint-disable-line @typescript-eslint/no-explicit-any
const W = globalThis as Any;
const realFetch = W.fetch.bind(W);
const iso = (minsAgo: number) => new Date(Date.now() - minsAgo * 60000).toISOString();
const later = (h: number) => new Date(Date.now() + h * 3600000).toISOString();
const photo = Asset.fromModule(require("../assets/path/u5-pres-1pl.webp")).uri;
const voice = Asset.fromModule(require("../assets/group-ring.wav")).uri;

const P = (id: string, name: string, level: string, online = false, bio = "", role?: string) => ({ id, name, level, online, bio, ...(role ? { role } : {}) });
const ME = P("me", "Anshul Kumar", "intermediate", true, "Reading the Gītā, chapter 2.");
const bharat = P("b1", "Bharat Joshi", "advanced", true, "Pāṇini on weekends.");
const meera = P("m1", "Meera Iyer", "intermediate", true, "Kālidāsa fan. Happy to practise speaking.");
const ravi = P("r1", "Ravi Shankar", "beginner", false, "");
const arjun = P("a1", "Arjun Mehta", "beginner", false, "Just finished the varṇamālā!");
const lakshmi = P("l1", "Lakshmi Narayan", "intermediate", true, "Subhāṣitas every morning.");
const daniel = P("d9", "Daniel Weber", "advanced", false, "Reading the Raghuvaṃśa slowly.");
const priya = P("p1", "Priya Das", "beginner", true, "");

function circle(id: string, name: string, extra: Any) {
  return { id, kind: "group", name, description: "", topic: "", level: "all", public: true, joined: false, role: null, members: [], member_count: 1, last_text: "", last_sender: "", updated_at: iso(60), unread: 0, call_id: null, ...extra };
}
function direct(id: string, peer: Any, extra: Any) {
  return { id, kind: "direct", name: peer.name, description: "", topic: "", level: "all", public: false, joined: true, role: "member", members: [ME, peer], member_count: 2, last_text: "", last_sender: "", updated_at: iso(60), unread: 0, call_id: null, ...extra };
}

function scenario(kind: string) {
  const openCircles = [
    circle("o1", "Subhāṣita a day", { description: "One wise verse each morning, with its words explained. Gentle pace.", topic: "Subhāṣitas", level: "all", member_count: 32, members: [P("x1", "Kavya Rao", "advanced", true, "", "admin"), lakshmi, priya] }),
    circle("o2", "स्तोत्र पाठ", { description: "Learning to read stotras aloud, a line at a time.", topic: "Stotras", level: "beginner", member_count: 21, members: [P("x2", "Gita Menon", "intermediate", false, "", "admin"), ravi] }),
    circle("o3", "Meghadūta reading group", { description: "Kālidāsa's cloud messenger, two verses a week, with commentary.", topic: "Meghadūta, Pūrvamegha", level: "advanced", member_count: 9, members: [P("x3", "Daniel Weber", "advanced", false, "", "admin")] }),
  ];
  const gita = circle("c1", "Gītā reading circle", {
    description: "One verse a day from chapter 2, word by word. Questions welcome, mistakes expected.",
    topic: "Bhagavad Gītā, chapter 2", level: "intermediate", joined: true, role: "admin", member_count: 14,
    members: [{ ...ME, role: "admin" }, { ...bharat, role: "member" }, { ...meera, role: "member" }, { ...ravi, role: "member" }],
    last_text: "धर्मक्षेत्रे कुरुक्षेत्रे — what case is क्षेत्रे?", last_sender: "Bharat Joshi", updated_at: iso(4), unread: 3,
  });
  const sandhi = circle("c2", "Sandhi practice", { topic: "Vowel sandhi", level: "beginner", joined: true, role: "member", member_count: 6, members: [{ ...ME, role: "member" }, { ...priya, role: "admin" }], last_text: "Photo", last_sender: "You", updated_at: iso(50), call_id: "call-1" });
  const dm1 = direct("d1", meera, { last_text: "नमस्ते! Shall we practise at 7?", last_sender: "Meera Iyer", updated_at: iso(18), unread: 1 });
  const dm2 = direct("d2", ravi, { last_text: "धन्यवादः", last_sender: "You", updated_at: iso(60 * 24 * 3) });
  const rooms = [{ id: "r1", title: "First conversations: introducing yourself", topic: "मम नाम … · अहं … वसामि", level: "beginner", host: P("h1", "Kavya Rao", "advanced", true), participant_count: 6 }];
  if (kind === "new")
    return { me: { ...ME, bio: "", level: "beginner", card: false }, convs: [], discover: openCircles, rooms: [], friends: { friends: [], incoming: [], outgoing: [] }, learners: [{ ...lakshmi, friendship: null }, { ...daniel, friendship: null }, { ...priya, friendship: null }], status: { unread: 0, live: 0, requests: 0, card: false, incoming: [], audio_enabled: true } };
  if (kind === "started")
    return { me: { ...ME, card: true }, convs: [], discover: openCircles, rooms, friends: { friends: [], incoming: [], outgoing: [] }, learners: [{ ...lakshmi, friendship: null }, { ...daniel, friendship: null }, { ...priya, friendship: null }], status: { unread: 0, live: 1, requests: 0, card: true, incoming: [], audio_enabled: true } };
  return {
    me: { ...ME, card: true }, convs: [gita, dm1, sandhi, dm2], discover: [{ ...gita }, { ...sandhi }, ...openCircles], rooms,
    friends: { friends: [meera, ravi], incoming: [arjun], outgoing: [] },
    learners: [{ ...arjun, friendship: "incoming" }, { ...meera, friendship: "accepted" }, { ...lakshmi, friendship: null }, { ...daniel, friendship: null }, { ...priya, friendship: null }],
    status: { unread: 4, live: 1, requests: 1, card: true, incoming: [], audio_enabled: true },
  };
}

let S: Any = scenario("active");
let nextId = 100;
const msg = (id: number, sender: Any, content: string, minsAgo: number, extra: Any = {}) => ({ id, sender, kind: "text", content, hidden: false, created_at: iso(minsAgo), media_id: null, expires_at: null, duration: 0, client_id: `c${id}`, reply: null, ...extra });
const MESSAGES: Record<string, Any[]> = {
  c1: [
    msg(1, bharat, "Today: 2.1. सञ्जय उवाच। तं तथा कृपयाविष्टम् अश्रुपूर्णाकुलेक्षणम्।", 60 * 26),
    msg(2, meera, "कृपयाविष्टम् = कृपया + आविष्टम्, filled with pity.", 60 * 26 - 3),
    msg(3, ME, "And अश्रुपूर्णाकुलेक्षणम् is one long compound — eyes full of tears and troubled.", 60 * 25),
    msg(4, ravi, "", 60 * 25 - 2, { kind: "deleted" }),
    msg(5, P("zz", "Blocked learner", "beginner"), "", 60 * 24, { hidden: true }),
    msg(6, meera, "", 90, { kind: "image", media_id: "img1", expires_at: later(31) }),
    msg(7, meera, "My notes on 2.1 — the vibhaktis are marked.", 89),
    msg(8, ME, "", 40, { kind: "audio", media_id: "aud1", expires_at: later(40), duration: 3 }),
    msg(9, bharat, "धर्मक्षेत्रे कुरुक्षेत्रे — what case is क्षेत्रे?", 4, { reply: { id: 3, name: "Anshul Kumar", content: "And अश्रुपूर्णाकुलेक्षणम् is one long compound…" } }),
  ],
  d1: [msg(21, meera, "नमस्ते! Shall we practise at 7?", 18), msg(22, ME, "Yes! I'll call you then.", 15)],
};

function json(body: Any, status = 200) {
  return Promise.resolve(new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
}
function convo(id: string) {
  return S.convs.find((c: Any) => c.id === id) ?? S.discover.find((c: Any) => c.id === id);
}
W.fetch = async (input: Any, init: Any = {}) => {
  const url = typeof input === "string" ? input : input.url;
  const u = new URL(url, location.href);
  if (u.origin === location.origin) return realFetch(input, init);
  const path = u.pathname;
  const method = (init.method || "GET").toUpperCase();
  const body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : {};
  await new Promise((r) => setTimeout(r, 120));
  if (path === "/me") return json({ learner: { id: "me", display_name: ME.name, bridge_langs: ["en"], sanskrit_ratio: 0.3, script_ratio: 0.5, feature_mastery: {}, streak: 4, voice_minutes_used: 0 }, model: {} });
  if (!path.startsWith("/community")) return json({ detail: "Not in preview" }, 404);
  const p = path.slice("/community".length);
  if (p === "/status") return json(S.status);
  if (p === "/realtime-ticket") return json({ ticket: "t" });
  if (p === "/presence" || p.endsWith("/read")) return json({ ok: true });
  if (p === "/profile" && method === "GET") return json(S.me);
  if (p === "/profile" && method === "PUT") {
    if (!S.me.card && !body.rules) return json({ detail: "Agree to the Saṅgha rules to make your card." }, 422);
    S.me = { ...S.me, level: body.level, bio: body.bio.trim(), card: true };
    S.status = { ...S.status, card: true };
    return json(S.me);
  }
  if (p === "/conversations" && method === "GET") return json(u.searchParams.get("discover") ? S.discover : S.convs);
  let m = p.match(/^\/conversations\/([^/]+)$/);
  if (m) return convo(m[1]) ? json(convo(m[1])) : json({ detail: "This circle is private or no longer exists." }, 404);
  m = p.match(/^\/conversations\/([^/]+)\/messages$/);
  if (m && method === "GET") {
    const c = convo(m[1]);
    if (!c?.joined) return json({ detail: "Join this circle before opening its chat." }, 403);
    return json(u.searchParams.get("before") ? [] : MESSAGES[m[1]] ?? []);
  }
  if (m && method === "POST") {
    const row = msg(nextId++, ME, body.content, 0, body.reply_to ? { reply: { id: body.reply_to, name: "Bharat Joshi", content: "…" } } : {});
    (MESSAGES[m[1]] = MESSAGES[m[1]] ?? []).push(row);
    return json(row);
  }
  m = p.match(/^\/conversations\/([^/]+)\/messages\/(\d+)\/delete$/);
  if (m) {
    const row = (MESSAGES[m[1]] ?? []).find((x: Any) => x.id === Number(m![2]));
    if (row) Object.assign(row, { kind: "deleted", content: "", media_id: null });
    return json(row ?? {});
  }
  m = p.match(/^\/media\/(.+)$/);
  if (m) return json({ url: m[1] === "img1" ? photo : voice, expires_at: later(30) });
  if (p === "/rooms" && method === "GET") return json(S.rooms);
  if (p === "/friends" && method === "GET") return json(S.friends);
  if (p.startsWith("/learners")) {
    const q = (u.searchParams.get("q") || "").toLowerCase();
    const level = u.searchParams.get("level") || "all";
    return json(S.learners.filter((x: Any) => x.name.toLowerCase().includes(q) && (level === "all" || x.level === level)));
  }
  if (p === "/friends" && method === "POST") {
    const who = S.learners.find((x: Any) => x.id === body.user_id) ?? { ...arjun };
    if (body.action === "request") { who.friendship = "pending"; S.friends.outgoing.push(who); }
    if (body.action === "accept") {
      S.friends.incoming = S.friends.incoming.filter((x: Any) => x.id !== body.user_id);
      S.friends.friends.push(who); who.friendship = "accepted";
      S.status = { ...S.status, requests: 0 };
      return json(direct("d3", who, {}));
    }
    if (body.action === "decline") { S.friends.incoming = S.friends.incoming.filter((x: Any) => x.id !== body.user_id); S.status = { ...S.status, requests: 0 }; }
    return json({ ok: true });
  }
  if (p === "/direct") {
    const peer = [...S.friends.friends].find((x: Any) => x.id === body.user_id);
    return json(S.convs.find((c: Any) => c.kind === "direct" && c.members.some((x: Any) => x.id === body.user_id)) ?? direct("d4", peer ?? meera, {}));
  }
  m = p.match(/^\/groups\/([^/]+)\/join$/);
  if (m) {
    const c = convo(m[1]);
    const joined = { ...c, joined: true, role: "member", member_count: c.member_count + 1, members: [...c.members, { ...ME, role: "member" }] };
    S.discover = S.discover.map((x: Any) => (x.id === c.id ? joined : x));
    S.convs = [joined, ...S.convs];
    return json(joined);
  }
  if (p === "/groups" && method === "POST") {
    const c = circle(`n${nextId++}`, body.name, { ...body, joined: true, role: "admin", members: [{ ...ME, role: "admin" }] });
    S.convs = [c, ...S.convs];
    return json(c);
  }
  if (p === "/report") return json(null, 204);
  return json({ ok: true });
};
W.WebSocket = class {
  readyState = 0;
  onopen: Any; onmessage: Any; onerror: Any; onclose: Any;
  send() {}
  close() {}
};
try { localStorage.setItem("shabd.token", "preview"); localStorage.setItem("shabd.onboarded", "true"); } catch {}

const Stack = createNativeStackNavigator<Any>();
const Tab = createBottomTabNavigator<Any>();

function Placeholder({ route }: Any) {
  return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8F2E7" }}><Text>{route.name} (outside Group)</Text></View>;
}

function Tabs() {
  const { status } = useCommunity();
  return (
    <Tab.Navigator
      initialRouteName="Group"
      tabBar={(props: Any) => (<View><AudioMiniPlayer /><BottomTabBar {...props} /></View>)}
      screenOptions={({ route }: Any) => ({
        headerShown: false,
        tabBarActiveTintColor: color.saffron,
        tabBarInactiveTintColor: color.inkFaint,
        tabBarStyle: { backgroundColor: color.surface, borderTopColor: color.border, borderTopWidth: 1, height: 64, paddingTop: 6, paddingBottom: 8 },
        tabBarLabelStyle: { fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 10 },
        tabBarIcon: ({ focused, color: c, size }: Any) => (
          <Ionicons name={(route.name === "Group" ? (focused ? "people" : "people-outline") : focused ? "home" : "home-outline") as Any} size={size} color={c} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={Placeholder} />
      <Tab.Screen
        name="Group"
        component={GroupScreen as Any}
        options={{
          tabBarBadge: status.unread + (status.requests ?? 0) > 0 ? Math.min(99, status.unread + (status.requests ?? 0)) : status.live > 0 ? "•" : undefined,
          tabBarBadgeStyle: { backgroundColor: color.saffronBtn, fontFamily: "Nunito_700Bold" },
        }}
      />
    </Tab.Navigator>
  );
}

function App() {
  const [loaded] = useFonts({
    Nunito_700Bold: require("@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf"),
    Nunito_800ExtraBold: require("@expo-google-fonts/nunito/800ExtraBold/Nunito_800ExtraBold.ttf"),
    Mukta_400Regular: require("@expo-google-fonts/mukta/400Regular/Mukta_400Regular.ttf"),
    Mukta_500Medium: require("@expo-google-fonts/mukta/500Medium/Mukta_500Medium.ttf"),
    Mukta_600SemiBold: require("@expo-google-fonts/mukta/600SemiBold/Mukta_600SemiBold.ttf"),
    Mukta_700Bold: require("@expo-google-fonts/mukta/700Bold/Mukta_700Bold.ttf"),
    TiroDevanagariSanskrit_400Regular: require("@expo-google-fonts/tiro-devanagari-sanskrit/400Regular/TiroDevanagariSanskrit_400Regular.ttf"),
  });
  const [mode, setMode] = useState("active");
  if (!loaded) return <Text>Loading fonts</Text>;
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", gap: 6, padding: 4, backgroundColor: "#222" }}>
        {["new", "started", "active"].map((m) => (
          <Pressable key={m} accessibilityRole="button" accessibilityLabel={`Scenario ${m}`} onPress={() => { S = scenario(m); try { localStorage.clear(); localStorage.setItem("shabd.token", "preview"); localStorage.setItem("shabd.onboarded", "true"); } catch {} setMode(m); }}>
            <Text style={{ color: mode === m ? "#F2C879" : "#ddd", padding: 4, fontSize: 12 }}>{m}</Text>
          </Pressable>
        ))}
      </View>
      <View key={mode} style={{ flex: 1 }}>
        <AuthProvider>
          <NavigationContainer>
            <CommunityProvider>
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="MainTabs" component={Tabs} />
                <Stack.Screen name="GroupChat" component={GroupChat as Any} />
                <Stack.Screen name="GroupInfo" component={GroupInfo as Any} />
                <Stack.Screen name="GroupCircles" component={GroupCircles as Any} />
                <Stack.Screen name="GroupPeople" component={GroupPeople as Any} />
                <Stack.Screen name="GroupCard" component={GroupCard as Any} />
                <Stack.Screen name="GroupNew" component={GroupNew as Any} />
                <Stack.Screen name="Friends" component={Placeholder} />
              </Stack.Navigator>
            </CommunityProvider>
          </NavigationContainer>
        </AuthProvider>
      </View>
    </View>
  );
}

registerRootComponent(() => (
  <SafeAreaProvider>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <TypeScaleProvider>
          <App />
        </TypeScaleProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  </SafeAreaProvider>
));
