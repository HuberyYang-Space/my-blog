<script setup lang="ts">
import { SITE } from '~/config'

const works = [
  { href: 'https://huberyyang.site/', label: '主页' },
  { href: 'https://huberyyang.site:81/', label: '健身管理' },
  { href: 'https://huberyyang.site:83/', label: '音乐' },
  { href: 'https://huberyyang.site:84/', label: '前端森林' },
  { href: 'https://huberyyang.site:90/', label: 'AI日报' },
  { href: 'https://huberyyang.site:88/', label: 'equals-demo' },
]

// href 缺省表示这一项没有可跳转的目标(微信号只能复制),渲染成点击复制的按钮
// 而不是 href="javascript:void(0)" 的假链接 —— 假链接会被读屏软件播报成"链接"、
// 键盘 Tab 停上去按回车却什么都不发生,将来加 CSP 也会被 script-src 拦掉。
// tint 是字面量的 UnoCSS 任意属性类,不能从 icon/text 拼出来 —— UnoCSS 靠扫描
// 源码文本收集候选类名,拼接结果不在源码里,产物中就没有对应规则。
const contacts: { icon: string, text: string, href?: string, tint: string }[] = [
  { icon: 'i-ph-envelope-simple', text: '18830279823@163.com', href: 'mailto:18830279823@163.com', tint: '[--tint:var(--c-brand-email)]' },
  { icon: 'i-ph-github-logo', text: 'Hub-yang', href: 'https://github.com/Hub-yang', tint: '[--tint:var(--c-brand-github)]' },
  { icon: 'i-ph-wechat-logo', text: 'HuberyYang_', tint: '[--tint:var(--c-brand-wechat)]' },
]

// 站外链接才需要新开标签页,mailto: 这类协议链接不需要。
function isExternal(href?: string) {
  return Boolean(href?.startsWith('http'))
}

// 复制成功后按钮文案临时换成"已复制",aria-live 让读屏软件也能收到反馈
const copyLabels = ref<Record<string, string>>({})
const timers = new Map<string, number>()

async function onCopy(text: string) {
  try {
    await copyToClipboard(text)
    copyLabels.value[text] = '已复制'
  }
  catch {
    copyLabels.value[text] = '复制失败'
  }

  // 连点时重置上一次的还原计时,否则文案会被前一个 timer 提前跳回去
  clearTimeout(timers.get(text))
  timers.set(text, window.setTimeout(() => {
    delete copyLabels.value[text]
  }, 1500))
}

onUnmounted(() => timers.forEach(id => clearTimeout(id)))
</script>

<template>
  <BaseLayout title="关于" :description="`关于 ${SITE.title} 与这个站点。`">
    <section class="prose pt-12">
      <!--
        框架名链接的颜色走 .highlighter 的 --tint 参数（见 assets/css/links.css 的 --tint 一节），
        每家取各自品牌色；Next.js 的标识是纯黑白，直接用 --c-text；AI 不是产品，
        没有官网可指，保持纯文本。这里是一句行内散文而非同构列表，刻意不像下方
        works / contacts 那样抽成数组——拆成 v-for 加分隔符只会更难读。
      -->
      <p>你好，我是<a class="highlighter" href="https://github.com/Hub-yang" target="_blank" rel="noreferrer">{{ SITE.author }}</a>，前端工程师，开源爱好者，对 <a class="highlighter [--tint:var(--c-brand-vue)]" href="https://vuejs.org/" target="_blank" rel="noreferrer">Vue</a> / <a class="highlighter [--tint:var(--c-brand-react)]" href="https://react.dev/" target="_blank" rel="noreferrer">React</a> / <a class="highlighter [--tint:var(--c-brand-nuxt)]" href="https://nuxt.com/" target="_blank" rel="noreferrer">Nuxt</a> / <a class="highlighter [--tint:var(--c-text)]" href="https://nextjs.org/" target="_blank" rel="noreferrer">Next</a> / AI 感兴趣，开发合作欢迎联系。</p>
    </section>

    <nav aria-label="作品链接" class="mt-6 flex flex-wrap gap-x-3 gap-y-1.5 text-sm text-text-mute font-mono">
      <a
        v-for="{ href, label } in works"
        :key="href"
        class="highlighter"
        :href="href"
        target="_blank"
        rel="noreferrer"
      >#{{ label }}</a>
    </nav>

    <nav aria-label="联系方式" class="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-mute">
      <template v-for="{ icon, text, href, tint } in contacts" :key="text">
        <!--
          .tinge 不可省:全局 a 规则是 color: inherit + 无下划线且没有通用 a:hover,
          不挂样式的链接看上去就是一段普通文字,鼠标移上去也没有任何反馈。
          三个链接各自的品牌色只在 hover 时体现(平时融入弱化色的正文),
          不用 .tinter 是因为这里不需要下划线动画,色块本身已是足够的反馈。
        -->
        <a
          v-if="href"
          :href="href"
          :target="isExternal(href) ? '_blank' : undefined"
          :rel="isExternal(href) ? 'noreferrer' : undefined"
          class="tinge inline-flex items-center"
          :class="tint"
        >
          <span :class="icon" />
          {{ text }}
        </a>
        <button
          v-else
          type="button"
          class="tinge inline-flex items-center p-0"
          :class="tint"
          @click="onCopy(text)"
        >
          <span :class="icon" />
          <span aria-live="polite">{{ copyLabels[text] ?? text }}</span>
        </button>
      </template>
    </nav>

    <nav class="mt-12">
      <BackLink href="/">
        返回首页
      </BackLink>
    </nav>
  </BaseLayout>
</template>
