# 搜索约定

> 改搜索索引、匹配逻辑或结果分段之前读。

三段式:[`server/routes/search-index.json.ts`](../server/routes/search-index.json.ts) 生成索引 →
[`app/utils/search.ts`](../app/utils/search.ts) 纯函数匹配 →
[`app/components/SearchDialog.vue`](../app/components/SearchDialog.vue) 只负责渲染。
与取数层同一套分法,理由也相同 —— 排序和边界要能单测。

- **中文一律用子串匹配,不要换成"正经的搜索库"**。现成方案(SQLite FTS5、Pagefind、MiniSearch、
  Fuse)对中文清一色走分词,而分词切不准就会**静默漏搜**:实测 `Intl.Segmenter` 把「高亮标注」
  切成「高亮 | 标 | 注」、「代码块」切成「代码 | 块」,搜「标注」「代码块」全部返回空数组,不报错
  也不告警。`@nuxt/content` 内置的 `useSearchCollection` 更糟 —— 它建 FTS 表时不带 tokenizer
  (`runtime/internal/search.js`),整串中文变成一个 token,只有恰好位于标点后的词才搜得到,
  且模块没暴露 tokenizer 配置入口,改不了。
  中文没有词形变化,子串匹配因此近乎完美;代价只是线性扫描,而 50 篇 × 4KB 的语料全量扫一遍是
  0.004ms 量级。[`test/search.test.ts`](../test/search.test.ts) 末尾那组
  「标注 / 代码块 / 块里」的回归测试就是钉这条结论的,想换库时先看那几条会不会红。
- **索引里的正文不截断**。截断能省体积,但省下来的那一截恰恰是"搜不到"的部分,
  而且搜不到不会报错 —— 看起来只是"这站没写过这个词"。当前全站索引 18KB(gzip 6.8KB),
  几十篇的量级下没有截断的必要。
- **切段复用 `queryCollectionSearchSections`,不要自己按标题拆**。锚点推导规则得和 Nuxt Content
  的 rehype 插件完全一致,对不上时链接会跳到页面顶部而不是小节 —— 不报错,只是跳错地方。
  标题范围取 h2/h3,与 [`app/components/PostOutline.vue`](../app/components/PostOutline.vue)
  的过滤条件同一口径。
- **`/search-index.json` 必须显式列进 `nitro.prerender.routes`**。索引是 `fetch` 出来的,HTML 里
  没有任何指向它的 `href`,爬虫发现不了(同 `CLAUDE.md`「图片约定」里 `extractLinks` 那条)。
  漏掉时 dev 模式照常能搜、构建照常成功,只有线上点开搜索才 404。已由产物断言守住。
- 索引是继站点页面、RSS、sitemap 之后的**第四条草稿泄露面**,过滤只认
  [`shared/utils/posts.ts`](../shared/utils/posts.ts) 的 `isPublishedPost()`。
