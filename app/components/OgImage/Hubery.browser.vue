<script setup lang="ts">
import { SITE } from '~/config'

/**
 * 站点级 OG 分享图模板,全站共用一张。
 *
 * 文字取自 SITE 常量而非写死:标题与描述在站点上已有唯一真源,图里再抄一遍
 * 就会漂移 —— 而分享图只在别人转发链接时才可见,漂移了自己往往看不到。
 *
 * 配色写成字面量而不是 var(--c-*),原因是这张图必须固定浅色:
 * tokens.css 的深色变量由 <html> 上的 .dark 驱动,而防闪烁内联脚本会读
 * prefers-color-scheme —— 渲染这张图的无头 Chrome 若报告深色偏好,
 * 图就会渲成深色版。字面量取自 tokens.css 的浅色 token,对应关系:
 * #fdfdfd = --c-bg / #222226 = --c-text / #55555a = --c-text-soft / #2b7a6f = --c-primary
 */
</script>

<template>
  <div class="og">
    <span class="rule" />
    <h1 class="title">
      {{ SITE.title }}
    </h1>
    <p class="desc">
      {{ SITE.description }}
    </p>
  </div>
</template>

<style scoped>
.og {
  width: 1200px;
  height: 630px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-left: 120px;
  background: #fdfdfd;
  font-family: ui-sans-serif, system-ui, -apple-system, "PingFang SC",
    "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
}

.rule {
  width: 72px;
  height: 6px;
  margin-bottom: 46px;
  border-radius: 3px;
  background: #2b7a6f;
}

.title {
  margin: 0;
  font-size: 104px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.03em;
  color: #222226;
}

.desc {
  margin: 30px 0 0;
  font-size: 34px;
  line-height: 1.4;
  color: #55555a;
}
</style>
