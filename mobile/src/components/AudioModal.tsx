import React from "react";
import { Modal, Platform, type ModalProps } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import FloatingAudioBar from "./FloatingAudioBar";

/** Native modals own a separate window and cover the app's shared transport. */
export default function AudioModal({ children, showAudio = true, ...props }: ModalProps & { showAudio?: boolean }) {
  const android = Platform.OS === "android";
  return (
    <Modal {...props} statusBarTranslucent={android || props.statusBarTranslucent}
      navigationBarTranslucent={android || props.navigationBarTranslucent}>
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1 }} edges={android && !props.statusBarTranslucent
          ? ["top", "bottom", "left", "right"] : ["bottom", "left", "right"]}>
          {/* Absolute sheets and their local insets start inside the safe frame. */}
          <SafeAreaProvider>
            {children}
            {showAudio && <FloatingAudioBar atTop />}
          </SafeAreaProvider>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
