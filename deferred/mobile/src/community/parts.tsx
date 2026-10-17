import Modal from "../components/AudioModal";
// Group's small parts, in Learn and Read's square look: buttons, avatars,
// circle seals, section heads, empty states, bottom sheets and form fields.
// One action colour; a deep fill only where something is a person, a circle
// or live; cream type on every fill.

import { Ionicons, type IoniconsIconName } from "@react-native-vector-icons/ionicons";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ProfileImage from "../components/ProfileImage";
import { useAuth } from "../store/auth";
import { haptics } from "../services/haptics";
import { CREAM, CREAM_FAINT, T, fillFor, initials, sa, ui } from "./look";

// ─── Buttons ────────────────────────────────────────────────────────────────

type BtnKind = "primary" | "outline" | "quiet" | "danger" | "cream";

export function Btn({
  label,
  onPress,
  kind = "primary",
  icon,
  small = false,
  disabled = false,
  busy = false,
  style,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  kind?: BtnKind;
  icon?: IoniconsIconName;
  small?: boolean;
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const off = disabled || busy;
  const tone = BTN[kind];
  return (
    <Pressable
      onPress={() => {
        if (off) return;
        haptics.tap();
        onPress();
      }}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: off, busy }}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        tone.box,
        disabled && styles.btnOff,
        pressed && !off && styles.pressed,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={tone.text} />
      ) : icon ? (
        <Ionicons name={icon} size={small ? 16 : 18} color={tone.text} />
      ) : null}
      <Text style={[small ? styles.btnTextSmall : styles.btnText, { color: tone.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const BTN: Record<BtnKind, { box: ViewStyle; text: string }> = {
  primary: { box: { backgroundColor: T.action }, text: T.white },
  outline: { box: { borderWidth: 1.5, borderColor: T.ink, backgroundColor: "transparent" }, text: T.ink },
  quiet: { box: { paddingHorizontal: 6 }, text: T.action },
  danger: { box: { borderWidth: 1.5, borderColor: T.wrong, backgroundColor: "transparent" }, text: T.wrongInk },
  cream: { box: { backgroundColor: CREAM }, text: T.ink },
};

export function IconBtn({
  icon,
  label,
  onPress,
  color = T.ink,
  filled = false,
  size = 44,
  disabled = false,
  badge = 0,
}: {
  icon: IoniconsIconName;
  label: string;
  onPress: () => void;
  color?: string;
  filled?: boolean;
  size?: number;
  disabled?: boolean;
  badge?: number;
}) {
  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        haptics.tap();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={badge > 0 ? `${label}, ${badge} new` : label}
      accessibilityState={{ disabled }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.iconBtn,
        { width: size, height: size },
        filled && { backgroundColor: T.action },
        disabled && styles.btnOff,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={22} color={filled ? T.white : color} />
      {badge > 0 ? (
        <View style={styles.iconBadge}>
          <Badge n={badge} />
        </View>
      ) : null}
    </Pressable>
  );
}

// ─── People and circles ─────────────────────────────────────────────────────

/** A person: their deep fill, their initials, and a green corner when online. */
export function Avatar({
  id,
  name,
  size = 44,
  online = false,
  avatarUrl,
}: {
  id: string;
  name: string;
  size?: number;
  online?: boolean;
  avatarUrl?: string | null;
}) {
  const { learner } = useAuth();
  const photo = id === learner?.id ? learner.avatar_url : avatarUrl;
  return (
    <View
      style={[styles.mark, { width: size, height: size, backgroundColor: fillFor(id) }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={[styles.initials, { fontSize: Math.round(size * 0.38) }]} numberOfLines={1}>
        {initials(name)}
      </Text>
      <ProfileImage uri={photo} />
      {online ? <View style={[styles.online, { width: Math.max(10, size * 0.26), height: Math.max(10, size * 0.26) }]} /> : null}
    </View>
  );
}

/** A circle: a seal, its fill with an inner frame and the name's first letter. */
export function CircleMark({ id, name, size = 44 }: { id: string; name: string; size?: number }) {
  const first = Array.from(name.trim())[0] ?? "?";
  const deva = /[ऀ-ॿ]/.test(first);
  return (
    <View
      style={[styles.mark, { width: size, height: size, backgroundColor: fillFor(id) }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.seal, { top: size * 0.1, left: size * 0.1, right: size * 0.1, bottom: size * 0.1 }]} />
      <Text
        style={
          deva
            ? [sa(Math.round(size * 0.42)), { color: CREAM, lineHeight: Math.round(size * 0.62) }]
            : [styles.initials, { fontSize: Math.round(size * 0.42) }]
        }
      >
        {deva ? first : first.toUpperCase()}
      </Text>
    </View>
  );
}

/** A square count: unread messages, waiting requests. */
export function Badge({ n, style }: { n: number; style?: StyleProp<ViewStyle> }) {
  if (n <= 0) return null;
  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.badgeText}>{n > 99 ? "99+" : n}</Text>
    </View>
  );
}

export function LiveTag({ light = false }: { light?: boolean }) {
  return (
    <View style={[styles.live, light && { borderColor: CREAM }]}>
      <View style={[styles.liveDot, light && { backgroundColor: CREAM }]} />
      <Text style={[styles.liveText, light && { color: CREAM }]}>LIVE</Text>
    </View>
  );
}

// ─── Text and sections ──────────────────────────────────────────────────────

export function Overline({ text, color = T.ink3, style }: { text: string; color?: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.overline, { color }, style]}>{text.toUpperCase()}</Text>;
}

export function SectionHead({
  title,
  link,
  onLink,
  style,
}: {
  title: string;
  link?: string;
  onLink?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.sectionHead, style]}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {link && onLink ? (
        <Pressable
          onPress={() => {
            haptics.tap();
            onLink();
          }}
          accessibilityRole="button"
          hitSlop={10}
          style={styles.sectionLinkBox}
        >
          <Text style={styles.sectionLink}>{link}</Text>
          <Ionicons name="chevron-forward" size={14} color={T.action} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** A quiet "nothing here yet" with what to do about it. */
export function Empty({
  icon,
  title,
  text,
  children,
  style,
}: {
  icon: IoniconsIconName;
  title: string;
  text: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.empty, style]}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={24} color={T.ink2} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
      {children ? <View style={styles.emptyActions}>{children}</View> : null}
    </View>
  );
}

/** An error line with a way to try again. */
export function Notice({ text, onRetry, style }: { text: string; onRetry?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.notice, style]} accessibilityRole="alert">
      <Ionicons name="alert-circle-outline" size={20} color={T.wrongInk} />
      <Text style={styles.noticeText}>{text}</Text>
      {onRetry ? <Btn label="Retry" kind="quiet" small onPress={onRetry} /> : null}
    </View>
  );
}

// ─── Screens ────────────────────────────────────────────────────────────────

/** The bar on Group's stacked screens: back, a title, and room on the right. */
export function ScreenHeader({
  title,
  sub,
  onBack,
  right,
}: {
  title: string;
  sub?: string;
  onBack: () => void;
  right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
      <IconBtn icon="chevron-back" label="Back" onPress={onBack} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.headerTitle} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {sub ? (
          <Text style={styles.headerSub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

// ─── Sheets ─────────────────────────────────────────────────────────────────

export function Sheet({
  visible,
  onClose,
  title,
  sub,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  sub?: string;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]} accessibilityViewIsModal>
          <View style={styles.handle} />
          {title ? (
            <Text style={styles.sheetTitle} accessibilityRole="header">
              {title}
            </Text>
          ) : null}
          {sub ? <Text style={styles.sheetSub}>{sub}</Text> : null}
          <ScrollView bounces={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingTop: title ? 8 : 0 }}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** One row of an action sheet. */
export function SheetRow({
  icon,
  label,
  detail,
  onPress,
  tone = "ink",
  disabled = false,
}: {
  icon: IoniconsIconName;
  label: string;
  detail?: string;
  onPress: () => void;
  tone?: "ink" | "action" | "danger";
  disabled?: boolean;
}) {
  const color = tone === "danger" ? T.wrongInk : tone === "action" ? T.action : T.ink;
  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        haptics.tap();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.sheetRow, disabled && styles.btnOff, pressed && !disabled && { backgroundColor: T.surface }]}
    >
      <Ionicons name={icon} size={22} color={color} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.sheetRowLabel, { color }]}>{label}</Text>
        {detail ? <Text style={styles.sheetRowDetail}>{detail}</Text> : null}
      </View>
    </Pressable>
  );
}

/** Are you sure? For anything that cannot be taken back. */
export function Confirm({
  visible,
  title,
  body,
  confirm,
  danger = false,
  busy = false,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  body: string;
  confirm: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <Text style={styles.confirmBody}>{body}</Text>
      <View style={styles.confirmRow}>
        <Btn label="Cancel" kind="outline" onPress={onClose} style={{ flex: 1 }} disabled={busy} />
        <Btn
          label={confirm}
          onPress={onConfirm}
          busy={busy}
          style={[{ flex: 1 }, danger && { backgroundColor: T.wrong }]}
        />
      </View>
    </Sheet>
  );
}

// ─── Forms ──────────────────────────────────────────────────────────────────

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  max,
  multiline = false,
  hint,
  autoFocus = false,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  max: number;
  multiline?: boolean;
  hint?: string;
  autoFocus?: boolean;
}) {
  const near = value.length > max * 0.8;
  return (
    <View style={styles.field}>
      <View style={styles.fieldTop}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {near ? <Text style={styles.fieldCount}>{max - value.length} left</Text> : null}
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={T.ink3}
        maxLength={max}
        multiline={multiline}
        autoFocus={autoFocus}
        accessibilityLabel={label}
        style={[styles.input, multiline && styles.inputMulti]}
        textAlignVertical={multiline ? "top" : "center"}
      />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

/** One choice among a few, as square rows with a mark. */
export function Choice<K extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: { key: K; title: string; sa?: string; hint?: string }[];
  value: K;
  onChange: (k: K) => void;
}) {
  return (
    <View style={styles.field} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={styles.choices}>
        {options.map((o) => {
          const on = o.key === value;
          return (
            <Pressable
              key={o.key}
              onPress={() => {
                haptics.tap();
                onChange(o.key);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={[o.title, o.hint].filter(Boolean).join(". ")}
              style={[styles.choice, on && styles.choiceOn]}
            >
              <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
              <View style={{ flex: 1 }}>
                <Text style={styles.choiceTitle}>
                  {o.title}
                  {o.sa ? <Text style={styles.choiceSa}>{"  " + o.sa}</Text> : null}
                </Text>
                {o.hint ? <Text style={styles.choiceHint}>{o.hint}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** A row of square filter chips that scrolls sideways. */
export function Chips<K extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsBox}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => {
              haptics.tap();
              onChange(o.key);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <View style={styles.search}>
      <Ionicons name="search" size={18} color={T.ink3} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={T.ink3}
        accessibilityLabel={placeholder}
        style={styles.searchInput}
        returnKeyType="search"
        autoCorrect={false}
      />
      {value ? <IconBtn icon="close" label="Clear search" onPress={() => onChange("")} size={36} color={T.ink2} /> : null}
    </View>
  );
}

export const groupStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: T.paper },
  body: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
  card: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.line },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rule: { height: 1, backgroundColor: T.line },
  name: { ...ui("semibold"), fontSize: 16, lineHeight: 21, color: T.ink },
  meta: { ...ui("regular"), fontSize: 13.5, lineHeight: 19, color: T.ink3 },
  body15: { ...ui("regular"), fontSize: 15, lineHeight: 22, color: T.ink2 },
});

const styles = StyleSheet.create({
  btn: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16 },
  btnSmall: { minHeight: 40, paddingHorizontal: 12, gap: 6 },
  btnText: { ...ui("semibold"), fontSize: 15.5 },
  btnTextSmall: { ...ui("semibold"), fontSize: 14 },
  btnOff: { opacity: 0.45 },
  pressed: { opacity: 0.82 },
  iconBtn: { alignItems: "center", justifyContent: "center" },
  iconBadge: { position: "absolute", top: 2, right: 0 },
  mark: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  seal: { position: "absolute", borderWidth: 1, borderColor: CREAM_FAINT },
  initials: { ...ui("bold"), color: CREAM, letterSpacing: 0.5 },
  online: { position: "absolute", right: 0, bottom: 0, backgroundColor: T.done, borderWidth: 2, borderColor: T.surface },
  badge: { minWidth: 22, height: 22, paddingHorizontal: 5, alignItems: "center", justifyContent: "center", backgroundColor: T.action },
  badgeText: { ...ui("bold"), fontSize: 12.5, lineHeight: 16, color: T.white, fontVariant: ["tabular-nums"] },
  live: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 6, height: 22, borderWidth: 1, borderColor: T.wrong },
  liveDot: { width: 7, height: 7, backgroundColor: T.wrong },
  liveText: { ...ui("bold"), fontSize: 11, letterSpacing: 1.2, color: T.wrongInk },
  overline: { ...ui("bold"), fontSize: 12, letterSpacing: 1.3 },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 36 },
  sectionTitle: { ...ui("bold"), fontSize: 19, lineHeight: 25, color: T.ink, flexShrink: 1 },
  sectionLinkBox: { flexDirection: "row", alignItems: "center", gap: 2, minHeight: 36 },
  sectionLink: { ...ui("semibold"), fontSize: 14.5, color: T.action },
  empty: { alignItems: "center", paddingVertical: 28, paddingHorizontal: 20, gap: 8 },
  emptyIcon: { width: 52, height: 52, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: T.lineStrong, marginBottom: 4 },
  emptyTitle: { ...ui("bold"), fontSize: 17, color: T.ink, textAlign: "center" },
  emptyText: { ...ui("regular"), fontSize: 14.5, lineHeight: 21, color: T.ink2, textAlign: "center", maxWidth: 320 },
  emptyActions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 10 },
  notice: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, backgroundColor: T.wrongBg, borderLeftWidth: 3, borderLeftColor: T.wrong },
  noticeText: { ...ui("medium"), flex: 1, fontSize: 14, lineHeight: 20, color: T.wrongInk },
  header: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 6, paddingBottom: 6, backgroundColor: T.paper, borderBottomWidth: 1, borderBottomColor: T.line },
  headerTitle: { ...ui("bold"), fontSize: 18, lineHeight: 24, color: T.ink },
  headerSub: { ...ui("regular"), fontSize: 13, lineHeight: 18, color: T.ink3 },
  scrim: { flex: 1, justifyContent: "flex-end", backgroundColor: T.scrim },
  sheet: { backgroundColor: T.paper, paddingHorizontal: 20, paddingTop: 10, maxHeight: "88%" },
  handle: { alignSelf: "center", width: 40, height: 4, backgroundColor: T.lineStrong, marginBottom: 12 },
  sheetTitle: { ...ui("bold"), fontSize: 19, lineHeight: 25, color: T.ink },
  sheetSub: { ...ui("regular"), fontSize: 14, lineHeight: 20, color: T.ink2, marginTop: 2 },
  sheetRow: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 56, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.line },
  sheetRowLabel: { ...ui("semibold"), fontSize: 16, lineHeight: 21 },
  sheetRowDetail: { ...ui("regular"), fontSize: 13.5, lineHeight: 19, color: T.ink3 },
  confirmBody: { ...ui("regular"), fontSize: 15.5, lineHeight: 23, color: T.ink2, marginBottom: 18 },
  confirmRow: { flexDirection: "row", gap: 10 },
  field: { gap: 6 },
  fieldTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  fieldLabel: { ...ui("semibold"), fontSize: 15, color: T.ink },
  fieldCount: { ...ui("regular"), fontSize: 12.5, color: T.ink3 },
  fieldHint: { ...ui("regular"), fontSize: 13, lineHeight: 18, color: T.ink3 },
  input: {
    ...ui("regular"),
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: T.ink,
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.lineStrong,
  },
  inputMulti: { minHeight: 96, paddingTop: 12 },
  choices: { borderTopWidth: 1, borderTopColor: T.line },
  choice: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: T.line, borderLeftWidth: 3, borderLeftColor: "transparent" },
  choiceOn: { backgroundColor: T.surface, borderLeftColor: T.action },
  radio: { width: 20, height: 20, borderWidth: 1.5, borderColor: T.ink2, alignItems: "center", justifyContent: "center" },
  radioOn: { borderColor: T.action },
  radioDot: { width: 10, height: 10, backgroundColor: T.action },
  choiceTitle: { ...ui("semibold"), fontSize: 15.5, lineHeight: 21, color: T.ink },
  choiceSa: { fontFamily: "TiroDevanagariSanskrit_400Regular", fontWeight: "400", fontSize: 15, color: T.ink2 },
  choiceHint: { ...ui("regular"), fontSize: 13.5, lineHeight: 19, color: T.ink3 },
  chipsBox: { marginHorizontal: -16, flexGrow: 0 },
  chips: { gap: 8, paddingHorizontal: 16 },
  chip: { minHeight: 36, paddingHorizontal: 12, justifyContent: "center", borderWidth: 1.5, borderColor: T.lineStrong, backgroundColor: T.paper },
  chipOn: { backgroundColor: T.ink, borderColor: T.ink },
  chipText: { ...ui("medium"), fontSize: 14, color: T.ink },
  chipTextOn: { color: T.paper },
  search: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 48, paddingLeft: 12, backgroundColor: T.surface, borderWidth: 1.5, borderColor: T.lineStrong },
  searchInput: { ...ui("regular"), flex: 1, minHeight: 44, fontSize: 16, color: T.ink },
});
