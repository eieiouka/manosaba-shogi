import {useRef,useState} from "react";

export function useLearningState(){
 const [confirmLearningBack,setConfirmLearningBack]=useState(false);
 const [learningDialogue,setLearningDialogue]=useState(0);
 const [learningLevelIndex,setLearningLevelIndex]=useState(0);
 const [learningHistory,setLearningHistory]=useState([]);
 const [learningOutcome,setLearningOutcome]=useState(null);
 const [learningChapterSelect,setLearningChapterSelect]=useState(false);
 const learningGeneration=useRef(0);
 return {confirmLearningBack,setConfirmLearningBack,learningDialogue,setLearningDialogue,learningLevelIndex,setLearningLevelIndex,learningHistory,setLearningHistory,learningOutcome,setLearningOutcome,learningChapterSelect,setLearningChapterSelect,learningGeneration};
}
