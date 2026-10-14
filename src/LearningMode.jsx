import {useState} from "react";
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
const names={nanoka:"ナノカ",hanna:"ハンナ",hiro:"ヒロ",margo:"マーゴ"};
export default function LearningMode({onBack}){
 const [index,setIndex]=useState(0),[selected,setSelected]=useState(false),[solved,setSolved]=useState(false),[feedback,setFeedback]=useState("");
 const lesson=lessons[index];
 function change(next){setIndex(next);setSelected(false);setSolved(false);setFeedback("");}
 function click(r,c){if(solved)return;const [fr,fc]=lesson.from,[tr,tc]=lesson.to;
  if(r===fr&&c===fc){setSelected(true);setFeedback("移動先・攻撃先を選んでください。");return;}
  if(!selected){setFeedback("まずナノカをタップしてください。");return;}
  if(r===tr&&c===tc){setSolved(true);setFeedback(lesson.success);}else setFeedback("惜しい！ ヒントを確認してもう一度試そう。");
 }
 return <main className="learn-page"><header className="learn-header"><button onClick={onBack}>← ホームに戻る</button><span>ラーニングモード</span></header><div className="learn-content"><p className="learn-eyebrow">第1章　黒部ナノカ</p><h1>{index+1}. {lesson.title}</h1><p className="learn-progress">レッスン {index+1} / {lessons.length}</p><div className="learn-progressbar"><span style={{width:`${(index+(solved?1:0))/lessons.length*100}%`}}/></div><p className="learn-instruction">{lesson.instruction}</p><div className="learn-board" role="group" aria-label="練習盤面">{Array.from({length:36},(_,i)=>{const r=Math.floor(i/6),c=i%6;let p=lesson.pieces.find(p=>p.r===r&&p.c===c);if(solved&&p?.type==="nanoka")p=null;if(solved&&r===lesson.to[0]&&c===lesson.to[1])p={type:"nanoka",side:"sente"};const active=selected&&!solved&&r===lesson.from[0]&&c===lesson.from[1];return <button key={i} type="button" className={`learn-cell ${(r+c)%2?"learn-cell--alt":""} ${active?"learn-cell--active":""} ${solved&&r===lesson.to[0]&&c===lesson.to[1]?"learn-cell--solved":""}`} onClick={()=>click(r,c)} aria-label={`${c+1}列${6-r}段${p?names[p.type]:"空き"}`}>{p&&<span className={`learn-piece ${p.side==="gote"?"learn-piece--enemy":""}`}><img src={`/images/pieces/${p.type}_black.png`} alt=""/><small>{names[p.type]}</small></span>}</button>})}</div><p className={`learn-feedback ${solved?"learn-feedback--success":""}`} role="status">{feedback||"ナノカをタップして始めましょう。"}</p><details className="learn-hint"><summary>ヒントを見る</summary><p>{lesson.hint}</p></details><div className="learn-controls"><button onClick={()=>change(index)} className="learn-secondary">やり直す</button>{index>0&&<button onClick={()=>change(index-1)} className="learn-secondary">前の問題</button>}<button disabled={!solved} onClick={()=>index===lessons.length-1?onBack():change(index+1)}>{index===lessons.length-1?"学習完了・ホームへ":"次の問題 →"}</button></div></div></main>;
}
