/**
 * 错误页文案 —— 唯一真源。纯函数。
 *
 * 同一份文案有两个消费方向:页面的 `<title>` / meta description(给机器读),
 * 与 NotFound 渲染在页面上的标题与说明(给人读)。分开写的话,同一个 404 的
 * 标题会被两处各算一遍、说明会出现两种说法 —— 都不报错,只会让标签页上的标题
 * 和页面正文对不上,而这种不一致恰恰只有别人看到时才发现。
 *
 * statusCode 与 statusMessage 的来源是 `createError`(见各页面的 404 抛出处),
 * 判定本身不碰任何运行时环境,因此可单测。
 */
export interface ErrorCopy {
  /** 页面标题,同时用作 NotFound 的 h1 */
  heading: string
  /** 说明文字,同时用作 meta description */
  detail: string
}

export function errorCopy(statusCode: number, statusMessage?: string): ErrorCopy {
  if (statusCode === 404) {
    // 404 不看 statusMessage:各页面抛的是「页面不存在」「标签不存在」这类定位信息,
    // 对访客没有意义,统一说成"地址变了或没了"更有用。
    return {
      heading: '页面不存在',
      detail: '你访问的地址可能已经变更或被移除。',
    }
  }

  return {
    heading: '出错了',
    // 非 404 的 statusMessage 通常比通用兜底句更具体,优先用它
    detail: statusMessage || '服务器处理这个请求时出了问题。',
  }
}
