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

## 最近协作记录

### 2026-11-03：搜索引擎接入发布授权与发布前检查

- 用户本次明确授权提交搜索引擎接入及正式域名调整、推送并部署；目标为 `https://blog.huberyyang.site`。沿用 `dev` → `main` 快进发布，保留两个长期分支；部署由现有 [Deploy 工作流](../../.github/workflows/deploy.yml) 执行。
- 发布前重新执行 lint、类型检查、19 个测试文件 / 257 项测试及产物断言，全部通过；构建产物核对 10 个页面、3 篇文章、3 篇草稿未外泄。完整构建及新域名产物证据见[正式域名调整](../seo.md#2026-11-03-正式域名调整)。
- Google 所有权验证通过为用户反馈；部署成功后仍须核对线上 canonical、robots 与 sitemap，再继续 Google 站点地图提交。实际发布结果以目标提交的 Actions 为准，不能用本地构建代替线上验证。

### 2026-11-03：正式域名调整与平台配置接续

- 用户确认正式站点为 `https://blog.huberyyang.site`；本轮仅修改本地站点配置与相关文档、验证构建，不提交、不推送、不部署。
- 用户反馈 Google 网域所有权验证通过；尚未确认 sitemap 提交及其他平台验证。新地址 sitemap 为 `https://blog.huberyyang.site/sitemap.xml`，应在新域名产物部署并核对后提交。
- 在已有 `dev` 工作区继续，保留之前的搜索引擎接入修改；测试中的非默认端口示例仍保留。lint、类型检查、19 个文件 / 257 项测试、构建及产物断言通过；9 份带 canonical 的 HTML、7 个 sitemap URL、3 篇 RSS、robots 和私有快照均使用新域名，105 个公开文本产物无旧 origin。本轮未创建临时文件，完整证据见[正式域名调整](../seo.md#2026-11-03-正式域名调整)。

### 2026-11-03：搜索引擎接入实现

- 用户选择从零接入方案 B：[设计与接入说明](../seo.md)、[详细执行计划](../plans/2026-11-03-search-discovery.md)。代码已接入 robots、验证 meta、修改日期、私有发布快照及部署后的百度／IndexNow 通知；没有进行平台验证、真实 URL 提交、提交代码或部署。
- 范围为 Google Search Console／sitemap、百度普通收录与 IndexNow；开发环境和博客线上可达性由用户把握，不列入待办。
- 临时验证文件必须先登记，全部功能验证通过后、提交或交付前清理；保留正式测试与必要文字证据。
- 验证：19 个文件 / 257 项测试、类型检查、标准构建及产物断言通过；21 组产物变异、18 个独立 HTTP CLI 场景、12 个 artifact CLI 场景和 actionlint 通过。独立审查的 3 项 Important 已先复现后修正；[完整验收与执行取舍](../seo.md#2026-11-03-本地验收记录)。
- 本任务登记的 230 个临时文件及辅助目录已清理，原文章 SHA256 已恢复；标准产物无合成凭据。
- 下一步由用户按[从零接入步骤](../seo.md#从零接入步骤)配置平台账户与仓库 variables／Secrets，正常部署后显式初始化基线；未做真实 Actions 或平台提交。

### 2026-11-02：接入整理与 PR 核对

- 接入提交：[fe06c7f](https://github.com/HuberyYang-Space/my-blog/commit/fe06c7ff5cdcae8af0890bc1e0ed623a30028ff8)。项目规则统一到根目录 [`AGENTS.md`](../../AGENTS.md)，补齐项目经验索引和命令审批说明。
- 旧配置目录、旧兼容入口与专属浏览器环境说明已移除；通用文档布局说明现为 [`agent-doc-layout.md`](../agent-doc-layout.md)，相关索引已同步。
- 操作前与接入提交后均通过 `gh pr list --state open` 核对：仓库开放 PR 为 **0**，本次实际关闭 **0**，没有需要执行的关闭操作。接入提交后的核对时间为 2026-11-02 16:03（Asia/Shanghai）。
- 用户已授权在本记录提交后，将 `dev` 快进合并到 `main` 并推送两个分支；`main` 的推送会触发 [Deploy 工作流](../../.github/workflows/deploy.yml)。后续是否部署成功以该提交的 Actions 结果为准。
- 独立只读审查确认清理主体无阻塞问题；审查指出的旧技能调用写法已核对并修正。领域文档使用当前技能名称，其余工作流保留通用说明，调用前检查技能是否可用。

验证证据：

| 检查 | 结果 |
| :--- | :--- |
| `pnpm lint` | 退出码 0 |
| `pnpm typecheck` | 退出码 0 |
| `pnpm test` | 14 个测试文件、175 项测试通过 |
| `pnpm build`（Node 24.22.1） | 退出码 0，预渲染 24 条路由 |
| 构建内产物断言 | 10 个页面、3 篇文章逐页核对；3 篇草稿确认未外泄 |
| 工作区清理扫描 | 148 个文本文件无旧工具名称，文件与目录名称也无残留 |
| 发布产物扫描 | 89 个文本产物无旧工具名称 |
| 本地文档链接 | 159 个链接有效 |

清理扫描和链接检查是本次一次性校验，不是长期自动化守卫。已先在清理前观察到失败，再用混合大小写的文件名与内容探针、失效链接探针验证检查器；确认探针写入后检查失败，撤销后恢复通过。代码示例中的链接语法不参与链接校验。

本机构建曾因运行时不匹配失败：默认 Node 26.13.0 的 ABI 为 147，已安装的 `better-sqlite3` 二进制 ABI 为 137。直接打开内存数据库可复现同一错误；使用已安装的 Node 24.22.1（ABI 137）执行 `select 1` 成功，随后构建通过。仅为本次构建调整命令的 `PATH`，未更改依赖、锁文件或全局 Node 设置。以后切换 Node 主版本时，应先确认原生依赖与运行时匹配。
