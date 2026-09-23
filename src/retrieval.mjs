import {sha,assert,validateEndpoint} from './utils.mjs';
export function splitArticles(text,meta){
 const normalized=text.replace(/\r/g,'');const matches=[...normalized.matchAll(/^[ \t]*(第[一二三四五六七八九十百千万零〇0-9]+条)[ \t　]*/gm)];
 assert(matches.length,'未找到行首的“第X条”，请使用带条号的 TXT 或结构化 JSON');
 return matches.map((m,i)=>({...meta,article:m[1],text:normalized.slice(m.index+m[0].length,matches[i+1]?.index??normalized.length).trim()})).filter(x=>x.text);
}
export function tokens(text){const s=text.toLowerCase().replace(/gps/g,'gps 车辆 行踪 轨迹 位置').replace(/tls|https/g,'加密 传输').replace(/vin/g,'vin 车辆 标识');const out=s.match(/[a-z0-9_]+/g)||[];for(const run of s.match(/[\u4e00-\u9fff]+/g)||[]){if(run.length===1)out.push(run);for(let i=0;i<run.length-1;i++)out.push(run.slice(i,i+2))}return out}
export function lexical(query,docs,k=5){
 const q=[...new Set(tokens(query))];if(!q.length||!docs.length)return [];
 const bags=docs.map(d=>tokens(d.document+' '+d.article+' '+d.text+' '+(d.keywords||'')));const avg=bags.reduce((n,b)=>n+b.length,0)/bags.length;
 return docs.map((d,i)=>{let score=0;for(const t of q){const tf=bags[i].filter(x=>x===t).length;if(!tf)continue;const df=bags.filter(b=>b.includes(t)).length;const idf=Math.log(1+(bags.length-df+.5)/(df+.5));score+=idf*(tf*2.2)/(tf+1.2*(.25+.75*bags[i].length/avg))}return {...d,score:Number(score.toFixed(5)),retrieval:'BM25 中文二元词检索'}}).filter(d=>d.score>0).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,k);
}
export function cosine(a,b){assert(a.length===b.length&&a.length>0,'向量维度不一致');let dot=0,x=0,y=0;for(let i=0;i<a.length;i++){dot+=a[i]*b[i];x+=a[i]*a[i];y+=b[i]*b[i]}return x&&y?dot/Math.sqrt(x*y):0}
export async function embed(texts,config,fetcher=fetch){
 const base=validateEndpoint(config.base);const r=await fetcher(base+'/embeddings',{method:'POST',headers:{'Content-Type':'application/json',...(config.key?{'Authorization':'Bearer '+config.key}:{})},body:JSON.stringify({model:config.model,input:texts}),signal:AbortSignal.timeout(30000)});
 assert(r.ok,'Embedding 服务返回 HTTP '+r.status);const body=await r.json();assert(Array.isArray(body.data)&&body.data.length===texts.length,'Embedding 返回条数不一致');
 const ordered=[...body.data].sort((a,b)=>a.index-b.index);assert(ordered.every((d,i)=>d.index===i),'Embedding 返回索引异常');
 return ordered.map(x=>{assert(Array.isArray(x.embedding)&&x.embedding.length>0&&x.embedding.every(Number.isFinite),'Embedding 返回无效向量');return x.embedding});
}
export async function retrieve(store,query,{k=5,domain,category,embedding,fetcher}={}){
 const docs=store.knowledge().filter(d=>(!domain||d.domain===domain)&&(!category||d.category===category));const ranked=lexical(query,docs,k);
 if(!embedding?.base||!embedding?.model)return {results:ranked,mode:'BM25',warning:null};
 try{const vectors=[];for(const d of docs){const input=d.document+' '+d.article+' '+d.text;const fingerprint=sha(embedding.base+'|'+embedding.model+'|'+input);let v=store.getVector(d.id,fingerprint);if(!v){[v]=await embed([input],embedding,fetcher);store.setVector(d.id,fingerprint,v)}vectors.push(v)}
 const [qv]=await embed([query],embedding,fetcher);const semantic=docs.map((d,i)=>({...d,similarity:cosine(qv,vectors[i])})).filter(d=>d.similarity>=.35).sort((a,b)=>b.similarity-a.similarity).slice(0,k);
 const fused=new Map();for(const list of [ranked,semantic])list.forEach((d,i)=>{const old=fused.get(d.id);fused.set(d.id,{...d,score:(old?.score||0)+1/(60+i+1),retrieval:'BM25 + Embedding / RRF'})});
 return {results:[...fused.values()].sort((a,b)=>b.score-a.score).slice(0,k),mode:'Hybrid',warning:null};
 }catch(e){return {results:ranked,mode:'BM25（向量检索失败后回退）',warning:'向量服务不可用：'+e.message}}
}
