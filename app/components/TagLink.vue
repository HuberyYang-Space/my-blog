<script setup lang="ts">
defineProps<{
  tag: string
}>()
</script>

<template>
  <NuxtLink :to="`/tags/${tag}`" class="tinter">
    #{{ tag }}
  </NuxtLink>
</template>
