import type { ImageSourcePropType } from "react-native";

// Festival and deity paintings bundle offline. Uploaded art can override them.
const scenes: Record<string, ImageSourcePropType> = {
  diwali: require("../../../assets/festivals/diwali-deity-watercolor.webp"),
  purnima: require("../../../assets/festivals/purnima.webp"),
  amavasya: require("../../../assets/festivals/amavasya.webp"),
  chhath: require("../../../assets/festivals/surya-deity-watercolor.webp"),
  sankranti: require("../../../assets/festivals/surya-deity-watercolor.webp"),
  karwa_chauth: require("../../../assets/festivals/karwa_chauth.webp"),
  navaratri: require("../../../assets/festivals/navaratri-deity-watercolor.webp"),
  river: require("../../../assets/festivals/sacred-river.webp"),
  raksha_bandhan: require("../../../assets/festivals/raksha_bandhan.webp"),
  janmashtami: require("../../../assets/festivals/janmashtami-deity-watercolor.webp"),
  rama_navami: require("../../../assets/festivals/rama-navami-deity-watercolor.webp"),
  ganesh_chaturthi: require("../../../assets/festivals/ganesh-chaturthi-deity-watercolor.webp"),
  vishnu: require("../../../assets/festivals/vishnu-deity-watercolor.webp"),
  shiva: require("../../../assets/festivals/shiva-deity-watercolor.webp"),
  shani: require("../../../assets/festivals/shani-deity-watercolor.webp"),
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
  shailaputri: require("../../../assets/festivals/navadurga-shailaputri-watercolor.webp"),
  brahmacharini: require("../../../assets/festivals/navadurga-brahmacharini-watercolor.webp"),
  chandraghanta: require("../../../assets/festivals/navadurga-chandraghanta-watercolor.webp"),
  kushmanda: require("../../../assets/festivals/navadurga-kushmanda-watercolor.webp"),
  skandamata: require("../../../assets/festivals/navadurga-skandamata-watercolor.webp"),
  katyayani: require("../../../assets/festivals/navadurga-katyayani-watercolor.webp"),
  kalaratri: require("../../../assets/festivals/navadurga-kalaratri-watercolor.webp"),
  mahagauri: require("../../../assets/festivals/navadurga-mahagauri-watercolor.webp"),
  siddhidatri: require("../../../assets/festivals/navadurga-siddhidatri-watercolor.webp"),
};

export function festivalDayArtwork(form?: string, remoteUrl?: string | null): ImageSourcePropType | undefined {
  if (remoteUrl) return { uri: remoteUrl };
  return form ? forms[form.replace(/^navadurga_/, "")] : undefined;
}
