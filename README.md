# 汽车数据安全测评 Agent

Node.js 24+ 本地可运行 MVP。默认无需 API Key：上传 JSON/CSV/LOG/TXT，执行敏感数据与 CAN 离线检测、法规检索、确定性风险评分和 HTML 报告。

## 启动

```powershell
node --env-file-if-exists=.env server.mjs
# 浏览器打开 http://127.0.0.1:8765
```

命令行演示：

```powershell
node cli.mjs --demo
node tests/run.mjs
```

复制 .env.example 为 .env。页面勾选模型解释时填写 HTTPS OpenAI-compatible API。知识库是官方网页核心条款摘要，不是完整法律文本；用户导入条款会标记为未经核验。

## 网页显示修复后的重启

若网页显示 `{"type":"Buffer","data":[...]}`，请在运行服务的终端按 Ctrl+C，再运行 `node --env-file-if-exists=.env server.mjs`，随后浏览器按 Ctrl+F5。

静态资源 HTTP 回归测试：`node tests/http.mjs`。该测试检查首页、CSS、JavaScript 的响应字节、Content-Type、Content-Length，以及 JSON 和 404 响应。
