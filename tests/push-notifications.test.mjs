import test from 'node:test'
import assert from 'node:assert/strict'
import {
  pushPermissionState, pushMessageText, registerFcmToken, DEFAULT_PUSH_TITLE,
} from '../src/utils/pushNotifications.js'

test('알림 권한 상태: 알림 기능이 없거나 Firebase를 못 쓰면 unsupported', () => {
  assert.equal(pushPermissionState({ notificationApi: null, messagingSupported: true }), 'unsupported', '아이폰 사파리 탭 등')
  assert.equal(pushPermissionState({ notificationApi: { permission: 'granted' }, messagingSupported: false }), 'unsupported')
  assert.equal(pushPermissionState({ notificationApi: { permission: 'default' }, messagingSupported: true }), 'default')
  assert.equal(pushPermissionState({ notificationApi: { permission: 'granted' }, messagingSupported: true }), 'granted')
  assert.equal(pushPermissionState({ notificationApi: { permission: 'denied' }, messagingSupported: true }), 'denied')
  assert.equal(pushPermissionState({ notificationApi: { permission: 'prompt' }, messagingSupported: true }), 'default', '모르는 값은 아직 안 물어본 것으로')
})

test('알림 문구: 백엔드가 보내는 notification(제목·본문)을 그대로, data로만 와도 같은 모양', () => {
  // 백엔드 NotificationService.sendRouteDeviation
  assert.deepEqual(
    pushMessageText({ notification: { title: '통학 차량 경로 이탈', body: '통학 차량이 지정된 경로를 이탈했습니다.' } }),
    { title: '통학 차량 경로 이탈', body: '통학 차량이 지정된 경로를 이탈했습니다.' },
  )
  assert.deepEqual(pushMessageText({ data: { title: '통학 차량 지각 위험', body: '약 7분 지연' } }), { title: '통학 차량 지각 위험', body: '약 7분 지연' })
  assert.deepEqual(pushMessageText({}), { title: DEFAULT_PUSH_TITLE, body: '' })
  assert.deepEqual(pushMessageText(null), { title: DEFAULT_PUSH_TITLE, body: '' })
})

test('토큰 등록: POST /api/fcm/tokens, 로그인 토큰과 { token } 본문', async () => {
  const calls = []
  const fetcher = async (url, options) => {
    calls.push({ url, options })
    return { ok: true, status: 200 }
  }
  await registerFcmToken('https://api.example', 'jwt-abc', 'fcm-123', fetcher)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'https://api.example/api/fcm/tokens')
  assert.equal(calls[0].options.method, 'POST')
  assert.equal(calls[0].options.headers.Authorization, 'Bearer jwt-abc')
  assert.equal(calls[0].options.headers['Content-Type'], 'application/json')
  assert.deepEqual(JSON.parse(calls[0].options.body), { token: 'fcm-123' })
})

test('토큰 등록 실패는 상태 코드와 함께 오류로 알린다 (로그아웃시키지 않는다)', async () => {
  const fetcher = async () => ({ ok: false, status: 404 })
  await assert.rejects(registerFcmToken('https://api.example', 'jwt', 'fcm', fetcher), (err) => err.status === 404)
})
