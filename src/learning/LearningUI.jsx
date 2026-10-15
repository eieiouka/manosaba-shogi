import React from "react";

export function LearningChapterHeading({level}){
 return <div className="learning-chapter-heading" aria-label={`${level.chapter} ${level.title}`}><span>{level.chapter}</span><strong>{level.title}</strong></div>;
}

export function LearningDialogue({lines,page,outcome,onPrevious,onNext,onRetry,onNextChapter,navigationLocked=false}){
 const isLast=page===lines.length-1;
 return <div className="learning-dialogue"><img src="/images/learning/nanoka.png" alt="黒部ナノカ" onError={e=>{e.currentTarget.style.visibility="hidden"}}/><div className="learning-dialogue__body"><strong>黒部ナノカ</strong><p>{lines[page]}</p><div className="learning-dialogue__nav">{outcome?.kind!=="failure"&&<button type="button" disabled={page===0||navigationLocked} onClick={onPrevious}>◀</button>}<span>{page+1} / {lines.length}</span>{outcome?.kind==="failure"?<button type="button" className="learning-next-chapter learning-retry" onClick={onRetry}>再挑戦</button>:isLast&&outcome?.kind==="success"?<button type="button" className="learning-next-chapter" onClick={onNextChapter}>次の章</button>:<button type="button" disabled={isLast||navigationLocked} onClick={onNext}>▶</button>}</div></div></div>;
}

export function LearningChapterSelect({levels,currentIndex,onSelect,onTitle,onClose}){
 return <div className="nickname-reset-overlay learning-chapter-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
  <section className="nickname-reset-dialog learning-chapter-dialog" role="dialog" aria-modal="true" aria-labelledby="learning-chapter-select-title">
   <h2 id="learning-chapter-select-title">章選択</h2>
   <div className="learning-chapter-list">
    <button type="button" className="learning-title-return" onClick={onTitle}>タイトルに戻る</button>
    {levels.map((level,index)=><button key={level.id} type="button" className={`learning-chapter-item ${index===currentIndex?"learning-chapter-item--current":""}`} onClick={()=>onSelect(index)}>
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
