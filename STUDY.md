# 学习笔记(STUDY.md)

> 用途:记录本项目实施过程中的知识点、操作指南、方法论,供项目结束后学习复盘。随开发进度持续更新,不追求一次性写完。

## 知识点

### 草稿过滤为什么能"一处生效、三处兑现"

草稿的排除只在 `src/utils/posts.ts` 写了一次:

```ts
const posts = await getCollection('blog', ({ data }) => {
  return import.meta.env.PROD ? data.draft !== true : true
})
```

但它同时兑现了三件事,靠的是**静态构建的因果链**:

1. 首页列表调用它 → 草稿不出现在列表中;
2. `getStaticPaths` 也调用它 → 草稿不在路径列表里 → **不生成 html** → 直接访问 404;
3. Pagefind 只扫描构建产物 `dist/` → 页面都不存在 → **自然不会被索引**。

第 3 点尤其值得注意:**不需要给 Pagefind 任何额外配置**。很多静态站点的搜索会漏掉草稿过滤,根源在于搜索索引是独立于路由单独生成的;而 Pagefind 挂在 `astro:build:done`、以产物为唯一输入,天然继承了路由层的过滤结果。

推论:**让下游以上游的产物为唯一输入,过滤就不必重复实现**。反之,如果搜索索引是从源文件另行生成的,就必然要再写一遍 draft 判断,也就必然会有忘记同步的一天。

### `data-pagefind-body` 决定索引粒度

只在 `PostLayout.astro` 的 `<article>` 上标了 `data-pagefind-body`。这个属性的语义是全局性的:

> 一旦站点上**任何**页面带了该属性,Pagefind 就只把带此属性的页面纳入结果集。

因此它一次性解决了两个问题:

- 页眉页脚的文字不会污染每条结果的摘要;
- 首页等列表页不会被索引成一条结果(否则搜任何词都会命中首页)。

验证时注意区分两个数字:构建日志说 `Pagefind indexed 3 pages` 是**扫描**了 3 个页面,而 `dist/pagefind/fragment/` 下只有 2 个文件 —— 后者才是真正可被搜到的结果数。**看 fragment 数量,别看日志数字。**

### 语义化 CSS 变量 vs `dark:` 前缀

主题切换有两种写法。成对写法 `text-black dark:text-white` 把配色决策散落在每个组件里;本项目改为把颜色收敛到一层语义化变量:

```css
:root { --c-text: #222226; }
.dark { --c-text: #d4d4d8; }
```

再让 UnoCSS 的 `theme.colors` 引用它们,组件里只写 `text-text`。好处是**调色只需改一处**,且深浅两套可以各自独立调校对比度 —— 而不是简单反色(深色背景不用纯黑 `#121215`、浅色文字不用纯黑 `#222226`,是为了降低眩光和边缘锐利感)。

### 其他

- Vue 交互岛屿(`client:load` 等指令的选择)
- 防闪烁双主题实现原理(详见示例文章 `fouc-free-dark-mode.md`)

### pnpm 供应链信任策略(trustPolicy)

pnpm 11 引入了 `trustPolicy: no-downgrade`(本机为全局配置)。判定逻辑值得理解清楚:

> Trust checks are based solely on publish date, not semver. A package cannot be installed if any earlier-published version had stronger trust evidence.

即**只看发布时间线上的"信任证据强弱变化",不看语义化版本号**。若某包的历史版本带有 provenance attestation(发布来源附证),而当前要装的版本没有,就判定为 "trust downgrade / possible package takeover"。

这对**老旧但被上游固定住的传递依赖**极易误报 —— 它们发布于 provenance 机制普及之前,自然没有附证。

判断是否误报的核查方法(缺一不可):

1. `npm view <pkg>@<ver> dist.integrity` 与 lockfile 中的 integrity 逐字符比对 —— 一致说明包内容未被篡改;
2. `npm view <pkg>@<ver> _npmUser.name maintainers` —— 确认发布者是该包长期维护者/官方团队;
3. 查发布时间 —— 已发布很久(数月至数年)且下载量巨大的版本若真被接管,早该被社区发现。

豁免方式是 `trustPolicyExclude`(pattern 语法为 `name@version`),**精确到单个版本**,策略对其余依赖仍然生效,优于直接关掉 `trustPolicy`。

## 操作指南

常用命令、环境配置、踩坑记录。

- **`--git` flag 提醒**:仓库已在前置任务中通过 `git init` 建好,执行 `SPEC.md` 里的 `pnpm create astro` 时需去掉 `--git`。

- **create-astro 不会写入非空目录**:即便传了 `.` 作为目标目录,只要目录非空(本项目已有 `SPEC.md` / `.git` 等),脚手架会静默改为新建一个随机名子目录(如 `proto-astronaut`)。需要手动把内容挪回根目录:

  ```bash
  for f in proto-astronaut/.[!.]* proto-astronaut/*; do mv -f "$f" .; done && rmdir proto-astronaut
  ```

  挪完记得改 `package.json` 的 `name` 字段(会是那个随机项目名)。

- **`ERR_PNPM_IGNORED_BUILDS` 未出现**:SPEC 预判需要 `pnpm approve-builds esbuild`,实际脚手架已自动生成 `pnpm-workspace.yaml` 并写好 `allowBuilds: { esbuild: true, sharp: true }`,无需手动处理。

- **本项目已豁免的供应链策略条目**(均已按上述三步核查确认为误报,原因注释见 `pnpm-workspace.yaml`):
  - `semver@6.3.1` —— babel 传递依赖,babel 内部固定 `^6.0.0`,重新解析也躲不开
  - `chokidar@4.0.3` —— `@astrojs/check` 传递依赖
  - `mdn-data@2.29.0` —— 报的其实是 `Missing time in metadata`,pnpm 取到的精简元数据缺 `time` 字段,并非真的 trust downgrade

- **`astro check` 与 TypeScript 7 不兼容**:`pnpm add -D typescript` 默认装到 7.x(原生编译器 tsgo),但它尚未提供 `astro check` 依赖的 programmatic API,会直接报错。必须固定到 6.x:

  ```bash
  pnpm add -D typescript@6
  ```

  进度追踪:https://github.com/withastro/roadmap/discussions/1321

- **`astro check` 需要额外依赖**:直接跑 `pnpm typecheck` 会弹交互式提示要装 `@astrojs/check`。在自动化环境下会卡住,应提前显式安装:`pnpm add -D @astrojs/check typescript@6`。

- **ESLint 不会自动修复 `.astro` 模板里的 tab 缩进**:脚手架生成的 `src/pages/index.astro` 用 tab 缩进,`eslint --fix` 报 `style/no-tabs` 但修不掉(Astro 模板部分不在 autofix 覆盖范围)。用 `expand -t 2` 转换即可:

  ```bash
  expand -t 2 src/pages/index.astro > /tmp/x && mv /tmp/x src/pages/index.astro
  ```

- **ESLint 会连带格式化 Markdown 里的代码块**:跑 `lint:fix` 后 `SPEC.md` 中的 ts 代码块被重排(import 排序、行尾注释对齐)。属预期行为,不影响内容。

- **⚠️ `astro.config.ts` 的 `site` 当前是占位域名** `https://blog.example.com`,**部署前必须替换为实际域名**。sitemap / RSS / OG 图都靠它生成绝对 URL,漏改会导致这些链接全部指向错误域名 —— 而且构建不会报错,属于静默失败。

- **`.astro` 页面里 `Astro.props` 会退化成 `unknown`**:只给 `getStaticPaths` 标注 `GetStaticPaths` 类型是不够的 —— 那不会把 `props` 的类型传导到 `Astro.props`。必须在同一文件里声明 `Props` 接口,Astro 从它推断:

  ```ts
  interface Props {
    post: CollectionEntry<'blog'>
  }
  ```

  症状是 `astro check` 报 `Type 'unknown' is not assignable to...`,而 `pnpm build` 却能正常通过(构建不做类型检查)。**所以 build 通过不等于类型没问题,两个命令都要跑。**

- **ESLint 会把 Markdown 里的代码块当独立源文件解析**:文章里贴了一段对象字面量片段(`theme: { ... }`),ESLint 报 `Parsing error: Expression expected` 且无法自动修复。写技术文章时,`ts`/`js` 代码块要么写成语法完整的片段(包在 `export default defineConfig({...})` 里),要么换用不参与 lint 的语言标签。

- **`astro check` 会报 `'z' is deprecated`**:来自 zod v4 对命名空间式 `z` 导出的软弃用,计入 hints 而非 errors,**不影响退出码**。暂不处理。

- **ESLint 的 import 排序会让 `// @ts-check` 失效**:脚手架生成的 `astro.config.mjs` 顶部有 `// @ts-check`,加入 `@astrojs/vue` 的 import 后被排序规则挤到了两条 import 之间。该指令必须位于文件首行才生效,挤到中间就成了普通注释。本项目已改用 `astro/config` 的 `defineConfig()` 提供类型,直接删掉该注释。

## 方法论

调研与决策过程中总结的可复用方法。

- **安全告警不要无脑绕过,也不要无脑相信**:遇到 `ERR_PNPM_TRUST_DOWNGRADE` 这类供应链告警,正确姿势既不是直接关策略,也不是就此卡死,而是**先取证再决策** —— 比对 integrity、核实维护者、查发布时间线,判定清楚是真风险还是机制误报,再选择最小范围的处置手段(精确豁免 > 关闭策略)。判定依据要写进配置注释,让后来者(包括未来的自己)能复核。

- **"最新稳定版"不等于"该用的版本"**:全局约定是新增依赖取最新稳定版,但 `typescript@7` 这类**生态尚未跟上的大版本跃迁**是例外。判断标准不是版本号新旧,而是工具链是否真的能跑通 —— 装完立刻跑一次验证命令(此处是 `pnpm typecheck`)就能暴露问题。

- **验证要打到"因果链的末端",而不是停在中间信号**。本次验证草稿过滤时,构建日志写的是 `Pagefind indexed 3 pages` —— 若就此认为"索引了 3 页 = 草稿混进去了",或反过来只看日志没细究,都会得出错误结论。真正的证据是去数 `dist/pagefind/fragment/` 下的文件、去 fetch 草稿 URL 看状态码、去搜索框里真的搜一次"草稿"。**中间信号会骗人,末端事实不会。**

- **端口冲突可能伪装成应用 bug**。`pnpm preview` 起在 4321 却返回 404,排查发现是另一个项目(`about-me`)昨天遗留的 vite 进程占着该端口 —— 我们的服务根本没起来。`lsof -nP -iTCP:<port> -sTCP:LISTEN` 加上 `ps -p <pid> -o command` 能一眼看清占用者是谁。**遇到"服务起了但内容不对",先确认在跟你说话的是不是你以为的那个进程。** 另外:别顺手 kill 掉不属于本项目的进程,换个端口就好。

- **排查配置问题时,不要整篇打印可能含凭据的文件**。本次排查 pnpm 供应链策略时,为确认配置来源执行了 `cat ~/.npmrc`,导致其中的 npm token 明文进入会话记录。而当时真正的需求只是"这个文件里有没有配 registry",定向手段完全够用:

  ```bash
  ls -la ~/.npmrc                        # 只确认存在性
  npm config get registry                # 只取需要的那一项
  npm config list                        # pnpm/npm 会自动把凭据显示为 (protected)
  ```

  注意 `npm config list` 的输出里 token 已被自动脱敏为 `(protected)` —— 工具本身就提供了安全的查看方式,`cat` 反而绕过了这层保护。同类高危文件:`.npmrc`、`.env`、`.aws/credentials`、`.ssh/*`、`.docker/config.json`。

  **推论**:凭据一旦进入日志/会话记录就应视为已泄露,唯一可靠的补救是轮换,而非"删掉记录"。所以真正的防线在于一开始就不读它。

## 待复盘问题

实施过程中遇到但未即时解决、值得深挖的问题。

- `typescript` 何时能升回 7.x?需等 `@astrojs/language-server` 适配原生编译器的新 API。

### 已了结

- ~~`pnpm peers check` 的 peer dependency 警告~~ —— 复查为 `No peer dependency issues found`,那是安装过程中途的瞬时状态,依赖装齐后自然消解。
