# my-blog：Codex 接续入口

## 每次开工

1. 读取根目录和目标子目录的 AGENTS.md，再读下面现役进度入口。
2. 将旧记忆与当前 Git／文档核对后接续；不重做已完成事项，不把历史授权当作新的推送、合并、发版或浏览器授权。

## 现役文档入口

- [.docs/README.md](../README.md)
- [README.md](../../README.md)

## 迁入的项目记忆

- [MEMORY.md](memory/MEMORY.md)
- [blog-publishing-cadence.md](memory/blog-publishing-cadence.md)
- [build-pass-is-not-typecheck-pass.md](memory/build-pass-is-not-typecheck-pass.md)
- [dig-up-the-reference-before-offering-options.md](memory/dig-up-the-reference-before-offering-options.md)
- [never-cat-credential-files.md](memory/never-cat-credential-files.md)
- [port-conflict-masquerades-as-app-bug.md](memory/port-conflict-masquerades-as-app-bug.md)
- [python-write-truncates-before-read.md](memory/python-write-truncates-before-read.md)
- [security-alerts-gather-evidence-first.md](memory/security-alerts-gather-evidence-first.md)
- [verify-at-end-of-causal-chain.md](memory/verify-at-end-of-causal-chain.md)

跨项目偏好与其他项目索引：[全局接续索引](../../../../../.codex/project-memories/README.md)

## Codex 接入

- 项目规则以根目录 [`AGENTS.md`](../../AGENTS.md) 为准；先检查本次实际可用的技能和 MCP，不把文档记录视为工具已经可用。
- 提交使用 `commit` skill，并保留现有 husky 校验；合并、推送、部署与浏览器操作分别以当前任务授权为准。
- 本机命令审批范围见[本机设置说明](settings-compatibility.md)；审批规则不扩大任务授权。
- 开发与预览命令分别为 `pnpm dev`、`pnpm preview`；开发端口以进程日志为准，默认 3000。
