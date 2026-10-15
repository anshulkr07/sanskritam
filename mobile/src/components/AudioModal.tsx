import React from "react";
import { Modal, type ModalProps } from "react-native";
import FloatingAudioBar from "./FloatingAudioBar";

/** Native modals own a separate window and cover the app's shared transport. */
export default function AudioModal(props: ModalProps) {
  return <Modal {...props}>{props.children}<FloatingAudioBar atTop /></Modal>;
}
