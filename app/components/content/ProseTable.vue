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
