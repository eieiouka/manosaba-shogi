import assert from "node:assert/strict";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {once} from "node:events";
import {createGameServer} from "../server/index.js";
import {makeInitialState,generateAllLegalActions,applyLegalAction} from "../src/game/rules.js";

const dir=await mkdtemp(join(tmpdir(),"manosaba-review-"));
const server=createGameServer({startDelayMs:0,animationMs:0,turnMs:30000,
  profilesPath:join(dir,"profiles.json"),historyPath:join(dir,"history.jsonl")});
const clients=[];
try{
  server.listen(0,"127.0.0.1");
  await once(server,"listening");
  const base="http://127.0.0.1:"+server.address().port;
  async function post(path,body={},headers={}){
    const response=await fetch(base+path,{method:"POST",headers:{"Content-Type":"application/json",...headers},body:JSON.stringify(body)});
    const data=await response.json();
    assert.equal(response.status,200,JSON.stringify(data));
    return data;
  }
  async function player(nickname){
    const {key}=await post("/player");
    const {"token":token}=await post("/session",{},{"X-Player-Key":key});
    const headers={"X-Player-Key":key,Authorization:"Bearer "+token};
    const controller=new AbortController();
    const events=[];
    clients.push(controller);
    const stream=await fetch(base+"/events?token="+token,{signal:controller.signal});
    const reader=stream.body.getReader();
    const decoder=new TextDecoder();
    let buffer="";
    void (async()=>{
      try{
        while(true){
          const {done,value}=await reader.read();
          if(done)break;
          buffer+=decoder.decode(value,{stream:true});
          let split;
          while((split=buffer.indexOf("\n\n"))!==-1){
            const chunk=buffer.slice(0,split);
            buffer=buffer.slice(split+2);
            if(chunk.startsWith("data: "))events.push(JSON.parse(chunk.slice(6)));
          }
        }
      }catch(error){if(!controller.signal.aborted)throw error}
    })();
    return {headers,events,nickname};
  }
  async function waitFor(client,predicate){
    for(let i=0;i<300;i++){
      const event=client.events.find(predicate);
      if(event)return event;
      await new Promise(resolve=>setTimeout(resolve,10));
    }
    throw Error("Timed out waiting for match event");
  }
  const a=await player("ReviewA"),b=await player("ReviewB");
  const queue=async client=>post("/queue",{nickname:client.nickname},client.headers);
  await queue(a);await queue(b);
  const initial=await waitFor(a,e=>e.type==="match"&&e.revision===0);
  assert.equal(initial.timeline,undefined);
  const sides=initial.side==="sente"?{sente:a,gote:b}:{sente:b,gote:a};
  let position=makeInitialState();
  const expected=[position];
  for(let revision=0;revision<4;revision++){
    const action=generateAllLegalActions(position)[0];
    await post("/move",{id:initial.id,revision,action},sides[position.turn].headers);
    position=applyLegalAction(position,action);
    expected.push(position);
    const event=await waitFor(a,e=>e.type==="match"&&e.revision===revision+1);
    assert.equal(event.timeline,undefined);
  }
  await post("/resign",{id:initial.id},a.headers);
  for(const client of [a,b]){
    const finished=await waitFor(client,e=>e.type==="match"&&e.result);
    assert.equal(finished.revision,4);
    assert.deepEqual(finished.timeline,expected);
    assert.deepEqual(finished.state,expected.at(-1));
  }
  await queue(a);await queue(b);
  const next=await waitFor(a,e=>e.type==="match"&&e.id!==initial.id);
  assert.equal(next.revision,0);
  await post("/resign",{id:next.id},b.headers);
  const nextResult=await waitFor(a,e=>e.type==="match"&&e.id===next.id&&e.result);
  assert.deepEqual(nextResult.timeline,[makeInitialState()]);
  console.log("Online review history tests passed");
}finally{
  for(const controller of clients)controller.abort();
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
  await rm(dir,{recursive:true,force:true});
}
