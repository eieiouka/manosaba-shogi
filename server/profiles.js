import {existsSync,readFileSync,writeFileSync,renameSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';import {fileURLToPath} from 'node:url';import {randomUUID,createHash} from 'node:crypto';
export function rankOf(rating){const level=Math.max(0,Math.floor((rating-1000)/50));return level<10?`${10-level}級`:level===10?'初段':`${level-9}段`}
export function createProfiles(file){
 const path=file instanceof URL?fileURLToPath(file):file;mkdirSync(dirname(path),{recursive:true});
 let db=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{players:{},processed:{}};
 const hash=key=>createHash('sha256').update(key).digest('hex');
 const save=()=>{const tmp=path+'.tmp';writeFileSync(tmp,JSON.stringify(db),{mode:0o600});renameSync(tmp,path)};
 const view=p=>p?{id:p.id,nickname:p.nickname,rating:p.rating,rank:rankOf(p.rating),wins:p.wins,losses:p.losses,draws:p.draws,games:p.wins+p.losses+p.draws,nextRating:1000+(Math.max(0,Math.floor((p.rating-1000)/50))+1)*50}:null;
 const groups=new Map();for(const p of Object.values(db.players)){if(!p.nickname)continue;const list=groups.get(p.nickname)||[];list.push(p);groups.set(p.nickname,list)}
 const retired=[];for(const [name,list] of groups){if(list.length<2)continue;const active=list.filter(p=>p.wins+p.losses+p.draws>0);if(active.length!==1)throw Error('同名登録の所有者を確認してください: '+name);for(const p of list)if(p!==active[0])retired.push(p)}
 if(retired.length){writeFileSync(path+'.before-name-uniqueness-'+Date.now()+'.bak',readFileSync(path),{mode:0o600});retired.forEach(p=>{p.nickname=''});save()}
 return {
  get:key=>typeof key==='string'?db.players[hash(key)]:null,
  view,
  register(){if(Object.keys(db.players).length>=10000)throw Error('プロフィール登録数の上限です');const key=randomUUID()+randomUUID();const p={id:randomUUID(),nickname:'',rating:1000,wins:0,losses:0,draws:0};const h=hash(key);db.players[h]=p;try{save()}catch(e){delete db.players[h];throw e}return {key,profile:view(p)}},
  name(p,name){if(name&&Object.values(db.players).some(other=>other.id!==p.id&&other.nickname===name)){const error=Error('このニックネームは使用中です。別の名前を入力してください');error.code='nickname-taken';throw error}const old=p.nickname;p.nickname=name;try{save()}catch(e){p.nickname=old;throw e}},
  settle(m){
   const pair=m.players.map(p=>p.profile);if(!pair.every(Boolean)||pair[0].id===pair[1].id||db.processed[m.id])return null;
   const before=pair.map(p=>view(p));const old=pair.map(p=>({...p}));const outcome=m.result.winner===null?.5:m.result.winner==='sente'?1:0;
   const expected=1/(1+10**((pair[1].rating-pair[0].rating)/400));const delta=Math.round(32*(outcome-expected));
   pair.forEach((p,i)=>{p.rating=Math.max(1000,p.rating+(i===0?delta:-delta));if(outcome===.5)p.draws++;else if((i===0&&outcome===1)||(i===1&&outcome===0))p.wins++;else p.losses++});
   db.processed[m.id]=true;
   try{save()}catch(e){pair.forEach((p,i)=>Object.assign(p,old[i]));delete db.processed[m.id];throw e}
   return Object.fromEntries(pair.map((p,i)=>[i===0?'sente':'gote',{before:before[i],after:view(p),delta:p.rating-before[i].rating}]));
  }
 };
}
