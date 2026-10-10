<script setup lang="ts">
import { SITE } from '~/config'

const props = defineProps<{ href?: string, target?: string, rel?: string }>()

// 离开博客的链接一律新开标签页，博客自己的标签页始终留着；站内路由与页内锚点（脚注、大纲）照常同页跳转。
// 写成绝对地址的站内链接也算站内，按 SITE.url 前缀判断而不是只看 http 开头。
const external = computed(() => /^https?:\/\//.test(props.href ?? '') && !props.href!.startsWith(SITE.url))

// rel 必须声明成 prop 再合并：MDC 给外链带的 rel="nofollow" 是透传属性，透传会盖掉模板里绑定的同名值
const rel = computed(() => external.value ? [props.rel, 'noreferrer'].filter(Boolean).join(' ') : props.rel)
</script>

<template>
  <NuxtLink :href="props.href" :target="external ? '_blank' : props.target" :rel="rel">
    <slot />
  </NuxtLink>
</template>
