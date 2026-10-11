import {useEffect} from 'react';
const BASE=(import.meta.env.VITE_MATCH_SERVER_URL||'http://localhost:3001').replace(/\/$/,'');

// Only count an ongoing CPU game; failures must never interrupt local play.
export function useCpuPresence(active){
 useEffect(()=>{
  if(!active)return;
  const id=crypto.randomUUID();
  let sequence=0,run=0,timer,controller,stopped=false,suspended=false;
  const payload=value=>JSON.stringify({id,active:value,sequence:++sequence});
  const end=()=>{
   run++;clearTimeout(timer);controller?.abort();
   fetch(BASE+'/cpu-presence',{method:'POST',headers:{'Content-Type':'application/json'},body:payload(false),keepalive:true}).catch(()=>{});
  };
  const pulse=async()=>{
   if(stopped||suspended)return;
   const thisRun=++run;
   const currentController=new AbortController();controller=currentController;
   const timeout=setTimeout(()=>currentController.abort(),5000);
   try{await fetch(BASE+'/cpu-presence',{method:'POST',headers:{'Content-Type':'application/json'},body:payload(true),signal:currentController.signal})}catch{}finally{
    clearTimeout(timeout);
    if(!stopped&&!suspended&&thisRun===run)timer=setTimeout(pulse,9000+Math.random()*2000);
   }
  };
  const hide=()=>{suspended=true;end()};
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
