<script setup lang="ts">
import { SITE } from '~/config'

const year = ref(new Date().getFullYear())
onMounted(() => {
  year.value = new Date().getFullYear()
})
</script>

<template>
  <footer class="site-footer">
    <div class="site-column flex items-center justify-between gap-4">
      <p>© {{ year }} {{ SITE.title }}</p>
      <a href="/rss.xml" target="_blank" class="tinge">RSS</a>
    </div>
  </footer>
</template>

<style>
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
