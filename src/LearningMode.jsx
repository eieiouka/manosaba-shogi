import {useEffect,useRef,useState} from "react";
import "./LearningMode.css";

// Small, isolated teaching boards. Coordinates follow the existing 6x6 board convention.
const lessons=[
 {title:"ナノカの基本移動",instruction:"ナノカを選んで、前に1マス進めてみよう。",hint:"ナノカは前と左右に1マス移動できます。",pieces:[{type:"nanoka",side:"sente",r:4,c:2}],from:[4,2],to:[3,2],success:"正解！ 前に1マス進めました。横にも1マス動けます。"},
 {title:"横への移動",instruction:"ナノカを右に1マス動かしてみよう。",hint:"ナノカは左右にも1マス動けます。",pieces:[{type:"nanoka",side:"sente",r:3,c:2}],from:[3,2],to:[3,3],success:"正解！ 横移動を使って攻撃位置を調整できます。"},
 {title:"遠方狙撃",instruction:"2マス先の敵を銃撃しよう。ナノカを選んで敵をタップ！",hint:"前方2マス、斜め前2マスの敵を狙撃できます。間に駒があると撃てません。",pieces:[{type:"nanoka",side:"sente",r:4,c:2},{type:"hanna",side:"gote",r:2,c:2}],from:[4,2],to:[2,2],success:"正解！ ナノカは2マス先の敵を射撃できます。"},
 {title:"斜めへの射撃",instruction:"斜め前2マスの敵を狙撃しよう。",hint:"斜め前2マスとは、縦に2マス・横にも2マス離れた場所です。",pieces:[{type:"nanoka",side:"sente",r:4,c:1},{type:"margo",side:"gote",r:2,c:3}],from:[4,1],to:[2,3],success:"正解！ 斜め方向にも遠距離射撃が届きます。"},
 {title:"遮蔽物に注意",instruction:"正面は味方が塞いでいます。横に移動して射線を変えよう。",hint:"味方が間にいると正面の敵を撃てません。ナノカを右に1マス移動してください。",pieces:[{type:"nanoka",side:"sente",r:4,c:2},{type:"hiro",side:"sente",r:3,c:2},{type:"hanna",side:"gote",r:2,c:2}],from:[4,2],to:[4,3],success:"正解！ 味方越しには撃てないので、射線の確保が重要です。"},
 {title:"弱点を知る",instruction:"斜め前1マスの敵はナノカで直接取れません。横へ逃げよう。",hint:"ナノカは斜め前1マスには移動できません。右に1マス退避しましょう。",pieces:[{type:"nanoka",side:"sente",r:4,c:2},{type:"margo",side:"gote",r:3,c:1}],from:[4,2],to:[4,3],success:"正解！ 射程が強くても近距離の斜め前には弱点があります。"}
];
const names={nanoka:"ナノカ",hanna:"ハンナ",hiro:"ヒロ",margo:"マーゴ",ema:"エマ",sherry:"シェリー"};
const guideText={
 ema:{move:"8方向に1マス移動できます。",magicName:"魔女殺し",magic:"相手側の最下段へ到達すると、魔女化して相手のエマを殺せます（勝利）。"},
 nanoka:{move:"前・左右に1マス、魔女化後は8方向に1マス移動できます。",magicName:"遠方狙撃",magic:"前方2マス、斜め前2マスの敵を銃撃します。間に駒がある場合は撃てません。"},
 hanna:{move:"前・斜め前に1マス、魔女化後は8方向に1マス移動できます。",magicName:"空中浮遊",magic:"前方へ2マス移動できます。間の駒は飛び越えられますが、着地先の駒は取れません。"},
 hiro:{move:"前・左右に1マス、魔女化後は8方向に1マス移動できます。",magicName:"すり替え",magic:"8方向に隣接する味方の駒と、自身の位置を入れ替えます。"},
 sherry:{move:"前に1マス移動できますが、駒を取れません。駒を取る時だけは、斜め前に1マス移動できます。魔女化後は8方向1マスと前2マスへ移動できます。",magicName:"全力突進",magic:"前方へ2マス移動できます。途中・着地点に駒がある場合は進めません。"},
 margo:{move:"前・斜め前に1マス、魔女化後は8方向に1マス移動できます。",magicName:"跳躍暗殺",magic:"着地点が空いていれば、横・斜め後ろ・後ろ側の敵を飛び越え、取ることができます。"}
};
function RulesDialog({onClose}){return <div className="how-to-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="how-to-dialog" role="dialog" aria-modal="true" aria-labelledby="learning-how-to-title"><div className="how-to-dialog__heading"><h2 id="learning-how-to-title">How to play</h2><button type="button" onClick={onClose} aria-label="閉じる">×</button></div><p>桜羽エマを取られたら負けです。桜羽エマが成ると特殊勝利できます。</p><p>エマだけは敵陣最下段、他の駒は敵陣二段目に移動すると魔女化します。</p><p>取った駒は打てますが、敵陣最下段には打てません。</p><p className="how-to-dialog__longpress">長押しで駒の能力を見れます。</p></section></div>}
function Guide({piece,onClose}){const g=guideText[piece.type];return <aside className="piece-guide" role="dialog" aria-label={`${names[piece.type]}の動き`}><div className="piece-guide__heading"><strong>{names[piece.type]}</strong><span>{piece.promoted?"魔女化":"通常"}</span><button type="button" onClick={onClose} aria-label="閉じる">×</button></div><p className="piece-guide__move"><b>通常移動</b>{g.move}</p><p className="piece-guide__ability"><b>{g.magicName}</b>{piece.type==="sherry"&&piece.promoted?"前方へ2マス移動できます。着地点に駒がある場合も取れます。":g.magic}</p></aside>}
function HandPanel({title,pieces,opponent=false,onGuideStart,onGuideEnd}){const order=opponent?["margo","nanoka","hiro","hanna","sherry"]:["sherry","hanna","hiro","nanoka","margo"];return <aside className={`hand ${opponent?"hand--opponent":"hand--player"}`}><div className="hand-title">{title}</div><div className={`hand-pieces ${pieces.length?"":"hand-pieces--empty"}`}>{pieces.length?order.filter(type=>pieces.some(p=>p.type===type)).map(type=><div className="hand-group" key={type}>{pieces.filter(p=>p.type===type).map((p,i)=><button className="hand-piece" type="button" key={i} onPointerDown={()=>onGuideStart(p)} onPointerUp={onGuideEnd} onPointerCancel={onGuideEnd} onPointerLeave={onGuideEnd} onContextMenu={e=>e.preventDefault()}><div className={`piece ${opponent?"piece--opponent":""}`}><img src={`/images/pieces/${p.type}_black.png`} alt=""/><span className="piece-name">{names[p.type]}</span></div></button>)}</div>):<span className="hand-empty">なし</span>}</div></aside>}
export default function LearningMode({onBack}){
 const [index,setIndex]=useState(0),[selected,setSelected]=useState(false),[solved,setSolved]=useState(false),[feedback,setFeedback]=useState("");
 const [confirmBack,setConfirmBack]=useState(false),[showRules,setShowRules]=useState(false),[artAvailable,setArtAvailable]=useState(true);
 const [dialogueIndex,setDialogueIndex]=useState(0),[guide,setGuide]=useState(null);
 const guideTimer=useRef(null),guideTriggered=useRef(false),music=useRef(null);
 useEffect(()=>{const audio=new Audio("/audio/learning-bgm.mp3");audio.loop=true;audio.volume=.3;music.current=audio;audio.play().catch(()=>{});return()=>{audio.pause();audio.src="";music.current=null;clearTimeout(guideTimer.current)}},[]);
 const lesson=lessons[index];
 function change(next){setIndex(next);setSelected(false);setSolved(false);setFeedback("");setDialogueIndex(0);setGuide(null)}
 function startGuide(piece){clearTimeout(guideTimer.current);guideTriggered.current=false;if(!piece)return;guideTimer.current=setTimeout(()=>{guideTriggered.current=true;setGuide({...piece,promoted:false});},500)}
 function endGuide(){clearTimeout(guideTimer.current)}
 function click(r,c){if(guideTriggered.current){guideTriggered.current=false;return}if(guide){setGuide(null);return}if(solved)return;
  const [fr,fc]=lesson.from,[tr,tc]=lesson.to;
  if(r===fr&&c===fc){setSelected(true);setFeedback("");return}
  if(!selected){setFeedback("まずナノカを選んでね。");setDialogueIndex(1);return}
  if(r===tr&&c===tc){setSolved(true);setFeedback("");setDialogueIndex(2)}else{setFeedback("そこじゃないみたい。もう一度考えてみよう！");setDialogueIndex(1)}
 }
 const pages=[lesson.instruction,feedback||lesson.hint,...(solved?[lesson.success]:[])];
 const visiblePages=solved?[lesson.instruction,lesson.hint,lesson.success]:[lesson.instruction,feedback||lesson.hint];
 const last=visiblePages.length-1;
 function nextSpeech(){if(dialogueIndex<last){setDialogueIndex(i=>i+1);return}if(solved&&index<lessons.length-1){change(index+1)}}
 const speech=visiblePages[Math.min(dialogueIndex,last)];
 return <main className="learn-page"><header className="learn-header"><button type="button" onClick={()=>setConfirmBack(true)}>← 戻る</button><span>ラーニングモード</span><button type="button" onClick={()=>change(index)}>やり直し</button></header>
 <div className="learn-content"><p className="learn-eyebrow">第1章　黒部ナノカ</p><h1>{index+1}. {lesson.title}</h1><p className="learn-progress">レッスン {index+1} / {lessons.length}</p><div className="learn-progressbar"><span style={{width:`${(index+(solved?1:0))/lessons.length*100}%`}}/></div>
 <div className="learn-board-toolbar"><button type="button" onClick={()=>setShowRules(true)}>How to play</button></div>
 <div className="learn-stage"><HandPanel title="相手の持ち駒" pieces={[]} opponent onGuideStart={startGuide} onGuideEnd={endGuide}/><div className="learn-board" role="group" aria-label="練習盤面">{Array.from({length:36},(_,i)=>{const r=Math.floor(i/6),c=i%6;let p=lesson.pieces.find(p=>p.r===r&&p.c===c);if(solved&&p?.type==="nanoka")p=null;if(solved&&r===lesson.to[0]&&c===lesson.to[1])p={type:"nanoka",side:"sente"};const active=selected&&!solved&&r===lesson.from[0]&&c===lesson.from[1];return <button key={i} type="button" className={`learn-cell ${(r+c)%2?"learn-cell--alt":""} ${active?"learn-cell--active":""} ${solved&&r===lesson.to[0]&&c===lesson.to[1]?"learn-cell--solved":""}`} onClick={()=>click(r,c)} onPointerDown={()=>startGuide(p)} onPointerUp={endGuide} onPointerCancel={endGuide} onPointerLeave={endGuide} onContextMenu={e=>e.preventDefault()} aria-label={`${c+1}列${6-r}段${p?names[p.type]:"空き"}`}>{p&&<span className={`learn-piece ${p.side==="gote"?"learn-piece--enemy":""}`}><img src={`/images/pieces/${p.type}_black.png`} alt=""/><small>{names[p.type]}</small></span>}</button>})}</div><HandPanel title="自分の持ち駒" pieces={[]} onGuideStart={startGuide} onGuideEnd={endGuide}/></div>
 <div className="learn-dialogue" aria-live="polite"><div className="learn-portrait">{artAvailable?<img src="/images/learning/nanoka.png" alt="黒部ナノカ" onError={()=>setArtAvailable(false)}/>:<div className="learn-portrait-placeholder">黒部ナノカ<small>立ち絵を配置してください</small></div>}</div><div className="learn-dialogue-box"><strong>黒部ナノカ</strong><p className={solved&&dialogueIndex===last?"learn-dialogue-success":""}>{speech}</p><div className="learn-speech-nav"><button type="button" aria-label="前のセリフ" disabled={dialogueIndex===0} onClick={()=>setDialogueIndex(i=>Math.max(0,i-1))}>◀</button><span>{Math.min(dialogueIndex,last)+1} / {visiblePages.length}</span><button type="button" aria-label="次のセリフ" disabled={dialogueIndex===last&&(!solved||index===lessons.length-1)} onClick={nextSpeech}>▶</button></div></div></div></div>
 {guide&&<Guide piece={guide} onClose={()=>setGuide(null)}/>}
 {showRules&&<RulesDialog onClose={()=>setShowRules(false)}/>}
 {confirmBack&&<div className="learn-modal" role="presentation"><section role="dialog" aria-modal="true" aria-label="タイトルに戻る確認" className="learn-modal-panel"><h2>タイトルに戻りますか？</h2><p>学習中の問題は最初からになります。</p><div className="learn-modal-buttons"><button type="button" onClick={onBack}>はい</button><button type="button" onClick={()=>setConfirmBack(false)}>キャンセル</button></div></section></div>}
 </main>;
}
