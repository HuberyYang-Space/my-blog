<script setup lang="ts">
import { SITE } from '~/config'

/**
 * 版权年份。
 *
 * 服务端取到的是**构建时**的年份 —— 纯静态产物发布后不会自己更新,跨年那天
 * 页面上仍是旧年份,直到下次重新构建。所以挂载后再用客户端时间校正一次:
 * 绝大多数时候两者相同、没有可见变化;跨年后禁用 JS 的访客仍看到构建年份,
 * 那是纯静态站点无法回避的下限。
 */
const year = ref(new Date().getFullYear())
onMounted(() => {
  year.value = new Date().getFullYear()
})
</script>

<template>
  <footer class="site-footer">
    <div class="mx-auto max-w-2xl w-full flex items-center justify-between gap-4 px-6">
      <p>© {{ year }} {{ SITE.title }}</p>
      <!--
        必须挂 .tinge:全局的 a 规则是 color: inherit + 无下划线,且没有通用 a:hover。
        不挂样式的链接与周围纯文本在视觉上完全无法区分,悬停也毫无反馈。
        用 .tinge 而非 .tinter:页脚是次要信息,不需要下划线动画。
      -->
      <a href="/rss.xml" class="tinge">RSS</a>
    </div>
  </footer>
</template>

<style>
/* 页脚是正常流里的普通元素,随内容滚走,不常驻视口。
   这是刻意的:固定定位的页脚会一直盖住最后一屏内容,唯一的应对是在有长正文的
   页面上把它整个藏掉,而那样一来文章尾部就没有任何收尾元素,滚到底是一片空白。
   进入正常流后每个页面都以这行版权收尾,不需要再为某类页面开特例。
   内容不足一屏时由 BaseLayout 的 min-h-dvh + flex 把它顶到视口底部。

   高度改由上下 padding 自然撑开,不再写死 —— 常驻时需要固定高度是为了让内容区
   的 padding 补偿能对齐,现在没有补偿这回事了。
   内部再套一层 max-w-2xl 居中容器,与 Header 的 nav 同构:外层条形背景占满视口
   宽度,内容对齐到与正文相同的列宽。 */
.site-footer {
  display: flex;
  align-items: center;
  padding-top: 1.25rem;
  padding-bottom: 1.25rem;
  border-top: 1px solid var(--c-border);
  font-size: 0.875rem;
  color: var(--c-text-mute);
}
</style>
