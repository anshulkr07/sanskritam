import React, {useCallback,useState} from "react";
import {Pressable,ScrollView,StyleSheet,Text,TextInput,View} from "react-native";
import {useFocusEffect} from "@react-navigation/native";
import {SafeAreaView} from "react-native-safe-area-context";
import {api} from "../api/client";
import {hubArtwork} from "../components/artwork/hubs";
import LangToggle from "../components/grammar/LangToggle";
import {useGrammarProgress,useGuideLang} from "../hooks/useGuide";
import {useQuery} from "../hooks/useQuery";
import {useTypeScale} from "../hooks/useTypeScale";
import {COURSE_CHAPTERS} from "../learnv2/courseOutline";
import {LearningRow,learningStyles as s} from "../learnv2/LearningRow";
import {LEARNV2_LESSONS} from "../learnv2/catalogue";
import {getLearnV2LastLesson,loadLearnV2DoneMap} from "../learnv2/progress";
import {chapterCards,chapterLessons,searchLearning,unlockedUnitIds} from "../learnv2/unified";
import type {TabScreenProps} from "../navigation/types";
import {fetchGuideIndex} from "../services/grammarGuide";
import {haptics} from "../services/haptics";
import {color,radius,space} from "../theme";

type Section="course"|"reference"|"practice";
const SECTIONS: Array<{id:Section;en:string;hi:string}>=[
  {id:"course",en:"Course",hi:"पाठ"},{id:"reference",en:"Reference",hi:"संदर्भ"},{id:"practice",en:"Practice",hi:"अभ्यास"},
];
export default function LearnHubScreen({navigation}:TabScreenProps<"Learn">){
  const {lang,t,setLang}=useGuideLang();
  const {sized}=useTypeScale();
  const {read,last}=useGrammarProgress();
  const [section,setSection]=useState<Section>("course");
  const [query,setQuery]=useState("");
  const [lastCard,setLastCard]=useState<string|null>(null);
  const [done,setDone]=useState<Record<string,boolean>>({});
  const guide=useQuery("guide-index",fetchGuideIndex,{ttlMs:30*60_000});
  const course=useQuery("units",api.units,{refetchOnFocus:true});
  useFocusEffect(useCallback(()=>{
    let alive=true;
    Promise.all([getLearnV2LastLesson(),loadLearnV2DoneMap(LEARNV2_LESSONS.map(l=>l.id))]).then(([id,map])=>{
      if(alive){setLastCard(id);setDone(map);}
    });
    return ()=>{alive=false;};
  },[]));
  const units=course.data??[];
  const unlocked=unlockedUnitIds(units);
  const found=searchLearning(query,units,guide.data?.topics??[]);
  const resumeCard=LEARNV2_LESSONS.find(l=>l.id===lastCard);
  const resumeTopic=guide.data?.topics.find(tp=>tp.id===last);
  const text=(en:string,hi:string)=>lang==="hi"?hi:en;
  const heading=(label:string)=><Text accessibilityRole="header" style={[s.heading,{fontSize:sized(20)}]}>{label}</Text>;
  const cardUnlocked=(prereqs:string[])=>prereqs.every(id=>done[id]);
  const lessonRows=found.lessons.map(lesson=><LearningRow key={lesson.id} title={lang==="hi"?lesson.title_hi:lesson.title_en}
    subtitle={unlocked.has(lesson.unit_id)?text("Lesson with assessed practice","पाठ और मूल्यांकित अभ्यास"):text("Complete practice in the preceding course unit to unlock.","पिछली इकाई में अभ्यास करके खोलें।")}
    disabled={!unlocked.has(lesson.unit_id)} onPress={()=>navigation.navigate("Lesson",{featureId:lesson.feature_id,lessonId:lesson.id})}/>);
  return <SafeAreaView style={s.safe} edges={["top"]}>
    <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text accessibilityRole="header" style={[s.title,{flex:1,fontSize:sized(28)}]}>{text("Learn Sanskrit","संस्कृत सीखें")}</Text>
        <LangToggle lang={lang} onChange={setLang}/>
      </View>
      <View style={styles.sections} accessibilityRole="tablist">
        {SECTIONS.map(item=><Pressable key={item.id} accessibilityRole="tab" accessibilityState={{selected:section===item.id}}
          accessibilityLabel={item[lang]} onPress={()=>{haptics.tap();setSection(item.id);setQuery("");}}
          style={[styles.section,section===item.id&&styles.selected]}>
          <Text style={[styles.sectionText,{fontSize:sized(15)},section===item.id&&styles.selectedText]}>{item[lang]}</Text>
        </Pressable>)}
      </View>
      <TextInput value={query} onChangeText={setQuery} accessibilityLabel={text("Search lessons and reference","पाठ और संदर्भ खोजें")}
        placeholder={text("Search lessons and reference","पाठ और संदर्भ खोजें")} placeholderTextColor={color.inkFaint}
        autoCorrect={false} style={[styles.search,{fontSize:sized(16)}]}/>
      {query.trim()?<>
        {course.loading||guide.loading?<Text style={s.note}>{text("Searching available content…","उपलब्ध सामग्री खोज रहे हैं…")}</Text>:null}
        {found.cards.length>0&&heading(text("Card lessons","कार्ड पाठ"))}
        {found.cards.map(lesson=><LearningRow key={lesson.id} title={t(lesson.title)}
          subtitle={cardUnlocked(lesson.prereqIds)?text(`${lesson.cards.length} cards`,`${lesson.cards.length} कार्ड`):text("Read the preceding card lessons first.","पहले पिछले कार्ड पाठ पढ़ें।")}
          disabled={!cardUnlocked(lesson.prereqIds)} onPress={()=>navigation.navigate("LearnV2Lesson",{lessonId:lesson.id})}/>)}
        {found.lessons.length>0&&heading(text("Course lessons","पाठ्यक्रम के पाठ"))}{lessonRows}
        {found.topics.length>0&&heading(text("Reference topics","संदर्भ विषय"))}
        {found.topics.map(topic=><LearningRow key={topic.id} title={t(topic.title)} subtitle={read.has(topic.id)?text("Read","पढ़ा हुआ"):topic.title_sa}
          onPress={()=>navigation.navigate("GrammarTopic",{topicId:topic.id})}/>)}
        {!found.cards.length&&!found.lessons.length&&!found.topics.length&&!course.loading&&!guide.loading&&
          <Text style={s.note}>{text("No matching lessons or reference topics.","कोई पाठ या संदर्भ विषय नहीं मिला।")}</Text>}
      </>:section==="practice"?<>
        {heading(text("Put it into practice","अभ्यास में उतारें"))}
        <LearningRow title={text("Course practice","पाठ्यक्रम का अभ्यास")} subtitle={text("Continue your assessed course progress","अपने मूल्यांकित पाठ्यक्रम में आगे बढ़ें")} onPress={()=>navigation.navigate("Path")}/>
        <LearningRow title={text("Challenges","चुनौतियाँ")} onPress={()=>navigation.navigate("Challenge",{})}/>
        <LearningRow title={text("Words and vocabulary","शब्द और शब्दावली")} onPress={()=>navigation.navigate("Vocab")}/>
        <LearningRow title={text("Word Lab","शब्द प्रयोगशाला")} artwork={hubArtwork("tool:word-lab")} onPress={()=>navigation.navigate("WordLab")}/>
        <LearningRow title={text("Sounds","ध्वनियाँ")} artwork={hubArtwork("tool:sound-map")} onPress={()=>navigation.navigate("Varnamala")}/>
        <LearningRow title={text("Writing","लेखन")} onPress={()=>navigation.navigate("Writing")}/>
        <LearningRow title={text("Word order","शब्द क्रम")} artwork={hubArtwork("tool:word-order")} onPress={()=>navigation.navigate("WordOrder",{})}/>
        <LearningRow title={text("Noun forms","संज्ञा रूप")} onPress={()=>navigation.navigate("Paradigm",{kind:"noun"})}/>
        <LearningRow title={text("Verb forms","क्रिया रूप")} onPress={()=>navigation.navigate("Paradigm",{kind:"verb"})}/>
        <LearningRow title={text("Rhythm and patterns","लय और प्रतिरूप")} artwork={hubArtwork("tool:rhythm")} onPress={()=>navigation.navigate("Pingala")}/>
      </>:<>
        {section==="course"?<>
          {resumeCard&&<LearningRow title={text("Continue: ","आगे पढ़ें: ")+t(resumeCard.title)} subtitle={text("Card-reading bookmark","कार्ड पठन का चिह्न")} onPress={()=>navigation.navigate("LearnV2Lesson",{lessonId:resumeCard.id})}/>}
          <LearningRow title={text("Continue your course","पाठ्यक्रम में आगे बढ़ें")} subtitle={text("Lessons and assessed practice","पाठ और मूल्यांकित अभ्यास")} onPress={()=>navigation.navigate("Path")}/>
          <LearningRow title={text("Illustrated card lessons","चित्रों सहित कार्ड पाठ")} subtitle={text("Short steps, examples and retrieval","छोटे चरण, उदाहरण और अभ्यास")} onPress={()=>navigation.navigate("LearnCards")}/>
        </>:<>
          {resumeTopic&&<LearningRow title={text("Continue: ","आगे पढ़ें: ")+t(resumeTopic.title)} subtitle={text("Reference-reading bookmark","संदर्भ पठन का चिह्न")} onPress={()=>navigation.navigate("GrammarTopic",{topicId:resumeTopic.id})}/>}
          <LearningRow title={text("Browse all reference topics","सभी संदर्भ विषय देखें")} subtitle={text("Levels, reading marks and tools","स्तर, पढ़े विषय और उपकरण")} onPress={()=>navigation.navigate("Grammar")}/>
        </>}
        {heading(text("Explore the chapters","अध्याय देखें"))}
        {COURSE_CHAPTERS.map(chapter=>{
          const references=guide.data?.topics.filter(tp=>tp.chapter_id===chapter.id);
          const topicCount=references?.length??chapter.topicIds.length;
          const readCount=(references?.map(tp=>tp.id)??chapter.topicIds).filter(id=>read.has(id)).length;
          const count=chapterLessons(chapter.id,units).length;
          const cards=chapterCards(chapter.id).length;
          return <LearningRow key={chapter.id} title={t(chapter.title)} artwork={hubArtwork(`grammar:${chapter.id}`)}
            subtitle={section==="reference"?text(`${topicCount} topics · ${readCount} read`,`${topicCount} विषय · ${readCount} पढ़े`):
              text(`${topicCount} reading topics${count?` · ${count} assessed lessons`:""}${cards?` · ${cards} card lessons`:""}`,`${topicCount} पठन विषय${count?` · ${count} मूल्यांकित पाठ`:""}${cards?` · ${cards} कार्ड पाठ`:""}`)}
            onPress={()=>section==="reference"?navigation.navigate("GrammarChapter",{chapterId:chapter.id}):navigation.navigate("LearnChapter",{chapterId:chapter.id})}/>;
        })}
      </>}
      {course.failed&&!course.data&&<LearningRow title={text("Course could not load. Retry","पाठ्यक्रम लोड नहीं हुआ। पुनः प्रयास करें")} onPress={course.retry}/>}
      {guide.failed&&!guide.data&&<LearningRow title={text("Reference could not load. Retry","संदर्भ लोड नहीं हुआ। पुनः प्रयास करें")} onPress={guide.retry}/>}
      <Text style={[s.note,{fontSize:sized(14),lineHeight:sized(21)}]}>{text("Course progress tracks assessed practice. Reference reading and card completion keep their own bookmarks.","पाठ्यक्रम की प्रगति मूल्यांकित अभ्यास से तय होती है। संदर्भ पठन और कार्ड पाठ के चिह्न अलग रहते हैं।")}</Text>
    </ScrollView>
  </SafeAreaView>;
}
const styles=StyleSheet.create({
  header:{flexDirection:"row",alignItems:"center",gap:space.sm},sections:{flexDirection:"row",gap:4,backgroundColor:color.surfaceMuted,padding:4,borderRadius:radius.md},
  section:{flex:1,alignItems:"center",justifyContent:"center",minHeight:48,paddingVertical:8,paddingHorizontal:4,borderRadius:radius.md},
  selected:{backgroundColor:color.ink},sectionText:{fontFamily:"Nunito_700Bold",color:color.ink,textAlign:"center"},selectedText:{color:color.white},
  search:{borderWidth:1,borderColor:color.border,backgroundColor:color.surface,borderRadius:radius.md,color:color.ink,padding:space.sm,minHeight:48,fontFamily:"Nunito_400Regular"},
});
