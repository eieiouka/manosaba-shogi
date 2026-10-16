import {useEffect} from 'react';
const BASE=(import.meta.env.VITE_MATCH_SERVER_URL||'http://localhost:3001').replace(/\/$/,'');
const KEY='manosaba-learning-browser-id';
function browserId(){
 try{
  let id=localStorage.getItem(KEY);
  if(!id||!/^[0-9a-f-]{36}$/i.test(id)){id=crypto.randomUUID();localStorage.setItem(KEY,id)}
  return id;
 }catch{return crypto.randomUUID()}
}
// 学習中の人数通知。通信に失敗しても学習操作には影響させない。
export function useLearningPresence(active){
 useEffect(()=>{
  if(!active)return;
  const id=crypto.randomUUID(),browser=browserId();
  let sequence=0,run=0,timer,controller,stopped=false,suspended=false;
  const payload=value=>JSON.stringify({id,browserId:browser,active:value,sequence:++sequence});
  const end=()=>{
   run++;clearTimeout(timer);controller?.abort();
   fetch(BASE+'/learning-presence',{method:'POST',headers:{'Content-Type':'application/json'},body:payload(false),keepalive:true}).catch(()=>{});
  };
  const pulse=async()=>{
   if(stopped||suspended)return;
   const current=++run;
   const abort=new AbortController();controller=abort;
   const timeout=setTimeout(()=>abort.abort(),5000);
   try{await fetch(BASE+'/learning-presence',{method:'POST',headers:{'Content-Type':'application/json'},body:payload(true),signal:abort.signal})}catch{}finally{
    clearTimeout(timeout);
    if(!stopped&&!suspended&&current===run)timer=setTimeout(pulse,9000+Math.random()*2000);
   }
  };
  const hide=()=>{if(!suspended){suspended=true;end()}};
  const show=()=>{if(suspended&&!stopped){suspended=false;pulse()}};
  const visibility=()=>{if(document.visibilityState==='visible')show()};
  window.addEventListener('pagehide',hide);
  window.addEventListener('pageshow',show);
  document.addEventListener('visibilitychange',visibility);
  pulse();
  return()=>{
   stopped=true;window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',show);
   document.removeEventListener('visibilitychange',visibility);end();
  };
 },[active]);
}
