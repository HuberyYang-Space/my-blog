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
/* 页脚:固定在视口底部,与 .site-header(见 Header.vue)视觉对称 —— 同样的半透明
   玻璃背景 + 模糊 + 单侧细线边框(边框方向相反:头部 border-bottom,页脚 border-top),
   高度复用同一个 --header-h(经 --footer-h 转发,见 tokens.css),两者不会漂移。
   内部再套一层 max-w-2xl 居中容器,与 Header 的 nav 同构:外层条形背景占满视口宽度,
   内容对齐到与正文相同的列宽。Footer 只在没有大纲(hasAside)的页面渲染(见
   BaseLayout 的 hideFooter),所以这里不需要像正文列那样区分 wide 场景。 */
.site-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
  height: var(--footer-h);
  display: flex;
  align-items: center;
  background-color: color-mix(in srgb, var(--c-bg) 72%, transparent);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--c-border);
  font-size: 0.875rem;
  color: var(--c-text-mute);
  transition: background-color 0.2s ease;
}
</style>
