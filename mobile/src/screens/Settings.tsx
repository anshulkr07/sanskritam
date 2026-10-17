import ProfilePhotoEditor from "../components/ProfilePhotoEditor";
import ProfileImage from "../components/ProfileImage";
import Modal from "../components/AudioModal";
// Settings — its own drawer screen (U8-1). Account, sound and haptics, reduced
// motion, text size, about. No mascot, no streak, no gamification: it is where
// things go to be configured, not celebrated.
//
// The sound, haptics and reduced-motion preferences persist to AsyncStorage so
// the screen is honest: a toggle here changes real behaviour (services/prefs).

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { IoniconsIconName } from "@react-native-vector-icons/ionicons";
import type { DrawerNavigationProp } from "@react-navigation/drawer";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";

import { useAuth } from "../store/auth";
import type { DrawerParamList } from "../navigation/AppDrawer";
import { setSoundEffectsEnabled } from "../services/sfx";
import {
  isHapticsEnabled,
  isReducedMotionOverride,
  loadPrefs,
  setHapticsEnabled,
  setReducedMotionOverride,
} from "../services/prefs";
import { accent, color, font, radius, shadow, space, type AccentName } from "../theme";
import { useTypeScale, type TextSize } from "../hooks/useTypeScale";
import { firstName } from "../utils/name";
import PlaceChooser from "../components/PlaceChooser";
import { getPlace, type Place } from "../services/place";
import { getLang, setLang, t } from "../i18n";
import { ensurePermission, isRemindUnavailable } from "../parva/reminders";
import { applyAppUpdate, checkForAppUpdate } from "../services/ota";
import { useFocusEffect } from "@react-navigation/native";

const SOUND_KEY = "shabd.pref.sound";
const HAPTICS_KEY = "shabd.pref.haptics";
const MOTION_KEY = "shabd.pref.reducedMotion";

function pref(key: string): Promise<boolean> {
  return AsyncStorage.getItem(key).then((v) => v !== "false");
}
function setPref(key: string, v: boolean): Promise<void> {
  return AsyncStorage.setItem(key, v ? "true" : "false");
}

/** Open a page in the in-app browser, falling back to the system one. */
async function openExternal(url: string): Promise<void> {
  try {
    // createTask false: the tab opens on top of the app, not through
    // expo-web-browser's transparent proxy activity. With the proxy, a
    // hardware back left the app dead to touch until a second back (owner's
    // report, 2026-10-05; the proxy is the suspected cause).
    await WebBrowser.openBrowserAsync(url, { createTask: false });
  } catch {
    try {
      await Linking.openURL(url);
    } catch {
      /* no browser available: the row stays, the link waits */
    }
  }
}

export default function SettingsScreen() {
  const { learner, logout, deleteAccount, displayName } = useAuth();
  const navigation = useNavigation<DrawerNavigationProp<DrawerParamList>>();
  const { textSize, setTextSize } = useTypeScale();
  const [sound, setSound] = useState(true);
  const [hapticsOn, setHapticsOn] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [place, setPlaceState] = useState<Place | null>(null);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [lang, setLangState] = useState<"en" | "hi">(getLang());
  const [remindOff, setRemindOff] = useState(false);

  useEffect(() => {
    pref(SOUND_KEY).then(setSound);
    loadPrefs().then(() => {
      setHapticsOn(isHapticsEnabled());
      setReduced(isReducedMotionOverride());
    });
    void getPlace().then(setPlaceState);
    void isRemindUnavailable().then(setRemindOff);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void getPlace().then(setPlaceState);
      return () => {};
    }, []),
  );

  const name = firstName(learner?.display_name || displayName);

  // Google Play requires account deletion inside the app. It cannot be
  // undone, so it asks first; on success the auth store resets to Login.
  const confirmDelete = () => {
    Alert.alert("Delete your account?", "This permanently deletes your progress and conversations. It can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteAccount();
          } catch {
            setDeleting(false);
            Alert.alert("Couldn't delete your account", "Check your connection and try again.");
          }
        },
      },
    ]);
  };

  // Licences and the privacy policy are drawer screens, next to this one.
  const openLicences = () => navigation.navigate("Licences");
  const openPrivacy = () => navigation.navigate("Privacy");

  // Calibration capture: dev builds only — the recitation-rubric study (§8).
  // Calibration lives on the root stack (dev builds only, §8).
  const openCalibration = () =>
    (navigation as never as { navigate: (r: string) => void }).navigate("Calibration");

  // Manual OTA check. The app also checks on every launch and downloads in
  // the background; this row is for the learner who wants it now.
  const checkUpdate = () => {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    setUpdateStatus(null);
    void checkForAppUpdate().then((res) => {
      setCheckingUpdate(false);
      if (res === "ready") {
        Alert.alert("Update ready", "A new version was downloaded. Restart now to apply it?", [
          { text: "Later", style: "cancel" },
          { text: "Restart", onPress: () => void applyAppUpdate() },
        ]);
      } else if (res === "uptodate") {
        setUpdateStatus("You are up to date.");
      } else {
        setUpdateStatus("Updates are not available in this build.");
      }
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Section title="Account">
          <View style={styles.who}>
            <View style={[styles.avatar, { overflow: "hidden" }]}>
              {name ? (
                <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
              ) : (
                <Ionicons name="person" size={22} color={color.white} />
              )}
              <ProfileImage uri={learner?.avatar_url} />
            </View>
            <Text style={styles.whoName} numberOfLines={1}>
              {name || "Friend"}
            </Text>
          </View>
          <ProfilePhotoEditor />
          <LinkRow icon="log-out-outline" tone="rose" label="Sign out" onPress={() => void logout()} />
          <LinkRow
            icon="trash-outline"
            tone="rose"
            label={deleting ? "Deleting…" : "Delete account"}
            danger
            disabled={deleting}
            onPress={confirmDelete}
          />
        </Section>

        <Section title="Help and safety">
          <Text style={styles.note}>Sanskritam is published by Vedic Valor. AI replies can be incorrect. Use the flag beside an answer to report harmful or inaccurate content. Our safety reviewer checks reports daily.</Text>
          <LinkRow icon="mail-outline" tone="sage" label="Contact support and safety" onPress={() => void openExternal("mailto:sanskritam@vedicvalor.com")} />
        </Section>
        <Section title="Sound and haptics">
          <ToggleRow
            icon="volume-high"
            tone="teal"
            label="Sound effects"
            value={sound}
            onChange={(v) => {
              setSound(v);
              setSoundEffectsEnabled(v); // U6-2: immediate, respects the toggle
              void setPref(SOUND_KEY, v);
            }}
          />
          <ToggleRow
            icon="phone-portrait"
            tone="sage"
            label="Haptics"
            value={hapticsOn}
            onChange={(v) => {
              setHapticsOn(v);
              setHapticsEnabled(v);
              void setPref(HAPTICS_KEY, v);
            }}
          />
        </Section>

        <Section title="Motion">
          <ToggleRow
            icon="accessibility"
            tone="slate"
            label="Reduce motion"
            value={reduced}
            onChange={(v) => {
              setReduced(v);
              setReducedMotionOverride(v);
              void setPref(MOTION_KEY, v);
            }}
          />
        </Section>

        {/* Text size (U5-2): scales the app's own type ramp independently of
            the OS; XL targets elder mode. */}
        <Section title="Text size">
          <View style={styles.sizerRow}>
            {(["S", "M", "L", "XL"] as const).map((s) => {
              const on = textSize === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => setTextSize(s as TextSize)}
                  style={[styles.sizer, on && styles.sizerOn]}
                  accessibilityRole="button"
                  accessibilityLabel={`Text size ${s}`}
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.sizerText, on && styles.sizerTextOn]}>{s}</Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title={t("parva.language")}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t("parva.language")}</Text>
            {(["en", "hi"] as const).map((l) => (
              <Pressable
                key={l}
                onPress={() => {
                  setLang(l);
                  setLangState(l);
                }}
                style={[styles.sizer, lang === l && styles.sizerOn]}
                accessibilityRole="button"
                accessibilityLabel={l === "en" ? "English" : "हिन्दी"}
                accessibilityState={{ selected: lang === l }}
              >
                <Text style={[styles.sizerText, lang === l && styles.sizerTextOn]}>{l === "en" ? "English" : "हिन्दी"}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.note}>{t("parva.languageNote")}</Text>
          {!remindOff && (
            <Pressable
              onPress={() => void ensurePermission().then((ok) => setRemindOff(!ok))}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              accessibilityLabel={t("parva.remindersRow")}
            >
              <Text style={styles.rowLabel}>{t("parva.remindersRow")}</Text>
              <Ionicons name="chevron-forward" size={18} color={color.inkFaint} />
            </Pressable>
          )}
        </Section>

        <Section title="Place">
          <Pressable
            onPress={() => setPlaceOpen(true)}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
            accessibilityLabel={`Place. ${place ? place.label : "Not set"}`}
          >
            <View style={[styles.badge, { backgroundColor: accent.teal.bg }]}>
              <Ionicons name="location-outline" size={18} color={accent.teal.fg} />
            </View>
            <Text style={styles.rowLabel}>Place</Text>
            <Text style={styles.placeValue} numberOfLines={1}>
              {place ? place.label : "Not set"}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={color.inkFaint} />
          </Pressable>
          <Text style={styles.note}>Used only for tithi and festival dates. Approximate, kept on this phone.</Text>
        </Section>

        <Section title="About">
          <LinkRow icon="document-text-outline" tone="gold" label="Licences and credits" chevron onPress={openLicences} />
          <LinkRow
            icon="cloud-download-outline"
            tone="slate"
            label={checkingUpdate ? "Checking for updates…" : "Check for updates"}
            disabled={checkingUpdate}
            onPress={checkUpdate}
          />
          {!!updateStatus && <Text style={styles.note}>{updateStatus}</Text>}
          <LinkRow
            icon="shield-checkmark-outline"
            tone="teal"
            label="Privacy policy"
            chevron
            onPress={openPrivacy}
          />
          {__DEV__ && (
            <LinkRow
              icon="mic-outline"
              tone="sage"
              label="Calibration capture (dev)"
              chevron
              onPress={openCalibration}
            />
          )}
          {/* P24: YouTube API Services Developer Policies III.A.1: clients must
              display a link to YouTube's Terms and bind their users to them.
              Lesson videos play in YouTube's own player. */}
          <LinkRow
            icon="logo-youtube"
            tone="rose"
            label="YouTube Terms of Service"
            chevron
            onPress={() => void openExternal("https://www.youtube.com/t/terms")}
          />
          <Text style={styles.note}>Videos play on YouTube under YouTube's Terms of Service.</Text>
        </Section>
      </ScrollView>

      <Modal visible={placeOpen} animationType="slide" onRequestClose={() => setPlaceOpen(false)}>
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <View style={styles.placeHead}>
            <Pressable
              onPress={() => setPlaceOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close place chooser"
              style={styles.placeClose}
            >
              <Ionicons name="close" size={24} color={color.ink} />
            </Pressable>
            <Text style={styles.placeTitle}>Choose your place</Text>
          </View>
          <View style={styles.placeBody}>
            <PlaceChooser
              onPick={(p) => {
                setPlaceState(p);
                setPlaceOpen(false);
              }}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Pieces ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function IconBadge({ icon, tone }: { icon: IoniconsIconName; tone: AccentName }) {
  return (
    <View style={[styles.badge, { backgroundColor: accent[tone].bg }]}>
      <Ionicons name={icon} size={18} color={accent[tone].fg} />
    </View>
  );
}

function ToggleRow({
  icon,
  tone,
  label,
  value,
  onChange,
}: {
  icon: IoniconsIconName;
  tone: AccentName;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <IconBadge icon={icon} tone={tone} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: color.saffronBtn, false: color.border }}
        thumbColor={color.white}
        accessibilityLabel={label}
      />
    </View>
  );
}

function LinkRow({
  icon,
  tone,
  label,
  onPress,
  chevron = false,
  danger = false,
  disabled = false,
}: {
  icon: IoniconsIconName;
  tone: AccentName;
  label: string;
  onPress: () => void;
  chevron?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <IconBadge icon={icon} tone={tone} />
      <Text style={[styles.rowLabel, danger && { color: color.badText }]}>{label}</Text>
      {chevron && <Ionicons name="chevron-forward" size={18} color={color.inkFaint} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: 120 },
  section: { marginBottom: space.lg },
  sectionTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.ink, marginBottom: space.xs },
  card: { backgroundColor: color.surface, borderRadius: radius.lg, paddingHorizontal: space.md, paddingVertical: space.xs, ...shadow.card },
  who: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: space.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.saffronBtn, alignItems: "center", justifyContent: "center" },
  avatarLetter: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.white },
  whoName: { flex: 1, fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.ink },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 56 },
  rowLabel: { flex: 1, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: font.sizes.base, color: color.ink },
  placeValue: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.sm, color: color.inkSoft, maxWidth: 140, textAlign: "right" },
  placeHead: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
  placeClose: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  placeTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.ink },
  placeBody: { flex: 1, paddingHorizontal: space.lg },
  badge: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sizerRow: { flexDirection: "row", gap: space.xs, paddingVertical: space.sm },
  sizer: { flex: 1, minHeight: 48, borderRadius: radius.md, backgroundColor: color.surfaceMuted, alignItems: "center", justifyContent: "center" },
  sizerOn: { backgroundColor: color.saffronBtn },
  sizerText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: color.inkSoft },
  sizerTextOn: { color: color.white },
  note: { fontFamily: "Nunito_500Medium", fontWeight: "500", fontSize: font.sizes.xs, color: color.inkSoft, paddingBottom: space.sm },
});
