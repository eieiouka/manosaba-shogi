import {useEffect,useRef,useState} from 'react';
import './nickname-reset.css';
import './profile.css';
export default function NicknameReset({nickname='',profile,onLoad,onReset}){
 const [open,setOpen]=useState(false),[confirming,setConfirming]=useState(false),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 const trigger=useRef(null),dialog=useRef(null),loadSequence=useRef(0);
 const enabled=Boolean(nickname.trim());
 useEffect(()=>{
  if(!open)return;
  const controls=()=>Array.from(dialog.current?.querySelectorAll('button:not(:disabled),input:not(:disabled)')||[]);
  const first=confirming?dialog.current?.querySelector('[data-cancel]'):controls()[0];first?.focus();
  const keyboard=event=>{
   if(event.key==='Escape'){if(confirming)setConfirming(false);else close()}
   if(event.key==='Tab'){const list=controls();if(!list.length)return;event.preventDefault();const index=list.indexOf(document.activeElement);list[(index+(event.shiftKey?-1:1)+list.length)%list.length]?.focus()}
  };
  document.addEventListener('keydown',keyboard);return()=>document.removeEventListener('keydown',keyboard);
 },[open,confirming]);
 useEffect(()=>{if(!enabled){setOpen(false);setConfirming(false);loadSequence.current++}},[enabled]);
 useEffect(()=>()=>{loadSequence.current++},[]);
 function close(){loadSequence.current++;setOpen(false);setConfirming(false);trigger.current?.focus()}
 async function refresh(){const id=++loadSequence.current;setError('');setLoading(true);try{await onLoad()}catch(e){if(loadSequence.current===id)setError(e.message)}finally{if(loadSequence.current===id)setLoading(false)}}
 const games=profile?.games||0,rate=games?Math.round(profile.wins/games*100):0;
 const needed=profile?Math.max(0,profile.nextRating-profile.rating):50;
 return <>
  <button ref={trigger} type="button" className="nickname-reset-button" disabled={!enabled} style={!enabled?{opacity:.35,cursor:'default'}:undefined} onClick={()=>{setOpen(true);setConfirming(false);refresh()}}>プロフィール</button>
  {open&&<div className="player-profile-overlay" onClick={event=>{if(event.target===event.currentTarget)close()}}>
   <section ref={dialog} className="player-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="player-profile-title">
    {confirming?<>
     <h2 id="player-profile-title">本当にリセットしますか？</h2>
     <p id="nickname-reset-note">※この操作は戻せません</p>
     {error&&<p role="alert" className="player-profile-error">{error}</p>}
     <div className="nickname-reset-actions">
      <button type="button" className="nickname-reset-yes" onClick={()=>{if(onReset()===false){setError('名前をリセットできませんでした');return}close()}}>はい</button>
      <button data-cancel type="button" onClick={()=>{setError('');setConfirming(false)}}>キャンセル</button>
     </div>
    </>:<>
     <header className="player-profile-heading"><h2 id="player-profile-title">プロフィール</h2><div><button type="button" className="player-profile-reset" onClick={()=>{setError('');setConfirming(true)}}>名前をリセット</button><button type="button" onClick={close} aria-label="閉じる">×</button></div></header>
     <div className="player-profile-name">{nickname}</div>
     <div className="player-profile-rank">{profile?.rank||'—'}</div>
     {loading&&<p role="status">読み込んでいます…</p>}
     {error&&<p role="alert" className="player-profile-error">{error} <button type="button" disabled={loading} onClick={refresh}>再読み込み</button></p>}
     {profile&&<>
      <p className="player-profile-points">{profile.rating} pt</p>
      <div className="player-profile-progress"><span>次の昇格まであと{needed}pt</span><progress aria-label="昇格までの進捗" max="50" value={50-needed}/></div>
      <dl className="player-profile-stats"><div><dt>対局</dt><dd>{games}</dd></div><div><dt>勝ち</dt><dd>{profile.wins}</dd></div><div><dt>負け</dt><dd>{profile.losses}</dd></div><div><dt>引き分け</dt><dd>{profile.draws}</dd></div><div><dt>勝率</dt><dd>{rate}%</dd></div></dl>
     </>}
     <p className="player-profile-note">オンライン戦の勝敗で段位が上下します。CPU戦は戦績に含みません。<br/>名前をリセットしても段位・戦績は残ります。</p>
    </>}
   </section>
  </div>}
 </>;
}
