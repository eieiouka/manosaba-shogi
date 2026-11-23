import assert from "node:assert/strict";
import {makeInitialState,generateAllLegalActions,applyLegalAction} from "../src/game/rules.js";
import {OPENING_LINE,openingBookAction} from "../src/game/openingBook.js";
import {fairySquare} from "../src/game/fairyCodec.js";

let state=makeInitialState();
for(const move of OPENING_LINE){
  const action=openingBookAction(state);
  assert.ok(action);
  assert.ok(generateAllLegalActions(state).some(legal=>JSON.stringify(legal)===JSON.stringify(action)));
  assert.equal(fairySquare(action.from)+fairySquare(action.to)+(action.promote?"+":""),move);
  state=applyLegalAction(state,action);
}
assert.equal(OPENING_LINE.length,19);
assert.equal(openingBookAction(state),null);

const initial=makeInitialState();
const other=generateAllLegalActions(initial).find(a=>a.piece.type==="hanna"&&a.category==="move");
const offBook=applyLegalAction(initial,other);
assert.equal(openingBookAction(offBook),null);
const reply=generateAllLegalActions(offBook).find(a=>a.category==="move"&&!a.promote);
const bestmove=fairySquare(reply.from)+fairySquare(reply.to);
const requests=[],messages=[];
globalThis.self={location:{origin:"http://localhost"},postMessage:message=>messages.push(message)};
globalThis.fetch=async()=>({ok:true,headers:{get:()=>"application/javascript"}});
globalThis.Worker=class{
  postMessage(data){
    if(data.type==="init")queueMicrotask(()=>this.onmessage({data:{type:"ready"}}));
    if(data.type==="search"){
      requests.push(data);
      queueMicrotask(()=>this.onmessage({data:{type:"result",id:data.id,bestmove,depth:19,score:0,nodes:100}}));
    }
  }
};
await import("../src/game/ai.worker.js");
for(const difficulty of [3,15]){
  await self.onmessage({data:{type:"think",id:difficulty,state:initial,minDepth:difficulty}});
  assert.equal(messages.at(-1).result.engine,"casual");
}
await self.onmessage({data:{type:"think",id:19,state:initial,minDepth:19}});
assert.equal(messages.at(-1).result.engine,"opening-book");
assert.equal(requests.length,0);
await self.onmessage({data:{type:"think",id:20,state:offBook,minDepth:19,maxDepth:5}});
assert.equal(requests.length,1);
assert.equal(requests[0].minDepth,19);
assert.equal(requests[0].maxDepth,19);
assert.equal(messages.at(-1).result.depth,19);
assert.deepEqual(messages.at(-1).result.action,reply);
console.log("Strongest CPU opening book and fixed-depth routing tests passed");
