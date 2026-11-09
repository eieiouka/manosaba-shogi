import {makeInitialState,generateAllLegalActions,applyLegalAction,terminalResult,actionLabel} from '/src/game/rules.js';
import {stateToFairyFen} from '/src/game/fairyCodec.js';
const $=id=>document.getElementById(id);
const names={nanoka:'ナノカ',hanna:'ハンナ',hiro:'ヒロ',ema:'エマ',sherry:'シェリー',margo:'マーゴ'};
const letters={N:'nanoka',H:'hanna',I:'hiro',K:'ema',S:'sherry',M:'margo'};
const game=`a1a2 f6f5 a2b2 f5e5 e1e2 a6b5 b2c2 e5d5 f1f2 e6e5 e2e4 d5c5 f2f3 d6c6 b1b3 c6c5 c2c3 e5d4 c3c5`.split(' ');
const coord=s=>[6-Number(s[1]),s.charCodeAt(0)-97],square=a=>String.fromCharCode(97+a[1])+(6-a[0]);
const same=(a,b)=>a&&b&&a[0]===b[0]&&a[1]===b[1];
let history=[{state:makeInitialState(),label:'初期局面',eval:null}],at=0,selected=null,handType=null,flipped=false,worker=null,pending=null,seq=0,ready=false,latest=null;
let analysisGeneration=0, analysisTimer=null, running=false;
const state=()=>history[at].state;
const actions=()=>generateAllLegalActions(state());
const log=t=>{$('log').textContent+=t+'\n';$('log').scrollTop=$('log').scrollHeight};
function tokenMatches(s,token){
 const legal=generateAllLegalActions(s);
 if(token.includes('@')){const [t,loc]=token.split('@');return legal.filter(a=>a.category==='drop'&&a.piece.type===letters[t.toUpperCase()]&&same(a.to,coord(loc)))}
 const from=coord(token.slice(0,2)),to=coord(token.slice(2,4)),promote=token.endsWith('+');
 return legal.filter(a=>same(a.from,from)&&same(a.to,to)&&Boolean(a.promote)===promote);
}
function play(a){
 const s=state(),label=actionLabel(s,a);
 history=history.slice(0,at+1);
 history.push({state:applyLegalAction(s,a),label,eval:null});
 at++;selected=null;handType=null;latest=null;render();queueAnalysis();
}
function playToken(token){const options=tokenMatches(state(),token);if(options.length!==1)throw Error(`${token}: 合法手候補${options.length}件`);play(options[0])}
function choose(options){
 if(options.length===1){play(options[0]);return}
 if(!options.length)return;
 const c=$('choices');c.replaceChildren();
 const label=document.createElement('span');label.textContent='手を選択: ';c.append(label);
 options.forEach(a=>{const b=document.createElement('button');b.textContent=(a.magic||a.category)+(a.promote?' / 魔女化':'');b.onclick=()=>play(a);c.append(b)});
}
function clickSquare(r,c){
 const s=state(),pos=[r,c],piece=s.board[r][c],legal=actions();
 if(handType){choose(legal.filter(a=>a.category==='drop'&&a.piece.type===handType&&same(a.to,pos)));return}
 if(selected){const found=legal.filter(a=>same(a.from,selected)&&same(a.to,pos));if(found.length){choose(found);return}}
 if(piece?.side===s.turn){selected=pos;handType=null}else selected=null;
 render();
}
function render(){
 const s=state(),legal=actions(),board=$('board');board.replaceChildren();
 const rows=flipped?[5,4,3,2,1,0]:[0,1,2,3,4,5],cols=flipped?[5,4,3,2,1,0]:[0,1,2,3,4,5];
 const last=s.lastMove;
 for(const r of rows)for(const c of cols){
 const cell=document.createElement('button');cell.className='cell';cell.type='button';
 if(same(selected,[r,c]))cell.classList.add('selected');
 if((selected&&legal.some(a=>same(a.from,selected)&&same(a.to,[r,c])))||(handType&&legal.some(a=>a.category==='drop'&&a.piece.type===handType&&same(a.to,[r,c]))))cell.classList.add('target');
 if(last&&(same(last.from,[r,c])||same(last.to,[r,c])))cell.classList.add('last');
 const piece=s.board[r][c];
 if(piece){const x=document.createElement('div');x.className='piece '+piece.side;x.textContent=names[piece.type];if(piece.promoted){const mark=document.createElement('small');mark.textContent='魔女化';x.append(mark)}cell.append(x)}
 const co=document.createElement('span');co.className='coord';co.textContent=square([r,c]);cell.append(co);
 cell.onclick=()=>clickSquare(r,c);board.append(cell);
 }
 for(const side of ['sente','gote']){
 const el=$(side+'Hand');el.replaceChildren();
 for(const type of [...new Set(s.hands[side].map(p=>p.type))]){
 const count=s.hands[side].filter(p=>p.type===type).length,b=document.createElement('button');
 b.textContent=`${names[type]} ×${count}`;b.disabled=s.turn!==side;
 if(handType===type&&s.turn===side)b.classList.add('active');
 b.onclick=()=>{handType=handType===type?null:type;selected=null;render()};el.append(b);
 }
 if(!s.hands[side].length)el.textContent='なし';
 }
 const terminal=terminalResult(s);
 $('status').textContent=terminal?`終局：${terminal.winner==='sente'?'先手':'後手'}勝ち (${terminal.reason})`:`${s.turn==='sente'?'先手':'後手'}番 / ${at}手目`;
 $('back').disabled=at===0;$('forward').disabled=at>=history.length-1;
 $('moves').replaceChildren();
 history.forEach((h,i)=>{const b=document.createElement('button');b.textContent=`${i}. ${h.label}${h.eval?' ['+h.eval.score+']':''}`;if(i===at)b.classList.add('current');b.onclick=()=>{at=i;selected=null;handType=null;latest=null;render();queueAnalysis()};$('moves').append(b)});
 const e=history[at].eval;$('score').textContent=e?(Math.abs(e.score)>=19000?(e.score>0?'先手勝勢':'後手勝勢'):(e.score>0?'+':'')+e.score):'—';
 $('info').textContent=e?`深度 ${e.depth} / ${e.nodes.toLocaleString()} nodes / ${(e.elapsed/1000).toFixed(2)}秒 / 最善候補 ${e.bestmove}`:'未解析';
 $('playBest').disabled=!e?.bestmove||e.bestmove==='(none)';
 $('choices').replaceChildren();drawChart();drawArrow();
}
function drawChart(){
 const cv=$('chart'),ctx=cv.getContext('2d'),w=cv.width,h=cv.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
 const points=history.map((x,i)=>({i,s:x.eval?.score})).filter(x=>Number.isFinite(x.s));const scale=Math.max(300,...points.filter(x=>Math.abs(x.s)<19000).map(x=>Math.abs(x.s)));
 const x=i=>24+i/Math.max(1,history.length-1)*(w-48),y=v=>h/2-Math.max(-scale,Math.min(scale,v))/scale*(h/2-12);
 ctx.strokeStyle='#aaa';ctx.beginPath();ctx.moveTo(20,h/2);ctx.lineTo(w-20,h/2);ctx.stroke();
 ctx.strokeStyle='#2864bb';ctx.lineWidth=2;ctx.beginPath();points.forEach((p,i)=>{if(!i)ctx.moveTo(x(p.i),y(p.s));else ctx.lineTo(x(p.i),y(p.s))});ctx.stroke();
 ctx.fillStyle='#222';ctx.font='12px sans-serif';ctx.fillText('+'+scale,2,12);ctx.fillText('0',5,h/2-4);ctx.fillText('-'+scale,2,h-5);
}
function drawArrow(){
 const overlay=$('arrowOverlay');if(!overlay)return;overlay.replaceChildren();
 const move=history[at].eval?.bestmove;if(!move||move==='(none)')return;
 let start,end;try{if(move.includes('@')){end=coord(move.split('@')[1]);start=null}else{start=coord(move.slice(0,2));end=coord(move.slice(2,4))}}catch{return}
 const map=([r,c])=>{const rr=flipped?5-r:r,cc=flipped?5-c:c;return [cc*100+50,rr*100+50]};
 const [x2,y2]=map(end),[x1,y1]=start?map(start):[x2,y2-68];
 const ns='http://www.w3.org/2000/svg';const defs=document.createElementNS(ns,'defs');const marker=document.createElementNS(ns,'marker');marker.setAttribute('id','bestArrowHead');marker.setAttribute('markerWidth','7');marker.setAttribute('markerHeight','7');marker.setAttribute('refX','5');marker.setAttribute('refY','3');marker.setAttribute('orient','auto');const path=document.createElementNS(ns,'path');path.setAttribute('d','M0 0 L6 3 L0 6 Z');path.setAttribute('fill','#1c9e56');marker.append(path);defs.append(marker);overlay.append(defs);const line=document.createElementNS(ns,'line');for(const [k,v] of Object.entries({x1,y1,x2,y2,stroke:'#1c9e56','stroke-width':13,'stroke-linecap':'round','stroke-opacity':'.85','marker-end':'url(#bestArrowHead)'}))line.setAttribute(k,v);overlay.append(line);
}
function initWorker(){
 if(worker)return Promise.resolve();
 return new Promise((resolve,reject)=>{
 let initialized=false;worker=new Worker('/fairy/fairy-bridge.worker.js');
 const timer=setTimeout(()=>reject(Error('エンジン起動タイムアウト')),40000);
 worker.onmessage=({data:d})=>{
 if(d.type==='ready'){initialized=true;ready=true;clearTimeout(timer);resolve();return}
 if(d.type==='result'&&pending?.id===d.id){const p=pending;pending=null;p.resolve(d)}
 if(d.type==='error'){if(pending&&(!d.id||pending.id===d.id)){const p=pending;pending=null;p.reject(Error(d.message))}else if(!initialized){clearTimeout(timer);reject(Error(d.message))}}
 };
 worker.onerror=e=>{clearTimeout(timer);reject(Error(e.message||'Worker error'))};
 worker.postMessage({type:'init'});
 });
}
function stop(){worker?.terminate();worker=null;ready=false;if(pending){pending.reject(Error('解析を停止しました'));pending=null}}
async function analyzePosition(generation){
 const index=at,fen=stateToFairyFen(state()),turn=state().turn;
 const maxDepth=Math.max(1,Math.min(31,Number($('depth').value)||19));
 const budget=Math.max(100,Number($('budget').value)||1500);
 try{
  await initWorker();if(generation!==analysisGeneration)return;
  // Iterative deepening with visible intermediate results. Each search is exact to its target depth.
  const levels=[5,7,9,11,13,15,17,19,21,23,25,27,29,31].filter(d=>d<=maxDepth);
  if(!levels.includes(maxDepth))levels.push(maxDepth);
  for(const depth of levels){
   if(generation!==analysisGeneration)return;
   $('info').textContent=`解析中：深度 ${depth} / ${maxDepth}`;
   const id=++seq;
   const result=await new Promise((resolve,reject)=>{pending={id,resolve,reject};worker.postMessage({type:'search',id,fen,maxDepth:depth,minDepth:depth,timeLimitMs:budget})});
   if(generation!==analysisGeneration)return;
   const score=turn==='sente'?result.score:-result.score;
   if(history[index]&&stateToFairyFen(history[index].state)===fen){history[index].eval={...result,score};render()}
   log(`${index}手目 ${score} / depth ${result.depth} / ${result.bestmove}`);
  }
 }catch(e){if(generation===analysisGeneration){log('エラー: '+e.message);$('info').textContent=e.message}}
 finally{if(generation===analysisGeneration){running=false;$('analyze').disabled=false}}
}
function queueAnalysis(){
 analysisGeneration++;const generation=analysisGeneration;
 if(analysisTimer)clearTimeout(analysisTimer);
 stop();running=true;
 $('info').textContent='解析を準備中…';
 analysisTimer=setTimeout(()=>analyzePosition(generation),120);
}
$('analyze').onclick=()=>queueAnalysis();
$('stop').onclick=()=>{analysisGeneration++;clearTimeout(analysisTimer);stop();running=false;$('info').textContent='解析停止';};
$('playBest').onclick=()=>{const token=history[at].eval?.bestmove;if(!token)return;const opts=tokenMatches(state(),token);if(opts.length)choose(opts);else alert('AIの指し手を合法手として変換できません: '+token)};
$('back').onclick=()=>{if(at>0){at--;selected=null;handType=null;render();queueAnalysis()}};
$('forward').onclick=()=>{if(at<history.length-1){at++;selected=null;handType=null;render();queueAnalysis()}};
$('initial').onclick=()=>{history=[{state:makeInitialState(),label:'初期局面',eval:null}];at=0;selected=null;handType=null;render();queueAnalysis()};
$('game19').onclick=()=>{try{history=[{state:makeInitialState(),label:'初期局面',eval:null}];at=0;for(const token of game)playToken(token);render()}catch(e){alert('棋譜再現エラー: '+e.message)}};
$('flip').onclick=()=>{flipped=!flipped;render()};
$('csv').onclick=()=>{const lines=['ply,move,score_sente,depth,nodes,elapsed_ms,bestmove',...history.map((h,i)=>[i,JSON.stringify(h.label),h.eval?.score??'',h.eval?.depth??'',h.eval?.nodes??'',h.eval?.elapsed??'',h.eval?.bestmove??''].join(','))];const url=URL.createObjectURL(new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='manosaba-gui-analysis.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)};
render();

queueAnalysis();
