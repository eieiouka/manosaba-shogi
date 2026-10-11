import {useEffect,useRef} from 'react';
const BASE=(import.meta.env.VITE_MATCH_SERVER_URL||'http://localhost:3001').replace(/\/$/,'');
const KEY='manosaba-admin-notify';
// The pairing identifier is unrelated to the administrator password.
export function useAdminActivity(busy){
 const identity=useRef(null);
 if(identity.current===null){
  let id='';
  try{
   const url=new URL(window.location.href),incoming=url.searchParams.get('adminNotifyId');
   if(incoming&&/^[0-9a-f-]{36}$/i.test(incoming)){
    localStorage.setItem(KEY,incoming);url.searchParams.delete('adminNotifyId');history.replaceState(null,'',url);
   }
   id=localStorage.getItem(KEY)||'';
  }catch{}
  identity.current={id,tab:crypto.randomUUID(),sequence:Date.now()};
 }
 useEffect(()=>{
  const state=identity.current;if(!state.id)return;
  let stopped=false,timer,controller;
  const send=async()=>{
   controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),5000);
   try{await fetch(BASE+'/admin-play-state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:state.id,tab:state.tab,active:busy,sequence:++state.sequence}),signal:controller.signal})}catch{}finally{
    clearTimeout(timeout);if(!stopped)timer=setTimeout(send,9000+Math.random()*2000);
   }
  };
  send();
  return()=>{stopped=true;clearTimeout(timer);controller?.abort()};
 },[busy]);
}
