# 本机设置说明

项目命令审批规则位于 [`.codex/rules/project-migration.rules`](../../.codex/rules/project-migration.rules)。
目前只允许 `git push` 命令前缀；运行范围仍受 Codex 当前权限控制，规则存在不代表本次任务授权。

缓存和临时文件分别放在 `.codex/cache/` 与 `.codex/tmp/`，由根目录 [`.gitignore`](../../.gitignore) 排除，不随项目提交。
