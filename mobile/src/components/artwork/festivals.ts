import { remoteArtwork } from "./remoteArtwork";
import type { ImageSourcePropType } from "react-native";

// Festival/deity paintings are public remote assets with on-demand device caching.
const scenes: Record<string, ImageSourcePropType> = {
  diwali: remoteArtwork("festivals/diwali-deity-watercolor.webp"),
  purnima: remoteArtwork("festivals/purnima.webp"),
  amavasya: remoteArtwork("festivals/amavasya.webp"),
  chhath: remoteArtwork("festivals/surya-deity-watercolor.webp"),
  sankranti: remoteArtwork("festivals/surya-deity-watercolor.webp"),
  karwa_chauth: remoteArtwork("festivals/karwa_chauth.webp"),
  navaratri: remoteArtwork("festivals/navaratri-deity-watercolor.webp"),
  river: remoteArtwork("festivals/sacred-river.webp"),
  raksha_bandhan: remoteArtwork("festivals/raksha_bandhan.webp"),
  janmashtami: remoteArtwork("festivals/janmashtami-deity-watercolor.webp"),
  rama_navami: remoteArtwork("festivals/rama-navami-deity-watercolor.webp"),
  ganesh_chaturthi: remoteArtwork("festivals/ganesh-chaturthi-deity-watercolor.webp"),
  vishnu: remoteArtwork("festivals/vishnu-deity-watercolor.webp"),
  shiva: remoteArtwork("festivals/shiva-deity-watercolor.webp"),
  shani: remoteArtwork("festivals/shani-deity-watercolor.webp"),
};
const aliases: Record<string, string> = {
  sharad_navaratri: "navaratri", chaitra_navaratri: "navaratri",
  masik_durgashtami: "navaratri", diwali_days: "diwali",
  lakshmi_puja: "diwali", dhanteras: "diwali", naraka_chaturdashi: "diwali",
  bhai_dooj: "diwali", kartika_purnima: "purnima",
  pitru_paksha: "river", ekadashi: "vishnu", chaturmas: "vishnu", shravan: "shiva",
  pradosh: "shiva", maha_shivaratri: "shiva", masik_shivaratri: "shiva",
  shani_worship: "shani", shani_jayanti: "shani",
  sankashti: "ganesh_chaturthi", vinayaka_chaturthi: "ganesh_chaturthi",
};

export function festivalArtwork(slug: string, remoteUrl?: string | null): ImageSourcePropType | undefined {
  if (remoteUrl) return { uri: remoteUrl };
  return scenes[aliases[slug] ?? slug];
}

const forms: Record<string, ImageSourcePropType> = {
  shailaputri: remoteArtwork("festivals/navadurga-shailaputri-watercolor.webp"),
  brahmacharini: remoteArtwork("festivals/navadurga-brahmacharini-watercolor.webp"),
  chandraghanta: remoteArtwork("festivals/navadurga-chandraghanta-watercolor.webp"),
  kushmanda: remoteArtwork("festivals/navadurga-kushmanda-watercolor.webp"),
  skandamata: remoteArtwork("festivals/navadurga-skandamata-watercolor.webp"),
  katyayani: remoteArtwork("festivals/navadurga-katyayani-watercolor.webp"),
  kalaratri: remoteArtwork("festivals/navadurga-kalaratri-watercolor.webp"),
  mahagauri: remoteArtwork("festivals/navadurga-mahagauri-watercolor.webp"),
  siddhidatri: remoteArtwork("festivals/navadurga-siddhidatri-watercolor.webp"),
};

export function festivalDayArtwork(form?: string, remoteUrl?: string | null): ImageSourcePropType | undefined {
  if (remoteUrl) return { uri: remoteUrl };
  return form ? forms[form.replace(/^navadurga_/, "")] : undefined;
}
