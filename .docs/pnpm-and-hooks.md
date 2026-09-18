# pnpm 配置与提交钩子

> 提交钩子报错、或要改 pnpm 配置、升级 pnpm 之前读。

配置写在 [`pnpm-workspace.yaml`](../pnpm-workspace.yaml);钩子在 [`.husky/`](../.husky/),
分工见 `CLAUDE.md`「守门机制」。

- **pnpm 自己的设置只认 `pnpm-workspace.yaml`,写进 `.npmrc` 不生效**(camelCase 与 kebab-case 都读不到)。
  验证办法:`pnpm config get <key>` 返回 `undefined` 就说明没读到。`.npmrc` 只留给 npm 通用的东西(如 registry、认证)。
  这条坑在于**不报错** —— 一个看起来在配置、实际零作用的文件会让人误判问题已经解决。
- **`verifyDepsBeforeRun: false` 不要删**。pnpm 默认会在 `pnpm exec` / `pnpm run` 之前检查依赖是否与
  lockfile 同步,不同步就自行跑一次 `pnpm install`。而 `pre-commit` 里跑的正是 `pnpm exec lint-staged`,
  钩子又常在**无 TTY** 的环境下运行(GitHub Desktop、各类 GUI 客户端)——那次 install 一旦需要交互确认,
  就直接以 `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` 失败,提交被挡下,而报错内容全是 pnpm 内部调用栈,
  看不出跟"提交"或"你改的代码"有任何关系。**依赖同步是人的职责,不该由提交钩子代劳。**
- 同理,**不要为此改用 `confirmModulesPurge: false`**:关掉自动安装之后,该设置只在你手动跑 `pnpm install`
  时才生效,而"我要删光你的 node_modules"恰恰是那个场景下你应该看见的提示。它不是保险,是把唯一有用的招呼关掉。
- 升级 pnpm 大版本后,`node_modules/.modules.yaml` 里记的 `packageManager` 与 `storeDir` 会与当前 pnpm 失配,
  下一次 install 必然要删掉 `node_modules` 重建 —— 这是正常代价,在**终端里**跑一次 `pnpm install` 确认即可。
  (该文件在 pnpm 11 起内容是 JSON,按 YAML 的行首键去 grep 会扑空。)
- `better-sqlite3` 是 `@nuxt/content` 的存储后端(v3 把内容层从文件改为 SQL),原生模块,
  需要在 `pnpm-workspace.yaml` 的 `allowBuilds` 里放行。
