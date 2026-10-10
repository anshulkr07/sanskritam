import type { ImageSourcePropType } from "react-native";

// Static requires bundle all released unit and topic paintings for offline use.
// Match stable curriculum IDs, so reordering a rail never changes its artwork.
const units: Record<string, ImageSourcePropType> = {
  "u1": require("../../../assets/path/u1-varna-hero.webp"),
  "u2": require("../../../assets/path/u2-first-words-hero.webp"),
  "u3": require("../../../assets/path/u3-more-cases-hero.webp"),
  "u4": require("../../../assets/path/u4-numbers-hero.webp"),
  "u5": require("../../../assets/path/u5-persons-hero.webp"),
  "u6": require("../../../assets/path/u6-sandhi-hero.webp"),
  "u7": require("../../../assets/path/u7-genders-hero.webp"),
  "u8": require("../../../assets/path/u8-more-tenses-hero.webp"),
  "u9": require("../../../assets/path/u9-voices-hero.webp"),
  "u10": require("../../../assets/path/u10-compounds-hero.webp"),
  "u11": require("../../../assets/path/u11-karaka-hero.webp"),
};
const lessons: Record<string, ImageSourcePropType> = {
  "u1:SG": require("../../../assets/path/u1-sounds.webp"),
  "u2:NOM.SG": require("../../../assets/path/u2-doer.webp"),
  "u2:ACC.SG": require("../../../assets/path/u2-object.webp"),
  "u2:PRES.3SG": require("../../../assets/path/u2-pres-3sg.webp"),
  "u3:INSTR.SG": require("../../../assets/path/u3-instr-sg.webp"),
  "u3:DAT.SG": require("../../../assets/path/u3-dat-sg.webp"),
  "u3:ABL.SG": require("../../../assets/path/u3-abl-sg.webp"),
  "u3:GEN.SG": require("../../../assets/path/u3-gen-sg.webp"),
  "u3:LOC.SG": require("../../../assets/path/u3-loc-sg.webp"),
  "u3:VOC.SG": require("../../../assets/path/u3-voc-sg.webp"),
  "u3:INDECL": require("../../../assets/path/u3-indecl.webp"),
  "u4:DU": require("../../../assets/path/u4-du.webp"),
  "u4:NOM.PL": require("../../../assets/path/u4-nom-pl.webp"),
  "u4:GEN.PL": require("../../../assets/path/u4-gen-pl.webp"),
  "u4:PL": require("../../../assets/path/u4-pl.webp"),
  "u4:NOM.DU": require("../../../assets/path/u4-nom-du.webp"),
  "u4:ACC.DU": require("../../../assets/path/u4-acc-du.webp"),
  "u4:ACC.PL": require("../../../assets/path/u4-acc-pl.webp"),
  "u4:LOC.PL": require("../../../assets/path/u4-loc-pl.webp"),
  "u5:PRES.1SG": require("../../../assets/path/u5-pres-1sg.webp"),
  "u5:PRES.1DU": require("../../../assets/path/u5-pres-1du.webp"),
  "u5:PRES.1PL": require("../../../assets/path/u5-pres-1pl.webp"),
  "u5:PRES.2PL": require("../../../assets/path/u5-pres-2pl.webp"),
  "u5:PRES.3PL": require("../../../assets/path/u5-pres-3pl.webp"),
  "u5:PRES.3DU": require("../../../assets/path/u5-pres-3du.webp"),
  "u6:VOWEL-SANDHI": require("../../../assets/path/u6-vowel-sandhi.webp"),
  "u6:VISARGA-SANDHI": require("../../../assets/path/u6-visarga-sandhi.webp"),
  "u6:ANUSVARA-SANDHI": require("../../../assets/path/u6-anusvara-sandhi.webp"),
  "u6:CONSONANT-SANDHI": require("../../../assets/path/u6-consonant-sandhi.webp"),
  "u7:NEUT": require("../../../assets/path/u7-neut.webp"),
  "u7:MASC": require("../../../assets/path/u7-masc.webp"),
  "u7:FEM": require("../../../assets/path/u7-fem.webp"),
  "u8:IMP.2PL": require("../../../assets/path/u8-imp-2pl.webp"),
  "u8:IMPF.3SG": require("../../../assets/path/u8-impf-3sg.webp"),
  "u8:FUT.1SG": require("../../../assets/path/u8-fut-1sg.webp"),
  "u8:IMP.2SG": require("../../../assets/path/u8-imp-2sg.webp"),
  "u8:FUT.3SG": require("../../../assets/path/u8-fut-3sg.webp"),
  "u9:ATMANEPADA": require("../../../assets/path/u9-atmanepada.webp"),
  "u9:PARASMAIPADA": require("../../../assets/path/u9-parasmaipada.webp"),
  "u10:SAMASA-DVANDVA": require("../../../assets/path/u10-samasa-dvandva.webp"),
  "u10:SAMASA-TATPURUSA": require("../../../assets/path/u10-samasa-tatpurusa.webp"),
  "u10:SAMASA-BAHUVRIHI": require("../../../assets/path/u10-samasa-bahuvrihi.webp"),
  "u10:SAMASA-AVYAYIBHAVA": require("../../../assets/path/u10-samasa-avyayibhava.webp"),
  "u11:KARAKA-KARTR": require("../../../assets/path/u11-karaka-kartr.webp"),
  "u11:KARAKA-KARMA": require("../../../assets/path/u11-karaka-karma.webp"),
  "u11:KARAKA-KARANA": require("../../../assets/path/u11-karaka-karana.webp"),
  "u11:KARAKA-SAMPRADANA": require("../../../assets/path/u11-karaka-sampradana.webp"),
  "u11:KARAKA-APADANA": require("../../../assets/path/u11-karaka-apadana.webp"),
  "u11:KARAKA-ADHIKARANA": require("../../../assets/path/u11-karaka-adhikarana.webp"),
};

export function unitArtwork(unitId: string): ImageSourcePropType | undefined {
  return units[unitId];
}

export function lessonArtwork(unitId: string, featureId: string): ImageSourcePropType | undefined {
  return lessons[`${unitId}:${featureId}`];
}
