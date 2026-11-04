# 搜索引擎发现与提交

## 已确认的范围

用户于 2026-11-03 选择方案 B：站点验证、robots、现有 sitemap 增强，以及部署成功后的百度普通收录与 IndexNow 增量提交。

本页是设计与接入说明，实现步骤见[执行计划](plans/2026-11-03-search-discovery.md)。截至 2026-11-04，Google、Bing、百度和 IndexNow 的接入均已完成，实际收录待在各平台复查。配置和验证证据见[生产接入结果](#生产接入结果)。

不在本轮范围内：开发环境维护、博客线上可达性治理、访问统计、评论、阅读时长、BlogPosting 结构化数据、Google 受限 Indexing API、百度快速抓取权益申请、非公开后台 API 与自动收录 JS。账号登录、DNS 验证及平台最终审核由用户完成。

## 生产接入结果

正式站点为 `https://blog.huberyyang.site`。[线上 sitemap](https://blog.huberyyang.site/sitemap.xml) 包含 7 个页面网址，图片扩展中的 2 个图片地址单独计数。

| 平台 | 已完成项 | 验证证据 |
| :--- | :--- | :--- |
| Google Search Console | 验证 `huberyyang.site` 网域资源，另添加博客网址前缀资源供 Bing 导入。提交正式站点的 sitemap | 用户确认 sitemap 显示成功，发现 7 个网页。首页和 [Flexbox 文章](https://blog.huberyyang.site/posts/flexbox-theory-vs-actual) 的实时测试可编入索引，均显示已请求编入索引。人工处置措施和安全问题报告均显示未检测到问题 |
| Bing Webmaster Tools | 从 Google 导入 `https://blog.huberyyang.site/` 站点 | 用户确认 Bing 的 sitemap 显示成功，发现 7 个网址 |
| 百度搜索资源平台 | 通过首页 HTML 标签验证，启用普通收录 API。百度后台提供 HTTP 接口，用户接受 Token 明文传输并显式启用 `BAIDU_ALLOW_HTTP` | [验证标签部署](https://github.com/HuberyYang-Space/my-blog/actions/runs/41755276448)后，线上首页返回 HTTP 200，`head` 内唯一的百度验证标签与仓库变量一致，用户在百度后台确认验证通过。[基线初始化](https://github.com/HuberyYang-Space/my-blog/actions/runs/41756624655)核对 7 个网址及指纹与部署快照一致。[历史补推](https://github.com/HuberyYang-Space/my-blog/actions/runs/41756992166)确认百度接收 7 条，失败和待重试均为 0，当次剩余配额 3 条 |
| IndexNow | 保存 Key 并启用，初始化 7 个网址的基线，重新部署发布当前 Key 文件 | [基线初始化](https://github.com/HuberyYang-Space/my-blog/actions/runs/41758069982)核对 7 个网址及指纹一致。[当前 Key 部署](https://github.com/HuberyYang-Space/my-blog/actions/runs/41763586489)成功。线上 Key 文件返回 HTTP 200，正文与当前 Key 一致。对首页发送实际通知，首次返回 HTTP 202，约 90 秒后重试一次返回 HTTP 200，确认平台完成 Key 验证并接收首页通知 |

Google 和 Bing 的后台结果来自用户反馈。百度的接收数量来自 Actions 中的 API 响应摘要和状态产物。IndexNow 的 HTTP 200 来自对线上首页的实际请求，验证了当前 Key 和通知接口。

## 后续检查收录

| 平台 | 检查入口 | 如何判断 |
| :--- | :--- | :--- |
| Google | [Search Console](https://search.google.com/search-console) 的「网址检查」，输入新域名下的完整文章网址。整站趋势看「网页索引编制」 | 看索引版本是否显示「网址已收录到 Google」。如果未收录，展开报告查看原因，必要时点「测试实际网址」确认当前页面能否抓取。[网址检查说明](https://support.google.com/webmasters/answer/9012289?hl=zh-Hans) |
| Bing | [Bing Webmaster Tools](https://www.bing.com/webmasters/) 选择博客子域名，在 URL Inspection 检查完整网址。站点范围的情况可查看 Site Explorer | 看索引结果中的网址状态。出现问题时，用 Live URL 查看 Bingbot 实时抓取到的版本。[网址检查说明](https://www.bing.com/webmasters/help/url-inspection-55a30305) |
| 百度 | [百度搜索资源平台](https://ziyuan.baidu.com/) 选择博客站点，查看「数据统计 → 索引量」 | 观察站点索引量及趋势。排查单页访问问题时用「抓取诊断」，接口接收数量从发布 Actions 的百度摘要查看。[百度平台说明](https://ziyuan.baidu.com/college/articleinfo/?id=3329) |
| IndexNow | 查看 Deploy 的 `search` 任务摘要和待处理状态 | HTTP 200 表示通知提交成功，HTTP 202 表示平台已收到网址并等待验证 Key。检查实际收录时，使用接收方的站长工具，例如 Bing 的 URL Inspection。[协议响应说明](https://www.indexnow.org/documentation#response-format) |

## IndexNow 在本项目中的工作方式

IndexNow 是网站通知搜索引擎的网址变更协议。网站把新增、更新或删除的 URL 发给参与协议的入口，接收方可以据此安排抓取，并将通知共享给其他参与方。站点在同一主机公开 Key 文件，接收方读取它来验证通知来自能控制该站点的人。[IndexNow 协议](https://www.indexnow.org/documentation)

博客部署成功后，工作流比较本次公开页面快照与已保存的 IndexNow 基线。新文章、正文变更和已移除的页面会产生通知。通知成功后更新对应基线，HTTP 202 或可重试的失败则留下待处理记录。sitemap 继续提供整站的发现清单，IndexNow 在内容变化时提供更及时的提示。各搜索引擎各自决定何时抓取和收录。[IndexNow 提交与重试原则](https://www.indexnow.org/faq)

## 方案选择

| 方案 | 内容 | 取舍 |
| :--- | :--- | :--- |
| A | 验证、robots、sitemap，后台手动提交 | 实现少；每次发布需要人工操作 |
| B，已选择 | A 的基础配置，加部署后的增量通知、结果记录与重试 | 增加小型构建脚本和 CI 状态；不引入常驻服务或数据库 |

沿用 [`@nuxtjs/sitemap`](../package.json) 的预渲染提取能力，不安装整套 SEO 模块，不升级已有依赖。

## 引擎策略

| 引擎 | 验证与发现 | 发布通知 |
| :--- | :--- | :--- |
| Google | 优先 DNS 验证 Search Console，首次提交固定 sitemap 地址 | 后续更新 sitemap；少量重要 URL 可在平台手动请求收录，不调用受限 Indexing API 或已停用 ping |
| 百度 | 文件或 HTML 标签验证；sitemap、API 权限与额度以当前后台为准 | 普通收录 API 提交新增、更新的公开 URL；删除项生成死链处理清单，不把普通 API 当删除接口 |
| Bing | 可导入已验证的 Google 站点，也可独立验证；提交 sitemap | 使用 IndexNow，不再并行维护另一套 Bing URL Submission API |
| IndexNow 其他参与方 | 根目录 UTF-8 Key 文件证明控制权 | 向统一入口通知新增、更新、移除的 URL |
| 360、搜狗、神马 | 需要时使用官方后台手动入口 | 一期不接入未经确认的公开推送 API |

提交成功仅证明通知被接收，不等于抓取、收录或排名承诺。IndexNow 的 HTTP 202 必须显示为待验证，不能显示为已收录。

## 静态产物

- 所有地址从 [`SITE.url`](../app/config.ts) 派生，当前正式 origin 为 `https://blog.huberyyang.site`。保留配置中的完整协议、主机与显式端口，不在消费方自行改写。
- 新增 `/robots.txt` Nitro 路由，并显式加入预渲染；允许公开内容抓取，声明完整 sitemap 地址，不屏蔽正文所需的 CSS、JS、图片。
- [`BaseLayout.vue`](../app/components/BaseLayout.vue) 接收文章修改日期，输出 `article:modified_time`；日期使用 `updatedDate ?? date`，不使用构建时间冒充内容更新。
- 已安装 sitemap 模块可从文章发布日期和修改日期 meta 提取 `lastmod`，继续输出单个平面 `urlset`。
- 验证标签按提供的值构建进首页 head，未配置时不输出空标签。文件验证材料放在 `public/` 并长期随站点发布。
- IndexNow 启用时，在产物根目录写入与 Key 同名、内容一致的 UTF-8 文本文件；Key 不是页面 URL，不进入 sitemap 或提交清单。
- 当前公开 URL 与内容指纹保存在 `.output/search/`，位于公开目录之外。只有 sitemap 中实际生成且 canonical 一致的 HTML 页面可进入清单。

## 内容指纹与提交状态

页面指纹基于 canonical、标题、描述、文章时间及 main 内容。剔除 script、style、注释、class、内联样式和框架 scope 属性；保留正文、标题结构、链接、媒体地址、替代文本与代码空白。不包含构建 ID、打包文件名或生成时间。

状态按平台独立保存：

- 每个平台有公开 URL 到已确认指纹的基线，以及尚待验证或重试的变更。
- 成功接收才推进对应 URL 的基线；失败平台不继承其他平台的成功状态。
- IndexNow 202 保留待验证项，之后允许重试；200 也只表示收到通知，不表示已经编入索引。
- 首次接入须显式初始化基线，不将全部历史页面自动视作新文章。百度需要补推历史 URL 时使用独立的手动补推模式。
- 状态缺失、过期、格式不兼容或 origin 改变时明确报错，不能静默全站重推或改写目标站点。
- 草稿从未公开过时不进入任何新增、更新通知；曾公开后改为草稿的旧 URL 仅按移除处理。
- 百度无法确认每个 URL 接收情况时，保留未确认项，不凭成功数量猜测具体 URL。

基线和提交结果使用 GitHub Actions artifact 保存，不放进会被部署脚本替换的站点目录，也不包含 Token、接口地址或完整响应原文。artifact 有保留期限，过期后需要显式初始化或人工选择补推。

## CI 与手动操作

现有发布任务完成上传与远端替换后，才运行搜索提交任务。构建失败、部署失败时不通知搜索引擎。

部署完成后上传当前发布快照，供正常增量通知和手动重试读取。手动模式读取最近一次成功部署的快照，不把当前分支尚未部署的构建当线上内容。

同一部署流程保留现有串行并发策略。提交任务失败可以使其自身呈现失败，但不回滚已成功发布的网站；状态和结果需在失败时仍保存，单个平台恢复状态过期、损坏或下载失败时，只让该平台缺少基线并报告失败，健康平台继续；不回退旧状态或自动重建基线。

提供三种搜索操作：初始化基线、增量提交／重试、百度历史补推。可选择单个平台；正常 push 只执行增量模式。纯文档与样式变更不重复通知。

网络超时、429、5xx 允许有限重试；尊重 Retry-After，超过本次预算后保留待处理项。鉴权、格式等 4xx 不反复重试。摘要必须区分未启用、已接收、待验证、部分拒绝和失败，不输出凭据或原始请求地址。

## 配置边界

在 GitHub 仓库 Settings → Secrets and variables → Actions 配置；三个验证值存 Repository variables。开关严格使用 `true` / `false`，留空视为关闭。

| 类型 | 名称 | 用途 |
| :--- | :--- | :--- |
| 构建公开值 | `GOOGLE_SITE_VERIFICATION` | 仅采用 HTML 标签验证时提供；DNS 验证不需要 |
| 构建公开值 | `BAIDU_SITE_VERIFICATION` | 百度提供的 HTML 验证值 |
| 构建公开值 | `BING_SITE_VERIFICATION` | 独立 HTML 验证时提供；导入 Google 站点时可省略 |
| Repository variable | `BAIDU_SUBMISSION_ENABLED` | 明确启用百度通知；默认关闭 |
| Repository variable | `INDEXNOW_SUBMISSION_ENABLED` | 明确启用 IndexNow；默认关闭 |
| Secret | `BAIDU_API_ENDPOINT` | 当前后台提供的完整普通收录接口，包含 Token，不进入客户端或日志 |
| Repository variable | `BAIDU_ALLOW_HTTP` | 后台仅提供 HTTP 时的显式选择，默认不允许；不做静默降级 |
| Secret | `INDEXNOW_KEY` | 供构建 Key 文件和提交使用，不在日志中打印 |

未启用的平台明确跳过；已启用但缺少必要配置时报告错误。普通构建不要求所有平台已注册，不放置假验证码或真实 Token 示例。

百度公开 API 示例部分仍使用 HTTP，不能假定改为 HTTPS 即可使用。实际接口以用户后台为准；如果只有 HTTP，需要明确其 Token 明文传输的取舍，不关闭证书验证，也不自动降级。

## 从零接入步骤

1. 先将代码按正常流程发布到 `main`，完成一次 Deploy；平台开关保持关闭。当前固定 sitemap 为 `https://blog.huberyyang.site/sitemap.xml`。仅切换访问域名不会更新产物中的 canonical、sitemap、RSS 与 OG 地址，必须重新构建并部署。
2. 在 Google Search Console 添加域名属性并完成 DNS 验证；已验证的 `huberyyang.site` 网域资源覆盖 `blog.huberyyang.site`，保留原 DNS 验证记录即可。确认部署后的 sitemap 内容使用新域名，再提交上述完整地址。百度添加与 [`SITE.url`](../app/config.ts) 一致的站点，选择 HTML 标签或文件验证；Bing 可导入 Google 站点或独立验证。HTML 验证值写入上表的变量，验证文件放 [`public/`](../public/)；重新部署后在平台点验证。
3. 百度获得普通收录接口后，将完整地址存为 Secret，核对 `site` 含完整 origin；只接受官方普通 `/urls` 接口的 `site` / `token` 参数。若后台仅提供 HTTP，需自行决定是否设置 `BAIDU_ALLOW_HTTP=true`。IndexNow 自行生成 8–128 位字母、数字或连字符 Key，存 Secret 并启用对应开关；重新部署生成公开 Key 文件。
4. 首次启用后的部署可能因缺少基线使 search job 失败，已成功部署的网站不受影响。在 Actions → Deploy → Run workflow，选择 **main**、`initialize-search` 和平台，显式建立当前已部署页面的基线；此操作不会提交历史页面。两个平台可分开启用／初始化。
5. 后续 push 到 main 自动比较各自基线，仅通知新增、更新和移除。失败或 202 后选 `submit-search` 与对应平台重试。百度需要补推历史页面时，选择 `backfill-baidu`、`baidu`；Google 的少量重要页面在 Search Console 使用 URL 检查。

| operation | 行为 |
| :--- | :--- |
| `deploy` | 构建、发布，成功后增量通知；未启用的平台跳过 |
| `initialize-search` | 读取最近已部署快照，建立所选平台基线；不部署、不发送 URL；再次执行会重设所选基线，先评估未确认项 |
| `submit-search` | 读取最近已部署快照，按所选平台重试；不部署 |
| `backfill-baidu` | 将最近已部署的公开 URL 补推百度；需已有基线；不部署 |

artifact 保留 90 天：`search-snapshot-<run>-<attempt>` 保存部署快照，`search-state-<engine>-<run>-<attempt>` 保存各平台基线、pending 和百度移除清单。只恢复此工作流 main 的可信运行；状态来自已完成运行或当前 run 的较早 attempt。当前 attempt 的部署快照允许读取，因为它仅在服务器发布成功后产生；只重跑搜索 job 时可恢复较早 attempt 的部署快照。最近状态过期时不退回旧基线，使用明确初始化；发布快照也过期时先完成一次正常部署。百度移除项持续保留在基线、重复生成清单，直到人工处理后明确重设基线；脚本不会把它们标记为自动删除成功。

本地命令（只应使用与线上发布一致的快照和已准备的环境配置）：

```bash
pnpm search:submit --mode initialize --engine baidu --snapshot .output/search/snapshot.json
pnpm search:submit --mode submit --engine baidu --snapshot .output/search/snapshot.json --state .search/results/baidu/state.json
pnpm search:submit --mode backfill-baidu --engine baidu --snapshot .output/search/snapshot.json --state .search/results/baidu/state.json
```

本地结果默认位于 `.search/results/`；状态与快照只含 URL／指纹，不保存百度 Token、Key 或接口地址。`pnpm search:restore` 专供 Actions，使用原生 GitHub CLI 恢复可信 artifact，不在开发分支冒充线上状态。请求最多尝试 3 次、单次超时 10 秒；Retry-After 超过 5 秒时留待后续运行，不阻塞部署队列。

## 验证与临时文件

Vitest 继续只覆盖纯计算、字符串解析、请求构造、响应判定与状态转换；Nuxt 接线和真实生成结果交给产物断言。

临时脚本、夹具、调试文件、变异副本和仓库外测试目录，在创建时登记路径及用途。全部功能验证通过后，先把命令和结果写入本页或既有接续记录，再在提交／交付前清理本任务的临时文件；正式测试与回归用例保留。清理要按登记路径核实，并检查残留引用和 Git 状态，不删除用户原有产物。

平台账号验证、真实 Token 推送、实际 Actions 跨运行 artifact 流转，需要启用后的平台反馈；在此之前只能报告代码与本地契约验证结果，不能标记外部接入完成。

## 2026-11-03 本地验收记录

| 检查 | 结果 |
| :--- | :--- |
| `pnpm lint` | 清理临时工作区后全量执行，退出码 0 |
| `pnpm typecheck` | 退出码 0 |
| `pnpm test` | 19 个文件，257 项通过；基线为 175 项 |
| 标准 `pnpm build` / `pnpm verify:build` | 退出码 0；预渲染 25 条路由，10 个 HTML 页面、3 篇文章逐页核对、3 篇草稿无外泄 |
| 受控构建 | 三个平台验证 meta、IndexNow Key 文件与临时 `updatedDate` 接线通过；文章按原 SHA256 恢复 |
| 产物变异 | 21 组改动先确认文件实际变化，再确认对应守卫失败，恢复后全部通过 |
| 文件边界 | 真实 7 页快照探针通过；页面改为指向公开目录外的符号链接时被拒绝；恢复后快照一致 |
| 独立 CLI 与本地 HTTP 服务 | 已知响应探针先通过；18 个场景通过，包括文本／JSON 请求、202、部分拒绝、无效 JSON、鉴权、429、5xx、超时、HTTP 显式允许、单平台失败隔离与 10,001 页跨批续传 |
| artifact CLI 与受控 GitHub CLI | 12 个场景通过，包括 ZIP 内容校验、过期／损坏／运行查询失败隔离、main 信任边界、初始化、当前 attempt 和重跑恢复；下载 ZIP 即时清理 |
| Actions 静态检查 | 官方 actionlint 1.7.12 退出码 0；未执行 shellcheck（本机未安装），也未触发真实工作流 |
| 依赖保留 | 原 lockfile 的 1,406 个 packages 区块、1,421 个 snapshots 区块逐个保持不变；只新增两个直接构建依赖及其新增依赖区块 |
| 标准发布产物 | `.output/public/` 与 `.output/search/` 均无合成测试验证码、Key、Token；私有快照没有进入公开目录 |

产物变异覆盖：robots 缺失／端口错误；三种验证标签分别缺失、移到 body、值错误、重复；Key 文件改名与内容错误；文章修改日期回退；sitemap lastmod 回退；快照注入不存在的草稿、篡改指纹及进入公开目录。新守卫还在原功能缺失的旧产物上观察到失败：缺 robots 和三篇文章缺修改日期均被拦截。变异脚本确认 checksum 或实际路径状态变化，不把未落地的替换视为有效变异。

一次独立只读审查发现 3 项 Important，均已修正：普通点号标签不再误拒绝；一个平台状态异常不会阻塞健康平台；百度补推先持久化整个队列，额度耗尽后只重试未确认的尾批。三个问题分别通过纯计算或真实 Node CLI／本地受控接口观察到失败，再改为通过；没有遗留 Critical／Important 或延期 Minor。按项目分工，Vitest 仅长期运行纯函数测试；CLI、artifact、产物变异是本轮受控验收，不能据此声称真实 Actions／平台已验证。

执行取舍：

- 沿用已获批准的 `dev` 工作区，避免搬运已有计划；混入其他改动的风险通过开工状态与最终 Git diff 核对。
- 不自动提交、合并、推送或部署，保留用户对这些操作的决定；未提交修改仍只存在当前工作区。
- HTML／XML 解析依赖提前到第一项任务安装，保证真实 head 检查；已有依赖被带动升级的风险以逐区块 lockfile 对比排除。
- 审查包 helper 因提交范围为空而拒绝生成，改为审查完整工作区 diff 与所有正式新增文件；漏审新文件的风险由审查者明确核对清单。

独立审查没有判断真实 Actions 权限与跨运行行为、平台接收和收录效果，也没有独立重跑执行者的全部耗时验收；这些边界保留，不以静态审查或本地测试替代外部证据。

临时清理已核实：本轮登记的 230 个临时文件（初始产物副本、日志、假服务与假 GitHub CLI、ZIP 夹具、变异备份、审查包及临时 actionlint）及其工作区已删除；专用自忽略文件和空容器目录也已移除，无其他会话工作区。未创建仓库外临时文件；文章原文校验和、变异重命名残留与标准产物合成凭据已核对，正式测试与标准构建保留。当前工作区有未提交功能修改；未合并、推送、触发部署或真实平台请求。

## 2026-11-03 正式域名调整

- 用户确认正式地址为 `https://blog.huberyyang.site`，授权仅调整本地配置、相关文档并验证构建，不提交、不推送、不部署、不发送真实平台通知。
- 沿用当前 `dev` 工作区，保留已有未提交的搜索引擎接入实现；本轮不修改提交工作流、依赖或服务器配置。
- 只调整 [`SITE.url`](../app/config.ts) 及实际接入地址；测试中的 `example.com:91` 继续覆盖通用的非默认端口保留能力。
- Google 所有权验证通过为用户反馈；尚未确认 sitemap 提交和其他平台验证。部署完成并核对新域名产物后再继续平台配置。
- 修改前真实首页 canonical 为 `https://huberyyang.site:91/`；已知旧地址探针通过，新域名断言按预期失败。修改配置并重新构建后，同一首页新域名断言通过。
- 使用本机 Node 24.13.0（ABI 137），先通过 `better-sqlite3` 内存库 `select 1` 探针，再临时调整命令 `PATH` 执行验证；未修改全局 Node 或依赖。
- `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm verify:build` 均退出 0；19 个文件 / 257 项测试通过，预渲染 25 条路由，产物断言核对 10 个页面、3 篇文章并确认 3 篇草稿未外泄。
- 内联解析真实产物：9 份带 canonical 的 HTML（不含 `200.html` SPA 兜底壳）的 canonical、OG URL、OG／Twitter 图片地址均为新域名且图片文件存在；sitemap 的 7 个 URL、RSS 的 3 篇文章及 feed 自链接、robots sitemap 声明、私有快照的 origin 和 7 个页面均一致。
- 扫描 105 个公开文本产物，旧 origin 命中为 0；私有快照未进入公开目录。4 份本轮文档的 56 个本地文件链接有效。
- 本轮仅使用内联校验命令，未创建临时测试文件、日志或仓库外产物；保留标准构建产物。上述域名检查为本轮验收，不新增硬编码生产域名的长期守卫，也不代表线上部署或平台抓取已验证。
- 独立只读审查无 Critical／Important／Minor 发现，另行读取产物确认新域名；未独立重跑完整测试和构建，未判断线上、平台或真实 Actions。与开工源文件 SHA256 基线对比，仅本轮 5 个配置／文档文件变化，其余 144 个文件保持一致；HEAD 仍为 `7c4b03c`，未提交、推送或部署。

## 官方依据

- [Google 重新抓取方式](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)
- [Google Indexing API 适用范围](https://developers.google.com/search/apis/indexing-api/v3/using-api)
- [Google sitemap ping 停用](https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping)
- [Google robots 作用域](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec)
- [Google 站点验证](https://support.google.com/webmasters/answer/9008080)
- [百度普通收录](https://ziyuan.baidu.com/linksubmit/index)
- [百度 CNAME 验证调整](https://ziyuan.baidu.com/college/articleinfo/?id=3462)
- [百度普通收录公开手册](https://ziyuan.baidu.com/college/articleinfo?id=267&page=2)
- [百度快速抓取权益](https://ziyuan.baidu.com/college/articleinfo?id=3549)
- [Bing 导入与验证](https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b)
- [IndexNow 协议](https://www.indexnow.org/documentation)
- [IndexNow 提交与重试原则](https://www.indexnow.org/faq)
- [Nuxt sitemap 预渲染提取](https://nuxtseo.com/docs/sitemap/guides/prerendering)
- [GitHub artifact 保存与跨任务共享](https://docs.github.com/en/actions/tutorials/store-and-share-data)

百度部分公开说明发布时间较早，具体接口、权限与配额以登录后的当前后台为准。
