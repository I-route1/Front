import test from 'node:test'
import assert from 'node:assert/strict'
import { createApiClient } from '../src/api/createApiClient.js'
import { evaluationSubmissionId } from '../src/components/learning/evaluationSubmission.js'

const response = (body, status = 200) => new Response(JSON.stringify(body), { status })
function setup(fetcher) {
  const values = new Map([['i-route-user', JSON.stringify({ token: 'expired', refreshToken: 'refresh', id: 1 })]])
  const storage = { getItem: key => values.get(key) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) }
  let expired = 0
  return { storage, values, expired: () => expired,
    call: createApiClient({ baseUrl: 'https://fixture.test', storage, fetcher, onExpired: () => expired++ }) }
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
