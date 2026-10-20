import ProfilePhotoEditor from "../components/ProfilePhotoEditor";
import Modal from "../components/AudioModal";
// Settings — its own drawer screen (U8-1). Account, appearance, Learn, sound
// and motion, calendar, help. No mascot, no streak, no gamification: it is
// where things go to be configured, not celebrated.
//
// Owner's pick (2026-10-20, option S1): one plain list on the page, small
// square controls inline, hairline rules between rows, no cards and no
// rounded badges. Appearance opens its own page of square radio rows
// (option S3's Appearance page): Theme, Text size, App language.
//
// The sound, haptics and reduced-motion preferences persist to AsyncStorage so
// the screen is honest: a toggle here changes real behaviour (services/prefs).

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { DrawerNavigationProp } from "@react-navigation/drawer";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
import { getSchemePref, setSchemePref, type SchemePref } from "../services/colorScheme";
import { color, font, outline, space } from "../theme";
import { useTypeScale, type TextSize } from "../hooks/useTypeScale";
import PlaceChooser from "../components/PlaceChooser";
import { getPlace, type Place } from "../services/place";
import { getLang, setLang, t } from "../i18n";
import { ensurePermission, isRemindUnavailable } from "../parva/reminders";
import { applyAppUpdate, checkForAppUpdate } from "../services/ota";
import { useFocusEffect } from "@react-navigation/native";
import { useStoryFlag, setStoryFlag } from "../story/flags";
import { usePanini, setPanini } from "../story/preferences";

const SOUND_KEY = "shabd.pref.sound";
const HAPTICS_KEY = "shabd.pref.haptics";
const MOTION_KEY = "shabd.pref.reducedMotion";

const SCHEMES: { id: SchemePref; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "Match phone" },
];
const SIZES: { id: TextSize; label: string; size: number }[] = [
  { id: "S", label: "Small", size: 13 },
  { id: "M", label: "Medium", size: 15 },
  { id: "L", label: "Large", size: 17 },
  { id: "XL", label: "Extra large", size: 19 },
];

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
  const { logout, deleteAccount } = useAuth();
  const navigation = useNavigation<DrawerNavigationProp<DrawerParamList>>();
  const { textSize, setTextSize } = useTypeScale();
  const storyOn = useStoryFlag();
  const panini = usePanini();
  const [sound, setSound] = useState(true);
  const [hapticsOn, setHapticsOn] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [place, setPlaceState] = useState<Place | null>(null);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [lang, setLangState] = useState<"en" | "hi">(getLang());
  const [scheme, setScheme] = useState<SchemePref>(getSchemePref());
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

  const chooseScheme = (next: SchemePref) => {
    setScheme(next);
    // Restarts into the new palette when what is on screen changes.
    void setSchemePref(next);
  };

  const appearanceSummary = [
    SCHEMES.find((s) => s.id === scheme)?.label,
    SIZES.find((s) => s.id === textSize)?.label,
    lang === "en" ? "English" : "हिन्दी",
  ].filter(Boolean).join(" · ");

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <ProfilePhotoEditor />

        <Heading>Appearance</Heading>
        <LinkRow label="Theme, text size, language" value={appearanceSummary} onPress={() => setAppearanceOpen(true)} />

        <Heading>Learn</Heading>
        <ToggleRow label="New Learn course (preview)" value={storyOn} onChange={(v) => void setStoryFlag(v)} />
        <ToggleRow label="Pāṇini depth" value={panini} onChange={(v) => void setPanini(v)} />

        <Heading>Sound and motion</Heading>
        <ToggleRow
          label="Sound effects"
          value={sound}
          onChange={(v) => {
            setSound(v);
            setSoundEffectsEnabled(v); // U6-2: immediate, respects the toggle
            void setPref(SOUND_KEY, v);
          }}
        />
        <ToggleRow
          label="Haptics"
          value={hapticsOn}
          onChange={(v) => {
            setHapticsOn(v);
            setHapticsEnabled(v);
            void setPref(HAPTICS_KEY, v);
          }}
        />
        <ToggleRow
          label="Reduce motion"
          value={reduced}
          onChange={(v) => {
            setReduced(v);
            setReducedMotionOverride(v);
            void setPref(MOTION_KEY, v);
          }}
        />

        <Heading>Calendar</Heading>
        <LinkRow label="Place" value={place ? place.label : "Not set"} onPress={() => setPlaceOpen(true)} />
        {!remindOff && (
          <LinkRow label={t("parva.remindersRow")} onPress={() => void ensurePermission().then((ok) => setRemindOff(!ok))} />
        )}
        <Text style={styles.note}>Used only for tithi and festival dates. Approximate, kept on this phone.</Text>

        <Heading>Help and about</Heading>
        <LinkRow label="Contact support and safety" onPress={() => void openExternal("mailto:sanskritam@vedicvalor.com")} />
        <LinkRow label="Licences and credits" onPress={openLicences} />
        <LinkRow label="Privacy policy" onPress={openPrivacy} />
        {/* P24: YouTube API Services Developer Policies III.A.1: clients must
            display a link to YouTube's Terms and bind their users to them.
            Lesson videos play in YouTube's own player. */}
        <LinkRow label="YouTube Terms of Service" onPress={() => void openExternal("https://www.youtube.com/t/terms")} />
        <LinkRow
          label={checkingUpdate ? "Checking for updates…" : "Check for updates"}
          value={updateStatus ?? undefined}
          disabled={checkingUpdate}
          chevron={false}
          onPress={checkUpdate}
        />
        {__DEV__ && <LinkRow label="Calibration capture (dev)" onPress={openCalibration} />}
        <Text style={styles.note}>
          Sanskritam is published by Vedic Valor. AI replies can be incorrect: use the flag beside an answer to report harmful or
          inaccurate content. Videos play on YouTube under YouTube's Terms of Service.
        </Text>

        <Heading>Account</Heading>
        <LinkRow label="Sign out" chevron={false} onPress={() => void logout()} />
        <LinkRow
          label={deleting ? "Deleting…" : "Delete account"}
          danger
          chevron={false}
          disabled={deleting}
          onPress={confirmDelete}
        />
      </ScrollView>

      {/* Appearance: option S3's page of square radio rows. */}
      <Modal visible={appearanceOpen} animationType="slide" onRequestClose={() => setAppearanceOpen(false)}>
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <View style={styles.pageHead}>
            <Pressable
              onPress={() => setAppearanceOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Back to settings"
              style={styles.pageBack}
            >
              <Ionicons name="arrow-back" size={22} color={color.ink} />
            </Pressable>
            <Text style={styles.pageTitle}>Appearance</Text>
          </View>
          <ScrollView contentContainerStyle={styles.pageBody}>
            <Heading first>Theme</Heading>
            {SCHEMES.map((s) => (
              <RadioRow key={s.id} label={s.label} on={scheme === s.id} onPress={() => chooseScheme(s.id)} />
            ))}
            <Text style={styles.note}>The app restarts to change its colours. Match phone follows your phone's setting.</Text>

            <Heading>Text size</Heading>
            {SIZES.map((s) => (
              <RadioRow
                key={s.id}
                label={s.label}
                size={s.size}
                sample="नमस्ते"
                on={textSize === s.id}
                onPress={() => setTextSize(s.id)}
              />
            ))}

            <Heading>{t("parva.language")}</Heading>
            {(["en", "hi"] as const).map((l) => (
              <RadioRow
                key={l}
                label={l === "en" ? "English" : "हिन्दी"}
                on={lang === l}
                onPress={() => {
                  setLang(l);
                  setLangState(l);
                }}
              />
            ))}
            <Text style={styles.note}>{t("parva.languageNote")}</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={placeOpen} animationType="slide" onRequestClose={() => setPlaceOpen(false)}>
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <View style={styles.pageHead}>
            <Pressable
              onPress={() => setPlaceOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close place chooser"
              style={styles.pageBack}
            >
              <Ionicons name="close" size={24} color={color.ink} />
            </Pressable>
            <Text style={styles.pageTitle}>Choose your place</Text>
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

function Heading({ children, first = false }: { children: React.ReactNode; first?: boolean }) {
  return (
    <Text style={[styles.heading, first && { marginTop: space.xs }]} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** A square switch: a 40×22 block with a square knob. */
function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={[styles.switch, { backgroundColor: value ? color.saffronBtn : outline, alignItems: value ? "flex-end" : "flex-start" }]}>
        <View style={styles.knob} />
      </View>
    </Pressable>
  );
}

function LinkRow({
  label,
  value,
  onPress,
  chevron = true,
  danger = false,
  disabled = false,
}: {
  label: string;
  value?: string;
  onPress: () => void;
  chevron?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}. ${value}` : label}
      accessibilityState={{ disabled }}
    >
      <Text style={[styles.rowLabel, danger && { color: color.badText }]}>{label}</Text>
      {!!value && (
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      )}
      {chevron && <Ionicons name="chevron-forward" size={16} color={color.inkSoft} />}
    </Pressable>
  );
}

/** A square radio: a 16dp outline, filled with an 8dp square when on. */
function RadioRow({
  label,
  on,
  onPress,
  size,
  sample,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  size?: number;
  sample?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.radioRow, pressed && styles.pressed]}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
    >
      <View style={[styles.radio, { borderColor: on ? color.ink : color.inkSoft }]}>{on && <View style={styles.radioDot} />}</View>
      <Text style={[styles.rowLabel, size ? { fontSize: size } : null]}>{label}</Text>
      {!!sample && <Text style={[styles.sample, size ? { fontSize: size + 3, lineHeight: Math.round((size + 3) * 1.5) } : null]}>{sample}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { paddingHorizontal: 20, paddingTop: space.xs, paddingBottom: 120 },
  heading: {
    fontFamily: "Nunito_800ExtraBold",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: color.inkSoft,
    marginTop: space.lg,
    marginBottom: 4,
  },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 52, borderBottomWidth: 1, borderBottomColor: color.border },
  rowLabel: { flex: 1, fontFamily: "Nunito_700Bold", fontWeight: "700", fontSize: 15, color: color.ink },
  rowValue: { maxWidth: "55%", fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: 13, color: color.inkSoft, textAlign: "right" },
  pressed: { backgroundColor: color.surfaceMuted },
  switch: { width: 40, height: 22, padding: 2, justifyContent: "center" },
  knob: { width: 18, height: 18, backgroundColor: color.white },
  radioRow: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 48, borderBottomWidth: 1, borderBottomColor: color.border },
  radio: { width: 16, height: 16, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 8, height: 8, backgroundColor: color.ink },
  sample: { fontFamily: "Baloo2_500Medium", fontSize: font.sizes.md, color: color.inkSoft },
  note: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: 12.5, lineHeight: 19, color: color.inkSoft, paddingTop: space.xs },
  pageHead: { flexDirection: "row", alignItems: "center", gap: space.xs, height: 52, paddingHorizontal: space.xs },
  pageBack: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  pageTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.ink },
  pageBody: { paddingHorizontal: 20, paddingBottom: 40 },
  placeBody: { flex: 1, paddingHorizontal: space.lg },
});
