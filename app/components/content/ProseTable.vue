<template>
  <!--
    表格外包一层滚动容器 —— 默认实现是裸 <table>,而 .prose table 是 width: 100%,
    列一多就把正文栏撑破,窄屏上整页出现横向滚动条。包一层之后溢出被限制在表格内部。

    tabindex="0" 是必需的:只能横向拖动的区域对键盘用户不可达,
    加上它才能用方向键滚动(此时需要 role + aria-label 说明这是什么区域)。
  -->
  <div class="table-scroll" tabindex="0" role="region" aria-label="表格,可横向滚动">
    <table>
      <slot />
    </table>
  </div>
</template>

<style>
/* 列多的表在窄屏会把正文栏撑破,故限制溢出在这层内部横向滚动。
   表格本身的排版(边框、内距、表头底色)属于正文层,在 assets/css/prose.css。 */
.table-scroll {
  overflow-x: auto;
}

.table-scroll:focus-visible {
  outline: 2px solid var(--c-primary);
  outline-offset: 3px;
}
</style>
