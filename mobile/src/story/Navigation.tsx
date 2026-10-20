import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import StoryHome from './screens/StoryHome';
import JourneyMap from './screens/JourneyMap';
import StoryLesson from './screens/StoryLesson';
import {UnitEnd,LeafShelf,Ghosts,Cast,LeafPage} from './screens/Collections';
import StoryReview from './screens/StoryReview';
type Routes=Pick<RootStackParamList,'StoryMap'|'StoryLesson'|'StoryUnitEnd'|'StoryLeaves'|'StoryGhosts'|'StoryCast'|'StoryReview'|'StoryLeaf'>&{StoryHome:undefined};
const Stack=createNativeStackNavigator<Routes>();
export default function StoryNavigation(){return <Stack.Navigator screenOptions={{headerShown:false}}>
 <Stack.Screen name="StoryHome" component={StoryHome}/><Stack.Screen name="StoryMap" component={JourneyMap}/><Stack.Screen name="StoryLesson" component={StoryLesson}/><Stack.Screen name="StoryUnitEnd" component={UnitEnd}/><Stack.Screen name="StoryLeaves" component={LeafShelf}/><Stack.Screen name="StoryGhosts" component={Ghosts}/><Stack.Screen name="StoryCast" component={Cast}/><Stack.Screen name="StoryReview" component={StoryReview}/><Stack.Screen name="StoryLeaf" component={LeafPage}/>
 </Stack.Navigator>;}
