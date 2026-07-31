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

### Shiki 双主题:`defaultColor: false` 是关键开关

代码块最初在浅色页面里是一整块深色 —— 因为没配 `markdown.shikiConfig`,Shiki 走默认单主题 `github-dark`,并把颜色写成**内联样式**:

```html
<pre class="astro-code github-dark" style="background-color:#24292e;color:#e1e4e8">
```

内联样式的优先级压过任何外部 CSS,所以靠 `.dark` 选择器是救不回来的。正解是让 Shiki 别输出具体颜色:

```ts
export default defineConfig({
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false, // ← 关键
    },
  },
})
```

`defaultColor: false` 之后,内联样式变成两组变量并存:

```html
<pre style="--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e">
```

再由 CSS 二选一即可。注意 `span` 也要选中,否则只有容器换色、token 不换:

```css
.prose pre, .prose pre span { color: var(--shiki-light); background-color: var(--shiki-light-bg); }
.dark .prose pre, .dark .prose pre span { color: var(--shiki-dark); background-color: var(--shiki-dark-bg); }
```

**教训**:遇到"外部 CSS 改不动"的样式,先看是不是内联样式;是的话,解法在生成端而不在覆盖端。

### `data-pagefind-ignore` / `data-pagefind-meta` 控制摘要质量

`data-pagefind-body` 只决定**哪些页面**进结果集,不决定摘要从哪儿开始。文章 header 若被包在 body 里,摘要就会长成:

> 的首屏闪烁. **2026年7月25日#CSS#前端工程**. 给站点加深色模式时…

日期和标签把真正的正文挤出了摘要。两个属性各司其职:

- `data-pagefind-ignore` —— 把日期/标签那一行排除出**正文索引**。注意它不影响同一子树里的 `data-pagefind-filter`,filter 的采集是独立通道;
- `data-pagefind-meta="title"` —— 把标题登记为条目**元数据**,而非正文。

改完摘要直接从正文首句开始。残留的标题片段是 Pagefind 的常规行为(h1 仍在 body 内),影响很小,没有为此再动索引结构。

### 让静默失败变成构建失败

`site` 填错是最典型的静默失败:构建照常成功,canonical / sitemap / RSS / OG 里的绝对 URL 却整体指向错误域名,通常等到被人分享出去才发现。

原先的应对是在 `astro.config.ts` 写 `// TODO` 注释 —— 但注释不会在任何时刻拦住任何人。改为一个最小集成:

```ts
function siteUrlGuard() {
  return {
    name: 'site-url-guard',
    hooks: {
      'astro:build:start': () => {
        if (SITE.url.includes('example.com')) {
          throw new Error('...')
        }
      },
    },
  }
}
```

挂 `astro:build:start` 而非模块顶层,是为了只拦生产构建、不打扰 `astro dev`。

**方法论**:凡是"填错也不会报错"的配置项,都值得加一道构建期断言。注释是给人看的,断言才是给流程用的。守卫的边界也要说清楚 —— 它只能识别 `example.com` 这类占位特征,拦不住一个拼错的真实域名。

### `astro:content` 的 `z` 已废弃,但 zod 版本必须与 Astro 对齐

`astro check` 报了 10 条 `'z' is deprecated`,官方建议改为直接 `import { z } from 'zod'`。直接改会失败:

```
Cannot find module 'zod' imported from 'src/content.config.ts'
```

因为 zod 只是 Astro 的**传递依赖**,pnpm 的严格 node_modules 不会把它暴露给项目代码。需要显式安装 —— 但**不能随手装最新版**:若装出与 Astro 内部不同的 zod 实例,schema 对象将不是同一个类的实例,校验会以难查的方式失效。

正确做法是先看 Astro 声明的 range 再对齐:

```bash
node -e "console.log(require('./node_modules/astro/package.json').dependencies.zod)"  # ^4.3.6
pnpm add 'zod@^4.3.6'
find node_modules/.pnpm -maxdepth 1 -name 'zod@*'   # 确认只有一份
```

最后一步的"确认只有一份"是必要的验证,不能靠假设。

### 中文标签路由

标签含中文(`前端工程`)时,`/tags/[tag].astro` 无需特殊处理:Astro 产物目录用原始中文字符,浏览器请求时自动 percent-encode,`@astrojs/sitemap` 输出的也是编码后的形式:

```
https://blog.hubery.dev/tags/%E5%89%8D%E7%AB%AF%E5%B7%A5%E7%A8%8B/
```

但这条**必须实测**而非推定 —— 少数静态托管对非 ASCII 路径的处理有差异,本地 `preview` 通过不等于线上通过。

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

### 用多层背景做 hover 动效:三个必须踩过才知道的点

头部导航的"记号笔填涂 + 下划线划出"效果(`.link-marker`)踩到三个坑,都不是看代码能看出来的。

**1. `background-size` 的起始值必须写 `0%`,不能写 `0`**

```css
background-size: 100% 0;    /* ✗ 瞬间跳变,没有过渡 */
background-size: 100% 0%;   /* ✓ */
```

`0` 是**长度**(0px),目标值 `100%` 是**百分比**。混合单位插值要靠 `calc()`,`background-size` 上这条在 WebKit 里不生效,结果不是过渡而是瞬间跳变。写成百分比↔百分比才是所有浏览器都保证能插值的形式。这个坑的隐蔽之处在于:CSS 完全合法,DevTools 里 `transition-property` 也正常显示 `background-size`,只是不动。

**2. 具名类的 `transition` 简写会和 UnoCSS 的 `transition-*` 工具类互相残杀**

同挂在一个元素上时,`.link-marker` 的 `transition: background-size ...` 和 `transition-colors` 都在写 `transition-property` / `-duration` / `-timing-function` 这组长属性,**选择器权重相同(都是 0,1,0)**,只能靠打包顺序决胜负 —— 必然有一个被整条改写掉。实测两边都是具名类赢:

```
dist 产物:      .transition-colors @8559   <  .link-marker @45452
dev SSR head:   .transition-colors @1528   <  .link-marker @54900
```

意味着 `transition-colors` 一直是死的。**规则:元素上有写了 `transition` 简写的具名类,就不要再挂 UnoCSS 的 `transition-*` 工具类**,把所有要过渡的属性合并进那一条声明里。

**3. `background-origin` 是逐层列表,可以让不同层锚在不同的盒子上**

这是让"色块"和"下划线"精确拼接的关键。背景的**绘制区**默认是 border-box(所以画得进边框带),但**定位区**由 `background-origin` 决定,且可以逐层指定:

```css
background-origin: padding-box, border-box;
background-position: 0 100%, 0 100%;
background-size: 100% 0%, 0% 2px;   /* hover 时 → 100% 100%, 100% 2px */
```

- 第一层(色块)锚 padding-box,`100%` 高填满 padding 盒,**止于边框带上沿**;
- 第二层(下划线)锚 border-box,贴底 2px **正好落进 `border-bottom` 那条带子里**。

实测几何(24px 高的链接):下划线层占 `[22, 24]`,`border-bottom` 也占 `[22, 24]` —— 像素级重合,所以未激活项 hover 长出的线和激活项的常驻线在同一基线上;色块占 `[0, 22]`,底边正好接上下划线顶边,无缝也无重叠。

附带好处:非激活项边框是 `transparent`,下划线层透出来;激活项边框是不透明主色,**会把下划线层盖住** —— 悬停激活项时下划线纹丝不动、只有色块动,不用写任何额外的状态规则。

另外,`background-size` 是**可重复列表**,浏览器逐层插值,所以**一条 `transition: background-size` 就同时驱动了两层**,两层严格同步是结构性保证,不是靠对齐两条规则的时长凑出来的。

**验证 CSS 过渡的方法:用 Web Animations API seek,不要用 `requestAnimationFrame` 采样**

后台标签页里 rAF 不触发,采样脚本会直接挂死。改用 `getAnimations()` 拿到 `CSSTransition` 对象后暂停并 seek,确定性地读任意时间点的中间值:

```js
el.classList.add('hover-equivalent-class')
const an = el.getAnimations()[0] // CSSTransition
an.pause()
an.currentTime = 100 // 单位 ms
getComputedStyle(el).backgroundSize // → "100% 77.5561%, 77.5561% 2px"
```

`getAnimations().length === 1` 本身就是"两层由同一条 transition 驱动"的证据。进场 125ms 与离场 125ms 的百分比相加应为 100%,可用来确认离场是原路返回而非另起一条曲线。

### 用 CSS 变量默认值给全局样式类做"参数"

`.highlighter` / `.tinter` 要支持自定义颜色(不传用主题色、传了用自定义色)时,有三条路,选型理由值得记下来。

**为什么是 `var(--tint, var(--c-primary))` 而不是 modifier class**

modifier class(`.tinter--vue`)每加一个颜色都要回 `global.css` 加一条规则,与"让全局类具备通用性"的初衷直接矛盾。变量默认值语法则是零新增规则、任意色值都能传。

**为什么是 UnoCSS 任意属性类而不是 inline `style`**

```html
<a class="highlighter [--tint:var(--c-brand-vue)]">Vue</a>   <!-- ✓ -->
<a class="highlighter" style="--tint: var(--c-brand-vue)">Vue</a>  <!-- ✗ -->
```

两者效果等价,但 inline `style` 属性会被 CSP 的 `style-src` 拦掉(除非开 `unsafe-inline`)。任意属性类由 presetWind3 内含的 preset-mini `cssProperty` 规则(`preset-mini/dist/rules.mjs`,匹配 `/^\[(.*)\]$/` 且属性名满足 `/^[\w-]+$/`)编译成普通 class,无需任何配置:

```css
.\[--tint\:var\(--c-brand-vue\)\]{--tint:var(--c-brand-vue)}
```

**关键约束:被参数化的类只能"消费"变量,绝不能自己声明它**

```css
.highlighter { --_tint: var(--tint, var(--c-primary)); color: var(--_tint); }  /* ✓ */
.highlighter { --tint: var(--c-primary); color: var(--tint); }                 /* ✗ */
```

工具类 `.[--tint:...]` 与 `.highlighter` 权重同为 `(0,1,0)`,第二种写法两边都在声明 `--tint`,又退化成上一节那个"靠打包顺序决胜负"的老问题。默认值语法把"取值"和"赋值"分到两个不同的属性名上(`--_tint` 读、`--tint` 写),从根上不存在权重竞争,与规则先后无关。

**派生值必须跟着参数一起动,不能锁死在原变量上**

`.highlighter` 的 hover 色块原本是 `--c-marker: color-mix(in srgb, var(--c-primary) 20%, transparent)`,浓度烘焙在颜色定义里。参数化后必须把"浓度"和"颜色"拆开,让色块从**当次生效的颜色**现算:

```css
:root { --c-marker-ratio: 20%; }  /* .dark 里是 24% */
.highlighter { background-image: linear-gradient(
  color-mix(in srgb, var(--_tint) var(--c-marker-ratio), transparent), ...); }
```

`color-mix()` 的百分比可以由 `var()` 提供 —— `var()` 在计算值阶段做文本替换,替换完才解析 `color-mix()`。但要小心:**`color-mix()` 一旦无效,整条 `linear-gradient()` 连带失效,背景直接消失且不报错**,属于静默失败,改完必须实际看一眼而不能只看构建通过。

**外部品牌色不能直接用在亮色主题上**

Vue `#42B883` / React `#61DAFB` / Nuxt `#00DC82` 这类品牌色都是为深色背景设计的,放到 `#fdfdfd` 上对比度只有 2.45:1 / 1.60:1 / 1.79:1,远低于正文 4.5:1 的门槛。做法是亮色主题用压暗变体、暗色主题才用官方原色。查官方文档站自己在亮色主题下用的链接色往往能直接抄到(React 的 `#087EA4` 就是 react.dev 的亮底链接色),比自己调更可信。

这类问题的隐蔽性在于**只坏一半**:暗色主题完好,而日常开发多在暗色下,自测极易漏过。凡是引入固定色值的改动,都要专门切到另一个主题核对。

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

- ~~**`astro check` 会报 `'z' is deprecated`**~~:已处理 —— 改为显式安装并对齐 Astro 的 zod 版本后从 `zod` 直接导入,10 条 hints 清零。详见上文「`astro:content` 的 `z` 已废弃」。

- **ESLint 的 import 排序会让 `// @ts-check` 失效**:脚手架生成的 `astro.config.mjs` 顶部有 `// @ts-check`,加入 `@astrojs/vue` 的 import 后被排序规则挤到了两条 import 之间。该指令必须位于文件首行才生效,挤到中间就成了普通注释。本项目已改用 `astro/config` 的 `defineConfig()` 提供类型,直接删掉该注释。

- **用 `git worktree` 让两个 Claude Code 实例并行开发 home/about**:一条命令同时建分支 + 独立目录,不用先 `git branch` 再 `worktree add` 两步:

  ```bash
  git worktree add -b feature/home-page ../my-blog-home main
  git worktree add -b feature/about-page ../my-blog-about main
  ```

  `node_modules` 不跨 worktree 共享,每个目录要各自 `pnpm install`(pnpm store 是硬链接,不会真的双倍占磁盘)。验证时发现 `astro dev --port 4321` 请求的端口若已被占用(本机 4321-4323 被别的项目遗留进程占着),Astro 的 dev daemon 不会报错,而是**静默改绑到下一个空闲端口**(4324/4325),日志里的 "Dev server running at ..." 才是真实端口 —— 不能假设 `--port` 参数一定生效,起完服务要看日志确认实际端口。另外该 daemon 默认绑定 `[::1]`(IPv6 loopback),用 `curl 127.0.0.1:<port>` 探测会连接失败,要用 `curl http://[::1]:<port>` 或 `localhost`。

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

- **注释拦不住人,断言才能**。`site` 占位域名原本靠一条 `// TODO` 注释提醒,但注释在构建流程里不产生任何作用。凡是"填错也不会报错"的配置项,都该配一道构建期断言,把静默失败前移成显式失败。同时要诚实标注断言的**边界** —— 本例的守卫只能识别 `example.com` 这类占位特征,拦不住一个拼错的真实域名,这一点必须写在注释和文档里,否则守卫本身会变成新的虚假安全感。

- **样式"改不动"时,先分清是覆盖问题还是生成问题**。浅色模式下代码块顽固地保持深色,原因是 Shiki 把颜色写成了内联样式 —— 内联优先级压过一切外部 CSS,再怎么加选择器、加 `!important` 都是在错误的层面用力。解法在生成端(`defaultColor: false` 让它改吐变量),而非覆盖端。**遇到 CSS 覆盖失败,先看元素上有没有 `style` 属性,再决定往哪个方向使劲。**

- **UI 类改动要用计算样式取证,别靠肉眼看截图**。验证代码块双主题时,深色截图上"代码块底色比页面略浅"这种差异肉眼很难判断对错。直接读计算值才是确定的证据:

  ```js
  getComputedStyle(document.querySelector('.prose pre')).backgroundColor
  // dark → rgb(36, 41, 46)   light → rgb(255, 255, 255)
  ```

  截图用来判断"好不好看",计算样式用来判断"对不对"。两者不能互相替代。

## 待复盘问题

实施过程中遇到但未即时解决、值得深挖的问题。

- `typescript` 何时能升回 7.x?需等 `@astrojs/language-server` 适配原生编译器的新 API。

### 已了结

- ~~`pnpm peers check` 的 peer dependency 警告~~ —— 复查为 `No peer dependency issues found`,那是安装过程中途的瞬时状态,依赖装齐后自然消解。
