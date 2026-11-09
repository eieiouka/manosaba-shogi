import {makeInitialState,generateAllLegalActions,applyLegalAction} from '/src/game/rules.js';
import {stateToFairyFen} from '/src/game/fairyCodec.js';
const notation=`a1a2 f6f5 a2b2 f5e5 e1e2 a6b5 b2c2 e5d5 f1f2 e6e5 e2e4 d5c5 f2f3 d6c6 b1b3 c6c5 c2c3 e5d4 c3c5 d4c3 H@d5 d6e6 d5e4 e6d6 f3f4 N@d3 d1e2 c3d2 e2f3 d3e3 e4f3 e3f3 d5c6 d6c6`.split(' ');
const typeMap={H:'hiro',N:'nanoka'};
const sq=s=>[6-Number(s[1]),s.charCodeAt(0)-97];
const eq=(a,b)=>a?.[0]===b?.[0]&&a?.[1]===b?.[1];
const states=[makeInitialState()];
for(let i=0;i<notation.length;i++){
 const s=states.at(-1),token=notation[i],legal=generateAllLegalActions(s);
 let matches;
 if(token.includes('@')){const [type,to]=token.split('@');matches=legal.filter(a=>a.category==='drop'&&a.piece.type===typeMap[type]&&eq(a.to,sq(to)));}
 else matches=legal.filter(a=>eq(a.from,sq(token.slice(0,2)))&&eq(a.to,sq(token.slice(2,4))));
 if(matches.length!==1){document.querySelector('#status').textContent=`棋譜 ${i+1}手目 ${token} を再現できません（候補${matches.length}件）`;throw Error(`Illegal/ambiguous ply ${i+1}: ${token} matches=${matches.length}`);}
 states.push(applyLegalAction(s,matches[0]));
}
let worker=null,pending=null,rows=[],running=false;
const $=s=>document.querySelector(s);
function log(s){$('#log').textContent+=s+'\n';$('#log').scrollTop=$('#log').scrollHeight;}
function chart(){const c=$('#chart'),g=c.getContext('2d'),w=c.width,h=c.height;g.clearRect(0,0,w,h);g.fillStyle='white';g.fillRect(0,0,w,h);const m=Math.max(200,...rows.map(r=>Math.abs(r.score))),x=i=>65+i/34*900,y=v=>h/2-v/m*(h/2-45);g.strokeStyle='#bbb';g.beginPath();g.moveTo(65,y(0));g.lineTo(965,y(0));g.stroke();g.fillStyle='#444';g.font='15px system-ui';g.fillText('+'+m,8,y(m)+6);g.fillText('0',35,y(0)+5);g.fillText('-'+m,8,y(-m)+5);for(let i=0;i<=34;i+=5)g.fillText(String(i),x(i)-8,h-10);g.strokeStyle='#2365cc';g.lineWidth=3;g.beginPath();rows.forEach((r,i)=>{const px=x(r.ply),py=y(r.score);if(!i)g.moveTo(px,py);else g.lineTo(px,py)});g.stroke();for(const r of rows){g.beginPath();g.arc(x(r.ply),y(r.score),3,0,Math.PI*2);g.fillStyle='#2365cc';g.fill();}}
function render(){const body=$('#rows');body.replaceChildren();for(const r of rows){const tr=document.createElement('tr');for(const value of [r.ply,r.move,r.score,r.depth,r.nodes,(r.elapsed/1000).toFixed(2),r.bestmove]){const td=document.createElement('td');td.textContent=String(value);tr.append(td)}body.append(tr)}chart();$('#save').disabled=!rows.length;}
function ask(id,fen,depth,minDepth,timeLimitMs){return new Promise((resolve,reject)=>{pending={id,resolve,reject};worker.postMessage({type:'search',id,fen,maxDepth:depth,minDepth,timeLimitMs})})}
function init(){return new Promise((resolve,reject)=>{worker=new Worker('/fairy/fairy-bridge.worker.js');const timeout=setTimeout(()=>reject(Error('起動タイムアウト')),30000);worker.onmessage=e=>{const d=e.data;if(d.type==='ready'){clearTimeout(timeout);resolve();return;}if(d.type==='error'){if(pending&&d.id===pending.id){pending.reject(Error(d.message));pending=null}else if(!pending){clearTimeout(timeout);reject(Error(d.message));}return;}if(d.type==='result'&&pending&&d.id===pending.id){pending.resolve(d);pending=null;}};worker.onerror=e=>{clearTimeout(timeout);reject(Error(e.message||'Worker error'))};worker.postMessage({type:'init'});});}
$('#start').onclick=async()=>{if(running)return;running=true;rows=[];render();$('#start').disabled=true;$('#stop').disabled=false;$('#log').textContent='';const depth=Number($('#depth').value),minDepth=Number($('#minDepth').value),budget=Number($('#budget').value);try{if(!Number.isInteger(depth)||depth<1||depth>31||!Number.isInteger(minDepth)||minDepth<1||minDepth>depth||budget<1)throw Error('探索設定を確認してください');$('#status').textContent='エンジン起動中…';await init();for(let i=0;i<states.length&&running;i++){const fen=stateToFairyFen(states[i]);$('#status').textContent=`解析中 ${i}/34手`;const r=await ask(i+1,fen,depth,minDepth,budget);const score=states[i].turn==='sente'?r.score:-r.score;rows.push({ply:i,move:i?notation[i-1]:'初期局面',score,depth:r.depth,nodes:r.nodes,elapsed:r.elapsed,bestmove:r.bestmove});render();log(`${i}/34 ${notation[i-1]||'初期'} 評価 ${score} 深度 ${r.depth}`);}$('#status').textContent=running?'解析完了':'中止しました';}catch(e){$('#status').textContent='エラー: '+e.message;log(e.stack||String(e));}finally{running=false;worker?.terminate();worker=null;pending=null;$('#start').disabled=false;$('#stop').disabled=true;}};
$('#stop').onclick=()=>{running=false;worker?.terminate();worker=null;pending?.reject(Error('中止しました'));pending=null;};
$('#save').onclick=()=>{const header=['ply','move','score_sente','depth','nodes','elapsed_ms','bestmove'];const csv=[header.join(','),...rows.map(r=>header.map(k=>r[k]).join(','))].join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.download='manosaba-fairy-evaluation.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
chart();
