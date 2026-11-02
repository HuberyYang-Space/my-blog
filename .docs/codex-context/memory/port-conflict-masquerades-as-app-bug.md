---
name: port-conflict-masquerades-as-app-bug
description: "\"服务起了但内容不对\"先确认在跟你说话的是不是你以为的那个进程;Astro dev 会静默换端口"
metadata:
  type: feedback
---

> 历史记录：版本、技术栈与完成状态以现行 [AGENTS.md](../../../AGENTS.md)、项目文档和 Git 为准。历史授权不自动成为当前任务授权。

**端口冲突会伪装成应用 bug。** 遇到"服务起了但内容不对",先确认在跟你说话的是不是你以为的那个进程。

两个踩过的具体形态:

1. `pnpm preview` 起在 4321 却返回 404 —— 实际是另一个项目遗留的 vite 进程占着该端口,我们的服务根本没起来。
   ```bash
   lsof -nP -iTCP:<port> -sTCP:LISTEN   # 谁占着
   ps -p <pid> -o command               # 它是什么
   ```
2. `astro dev --port 4321` 在端口被占时**不报错**,而是静默改绑到下一个空闲端口(4324/4325)。日志里的 "Dev server running at ..." 才是真实端口 —— **不能假设 `--port` 参数一定生效**。
   另:该 daemon 默认绑 `[::1]`(IPv6 loopback),用 `curl 127.0.0.1:<port>` 探测会连接失败,要用 `curl http://[::1]:<port>` 或 `localhost`。

**Why:** 这类故障的表象(404 / 内容陈旧 / 连接被拒)和真正的应用 bug 完全一样,不先排除进程身份就会往错误方向查很久。

**How to apply:** 起完服务先看日志里的实际端口,再用 `lsof` 确认监听者身份,然后才开始验证内容。另外:别顺手 kill 掉不属于本项目的进程,换个端口就好。

相关:[verify-at-end-of-causal-chain](verify-at-end-of-causal-chain.md)
