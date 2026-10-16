import { remoteArtwork } from "../artwork/remoteArtwork";
// Painted cover map: versioned public artwork, cached on demand by ArtworkImage.
// Source files stay in mobile/assets/covers for recovery; Metro does not bundle them.
// Unknown catalogue keys fall back to the vector cover in CoverArt.

import type { ImageSourcePropType } from "react-native";

// Watercolor covers for every reading shelf.
export const PAINTED_COVERS: Record<string, ImageSourcePropType> = {
  rigveda: remoteArtwork("covers/rigveda.webp"),
  samaveda: remoteArtwork("covers/samaveda.webp"),
  yajurveda: remoteArtwork("covers/yajurveda.webp"),
  atharvaveda: remoteArtwork("covers/atharvaveda.webp"),
  kena: remoteArtwork("covers/kena.webp"),
  prashna: remoteArtwork("covers/prashna.webp"),
  mandukya: remoteArtwork("covers/mandukya.webp"),
  taittiriya: remoteArtwork("covers/taittiriya.webp"),
  aitareya: remoteArtwork("covers/aitareya.webp"),
  shvetashvatara: remoteArtwork("covers/shvetashvatara.webp"),
  chandogya: remoteArtwork("covers/chandogya.webp"),
  brihadaranyaka: remoteArtwork("covers/brihadaranyaka.webp"),
  bhagavata: remoteArtwork("covers/bhagavata.webp"),
  shivapurana: remoteArtwork("covers/shivapurana.webp"),
  garuda: remoteArtwork("covers/garuda.webp"),
  devimahatmya: remoteArtwork("covers/devimahatmya.webp"),
  vishnusahasranama: remoteArtwork("covers/vishnusahasranama.webp"),
  lalita: remoteArtwork("covers/lalita.webp"),
  bhajagovindam: remoteArtwork("covers/bhajagovindam.webp"),
  saundarya: remoteArtwork("covers/saundarya.webp"),
  aditya: remoteArtwork("covers/aditya.webp"),
  tandava: remoteArtwork("covers/tandava.webp"),
  mahimna: remoteArtwork("covers/mahimna.webp"),
  ramaraksha: remoteArtwork("covers/ramaraksha.webp"),
  naradabhakti: remoteArtwork("covers/naradabhakti.webp"),
  meghaduta: remoteArtwork("covers/meghaduta.webp"),
  kumarasambhava: remoteArtwork("covers/kumarasambhava.webp"),
  raghuvamsha: remoteArtwork("covers/raghuvamsha.webp"),
  shakuntala: remoteArtwork("covers/shakuntala.webp"),
  gitagovinda: remoteArtwork("covers/gitagovinda.webp"),
  vetala: remoteArtwork("covers/vetala.webp"),
  yogasutra: remoteArtwork("covers/yogasutra.webp"),
  hathayoga: remoteArtwork("covers/hathayoga.webp"),
  ashtavakra: remoteArtwork("covers/ashtavakra.webp"),
  sushruta: remoteArtwork("covers/sushruta.webp"),
  arthashastra: remoteArtwork("covers/arthashastra.webp"),
  lilavati: remoteArtwork("covers/lilavati.webp"),
  amarakosha: remoteArtwork("covers/amarakosha.webp"),
  chanakya: remoteArtwork("covers/chanakya.webp"),

  gita: remoteArtwork("covers/gita.webp"),
  isha: remoteArtwork("covers/isha.webp"),
  katha: remoteArtwork("covers/katha.webp"),
  mundaka: remoteArtwork("covers/mundaka.webp"),
  ramayana: remoteArtwork("covers/ramayana.webp"),
  mahabharata: remoteArtwork("covers/mahabharata.webp"),
  hito: remoteArtwork("covers/hito.webp"),
  pancha: remoteArtwork("covers/pancha.webp"),
  niti: remoteArtwork("covers/niti.webp"),
  subhashita: remoteArtwork("covers/subhashita.webp"),
  simhasana: remoteArtwork("covers/simhasana.webp"),
  ayurveda: remoteArtwork("covers/ayurveda.webp"),
  "graded-1": remoteArtwork("covers/graded-1.webp"),
  "graded-2": remoteArtwork("covers/graded-2.webp"),
  "graded-3": remoteArtwork("covers/graded-3.webp"),
  all: remoteArtwork("covers/all.webp"),
  other: remoteArtwork("covers/other.webp"),
  sayings: remoteArtwork("covers/sayings.webp"),
};

export function paintedCover(key: string): ImageSourcePropType | null {
  return PAINTED_COVERS[key] ?? null;
}

// Ground colour of each painted cover (appendix C): the book's colour
// everywhere else. Foreground is the title colour on it.
//
// The paged books retain their deep solid colours for surrounding UI and
// native title text; their watercolor covers were completed on 2026-10-15.
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
