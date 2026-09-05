/**
 * Public surface for the guru.
 *
 * This barrel deliberately exports only the **native** renderer. `Guru.tsx` and
 * `GuruScene.tsx` are the Rive path and both `require('../../../assets/guru.riv')`,
 * which does not exist — export is gated behind Rive's paid plan. Metro resolves
 * requires at bundle time, so re-exporting them here would break the build the
 * moment anything imported from this folder. They stay in the tree as the
 * reference implementation; wire them up only once the .riv is exported.
 */
export {
  GuruNative,
  AvatarState,
  Gesture,
  ONE_SHOT_MS,
  useReduceMotion,
  type AvatarStateName,
  type GuruNativeProps,
} from './GuruNative';

export {
  Viseme,
  VISEME_COUNT,
  visemesFor,
  visemesForDevanagari,
  visemesForLatin,
  scheduleVisemes,
  type VisemeStep,
} from './viseme';

export {
  presentationFor,
  profileFor,
  type GuruPresentation,
  type PresentationProfile,
} from './presentation';
