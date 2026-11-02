---
name: python-write-truncates-before-read
description: "open(p,'w').write(open(p).read()) 会先截断再读，一行把文件清空且不报错"
metadata:
  node_type: memory
  type: feedback
  modified: 2026-09-10T07:02:12.034Z
---

> 历史记录：版本、技术栈与完成状态以现行 [AGENTS.md](../../../AGENTS.md)、项目文档和 Git 为准。历史授权不自动成为当前任务授权。

用 Bash 跑 `python3 -c "io.open(p,'w').write(io.open(p).read().replace(a,b))"` 做原地
文本替换，会**把文件清空**。Python 先求值 `.write()` 的接收者 `open(p,'w')`（这一步就
截断了文件），再求值参数里的 `open(p).read()`，此时读到的是空串。

2026-09-10 用它改文章 frontmatter 的 `draft` 字段，一次调用清空了一篇 18 KB 的草稿，
文件是 untracked，git 恢复不了，靠重放对话里记录的全部变换重建。

**Why:** 它不报错，退出码 0，还打印出脚本里写的成功信息。后续的 lint / typecheck /
test / build / 产物断言**全部通过** —— 空 markdown 照样生成一个页面（标题从 slug 推导、
日期变成 1970-01-01），产物断言只逐页核对它认识的检查项，不检查正文是否为空。
整条工具链没有任何一环会告诉你文件没了，只有肉眼看产物内容才发现。参见
[verify-at-end-of-causal-chain](verify-at-end-of-causal-chain.md)。

**How to apply:**
- 单行替换用 `sed -i '' 's/old/new/' file`，不要用 python 一行流。
- 必须用 python 时**分两步写**：先 `s = io.open(p).read()`，再 `io.open(p,'w').write(s)`，
  中间不要让读操作出现在 `write()` 的参数位置。
- 改完立刻 `wc -c` 核对大小，别只看脚本打印的成功信息。
- 改动 untracked 的文件前先 `cp` 一份到 scratchpad，git 兜不住它。
