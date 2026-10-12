import React,{useCallback,useEffect,useState} from "react";
import {ScrollView,Text,View} from "react-native";
import {useFocusEffect} from "@react-navigation/native";
import type {NativeStackScreenProps} from "@react-navigation/native-stack";
import {SafeAreaView} from "react-native-safe-area-context";
import {api} from "../api/client";
import LangToggle from "../components/grammar/LangToggle";
import {useGuideLang,useGrammarProgress} from "../hooks/useGuide";
import {useQuery} from "../hooks/useQuery";
import {useTypeScale} from "../hooks/useTypeScale";
import {LEARNV2_LESSONS} from "../learnv2/catalogue";
import {COURSE_CHAPTERS} from "../learnv2/courseOutline";
import {LearningRow,learningStyles as s} from "../learnv2/LearningRow";
import {loadLearnV2DoneMap} from "../learnv2/progress";
import {chapterCards,chapterLessons,unlockedUnitIds} from "../learnv2/unified";
import type {RootStackParamList} from "../navigation/types";
import {fetchGuideIndex} from "../services/grammarGuide";

export default function LearnChapterScreen({navigation,route}:NativeStackScreenProps<RootStackParamList,"LearnChapter">){
  const chapter=COURSE_CHAPTERS.find(c=>c.id===route.params.chapterId);
  const {lang,t,setLang}=useGuideLang();
  const {sized}=useTypeScale();
  const {read}=useGrammarProgress();
  const course=useQuery("units",api.units,{refetchOnFocus:true});
  const guide=useQuery("guide-index",fetchGuideIndex,{ttlMs:30*60_000});
  const [done,setDone]=useState<Record<string,boolean>>({});
  useFocusEffect(useCallback(()=>{
    let alive=true;
    loadLearnV2DoneMap(LEARNV2_LESSONS.map(l=>l.id)).then(map=>{if(alive)setDone(map);});
    return ()=>{alive=false;};
  },[]));
  useEffect(()=>{if(chapter)navigation.setOptions({title:t(chapter.title)});},[chapter,navigation,t]);
  const text=(en:string,hi:string)=>lang==="hi"?hi:en;
  const heading=(title:string)=><Text accessibilityRole="header" style={[s.heading,{fontSize:sized(21)}]}>{title}</Text>;
  if(!chapter)return <SafeAreaView style={s.safe}><View style={s.body}><Text style={s.note}>{text("This chapter is unavailable.","यह अध्याय उपलब्ध नहीं है।")}</Text><LearningRow title={text("Return","वापस जाएँ")} onPress={()=>navigation.goBack()}/></View></SafeAreaView>;
  const units=course.data??[];
  const unlocked=unlockedUnitIds(units);
  const lessons=chapterLessons(chapter.id,units);
  const cards=chapterCards(chapter.id);
  const topics=guide.data?.topics.filter(tp=>tp.chapter_id===chapter.id)??[];
  return <SafeAreaView style={s.safe} edges={["bottom"]}>
    <ScrollView contentContainerStyle={s.body}>
      <View style={{flexDirection:"row",gap:12,alignItems:"center"}}>
        <Text accessibilityRole="header" style={[s.title,{flex:1,fontSize:sized(27)}]}>{t(chapter.title)}</Text>
        <LangToggle lang={lang} onChange={setLang}/>
      </View>
      <Text style={[s.note,{fontSize:sized(17),lineHeight:sized(26)}]}>{t(chapter.blurb)}</Text>
      {!!cards.length&&heading(text("Learn with cards","कार्ड के साथ सीखें"))}
      {cards.map(lesson=>{
        const available=lesson.prereqIds.every(id=>done[id]);
        return <LearningRow key={lesson.id} title={t(lesson.title)} disabled={!available}
          subtitle={!available?text("Read the preceding card lessons first.","पहले पिछले कार्ड पाठ पढ़ें।"):
            text(`${lesson.cards.length} cards${done[lesson.id]?" · read through":""}`,`${lesson.cards.length} कार्ड${done[lesson.id]?" · पढ़ा हुआ":""}`)}
          onPress={()=>navigation.navigate("LearnV2Lesson",{lessonId:lesson.id})}/>;
      })}
      {!!lessons.length&&heading(text("Lessons and assessed practice","पाठ और मूल्यांकित अभ्यास"))}
      {lessons.map(lesson=>{
        const available=unlocked.has(lesson.unit_id);
        return <View key={lesson.id} style={{gap:6}}>
          <LearningRow title={lang==="hi"?lesson.title_hi:lesson.title_en} disabled={!available}
            subtitle={available?text(`${lesson.step_count} steps · includes assessed practice`,`${lesson.step_count} चरण · मूल्यांकित अभ्यास सहित`):text("Practice in the preceding course unit to unlock.","पिछली पाठ्यक्रम इकाई में अभ्यास करके खोलें।")}
            onPress={()=>navigation.navigate("Lesson",{featureId:lesson.feature_id,lessonId:lesson.id})}/>
          {available&&<LearningRow title={text("Practice: ","अभ्यास: ")+(lang==="hi"?lesson.title_hi:lesson.title_en)}
            onPress={()=>navigation.navigate("Challenge",{features:lesson.features?.length?lesson.features:[lesson.feature_id]})}/>}
        </View>;
      })}
      {course.loading&&!course.data&&<Text style={s.note}>{text("Loading course lessons…","पाठ्यक्रम के पाठ लोड हो रहे हैं…")}</Text>}
      {course.failed&&!course.data&&<LearningRow title={text("Retry course lessons","पाठ्यक्रम के पाठ पुनः लोड करें")} onPress={course.retry}/>}
      {heading(text("Read and explore","पढ़ें और जानें"))}
      {topics.map(topic=><LearningRow key={topic.id} title={t(topic.title)}
        subtitle={text(`${topic.minutes} min${read.has(topic.id)?" · read":""}`,`${topic.minutes} मिनट${read.has(topic.id)?" · पढ़ा हुआ":""}`)}
        onPress={()=>navigation.navigate("GrammarTopic",{topicId:topic.id})}/>)}
      {guide.loading&&!guide.data&&<Text style={s.note}>{text("Loading reading topics…","पठन विषय लोड हो रहे हैं…")}</Text>}
      {guide.failed&&!guide.data&&<LearningRow title={text("Retry reading topics","पठन विषय पुनः लोड करें")} onPress={guide.retry}/>}
      {!guide.loading&&guide.data&&!topics.length&&<Text style={s.note}>{text("No reading topics are available in this chapter yet.","इस अध्याय में अभी पठन विषय उपलब्ध नहीं हैं।")}</Text>}
      <LearningRow title={text("Browse chapter reference","अध्याय का संदर्भ देखें")} onPress={()=>navigation.navigate("GrammarChapter",{chapterId:chapter.id})}/>
      <Text style={[s.note,{fontSize:sized(14),lineHeight:sized(21)}]}>{text("Reading topics and card completion do not award assessed mastery.","विषय पढ़ने और कार्ड पाठ पूरे करने से मूल्यांकित महारत नहीं मिलती।")}</Text>
    </ScrollView>
  </SafeAreaView>;
}
