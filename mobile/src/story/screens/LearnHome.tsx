// Learn's landing (owner, 2026-10-20): a Story / Simple switch at the top.
//
// Story (option B, "story spine"): every act, every unit and its ghost, and
// each part's leaf, in course order, with the place the learner is on.
// Tapping a unit opens its sheet of scenes; a scene opens its cards.
//
// Simple (option 3, "parts, one open"): the same units as five plain parts,
// no ghosts, leaves or story cards, and progress of its own (mode.ts). The
// next lesson and the three after it are open (selectors.simpleOpen).
//
// Square corners and hairlines throughout, in Learn's own palette.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../navigation/types';
import { useGuideLang } from '../../hooks/useGuide';
import { useTypeScale } from '../../hooks/useTypeScale';
import { useCourse, refreshCourse } from '../course';
import { setLearnMode, useLearnMode, type Track } from '../mode';
import { useStoryTheme, type StoryTheme } from '../theme';
import { Bi, Sa } from '../text';
import { Button, Label, useCopy } from '../ui';
import { getReview, lessonSummaries } from '../api';
import { allLeaves, courseComplete, currentContext, recovered, simpleOpen, unitContexts, unitStops } from '../selectors';
import { startTestOut } from '../session';
import UnitSheet from './UnitSheet';
import type { Act, LessonSummary, StoryIndex, StoryState, UnitSummary } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Simple mode's plain names for the five acts' parts of the course. */
export const PART_NAMES: Record<number, { en: string; hi: string }> = {
  1: { en: 'Letters and reading', hi: 'अक्षर और पठन' },
  2: { en: 'Sentences and the eight cases', hi: 'वाक्य और आठ विभक्तियाँ' },
  3: { en: 'Verbs: tenses and classes', hi: 'क्रिया: लकार और गण' },
  4: { en: 'Sandhi, compounds and metre', hi: 'सन्धि, समास और छन्द' },
  5: { en: 'Real texts and Pāṇini', hi: 'मूल ग्रन्थ और पाणिनि' },
};

export default function LearnHome() {
  const mode = useLearnMode();
  return mode === 'simple' ? <SimpleHome /> : <StorySpine />;
}

// ── The switch ────────────────────────────────────────────────────────────

export function LearnHeader({ mode }: { mode: Track }) {
  const c = useStoryTheme(), hi = useCopy(), { sized } = useTypeScale();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Text accessibilityRole="header" style={{ fontFamily: 'Mukta_700Bold', fontSize: sized(26), color: c.ink }}>{hi ? 'सीखें' : 'Learn'}</Text>
        {!hi ? <Text style={{ fontFamily: 'TiroDevanagariSanskrit_400Regular', fontSize: sized(18), color: c.ink2 }}>सीखें</Text> : null}
      </View>
      <View accessibilityRole="radiogroup" accessibilityLabel={hi ? 'सीखने का तरीका' : 'Learn mode'} style={{ flexDirection: 'row', borderWidth: 1, borderColor: c.ink }}>
        {(['story', 'simple'] as const).map(m => {
          const on = mode === m;
          return (
            <Pressable key={m} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => { void setLearnMode(m); }}
              style={{ minHeight: 36, minWidth: 64, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.ink : 'transparent' }}>
              <Text style={{ fontFamily: 'Mukta_600SemiBold', fontSize: sized(14), color: on ? c.paper : c.ink }}>
                {m === 'story' ? (hi ? 'कहानी' : 'Story') : (hi ? 'सरल' : 'Simple')}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Loading({ mode, error, track }: { mode: Track; error: boolean; track: Track }) {
  const c = useStoryTheme(), hi = useCopy();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <LearnHeader mode={mode} />
      <View style={{ padding: 16, gap: 12 }}>
        <Label>{hi ? 'पाठ्यक्रम लोड हो रहा है…' : 'Loading the course…'}</Label>
        {error ? <Button label={hi ? 'फिर कोशिश करें' : 'Try again'} onPress={() => { void refreshCourse(false, track); }} /> : null}
      </View>
    </SafeAreaView>
  );
}

function Chip({ text, tone, c }: { text: string; tone: 'done' | 'here' | 'plain'; c: StoryTheme }) {
  const { sized } = useTypeScale();
  const fill = tone === 'done' ? c.done : 'transparent';
  const ink = tone === 'done' ? c.white : tone === 'here' ? c.actionText : c.ink3;
  const line = tone === 'done' ? c.done : tone === 'here' ? c.actionText : c.line;
  return <Text style={{ fontFamily: 'Mukta_700Bold', fontSize: sized(11), letterSpacing: 0.5, paddingHorizontal: 5, color: ink, backgroundColor: fill, borderWidth: 1, borderColor: line }}>{text}</Text>;
}

// ── Story mode: the spine ─────────────────────────────────────────────────

function StorySpine() {
  const { index, state, error } = useCourse('story');
  const nav = useNavigation<Nav>();
  const [due, setDue] = useState<number | null>(null);
  const autoStarted = useRef(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    void getReview().then(r => { if (active) setDue(r.due_count); }).catch(() => {});
    return () => { active = false; };
  }, [state?.finished.join('|')]));
  // A new learner opens straight into the prologue, as before.
  useEffect(() => {
    if (state?.current?.role === 'prologue' && !autoStarted.current) {
      autoStarted.current = true;
      nav.navigate('StoryLesson', { lessonId: state.current.lesson_id! });
    }
  }, [state?.current?.role, nav]);
  if (!index || !state) return <Loading mode="story" error={error} track="story" />;
  return (
    <StorySpineView index={index} state={state} due={due}
      onLesson={(id, testOut) => { if (testOut) startTestOut(id); nav.navigate('StoryLesson', { lessonId: id }); }}
      onLeaf={leafId => nav.navigate('StoryLeaf', { leafId })}
      onMore={route => nav.navigate(route as never)} />
  );
}

export function StorySpineView({ index, state, due = null, onLesson, onLeaf, onMore }: {
  index: StoryIndex; state: StoryState; due?: number | null;
  onLesson: (id: string, testOut?: boolean) => void; onLeaf: (id: string) => void; onMore: (route: string) => void;
}) {
  const c = useStoryTheme(), hi = useCopy(), { lang } = useGuideLang(), { sized } = useTypeScale();
  const [unitId, setUnitId] = useState<string | null>(null);
  const contexts = unitContexts(index), total = contexts.length;
  const here = currentContext(index, state)?.unit.id;
  const complete = courseComplete(index, state);
  const leaves = allLeaves(index).filter(l => recovered(index, state, l.id)).length;
  const prologue = index.course?.prologue;
  const proDone = !!prologue && state.finished.includes(prologue.id);
  const scroll = useRef<ScrollView>(null), hereY = useRef<number | null>(null), placed = useRef(false);
  const place = () => { if (!placed.current && hereY.current !== null) { placed.current = true; scroll.current?.scrollTo({ y: Math.max(0, hereY.current - 160), animated: false }); } };
  let n = 0;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <LearnHeader mode="story" />
      <ScrollView ref={scroll} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 14 }}>
          <Sa sa={index.course?.title_sa} roman={false} size={28} />
          <Bi value={{ en: 'The Burnt Book. Every unit frees a ghost; every part wins back a leaf.', hi: 'जली हुई पुस्तक। हर इकाई एक भूत को मुक्त करती है; हर भाग एक पत्र लौटाता है।' }} size={15} style={{ color: c.ink2 }} />
          <View style={{ flexDirection: 'row', marginTop: 12, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface }}>
            {[
              { value: state.ghosts_freed.length + ' / ' + total, label: hi ? 'भूत मुक्त' : 'ghosts freed', route: 'StoryGhosts' },
              { value: leaves + ' / 7', label: hi ? 'पत्र' : 'leaves', route: 'StoryLeaves' },
              { value: due === null ? '—' : String(due), label: hi ? 'आज दोहराएँ' : 'to review', route: 'StoryReview' },
            ].map((s, i) => (
              <Pressable key={s.route} accessibilityRole="button" accessibilityLabel={s.value + ' ' + s.label} onPress={() => onMore(s.route)}
                style={{ flex: 1, minHeight: 52, paddingHorizontal: 10, paddingVertical: 6, borderLeftWidth: i ? 1 : 0, borderColor: c.line }}>
                <Text style={{ fontFamily: 'Mukta_700Bold', fontSize: sized(18), color: c.ink }}>{s.value}</Text>
                <Label>{s.label}</Label>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
            {[
              { label: hi ? 'मानचित्र' : 'Map', route: 'StoryMap' },
              { label: hi ? 'पात्र' : 'Cast', route: 'StoryCast' },
              { label: hi ? 'पुस्तकालय' : 'Library', route: 'LearnLibrary' },
            ].map(l => (
              <Pressable key={l.route} accessibilityRole="link" onPress={() => onMore(l.route)} style={{ minHeight: 44, justifyContent: 'center', paddingRight: 18 }}>
                <Text style={{ fontFamily: 'Mukta_600SemiBold', fontSize: sized(15), color: c.actionText, textDecorationLine: 'underline' }}>{l.label}</Text>
              </Pressable>
            ))}
          </View>
          {complete ? <Bi value={{ en: 'The story is complete. Every ghost is free and every leaf is recovered. Open any unit again.', hi: 'कहानी पूरी हुई। हर भूत मुक्त है, हर पत्र मिल गया। कोई भी इकाई फिर खोलें।' }} size={15} /> : null}
        </View>

        {prologue ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line, backgroundColor: c.surface }}>
            <Text style={{ width: 18, fontFamily: 'Mukta_700Bold', color: proDone ? c.doneInk : c.ink3 }}>{proDone ? '✓' : '·'}</Text>
            <View style={{ flex: 1 }}>
              <Label>{hi ? 'कथा का आरम्भ' : 'PROLOGUE'}</Label>
              <Sa sa={prologue.title_sa} roman={false} size={17} />
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={proDone ? (hi ? 'आरम्भ फिर पढ़ें' : 'Replay the prologue') : (hi ? 'आरम्भ पढ़ें' : 'Read the prologue')} onPress={() => onLesson(prologue.id)} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ fontFamily: 'Mukta_600SemiBold', fontSize: sized(14), color: c.actionText }}>{proDone ? (hi ? 'फिर पढ़ें' : 'Replay') : (hi ? 'पढ़ें' : 'Read')}</Text>
            </Pressable>
          </View>
        ) : null}

        {index.acts.map(act => {
          const stats = state.acts.find(a => a.id === act.id);
          return (
            <View key={act.id} style={{ marginTop: 18 }}>
              <View style={{ backgroundColor: act.color, paddingHorizontal: 16, paddingVertical: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={{ fontFamily: 'Mukta_700Bold', fontSize: sized(12), letterSpacing: 1, color: c.white }}>{(hi ? 'अंक ' : 'ACT ') + act.n}</Text>
                  <Text style={{ fontFamily: 'TiroDevanagariSanskrit_400Regular', fontSize: sized(20), color: c.white }}>{act.title_sa}</Text>
                  <Text style={{ fontFamily: 'Mukta_600SemiBold', fontSize: sized(15), color: c.white }}>{act.title[lang]}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={{ fontFamily: 'Mukta_500Medium', fontSize: sized(12), color: c.white }}>{(stats?.units_done ?? 0) + ' / ' + (stats?.units_total ?? 0)}</Text>
                </View>
                <Text style={{ fontFamily: 'Mukta_400Regular', fontSize: sized(13), lineHeight: sized(19), color: c.white }}>{act.goal[lang]}</Text>
              </View>
              {act.parts.map((part, pi) => (
                <View key={pi} style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                  {part.units.map(unit => {
                    n += 1;
                    const u = state.units[unit.id], done = !!u?.done, isHere = unit.id === here, planned = unit.status === 'planned';
                    const lessonAt = isHere ? unit.lessons.findIndex(l => l.id === state.current?.lesson_id) : -1;
                    const next = isHere ? unitStops(unit).find(l => l.id === state.current?.lesson_id) : undefined;
                    return (
                      <View key={unit.id} onLayout={isHere ? e => { hereY.current = e.nativeEvent.layout.y; place(); } : undefined}>
                        <UnitBeat act={act} unit={unit} n={n} done={done} here={isHere} planned={planned} c={c}
                          onPress={() => setUnitId(unit.id)} />
                        {isHere && next ? (
                          <View style={{ marginLeft: 32, marginBottom: 12, borderWidth: 1.5, borderColor: act.color, backgroundColor: c.surface, padding: 10, gap: 8 }}>
                            <Label>{(hi ? 'आप यहाँ हैं · ' : 'YOU ARE HERE · ') + (lessonAt >= 0 ? (hi ? 'दृश्य ' : 'SCENE ') + (lessonAt + 1) + ' / ' + unit.lessons.length : (hi ? 'इकाई की जाँच' : 'UNIT CHECK')) + ' · ' + next.title[lang]}</Label>
                            <Button primary label={hi ? 'कहानी आगे बढ़ाएँ' : 'Continue the story'} onPress={() => onLesson(next.id)} />
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                  {part.leaf ? <LeafRow leaf={part.leaf} won={!!state.leaves.find(l => l.id === part.leaf!.id)?.recovered} c={c} onPress={() => onLeaf(part.leaf!.id)} /> : null}
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
      <UnitSheet index={index} state={state} unitId={unitId} onClose={() => setUnitId(null)} onLesson={onLesson} />
    </SafeAreaView>
  );
}

function UnitBeat({ act, unit, n, done, here, planned, c, onPress }: {
  act: Act; unit: UnitSummary; n: number; done: boolean; here: boolean; planned: boolean; c: StoryTheme; onPress: () => void;
}) {
  const hi = useCopy(), { lang } = useGuideLang(), { sized } = useTypeScale();
  const ghost = unit.ghost;
  const state = planned ? (hi ? 'जल्द आ रहा है' : 'COMING SOON') : done ? (hi ? 'मुक्त' : 'FREED') : here ? (hi ? 'आपकी प्रतीक्षा में' : 'WAITING FOR YOU') : unit.lessons.length + (hi ? ' पाठ' : ' LESSONS');
  const dot = here ? 16 : 12;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={(hi ? 'इकाई ' : 'Unit ') + n + ', ' + unit.title[lang] + '. ' + state + (hi ? '. पाठ खोलें' : '. Open its lessons')} onPress={onPress}
      style={({ pressed }) => [{ flexDirection: 'row', gap: 12 }, pressed && { backgroundColor: c.surface }]}>
      <View style={{ width: 20, alignItems: 'center' }}>
        <View style={{ width: 2, height: 10, backgroundColor: done || here ? act.color : c.line }} />
        <View style={{ width: dot, height: dot, borderWidth: 2, borderColor: done || here ? act.color : c.lineStrong, backgroundColor: done ? act.color : here ? c.surface : c.paper }} />
        <View style={{ width: 2, flex: 1, backgroundColor: done ? act.color : c.line }} />
      </View>
      <View style={{ flex: 1, paddingTop: 4, paddingBottom: 12, opacity: planned ? 0.7 : 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text style={{ fontFamily: 'Mukta_500Medium', fontSize: sized(12), color: c.ink3 }}>{n}</Text>
          {unit.title_sa ? <Text style={{ fontFamily: 'TiroDevanagariSanskrit_400Regular', fontSize: sized(17), color: c.ink }}>{unit.title_sa}</Text> : null}
          <Text style={{ flex: 1, fontFamily: 'Mukta_600SemiBold', fontSize: sized(14), color: c.ink }} numberOfLines={1}>{unit.title[lang]}</Text>
          <Text style={{ color: c.ink3, fontSize: sized(16) }}>›</Text>
        </View>
        <Text numberOfLines={2} style={{ fontFamily: 'Mukta_400Regular', fontSize: sized(13), lineHeight: sized(19), color: c.ink2 }}>{unit.episode.summary[lang]}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
          {ghost ? <Text style={{ fontFamily: 'TiroDevanagariSanskrit_400Regular', fontSize: sized(14), color: done || here ? c.ink : c.ink3 }}>{ghost.name_sa}</Text> : null}
          {ghost ? <Text style={{ fontFamily: 'Mukta_400Regular', fontSize: sized(12), color: c.ink2 }}>{ghost.name[lang]}</Text> : null}
          <Chip text={state} tone={done ? 'done' : here ? 'here' : 'plain'} c={c} />
        </View>
      </View>
    </Pressable>
  );
}

function LeafRow({ leaf, won, c, onPress }: { leaf: NonNullable<Act['parts'][number]['leaf']>; won: boolean; c: StoryTheme; onPress: () => void }) {
  const hi = useCopy(), { lang } = useGuideLang(), { sized } = useTypeScale();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={(hi ? 'पत्र ' : 'Leaf ') + leaf.n + ', ' + leaf.title[lang] + (won ? (hi ? ', मिल गया' : ', recovered') : '')} onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 32, marginBottom: 8, minHeight: 44, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderStyle: won ? 'solid' : 'dashed', borderColor: won ? c.ochre : c.lineStrong }}>
      <Text style={{ flex: 1, fontFamily: 'Mukta_400Regular', fontSize: sized(14), color: c.ink }}>
        <Text style={{ fontFamily: 'Mukta_700Bold' }}>{(hi ? 'पत्र ' : 'Leaf ') + leaf.n}</Text> · {leaf.title[lang]}
      </Text>
      <Text style={{ fontFamily: 'Mukta_700Bold', fontSize: sized(11), letterSpacing: 0.5, color: won ? c.ochre : c.ink3 }}>{won ? (hi ? 'मिल गया' : 'RECOVERED') : (hi ? 'प्रतीक्षा में' : 'WAITING')}</Text>
    </Pressable>
  );
}

// ── Simple mode: five parts, one open ────────────────────────────────────

function SimpleHome() {
  const { index, state, error } = useCourse('simple');
  const nav = useNavigation<Nav>();
  if (!index || !state) return <Loading mode="simple" error={error} track="simple" />;
  return (
    <SimpleHomeView index={index} state={state}
      onLesson={id => nav.navigate('StoryLesson', { lessonId: id, track: 'simple' })}
      onUnit={unitId => nav.navigate('SimpleUnit', { unitId })} />
  );
}

/** The lesson Simple mode continues with, and where it sits. */
export function simpleNext(index: StoryIndex, state: StoryState) {
  const id = state.current?.lesson_id;
  const context = unitContexts(index).find(x => unitStops(x.unit).some(l => l.id === id));
  if (!id || !context) return null;
  const lesson = lessonSummaries(index).find(l => l.id === id) as LessonSummary;
  const at = context.unit.lessons.findIndex(l => l.id === id);
  return { lesson, context, at, number: unitContexts(index).findIndex(x => x.unit.id === context.unit.id) + 1 };
}

export function SimpleHomeView({ index, state, onLesson, onUnit }: {
  index: StoryIndex; state: StoryState; onLesson: (id: string) => void; onUnit: (unitId: string) => void;
}) {
  const c = useStoryTheme(), hi = useCopy(), { lang } = useGuideLang(), { sized } = useTypeScale();
  const contexts = unitContexts(index), total = contexts.length;
  const doneUnits = contexts.filter(x => state.units[x.unit.id]?.done).length;
  const next = simpleNext(index, state);
  const open = simpleOpen(index, state);
  const [openAct, setOpenAct] = useState<string | null>(next?.context.act.id ?? index.acts[0]?.id ?? null);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top']}>
      <LearnHeader mode="simple" />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <Text style={{ paddingHorizontal: 16, fontFamily: 'Mukta_400Regular', fontSize: sized(13), color: c.ink3 }}>
          {hi ? 'वही पाठ, बिना कहानी के। इसकी प्रगति अलग रहती है।' : 'The same lessons without the story. Progress here is kept apart from Story mode.'}
        </Text>
        <View style={{ margin: 16, marginBottom: 0, borderWidth: 1.5, borderColor: c.actionText, backgroundColor: c.surface }}>
          <Text style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: c.action, color: c.white, fontFamily: 'Mukta_600SemiBold', fontSize: sized(12), letterSpacing: 1 }}>
            {next ? (hi ? 'आगे · इकाई ' : 'NEXT · UNIT ') + next.number + (hi ? ' / ' : ' OF ') + total : (hi ? 'सब पूरा' : 'ALL DONE')}
          </Text>
          <View style={{ padding: 12, gap: 6 }}>
            {next ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  {next.context.unit.title_sa ? <Text style={{ fontFamily: 'TiroDevanagariSanskrit_400Regular', fontSize: sized(22), color: c.ink }}>{next.context.unit.title_sa}</Text> : null}
                  <Text style={{ fontFamily: 'Mukta_600SemiBold', fontSize: sized(16), color: c.ink }}>{next.context.unit.title[lang]}</Text>
                </View>
                <Label>
                  {(next.at >= 0 ? (hi ? 'पाठ ' : 'Lesson ') + (next.at + 1) + (hi ? ' / ' : ' of ') + next.context.unit.lessons.length : (hi ? 'इकाई की जाँच' : 'Unit check')) + ' · ' + next.lesson.title[lang] + ' · ' + next.lesson.minutes + (hi ? ' मिनट' : ' min')}
                </Label>
                <Label>{doneUnits + (hi ? ' / ' : ' of ') + total + (hi ? ' इकाइयाँ पूरी' : ' units done')}</Label>
                <Button primary label={hi ? 'जारी रखें' : 'Continue'} onPress={() => onLesson(next.lesson.id)} />
              </>
            ) : (
              <Bi value={{ en: 'Every unit is done. Open any unit to go over it again.', hi: 'सभी इकाइयाँ पूरी हैं। दोहराने के लिए कोई भी इकाई खोलें।' }} size={15} />
            )}
          </View>
        </View>

        <View style={{ marginHorizontal: 16, marginTop: 20, borderTopWidth: 1, borderColor: c.line }}>
          {index.acts.map(act => {
            const units = act.parts.flatMap(p => p.units);
            const doneHere = units.filter(u => state.units[u.id]?.done).length;
            const expanded = openAct === act.id;
            const name = PART_NAMES[act.n] ?? act.title;
            return (
              <View key={act.id} style={{ borderBottomWidth: 1, borderColor: c.line }}>
                <Pressable accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={(hi ? 'भाग ' : 'Part ') + act.n + ', ' + name[lang] + ', ' + doneHere + (hi ? ' / ' : ' of ') + units.length}
                  onPress={() => setOpenAct(expanded ? null : act.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4, backgroundColor: expanded ? c.surface : 'transparent' }}>
                  <View style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: act.color }}>
                    <Text style={{ fontFamily: 'Mukta_700Bold', fontSize: sized(15), color: c.white }}>{act.n}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'Mukta_600SemiBold', fontSize: sized(16), color: c.ink }}>{name[lang]}</Text>
                    <Label>{doneHere + (hi ? ' / ' : ' of ') + units.length + (hi ? ' इकाइयाँ' : ' units')}</Label>
                    <View style={{ height: 3, marginTop: 6, backgroundColor: c.line }}>
                      <View style={{ height: 3, width: `${Math.round((100 * doneHere) / Math.max(1, units.length))}%`, backgroundColor: act.color }} />
                    </View>
                  </View>
                  <Text style={{ fontSize: sized(18), color: c.ink }}>{expanded ? '⌃' : '⌄'}</Text>
                </Pressable>
                {expanded ? (
                  <View style={{ paddingLeft: 50, paddingRight: 4, paddingBottom: 10 }}>
                    <Text style={{ fontFamily: 'Mukta_400Regular', fontSize: sized(13), lineHeight: sized(19), color: c.ink2, paddingBottom: 4 }}>{act.goal[lang]}</Text>
                    {units.map(unit => {
                      const u = state.units[unit.id], done = !!u?.done, planned = unit.status === 'planned';
                      const reachable = !planned && unitStops(unit).some(l => open.has(l.id));
                      const status = planned ? (hi ? 'जल्द' : 'Soon') : done ? (hi ? '✓ पूरा' : '✓ Done') : reachable ? (u?.finished ?? 0) + '/' + (u?.total ?? 0) : (hi ? 'बंद' : 'Locked');
                      return (
                        <Pressable key={unit.id} accessibilityRole="button" accessibilityLabel={unit.title[lang] + ', ' + status} onPress={() => onUnit(unit.id)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, borderTopWidth: 1, borderColor: c.line, opacity: reachable || done ? 1 : 0.6 }}>
                          {unit.title_sa ? <Text style={{ fontFamily: 'TiroDevanagariSanskrit_400Regular', fontSize: sized(15), color: c.ink }}>{unit.title_sa}</Text> : null}
                          <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'Mukta_400Regular', fontSize: sized(13), color: c.ink2 }}>{unit.title[lang]}</Text>
                          <Text style={{ fontFamily: 'Mukta_600SemiBold', fontSize: sized(12), color: done ? c.doneInk : c.ink3 }}>{status}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
