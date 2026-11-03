import type { SearchEngine, SearchSubmissionState, SubmissionRequest, SubmissionResult } from './lib/search-submission.ts'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { SITE } from '../app/config.ts'
import { validateSnapshot } from './lib/search-snapshot.ts'
import { advanceState, buildBaiduRequest, buildIndexNowRequest, classifyBaidu, classifyIndexNow, createSubmissionPlan, initializeEngineState, validateState } from './lib/search-submission.ts'

async function send(request: SubmissionRequest): Promise<{ status: number, body: unknown }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(request.url, { method: 'POST', headers: request.headers, body: request.body, signal: AbortSignal.timeout(10000), redirect: 'error' })
      if ((response.status === 429 || response.status >= 500) && attempt < 2) {
        const retry = response.headers.get('retry-after')
        const seconds = retry ? (/^\d+$/.test(retry) ? Number(retry) : (Date.parse(retry) - Date.now()) / 1000) : attempt + 1
        await response.body?.cancel()
        if (!Number.isFinite(seconds) || seconds > 5)
          return { status: response.status, body: null }
        await new Promise(resolve => setTimeout(resolve, Math.max(0, seconds) * 1000))
        continue
      }
      // 不回显服务端原文，避免百度错误响应包含带 Token 的地址。
      const text = await response.text()
      let body: unknown = null
      try {
        body = JSON.parse(text)
      }
      catch {}
      return { status: response.status, body }
    }
    catch {
      if (attempt < 2)
        await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000))
    }
  }
  return { status: 0, body: null }
}

async function readState(path: string | undefined): Promise<SearchSubmissionState | undefined> {
  if (!path)
    return undefined
  try {
    return validateState(JSON.parse(await readFile(path, 'utf8')), SITE.url)
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return undefined
    throw new Error('已有提交状态无效，未执行请求')
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: {
    'mode': { type: 'string', default: 'submit' },
    'engine': { type: 'string', default: 'all' },
    'snapshot': { type: 'string', default: '.output/search/snapshot.json' },
    'state': { type: 'string' },
    'output': { type: 'string', default: '.search/results' },
    'allow-disabled': { type: 'boolean', default: false },
  } })
  if (!['initialize', 'submit', 'backfill-baidu'].includes(values.mode!) || !['all', 'baidu', 'indexnow'].includes(values.engine!))
    throw new Error('模式或平台无效')
  const snapshot = validateSnapshot(JSON.parse(await readFile(values.snapshot!, 'utf8')), SITE.url)
  const restored = await readState(values.state)
  const state: SearchSubmissionState = restored ?? { version: 1, origin: snapshot.origin, engines: {} }
  const engines: SearchEngine[] = values.mode === 'backfill-baidu' ? ['baidu'] : values.engine === 'all' ? ['baidu', 'indexnow'] : [values.engine as SearchEngine]
  if (values.mode === 'backfill-baidu' && values.engine === 'indexnow')
    throw new Error('历史补推只支持百度')
  const summary: string[] = []
  let enabledCount = 0
  let failed = false
  for (const engine of engines) {
    const flag = process.env[engine === 'baidu' ? 'BAIDU_SUBMISSION_ENABLED' : 'INDEXNOW_SUBMISSION_ENABLED']
    if (flag && flag !== 'true' && flag !== 'false') {
      summary.push(`${engine}: 启用开关无效`)
      failed = true
      continue
    }
    if (flag !== 'true') {
      summary.push(`${engine}: 未启用`)
      continue
    }
    enabledCount++
    let current = state.engines[engine]
    const output = join(values.output!, engine)
    try {
      // 初始化不发送 URL，但仍核对配置，避免留下无法使用的基线。
      const requestFor = (urls: string[]) => engine === 'baidu'
        ? buildBaiduRequest(process.env.BAIDU_API_ENDPOINT ?? '', snapshot.origin, urls, process.env.BAIDU_ALLOW_HTTP === 'true')
        : buildIndexNowRequest(snapshot.origin, process.env.INDEXNOW_KEY ?? '', urls)
      if (process.env.BAIDU_ALLOW_HTTP && !['true', 'false'].includes(process.env.BAIDU_ALLOW_HTTP) && engine === 'baidu')
        throw new Error('HTTP 开关无效')
      requestFor([])
      if (values.mode === 'initialize') {
        current = initializeEngineState(snapshot)
        summary.push(`${engine}: 基线已初始化（未发送历史 URL）`)
      }
      else {
        const plan = createSubmissionPlan(snapshot, current)
        const urls = values.mode === 'backfill-baidu' ? Object.keys(snapshot.pages).sort() : plan.upsert
        if (engine === 'indexnow')
          urls.push(...plan.remove)
        if (engine === 'baidu' && plan.remove.length > 0) {
          await mkdir(output, { recursive: true })
          await writeFile(join(output, 'removed.txt'), `${plan.remove.join('\n')}\n`)
          summary.push(`baidu: ${plan.remove.length} 条移除项需在平台死链工具处理，清单见 artifact`)
        }
        current = advanceState(current!, snapshot, { accepted: [], pending: urls, failed: [] })
        await mkdir(output, { recursive: true })
        await writeFile(join(output, 'state.json'), `${JSON.stringify({ version: 1, origin: state.origin, engines: { [engine]: current } }, null, 2)}\n`)
        let accepted = 0
        let pending = 0
        let rejected = 0
        let remaining: number | undefined
        for (let offset = 0; offset < urls.length; offset += 10000) {
          const batch = urls.slice(offset, offset + 10000)
          const response = await send(requestFor(batch))
          const result: SubmissionResult = engine === 'baidu' ? classifyBaidu(response.status, response.body, batch) : classifyIndexNow(response.status, batch)
          current = advanceState(current!, snapshot, result)
          accepted += result.accepted.length
          pending += result.pending.length
          rejected += result.failed.length
          remaining = result.remaining
          // 每批落盘，后续请求或进程失败也保留已确认部分。
          await mkdir(output, { recursive: true })
          await writeFile(join(output, 'state.json'), `${JSON.stringify({ version: 1, origin: state.origin, engines: { [engine]: current } }, null, 2)}\n`)
          if (engine === 'baidu' && remaining === 0 && offset + batch.length < urls.length) {
            rejected += urls.length - offset - batch.length
            break
          }
        }
        summary.push(`${engine}: 已接收 ${accepted}，待验证 ${pending}，失败或未发送 ${rejected}${remaining === undefined ? '' : `，剩余额度 ${remaining}`}`)
        if (pending || rejected)
          failed = true
      }
    }
    catch {
      summary.push(`${engine}: 配置、基线或请求处理失败；未确认项保留，下次可重试`)
      failed = true
    }
    if (current) {
      await mkdir(output, { recursive: true })
      await writeFile(join(output, 'state.json'), `${JSON.stringify({ version: 1, origin: state.origin, engines: { [engine]: current } }, null, 2)}\n`)
    }
  }
  if (!enabledCount && !values['allow-disabled']) {
    summary.push('选定平台均未启用，未建立基线')
    failed = true
  }
  await mkdir(values.output!, { recursive: true })
  await writeFile(join(values.output!, 'summary.txt'), `${summary.join('\n')}\n`)
  console.log(summary.join('\n'))
  if (failed)
    process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    console.error('搜索提交未执行：参数、发布快照或状态文件无效，请核对配置')
    process.exitCode = 1
  })
}
