<script setup lang="ts">
import { SITE } from '~/config'

const year = new Date().getFullYear()
</script>

<template>
  <footer
    class="mt-16 flex items-center justify-between gap-4 border-t border-border py-8 text-sm text-text-mute"
  >
    <p>© {{ year }} {{ SITE.title }}</p>
    <a href="/rss.xml">RSS</a>
  </footer>
</template>
