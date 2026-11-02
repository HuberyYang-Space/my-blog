# 项目经验索引

> 历史记录：版本、技术栈与完成状态以现行 [AGENTS.md](../../../AGENTS.md)、项目文档和 Git 为准。历史授权不自动成为当前任务授权。

- [不要 cat 含凭据的文件](never-cat-credential-files.md) — 曾把 npm token 泄进会话记录,凭据入日志即视为已泄露
- [验证要打到因果链末端](verify-at-end-of-causal-chain.md) — 中间信号会骗人,末端事实不会
- [build 通过 ≠ 类型通过](build-pass-is-not-typecheck-pass.md) — 本项目 typecheck 和 build 必须都跑
- [端口冲突伪装成应用 bug](port-conflict-masquerades-as-app-bug.md) — Astro dev 会静默换端口,还默认绑 [::1]
- [安全告警先取证再决策](security-alerts-gather-evidence-first.md) — 精确豁免优于关闭策略,理由写进配置注释
- [说"和 X 一致"就先挖出 X 的规格](dig-up-the-reference-before-offering-options.md) — 旧代码里的魔法数字比我的审美靠谱
- [博客发文正反馈计划](blog-publishing-cadence.md) — 分类封顶 AI/知识/读书,每周一篇试运行,反馈靠自评,6-8 篇后复盘
- [python 一行流会清空文件](python-write-truncates-before-read.md) — open(p,'w') 先截断再读，全链路工具无一报错
