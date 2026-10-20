import { isDarkScheme } from '../theme';
import { setSchemePref } from '../services/colorScheme';
export const light = {
 paper:'#F8F2E7', surface:'#FFFCF6', line:'#E5D9C6', lineStrong:'#D9CCB6',
 ink:'#2A2019', ink2:'#5F5245', ink3:'#75665A', action:'#A63D17', actionText:'#A63D17',
 done:'#2E7D4F', doneInk:'#25683F', wrongInk:'#9E2219', ochre:'#9A4A26', indigo:'#3A548A', white:'#FFFFFF', transparent:'transparent', dark:false,
};
export const dark: typeof light = {
 paper:'#17130F', surface:'#221C17', line:'#3A3029', lineStrong:'#4A3E34',
 ink:'#F3EADB', ink2:'#CDBFAA', ink3:'#A89886', action:'#A63D17', actionText:'#E8875C',
 done:'#4E9E6C', doneInk:'#7CC79A', wrongInk:'#F08A80', ochre:'#E09A6A', indigo:'#8EA6D8', white:'#FFFFFF', transparent:'transparent', dark:true,
};
export type StoryTheme = typeof light;
export type Appearance = 'light' | 'dark';
// The course follows the app's own Light / Dark (Settings > Appearance), read
// once at boot; a change there restarts the JS. Its old separate switch
// (story.appearance.v1) is retired so the two can never disagree.
const appearance = (): Appearance => (isDarkScheme() ? 'dark' : 'light');
export function loadAppearance() { return Promise.resolve(); }
export async function setStoryAppearance(value: Appearance) { await setSchemePref(value); }
export function useStoryTheme(): StoryTheme {
 return appearance()==='dark'?dark:light;
}
