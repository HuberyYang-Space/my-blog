# 搜索引擎接入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: 使用 superpowers:executing-plans 在本会话逐项执行；任务共享同一份 URL 与状态模型，收尾按 superpowers:requesting-code-review 做一次独立审查。用户已确认直接执行。

**Goal:** 为静态博客增加站点验证、robots、修改日期，以及可重试的百度／IndexNow 发布通知。

**Architecture:** 页面与 sitemap 沿用现有 Nuxt 预渲染；构建期提取公开页面和内容指纹。部署成功后按平台比较持久化基线并提交，GitHub artifact 保存发布快照及提交状态；不增加常驻服务或数据库。

**Tech Stack:** Nuxt 4、TypeScript、现有 @nuxtjs/sitemap、Node 原生 fetch、Vitest、GitHub Actions。新增构建依赖 cheerio 1.2.0 与 fast-xml-parser 5.11.2，版本于 2026-11-03 查询 npm；已有依赖不升级。新增 upload-artifact 使用已核对的 v7.0.2；跨运行及同运行的快照下载统一使用 GitHub CLI，未保留 download-artifact 配置。

**Spec:** [搜索引擎发现与提交](../seo.md)。方案 B、详细计划、直接执行与新增 SEO 索引均已获用户确认；代码与本地验收已完成；外部平台接入尚待账户配置。

## Global Constraints

- `SITE.url` 是唯一站点真源，当前正式 origin 为 `https://blog.huberyyang.site`（2026-11-03 用户确认调整）；消费方保留配置中的完整 origin，路由不加尾斜杠。测试中的非默认端口示例继续用于通用能力验证。
- 草稿判定继续以 [isPublishedPost](../../shared/utils/posts.ts) 为真源；提交只消费实际公开产物，不另写一套 frontmatter 草稿解析。
- 正常构建不要求平台已注册；未启用的平台明确跳过，已启用但缺少必要配置报告错误。
- 不调用 Google 受限 Indexing API、旧 sitemap ping、百度快速抓取或非公开后台 API。
- Token 不进入页面、artifact 或日志；百度 HTTP 必须显式允许，不关闭 TLS 校验或静默降级。
- Vitest 只测不启动 Nuxt／浏览器的纯函数，真实生成结果用产物断言；新增守卫逐种变异验证，并确认变异确实落地。
- 开发环境与线上可达性不列入本轮待办；浏览器工具仍需另获授权。
- 仅新增消费方明确的定义，中文注释只解释非显然取舍；无依据的扩展字段不保留。
- 本任务临时文件创建时登记，全部功能验证通过后在提交或交付前清理；保留正式测试和必要文字证据，不删除用户已有文件。
- 本计划不授权新任务的合并、推送、生产部署或真实 URL 提交；账号与凭据就绪后再核对实际接入结果。提交动作若执行，一律使用 commit skill。

## Review Focus

1. 过去已公开、现在撤回的 URL 与从未公开的草稿必须分开；前者只进入移除通知，后者不能外泄。任务 2 的快照差异用例覆盖。
2. artifact 缺失、过期、部分成功、运行重试与手动补发不能导致错误全量推送或丢失失败项。任务 2 覆盖状态转换，任务 3 用受控执行场景和 YAML 审查覆盖接线；真实跨运行流转需首次启用后确认。
3. 指纹忽略 class／style／打包变化，但保留链接、媒体、标题结构和代码空白的变化。任务 2 逐项验证。
4. 202、部分拒绝、非法响应和不透明的接收数量不能被错误报告为全部成功；服务端错误不能把含 Token 的接口原文带进日志。任务 2 覆盖响应与摘要函数。
5. 产物检查必须核对真实首页 head、实际 robots 地址、文章修改日期与 Key 内容；不能只证明某条配置存在。任务 1 与任务 4 对实际产物逐项破坏验证。

---

## 文件职责与接口

现有文件需要修改：

- [nuxt.config.ts](../../nuxt.config.ts)：验证 meta、robots 预渲染、构建准备与现有产物断言的顺序。
- [BaseLayout.vue](../../app/components/BaseLayout.vue)、[PostLayout.vue](../../app/components/PostLayout.vue)：接入 `updatedDate` 与修改日期 meta。
- [verify-build.ts](../../scripts/verify-build.ts)：调用独立的搜索产物检查，不继续把所有新逻辑内联进大函数。
- [deploy.yml](../../.github/workflows/deploy.yml)：发布快照、部署后的提交任务、手动模式与 artifact 保存。
- [package.json](../../package.json)：必要依赖及 CLI 命令。
- [README.md](../../README.md)、[文档索引](../README.md)、[接续记录](../codex-context/README.md)：同步实际命令、配置和验证结果。

拟新增文件：

| 路径 | 职责 |
| :--- | :--- |
| `shared/utils/seo.ts` | robots、验证 meta 与文章时间的纯计算，不导入 Node 专属模块 |
| `server/routes/robots.txt.ts` | 返回 robots 文本，由预渲染输出静态文件 |
| `scripts/lib/search-snapshot.ts` | 校验平面 sitemap、解析页面、计算内容指纹；文件读取外壳与纯解析分开 |
| `scripts/lib/search-build.ts` | 生成 Key 文件与私有发布快照，收集搜索产物问题 |
| `scripts/lib/search-submission.ts` | 变更计划、请求构造、响应分类、状态推进、脱敏摘要的纯逻辑 |
| `scripts/search-submit.ts` | CLI、fetch、状态／结果文件读写；不在 import 时执行 |
| `scripts/search-artifacts.ts` | GitHub artifact 的可信运行选择与恢复，不自行访问站点或后台 |
| `test/seo.test.ts` | 验证 meta、robots、日期纯函数 |
| `test/search-snapshot.test.ts` | XML／HTML 字符串解析与指纹 |
| `test/search-submission.test.ts` | 差异、业务响应与状态转换 |

公共数据契约：

```ts
interface SearchSnapshot {
  version: 1
  origin: string
  pages: Record<string, string>
}

type SearchEngine = 'baidu' | 'indexnow'

interface EngineState {
  baseline: Record<string, string>
  pending: Record<string, string | null>
}

interface SearchSubmissionState {
  version: 1
  origin: string
  engines: Partial<Record<SearchEngine, EngineState>>
}

interface SubmissionPlan {
  upsert: string[]
  remove: string[]
}
```

`pages` 和 `baseline` 的 key 是完整 canonical URL，value 是内容指纹。`pending` 的 null 表示待确认的移除；这些字段都必须有生产消费方，不为测试额外扩充。

## Task 1: 静态发现与验证材料

**Files:** 纯 SEO 工具、robots 路由、两份布局、Nuxt 配置、搜索构建准备、现有产物断言、SEO 单测。

**Interfaces:**

- `buildRobotsTxt(siteUrl: string): string` 返回允许抓取及绝对 sitemap 声明。
- `buildVerificationMeta(values: { google?: string, baidu?: string, bing?: string })` 仅为非空值生成对应平台 meta。
- `articleModifiedTime(published: Date | string, updated?: Date | string): string` 返回真实内容日期的 ISO 字符串。
- `prepareSearchBuild(publicDir: string, options)` 在现有构建断言前准备 Key；任务 2 完成后，同一入口追加私有快照生成，路径位于 `.output/search/`。任务 1 不依赖尚未实现的快照模块。

- [x] 先写纯函数测试：`:91` 保留、无值不输出标签、三种 meta 名准确、修改日期优先、无修改时用发布日期、非法日期报错；运行 `pnpm test test/seo.test.ts`，确认针对缺失实现变红。
- [x] 实现纯工具及 robots 路由，在 [Nuxt 配置](../../nuxt.config.ts) 显式预渲染 `/robots.txt`；验证值由构建环境读取，不写入假值。
- [x] 将 `post.updatedDate` 从 [PostLayout](../../app/components/PostLayout.vue) 传给 [BaseLayout](../../app/components/BaseLayout.vue)，输出 `article:modified_time`，沿用 sitemap 模块提取。
- [x] Key 仅在 IndexNow 启用时要求存在；校验为 8–128 位字母、数字、连字符。构建生成文件，摘要和错误不打印 Key。
- [x] 新的产物检查核对真实首页 head、robots 完整 origin、Key 文件内容及逐篇日期；未配置标签时不强制要求标签存在。
- [x] 跑单测、类型检查与真实构建；采用受控公开测试验证码和 Key 验证接线，验收后再生成不含测试材料的标准产物。

## Task 2: 内容快照与增量提交逻辑

**Files:** 快照、状态及请求／响应纯模块，必要解析依赖，快照／提交单测。

**Interfaces:**

- `parseSitemapUrls(xml: string, origin: string): string[]` 使用 fast-xml-parser 的校验与解析，限定平面 urlset；拒绝损坏 XML、跨 origin、重复项及非页面地址。
- `fingerprintPage(html: string, canonical: string): string` 使用 Cheerio 解析字符串，不启动浏览器；canonical 不一致、main 缺失时报错。
- `collectSearchSnapshot(publicDir: string, origin: string): Promise<SearchSnapshot>` 读取实际 HTML，校验路径没有越出公开目录。
- `createSubmissionPlan(snapshot, engineState): SubmissionPlan` 对比该平台自己的基线和 pending；无基线时要求显式初始化。
- `initializeEngineState(snapshot): EngineState` 只建基线，不调用外部 API，不报告历史内容已推送。
- 请求构造函数消费计划、站点和凭据；响应分类函数消费 HTTP 状态、JSON 与原始候选 URL；状态推进只消费明确分类结果。

- [x] 先写测试并观察失败：新增、修改、移除、无变化、两个平台基线不同、从未公开草稿不出现、撤回旧 URL 只移除、origin／版本不匹配、缺失基线拒绝自动推送。
- [x] 增加解析依赖到 devDependencies，锁定本轮查到的稳定版本；检查 lockfile 无已有包的主动升级。
- [x] 实现快照；每条 sitemap 页面都必须有实际文件及一致 canonical。清单只含 URL 和指纹，写到公开目录之外。
- [x] 指纹测试逐项钉住：样式类、内联 CSS、script 和构建 ID 不改变结果；正文、heading 层级、href、src、alt、代码缩进改变结果。
- [x] 实现百度文本 POST 与 IndexNow JSON POST。IndexNow `host` 取 URL.hostname，URL 与 keyLocation 保留完整 origin；不通过去端口重试绕过平台校验。
- [x] 百度按当前候选与拒绝列表核对接收数量；无法对应具体接收 URL 时保留为未确认。删除项输出供平台死链工具使用的清单，不调用普通收录 API 假装删除。
- [x] IndexNow 200 推进已接收基线；202 进入 pending；拒绝与失败不推进。批量按官方上限拆分；百度额度消费读取业务返回，不假设统一日配额。
- [x] 测试 HTTP 错误、JSON error、无效结构、部分拒绝、202、429、5xx、混合平台结果及日志脱敏；真实 Token 不用于测试。
- [x] 运行 `pnpm test`，只在纯逻辑全绿后接入 I/O。

## Task 3: CLI、CI 状态与手动重试

**Files:** 两份 CLI、部署工作流、package 命令、接入文档。

**Interfaces:**

- CLI 读取私有发布快照与可选状态文件，按 `initialize`、`submit`、`backfill-baidu` 模式执行；接受 `all`、`baidu`、`indexnow` 平台选择。
- 输出更新后的状态 JSON、脱敏摘要和百度移除清单；即使部分失败也保存结果，退出码反映仍有失败或待处理配置问题。
- artifact 恢复只选择本仓库、main 分支、已完成的可信运行；发布快照须对应部署成功，不用未部署的当前代码冒充。

- [x] 编排请求：使用 Node fetch 超时，只有网络、429、5xx 允许有限重试；429 超预算时保留 pending，不长时间占住部署队列；不对鉴权和格式错误反复提交。
- [x] 配置开关默认关闭；启用后缺少凭据报告错误。百度非 HTTPS 接口默认拒绝，只有显式 `BAIDU_ALLOW_HTTP=true` 才使用；不静默降级。
- [x] 搜索提交放在独立的后置 job，依赖现有 deploy 成功；部署 job 上传私有发布快照后，后置 job 才比较并通知。保留现有不可取消的串行部署设置。
- [x] `workflow_dispatch` 的 `operation` 固定为 `deploy`、`initialize-search`、`submit-search`、`backfill-baidu`，`engine` 为 `all`、`baidu`、`indexnow`；push 默认 deploy。搜索专用操作跳过部署 job，后置 job 用 `always()` 配合显式操作／main 分支条件运行，不能因 needs 被跳过而一并跳过。
- [x] 手动搜索操作恢复最近已部署快照，不重新上传服务器文件；只允许从 main 的可信工作流执行。未启用任何选定平台时说明配置缺项，不把空操作标记为初始化成功。
- [x] 分平台状态在失败时也上传；artifact 名含 run id 和 attempt，避免重跑时覆盖不可变 artifact。只有恢复出了合法状态，或明确初始化且确实生成新状态时才上传，不用空文件覆盖已有基线。恢复时校验 version、origin 和字段，缺失／过期显式要求初始化。
- [x] 使用最小 `contents: read`、`actions: read` 权限和 GitHub CLI／官方 artifact action，不把 Token 放进命令参数、摘要或产物。
- [x] 使用本地受控 HTTP 服务和独立 CLI 进程验证真实请求格式、超时、拒绝、部分成功及状态文件更新；服务先跑已知响应探针。夹具与服务脚本登记为临时文件，不扩大 Vitest 的 Nuxt／浏览器运行时范围。
- [x] 文档列出平台账号验证、Repository variables、Secrets、三种模式及首次启用步骤；当前缺少真实验证码与 Token 不妨碍代码验证，但不能报告外部接入已完成。

## Task 4: 产物变异、自查与交付

**Files:** 搜索产物检查、正式纯函数回归用例、[SEO 说明](../seo.md)、[接续记录](../codex-context/README.md)、README 与索引。

- [x] 在真实构建中验证有／无验证码两种配置；确认 sitemap 修改日期由实际文章 meta 驱动，并验证私有快照不在 `.output/public/`。
- [x] 逐项破坏实际产物：删 robots、改错 sitemap 端口、删除或移动验证标签、Key 文件改名／改内容、文章修改日期退回发布日期、往快照混入不存在的草稿页面。每次先证明文件 checksum／diff 改变，再确认对应检查非零失败，恢复后变绿。
- [x] 对声称能守住的每种回退逐一保留正式回归用例；不把“配置字符串存在”当接线验证。
- [x] 跑 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm verify:build`；确认退出码和实际产物结果，不因类型或测试通过推断构建通过。
- [x] 按 requesting-code-review 派一个独立只读审查者覆盖最终 diff，关注本计划 Review Focus；修复重要问题，记录未覆盖的真实 Actions／平台验证边界。
- [x] 把命令、结果、变异证据和待用户配置项写回正式文档；按临时路径登记逐项清理，检查残留引用与 Git 状态。正式测试、必要接入文档和可复现的标准构建产物保留。
- [x] 仅在用户要求提交时调用 commit skill；本轮不借用之前任务的合并、推送或部署授权。

## 已确认的文档索引

用户已确认，在 [AGENTS.md](../../AGENTS.md) 的触发式索引新增以下一行，仅补入口，不新增规则正文：

| 改什么之前 | 读哪份 | 不读的后果 |
| :--- | :--- | :--- |
| 改搜索引擎验证、SEO 产物或发布提交通知 | [`.docs/seo.md`](../seo.md) | 把受限接口当普通博客推送、丢掉端口、提交草稿或在部署成功前通知 |

## 执行前自审

- [x] Spec 覆盖：静态发现、所有权材料、增量通知、首次初始化、按平台重试、失败结果、文档和验收都有对应任务。
- [x] 类型一致：快照、状态、pending 移除与平台选择的含义在任务间一致。
- [x] 依赖边界：只新增 HTML／XML 解析所需的构建依赖，不升级已有技术栈；HTTP、hash、文件系统用 Node 原生能力。
- [x] 证据边界：纯函数用单测；真实 Nuxt 接线用构建产物；平台和 Actions 实跑须在启用后确认。
- [x] 没有把运行环境、博客可达性或额外内容设施放入待办。
- [x] 临时脚本、夹具与仓库外文件的登记、清理及核实被列为交付条件。

实施与验证结论见[接入说明](../seo.md)；本任务临时文件按登记清理。
