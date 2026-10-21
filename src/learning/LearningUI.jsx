import "./chapter-pagination.css";
import React, {useState} from "react";

export function LearningChapterHeading({level}){
 return <div className="learning-chapter-heading" aria-label={`${level.chapter} ${level.title}`}><span>{level.chapter}</span><strong>{level.title}</strong></div>;
}

export function LearningDialogue({lines,page,outcome,onPrevious,onNext,onRetry,onNextChapter,navigationLocked=false,allowFinishAdvance=false}){
 const isLast=page===lines.length-1;
 return <div className="learning-dialogue"><img src="/images/learning/nanoka.png" alt="黒部ナノカ" onError={e=>{e.currentTarget.style.visibility="hidden"}}/><div className="learning-dialogue__body"><strong>黒部ナノカ</strong><p>{lines[page]}</p><div className="learning-dialogue__nav">{outcome?.kind!=="failure"&&<button type="button" disabled={page===0||navigationLocked} className={page===0?"learning-nav-disabled":undefined} onClick={onPrevious}>◀</button>}<span>{page+1} / {lines.length}</span>{outcome?.kind==="failure"?<button type="button" className="learning-next-chapter learning-retry" onClick={onRetry}>再挑戦</button>:isLast&&outcome?.kind==="success"?<button type="button" className="learning-next-chapter" onClick={onNextChapter}>次の章</button>:<button type="button" disabled={(isLast&&!allowFinishAdvance)||navigationLocked} onClick={onNext}>▶</button>}</div></div></div>;
}

function chapterNumber(level){
 const match=String(level.chapter||"").match(/第\s*([0-9０-９]+)\s*章/);
 if(!match)return 1;
 return Number(match[1].replace(/[０-９]/g,c=>String(c.charCodeAt(0)-0xFF10)));
}

export function LearningChapterSelect({levels,currentIndex,onSelect,onTitle,onClose}){
 const chapters=[...new Set(levels.map(chapterNumber))].sort((a,b)=>a-b);
 const [selectedChapter,setSelectedChapter]=useState(()=>chapterNumber(levels[currentIndex]||levels[0]||{}));
 const page=chapters.includes(selectedChapter)?selectedChapter:(chapters[0]||1);
 const pageIndex=chapters.indexOf(page);
 const visible=levels.map((level,index)=>({level,index})).filter(({level})=>chapterNumber(level)===page);
 return <div className="nickname-reset-overlay learning-chapter-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
  <section className="nickname-reset-dialog learning-chapter-dialog" role="dialog" aria-modal="true" aria-labelledby="learning-chapter-select-title">
   <h2 id="learning-chapter-select-title">章選択</h2>
   <div className="learning-chapter-pagination" aria-label="章の切り替え">
    <button type="button" onClick={()=>setSelectedChapter(chapters[pageIndex-1])} disabled={pageIndex<=0} aria-label="前の章">◀</button>
    <strong>第{page}章</strong>
    <button type="button" onClick={()=>setSelectedChapter(chapters[pageIndex+1])} disabled={pageIndex<0||pageIndex>=chapters.length-1} aria-label="次の章">▶</button>
   </div>
   <div className="learning-chapter-list">
    <button type="button" className="learning-title-return" onClick={onTitle}>タイトルに戻る</button>
    {visible.map(({level,index})=><button key={level.id} type="button" className={`learning-chapter-item ${index===currentIndex?"learning-chapter-item--current":""}`} onClick={()=>onSelect(index)}>
     <span>{level.chapter}</span><strong>{level.title}</strong>
    </button>)}
   </div>
   <div className="nickname-reset-actions learning-chapter-close"><button type="button" onClick={onClose}>キャンセル</button></div>
  </section>
 </div>;
}

export function LearningBackConfirm({onConfirm,onCancel}){
 return <div className="nickname-reset-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)onCancel()}}><section className="nickname-reset-dialog" role="dialog" aria-modal="true" aria-labelledby="learning-back-title"><h2 id="learning-back-title">タイトルに戻りますか？</h2><div className="nickname-reset-actions"><button type="button" className="nickname-reset-yes" onClick={onConfirm}>はい</button><button type="button" data-cancel onClick={onCancel}>キャンセル</button></div></section></div>;
}
