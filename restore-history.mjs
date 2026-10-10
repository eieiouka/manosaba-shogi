import {readFileSync,writeFileSync,copyFileSync,renameSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import net from 'node:net';
const apply=process.argv.includes('--apply');
const dataDir=resolve(process.env.RESTORE_DATA_DIR||'server/data');
const profilePath=join(dataDir,'player-profiles.json'),historyPath=join(dataDir,'match-history.jsonl');
const db=JSON.parse(readFileSync(profilePath,'utf8'));
const lines=readFileSync(historyPath,'utf8').split('\n');
const matches=new Map();
for(let i=0;i<lines.length;i++){
 if(!lines[i].trim())continue;
 let e;try{e=JSON.parse(lines[i])}catch{throw Error(`履歴${i+1}行目が不完全です。保存が終わってから再実行してください`)}
 if(e.type==='start')matches.set(e.id,{...e});
 if(e.type==='end'){const m=matches.get(e.id);if(!m)throw Error('開始記録のない終了記録: '+e.id);m.result=e.result;m.finishedAt=e.at;}
}
const finished=[...matches.values()].filter(m=>m.result).sort((a,b)=>a.finishedAt-b.finishedAt||a.at-b.at);
for(const id of Object.keys(db.processed||{}))if(!matches.get(id)?.result)throw Error('加算済み対局が履歴にありません。処理を中止します: '+id);
const groups=new Map();for(const p of Object.values(db.players)){if(!p.nickname)continue;const g=groups.get(p.nickname)||[];g.push(p);groups.set(p.nickname,g)}
const selected=new Map();
for(const [name,group] of groups){
 let p;if(group.length===1)p=group[0];
 else if(name==='計画性のないナノカ')p=group.find(p=>p.id==='2a243a6d-f9d5-4466-ad3d-679560740513');
 if(!p)throw Error('同名プロフィールの復元先を特定できません: '+name);
 selected.set(name,p);
}
const ledger=new Map();
const person=name=>{if(typeof name!=='string'||!name)throw Error('対局者名がない履歴です');if(!ledger.has(name))ledger.set(name,{nickname:name,rating:1000,wins:0,losses:0,draws:0});return ledger.get(name)};
for(const m of finished){
 const a=person(m.nicknames.sente),b=person(m.nicknames.gote);
 if(a===b)throw Error('同名同士の対局を振り分けられません: '+m.id);
 const winner=m.result.winner;if(!['sente','gote',null].includes(winner))throw Error('勝者の形式が不正です: '+m.id);
 const score=winner===null?.5:winner==='sente'?1:0;
 const delta=Math.round(32*(score-1/(1+10**((b.rating-a.rating)/400))));
 [a,b].forEach((p,i)=>{p.rating=Math.max(1000,p.rating+(i===0?delta:-delta));if(score===.5)p.draws++;else if((i===0&&score===1)||(i===1&&score===0))p.wins++;else p.losses++});
}
for(const [name,p] of selected){const restored=ledger.get(name);if(restored){for(const key of ['rating','wins','losses','draws'])p[key]=restored[key]}else if(p.wins+p.losses+p.draws>0)throw Error('戦績のある登録者が履歴にいません: '+name)}
db.processed=Object.fromEntries(finished.map(m=>[m.id,true]));
db.recoveryUnclaimed=Object.fromEntries([...ledger].filter(([name])=>!selected.has(name)));
const rank=r=>{const l=Math.max(0,Math.floor((r-1000)/50));return l<10?`${10-l}級`:l===10?'初段':`${l-9}段`};
console.log(`終了済み${finished.length}局を再計算。未終了${matches.size-finished.length}局は除外。`);
console.table([...ledger].map(([name,p])=>({名前:name,段位:rank(p.rating),pt:p.rating,勝:p.wins,負:p.losses,分:p.draws,反映先:selected.has(name)?'登録済みプロフィール':'未登録・復元結果を保管'})));
if(!apply){console.log('確認のみです。停止後に --apply を付けて実行すると保存します。');process.exit(0)}
const listening=await new Promise(r=>{const socket=net.connect({host:'127.0.0.1',port:Number(process.env.PORT||3001)});socket.setTimeout(1500);socket.once('connect',()=>{socket.destroy();r(true)});socket.once('error',()=>r(false));socket.once('timeout',()=>{socket.destroy();r(true)})});
if(listening)throw Error('サーバーが稼働中です。Ctrl+Cで停止してから実行してください');
const backup=join(dataDir,'backups','before-history-restore-'+new Date().toISOString().replace(/[:.]/g,'-'));mkdirSync(backup,{recursive:true});
copyFileSync(profilePath,join(backup,'player-profiles.json'));copyFileSync(historyPath,join(backup,'match-history.jsonl'));
const temp=profilePath+'.restore.tmp';writeFileSync(temp,JSON.stringify(db),{encoding:'utf8',mode:0o600});renameSync(temp,profilePath);
console.log('復元完了。バックアップ: '+backup);
