import type { SearchArtifact, SearchRun } from './lib/search-artifacts.ts'
import type { SearchEngine, SearchSubmissionState } from './lib/search-submission.ts'
import { execFileSync } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { SITE } from '../app/config.ts'
import { chooseArtifact } from './lib/search-artifacts.ts'
import { validateSnapshot } from './lib/search-snapshot.ts'
import { validateState } from './lib/search-submission.ts'

function ghJson(path: string, paginate = false): unknown {
  const args = ['api', path, ...(paginate ? ['--paginate', '--slurp'] : [])]
  return JSON.parse(execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }))
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { snapshot: { type: 'boolean', default: false }, initialize: { type: 'boolean', default: false }, engine: { type: 'string', default: 'all' }, output: { type: 'string', default: '.search' } } })
  if (!['all', 'baidu', 'indexnow'].includes(values.engine!))
    throw new Error('平台无效')
  const repo = process.env.GITHUB_REPOSITORY
  if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo) || process.env.GITHUB_REF !== 'refs/heads/main')
    throw new Error('只能从当前仓库 main 恢复搜索产物')
  const base = `repos/${repo}`
  const workflow = ghJson(`${base}/actions/workflows/deploy.yml`) as { id: number }
  const pages = ghJson(`${base}/actions/artifacts?per_page=100`, true) as { artifacts: SearchArtifact[] }[]
  const artifacts = pages.flatMap(page => page.artifacts).filter(item => /^(?:search-snapshot|search-state-(?:baidu|indexnow))-\d+-\d+$/.test(item.name))
  const runCache = new Map<number, SearchRun>()
  const select = (prefix: string) => {
    const candidates = artifacts.filter(item => item.name.startsWith(`${prefix}-`))
    const runs = [...new Set(candidates.map(item => item.workflow_run.id))].map((id) => {
      if (!runCache.has(id))
        runCache.set(id, ghJson(`${base}/actions/runs/${id}`) as SearchRun)
      return runCache.get(id)!
    })
    return chooseArtifact(candidates, runs, prefix, workflow.id, Number(process.env.GITHUB_RUN_ID), Number(process.env.GITHUB_RUN_ATTEMPT))
  }
  await mkdir(values.output!, { recursive: true })
  const download = async (artifact: SearchArtifact, file: string): Promise<unknown> => {
    const archive = join(values.output!, `download-${artifact.id}.zip`)
    try {
      const bytes = execFileSync('gh', ['api', `${base}/actions/artifacts/${artifact.id}/zip`], { maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
      await writeFile(archive, bytes)
      const names = execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim().split('\n')
      if (!names.includes(file) || names.some(name => !['state.json', 'removed.txt', 'snapshot.json'].includes(name)))
        throw new Error('artifact 文件清单无效')
      return JSON.parse(execFileSync('unzip', ['-p', archive, file], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }))
    }
    finally {
      await rm(archive, { force: true })
    }
  }
  if (values.snapshot) {
    const artifact = select('search-snapshot')
    if (!artifact)
      throw new Error('找不到已部署的快照，请先完成一次部署')
    const snapshot = validateSnapshot(await download(artifact, 'snapshot.json'), SITE.url)
    await writeFile(join(values.output!, 'snapshot.json'), `${JSON.stringify(snapshot, null, 2)}\n`)
  }
  const state: SearchSubmissionState = { version: 1, origin: SITE.url, engines: {} }
  const engines: SearchEngine[] = values.engine === 'all' ? ['baidu', 'indexnow'] : [values.engine as SearchEngine]
  for (const engine of engines) {
    if (process.env[engine === 'baidu' ? 'BAIDU_SUBMISSION_ENABLED' : 'INDEXNOW_SUBMISSION_ENABLED'] !== 'true')
      continue
    if (values.initialize)
      continue
    try {
      const artifact = select(`search-state-${engine}`)
      if (!artifact) {
        console.log(`${engine}: 没有可恢复基线，提交命令将要求显式初始化`)
        continue
      }
      const restored = validateState(await download(artifact, 'state.json'), SITE.url)
      if (!restored.engines[engine] || Object.keys(restored.engines).length !== 1)
        throw new Error('artifact 平台与内容不一致')
      state.engines[engine] = restored.engines[engine]
    }
    catch {
      console.log(`${engine}: 状态过期、损坏或无法下载；未恢复基线，该平台提交将失败，其他平台继续`)
    }
  }
  if (Object.keys(state.engines).length > 0)
    await writeFile(join(values.output!, 'state.json'), `${JSON.stringify(state, null, 2)}\n`)
  else
    await rm(join(values.output!, 'state.json'), { force: true })
  console.log('搜索产物恢复检查完成')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    console.error('搜索产物恢复失败：请核对 main 工作流、artifact 保留期限和显式初始化操作；未执行外部提交')
    process.exitCode = 1
  })
}
