// Simple mode's unit page (owner, 2026-10-20): what the unit teaches, its
// lessons, revision and check, without the ghost or the story. Finished
// lessons reopen; the next lesson and the three after it are open
// (selectors.simpleOpen); the rest show as locked.

import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../navigation/types';
import { useGuideLang } from '../../hooks/useGuide';
import { useTypeScale } from '../../hooks/useTypeScale';
import { useCourse } from '../course';
import { useStoryTheme } from '../theme';
import { Bi } from '../text';
import { Button, Label, useCopy } from '../ui';
import { canTestOut, findUnit, simpleOpen, unitContexts } from '../selectors';
import { startTestOut } from '../session';
import { PART_NAMES } from './LearnHome';
import type { LessonSummary } from '../types';

export default function SimpleUnitScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'SimpleUnit'>) {
  const { index, state } = useCourse('simple');
  const c = useStoryTheme(), hi = useCopy(), { lang } = useGuideLang(), { sized } = useTypeScale();
  const context = index ? findUnit(index, route.params.unitId) : undefined;
  if (!index || !state || !context) return <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} />;
  const { unit, act } = context;
  const open = simpleOpen(index, state);
  const number = unitContexts(index).findIndex(x => x.unit.id === unit.id) + 1;
  const start = (id: string, testOut = false) => {
    if (testOut) startTestOut(id);
    navigation.navigate('StoryLesson', { lessonId: id, track: 'simple' });
  };
  const next = [...unit.lessons, ...(unit.check ? [unit.check] : [])].find(l => open.has(l.id) && !state.finished.includes(l.id));
  const row = (lesson: LessonSummary, mark: string, note: string, testOut = false) => {
    // The current unit's check can always be taken: passing it skips the unit.
    const done = state.finished.includes(lesson.id), available = open.has(lesson.id) || testOut;
    const action = done ? (hi ? 'फिर करें' : 'Replay') : available ? (hi ? 'शुरू करें' : 'Start') : (hi ? 'बंद' : 'Locked');
    return (
      <Pressable key={lesson.id} disabled={!available} accessibilityRole="button" accessibilityState={{ disabled: !available }}
        accessibilityLabel={lesson.title[lang] + '. ' + note + '. ' + action} onPress={() => start(lesson.id, testOut)}
        style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, borderBottomWidth: 1, borderColor: c.line, opacity: available ? 1 : 0.55 }, pressed && { backgroundColor: c.surface }]}>
        <Text style={{ width: 26, fontFamily: 'Mukta_600SemiBold', fontSize: sized(14), color: done ? c.doneInk : c.ink3 }}>{done ? '✓' : mark}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'Mukta_600SemiBold', fontSize: sized(15), color: c.ink }}>{lesson.title[lang]}</Text>
          {lesson.title_sa ? <Text style={{ fontFamily: 'TiroDevanagariSanskrit_400Regular', fontSize: sized(14), color: c.ink2 }}>{lesson.title_sa}</Text> : null}
          <Label>{note}</Label>
        </View>
        <Text style={{ fontFamily: 'Mukta_600SemiBold', fontSize: sized(13), color: available ? c.actionText : c.ink3 }}>{action}</Text>
      </Pressable>
    );
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4, paddingTop: 4 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={hi ? 'वापस' : 'Back'} onPress={() => navigation.goBack()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: sized(22), color: c.ink }}>←</Text>
        </Pressable>
        <Label>{(hi ? 'भाग ' : 'Part ') + act.n + ' · ' + (PART_NAMES[act.n] ?? act.title)[lang]}</Label>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        <Label>{(hi ? 'इकाई ' : 'UNIT ') + number + (hi ? ' / ' : ' OF ') + unitContexts(index).length}</Label>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          {unit.title_sa ? <Text style={{ fontFamily: 'TiroDevanagariSanskrit_400Regular', fontSize: sized(26), color: c.ink }}>{unit.title_sa}</Text> : null}
          <Text style={{ fontFamily: 'Mukta_600SemiBold', fontSize: sized(18), color: c.ink }}>{unit.title[lang]}</Text>
        </View>
        <View style={{ marginTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderColor: c.line, gap: 4 }}>
          <Label>{hi ? 'इस इकाई में सीखेंगे' : 'YOU WILL LEARN'}</Label>
          {unit.skills.map(skill => <Bi key={skill.id} value={skill.title} size={15} />)}
        </View>
        {unit.status === 'planned' ? (
          <Bi value={{ en: 'This unit is being written.', hi: 'यह इकाई लिखी जा रही है।' }} />
        ) : (
          <>
            {unit.lessons.map((l, i) => row(l, String(i + 1), l.minutes + (hi ? ' मिनट' : ' min')))}
            {unit.revision ? row(unit.revision, 'R', hi ? 'दोहराव · कभी भी खोलें' : 'Revision · open any time') : null}
            {unit.check ? row(unit.check, '?', hi ? 'इकाई की जाँच · आता है तो आगे बढ़ें' : 'Unit check · skip ahead if you know it', canTestOut(index, state, unit)) : null}
          </>
        )}
      </ScrollView>
      {next ? (
        <View style={{ padding: 16, borderTopWidth: 1, borderColor: c.line }}>
          <Button primary label={(hi ? 'आगे: ' : 'Continue: ') + next.title[lang]} onPress={() => start(next.id)} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}
