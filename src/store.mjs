import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sha,assert} from './utils.mjs';
export const ROOT=fileURLToPath(new URL('../',import.meta.url));
export function createStore(path=join(ROOT,'data/agent.sqlite')){
 if(path!==':memory:')mkdirSync(dirname(path),{recursive:true});
 const db=new DatabaseSync(path);
 db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS knowledge(id TEXT PRIMARY KEY, body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS indicators(id TEXT PRIMARY KEY,body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY,created TEXT NOT NULL,body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS vectors(id TEXT PRIMARY KEY,fingerprint TEXT NOT NULL,body TEXT NOT NULL);');
 const insert=db.prepare('INSERT OR IGNORE INTO knowledge VALUES(?,?)');
 for(const row of JSON.parse(readFileSync(join(ROOT,'knowledge/seed.json'),'utf8'))) insert.run(row.id,JSON.stringify(row));
 const ins=db.prepare('INSERT OR IGNORE INTO indicators VALUES(?,?)');
 for(const row of JSON.parse(readFileSync(join(ROOT,'knowledge/indicators.json'),'utf8')))ins.run(row.id,JSON.stringify(row));
 return {db,knowledge:()=>db.prepare('SELECT body FROM knowledge ORDER BY id').all().map(r=>JSON.parse(r.body)),indicators:()=>db.prepare('SELECT body FROM indicators ORDER BY id').all().map(r=>JSON.parse(r.body)),
 importKnowledge(rows){assert(Array.isArray(rows)&&rows.length>0&&rows.length<=500,'每次导入 1–500 个条款');
 const cleaned=rows.map(r=>{for(const k of ['document','article','text','source'])assert(typeof r[k]==='string'&&r[k].trim(),'缺少条款字段 '+k);assert(r.text.length<=20000,'单条文本过长');assert(/^https?:\/\//.test(r.source),'来源必须是 HTTP(S) URL');return {id:'USR-'+sha(r.document+'|'+r.article).slice(0,20),document:r.document.slice(0,200),article:r.article.slice(0,80),text:r.text,source:r.source.slice(0,2000),publisher:String(r.publisher||'用户导入').slice(0,100),effective_date:String(r.effective_date||'未提供').slice(0,30),status:'用户导入；未经系统核验',text_kind:'用户导入文本',domain:String(r.domain||'automotive').slice(0,60),category:String(r.category||'custom').slice(0,60),keywords:String(r.keywords||'').slice(0,500),checked_at:new Date().toISOString().slice(0,10)}});
 db.exec('BEGIN');try{const s=db.prepare('INSERT OR REPLACE INTO knowledge VALUES(?,?)');for(const r of cleaned)s.run(r.id,JSON.stringify(r));db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}return cleaned.length;},
 saveRun(run){db.prepare('INSERT INTO runs VALUES(?,?,?)').run(run.id,run.created_at,JSON.stringify(run))},
 getRun(id){const r=db.prepare('SELECT body FROM runs WHERE id=?').get(id);return r?JSON.parse(r.body):null},
 listRuns(){return db.prepare('SELECT body FROM runs ORDER BY created DESC LIMIT 50').all().map(r=>{const x=JSON.parse(r.body);return {id:x.id,created_at:x.created_at,vehicle:x.vehicle,risk:x.risk,files:x.files.map(f=>f.name)}})},
 getVector(id,fingerprint){const row=db.prepare('SELECT body FROM vectors WHERE id=? AND fingerprint=?').get(id,fingerprint);return row?JSON.parse(row.body):null},
 setVector(id,fingerprint,v){db.prepare('INSERT OR REPLACE INTO vectors VALUES(?,?,?)').run(id,fingerprint,JSON.stringify(v))},close(){db.close()}};
}
