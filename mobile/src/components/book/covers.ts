// Painted cover map: literal requires only (Metro resolves only literals).
// List exactly the files in mobile/assets/covers. Missing keys fall back to
// the vector cover in CoverArt. Do not generate or edit cover images here.

import type { ImageSourcePropType } from "react-native";

// Only gita.webp ships in this tree; the owner's 4K masters produce the rest
// on release. Add a literal line per file when a new painted cover lands.
export const PAINTED_COVERS: Record<string, ImageSourcePropType> = {
  gita: require("../../../assets/covers/gita.webp"),
  isha: require("../../../assets/covers/isha.webp"),
  katha: require("../../../assets/covers/katha.webp"),
  mundaka: require("../../../assets/covers/mundaka.webp"),
  ramayana: require("../../../assets/covers/ramayana.webp"),
  mahabharata: require("../../../assets/covers/mahabharata.webp"),
  hito: require("../../../assets/covers/hito.webp"),
  pancha: require("../../../assets/covers/pancha.webp"),
  niti: require("../../../assets/covers/niti.webp"),
  subhashita: require("../../../assets/covers/subhashita.webp"),
  simhasana: require("../../../assets/covers/simhasana.webp"),
  ayurveda: require("../../../assets/covers/ayurveda.webp"),
  "graded-1": require("../../../assets/covers/graded-1.webp"),
  "graded-2": require("../../../assets/covers/graded-2.webp"),
  "graded-3": require("../../../assets/covers/graded-3.webp"),
  all: require("../../../assets/covers/all.webp"),
  other: require("../../../assets/covers/other.webp"),
  sayings: require("../../../assets/covers/sayings.webp"),
};

export function paintedCover(key: string): ImageSourcePropType | null {
  return PAINTED_COVERS[key] ?? null;
}

// Ground colour of each painted cover (appendix C): the book's colour
// everywhere else. Foreground is the title colour on it.
//
// Reading shelf 2026-10-09: the 39 paged books reuse the deep solid fills
// (cream #FFF8EE passes 4.5:1 on all of them, so check-contrast holds). No
// painted covers: the vector cover is the fallback.
export const COVER_COLOURS: Record<string, { colour: string; foreground: string; titleSa: string }> = {
  gita: { colour: "#561722", foreground: "#F2C879", titleSa: "श्रीमद्भगवद्गीता" },
  isha: { colour: "#2F4677", foreground: "#F3D27A", titleSa: "ईशावास्योपनिषद्" },
  katha: { colour: "#4B3B7A", foreground: "#EAD9A8", titleSa: "कठोपनिषद्" },
  mundaka: { colour: "#17535C", foreground: "#FCE9C2", titleSa: "मुण्डकोपनिषद्" },
  ramayana: { colour: "#2F5B3C", foreground: "#F2D9A0", titleSa: "रामायणम्" },
  mahabharata: { colour: "#3B2E25", foreground: "#F2C879", titleSa: "महाभारतम्" },
  hito: { colour: "#1F6E73", foreground: "#FCE9C2", titleSa: "हितोपदेशः" },
  pancha: { colour: "#8A5608", foreground: "#FFF3D6", titleSa: "पञ्चतन्त्रम्" },
  niti: { colour: "#962F4E", foreground: "#FBE1C8", titleSa: "नीतिशतकम्" },
  subhashita: { colour: "#35603C", foreground: "#F2E3B8", titleSa: "सुभाषितम्" },
  simhasana: { colour: "#5E2216", foreground: "#F2C879", titleSa: "सिंहासनद्वात्रिंशिका" },
  ayurveda: { colour: "#44703F", foreground: "#F6EBC8", titleSa: "आयुर्वेदसंहिताः" },
  "graded-1": { colour: "#17535C", foreground: "#FFF8EE", titleSa: "सरलम्" },
  "graded-2": { colour: "#35603C", foreground: "#FFF8EE", titleSa: "सन्धिः" },
  "graded-3": { colour: "#8A5608", foreground: "#FFF8EE", titleSa: "समासः" },
  all: { colour: "#3C5A8E", foreground: "#FFF8EE", titleSa: "सर्वम्" },
  other: { colour: "#3C5A8E", foreground: "#FFF8EE", titleSa: "अन्यत्" },
  sayings: { colour: "#3C5A8E", foreground: "#FFF8EE", titleSa: "सूक्तयः" },
  vishnusahasranama: { colour: "#B23D10", foreground: "#FFF8EE", titleSa: "विष्णुसहस्रनामस्तोत्रम्" },
  lalita: { colour: "#17535C", foreground: "#FFF8EE", titleSa: "ललितासहस्रनामस्तोत्रम्" },
  bhajagovindam: { colour: "#35603C", foreground: "#FFF8EE", titleSa: "भजगोविन्दम्" },
  saundarya: { colour: "#962F4E", foreground: "#FFF8EE", titleSa: "सौन्दर्यलहरी" },
  aditya: { colour: "#8A5608", foreground: "#FFF8EE", titleSa: "आदित्यहृदयम्" },
  tandava: { colour: "#2F4677", foreground: "#FFF8EE", titleSa: "शिवताण्डवस्तोत्रम्" },
  mahimna: { colour: "#3B2E25", foreground: "#FFF8EE", titleSa: "शिवमहिम्नःस्तोत्रम्" },
  ramaraksha: { colour: "#5E2216", foreground: "#FFF8EE", titleSa: "रामरक्षास्तोत्रम्" },
  naradabhakti: { colour: "#B23D10", foreground: "#FFF8EE", titleSa: "नारदभक्तिसूत्रम्" },
  devimahatmya: { colour: "#17535C", foreground: "#FFF8EE", titleSa: "देवीमाहात्म्यम्" },
  bhagavata: { colour: "#35603C", foreground: "#FFF8EE", titleSa: "श्रीमद्भागवतपुराणम्" },
  shivapurana: { colour: "#962F4E", foreground: "#FFF8EE", titleSa: "शिवपुराणम्" },
  garuda: { colour: "#8A5608", foreground: "#FFF8EE", titleSa: "गरुडपुराणम्" },
  rigveda: { colour: "#2F4677", foreground: "#FFF8EE", titleSa: "ऋग्वेदः" },
  samaveda: { colour: "#3B2E25", foreground: "#FFF8EE", titleSa: "सामवेदः" },
  yajurveda: { colour: "#5E2216", foreground: "#FFF8EE", titleSa: "शुक्लयजुर्वेदः" },
  atharvaveda: { colour: "#B23D10", foreground: "#FFF8EE", titleSa: "अथर्ववेदः" },
  kena: { colour: "#17535C", foreground: "#FFF8EE", titleSa: "केनोपनिषद्" },
  prashna: { colour: "#35603C", foreground: "#FFF8EE", titleSa: "प्रश्नोपनिषद्" },
  mandukya: { colour: "#962F4E", foreground: "#FFF8EE", titleSa: "माण्डूक्योपनिषद्" },
  taittiriya: { colour: "#8A5608", foreground: "#FFF8EE", titleSa: "तैत्तिरीयोपनिषद्" },
  aitareya: { colour: "#2F4677", foreground: "#FFF8EE", titleSa: "ऐतरेयोपनिषद्" },
  shvetashvatara: { colour: "#3B2E25", foreground: "#FFF8EE", titleSa: "श्वेताश्वतरोपनिषद्" },
  chandogya: { colour: "#5E2216", foreground: "#FFF8EE", titleSa: "छान्दोग्योपनिषद्" },
  brihadaranyaka: { colour: "#B23D10", foreground: "#FFF8EE", titleSa: "बृहदारण्यकोपनिषद्" },
  meghaduta: { colour: "#17535C", foreground: "#FFF8EE", titleSa: "मेघदूतम्" },
  kumarasambhava: { colour: "#35603C", foreground: "#FFF8EE", titleSa: "कुमारसम्भवम्" },
  raghuvamsha: { colour: "#962F4E", foreground: "#FFF8EE", titleSa: "रघुवंशम्" },
  shakuntala: { colour: "#8A5608", foreground: "#FFF8EE", titleSa: "अभिज्ञानशाकुन्तलम्" },
  gitagovinda: { colour: "#2F4677", foreground: "#FFF8EE", titleSa: "गीतगोविन्दम्" },
  vetala: { colour: "#3B2E25", foreground: "#FFF8EE", titleSa: "वेतालपञ्चविंशतिः" },
  yogasutra: { colour: "#5E2216", foreground: "#FFF8EE", titleSa: "योगसूत्रम्" },
  hathayoga: { colour: "#B23D10", foreground: "#FFF8EE", titleSa: "हठयोगप्रदीपिका" },
  ashtavakra: { colour: "#17535C", foreground: "#FFF8EE", titleSa: "अष्टावक्रगीता" },
  sushruta: { colour: "#35603C", foreground: "#FFF8EE", titleSa: "सुश्रुतसंहिता" },
  arthashastra: { colour: "#962F4E", foreground: "#FFF8EE", titleSa: "अर्थशास्त्रम्" },
  lilavati: { colour: "#8A5608", foreground: "#FFF8EE", titleSa: "लीलावती" },
  amarakosha: { colour: "#2F4677", foreground: "#FFF8EE", titleSa: "अमरकोशः" },
  chanakya: { colour: "#3B2E25", foreground: "#FFF8EE", titleSa: "चाणक्यनीतिदर्पणः" },
};

export function coverColour(key: string): string {
  return COVER_COLOURS[key]?.colour ?? "#3B2E25";
}

export function coverForeground(key: string): string {
  return COVER_COLOURS[key]?.foreground ?? "#FFF8EE";
}
