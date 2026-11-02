---
name: verify-at-end-of-causal-chain
description: "验证要打到因果链末端,中间信号(构建日志/命令退出码)会骗人"
metadata:
  node_type: memory
  type: feedback
  modified: 2026-08-01T00:34:27.817Z
---

> 历史记录：版本、技术栈与完成状态以现行 [AGENTS.md](../../../AGENTS.md)、项目文档和 Git 为准。历史授权不自动成为当前任务授权。

**验证要打到"因果链的末端",而不是停在中间信号。**

案例:验证草稿过滤时,构建日志写的是 `Pagefind indexed 3 pages`。若就此推断"索引了 3 页 = 草稿混进去了",或反过来只看日志不细究,都会得出错误结论。真正的证据是去数 `dist/pagefind/fragment/` 下的文件、去 fetch 草稿 URL 看状态码、去搜索框里真的搜一次"草稿"。

**Why:** 中间信号是实现细节的副产品,它和你关心的事实之间隔着若干层推断,每一层都可能断掉。末端事实不会骗人。

**How to apply:** 提出验证方案时,先问"这个信号和我要证明的结论之间隔了几层推断"。隔得越多,越要往下游再走一步——直到摸到用户实际会看到/依赖的那个东西为止。

相关:[build-pass-is-not-typecheck-pass](build-pass-is-not-typecheck-pass.md)、[port-conflict-masquerades-as-app-bug](port-conflict-masquerades-as-app-bug.md)
