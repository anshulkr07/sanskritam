// VoiceEmblem — the small drawing on each Voice hub card, one per group.
//
// Same language as the Kāla page's emblems: a plain cream-and-gold line
// drawing of the idea behind the group — a manuscript and its flame for the
// teachers, two speech bubbles for friends, a roof over two figures for
// family, a seated figure for yoga, a leaf for āyurveda, a crescent and a
// star for jyotiṣa, a stepped temple for itihāsa, a lamp for kathā.
// Decoration only: the card's own words say what it is.

import React from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

import { onFill } from "../theme";
import type { VoiceCategoryId } from "./companions";

const SOFT = "rgba(255,248,238,0.45)";
const FAINT = "rgba(255,248,238,0.22)";
const SHADE = "rgba(0,0,0,0.30)";

const CREAM = onFill.text;
const GOLD = onFill.gold;

function Body({ id }: { id: VoiceCategoryId }) {
  switch (id) {
    case "guru":
      // A palm-leaf manuscript, and the flame above it.
      return (
        <>
          <Rect x={11} y={24} width={34} height={22} rx={4} fill={CREAM} />
          <Circle cx={19} cy={35} r={2.4} fill={SHADE} />
          <Line x1={24} y1={30} x2={40} y2={30} stroke={SHADE} strokeWidth={1.6} strokeLinecap="round" />
          <Line x1={24} y1={35} x2={40} y2={35} stroke={SHADE} strokeWidth={1.6} strokeLinecap="round" />
          <Line x1={24} y1={40} x2={36} y2={40} stroke={SHADE} strokeWidth={1.6} strokeLinecap="round" />
          <Path d="M30 20 C 36 14 36 9 30 5 C 24 9 24 14 30 20 Z" fill={GOLD} />
        </>
      );
    case "mitra":
      // Two speech bubbles, answering each other.
      return (
        <>
          <Path d="M7 12 h22 a5 5 0 0 1 5 5 v9 a5 5 0 0 1 -5 5 h-9 l-7 6 v-6 h-6 a5 5 0 0 1 -5 -5 v-9 a5 5 0 0 1 5 -5 Z" fill={CREAM} />
          <Circle cx={16} cy={22} r={2} fill={SHADE} />
          <Circle cx={24} cy={22} r={2} fill={SHADE} />
          <Path d="M27 26 h18 a5 5 0 0 1 5 5 v7 a5 5 0 0 1 -5 5 h-4 v6 l-6 -6 h-8 a5 5 0 0 1 -5 -5 v-7 a5 5 0 0 1 5 -5 Z" fill={SOFT} />
        </>
      );
    case "parivara":
      // One roof, two figures under it.
      return (
        <>
          <Path d="M7 28 L28 9 L49 28" fill="none" stroke={CREAM} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={22} cy={37} r={6} fill={CREAM} />
          <Path d="M9 50 C 9 43 15 39 22 39 C 29 39 35 43 35 50 Z" fill={CREAM} />
          <Circle cx={38} cy={41} r={4.2} fill={GOLD} />
          <Path d="M30 50 C 30 45.6 33.6 43 38 43 C 42.4 43 46 45.6 46 50 Z" fill={GOLD} />
        </>
      );
    case "yoga": {
      const arm = (cx: number, ex: number) => `M28 27 C ${cx} 30 ${cx} 34 ${ex} 38`;
      return (
        <>
          <Circle cx={28} cy={14} r={5.6} fill={CREAM} />
          <Path d={arm(20, 12)} fill="none" stroke={CREAM} strokeWidth={3} strokeLinecap="round" />
          <Path d={arm(36, 44)} fill="none" stroke={CREAM} strokeWidth={3} strokeLinecap="round" />
          <Path d="M28 20 C 22.5 24 22.5 31 24.5 35 L31.5 35 C 33.5 31 33.5 24 28 20 Z" fill={CREAM} />
          <Path d="M12 40 C 18 43 38 43 44 40 C 40 47 16 47 12 40 Z" fill={CREAM} />
          <Line x1={9} y1={48} x2={47} y2={48} stroke={GOLD} strokeWidth={2.4} strokeLinecap="round" />
        </>
      );
    }
    case "ayurveda":
      // A leaf with its veins.
      return (
        <>
          <Path d="M28 7 C 44 17 44 38 28 50 C 12 38 12 17 28 7 Z" fill={CREAM} />
          <Line x1={28} y1={12} x2={28} y2={45} stroke={GOLD} strokeWidth={2} strokeLinecap="round" />
          <Line x1={28} y1={20} x2={20} y2={26} stroke={GOLD} strokeWidth={1.6} strokeLinecap="round" />
          <Line x1={28} y1={27} x2={36} y2={33} stroke={GOLD} strokeWidth={1.6} strokeLinecap="round" />
          <Line x1={28} y1={34} x2={21} y2={39} stroke={GOLD} strokeWidth={1.6} strokeLinecap="round" />
        </>
      );
    case "jyotisha":
      // The crescent Moon on its ring, with one star.
      return (
        <>
          <Circle cx={27} cy={31} r={22} fill="none" stroke={FAINT} strokeWidth={1.4} strokeDasharray="3 4" />
          <Circle cx={26} cy={32} r={14} fill={CREAM} />
          <Circle cx={33} cy={27} r={13} fill={SHADE} />
          <Path d="M45 8 L46.6 13.4 L52 15 L46.6 16.6 L45 22 L43.4 16.6 L38 15 L43.4 13.4 Z" fill={GOLD} />
          <Circle cx={16} cy={44} r={2} fill={SOFT} />
        </>
      );
    case "itihasa":
      // A stepped shrine, and the doorway it keeps.
      return (
        <>
          <Circle cx={28} cy={8} r={3.2} fill={GOLD} />
          <Rect x={21} y={12} width={14} height={9} rx={1.5} fill={CREAM} />
          <Rect x={14} y={21} width={28} height={11} rx={1.5} fill={CREAM} />
          <Rect x={9} y={32} width={38} height={11} rx={1.5} fill={CREAM} />
          <Path d="M24 43 v-6 a4 4 0 0 1 8 0 v6 Z" fill={SHADE} />
          <Line x1={5} y1={46} x2={51} y2={46} stroke={SOFT} strokeWidth={2} strokeLinecap="round" />
        </>
      );
    case "katha":
      // A lamp lit for the evening's story.
      return (
        <>
          <Path d="M11 33 A 17 17 0 0 0 45 33 Z" fill={CREAM} />
          <Line x1={28} y1={33} x2={28} y2={27} stroke={CREAM} strokeWidth={2.4} strokeLinecap="round" />
          <Path d="M28 6 C 35 15 35 22 28 27 C 21 22 21 15 28 6 Z" fill={GOLD} />
          <Line x1={8} y1={40} x2={48} y2={40} stroke={SOFT} strokeWidth={2} strokeLinecap="round" />
        </>
      );
    default:
      return null;
  }
}

export default function VoiceEmblem({ id, size = 40 }: { id: VoiceCategoryId; size?: number }) {
  return (
    <View style={{ width: size, height: size }} accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 56 56">
        <Body id={id} />
      </Svg>
    </View>
  );
}
