/**
 * 把文本写入剪贴板 —— 全站唯一实现。
 *
 * `navigator.clipboard` 只在安全上下文(https / localhost)下存在,站点若部署在
 * 纯 http 上会直接拿不到,所以保留 `execCommand` 兜底,不让复制在生产环境失灵。
 *
 * 之所以要收敛成一个函数:同一个能力曾在两处各写一遍(联系方式与代码块),
 * 一处带兜底、一处不带 —— 于是同一个站点在纯 http 下"联系方式能复制、代码块不能",
 * 而两处的注释还各自论证了自己是对的。
 *
 * 失败时抛错,由调用方决定怎么反馈(通常是把按钮切到失败态),这里不吞。
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  // 移出可视区域再选中,避免复制瞬间页面滚动或闪烁
  textarea.style.cssText = 'position:fixed;top:-9999px;opacity:0'
  document.body.appendChild(textarea)
  textarea.select()

  try {
    if (!document.execCommand('copy'))
      throw new Error('execCommand("copy") 返回 false')
  }
  finally {
    textarea.remove()
  }
}
