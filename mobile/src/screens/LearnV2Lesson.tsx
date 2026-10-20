// Lesson player — one card at a time, in Learn's look (owner-approved
// 2026-10-13). Swipe or Continue moves one card; Back returns one (the story
// course is swipe-only, owner 2026-10-20: no buttons); no
// auto-advance, no timer, no wrap. The first answer to each check is counted
// for the finish screen. Finishing marks the lesson read on the device and
// posts it once to the server (POST /progress/card-lesson): the first finish
// earns XP, every finish marks the day for the streak.

import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, FlatList, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../api/client";
import FetchError from "../components/FetchError";
import { Skeleton } from "../components/Skeleton";
import { useAskContext } from "../ask/AskProvider";
import { useGuideLang } from "../hooks/useGuide";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useTypeScale } from "../hooks/useTypeScale";
import { useQuery } from "../hooks/useQuery";
import LearnV2CardView, { lessonArtworkSources } from "../learnv2/LearnCard";
import { getLearnV2Lesson } from "../learnv2/catalogue";
import { loadCardLesson } from "../learnv2/loadLesson";
import type { LearnV2Lesson } from "../learnv2/types";
import { getLearnV2LastCard, loadLearnV2Visited, markLearnV2CardVisited, markLearnV2LessonDone, setLearnV2LastCard, setLearnV2LastLesson } from "../learnv2/progress";
import type { RootStackParamList } from "../navigation/types";
import { prefetchArtwork } from "../services/artworkCache";
import { haptics } from "../services/haptics";
import { loadGrammarProgress, setLastTopic, setTopicRead } from "../services/grammarGuide";
import { findStopByCards, stopAfter } from "../trail/course";
import { isStopDone, loadTrailCardDoneMap, loadVisited } from "../trail/progress";
import { toolName } from "../trail/text";
import { T, sa, ui } from "../trail/theme";
import { IconButton, LangSwitch, PrimaryButton, Segments, TextButton } from "../trail/ui";
import { dayStreak, localToday } from "../utils/streak";

type Props = NativeStackScreenProps<RootStackParamList, "LearnV2Lesson">;

interface Finish {
  xp: number | null;
  todayXp: number | null;
  goalXp: number | null;
  goalMet: boolean;
  streak: number;
  unitDone: boolean[];
}

export default function LearnV2LessonScreen({ route, navigation }: Props) {
  return <CardLessonScreen lessonId={route.params.lessonId} navigation={navigation} />;
}

type LessonNavigation = NativeStackNavigationProp<RootStackParamList>;

/** Both the trail and every guide topic use this entry, including future topics. */
export function CardLessonScreen({ lessonId, navigation }: { lessonId: string; navigation: LessonNavigation }) {
  const { lang } = useGuideLang();
  const authored = getLearnV2Lesson(lessonId);
  const query = useQuery(`card-lesson:${lessonId}`, () => loadCardLesson(lessonId), { ttlMs: 30 * 60_000 });
  const lesson = authored ?? query.data;
  if (!lesson) return <SafeAreaView style={styles.safe}>
    <View style={styles.topBar}><IconButton icon="close" label={lang === "hi" ? "बंद करें" : "Close"} onPress={() => navigation.goBack()} /></View>
    <View style={styles.page}>
      {query.failed ? <FetchError label={lang === "hi" ? "पाठ लोड नहीं हुआ।" : "Could not load this lesson."} retryLabel={lang === "hi" ? "फिर कोशिश करें" : "Try again"} onRetry={query.retry} />
        : <View accessible accessibilityLabel={lang === "hi" ? "पाठ लोड हो रहा है" : "Loading lesson"} style={{ gap: 16 }}><Skeleton height={28} /><Skeleton height={180} /><Skeleton height={90} /></View>}
    </View>
  </SafeAreaView>;
  return <LegacyLessonPlayer key={lessonId} lesson={lesson} navigation={navigation} />;
}

function LegacyLessonPlayer({ lesson, navigation }: { lesson: LearnV2Lesson; navigation: LessonNavigation }) {
  const lessonId = lesson.id;
  const stop = useMemo(() => findStopByCards(lessonId), [lessonId]);
  const next = stop ? stopAfter(stop) : undefined;
  const accent = stop?.stage.color ?? T.action;
  const { lang, setLang } = useGuideLang();
  const hi = lang === "hi";
  const { sized } = useTypeScale();
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<number>>(null);
  const answers = useRef<Record<string, boolean>>({});
  const completing = useRef(false);

  const [index, setIndex] = useState(0);
  const [resumed, setResumed] = useState(false);
  useEffect(() => {
    const uris = lesson.cards.slice(index, index + 3).flatMap(card => lessonArtworkSources(card, Math.min(width, height) >= 600)).flatMap(source =>
      source && typeof source === "object" && !Array.isArray(source) && source.uri ? [source.uri] : []);
    prefetchArtwork(uris);
  }, [lesson, index, width, height]);
  const [finish, setFinish] = useState<Finish | null>(null);

  useAskContext("lesson", lesson?.titleSa ?? lessonId);

  const total = lesson?.cards.length ?? 0;
  const indices = useMemo(() => Array.from({ length: total }, (_, i) => i), [total]);
  const checks = lesson?.cards.filter((c) => c.practice).length ?? 0;

  useEffect(() => {
    setLearnV2LastLesson(lessonId);
    if (lesson.topicIds?.[0]) void setLastTopic(lesson.topicIds[0]);
  }, [lessonId, lesson.topicIds]);

  useEffect(() => {
    if (resumed || total === 0) return;
    setResumed(true);
    getLearnV2LastCard(lessonId).then((saved) => {
      const at = Math.min(Math.max(saved, 0), total - 1);
      if (at > 0) {
        setIndex(at);
        requestAnimationFrame(() => listRef.current?.scrollToIndex({ index: at, animated: false }));
      }
    });
    loadLearnV2Visited(lessonId, (lesson?.cards ?? []).map((c) => c.id)).catch(() => {});
  }, [lessonId, lesson, total, resumed]);

  useEffect(() => {
    const card = lesson?.cards[index];
    if (card) markLearnV2CardVisited(lessonId, card.id);
  }, [lessonId, lesson, index]);

  const goTo = useCallback((to: number) => {
    if (!lesson || to < 0 || to >= total) return;
    haptics.tap();
    setIndex(to);
    setLearnV2LastCard(lessonId, to);
    listRef.current?.scrollToIndex({ index: to, animated: !reduced });
    AccessibilityInfo.announceForAccessibility(hi ? `कार्ड ${to + 1} / ${total}` : `Card ${to + 1} of ${total}`);
  }, [lesson, lessonId, total, reduced, hi]);


  const complete = useCallback(async () => {
    if (completing.current) return;
    completing.current = true;
    haptics.correct();
    await loadTrailCardDoneMap();
    await markLearnV2LessonDone(lessonId);
    setLearnV2LastCard(lessonId, 0);
    // Opening or swiping never completes a lesson; finishing updates both views.
    for (const topicId of lesson.topicIds ?? []) await setTopicRead(topicId, true);
    AccessibilityInfo.announceForAccessibility(hi ? "पाठ पूरा।" : "Lesson complete.");
    const right = Object.values(answers.current).filter(Boolean).length;
    // The finish screen shows at once from device data; XP and the streak
    // fill in when the server answers (never block on a slow network).
    const [cardsDone, visited, grammar] = await Promise.all([
      loadTrailCardDoneMap(),
      loadVisited(),
      loadGrammarProgress(),
    ]);
    const facts = { cardsDone: { ...cardsDone, [lessonId]: true }, topicsRead: grammar.read, visited, mastery: {} };
    setFinish({
      xp: null, todayXp: null, goalXp: null, goalMet: false, streak: 0,
      unitDone: stop ? stop.unit.lessons.map((l) => isStopDone({ ...stop, lesson: l }, facts)) : [],
    });
    const server = await api.cardLessonDone({ lesson_id: lessonId, checks_right: right, checks_total: checks }).catch(() => null);
    const history = server ? await api.progressHistory(35).catch(() => null) : null;
    if (server) {
      setFinish((f) => f && {
        ...f,
        xp: server.xp, todayXp: server.today_xp, goalXp: server.goal_xp, goalMet: !!server.goal_met,
        streak: history ? dayStreak(history, localToday()) : 0,
      });
    }
  }, [lessonId, lesson.topicIds, hi, checks, stop]);

  const goNext = () => {
    if (!next) { navigation.goBack(); return; }
    const l = next.lesson;
    navigation.replace("LearnV2Lesson", { lessonId: l.cards });
  };

  const openActivity = () => {
    const tool = stop?.lesson.tool;
    if (!tool) return;
    if (tool.kind === "book") navigation.navigate("Book", { bookKey: tool.bookKey });
    else if (tool.kind === "paradigm") navigation.navigate("Paradigm", { kind: tool.of });
    else if (tool.screen === "Vocab" || tool.screen === "WordOrder" || tool.screen === "WordLab") navigation.navigate(tool.screen, {});
    else navigation.navigate(tool.screen);
  };

  if (finish) {
    const right = Object.values(answers.current).filter(Boolean).length;
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.topBar}>
          <IconButton icon="close" label={hi ? "बंद करें" : "Close"} onPress={() => navigation.goBack()} />
        </View>
        <ScrollView contentContainerStyle={styles.doneBody}>
          <View style={styles.emblem}><Ionicons name="checkmark" size={46} color={T.white} /></View>
          <Text accessibilityRole="header" style={[styles.doneTitle, { fontSize: sized(32) }]}>{hi ? "पाठ पूरा" : "Lesson complete"}</Text>
          <Text style={[sa(sized(22)), { color: T.ink2, textAlign: "center" }]}>{lesson.titleSa}</Text>

          <View style={styles.stats}>
            <Stat value={String(total)} label={hi ? "कार्ड" : "cards"} />
            {checks ? <Stat value={hi ? `${right} / ${checks}` : `${right} of ${checks}`} label={hi ? "सही जाँच" : "checks right"} divider /> : null}
            {finish.xp != null ? <Stat value={`+${finish.xp}`} label="XP" divider accent /> : null}
          </View>

          {stop ? (
            <View style={styles.panel}>
              <Text style={[ui("bold"), { color: accent, fontSize: sized(12), letterSpacing: 1 }]}>
                {hi ? `इकाई ${stop.unit.n} · ${stop.unit.title.hi}` : `UNIT ${stop.unit.n} · ${stop.unit.title.en.toUpperCase()}`}
              </Text>
              <View style={styles.markRow}>
                {stop.unit.lessons.map((l, i) => (
                  <View key={l.id} style={[styles.mark, finish.unitDone[i] && { backgroundColor: T.done, borderColor: T.done }]}>
                    {finish.unitDone[i] ? <Ionicons name="checkmark" size={15} color={T.white} /> : <Text style={[ui("semibold"), { color: T.ink3, fontSize: 13 }]}>{i + 1}</Text>}
                  </View>
                ))}
              </View>
              <Text style={[ui("regular"), { color: T.ink, fontSize: sized(14.5) }]}>
                {hi ? `${finish.unitDone.filter(Boolean).length} / ${stop.unit.lessons.length} पाठ पढ़े।` : `${finish.unitDone.filter(Boolean).length} of ${stop.unit.lessons.length} lessons read.`}
              </Text>
            </View>
          ) : null}

          {finish.streak > 0 ? (
            <View style={[styles.panel, styles.streakRow]}>
              <Ionicons name="flame" size={22} color="#D9772B" />
              <View>
                <Text style={[ui("semibold"), { color: T.ink, fontSize: sized(16) }]}>{hi ? `${finish.streak} दिन लगातार` : `${finish.streak}-day streak`}</Text>
                {finish.todayXp != null ? (
                  <Text style={[ui("regular"), { color: T.ink2, fontSize: sized(13.5) }]}>
                    {finish.goalMet ? (hi ? "आज का लक्ष्य पूरा" : "Today's goal is done") : hi ? `आज ${finish.todayXp} / ${finish.goalXp} XP` : `${finish.todayXp} of ${finish.goalXp} XP today`}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          <View style={{ gap: 2 }}>
            <Text selectable style={[ui("regular"), { color: T.ink3, fontSize: sized(13), lineHeight: sized(19) }]}>{hi ? lesson.sourcesLabel.hi : lesson.sourcesLabel.en}</Text>
            {lesson.sourceUrls?.map((url, i) => (
              <Pressable key={url} accessibilityRole="link" onPress={() => { void Linking.openURL(url).catch(() => {}); }} style={{ paddingVertical: 6 }}>
                <Text style={[ui("medium"), { color: T.action, fontSize: sized(13.5) }]}>{hi ? "स्रोत" : "Source"} {i + 1} · {safeHost(url)}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <View style={styles.bottom}>
          {stop?.lesson.tool ? <PrimaryButton label={(hi ? "अभ्यास: " : "Practise: ") + toolName(stop.lesson.tool, lang)} onPress={openActivity} /> : null}
          {stop?.unit.graded.length ? <PrimaryButton label={hi ? "अभ्यास करें" : "Practise what you learned"}
            onPress={() => navigation.navigate("Challenge", { features: stop.unit.graded })} /> : null}
          {next ? <PrimaryButton label={(hi ? "आगे: " : "Next: ") + next.lesson.title[lang]} onPress={goNext} /> : null}
          <TextButton label={hi ? "मार्ग पर लौटें" : "Back to the trail"} onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  return <LessonPlayer
    title={lesson.title[lang]} index={index} total={total} onIndexChange={goTo}
    onFinish={() => { void complete(); }} onClose={() => navigation.goBack()} hi={hi}
    palette={T} canAdvance={() => true}
    header={<LangSwitch lang={lang} onChange={setLang} />}
    renderCard={i => <LearnV2CardView card={lesson.cards[i]} accent={accent}
      onAnswer={ok => { if (!(lesson.cards[i].id in answers.current)) answers.current[lesson.cards[i].id] = ok; }} />}
  />;
}

/** Shared paging, progress and controls for every Learn deck. The story course passes `controls={false}`: swipe only, no Back/Continue bar, one Finish button on the last card. */
export interface PlayerPalette { paper:string; surface:string; ink:string; ink2:string; line:string; lineStrong:string; action:string; white:string }
export function LessonPlayer({title,index,total,onIndexChange,onFinish,onClose,hi,palette:c,renderCard,canAdvance,header,busy=false,controls=true,firstNote} : {
 title:string; index:number; total:number; onIndexChange:(index:number)=>void; onFinish:()=>void; onClose:()=>void; hi:boolean;
 palette:PlayerPalette; renderCard:(index:number)=>React.ReactNode; canAdvance:(index:number)=>boolean; header?:React.ReactNode; busy?:boolean; controls?:boolean; firstNote?:string;
}) {
 const {width}=useWindowDimensions(), {sized}=useTypeScale(), reduced=useReducedMotion();
 const ref=useRef<FlatList<number>>(null), last=index>=total-1;
 const advance=canAdvance(index) && !busy;
 const indices=useMemo(()=>Array.from({length:total},(_,i)=>i),[total]);
 useEffect(()=>{ ref.current?.scrollToOffset({offset:index*width,animated:!reduced}); },[index,width,reduced]);
 const move=(at:number)=>{ if(at<0||at>=total) return; if(at>index && !canAdvance(index)) return; onIndexChange(at); AccessibilityInfo.announceForAccessibility((hi?'कार्ड ':'Card ')+(at+1)+' / '+total); };
 const live=useRef({index,move}); live.current={index,move};
 // Swipe-only: an unanswered gate card is the last page the list holds, so there is nothing to the right to drag to; going back is free.
 // Desktop browsers have no touch swipe: the arrow keys page the cards (never while typing).
 useEffect(()=>{ if(Platform.OS!=='web') return; const w=globalThis as any; const onKey=(e:any)=>{ if(/^(INPUT|TEXTAREA|SELECT)$/.test(e?.target?.tagName??'')) return; if(e.key==='ArrowRight') live.current.move(live.current.index+1); else if(e.key==='ArrowLeft') live.current.move(live.current.index-1); }; w.addEventListener?.('keydown',onKey); return ()=>w.removeEventListener?.('keydown',onKey); },[]);
 const note=last?(advance?null:(hi?'पूरा करने के लिए इस प्रश्न का उत्तर दें':'Answer this to finish')):!advance&&!busy?(hi?'आगे जाने के लिए इस प्रश्न का उत्तर दें':'Answer this to go on'):index===0?(firstNote??(hi?'अगले कार्ड के लिए बाईं ओर स्वाइप करें  ›':'Swipe left for the next card  ›')):null;
 return <SafeAreaView edges={['top','bottom']} style={{flex:1,backgroundColor:c.paper}}>
 <View style={{flexDirection:'row',alignItems:'center',paddingHorizontal:12,paddingVertical:2,gap:10}}>
 <Pressable accessibilityRole="button" accessibilityLabel={hi?'पाठ बंद करें':'Close lesson'} onPress={onClose} style={{minWidth:44,minHeight:44,justifyContent:'center'}}><Text style={{color:c.ink,fontSize:sized(24)}}>×</Text></Pressable>
 <View accessible accessibilityRole="progressbar" accessibilityLabel={hi?'पाठ की प्रगति':'Lesson progress'} accessibilityValue={{min:0,max:total,now:index+1}} accessibilityActions={[{name:'increment',label:hi?'अगला कार्ड':'Next card'},{name:'decrement',label:hi?'पिछला कार्ड':'Previous card'}]} onAccessibilityAction={e=>{ if(e.nativeEvent.actionName==='increment') move(index+1); else if(e.nativeEvent.actionName==='decrement') move(index-1); }} style={{flex:1,height:5,backgroundColor:c.line}}><View style={{width:(((index+1)/Math.max(total,1)*100)+'%') as `${number}%`,height:5,backgroundColor:c.action}}/></View>
 <Text style={{color:c.ink2,fontFamily:'Mukta_400Regular'}}>{index+1}/{total}</Text></View>
 <View style={{paddingHorizontal:16,paddingBottom:6,flexDirection:'row',gap:8,alignItems:'center'}}><Text numberOfLines={1} style={{flex:1,color:c.ink2,fontFamily:'Mukta_600SemiBold',fontSize:sized(15)}}>{title}</Text>{header}</View>
 <FlatList ref={ref} data={controls||advance?indices:indices.slice(0,index+1)} extraData={{index,renderCard,advance}} horizontal scrollEnabled={controls?advance:!busy}
 snapToInterval={width} snapToAlignment="start" decelerationRate="fast" disableIntervalMomentum
 keyExtractor={i=>String(i)} renderItem={({item:i})=><View testID={'lesson-card-'+i} accessibilityElementsHidden={i!==index} importantForAccessibility={i===index?'auto':'no-hide-descendants'} style={{width}}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingHorizontal:16,paddingTop:8,paddingBottom:controls?32:96,gap:14}} nestedScrollEnabled>{renderCard(i)}</ScrollView></View>}
 onScroll={e=>{if(!canAdvance(index)&&e.nativeEvent.contentOffset.x>index*width+1)ref.current?.scrollToOffset({offset:index*width,animated:false});}} scrollEventThrottle={16}
 showsHorizontalScrollIndicator={false} initialNumToRender={3} windowSize={3}
 getItemLayout={(_,i)=>({length:width,offset:width*i,index:i})}
 onMomentumScrollEnd={e=>{const at=Math.round(e.nativeEvent.contentOffset.x/width); if(at>index && (!canAdvance(index)||at>index+1)){ref.current?.scrollToOffset({offset:index*width,animated:false});return;} move(at);}}
 accessibilityLabel={hi?'पाठ के कार्ड':'Lesson cards'} />
 {controls?<View style={{flexDirection:'row',gap:10,padding:12,borderTopWidth:1,borderTopColor:c.line}}>
 <Pressable accessibilityRole="button" accessibilityLabel={hi?'पिछला कार्ड':'Previous card'} accessibilityState={{disabled:index===0}} disabled={index===0} onPress={()=>move(index-1)} style={{padding:14,minHeight:52,borderWidth:1,borderColor:c.lineStrong,opacity:index===0?.4:1}}><Text style={{color:c.ink,fontFamily:'Mukta_600SemiBold'}}>{hi?'पीछे':'Back'}</Text></Pressable>
 <Pressable accessibilityRole="button" accessibilityLabel={last?(hi?'पाठ पूरा करें':'Finish lesson'):(hi?'आगे':'Continue')} accessibilityState={{disabled:!advance}} disabled={!advance} onPress={()=>{if(!advance)return;last?onFinish():move(index+1);}} style={{flex:1,alignItems:'center',justifyContent:'center',padding:14,minHeight:52,backgroundColor:c.action,opacity:advance?1:.45}}><Text style={{fontFamily:'Mukta_600SemiBold',fontSize:sized(17),color:c.white}}>{last?(hi?'पाठ पूरा करें':'Finish lesson'):(hi?'आगे':'Continue')}</Text></Pressable>
 </View>:<View style={{paddingHorizontal:16,paddingBottom:8,gap:6}}>
 {last?<Pressable accessibilityRole="button" accessibilityLabel={hi?'पाठ पूरा करें':'Finish lesson'} accessibilityState={{disabled:!advance}} disabled={!advance} onPress={()=>{if(advance)onFinish();}} style={{alignItems:'center',justifyContent:'center',padding:12,minHeight:48,backgroundColor:c.action,opacity:advance?1:.45}}><Text style={{fontFamily:'Mukta_600SemiBold',fontSize:sized(17),color:c.white}}>{hi?'पाठ पूरा करें':'Finish lesson'}</Text></Pressable>:null}
 {note?<Text accessibilityLiveRegion="polite" style={{textAlign:'center',color:c.ink2,fontFamily:'Mukta_400Regular',fontSize:sized(13)}}>{note}</Text>:null}
 </View>}</SafeAreaView>;
}

function safeHost(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

function Stat({ value, label, divider, accent }: { value: string; label: string; divider?: boolean; accent?: boolean }) {
  const { sized } = useTypeScale();
  return (
    <View style={[styles.stat, divider && { borderLeftWidth: 1, borderLeftColor: T.line }]}>
      <Text style={[ui("bold"), { color: accent ? T.action : T.ink, fontSize: sized(24) }]}>{value}</Text>
      <Text style={[ui("regular"), { color: T.ink2, fontSize: sized(13.5) }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.paper },
  topBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 4, paddingRight: 16, minHeight: 52 },
  page: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  bottomRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: T.line, backgroundColor: T.paper },
  back: { width: 52, height: 52, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: T.lineStrong, backgroundColor: T.surface },
  doneBody: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 14, alignItems: "stretch" },
  emblem: { alignSelf: "center", width: 96, height: 96, alignItems: "center", justifyContent: "center", backgroundColor: T.done, borderWidth: 8, borderColor: T.doneBg },
  doneTitle: { fontFamily: "TiroDevanagariSanskrit_400Regular", color: T.ink, textAlign: "center", marginTop: 8 },
  stats: { flexDirection: "row", paddingVertical: 12, backgroundColor: T.surface, borderWidth: 1, borderColor: T.line },
  stat: { flex: 1, alignItems: "center" },
  panel: { gap: 10, padding: 14, backgroundColor: T.surface, borderWidth: 1, borderColor: T.line },
  markRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  mark: { width: 30, height: 30, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: T.muted },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  bottom: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, gap: 2, borderTopWidth: 1, borderTopColor: T.line },
});
