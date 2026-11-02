---
name: build-pass-is-not-typecheck-pass
description: "本项目 pnpm build 不做类型检查,必须另跑 astro check,两个命令都要过"
metadata:
  node_type: memory
  type: project
  modified: 2026-08-01T00:34:39.242Z
---

> 历史记录：版本、技术栈与完成状态以现行 [AGENTS.md](../../../AGENTS.md)、项目文档和 Git 为准。历史授权不自动成为当前任务授权。

本项目(my-blog,Astro)里 **`pnpm build` 通过不等于类型没问题** —— 构建不做类型检查。`pnpm typecheck`(即 `astro check`)才会报类型错误。

典型症状:`.astro` 页面里只给 `getStaticPaths` 标注了 `GetStaticPaths`,没在同一文件声明 `Props` 接口,于是 `Astro.props` 退化成 `unknown`。`astro check` 报 `Type 'unknown' is not assignable to...`,而 `pnpm build` 一路绿灯。

**Why:** 两个命令覆盖的是不同的失败面。只跑其中一个会让另一类问题一直潜伏到运行时或下一次改动。

**How to apply:** 提交前(以及声称"验证通过"前)`pnpm typecheck` 和 `pnpm build` 都要跑,不能用其中一个代替另一个。

相关:[verify-at-end-of-causal-chain](verify-at-end-of-causal-chain.md)
