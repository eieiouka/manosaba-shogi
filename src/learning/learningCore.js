import {generateAllLegalActions} from "../game/rules.js";
import {learningMoveRecord,learningStepMatches} from "./learningEngine.js";

export function scriptedStep(level,history){return level.steps?.[history.length]??null}
export function scriptedDisplayStep(level,history){
 const current=scriptedStep(level,history);
 const previous=level.steps?.[history.length-1];
 if(previous?.side==="gote"&&(current?.side==="sente"||!current))return previous;
 return current;
}
export function scriptedLines(level,history){
 if(history.length===0)return level.lines;
 const display=scriptedDisplayStep(level,history);
 return display?.lines?.length?display.lines:level.lines.slice(-1);
}
export function scriptedPlayerMatches(step,record){return step?.side==="sente"&&step.correct.some(expected=>learningStepMatches(expected,record))}
// 正解判定後、失敗した着手の内容で分岐。上から最初に一致したものを採用。
// when: {piece,from,to,side,category,magic,notation} などを指定できます。
export function scriptedFailureLines(level,step,record){
 const branch=(step?.branches||[]).find(item=>item?.when&&
   Object.entries(item.when).every(([key,value])=>
     key==="notPiece"?record.piece!==value:record[key]===value));
 if(branch?.lines?.length)return branch.lines;
 if(step?.failureLines?.length)return step.failureLines;
 if(level?.defaultFailureLines?.length)return level.defaultFailureLines;
 return ["その手じゃないわ。直前の局面からやり直しなさい。"];
}

export function scriptedAutoAction(step,state){
 if(step?.side!=="gote")return null;
 const spec=step.move;
 return generateAllLegalActions({...state,turn:"gote"}).find(action=>{
  const record=learningMoveRecord(action,{...state,turn:"gote"});
  return learningStepMatches(spec,record);
 })||null;
}

// 0-based page index. Omitted means the last page of this step.
export function scriptedAutoMovePage(step,lines){
 if(step?.side!=="gote")return -1;
 const last=Math.max(0,(lines?.length||1)-1);
 const index=step.autoMoveAt??last;
 return Number.isInteger(index)&&index>=0&&index<=last?index:last;
}

export function sceneAutoAction(scene,state){
 if(!scene?.autoMove)return null;
 return generateAllLegalActions({...state,turn:"gote"}).find(a=>learningStepMatches(scene.autoMove,learningMoveRecord(a,{...state,turn:"gote"})))||null;
}
export function scenePlayerMatches(scene,record){return (scene?.correct||[]).some(x=>learningStepMatches(x,record));}

// The selected failure branch can supply per-page attack-range guides.
export function scriptedFailureBranch(step,record){
 return (step?.branches||[]).find(item=>item?.when&&
  Object.entries(item.when).every(([key,value])=>key==="notPiece"?record.piece!==value:record[key]===value))||null;
}
