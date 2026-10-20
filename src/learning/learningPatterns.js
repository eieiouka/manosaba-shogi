// Learning common rules. Section files configure behavior; App.jsx only coordinates UI.
import {generateAllLegalActions,generatePseudoActions,promotionStatus} from "../game/rules.js";
import {learningMoveRecord,learningStepMatches} from "./learningEngine.js";

// 第1章4節はエマのない戦術教材。王手判定を行わず駒の動きだけを利用する。
export function learningPseudoActions(state){
 const out=[];
 for(let r=0;r<6;r++)for(let c=0;c<6;c++){
  const piece=state.board[r][c];
  if(!piece||piece.side!==state.turn)continue;
  for(const action of generatePseudoActions(state,r,c)){
   if(action.swap)continue;
   out.push({...action,promote:action.movePiece===false?false:promotionStatus(piece,r,action.to[0]).mustPromote});
  }
 }
 for(const [handIndex,piece] of state.hands[state.turn].entries()){
  for(let r=0;r<6;r++)for(let c=0;c<6;c++)if(!state.board[r][c]&&(state.turn==='sente'?r!==0:r!==5)){
   out.push({category:'drop',piece,handIndex,to:[r,c],promote:false});
  }
 }
 return out;
}
export const learningActions=(level,state)=>level.actionMode==="pseudo"?learningPseudoActions(state):generateAllLegalActions(state);
export const learningTerminal=(level,state,timeline,normalResult)=>level.ignoreTerminal?null:normalResult();
export const matchingLearningBranch=(branches,record)=>branches?.find(b=>Object.entries(b.when||{}).every(([k,v])=>k==="notPiece"?record.piece!==v:record[k]===v));
export const learningOpeningBranch=(level,sceneIndex,record)=>sceneIndex===0?matchingLearningBranch(level.openingBranches,record):null;
export const learningResponseAction=(level,state,spec)=>learningActions(level,{...state,turn:"gote"}).find(a=>learningStepMatches(spec,learningMoveRecord(a,{...state,turn:"gote"})))||null;
export const learningFailureGuide=(level,sceneIndex,history,outcome,pending,state)=>{
 const config=level.failedDropGuide;
 if(!config||sceneIndex!==config.scene||outcome?.kind==="success")return null;
 const record=history.find(x=>x.piece===config.piece&&x.category==="drop"&&x.side==="sente");
 if(!record||record.to===config.exclude||(!pending&&outcome?.kind!=="failure"))return null;
 const match=/^([a-f])([1-6])$/.exec(record.to);if(!match)return null;
 const row=6-Number(match[2]),col=match[1].charCodeAt(0)-97,piece=state.board[row]?.[col];
 return piece?.type===config.piece&&piece.side==="sente"?{row,col,piece}:null;
};
