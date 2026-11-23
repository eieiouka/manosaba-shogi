import {makeInitialState,generateAllLegalActions,applyLegalAction,positionKey} from "./rules.js";

// The existing 19-ply opening line in analyze-branch.js.
export const OPENING_LINE="a1a2 f6f5 a2b2 f5e5 e1e2 a6b5 b2c2 e5d5 f1f2 e6e5 e2e4 d5c5 f2f3 d6c6 b1b3 c6c5 c2c3 e5d4 c3c5".split(" ");
const square=text=>[6-Number(text[1]),text.charCodeAt(0)-97];
const equal=(a,b)=>a?.[0]===b[0]&&a?.[1]===b[1];
const findAction=(state,move)=>generateAllLegalActions(state).find(action=>
  equal(action.from,square(move.slice(0,2)))&&equal(action.to,square(move.slice(2,4)))&&!!action.promote===move.endsWith("+"));

const book=new Map();
let position=makeInitialState();
for(const move of OPENING_LINE){
  const action=findAction(position,move);
  if(!action)throw Error("Invalid opening book move: "+move);
  book.set(positionKey(position),move);
  position=applyLegalAction(position,action);
}

// Match exact positions, including side to move and hands. If the opponent
// deviates from the recorded line, never force the next move.
export function openingBookAction(state){
  const move=book.get(positionKey(state));
  return move?findAction(state,move):null;
}
