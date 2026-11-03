export interface SearchArtifact {
  id: number
  name: string
  expired: boolean
  created_at: string
  workflow_run: { id: number }
}
export interface SearchRun {
  id: number
  workflow_id: number
  head_branch: string
  event: string
  status: string
  run_attempt: number
}

export function chooseArtifact(artifacts: SearchArtifact[], runs: SearchRun[], prefix: string, workflowId: number, currentRun: number, currentAttempt: number): SearchArtifact | undefined {
  const candidates = artifacts.filter((artifact) => {
    const match = new RegExp(`^${prefix}-(\\d+)-(\\d+)$`).exec(artifact.name)
    const run = runs.find(run => run.id === artifact.workflow_run.id)
    if (!match || !run || Number(match[1]) !== run.id || Number(match[2]) > run.run_attempt
      || run.workflow_id !== workflowId || run.head_branch !== 'main' || !['push', 'workflow_dispatch'].includes(run.event)) {
      return false
    }
    return run.id === currentRun
      ? Number(match[2]) < currentAttempt || (prefix === 'search-snapshot' && Number(match[2]) === currentAttempt)
      : run.status === 'completed'
  }).sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
  const latest = candidates[0]
  if (latest?.expired)
    throw new Error('最近提交状态已过期，请显式初始化')
  return latest
}
