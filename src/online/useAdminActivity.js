import {useEffect,useRef,useState} from 'react';
const BASE=(import.meta.env.VITE_MATCH_SERVER_URL||'http://localhost:3001').replace(/\/$/,'');
const KEY='manosaba-admin-notify';
export function useAdminActivity(busy){
 const [id,setId]=useState(()=>{
  try{
   const url=new URL(window.location.href),incoming=url.searchParams.get('adminNotifyId');
   if(incoming&&/^[0-9a-f-]{36}$/i.test(incoming)){
    localStorage.setItem(KEY,incoming);url.searchParams.delete('adminNotifyId');history.replaceState(null,'',url);
   }
   return localStorage.getItem(KEY)||'';
  }catch{return ''}
 });
 const identity=useRef(null);
 if(!identity.current)identity.current={tab:crypto.randomUUID(),sequence:Date.now()};
 useEffect(()=>{
  const changed=event=>{if(event.key===KEY)setId(event.newValue||'')};
  window.addEventListener('storage',changed);
  return()=>window.removeEventListener('storage',changed);
 },[]);
 useEffect(()=>{
  if(!id)return;
  const state=identity.current;
  let stopped=false,suspended=false,timer,controller,run=0;
  const body=active=>JSON.stringify({id,tab:state.tab,active,sequence:++state.sequence});
  const cancel=()=>{run++;clearTimeout(timer);controller?.abort()};
  const release=()=>{
   cancel();fetch(BASE+'/admin-play-state',{method:'POST',headers:{'Content-Type':'application/json'},body:body(false),keepalive:true}).catch(()=>{});
  };
  const send=async()=>{
   if(stopped||suspended)return;
   cancel();const thisRun=run,current=new AbortController();controller=current;
   const timeout=setTimeout(()=>current.abort(),5000);
   try{await fetch(BASE+'/admin-play-state',{method:'POST',headers:{'Content-Type':'application/json'},body:body(busy),signal:current.signal})}catch{}finally{
    clearTimeout(timeout);if(!stopped&&!suspended&&thisRun===run)timer=setTimeout(send,9000+Math.random()*2000);
   }
  };
  const hide=()=>{suspended=true;release()};
  const show=()=>{suspended=false;send()};
  const visible=()=>{if(document.visibilityState==='visible')show()};
  window.addEventListener('pagehide',hide);window.addEventListener('pageshow',show);
  window.addEventListener('focus',show);document.addEventListener('visibilitychange',visible);
  send();
  return()=>{
   stopped=true;window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',show);
   window.removeEventListener('focus',show);document.removeEventListener('visibilitychange',visible);release();
  };
 },[id,busy]);
}
