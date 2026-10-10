import {appendFileSync,existsSync,mkdirSync,readFileSync,truncateSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
export function createHistory(file){
 const path=file instanceof URL?fileURLToPath(file):file;
 const records=new Map();let storageError=false;
 mkdirSync(dirname(path),{recursive:true});
 if(existsSync(path)){
  const raw=readFileSync(path,'utf8');const end=raw.lastIndexOf('\n')+1;
  // Recover only an incomplete final write; malformed complete records are errors.
  for(const line of raw.slice(0,end).split('\n'))if(line.trim())apply(JSON.parse(line));
  if(end<raw.length)truncateSync(path,Buffer.byteLength(raw.slice(0,end)));
 }
 function apply(e){
  if(e.type==='start')records.set(e.id,{id:e.id,nicknames:e.nicknames,startedAt:e.at,finishedAt:null,result:null,moves:[]});
  const r=records.get(e.id);if(!r)return;
  if(e.type==='move')r.moves.push({at:e.at,side:e.side,action:e.action});
  if(e.type==='end'){r.finishedAt=e.at;r.result=e.result;}
 }
 function write(e){apply(e);try{appendFileSync(path,JSON.stringify(e)+'\n',{encoding:'utf8',mode:0o600});storageError=false}catch(error){storageError=true;console.error('対局履歴を保存できません:',error.message)}}
 return {start:m=>write({type:'start',id:m.id,at:m.startedAt,nicknames:{...m.nicknames}}),move:(m,side,action)=>write({type:'move',id:m.id,at:Date.now(),side,action}),end:m=>write({type:'end',id:m.id,at:m.finishedAt,result:{...m.result}}),list:()=>[...records.values()],get:id=>records.get(id),get storageError(){return storageError}};
}
