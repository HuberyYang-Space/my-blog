# 首页标题特效

> 改 [`app/components/HeroTitle.vue`](../app/components/HeroTitle.vue) 或它的 shader 之前读。

首页 `Hubery` 那几个字挂着一层液态效果:标题画成贴图,`ogl` 的 Flowmap 把鼠标轨迹
累积成速度图,fragment shader 按速度偏移采样坐标。

- **真文本必须留在 `<h1>` 里,效果只是把它涂成透明**。看得见的是盖在上面的 canvas,
  但撑开布局(不产生 CLS)、能被选中、被屏幕阅读器朗读、出现在静态产物里的,全靠那个
  没被删掉的 `<span>`。改成"由 canvas 生成文字"页面看起来一模一样,搜索引擎拿到的
  却是个空标题 —— 由产物断言第 9 项守住。
- **产物断言不能全文搜标题**。`<title>Hubery</title>` 里也有同样一串字,全文 `includes`
  的写法在 `<h1>` 文字全没了的时候照样绿。必须先定位到 `.hero-title-word` 再比对内容。
  这条是破坏演练时发现的 —— 第一版写的就是全文搜,**一个永远不会失败的断言比没有断言
  更糟**,它让人以为这里已经守住了。
- **插槽内容不进纹理**。闪烁光标 `_` 走默认插槽,留在 DOM 里照常渲染。画进纹理的话
  它会变成一根定住不动的下划线 —— 纹理是重建时才更新的静态贴图,承载不了每秒两次的闪烁。
  同理,涂透明只作用于 `.hero-title-word`,插槽不受影响,否则光标直接消失。
- **画布必须解除 `max-width: 100%`**。[`app/assets/css/reset.css`](../app/assets/css/reset.css)
  把 `canvas` 和 `img`/`video`/`svg` 放在同一条规则里(防图片撑破容器),而这块画布是**刻意**
  比容器宽的 —— 文字四周各留 48px 给流动溢出。不解除的话画布被压回容器宽度、高度却不变,
  纹理横向压扁,字看起来又小又偏左。
  这个坑踩过一次:表现是"刷新瞬间正常,然后字突然变小并错位",因为刷新那一瞬看到的还是
  DOM 里的真文字,效果接管后才换成被压扁的画布。HTML 一个字都不变,产物断言查不到
  (它是运行时的 CSS 计算结果),由 [`test/hero-title.test.ts`](../test/hero-title.test.ts)
  读源码守着。
- **`letter-spacing` 不在 canvas 的 `font` 简写里,要单独设**。标题有 -0.02em 的收紧,不同步
  过去的话画出的字比 DOM 那份宽几像素,而画布宽度是按 DOM 文字量的,紧跟其后的光标会压到
  最后一个字母上。设的时候记得乘 dpr —— 纹理里的字号也放大了同样倍数。
- **shader 编译失败是静默的**。canvas 一片空白、页面无任何报错、构建照常成功。改 shader
  后一定要在浏览器里实际看一眼,别只看构建结果 —— 怎么看才算数见
  [`verification-traps.md`](verification-traps.md)。
- **不用 three.js 的 `TextGeometry` 做真挤出**。three 的 npm 包**不含** `examples/fonts/`
  (只有 `examples/jsm/`),那条路要额外准备 typeface JSON 字体文件 + 一套 ttf 转换流程,
  转出来的字形还和站点正文的系统字体对不上。加上 three 约 170 KB gzip 是 ogl 的八倍多,
  为首页一个单词不划算。
- **贴图只画白字,颜色在 shader 里用 uniform 现填**。主题切换只需改一个 uniform;
  若改成重画贴图,切主题时会因为重新上传纹理闪一帧。
- **触发用"鼠标到文字外框的最短距离",不是 `mouseenter`/`mouseleave`**。事件是个开关,
  鼠标一压线整块字突然开始流动;距离衰减让"靠近"本身成为过程。
