---
name: never-cat-credential-files
description: 排查配置问题时不要整篇 cat 可能含凭据的文件——曾把 npm token 泄进会话记录
metadata:
  node_type: memory
  type: feedback
  modified: 2026-08-01T00:34:19.526Z
---

> 历史记录：版本、技术栈与完成状态以现行 [AGENTS.md](../../../AGENTS.md)、项目文档和 Git 为准。历史授权不自动成为当前任务授权。

排查配置问题时,**不要整篇 `cat` 可能含凭据的文件**。

真实事故:排查 pnpm 供应链策略时执行了 `cat ~/.npmrc`,把其中的 npm token 明文写进了会话记录。而当时真正的需求只是"这个文件里有没有配 registry",定向手段完全够用:

```bash
ls -la ~/.npmrc        # 只确认存在性
npm config get registry # 只取需要的那一项
npm config list         # pnpm/npm 会自动把凭据显示为 (protected)
```

**Why:** 凭据一旦进入日志/会话记录就应视为**已泄露**,唯一可靠的补救是轮换,而非"删掉记录"。所以真正的防线在于一开始就不读它。`npm config list` 的输出里 token 已被自动脱敏为 `(protected)` —— 工具本身就提供了安全的查看方式,`cat` 反而绕过了这层保护。

**How to apply:** 遇到 `.npmrc` / `.env` / `.aws/credentials` / `.ssh/*` / `.docker/config.json` 这类文件,先问"我到底要哪一项",再用只取该项的命令。永远不要为了"看一眼"而全文输出。

相关:[verify-at-end-of-causal-chain](verify-at-end-of-causal-chain.md)
