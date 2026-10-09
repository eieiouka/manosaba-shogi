import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {randomUUID, randomInt} from 'node:crypto';
import {makeInitialState,generateAllLegalActions,applyLegalAction,terminalResult,opposite} from '../src/game/rules.js';
export const key = s => JSON.stringify([s.turn,s.board.map(r=>r.map(p=>p&&[p.type,p.side,p.promoted])),['sente','gote'].map(side=>s.hands[side].map(p=>p.type).sort())]);
export function createGameServer({origins=['http://localhost:5173'],turnMs=20000,graceMs=20000,animationMs=1100,startDelayMs=3000}={}) {
 const sessions=new Map(),matches=new Map(),queue=[];
 const send=(p,event)=>{if(p.stream&&!p.stream.destroyed&&!p.stream.writableEnded)p.stream.write(`data: ${JSON.stringify({...event,serverNow:Date.now()})}\n\n`)};
 const removeQueue=p=>{const i=queue.indexOf(p);if(i>=0)queue.splice(i,1);p.queued=false};
 const snapshot=m=>({type:'match',id:m.id,state:m.state,revision:m.revision,result:m.result,deadline:m.deadline,readyAt:m.readyAt,paused:m.paused,nicknames:m.nicknames});
 const broadcast=(m,extra={})=>m.players.forEach((p,i)=>send(p,{...snapshot(m),side:i===0?'sente':'gote',...extra}));
 const finish=(m,winner,reason)=>{if(m.result)return;m.result={winner,reason};m.deadline=null;m.readyAt=null;m.paused=false;broadcast(m);m.finishedAt=Date.now()};
 const settle=m=>{if(!m.result&&!m.paused&&Date.now()>=m.deadline)finish(m,opposite(m.state.turn),'timeout')};
 const pause=m=>{if(m.result||m.paused)return;settle(m);if(m.result)return;const now=Date.now();m.remaining=Math.max(0,m.deadline-Math.max(now,m.readyAt));m.delay=Math.max(0,m.readyAt-now);m.paused=true;m.deadline=null;broadcast(m)};
 const resume=m=>{if(m.result||!m.paused||m.players.some(p=>!p.stream))return;m.readyAt=Date.now()+m.delay;m.deadline=m.readyAt+m.remaining;m.paused=false;broadcast(m)};
 const match=()=>{while(queue.length>=2){const a=queue.shift(),b=queue.shift();a.queued=b.queued=false;const players=randomInt(2)?[a,b]:[b,a],state=makeInitialState(),readyAt=Date.now()+startDelayMs;const m={id:randomUUID(),players,nicknames:{sente:players[0].nickname,gote:players[1].nickname},state,revision:0,result:null,readyAt,deadline:readyAt+turnMs,paused:false,seen:new Map([[key(state),1]])};matches.set(m.id,m);players.forEach(p=>p.match=m);broadcast(m)}};
 const server=http.createServer(async(req,res)=>{
  const origin=req.headers.origin;
  if(origin&&!origins.includes(origin)){res.writeHead(403).end();return}
  if(origin)res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  if(req.method==='OPTIONS'){res.writeHead(204).end();return}
  const url=new URL(req.url,'http://localhost');
  const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data))};
  if(url.pathname==='/health'){json(200,{ok:true});return}
  if(req.method==='POST'&&url.pathname==='/session'){
   if(sessions.size>=2000){json(503,{error:'混雑しています'});return}
   const token=randomUUID();sessions.set(token,{token,stream:null,lastSeen:Date.now(),queued:false,match:null});json(200,{token});return;
  }
  const token=req.method==='GET'?url.searchParams.get('token'):req.headers.authorization?.replace(/^Bearer /,'');
  const p=sessions.get(token);if(!p){json(401,{error:'接続し直してください'});return}p.lastSeen=Date.now();
  if(req.method==='GET'&&url.pathname==='/events'){
   p.stream?.end();p.stream=res;p.disconnectedAt=null;
   res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no'});res.write(': connected\n\n');
   send(p,{type:'connected'});if(p.match){resume(p.match);send(p,{...snapshot(p.match),side:p.match.players[0]===p?'sente':'gote'})}
   res.on('close',()=>{if(p.stream!==res)return;p.stream=null;p.disconnectedAt=Date.now();removeQueue(p);if(p.match)pause(p.match)});return;
  }
  if(req.method!=='POST'){json(404,{error:'not found'});return}
  const now=Date.now();if(now-(p.rateAt||0)>1000){p.rateAt=now;p.rate=0}if(++p.rate>20){json(429,{error:'操作が多すぎます'});return}
  let body='';try{for await(const chunk of req){body+=chunk;if(body.length>8192){json(413,{error:'too large'});return}}body=JSON.parse(body||'{}')}catch{json(400,{error:'invalid JSON'});return}
  if(url.pathname==='/queue'){
   if(!p.stream){json(409,{error:'接続待ちです'});return}
   if(p.match&&!p.match.result){json(409,{error:'対局中です'});return}
   const nickname=typeof body.nickname==='string'?body.nickname.trim():'';
   if(!nickname||Array.from(nickname).length>10||/[\u0000-\u001f\u007f]/.test(nickname)){json(400,{error:'ニックネームは1〜10文字で入力してください'});return}
   p.nickname=nickname;
   p.match=null;if(!p.queued){p.queued=true;queue.push(p)}send(p,{type:'queued'});match();json(200,{ok:true});return;
  }
  if(url.pathname==='/cancel'){removeQueue(p);send(p,{type:'idle'});json(200,{ok:true});return}
  const m=p.match;if(!m||body.id!==m.id){json(409,{error:'対局がありません'});return}settle(m);
  if(m.result){json(409,{error:'対局は終了しました'});return}
  const side=m.players[0]===p?'sente':'gote';
  if(url.pathname==='/resign'){finish(m,opposite(side),'resign');json(200,{ok:true});return}
  if(url.pathname!=='/move'){json(404,{error:'not found'});return}
  settle(m);if(m.result){json(409,{error:'時間切れです'});return}
  if(m.paused||Date.now()<m.readyAt||side!==m.state.turn||body.revision!==m.revision){json(409,{error:'現在は指せません'});return}
  // Accept only a server-generated legal action, never apply the submitted object.
  const signature=a=>JSON.stringify([a?.category,a?.from,a?.to,!!a?.promote,a?.magic,a?.handIndex]);
  const action=generateAllLegalActions(m.state).find(a=>signature(a)===signature(body.action));
  if(!action){json(400,{error:'不正な指し手です'});return}
  m.state=applyLegalAction(m.state,action);m.revision++;m.result=terminalResult(m.state);
  const k=key(m.state),count=(m.seen.get(k)||0)+1;m.seen.set(k,count);if(!m.result&&count>=3)m.result={winner:null,reason:'repetition'};
  m.readyAt=Date.now()+animationMs;m.deadline=m.result?null:m.readyAt+turnMs;if(m.result)m.finishedAt=Date.now();broadcast(m,{action});json(200,{ok:true});
 });
 const tick=setInterval(()=>{const now=Date.now();for(const m of matches.values()){
  if(m.result){if(now-m.finishedAt>300000){matches.delete(m.id);m.players.forEach(p=>{if(p.match===m)p.match=null})}continue}
  const disconnected=m.players.filter(p=>p.disconnectedAt&&now-p.disconnectedAt>=graceMs);
  if(disconnected.length===2)finish(m,null,'disconnected');else if(disconnected.length===1)finish(m,disconnected[0]===m.players[0]?'gote':'sente','disconnected');else settle(m);
 }for(const [token,p]of sessions){if(!p.stream&&(!p.match||p.match.result)&&now-p.lastSeen>300000){removeQueue(p);sessions.delete(token)}}},50);
 const heartbeat=setInterval(()=>sessions.forEach(p=>send(p,{type:'heartbeat'})),10000);
 server.on('close',()=>{clearInterval(tick);clearInterval(heartbeat);sessions.forEach(p=>p.stream?.end())});
 return server;
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const origins=(process.env.ALLOWED_ORIGINS||'http://localhost:5173').split(',').map(s=>s.trim());
 createGameServer({origins}).listen(Number(process.env.PORT||3001),'0.0.0.0',()=>console.log('Manosaba online server listening'));
}
