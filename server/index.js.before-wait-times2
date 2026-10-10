import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {randomUUID, randomInt,createHash,timingSafeEqual} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createHistory} from './history.js';
import {createProfiles} from './profiles.js';
import {makeInitialState,generateAllLegalActions,applyLegalAction,terminalResult,opposite} from '../src/game/rules.js';
export const key = s => JSON.stringify([s.turn,s.board.map(r=>r.map(p=>p&&[p.type,p.side,p.promoted])),['sente','gote'].map(side=>s.hands[side].map(p=>p.type).sort())]);
export function createGameServer({origins=['http://localhost:5173'],turnMs=20000,graceMs=20000,animationMs=1100,startDelayMs=3000,adminPassword=process.env.ADMIN_PASSWORD||'',profilesPath=process.env.PLAYER_PROFILES_PATH||new URL('./data/player-profiles.json',import.meta.url),historyPath=process.env.MATCH_HISTORY_PATH||new URL('./data/match-history.jsonl',import.meta.url)}={}) {
 const sessions=new Map(),matches=new Map(),queue=[];
 const history=createHistory(historyPath);
 const profiles=createProfiles(profilesPath);
 const updateRanks=m=>{if(m.rankProcessed)return;m.rankProcessed=true;try{
  if(m.players.some(p=>!p.profile))throw Error('対局者のプロフィールが未登録です');
  if(m.players[0].profile.id===m.players[1].profile.id)throw Error('同じプロフィール同士の対局です');
  m.ratingChanges=profiles.settle(m);
  console.log('[戦績加算]',m.id,m.ratingChanges?'保存完了':'加算済み',m.result.reason);
 }catch(error){console.error('[戦績加算失敗]',m.id,error.message);m.rankError=true}};
 const adminEnabled=adminPassword.length>=16;
 const digest=value=>createHash('sha256').update(value).digest();
 const adminHash=digest(adminPassword);
 const adminFailures=new Map();
 const adminHtml=readFileSync(new URL('./admin.html',import.meta.url));
 const send=(p,event)=>{if(p.stream&&!p.stream.destroyed&&!p.stream.writableEnded)p.stream.write(`data: ${JSON.stringify({...event,serverNow:Date.now()})}\n\n`)};
 const connected=p=>Boolean(p.stream&&!p.stream.destroyed&&!p.stream.writableEnded);
 const presence=()=>{
  const ongoing=[...matches.values()].filter(m=>!m.result&&!m.paused&&m.players.every(connected));
  const maxMoves=ongoing.length?Math.max(...ongoing.map(m=>m.revision)):null;
  for(const p of sessions.values())if(connected(p)){
   p.waitEstimateSeed??=randomInt(55,66);
   const seconds=maxMoves===null?p.waitEstimateSeed:maxMoves===0?60:Math.max(10,maxMoves*2);
   if(p.waitEstimateSeconds!==seconds){p.waitEstimateSeconds=seconds;send(p,{type:'wait-estimate',seconds})}
  }
 };
 const removeQueue=p=>{const i=queue.indexOf(p);if(i>=0)queue.splice(i,1);p.queued=false};
 const snapshot=m=>({type:'match',id:m.id,state:m.state,revision:m.revision,result:m.result,deadline:m.deadline,readyAt:m.readyAt,paused:m.paused,nicknames:m.nicknames,profiles:Object.fromEntries(m.players.map((p,i)=>[i===0?'sente':'gote',profiles.view(p.profile)])),ratingChanges:m.ratingChanges,rankError:m.rankError});
 const broadcast=(m,extra={})=>m.players.forEach((p,i)=>send(p,{...snapshot(m),side:i===0?'sente':'gote',...extra}));
 const finish=(m,winner,reason)=>{if(m.result)return;m.result={winner,reason};m.deadline=null;m.readyAt=null;m.paused=false;updateRanks(m);broadcast(m);m.finishedAt=Date.now();history.end(m)};
 const settle=m=>{if(!m.result&&!m.paused&&Date.now()>=m.deadline)finish(m,opposite(m.state.turn),'timeout')};
 const pause=m=>{if(m.result||m.paused)return;settle(m);if(m.result)return;const now=Date.now();m.remaining=Math.max(0,m.deadline-Math.max(now,m.readyAt));m.delay=Math.max(0,m.readyAt-now);m.paused=true;m.deadline=null;broadcast(m)};
 const resume=m=>{if(m.result||!m.paused||m.players.some(p=>!p.stream))return;m.readyAt=Date.now()+m.delay;m.deadline=m.readyAt+m.remaining;m.paused=false;broadcast(m)};
 const match=()=>{while(queue.length>=2){const a=queue.shift(),b=queue.shift();a.queued=b.queued=false;const players=randomInt(2)?[a,b]:[b,a],state=makeInitialState(),readyAt=Date.now()+startDelayMs;const m={id:randomUUID(),startedAt:Date.now(),players,nicknames:{sente:players[0].nickname,gote:players[1].nickname},state,revision:0,result:null,readyAt,deadline:readyAt+turnMs,paused:false,seen:new Map([[key(state),1]])};matches.set(m.id,m);history.start(m);players.forEach(p=>p.match=m);broadcast(m)}};
 const server=http.createServer(async(req,res)=>{
  const requestUrl=new URL(req.url,'http://localhost');
  if(requestUrl.pathname==='/admin'||requestUrl.pathname.startsWith('/admin/')){
   res.setHeader('Cache-Control','no-store');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
   const adminJson=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data))};
   if(!adminEnabled){adminJson(503,{error:'管理画面は未設定です。ADMIN_PASSWORDを16文字以上で設定してください'});return}
   if(req.method!=='GET'){adminJson(405,{error:'method not allowed'});return}
   if(requestUrl.pathname==='/admin'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(adminHtml);return}
   const ip=req.socket.remoteAddress||'unknown',now=Date.now();
   const failed=adminFailures.get(ip);
   if(failed&&now-failed.at<60000&&failed.count>=10){adminJson(429,{error:'1分後に再試行してください'});return}
   const supplied=req.headers.authorization?.replace(/^Bearer /,'')||'';
   if(!timingSafeEqual(adminHash,digest(supplied))){
    if(adminFailures.size>1000)adminFailures.clear();
    adminFailures.set(ip,{at:failed&&now-failed.at<60000?failed.at:now,count:failed&&now-failed.at<60000?failed.count+1:1});
    adminJson(401,{error:'パスワードが違います'});return;
   }
   adminFailures.delete(ip);
   const all=history.list();
   const status=r=>r.result?'終了':matches.has(r.id)?'対局中':'中断（サーバー再起動）';
   if(requestUrl.pathname==='/admin/matches'){
    const search=(requestUrl.searchParams.get('q')||'').toLowerCase();
    const rows=all.filter(r=>!search||Object.values(r.nicknames).some(n=>n.toLowerCase().includes(search))).sort((a,b)=>b.startedAt-a.startedAt);
    const offset=Math.max(0,Math.trunc(Number(requestUrl.searchParams.get('offset'))||0));
    const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'});
    const today=day.format(now);
    adminJson(200,{summary:{total:all.length,today:all.filter(r=>day.format(r.startedAt)===today).length,completed:all.filter(r=>r.result).length,active:[...matches.values()].filter(m=>!m.result).length,waiting:queue.length,storageError:history.storageError},total:rows.length,offset,items:rows.slice(offset,offset+50).map(r=>({...r,moves:undefined,moveCount:r.moves.length,status:status(r)}))});return;
   }
   if(requestUrl.pathname==='/admin/match'){
    const r=history.get(requestUrl.searchParams.get('id'));
    adminJson(r?200:404,r?{...r,status:status(r)}:{error:'対局がありません'});return;
   }
   adminJson(404,{error:'not found'});return;
  }
  const origin=req.headers.origin;
  if(origin&&!origins.includes(origin)){res.writeHead(403).end();return}
  if(origin)res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization, X-Player-Key');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
  if(req.method==='OPTIONS'){res.writeHead(204).end();return}
  const url=new URL(req.url,'http://localhost');
  const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data))};
  if(url.pathname==='/health'){json(200,{ok:true});return}
  if(req.method==='POST'&&url.pathname==='/player'){
   try{json(200,profiles.register())}catch{json(503,{error:'プロフィールを保存できません。再度お試しください'})}return;
  }
  if(req.method==='GET'&&url.pathname==='/profile'){
   const player=profiles.get(req.headers['x-player-key']);
   json(player?200:401,player?{profile:profiles.view(player)}:{error:'プロフィールを認証できません'});return;
  }
  if(req.method==='POST'&&url.pathname==='/profile/name'){
   const player=profiles.get(req.headers['x-player-key']);if(!player){json(401,{error:'プロフィールを認証できません'});return}
   if([...sessions.values()].some(s=>s.profile?.id===player.id&&(s.queued||s.match&&!s.match.result))){json(409,{error:'待機・対局が終わってから名前を変更してください'});return}
   let raw='';try{for await(const chunk of req){raw+=chunk;if(raw.length>8192){json(413,{error:'too large'});return}}const body=JSON.parse(raw||'{}');
    if(typeof body.nickname!=='string'){json(400,{error:'名前が不正です'});return}const name=body.nickname.trim();
    if(Array.from(name).length>10||/[\u0000-\u001f\u007f]/.test(name)){json(400,{error:'ニックネームは1〜10文字で入力してください'});return}
    try{profiles.name(player,name);json(200,{profile:profiles.view(player)})}catch(e){json(e.code==='nickname-taken'?409:503,{error:e.code==='nickname-taken'?e.message:'名前を保存できません',code:e.code})}
   }catch{json(400,{error:'invalid JSON'})}return;
  }
  if(req.method==='POST'&&url.pathname==='/session'){
   if(sessions.size>=2000){json(503,{error:'混雑しています'});return}
   const token=randomUUID();sessions.set(token,{token,profile:profiles.get(req.headers['x-player-key']),stream:null,lastSeen:Date.now(),queued:false,match:null});json(200,{token});return;
  }
  const token=req.method==='GET'?url.searchParams.get('token'):req.headers.authorization?.replace(/^Bearer /,'');
  const p=sessions.get(token);if(!p){json(401,{error:'接続し直してください'});return}p.lastSeen=Date.now();
  if(req.method==='GET'&&url.pathname==='/events'){
   p.stream?.end();p.stream=res;p.disconnectedAt=null;
   res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no'});res.write(': connected\n\n');
   send(p,{type:'connected',profile:profiles.view(p.profile)});p.waitEstimateSeconds=undefined;presence();if(p.match){resume(p.match);send(p,{...snapshot(p.match),side:p.match.players[0]===p?'sente':'gote'})}
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
   const profile=req.headers['x-player-key']?profiles.get(req.headers['x-player-key']):p.profile;
   if(!profile){json(426,{error:'ゲーム画面を再読み込みしてください。戦績を保存するためのプロフィール登録が必要です'});return}
   if(req.headers['x-player-key']&&!profile){json(401,{error:'プロフィールを認証できません'});return}
   if(profile&&[...sessions.values()].some(other=>other!==p&&other.profile?.id===profile.id&&(other.queued||other.match&&!other.match.result))){json(409,{error:'このプロフィールは別の画面で待機・対局中です'});return}
   try{profiles.name(profile,nickname)}catch(e){json(e.code==='nickname-taken'?409:503,{error:e.code==='nickname-taken'?e.message:'プロフィールを保存できません',code:e.code});return}
   p.profile=profile;p.nickname=nickname;
   p.match=null;if(!p.queued){p.queued=true;p.waitEstimateSeed=randomInt(55,66);p.waitEstimateSeconds=undefined;queue.push(p)}send(p,{type:'queued'});match();json(200,{ok:true});return;
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
  history.move(m,side,action);
  m.state=applyLegalAction(m.state,action);m.revision++;m.result=terminalResult(m.state);
  const k=key(m.state),count=(m.seen.get(k)||0)+1;m.seen.set(k,count);if(!m.result&&count>=3)m.result={winner:null,reason:'repetition'};
  m.readyAt=Date.now()+animationMs;m.deadline=m.result?null:m.readyAt+turnMs;if(m.result){m.finishedAt=Date.now();updateRanks(m);history.end(m)}broadcast(m,{action});json(200,{ok:true});
 });
 const tick=setInterval(()=>{const now=Date.now();for(const m of matches.values()){
  if(m.result){if(now-m.finishedAt>300000){matches.delete(m.id);m.players.forEach(p=>{if(p.match===m)p.match=null})}continue}
  const disconnected=m.players.filter(p=>p.disconnectedAt&&now-p.disconnectedAt>=graceMs);
  if(disconnected.length===2)finish(m,null,'disconnected');else if(disconnected.length===1)finish(m,disconnected[0]===m.players[0]?'gote':'sente','disconnected');else settle(m);
 }for(const [token,p]of sessions){if(!p.stream&&(!p.match||p.match.result)&&now-p.lastSeen>300000){removeQueue(p);sessions.delete(token)}}},50);
 const presenceTimer=setInterval(presence,1000);
 const heartbeat=setInterval(()=>sessions.forEach(p=>send(p,{type:'heartbeat'})),10000);
 server.on('close',()=>{clearInterval(tick);clearInterval(heartbeat);clearInterval(presenceTimer);sessions.forEach(p=>p.stream?.end())});
 return server;
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const origins=(process.env.ALLOWED_ORIGINS||'http://localhost:5173').split(',').map(s=>s.trim());
 createGameServer({origins}).listen(Number(process.env.PORT||3001),'0.0.0.0',()=>console.log('Manosaba online server listening [wait-estimate-v4]'));
}
