import Modal from "./AudioModal";
// Dropdown — a field that opens a sheet of options, in JavaScript.
//
// A native date picker would need a new Play build, and the birth details
// form must go out over the air. So this is a React Native Modal sheet with
// a FlatList: 48dp rows, getItemLayout, initialScrollIndex on the current
// value. The field looks like the form's other inputs (44dp, 1.5dp outline,
// white, the value or a placeholder). Each option has role button and
// selected state. The sheet has a Close button; animationType is none under
// Reduce Motion.

import React, { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";

import { haptics } from "../services/haptics";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { color, font, onFill, fill, outline, space } from "../theme";

export default function Dropdown({
  value,
  placeholder,
  label,
  options,
  onPick,
  disabled = false,
  showOptionLabel = false,
}: {
  value: string;
  placeholder: string;
  /** Accessibility label for the field and the sheet. */
  label: string;
  options: { value: string; label: string }[];
  onPick: (value: string) => void;
  disabled?: boolean;
  /** Home form displays the readable label with a dropdown chevron. */
  showOptionLabel?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const current = options.findIndex((o) => o.value === value);
  const shown = showOptionLabel && current >= 0 ? options[current].label : value;

  return (
    <>
      <Pressable
        onPress={() => {
          haptics.tap();
          setOpen(true);
        }}
        disabled={disabled}
        style={[styles.field, showOptionLabel && styles.homeField, disabled && styles.off]}
        accessibilityRole="button"
        accessibilityLabel={value ? `${label}: ${shown}` : `${label}: ${placeholder}`}
        accessibilityState={{ disabled }}
      >
        <Text style={[styles.fieldText, showOptionLabel && styles.homeFieldText, !value && styles.hint]}>{shown || placeholder}</Text>
        {showOptionLabel && <Ionicons name="chevron-down" size={14} color={color.inkSoft} />}
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType={reduced ? "none" : "slide"}
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.backdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={`Close ${label}`}
          />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle} accessibilityRole="header">
              {label}
            </Text>
            <FlatList
              data={options}
              keyExtractor={(o) => o.value}
              getItemLayout={(_, index) => ({ length: 48, offset: 48 * index, index })}
              initialScrollIndex={current >= 0 ? current : 0}
              renderItem={({ item }) => {
                const on = item.value === value;
                return (
                  <Pressable
                    onPress={() => {
                      haptics.tap();
                      onPick(item.value);
                      setOpen(false);
                    }}
                    style={[styles.row, on && styles.rowOn]}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[styles.rowText, on && styles.rowTextOn]}>{item.label}</Text>
                  </Pressable>
                );
              }}
              style={styles.list}
            />
            <Pressable
              onPress={() => setOpen(false)}
              style={styles.close}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 44,
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: outline,
    borderRadius: 12,
    backgroundColor: color.white,
    paddingHorizontal: space.sm,
    minWidth: 64,
  },
  fieldText: {
    fontFamily: "Nunito_700Bold",
    fontSize: font.sizes.base,
    color: color.ink,
    textAlign: "center",
  },
  hint: { color: color.inkFaint },
  homeField: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4, borderRadius: 8, minHeight: 48, minWidth: 0 },
  homeFieldText: { flexShrink: 1, textAlign: "left" },
  off: { opacity: 0.4 },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(59,46,37,0.45)" },
  sheet: { maxHeight: "70%", backgroundColor: color.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: space.md },
  sheetTitle: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.base, color: color.ink, marginBottom: space.xs },
  list: { flexGrow: 0 },
  row: { minHeight: 48, justifyContent: "center", paddingHorizontal: space.sm, borderRadius: 8 },
  rowOn: { backgroundColor: fill.ink },
  rowText: { fontFamily: "Nunito_600SemiBold", fontWeight: "600", fontSize: font.sizes.base, color: color.ink },
  rowTextOn: { color: onFill.text },
  close: { minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: space.xs },
  closeText: { fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.sm, color: color.saffronText },
});
