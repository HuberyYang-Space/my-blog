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
  <footer
    class="mt-16 flex items-center justify-between gap-4 border-t border-border py-8 text-sm text-text-mute"
  >
    <p>© {{ year }} {{ SITE.title }}</p>
    <!--
      必须挂 .tinter:全局的 a 规则是 color: inherit + 无下划线,且没有通用 a:hover。
      不挂样式的链接与周围纯文本在视觉上完全无法区分,悬停也毫无反馈。
    -->
    <a href="/rss.xml" class="tinter">RSS</a>
  </footer>
</template>
