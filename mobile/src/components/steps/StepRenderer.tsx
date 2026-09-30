// StepRenderer — one renderer per step kind (U15-2).
//
// | kind          | reuses                                  |
// |---------------|-----------------------------------------|
// | explain       | prose block (≤120 words)                |
// | grid_fill     | Paradigm + VisualGrid, made writable    |
// | derive_next   | DerivationPlayer + SutraCard            |
// | sandhi_split  | SandhiVisual's machine, as choices      |
// | sandhi_join   | SandhiVisual's machine, as choices      |
// | scan_metre    | ScansionStrip, made writable            |
// | reorder       | WordOrder, with the drag it was missing |
// | contrast      | two forms, pick the role (new, small)   |
// | build         | WordBank, as ungraded practice          |
// | articulate    | VocalTract, as ungraded practice        |
// | read          | passage card, as ungraded practice      |
//
// build/articulate/read are practice, never assessment: the backend no-ops
// their attempts (correct, graded False — PRACTICE_KINDS), so these
// renderers never produce a gradable answer, only a completion signal.

import React from "react";
import { Text } from "react-native";

import type { LessonStep } from "../../api/client";
import ArticulateStep from "./ArticulateStep";
import BuildStep from "./BuildStep";
import ContrastStep from "./ContrastStep";
import DeriveNextStep from "./DeriveNextStep";
import ExplainStep from "./ExplainStep";
import GridFillStep from "./GridFillStep";
import ReadStep from "./ReadStep";
import ReorderStep from "./ReorderStep";
import SandhiStep from "./SandhiStep";
import ScanMetreStep from "./ScanMetreStep";
import type { StepInputProps } from "./types";

export default function StepRenderer(props: StepInputProps) {
  const kind: string = props.step.kind;
  switch (kind) {
    case "explain":
      return <ExplainStep {...props} />;
    case "grid_fill":
      return <GridFillStep {...props} />;
    case "derive_next":
      return <DeriveNextStep {...props} />;
    case "sandhi_split":
    case "sandhi_join":
      return <SandhiStep {...props} />;
    case "scan_metre":
      return <ScanMetreStep {...props} />;
    case "reorder":
      return <ReorderStep {...props} />;
    case "contrast":
      return <ContrastStep {...props} />;
    case "build":
      return <BuildStep {...props} />;
    case "articulate":
      return <ArticulateStep {...props} />;
    case "read":
      return <ReadStep {...props} />;
    default:
      return <ExplainStep {...{ ...props, step: { ...props.step, kind: "explain" } as LessonStep }} />;
  }
}

export function stepHint(kind: string): string {
  switch (kind) {
    case "grid_fill":
      return "Fill the missing forms.";
    case "derive_next":
      return "Name the hidden sūtra.";
    case "sandhi_split":
      return "Split the meeting.";
    case "sandhi_join":
      return "Join the meeting.";
    case "scan_metre":
      return "Mark light and heavy.";
    case "reorder":
      return "Arrange the sentence.";
    case "contrast":
      return "Pick the role.";
    case "build":
      return "Arrange the words. Not graded.";
    case "articulate":
      return "Shape the sound. Not graded.";
    case "read":
      return "Read the passage. Not graded.";
    default:
      return "Read, then continue.";
  }
}

export function UnsupportedStep({ kind }: { kind: string }) {
  return <Text>Unknown step kind: {kind}</Text>;
}
