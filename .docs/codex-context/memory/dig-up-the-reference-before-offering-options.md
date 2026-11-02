---
name: dig-up-the-reference-before-offering-options
description: "需求里说\"和 X 保持一致\"时，先挖出 X 的一手规格再出选项，不要先凭审美提方案"
metadata:
  node_type: memory
  type: feedback
  modified: 2026-08-04T08:55:49.041Z
---

> 历史记录：版本、技术栈与完成状态以现行 [AGENTS.md](../../../AGENTS.md)、项目文档和 Git 为准。历史授权不自动成为当前任务授权。

用户说"和某个既有实现保持一致"(旧站的某个组件、某个库的默认观感)时，**先去把那个参照物的
真实规格挖出来**——git 历史里的旧代码、npm 包源码、官方文档的变量表——**然后再**给选项。

**Why:** 做搜索功能时，用户要求"位置放在头部主题切换左侧"，我凭"全站克制极简"的审美推荐了
纯图标按钮，被打断。用户补了一句"样式和 pageFind 保持一致"。去翻 git 历史才发现旧站
`src/styles/global.css` 里明写着 `pagefind-modal-trigger { min-width: 138px; min-height: 36px }`
——它根本不是图标按钮，是带文字和 ⌘K 键帽的胶囊。这个答案在仓库里躺着，我却在让用户
从我编的选项里挑。选项本身就是错的，用户只能靠打断来纠正。

**How to apply:** 听到"一致/照旧/像以前那样"，先做这几件事再开口：
`git log --all --diff-filter=D --name-only | grep -i <关键词>` 找被删掉的旧实现；
`git show <commit>^:<路径>` 读它的源码；旧代码里的**魔法数字和 CSS 覆写是最硬的证据**
(138×36 直接否掉了我的整个方案方向)。第三方库则去 npm registry 拉 tarball 看内容、
去官网找 CSS 变量默认值表。挖完之后要问的通常也变了——不再是"你想要哪种外观"，
而是"保真到哪一层：结构尺寸照搬、配色换成本站变量吗"，这才是真正需要人拍板的。

相关：[verify-at-end-of-causal-chain](verify-at-end-of-causal-chain.md)——同一个毛病的两种形态，都是拿推测代替可查的事实。
