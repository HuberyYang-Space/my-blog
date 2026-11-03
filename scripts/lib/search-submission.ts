import type { SearchSnapshot } from './search-snapshot.ts'
import { assertPageUrl } from './search-snapshot.ts'

export type SearchEngine = 'baidu' | 'indexnow'
export interface EngineState {
  baseline: Record<string, string>
  pending: Record<string, string | null>
}
export interface SearchSubmissionState {
  version: 1
  origin: string
  engines: Partial<Record<SearchEngine, EngineState>>
}
export interface SubmissionPlan { upsert: string[], remove: string[] }
export interface SubmissionResult {
  accepted: string[]
  pending: string[]
  failed: string[]
  remaining?: number
}
export interface SubmissionRequest { url: string, body: string, headers: Record<string, string> }

export function initializeEngineState(snapshot: SearchSnapshot): EngineState {
  return { baseline: { ...snapshot.pages }, pending: {} }
}

export function createSubmissionPlan(snapshot: SearchSnapshot, state?: EngineState): SubmissionPlan {
  if (!state)
    throw new Error('提交基线缺失，请显式初始化')
  const upsert = Object.keys(snapshot.pages).filter(url => state.baseline[url] !== snapshot.pages[url] || Object.hasOwn(state.pending, url)).sort()
  const remove = [...new Set([...Object.keys(state.baseline), ...Object.keys(state.pending)])].filter(url => !Object.hasOwn(snapshot.pages, url)).sort()
  return { upsert, remove }
}

export function advanceState(state: EngineState, snapshot: SearchSnapshot, result: SubmissionResult): EngineState {
  const next = { baseline: { ...state.baseline }, pending: { ...state.pending } }
  for (const url of result.accepted) {
    if (Object.hasOwn(snapshot.pages, url))
      next.baseline[url] = snapshot.pages[url]!
    else
      delete next.baseline[url]
    delete next.pending[url]
  }
  for (const url of [...result.pending, ...result.failed])
    next.pending[url] = snapshot.pages[url] ?? null
  return next
}

export function validateState(value: unknown, origin: string): SearchSubmissionState {
  if (!value || typeof value !== 'object')
    throw new Error('提交状态无效')
  const data = value as SearchSubmissionState
  if (data.version !== 1 || data.origin !== origin || !data.engines || typeof data.engines !== 'object' || Array.isArray(data.engines) || Object.keys(data.engines).length === 0)
    throw new Error('提交状态版本、origin 或平台表无效，请显式初始化')
  for (const [engine, state] of Object.entries(data.engines)) {
    if (!['baidu', 'indexnow'].includes(engine) || !state || typeof state !== 'object')
      throw new Error('平台状态无效')
    for (const field of ['baseline', 'pending'] as const) {
      if (!state[field] || typeof state[field] !== 'object' || Array.isArray(state[field]))
        throw new Error('平台基线或待确认表无效')
      for (const [url, hash] of Object.entries(state[field])) {
        assertPageUrl(url, origin)
        if (!(field === 'pending' && hash === null) && (typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)))
          throw new Error('平台指纹无效')
      }
    }
  }
  return data
}

export function buildBaiduRequest(endpoint: string, origin: string, urls: string[], allowHttp: boolean): SubmissionRequest {
  let url: URL
  try {
    url = new URL(endpoint)
  }
  catch {
    throw new Error('百度接口地址无效')
  }
  if (url.hostname !== 'data.zz.baidu.com' || url.port || url.username || url.password || url.pathname !== '/urls' || url.hash
    || !url.searchParams.get('token') || url.searchParams.get('site') !== origin
    || [...url.searchParams.keys()].some(key => !['site', 'token'].includes(key))
    || url.searchParams.getAll('site').length !== 1 || url.searchParams.getAll('token').length !== 1
    || (url.protocol !== 'https:' && !(url.protocol === 'http:' && allowHttp))) {
    throw new Error('百度接口配置不符合本站普通收录要求；HTTP 需显式允许')
  }
  urls.forEach(value => assertPageUrl(value, origin))
  return { url: endpoint, body: urls.join('\n'), headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
}

export function buildIndexNowRequest(origin: string, key: string, urls: string[]): SubmissionRequest {
  if (!/^[A-Z0-9-]{8,128}$/i.test(key) || urls.length > 10000)
    throw new Error('IndexNow Key 或批量大小无效')
  urls.forEach(url => assertPageUrl(url, origin))
  return {
    url: 'https://api.indexnow.org/indexnow',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: new URL(origin).hostname, key, keyLocation: new URL(`/${key}.txt`, origin).href, urlList: urls }),
  }
}

export function classifyIndexNow(status: number, urls: string[]): SubmissionResult {
  return { accepted: status === 200 ? urls : [], pending: status === 202 ? urls : [], failed: [200, 202].includes(status) ? [] : urls }
}

export function classifyBaidu(status: number, value: unknown, urls: string[]): SubmissionResult {
  const failure = { accepted: [], pending: [], failed: urls }
  if (status !== 200 || !value || typeof value !== 'object')
    return failure
  const data = value as Record<string, unknown>
  if (Object.hasOwn(data, 'error') || !Number.isInteger(data.success) || !Number.isInteger(data.remain) || (data.success as number) < 0 || (data.remain as number) < 0)
    return failure
  const rejected: string[] = []
  for (const field of ['not_same_site', 'not_valid']) {
    const list = Object.hasOwn(data, field) ? data[field] : []
    if (!Array.isArray(list) || list.some(url => typeof url !== 'string' || !urls.includes(url)))
      return failure
    rejected.push(...list)
  }
  const unique = [...new Set(rejected)]
  if (unique.length !== rejected.length || data.success !== urls.length - unique.length)
    return failure
  return { accepted: urls.filter(url => !unique.includes(url)), pending: [], failed: unique, remaining: data.remain as number }
}
