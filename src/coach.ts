import {fileURLToPath} from 'node:url';
import {Database} from 'bun:sqlite';
import {mkdirSync} from 'node:fs';
export const root=process.env.WT_COACH_HOME || fileURLToPath(new URL('..', import.meta.url));
mkdirSync(root+'/data',{recursive:true});
export const db=new Database(root+'/data/knowledge.sqlite',{create:true});
db.exec(`PRAGMA busy_timeout=10000;
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS documents(id TEXT PRIMARY KEY,title TEXT NOT NULL,body TEXT NOT NULL,url TEXT,version TEXT,kind TEXT,updated TEXT);
CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(id UNINDEXED,title,body,tokenize='trigram');
CREATE TABLE IF NOT EXISTS facts(id TEXT PRIMARY KEY,entity TEXT,key TEXT,value TEXT,unit TEXT,version TEXT,url TEXT,path TEXT,context TEXT);
CREATE INDEX IF NOT EXISTS facts_entity_key ON facts(entity,key);
CREATE TABLE IF NOT EXISTS feedback(id INTEGER PRIMARY KEY,created TEXT,body TEXT);
`);
export function put(d:any){d={...d,title:d.title.replace(/[\u200b-\u200d\ufeff]/g,'')};db.transaction(()=>{db.query('INSERT OR REPLACE INTO documents VALUES(?,?,?,?,?,?,?)').run(d.id,d.title,d.body,d.url||'',d.version||'',d.kind||'note',new Date().toISOString());db.query('DELETE FROM documents_fts WHERE id=?').run(d.id);db.query('INSERT INTO documents_fts VALUES(?,?,?)').run(d.id,d.title,d.kind==='raw_config'?'原始配置字段请用facts检索':d.body)})();}
export function search(q:string){let terms=q.trim().split(/\s+/).filter(Boolean);if(!terms.length)return [];let rows:any[]=[];try{rows=db.query('SELECT d.id,d.title,substr(d.body,1,3000) body,d.url,d.version,d.kind,rank FROM documents_fts f JOIN documents d ON d.id=f.id WHERE documents_fts MATCH ? ORDER BY rank LIMIT 12').all(terms.map(t=>'"'+t.replaceAll('"','""')+'"').join(' OR '))}catch{}if(rows.length)return rows;return db.query("SELECT id,title,substr(body,1,3000) body,url,version,kind FROM documents WHERE title LIKE ? OR body LIKE ? ORDER BY CASE kind WHEN 'term' THEN 0 WHEN 'user' THEN 1 WHEN 'vehicle' THEN 2 ELSE 3 END LIMIT 12").all('%'+q+'%','%'+q+'%');}
// Keep user corrections in both the append-only feedback log and the searchable
// document index used by wt_search. Previously feedback was invisible to search.
export function recordFeedback(body:string){
  const created=new Date().toISOString();
  return db.transaction(()=>{
    const row=db.query('INSERT INTO feedback(created,body) VALUES(?,?)').run(created,body);
    const id='feedback:'+String(row.lastInsertRowid);
    put({id,title:'用户修订 '+body.slice(0,100),body,kind:'user',version:'user-experience '+created.slice(0,10),url:''});
    return id;
  })();
}
export function validate(r:any){
  const errors:string[]=[],warnings:string[]=[];
  const evidence=new Map((r.evidence||[]).map((e:any)=>[e.id,e]));
  for(const c of r.claims||[]){
    if(!c.evidenceIds?.length)warnings.push(c.id+': 缺少关联证据');
    for(const id of c.evidenceIds||[])if(!evidence.has(id))errors.push(c.id+': 未找到证据 '+id);
    if(c.decisionAt!=null)for(const id of c.evidenceIds||[]){const e:any=evidence.get(id);if(e?.availableAt>c.decisionAt&&c.use==='decision')errors.push(c.id+': 使用了决策后信息');}
    if(c.optionAvailability==='unavailable'&&c.verdict==='better')errors.push(c.id+': 建议当时不可执行');
    if(c.optionAvailability==='unknown'&&c.verdict==='better')warnings.push(c.id+': 可行性不明，建议写条件');
    if(c.referenceVersion&&r.version&&c.referenceVersion!==r.version)warnings.push(c.id+': 资料版本与录像不同');
  }
  const decisions=(r.claims||[]).filter((c:any)=>c.use==='decision');
  for(const c of decisions){
    if(!c.coach){warnings.push(c.id+': decision 缺少教练层 coach（options/did/cost/nextTime）');continue;}
    const opts=Array.isArray(c.coach.options)?c.coach.options:[];
    if(!opts.length)warnings.push(c.id+': coach.options 为空（应含「不做」等当时可选项）');
    for(const k of ['did','cost','nextTime'])if(!String(c.coach[k]??'').trim())warnings.push(c.id+': coach.'+k+' 缺失');
  }
  return {valid:!errors.length,errors,warnings,coverage:{claims:r.claims?.length||0,evidence:evidence.size,decisions:decisions.length}};
}
if(import.meta.main){const [cmd,...a]=Bun.argv.slice(2);if(cmd==='search')console.log(JSON.stringify(search(a.join(' ')),null,2));else if(cmd==='import'){const data=await Bun.file(a[0]).json();for(const d of Array.isArray(data)?data:[data])put(d);console.log('Imported')}else if(cmd==='facts')console.log(JSON.stringify(db.query('SELECT * FROM facts WHERE entity LIKE ?').all('%'+a.join(' ')+'%'),null,2));else if(cmd==='feedback'){const body=a[0]==='--file'?await Bun.file(a[1]).text():a.join(' ');console.log('Saved '+recordFeedback(body))}else if(cmd==='validate'){const r=validate(await Bun.file(a[0]).json());console.log(JSON.stringify(r,null,2));process.exitCode=r.valid?0:1;}else if(cmd==='status')console.log(JSON.stringify({root,documents:db.query('SELECT count(*) n FROM documents').get(),facts:db.query('SELECT count(*) n FROM facts').get()}));else console.log('Commands: status | search <text> | import <json> | facts <entity> | feedback <text> | validate <review.json>');}
