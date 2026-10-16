import { remoteArtwork } from "../artwork/remoteArtwork";
import type { ImageSourcePropType } from "react-native";

// Released unit/topic paintings are served remotely and cached on demand.
// Match stable curriculum IDs, so reordering a rail never changes its artwork.
const units: Record<string, ImageSourcePropType> = {
  "u1": remoteArtwork("path/u1-varna-hero.webp"),
  "u2": remoteArtwork("path/u2-first-words-hero.webp"),
  "u3": remoteArtwork("path/u3-more-cases-hero.webp"),
  "u4": remoteArtwork("path/u4-numbers-hero.webp"),
  "u5": remoteArtwork("path/u5-persons-hero.webp"),
  "u6": remoteArtwork("path/u6-sandhi-hero.webp"),
  "u7": remoteArtwork("path/u7-genders-hero.webp"),
  "u8": remoteArtwork("path/u8-more-tenses-hero.webp"),
  "u9": remoteArtwork("path/u9-voices-hero.webp"),
  "u10": remoteArtwork("path/u10-compounds-hero.webp"),
  "u11": remoteArtwork("path/u11-karaka-hero.webp"),
};
const lessons: Record<string, ImageSourcePropType> = {
  "u1:SG": remoteArtwork("path/u1-sounds.webp"),
  "u2:NOM.SG": remoteArtwork("path/u2-doer.webp"),
  "u2:ACC.SG": remoteArtwork("path/u2-object.webp"),
  "u2:PRES.3SG": remoteArtwork("path/u2-pres-3sg.webp"),
  "u3:INSTR.SG": remoteArtwork("path/u3-instr-sg.webp"),
  "u3:DAT.SG": remoteArtwork("path/u3-dat-sg.webp"),
  "u3:ABL.SG": remoteArtwork("path/u3-abl-sg.webp"),
  "u3:GEN.SG": remoteArtwork("path/u3-gen-sg.webp"),
  "u3:LOC.SG": remoteArtwork("path/u3-loc-sg.webp"),
  "u3:VOC.SG": remoteArtwork("path/u3-voc-sg.webp"),
  "u3:INDECL": remoteArtwork("path/u3-indecl.webp"),
  "u4:DU": remoteArtwork("path/u4-du.webp"),
  "u4:NOM.PL": remoteArtwork("path/u4-nom-pl.webp"),
  "u4:GEN.PL": remoteArtwork("path/u4-gen-pl.webp"),
  "u4:PL": remoteArtwork("path/u4-pl.webp"),
  "u4:NOM.DU": remoteArtwork("path/u4-nom-du.webp"),
  "u4:ACC.DU": remoteArtwork("path/u4-acc-du.webp"),
  "u4:ACC.PL": remoteArtwork("path/u4-acc-pl.webp"),
  "u4:LOC.PL": remoteArtwork("path/u4-loc-pl.webp"),
  "u5:PRES.1SG": remoteArtwork("path/u5-pres-1sg.webp"),
  "u5:PRES.1DU": remoteArtwork("path/u5-pres-1du.webp"),
  "u5:PRES.1PL": remoteArtwork("path/u5-pres-1pl.webp"),
  "u5:PRES.2PL": remoteArtwork("path/u5-pres-2pl.webp"),
  "u5:PRES.3PL": remoteArtwork("path/u5-pres-3pl.webp"),
  "u5:PRES.3DU": remoteArtwork("path/u5-pres-3du.webp"),
  "u6:VOWEL-SANDHI": remoteArtwork("path/u6-vowel-sandhi.webp"),
  "u6:VISARGA-SANDHI": remoteArtwork("path/u6-visarga-sandhi.webp"),
  "u6:ANUSVARA-SANDHI": remoteArtwork("path/u6-anusvara-sandhi.webp"),
  "u6:CONSONANT-SANDHI": remoteArtwork("path/u6-consonant-sandhi.webp"),
  "u7:NEUT": remoteArtwork("path/u7-neut.webp"),
  "u7:MASC": remoteArtwork("path/u7-masc.webp"),
  "u7:FEM": remoteArtwork("path/u7-fem.webp"),
  "u8:IMP.2PL": remoteArtwork("path/u8-imp-2pl.webp"),
  "u8:IMPF.3SG": remoteArtwork("path/u8-impf-3sg.webp"),
  "u8:FUT.1SG": remoteArtwork("path/u8-fut-1sg.webp"),
  "u8:IMP.2SG": remoteArtwork("path/u8-imp-2sg.webp"),
  "u8:FUT.3SG": remoteArtwork("path/u8-fut-3sg.webp"),
  "u9:ATMANEPADA": remoteArtwork("path/u9-atmanepada.webp"),
  "u9:PARASMAIPADA": remoteArtwork("path/u9-parasmaipada.webp"),
  "u10:SAMASA-DVANDVA": remoteArtwork("path/u10-samasa-dvandva.webp"),
  "u10:SAMASA-TATPURUSA": remoteArtwork("path/u10-samasa-tatpurusa.webp"),
  "u10:SAMASA-BAHUVRIHI": remoteArtwork("path/u10-samasa-bahuvrihi.webp"),
  "u10:SAMASA-AVYAYIBHAVA": remoteArtwork("path/u10-samasa-avyayibhava.webp"),
  "u11:KARAKA-KARTR": remoteArtwork("path/u11-karaka-kartr.webp"),
  "u11:KARAKA-KARMA": remoteArtwork("path/u11-karaka-karma.webp"),
  "u11:KARAKA-KARANA": remoteArtwork("path/u11-karaka-karana.webp"),
  "u11:KARAKA-SAMPRADANA": remoteArtwork("path/u11-karaka-sampradana.webp"),
  "u11:KARAKA-APADANA": remoteArtwork("path/u11-karaka-apadana.webp"),
  "u11:KARAKA-ADHIKARANA": remoteArtwork("path/u11-karaka-adhikarana.webp"),
};

export function unitArtwork(unitId: string): ImageSourcePropType | undefined {
  return units[unitId];
}

export function lessonArtwork(unitId: string, featureId: string): ImageSourcePropType | undefined {
  return lessons[`${unitId}:${featureId}`];
}
