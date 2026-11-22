// FCM 푸시 알림에서 Firebase·화면과 분리한 계산 (tests/push-notifications.test.mjs)

// 알림 권한 상태: 'unsupported'(이 브라우저에서 못 받음) | 'default'(아직 안 물어봄) | 'granted' | 'denied'
// - notificationApi: window.Notification (없으면 아이폰 사파리 탭처럼 알림 자체가 없는 환경)
// - messagingSupported: firebase/messaging의 isSupported() 결과
export function pushPermissionState({ notificationApi, messagingSupported }) {
  if (!notificationApi || !messagingSupported) return 'unsupported'
  const permission = notificationApi.permission
  return permission === 'granted' || permission === 'denied' ? permission : 'default'
}

export const DEFAULT_PUSH_TITLE = '아이루트 알림'

// FCM 메시지 → 화면에 보일 제목·본문.
// 백엔드(FirebasePushService)는 notification(제목·본문)으로 보내고, data로만 오는 메시지도 같은 모양으로 맞춘다
export function pushMessageText(payload) {
  const title = payload?.notification?.title || payload?.data?.title || DEFAULT_PUSH_TITLE
  const body = payload?.notification?.body || payload?.data?.body || ''
  return { title, body }
}

// 이 기기의 FCM 토큰을 로그인한 사용자에게 연결한다.
// 백엔드 POST /api/fcm/tokens { token } (로그인 필요, 같은 토큰이면 사용자만 바꿔 저장하므로 여러 번 보내도 된다)
// 공용 apiCall을 쓰지 않는 이유: apiCall은 401이 두 번이면 로그아웃시키는데,
// 알림 등록은 화면 뒤에서 조용히 하는 일이라 실패해도 로그인 상태를 건드리면 안 된다.
export async function registerFcmToken(apiBase, accessToken, fcmToken, fetcher = fetch) {
  const res = await fetcher(`${apiBase}/api/fcm/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ token: fcmToken }),
  })
  if (!res.ok) throw Object.assign(new Error(`알림 등록 실패 (${res.status})`), { status: res.status })
}
