import { expect, it } from 'vitest'
import { chooseArtifact } from '../scripts/lib/search-artifacts'

const run = { id: 10, workflow_id: 2, head_branch: 'main', event: 'push', status: 'completed', run_attempt: 1 }
const artifact = { id: 1, name: 'search-state-baidu-10-1', expired: false, created_at: '2026-11-03T00:00:00Z', workflow_run: { id: 10 } }
it('只恢复当前工作流 main 的已完成可信运行', () => {
  expect(chooseArtifact([artifact], [run], 'search-state-baidu', 2, 20, 1)).toEqual(artifact)
  for (const bad of [{ ...run, head_branch: 'dev' }, { ...run, workflow_id: 3 }, { ...run, event: 'pull_request' }, { ...run, status: 'in_progress' }])
    expect(chooseArtifact([artifact], [bad], 'search-state-baidu', 2, 20, 1)).toBeUndefined()
})
it('最新状态过期时不回退到旧基线', () => {
  expect(() => chooseArtifact([{ ...artifact, id: 2, expired: true, created_at: '2026-11-04T00:00:00Z' }, artifact], [run], 'search-state-baidu', 2, 20, 1)).toThrow()
})
it('重跑可恢复当前 run 较早 attempt，不恢复当前 attempt 的输出', () => {
  expect(chooseArtifact([artifact], [{ ...run, status: 'in_progress', run_attempt: 2 }], 'search-state-baidu', 2, 10, 2)).toEqual(artifact)
  expect(chooseArtifact([artifact], [{ ...run, status: 'in_progress' }], 'search-state-baidu', 2, 10, 1)).toBeUndefined()
})
it('快照与状态各自按时间选择且不匹配伪造名称', () => {
  expect(chooseArtifact([{ ...artifact, name: 'search-snapshot-10-1' }, artifact], [run], 'search-state-baidu', 2, 20, 1)?.name).toBe(artifact.name)
  expect(chooseArtifact([{ ...artifact, name: 'search-state-baidu-99-1' }], [run], 'search-state-baidu', 2, 20, 1)).toBeUndefined()
})

it('部署快照可读取当前 attempt；重跑搜索 job 可读取上次成功部署的快照', () => {
  const snapshot = { ...artifact, name: 'search-snapshot-10-1' }
  const active = { ...run, status: 'in_progress' }
  expect(chooseArtifact([snapshot], [active], 'search-snapshot', 2, 10, 1)).toEqual(snapshot)
  expect(chooseArtifact([snapshot], [{ ...active, run_attempt: 2 }], 'search-snapshot', 2, 10, 2)).toEqual(snapshot)
  expect(chooseArtifact([artifact], [active], 'search-state-baidu', 2, 10, 1)).toBeUndefined()
})
