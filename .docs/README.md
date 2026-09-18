# .docs/

叙述性文档的索引。约束性内容(现役禁令、跨文件的隐式契约、踩过的坑及其理由)在
[`CLAUDE.md`](../CLAUDE.md),每轮会话常驻;这里的东西按需读。

判据是时态:写不成「现在要/不要做什么」的句子,就放这里。布局是怎么定下来的见
[`claude-md-refactor.md`](claude-md-refactor.md)。

| 文档 | 什么时候读 |
| :--- | :--- |
| [`stack-decisions.md`](stack-decisions.md) | 想换掉或新增一个依赖时 |
| [`nuxt-ui-evaluation.md`](nuxt-ui-evaluation.md) | 想引入 UI 组件库时 |
| [`directory-layout.md`](directory-layout.md) | 新增文件不确定放哪时 |
| [`pnpm-and-hooks.md`](pnpm-and-hooks.md) | 提交钩子报错、要改 pnpm 配置或升级 pnpm 时 |
| [`verification-traps.md`](verification-traps.md) | 改完去浏览器验证之前;改完 markdown 页面却没变时 |
| [`hero-title.md`](hero-title.md) | 改首页标题特效之前 |
| [`badges.md`](badges.md) | 改徽章之前 |
| [`search.md`](search.md) | 改搜索之前 |
| [`claude-md-refactor.md`](claude-md-refactor.md) | 想动这套文档布局本身时 |

agent skill 的运行时配置在 [`docs/agents/`](../docs/agents/),不在这里 —— 那个路径被
mattpocock-skills 硬编码引用,挪走会让 skill 静默找不到文件。
