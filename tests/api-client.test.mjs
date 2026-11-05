import test from 'node:test'
import assert from 'node:assert/strict'
import { createApiClient } from '../src/api/createApiClient.js'
import { evaluationSubmissionId } from '../src/components/learning/evaluationSubmission.js'

const response = (body, status = 200) => new Response(JSON.stringify(body), { status })
function setup(fetcher, options = {}) {
  const values = new Map([['i-route-user', JSON.stringify({ token: 'expired', refreshToken: 'refresh', id: 1 })]])
  const storage = { getItem: key => values.get(key) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) }
  let expired = 0
  return { storage, values, expired: () => expired,
    call: createApiClient({ baseUrl: 'https://fixture.test', storage, fetcher, onExpired: () => expired++, ...options }) }
}
test('동시 401과 늦게 도착한 401은 한 번만 갱신하고 요청을 다시 보낸다', async () => {
  let refreshes = 0, firstRequests = 0, release
  const delayed = new Promise(resolve => { release = resolve })
  const ctx = setup(async (url, opts) => {
    if (url.endsWith('/token/refresh')) { refreshes++; await new Promise(r => setTimeout(r, 10)); return response({ accessToken: 'new' }) }
    if (opts.headers.Authorization === 'Bearer expired') {
      firstRequests++
      if (url.endsWith('/late')) await delayed
      return response({}, 401)
    }
    assert.equal(opts.headers.Authorization, 'Bearer new')
    return response({ ok: true })
  })
  const late = ctx.call('/late')
  await Promise.all([ctx.call('/wrong'), ctx.call('/ocr'), ctx.call('/activities')])
  release()
  await late
  assert.equal(firstRequests, 4)
  assert.equal(refreshes, 1)
  assert.equal(ctx.expired(), 0)
})
test('갱신 도중 네트워크 오류와 503은 로그인 정보를 유지한다', async () => {
  for (const failure of ['network', 'server']) {
    const ctx = setup(async url => {
      if (!url.endsWith('/token/refresh')) return response({}, 401)
      if (failure === 'network') throw new TypeError('offline')
      return response({}, 503)
    })
    await assert.rejects(ctx.call('/activities'))
    assert(ctx.storage.getItem('i-route-user'))
    assert.equal(ctx.expired(), 0)
  }
})
test('만료·무효 갱신 토큰과 재시도 401은 로그아웃 후 오류를 전달한다', async () => {
  for (const status of [401, 403, 200]) {
    const ctx = setup(async url => url.endsWith('/token/refresh')
      ? response({ accessToken: 'new' }, status) : response({}, 401))
    await assert.rejects(ctx.call('/activities'), /로그인/)
    assert.equal(ctx.storage.getItem('i-route-user'), null)
    assert.equal(ctx.expired(), 1)
  }
})
test('갱신 도중 다른 계정으로 로그인하면 이전 응답이 새 세션을 덮어쓰지 않는다', async () => {
  let release
  const delayed = new Promise(resolve => { release = resolve })
  const ctx = setup(async url => {
    if (!url.endsWith('/token/refresh')) return response({}, 401)
    await delayed
    return response({ accessToken: 'old-account-new-token' })
  })
  const pending = ctx.call('/activities')
  await new Promise(r => setTimeout(r, 0))
  ctx.storage.setItem('i-route-user', JSON.stringify({ id: 2, token: 'other', refreshToken: 'other-refresh' }))
  release()
  await assert.rejects(pending, /변경/)
  assert.equal(JSON.parse(ctx.storage.getItem('i-route-user')).id, 2)
  assert.equal(ctx.expired(), 0)
})
test('새로고침·재전송의 자기평가 키는 같고 학습 내용이 바뀌면 다른 키를 쓴다', async () => {
  const body = { studentId: 14, subject: '국어', studyDate: '2026-11-05', studyStartTime: '10:17:00', concentrationScore: 3 }
  const key = await evaluationSubmissionId(body)
  assert.match(key, /^[0-9a-f]{64}$/)
  assert.equal(await evaluationSubmissionId(JSON.parse(JSON.stringify(body))), key)
  assert.notEqual(await evaluationSubmissionId({ ...body, studentId: 15 }), key)
  assert.notEqual(await evaluationSubmissionId({ ...body, concentrationScore: 4 }), key)
})

test('저장 요청과 응답 본문이 멈추면 제한 시간 후 중단하고 로그인은 유지한다', async () => {
  for (const phase of ['request', 'body']) {
    let signal
    const ctx = setup(async (_, options) => {
      signal = options.signal
      if (phase === 'body') return { ok: true, status: 200, text: () => new Promise(() => {}) }
      return new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }))
    })
    await assert.rejects(ctx.call('/api/activities', { method: 'POST', timeoutMs: 20 }), /시간이 초과/)
    assert.equal(signal.aborted, true)
    assert(ctx.storage.getItem('i-route-user'))
    assert.equal(ctx.expired(), 0)
  }
})

test('갱신 중 저장 시간이 초과되면 늦은 갱신 완료 후 저장 요청을 재전송하지 않는다', async () => {
  let release, refreshStarted, posts = 0
  const delayed = new Promise(resolve => { release = resolve })
  const started = new Promise(resolve => { refreshStarted = resolve })
  const ctx = setup(async (url, options) => {
    if (url.endsWith('/token/refresh')) { refreshStarted(); await delayed; return response({ accessToken: 'new' }) }
    if (options.method === 'POST') posts++
    return options.headers.Authorization === 'Bearer expired' ? response({}, 401) : response({ ok: true })
  })
  const saved = assert.rejects(ctx.call('/api/activities', { method: 'POST', body: '{"submissionId":"same"}', timeoutMs: 20 }), /시간이 초과/)
  await started
  const other = ctx.call('/api/wrong-answer/14')
  await saved
  release()
  await other
  assert.equal(posts, 1)
  assert.equal(ctx.expired(), 0)
})

test('다른 계정으로 바뀐 뒤 늦게 도착한 저장 성공이나 본문은 새 계정에 반환하지 않는다', async () => {
  for (const phase of ['request', 'body']) {
    let release
    const delayed = new Promise(resolve => { release = resolve })
    const ctx = setup(async () => {
      if (phase === 'request') { await delayed; return response({ id: 10 }) }
      return { ok: true, status: 200, text: async () => { await delayed; return '{"id":10}' } }
    })
    const request = ctx.call('/api/activities', { method: 'POST' })
    await new Promise(resolve => setImmediate(resolve))
    ctx.storage.setItem('i-route-user', JSON.stringify({ id: 2, token: 'other', refreshToken: 'other-refresh' }))
    release()
    await assert.rejects(request, /변경/)
    assert.equal(JSON.parse(ctx.storage.getItem('i-route-user')).id, 2)
  }
})

test('401 갱신 뒤에는 같은 저장 본문과 키를 한 번만 재전송한다', async () => {
  const posts = []
  const ctx = setup(async (url, options) => {
    if (url.endsWith('/token/refresh')) return response({ accessToken: 'new' })
    posts.push(options)
    return options.headers.Authorization === 'Bearer expired' ? response({}, 401) : response({ id: 10 })
  })
  const body = JSON.stringify({ studentId: 14, submissionId: 'same' })
  assert.equal((await ctx.call('/api/activities', { method: 'POST', body, timeoutMs: 1000 })).id, 10)
  assert.deepEqual(posts.map(post => post.body), [body, body])
  assert.equal(posts[1].headers.Authorization, 'Bearer new')
})

test('갱신 자체가 멈춰도 다음 저장 시 다시 갱신하고 늦은 토큰 응답을 적용하지 않는다', async () => {
  let release, attempts = 0
  const delayed = new Promise(resolve => { release = resolve })
  const ctx = setup(async (url, options) => {
    if (url.endsWith('/token/refresh')) {
      if (++attempts === 1) { await delayed; return response({ accessToken: 'late' }) }
      return response({ accessToken: 'new' })
    }
    return options.headers.Authorization === 'Bearer expired' ? response({}, 401) : response({ id: 10 })
  }, { refreshTimeoutMs: 20 })
  await assert.rejects(ctx.call('/api/activities', { method: 'POST', timeoutMs: 1000 }), /갱신 시간이 초과/)
  assert(ctx.storage.getItem('i-route-user'))
  assert.equal((await ctx.call('/api/activities', { method: 'POST', timeoutMs: 1000 })).id, 10)
  release()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(JSON.parse(ctx.storage.getItem('i-route-user')).token, 'new')
  assert.equal(attempts, 2)
})

test('잘못된 갱신 응답은 로그인 정보를 유지하고 임의 토큰으로 저장하지 않는다', async () => {
  for (const body of [null, [], 'html', {}, { accessToken: 123 }]) {
    const ctx = setup(async url => url.endsWith('/token/refresh') ? response(body) : response({}, 401))
    await assert.rejects(ctx.call('/api/activities', { method: 'POST' }), /갱신 응답/)
    assert.equal(JSON.parse(ctx.storage.getItem('i-route-user')).token, 'expired')
    assert.equal(ctx.expired(), 0)
  }
})
