import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// Node does not expose Vite's import.meta.env; replace only that build-time value.
const source = (await readFile(new URL('../src/api/attendance.js', import.meta.url), 'utf8'))
  .replace('import.meta.env.VITE_API_URL', "'https://backend.test'")
const { getChildren } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))
const originalFetch = globalThis.fetch
const originalStorage = globalThis.sessionStorage
afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalStorage === undefined) delete globalThis.sessionStorage
  else globalThis.sessionStorage = originalStorage
})

test('children request sends the stored bearer token and returns the response', async () => {
  globalThis.sessionStorage = { getItem: () => JSON.stringify({ token: 'parent-token' }) }
  const children = [{ gpsStudentId: 7, gradeStudentId: 'S-0155', name: 'child', busId: 1 }]
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://backend.test/api/gps/parents/14/children')
    assert.equal(options.headers.Authorization, 'Bearer parent-token')
    return { ok: true, json: async () => children }
  }
  assert.deepEqual(await getChildren(14), children)
})

test('a forbidden children response is surfaced as an error', async () => {
  globalThis.sessionStorage = { getItem: () => JSON.stringify({ token: 'parent-token' }) }
  globalThis.fetch = async () => ({ ok: false, status: 403 })
  await assert.rejects(getChildren(15), /자녀 목록 조회 실패/)
})

test('an anonymous request does not invent an authorization token', async () => {
  globalThis.sessionStorage = { getItem: () => null }
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers.Authorization, undefined)
    return { ok: false, status: 403 }
  }
  await assert.rejects(getChildren(14), /자녀 목록 조회 실패/)
})
