import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * 只跑纯函数单测,不启 Nuxt 运行时。
 *
 * 这个取舍是有意的:需要真实运行时才能验证的东西(组件真的渲染了吗、草稿真的
 * 没进订阅源吗)靠 `scripts/verify-build.ts` 的产物断言来守,那比在测试里搭一套
 * 模拟环境更接近事实 —— 上线的是产物,不是测试里的那个副本。
 *
 * 因此这里的被测对象必须是不碰数据库、不碰 DOM 的纯函数;
 * 一个函数"没法在这里测",通常说明它把计算和取数缠在了一起。
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
  resolve: {
    alias: {
      // 被测模块里的 `~/config` 指向 app/ —— 与 Nuxt 的 srcDir 一致
      '~': fileURLToPath(new URL('./app', import.meta.url)),
    },
  },
})
