import assert from 'node:assert/strict';
import {createServer,request} from 'node:http';
import {readFile} from 'node:fs/promises';
import {handler,closeStore} from '../http-app.mjs';
const server=createServer(handler);
await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});
const port=server.address().port;
const get=path=>new Promise((ok,fail)=>{const req=request({host:'127.0.0.1',port,path},res=>{let chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>ok({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}))});req.on('error',fail);req.end()});
try{
 for(const [path,file,type] of [['/','index.html','text/html'],['/style.css','style.css','text/css'],['/app.js','app.js','text/javascript']]){
  const res=await get(path),expected=await readFile(new URL('../public/'+file,import.meta.url));
  assert.equal(res.status,200);assert(res.headers['content-type'].startsWith(type));
  assert.deepEqual(res.body,expected,'Static response must preserve file bytes: '+path);
  assert.equal(Number(res.headers['content-length']),expected.length);
  assert(expected.length>100,'Static asset must not be empty');
 }
 const page=(await get('/')).body.toString();assert(page.startsWith('<!doctype html>'));assert(!page.includes('"type":"Buffer"'));
 const css=(await get('/style.css')).body.toString();assert(css.includes('.hidden{display:none'));
 assert.equal(JSON.parse((await get('/health')).body.toString()).ok,true);
 assert.equal((await get('/missing.txt')).status,404);
 console.log('HTTP regression passed: HTML/CSS/JS byte integrity, MIME, length, visibility, JSON, 404');
}finally{await new Promise(r=>server.close(r));closeStore()}
