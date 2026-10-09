import {useEffect,useRef,useState} from 'react';
const BASE=(import.meta.env.VITE_MATCH_SERVER_URL||'http://localhost:3001').replace(/\/$/,'');
export function useOnline(onMatch,onLobby){
 const [nickname,setNickname]=useState(()=>{try{return localStorage.getItem('manosaba-nickname')||''}catch{return ''}});
 const [connected,setConnected]=useState(false);
 const [status,setStatus]=useState('idle'),[error,setError]=useState(''),[match,setMatch]=useState(null),[now,setNow]=useState(Date.now());
 const ref=useRef({}),callback=useRef(onMatch);callback.current=onMatch;
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()+(ref.current.offset||0)),50);return()=>{clearInterval(t);ref.current.events?.close()}},[]);
 const post=async(path,body={})=>{const r=await fetch(BASE+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${ref.current.token}`},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.error||'通信に失敗しました');return data};
 async function connect(){
  if(ref.current.events&&ref.current.connected)return;
  if(ref.current.connecting)return ref.current.connecting;
  ref.current.connecting=(async()=>{
   let token=sessionStorage.getItem('manosaba-online-token');
   if(!token){const r=await fetch(BASE+'/session',{method:'POST'});if(!r.ok)throw Error('接続できません');token=(await r.json()).token;sessionStorage.setItem('manosaba-online-token',token)}
   ref.current.token=token;ref.current.events?.close();
   await new Promise((resolve,reject)=>{
    const events=new EventSource(BASE+'/events?token='+encodeURIComponent(token));ref.current.events=events;
    const timeout=setTimeout(()=>{events.close();sessionStorage.removeItem('manosaba-online-token');reject(Error('接続できません。再度お試しください'))},15000);
    events.onmessage=e=>{const data=JSON.parse(e.data);ref.current.offset=data.serverNow-Date.now();
     if(data.type==='connected'){clearTimeout(timeout);ref.current.connected=true;setConnected(true);setError('');resolve()}
     if(data.type==='queued')setStatus('queued');if(data.type==='idle')setStatus('idle');
     if(data.type==='match'){setStatus('match');setMatch(data);setError('');callback.current(data)}
    };
    events.onerror=()=>{ref.current.connected=false;setConnected(false);setError('再接続しています…')};
   });
  })();try{await ref.current.connecting}finally{ref.current.connecting=null}
 }
 const validName=name=>Boolean(name)&&Array.from(name).length<=10&&!/[\u0000-\u001f\u007f]/.test(name);
 async function beginQueue(name){setError('');setStatus('connecting');try{await connect();await post('/queue',{nickname:name})}catch(e){setError(e.message);setStatus('idle')}}
 function queue(){
  onLobby?.();setError('');
  const name=nickname.trim();
  if(!validName(name)){setStatus('naming');return}
  return beginQueue(name);
 }
 function submitNickname(entered){
  const name=entered.trim();
  if(!validName(name)){setError('ニックネームを1〜10文字で入力してください');return}
  setNickname(name);try{localStorage.setItem('manosaba-nickname',name)}catch{}
  return beginQueue(name);
 }
 async function cancel(){
  if(status==='naming'||status==='idle'){setError('');setStatus('idle');return}
  try{await post('/cancel');setStatus('idle')}catch(e){setError(e.message)}
 }
 async function move(action){try{await post('/move',{id:match.id,revision:match.revision,action});setError('')}catch(e){setError(e.message)}}
 async function resign(){try{await post('/resign',{id:match.id})}catch(e){setError(e.message)}}
 return {nickname,connected,status,error,match,now,queue,submitNickname,cancel,move,resign,remaining:match?.deadline?Math.max(0,Math.ceil((match.deadline-now)/1000)):20};
}
