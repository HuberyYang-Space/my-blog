// 只对暂存文件跑 eslint --fix:lint-staged 会把文件列表拼在命令后面,所以命令里
// 不能写 `.`,否则变成全仓库 lint,还会改到没暂存的文件。
// --no-warn-ignored:图片等 eslint 不处理的文件也会被传进来,不加会刷一屏"文件已忽略"告警。
// 全量的 typecheck 与单测在 .husky/pre-push。
export default {
  '*': 'eslint --fix --no-warn-ignored',
}
