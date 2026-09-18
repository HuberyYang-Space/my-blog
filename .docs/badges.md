# 徽章约定

> 改徽章的预设表、解析或渲染之前读。

标题右侧的状态徽章。预设表在 [`app/config.ts`](../app/config.ts) 的 `BADGES`,解析在
[`app/utils/badges.ts`](../app/utils/badges.ts),渲染在
[`app/components/PostBadges.vue`](../app/components/PostBadges.vue)
(列表项与文章页 h1 共用同一个组件)。

- **`@nuxt/content` 不会因 schema 违规让构建失败**。这条是实测出来的:给某篇文章写
  `badges: [wpi]`(非法 enum 值)后构建,内容照常入库(`sql_dump.txt` 正常产出),
  日志里**没有任何** schema / validation 相关输出,真正把构建拦下来的是 `resolveBadges()`
  里那句 throw。所以 [`content.config.ts`](../content.config.ts) 的 `z.enum` 只能算第一道,
  **凡是"写错就该停下来"的约束都必须在运行时再兜一遍** —— 只靠 schema 等于没守。
- **Nitro 预渲染把异常一律汇报成 `[500] Server Error`,不打印消息本身**。因此
  `PostBadges.vue` 在 rethrow 前先 `console.error` 一行(带文章路径与错误的 key)。
  拿掉那一行的话,构建失败时能看到的只有"首页 500",而首页列着全部文章,
  根本看不出是哪篇的哪个 key 拼错了。这一行是给人看的,不是给程序看的,别当冗余删掉。
- **未知 key 必须抛错,不能顺手滤掉**。`BADGE_KEYS.filter(k => new Set(post.badges).has(k))`
  这种写法很自然,但它会把拼错的 key 静默丢弃 —— 页面上少一个徽章而构建照常成功,
  正是本项目反复踩的那种形状。校验要单独写一遍循环,别和排序合并。
- **校验用 `Object.hasOwn(BADGES, key)`,不能用 `key in BADGES`**。`in` 会走原型链,
  于是 `constructor` / `toString` / `__proto__` / `valueOf` / `hasOwnProperty` 这些名字
  全部通过校验,再被后面的 filter 顺手滤掉 —— 拐了个弯回到上一条要防的静默失败。
  这条已经踩过一次:第一版写的就是 `in`,单测全绿、构建全绿,靠审查才发现。
- **数量上限只能在运行时守,而且要在注入 draft 之后算**。schema 里的 `.max()` 同样零效力
  (理由见上面第一条);而 `draft` 是自动注入的、不占 frontmatter 的名额,
  `draft: true` + 3 个 badges 会渲染出 4 个,按 frontmatter 长度算就漏了。
- **`draft` 不接受手写**。`BADGE_KEYS` 含它,但 `content.config.ts` 的 enum 用的是
  `AUTHORABLE_BADGE_KEYS`(已剔除),`resolveBadges` 见到手写的 `draft` 直接抛错。
  放行的话,一篇 `draft: false` 而 `badges: [draft]` 的文章会被判为已发布、正常上线,
  页面上却挂着「草稿」—— 恰好推翻"草稿二字线上永远不会出现"这条不变量。
- **顺序取 `BADGE_KEYS` 的定义序,不跟 frontmatter 的书写序**。否则 `[wip, translated]`
  与 `[translated, wip]` 会渲染成两种样子。`draft` 在表里居首,自动注入后天然落在最前,
  不需要额外的"draft 优先"特例。
- **`draft` 徽章是 dev-only**。`draft: true` 的文章在生产被
  [`shared/utils/posts.ts`](../shared/utils/posts.ts) 的 `isPublishedPost()` 整个过滤掉,
  「草稿」二字线上永远不会出现。想要"已发布但还在写"的线上标记是 `wip`,是另一件事。
- **`draft` 仍是可见性的唯一真源**,没有被并进 `badges`。把可见性挂到一个展示用的数组上,
  一个 typo 就会静默发布草稿 —— 展示可以出错,可见性不行。
- 徽章不进 RSS、不进搜索索引:前者会让 `wip` 摘掉时标题变化、旧条目在阅读器里重新冒成未读;
  后者是按 section 存的,文章级字段存进去会在同一篇的 N 个 section 里重复 N 遍。

## 两层守卫管的不是同一件事

产物断言([`scripts/verify-build.ts`](../scripts/verify-build.ts))查的是 HTML —— 徽章
有没有渲染出来(接线断了、预设 key 改了、文案改了都会红);而 `.post-badge-<tone>`
的 **CSS 规则**在不在,产物断言查不到:删掉那条规则,HTML 里的 class 属性一个字都不变,
只是徽章变成一段没有底色的裸小字。后者由 [`test/badges.test.ts`](../test/badges.test.ts)
直接读 `PostBadges.vue` 源码来守。两条都做过破坏演练确认会红。
