// Existing links stay valid; every guide topic uses the shared card player.
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import type { RootStackParamList } from "../navigation/types";
import { CardLessonScreen } from "./LearnV2Lesson";

type Props = NativeStackScreenProps<RootStackParamList, "GrammarTopic">;
export default function GrammarTopicScreen({ route, navigation }: Props) {
  return <CardLessonScreen lessonId={`guide:${route.params.topicId}`} navigation={navigation} />;
}
