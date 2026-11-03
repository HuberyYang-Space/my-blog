import { describe, expect, it } from 'vitest'
import { advanceState, buildBaiduRequest, buildIndexNowRequest, classifyBaidu, classifyIndexNow, createSubmissionPlan, initializeEngineState, validateState } from '../scripts/lib/search-submission'

const origin = 'https://example.com:91'
const a = `${origin}/posts/a`
const b = `${origin}/posts/b`
const hash = 'a'.repeat(64)
const snapshot = { version: 1 as const, origin, pages: { [a]: hash } }

describe('分平台增量与状态', () => {
  it('显式初始化不推送历史文章', () => expect(createSubmissionPlan(snapshot, initializeEngineState(snapshot))).toEqual({ upsert: [], remove: [] }))
  it('缺失基线不能静默全量推送', () => expect(() => createSubmissionPlan(snapshot, undefined)).toThrow())
  it('区分新增、更新、移除与从未公开草稿', () => {
    expect(createSubmissionPlan({ ...snapshot, pages: { [b]: hash } }, initializeEngineState(snapshot))).toEqual({ upsert: [b], remove: [a] })
    expect(createSubmissionPlan({ ...snapshot, pages: { [a]: 'b'.repeat(64) } }, initializeEngineState(snapshot))).toEqual({ upsert: [a], remove: [] })
  })
  it('两个平台各自比较基线', () => {
    expect(createSubmissionPlan(snapshot, { baseline: {}, pending: {} }).upsert).toEqual([a])
    expect(createSubmissionPlan(snapshot, initializeEngineState(snapshot)).upsert).toEqual([])
  })
  it('202 待确认项即使内容回退也会重新提交当前版本', () => {
    const state = { baseline: { [a]: hash }, pending: { [a]: 'b'.repeat(64) } }
    expect(createSubmissionPlan(snapshot, state).upsert).toEqual([a])
  })
  it('已通知但未确认的新页撤回仍要通知移除', () => expect(createSubmissionPlan({ ...snapshot, pages: { [b]: hash } }, { baseline: {}, pending: { [a]: hash } }).remove).toEqual([a]))
  it('仅接受项推进，202 和失败保留重试', () => {
    const state = { baseline: {}, pending: {} }
    const pending = advanceState(state, snapshot, { accepted: [], pending: [a], failed: [] })
    expect(pending).toEqual({ baseline: {}, pending: { [a]: hash } })
    expect(advanceState(pending, snapshot, { accepted: [a], pending: [], failed: [] })).toEqual(initializeEngineState(snapshot))
    expect(advanceState(pending, snapshot, { accepted: [], pending: [], failed: [a] })).toEqual(pending)
  })
  it('接受移除时删除基线与 pending', () => expect(advanceState(initializeEngineState(snapshot), { ...snapshot, pages: { [b]: hash } }, { accepted: [a], pending: [], failed: [] })).toEqual({ baseline: {}, pending: {} }))
  it('状态版本、origin、结构和 URL 都校验', () => {
    const good = { version: 1, origin, engines: { baidu: initializeEngineState(snapshot) } }
    expect(validateState(good, origin)).toEqual(good)
    for (const bad of [{ ...good, version: 2 }, { ...good, origin: 'https://other.com' }, { ...good, engines: {} }, { ...good, engines: { google: {} } }, { ...good, engines: { baidu: { baseline: {}, pending: { 'https://bad.com/': null } } } }])
      expect(() => validateState(bad, origin)).toThrow()
  })
})

describe('请求与业务响应', () => {
  const endpoint = `https://data.zz.baidu.com/urls?site=${encodeURIComponent(origin)}&token=secret`
  it('百度普通收录使用换行文本并校验站点', () => {
    expect(buildBaiduRequest(endpoint, origin, [a, b], false)).toEqual({ url: endpoint, body: `${a}\n${b}`, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    expect(() => buildBaiduRequest(endpoint.replace('https:', 'http:'), origin, [a], false)).toThrow()
    expect(buildBaiduRequest(endpoint.replace('https:', 'http:'), origin, [a], true).url).toMatch(/^http:/)
    for (const bad of [endpoint.replace('data.zz.baidu.com', 'evil.com'), endpoint.replace('token=secret', 'token='), `${endpoint}&type=daily`, `${endpoint}&token=second`, endpoint.replace(encodeURIComponent(origin), encodeURIComponent('https://other.com'))])
      expect(() => buildBaiduRequest(bad, origin, [a], false)).toThrow()
  })
  it('indexNow host 不带端口，URL 与 keyLocation 保留端口', () => {
    const req = buildIndexNowRequest(origin, 'TestKey123', [a])
    expect(JSON.parse(req.body)).toEqual({ host: 'example.com', key: 'TestKey123', keyLocation: `${origin}/TestKey123.txt`, urlList: [a] })
  })
  it('百度拒绝列表和 success 可对应时才确认剩余 URL', () => expect(classifyBaidu(200, { success: 1, remain: 9, not_valid: [b] }, [a, b])).toEqual({ accepted: [a], pending: [], failed: [b], remaining: 9 }))
  it.each([
    [200, { success: 1, remain: 9 }],
    [200, { success: 2, remain: 9, not_valid: [b] }],
    [200, { success: 2, remain: 9, not_valid: ['https://unknown.com/'] }],
    [200, { error: 401, message: 'secret' }],
    [200, {}],
    [200, { success: '2', remain: 9 }],
    [403, {}],
    [429, {}],
    [500, {}],
    [200, null],
    [200, { success: 2, remain: 9, not_valid: null }],
  ])('百度不透明或失败响应保留全部候选 %#', (status, body) => expect(classifyBaidu(status as number, body, [a, b]).accepted).toEqual([]))
  it('indexNow 200 接受，202 待验证，其余均失败', () => {
    expect(classifyIndexNow(200, [a])).toEqual({ accepted: [a], pending: [], failed: [] })
    expect(classifyIndexNow(202, [a])).toEqual({ accepted: [], pending: [a], failed: [] })
    for (const status of [400, 403, 422, 429, 500])
      expect(classifyIndexNow(status, [a]).failed).toEqual([a])
  })
})
