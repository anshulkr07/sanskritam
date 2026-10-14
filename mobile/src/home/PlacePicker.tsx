import { Ionicons } from "@react-native-vector-icons/ionicons";
import React from "react";
import { Keyboard, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

import PlaceChooser from "../components/PlaceChooser";
import { useReducedMotion } from "../hooks/useReducedMotion";
import type { Place } from "../services/place";
import { color, font, space } from "../theme";

export default function PlacePicker({ visible, title = "Choose your city", showLocate = true, onPick, onClose }: {
  visible: boolean; title?: string; showLocate?: boolean; onPick: (place: Place) => void; onClose: () => void;
}) {
  const reduced = useReducedMotion();
  const close = () => { Keyboard.dismiss(); onClose(); };
  return (
    <Modal visible={visible} animationType={reduced ? "none" : "slide"} onRequestClose={close}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior="padding" style={styles.body}>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">{title}</Text>
            <Pressable onPress={close} style={styles.close} accessibilityRole="button" accessibilityLabel="Close city picker">
              <Ionicons name="close" size={24} color={color.ink} />
            </Pressable>
          </View>
          <PlaceChooser remember={false} showLocate={showLocate} fillSpace onPick={(place) => { Keyboard.dismiss(); onPick(place); }} />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  body: { flex: 1, paddingHorizontal: space.lg, paddingBottom: space.sm },
  header: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: space.sm },
  title: { flex: 1, fontFamily: "Nunito_800ExtraBold", fontWeight: "800", fontSize: font.sizes.md, color: color.ink },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
});
