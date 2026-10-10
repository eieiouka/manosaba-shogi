import {useEffect,useRef,useState} from 'react';
const BASE=(import.meta.env.VITE_MATCH_SERVER_URL||'http://localhost:3001').replace(/\/$/,'');
export function useOnline(onMatch,onLobby){
 const [nickname,setNickname]=useState(()=>{try{return localStorage.getItem('manosaba-nickname')||''}catch{return ''}});
 const [connected,setConnected]=useState(false);
 const [profile,setProfile]=useState(null);
 const [waitEstimateSeconds,setWaitEstimateSeconds]=useState(null);
 const [status,setStatus]=useState('idle'),[error,setError]=useState(''),[match,setMatch]=useState(null),[now,setNow]=useState(Date.now());
 const ref=useRef({}),callback=useRef(onMatch);callback.current=onMatch;
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()+(ref.current.offset||0)),50);return()=>{clearInterval(t);ref.current.events?.close()}},[]);
 const playerKey=()=>{try{return localStorage.getItem('manosaba-player-key')||''}catch{return ''}};
 const playerHeaders=()=>({'X-Player-Key':playerKey()});
 async function loadProfile(){
  if(ref.current.profileLoading)return ref.current.profileLoading;
  ref.current.profileLoading=(async()=>{
   const key=playerKey();const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
   try{
    const response=await fetch(BASE+(key?'/profile':'/player'),{method:key?'GET':'POST',headers:playerHeaders(),signal:controller.signal});
    const data=await response.json();if(!response.ok)throw Error(data.error||'プロフィールを取得できません');
    if(!key){try{localStorage.setItem('manosaba-player-key',data.key)}catch{throw Error('ブラウザにプロフィールを保存できません')}}
    setProfile(data.profile);return data.profile;
   }finally{clearTimeout(timer)}
  })();try{return await ref.current.profileLoading}finally{ref.current.profileLoading=null}
 }
 async function saveName(name){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const r=await fetch(BASE+'/profile/name',{method:'POST',headers:{...playerHeaders(),'Content-Type':'application/json'},body:JSON.stringify({nickname:name}),signal:controller.signal});const data=await r.json();if(!r.ok){const e=Error(data.error||'名前を保存できません');e.code=data.code;throw e}setProfile(data.profile);return data.profile}finally{clearTimeout(timer)}}
 const post=async(path,body={})=>{const r=await fetch(BASE+path,{method:'POST',headers:{...playerHeaders(),'Content-Type':'application/json',Authorization:`Bearer ${ref.current.token}`},body:JSON.stringify(body)});const data=await r.json();if(!r.ok){const e=Error(data.error||'通信に失敗しました');e.code=data.code;throw e}return data};
 const readToken=()=>{try{return sessionStorage.getItem('manosaba-online-token')}catch{return null}};
 const saveToken=token=>{try{if(token)sessionStorage.setItem('manosaba-online-token',token);else sessionStorage.removeItem('manosaba-online-token')}catch{}};
 async function openConnection(token){
  ref.current.events?.close();ref.current.connected=false;setConnected(false);setWaitEstimateSeconds(null);
  if(!token){
   const controller=new AbortController();
   const timer=setTimeout(()=>controller.abort(),15000);
   try{
    const response=await fetch(BASE+'/session',{method:'POST',headers:playerHeaders(),signal:controller.signal});
    if(!response.ok)throw Error('接続できません');
    token=(await response.json()).token;
    if(typeof token!=='string'||!token)throw Error('接続情報を取得できません');
    saveToken(token);
   }finally{clearTimeout(timer)}
  }
  ref.current.token=token;
  await new Promise((resolve,reject)=>{
   const events=new EventSource(BASE+'/events?token='+encodeURIComponent(token));ref.current.events=events;
   let ready=false,failed=false;
   const fail=error=>{
    if(ready||failed)return;
    failed=true;clearTimeout(timeout);events.close();
    events.onmessage=null;events.onerror=null;
    ref.current.connected=false;setConnected(false);setWaitEstimateSeconds(null);reject(error);
   };
   const timeout=setTimeout(()=>fail(Error('接続がタイムアウトしました')),15000);
   events.onmessage=e=>{
    if(failed||ref.current.events!==events)return;
    let data;try{data=JSON.parse(e.data)}catch{fail(Error('接続情報を読み込めません'));return}
    ref.current.offset=data.serverNow-Date.now();
    if(data.type==='connected'){if(data.profile)setProfile(data.profile);ready=true;clearTimeout(timeout);ref.current.connected=true;setConnected(true);setError('');resolve()}
    if(data.type==='wait-estimate'&&Number.isInteger(data.seconds)&&data.seconds>=0)setWaitEstimateSeconds(data.seconds);
    if(data.type==='queued')setStatus('queued');if(data.type==='idle')setStatus('idle');
    if(data.type==='match'){if(data.profiles?.[data.side])setProfile(data.profiles[data.side]);setStatus('match');setMatch(data);setError('');callback.current(data)}
   };
   events.onerror=()=>{
    if(failed||ref.current.events!==events)return;
    if(!ready){fail(Error('接続できません'));return}
    ref.current.connected=false;setConnected(false);setWaitEstimateSeconds(null);setError('再接続しています…');
   };
  });
 }
 async function connect(){
  if(ref.current.events&&ref.current.connected)return;
  if(ref.current.connecting)return ref.current.connecting;
  ref.current.connecting=(async()=>{
   try{await openConnection(readToken())}
   catch{
    // Retry initial connection once, obtaining a fresh session after a restart.
    saveToken(null);ref.current.token=null;ref.current.events?.close();
    try{await openConnection(null)}catch{
     saveToken(null);ref.current.token=null;ref.current.events?.close();
     ref.current.connected=false;setConnected(false);setWaitEstimateSeconds(null);
     throw Error('接続できませんでした。再試行すると接続できる場合があります。下のボタンからもう一度お試しください。');
    }
   }
  })();try{await ref.current.connecting}finally{ref.current.connecting=null}
 }
 const validName=name=>Boolean(name)&&Array.from(name).length<=10&&!/[\u0000-\u001f\u007f]/.test(name);
 async function beginQueue(name){setError('');setStatus('connecting');try{await loadProfile();await saveName(name);setNickname(name);try{localStorage.setItem('manosaba-nickname',name)}catch{}await connect();await post('/queue',{nickname:name})}catch(e){setError(e.message);setStatus(e.code==='nickname-taken'?'naming':'idle')}}
 function queue(){
  onLobby?.();setError('');
  const name=nickname.trim();
  if(!validName(name)){setStatus('naming');return}
  return beginQueue(name);
 }
 function editNickname(){onLobby?.();setError('');setStatus('naming')}
 function submitNickname(entered){
  const name=entered.trim();
  if(!validName(name)){setError('ニックネームを1〜10文字で入力してください');return}
  return beginQueue(name);
 }
 async function cancel(){
  if(status==='naming'||status==='idle'){setError('');setStatus('idle');return}
  try{await post('/cancel');setStatus('idle')}catch(e){setError(e.message)}
 }
 async function move(action){try{await post('/move',{id:match.id,revision:match.revision,action});setError('')}catch(e){setError(e.message)}}
 async function resign(){try{await post('/resign',{id:match.id})}catch(e){setError(e.message)}}
 async function resetNickname(){await loadProfile();await saveName('');try{localStorage.removeItem('manosaba-nickname')}catch{throw Error('端末の名前をリセットできませんでした')}setNickname('');return true}
 return {waitEstimateSeconds,profile,loadProfile,resetNickname,nickname,connected,status,error,match,now,queue,submitNickname,cancel,move,resign,editNickname,remaining:match?.deadline?Math.max(0,Math.ceil((match.deadline-now)/1000)):20};
}
