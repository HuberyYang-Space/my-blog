---
title: "给首页做液态文字，我在旧代码上验了三遍"
description: 控制台算出来的偏移量是 0，我就以为画布和标题对齐了。等我去看浏览器到底加载了哪一版，那三遍全得重来。
date: 2026-09-10
tags:
  - 知识
draft: false
---

控制台里算出来是 `0`。我改的是首页标题的定位，按新公式算，两层文字之间的偏移刚好为零。我把这一轮记作“验证通过”。前后三轮，我都是这么验的。

直到后来我去看浏览器实际加载的模块，里面还是旧代码。磁盘上的文件早改了，`curl` 问开发服务器，拿到的也是新的，偏偏这个标签页连 `Cmd+Shift+R` 都没把旧模块换下来。再回头看那个 `0` 就很尴尬了。我亲手把新公式敲进控制台，它当然会按新公式算。至于屏幕上那几个字在哪儿，我其实一次也没量。

## 「我当时想对齐的，是这行字」

::demo{title="把鼠标划过下面这行字，快慢都试试"}
  :demo-liquid-text{text="Hubery"}
::

这就是首页用的那个组件。慢慢划过，笔画像隔着一层水。划快一点，边缘才分出颜色。首页还在文字旁边放了一根闪烁的下划线，后来我查字有没有画歪，它倒成了现成的参照物。

原先这里就一个 `<h1>`，字号 `clamp(2.25rem, 5vw, 3.5rem)`，字重 700。我想找个由头玩一次 WebGL，自己的博客刚好经得起折腾。不过有个条件，第一次打开页面就该读得到标题。于是我把真文字留在原处撑开布局，等效果能跑了，才把 `.hero-title-word` 涂透明，在上面盖一层画布。默认插槽里的光标继续由 DOM 画，把它画到静态贴图里，就只剩一根不会闪的下划线了。

::note{title="手机上读到普通文字就对了"}
遇到 `hover: none`、系统偏好减弱动效，或 WebGL 不可用时，就读原来的文字。上面这个演示也直接用首页组件，省得维护两份越改越不像的效果。
::

## 「拿一个单词试了四种画法」

我起初把四个版本摆在同一页，各自有开关，还挂了 FPS 计数。并排划几下，哪种手感合适，比光看依赖大小好选得多。

| 画法 | 当时的做法 |
| :--- | :--- |
| Canvas 2D 粒子 | 按文字的透明度采样出约 2500 个点，鼠标把点推开，弹簧动画把它们拉回去，不加依赖 |
| OGL 液态扭曲 | 把字画成贴图，用鼠标速度改变取样位置，`ogl` 约 20 KB gzip |
| CSS 立体字 | 多层阴影叠出厚度，随鼠标旋转，也不用加依赖 |
| three.js 立体字 | 用 `TextGeometry` 把字形挤出厚度，当时的 `three` 约 170 KB gzip |

粒子版我也喜欢，只是首页只有一个位置。真 3D 最先让我犹豫的是字体。当时装的 three 包里有 `examples/jsm/`，没有配套的 `examples/fonts/`。我得找一份 TTF，转成 typeface JSON，放进 `public/` 再加载。即便转好了，这也是我选定的那一份字形。页面其他地方用的是访客机器上的系统字体栈，我这台 Mac 上是 PingFang SC，两种字摆在一起看得出来。再看看 170 KB 的体积，为 `Hubery` 这一个词，我还是选了 OGL。

只想让标题悬停变色、稍微挪一点的话，CSS 就够了。下面这些麻烦，几乎都是我多盖那层画布才惹出来的。要是换成一长行中文，还得再量实际字体的基线，贴图也会跟着长。

## 「鼠标划一下，字为什么会流动」

我先用一张离屏 canvas 画白字，底色透明。`Flowmap` 另存一张速度图，鼠标往哪边走、走多快，都记在划过的位置上，停下来以后那段轨迹逐帧变淡。每一帧更新一次 Flowmap，再用一个铺满画布的三角形画标题。

速度图的 R、G 通道给出横纵方向，fragment shader 顺着这两个方向，去文字贴图上稍微偏一点的地方取样，笔画看上去就被推开了。B 通道记速度大小，划得越快，红、绿、蓝三个取样位置分得越开。

```glsl
// 三个通道各偏一点,速度越快分得越开
float r = texture2D(tMap, vUv - offset - vec2(chroma, 0.0)).a;
float g = texture2D(tMap, vUv - offset * 1.12).a;
float b = texture2D(tMap, vUv - offset * 1.24 + vec2(chroma, 0.0)).a;
```

白字贴图只提供轮廓，每次取的是 alpha。字该用什么颜色，由 shader 的 uniform 单独传。这样切换主题也不用为换个颜色重新画字、上传纹理。鼠标靠近的反应则取它到文字外框的最短距离，慢慢加上去。单用 `mouseenter` 和 `mouseleave`，刚一压线整块字就开始动，试起来有点突兀。

shader 写错了，构建照样可能成功，得看画布有没有真的画出字。等字画出来，还得让它盖准底下那一份。

## 「闭坑指南」

### 画布刚接手，字就变窄了

刷新那一瞬间，标题还是对的。等 canvas 显出来，字突然变小，还偏左。我给文字四边各多留了 48px，让流出去的笔画有地方画。这块画布本来就比标题的容器宽，结果碰上了全站的 reset：

```css
img,
video,
svg,
canvas {
  max-width: 100%;
}
```

宽度被压回容器，脚本单独设的高度照旧，于是只有横向被挤扁了。刚刷新时之所以正常，是因为那几十毫秒里看到的还是真文字。我只给标题画布解除这条限制：

```css
.hero-title canvas {
  /* 这块画布刻意比容器宽,不解除的话被压回去,纹理横向压扁 */
  max-width: none;
}
```

删掉这条规则，构建出来的 HTML 一个字也不会变。项目里有一条读组件源码的检查，专门找 `.hero-title canvas` 下的 `max-width: none`。

### 下划线没动，字却高了三四个像素

我最先写的是 `textBaseline = 'middle'`，再把 `y` 放到画布高度的一半。看起来像是居中了，跟旁边的光标一比，整行字高了三四个像素。

`middle` 对着 em 方块的中点。这套字体实测的上升部和下降部是 54 比 12，拿画布中线去对，和 DOM 里文字的基线对不上。既然我已经量过这份文字的外框，直接从顶部往下找它的基线就行：

```ts
const ascent = octx.measureText(text).fontBoundingBoxAscent
octx.textBaseline = 'alphabetic'
octx.fillText(text, PAD_CSS * dpr, PAD_CSS * dpr + ascent)
```

这样 `fillText` 的落点就能按基线算。这里的 54 和 12 只属于当时测的字体，代码里还是得量。

### 最后一个字母挤到光标底下

首页的字距收紧了 `-0.02em`。我从 DOM 读了字族、字号和字重，照样设给离屏 canvas，却漏了 `letter-spacing`。它不在 `font` 简写里。画布按 DOM 的宽度开好了，画出来的六个字母却略宽一点，最后的 `y` 就和光标挤在了一起。

```ts
const spacing = Number.parseFloat(cs.letterSpacing)
if (Number.isFinite(spacing))
  octx.letterSpacing = `${spacing * dpr}px`
```

纹理里的字号按设备像素比 `dpr` 放大过，字距也要乘同一个数。这个小偏差，单看一层画布还真不容易看出来。

### 第一次颜色对，切到暗色就黑了

最初的取色代码只有一行：

```ts
const match = getComputedStyle(textEl).color.match(/\d+/g)
```

第一次读取时，文字还没被涂透明，当然能取到对的颜色。等效果接手后再切主题，从同一个元素读出来的是 `rgba(0, 0, 0, 0)`。正则取前三个数交给 shader，得到一行纯黑的字。亮底上很难察觉，切到暗底，标题就像消失了。

父元素一直保留着页面的文字颜色，从它身上取就好：

```ts
const colorSource = textEl.parentElement ?? textEl
const match = getComputedStyle(colorSource).color.match(/\d+/g)
```

页面的文字颜色还有一段过渡，现在组件会逐帧把读到的颜色同步给 uniform。只在切主题那一刻读一次，拿到的可能还是上个主题的颜色。这个问题要看到切换之后那一帧，只刷新暗色页面，走的还是第一次加载的流程。

### 拖到另一块屏幕，字发虚了

我起初在 `onMounted` 里读一次 `devicePixelRatio`，之后一直用那个值。窗口从内置屏拖到像素密度不同的外接屏，画布还按旧分辨率画。这个问题是前面三轮验证作废以后才找到的。

做法是让 `matchMedia` 盯住当前的分辨率。旧查询失配时重新取 `dpr`、重建贴图，再用新值登记下一次监听：

```ts
function watchDpr() {
  dprQuery?.removeEventListener('change', onDprChange)
  dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
  dprQuery.addEventListener('change', onDprChange)
}
```

窗口尺寸、文字元素尺寸、设备像素比，这三处变化都可能要求重画。拖一下窗口能连着来几十次通知，每次都画离屏 canvas 再上传贴图就太费了。我把它们合到同一个入口，一帧最多重建一次。

## 「这回，页面到底跑的是哪一版」

回到开头的 `0`。我当时用的 Vite 开发服务监听在 IPv6 上，想看服务端送出来的模块，可以这样查：

```bash
curl -gs "http://[::1]:3000/_nuxt/@fs/绝对路径/app/components/HeroTitle.vue" | grep fontBoundingBoxAscent
```

这里要把 `@fs` 后面换成仓库的绝对路径。当时直接请求 `/_nuxt/app/components/HeroTitle.vue` 会拿到 404。查的是 Vite 转换后的文本，像 `fontBoundingBoxAscent` 这种会留下来的标识符比注释合适。

但这条命令只查到了服务器。要回答“这次页面跑了什么”，我还得去开发者工具里找到**当前页面实际加载的那份模块**，连同 URL 上的时间戳一起对，再看里头有没有同一个标识符。两边都对得上，才轮到量文字。要是新旧版本都能算出 `0`，多算几遍也分不出它们。

## 「我把标题删了，测试还是绿的」

这个效果我前后提交了两次。我想至少给后来维护它的人留一条检查：随你怎么改 canvas，首页 `<h1>` 里得读得到 `Hubery`。那份真文字还负责撑开布局，让读屏器和搜索引擎都读得出来。第一版产物断言是这么写的：

```ts
if (!html.includes('>Hubery<'))
  fail('hero', '首页 <h1> 里的标题文字不见了')
```

我故意把 `<h1>` 里的文字删掉，重新跑了一遍。绿的。翻开生成的 HTML，页面的 `<title>Hubery</title>` 也能匹配 `>Hubery<`，难怪删什么它都点头。

后来改成先找组件里包住标题文字的那个 span，再比对内容：

```ts
const heroWord = html.match(/class="hero-title-word"[^>]*>([^<]*)</)?.[1]
if (heroWord !== SITE.title)
  fail('hero', `首页 <h1> 里的文字是「${heroWord}」,期望「${SITE.title}」`)
```

这次再删，缺的就是它要找的那几个字了。那三轮算出来的 `0`，还有这条一直绿着的测试，我现在回头看，最该早一点做的其实是这一下：把我要验的东西拿走，再看结果会不会变。
