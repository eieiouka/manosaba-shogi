import {useEffect,useRef,useState} from 'react';
import './nickname-reset.css';
export default function NicknameReset({onReset}){
 const [open,setOpen]=useState(false),[error,setError]=useState('');
 const trigger=useRef(null),cancel=useRef(null),confirm=useRef(null);
 useEffect(()=>{
  if(!open)return;
  cancel.current?.focus();
  const keyboard=event=>{
   if(event.key==='Escape'){setOpen(false);trigger.current?.focus()}
   if(event.key==='Tab'){event.preventDefault();(document.activeElement===cancel.current?confirm:cancel).current?.focus()}
  };
  document.addEventListener('keydown',keyboard);return()=>document.removeEventListener('keydown',keyboard);
 },[open]);
 const close=()=>{setOpen(false);trigger.current?.focus()};
 return <>
  <button ref={trigger} type="button" className="nickname-reset-button" onClick={()=>{setError('');setOpen(true)}}>名前をリセット</button>
  {open&&<div className="nickname-reset-overlay">
   <section className="nickname-reset-dialog" role="dialog" aria-modal="true" aria-labelledby="nickname-reset-title" aria-describedby="nickname-reset-note">
    <h2 id="nickname-reset-title">本当にリセットしますか？</h2>
    <p id="nickname-reset-note">※この操作は戻せません</p>
    {error&&<p role="alert">{error}</p>}
    <div className="nickname-reset-actions">
     <button ref={confirm} type="button" className="nickname-reset-yes" onClick={()=>{if(onReset()===false){setError('名前をリセットできませんでした');return}close()}}>はい</button>
     <button ref={cancel} type="button" onClick={close}>キャンセル</button>
    </div>
   </section>
  </div>}
 </>;
}
