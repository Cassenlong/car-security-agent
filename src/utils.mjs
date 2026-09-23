import {createHash} from 'node:crypto';
export const sha = s => createHash('sha256').update(s).digest('hex');
export const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function redact(s) {
 return String(s ?? '').replace(/\b1[3-9]\d{9}\b/g,'[手机号已脱敏]').replace(/\b[A-HJ-NPR-Z0-9]{17}\b/gi,'[VIN已脱敏]').replace(/\b\d{17}[0-9Xx]\b/g,'[身份证号已脱敏]').replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,'[邮箱已脱敏]').replace(/https?:\/\/[^\s"'<>]+/gi,m=>{try {const u=new URL(m);return u.protocol+'//'+u.hostname+(u.port?':'+u.port:'')+'/[路径及参数已脱敏]'}catch{return '[URL已脱敏]'}}).replace(/-?\d{1,3}\.\d{3,}\s*[,，]\s*-?\d{1,3}\.\d{3,}/g,'[坐标已脱敏]');
}
export function assert(condition,message){if(!condition)throw new Error(message)}
export const LIMITS={files:8,bytes:8*1024*1024,total:20*1024*1024,rows:150000};
export function validateFiles(files){
 assert(Array.isArray(files)&&files.length>0&&files.length<=LIMITS.files,'请上传 1–8 个文件');
 let total=0;
 return files.map(f=>{assert(f&&typeof f.name==='string'&&typeof f.content==='string','文件格式错误');const name=f.name.replace(/\\/g,'/').split('/').pop();assert(name.length<=160&&/\.(json|csv|log|txt)$/i.test(name),'仅支持 JSON、CSV、LOG、TXT'); const size=Buffer.byteLength(f.content);assert(size>0&&size<=LIMITS.bytes,'文件为空或超过 8 MB');total+=size;assert(total<=LIMITS.total,'文件总大小超过 20 MB');return {name,content:f.content.replace(/^\uFEFF/,''),size,sha256:sha(f.content)}});
}
export function validateEndpoint(raw){const u=new URL(raw);assert(u.protocol==='https:'||(u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname)),'模型服务必须使用 HTTPS 或本机 HTTP');assert(!u.username&&!u.password,'请将密钥放入环境变量，不要写入 URL');return u.href.replace(/\/$/,'')}
