import {createServer} from 'node:http';
import {handler,closeStore} from './http-app.mjs';
const port=Number(process.env.PORT||8765);
const server=createServer(handler);
server.listen(port,'127.0.0.1',()=>console.log('汽车数据安全测评 Agent：http://127.0.0.1:'+port));
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'端口被占用，请先停止旧服务再启动。':e.message);closeStore();process.exitCode=1});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{closeStore();process.exit(0)}));
