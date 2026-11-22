import { useCallback, useEffect, useState } from 'react'
import { getPushPermission, getTokenIfGranted, initForegroundMessageListener, requestPermissionAndGetToken } from '@/utils/fcm'
import { pushMessageText, registerFcmToken } from '@/utils/pushNotifications'

// 같은 사용자·같은 토큰은 한 번만 등록한다 (화면이 다시 그려질 때마다 요청이 가지 않게)
let registeredKey = null

async function register(apiBase, accessToken, userId, fcmToken) {
  const key = `${userId}:${fcmToken}`
  if (registeredKey === key) return
  registeredKey = key
  try {
    await registerFcmToken(apiBase, accessToken, fcmToken)
  } catch (error) {
    registeredKey = null // 다음 로그인·새로고침 때 다시 시도
    throw error
  }
}

// 앱 전체(AppLayout)에서 한 번 쓰는 푸시 알림 상태.
// - 로그인돼 있고 알림이 이미 허용돼 있으면 조용히 토큰을 받아 서버에 등록한다 (다른 계정으로 로그인해도 그 계정으로 다시 연결)
// - 앱을 보고 있을 때 온 알림은 브라우저가 띄우지 않으므로 message로 넘겨 화면 안에 보여준다
// - enable: '알림 켜기' 버튼에서 부른다 (권한 요청 → 토큰 발급 → 등록)
export function usePushNotifications({ apiBase, accessToken, userId }) {
  const [permission, setPermission] = useState('unsupported')
  const [enabling, setEnabling] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    let cancelled = false
    getPushPermission().then((p) => { if (!cancelled) setPermission(p) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!accessToken || permission !== 'granted') return undefined
    let cancelled = false
    getTokenIfGranted()
      .then((fcmToken) => (!cancelled && fcmToken ? register(apiBase, accessToken, userId, fcmToken) : null))
      .catch((err) => console.warn('[FCM] 알림 등록에 실패했습니다.', err))
    return () => { cancelled = true }
  }, [apiBase, accessToken, userId, permission])

  useEffect(() => {
    if (!accessToken || permission !== 'granted') return undefined
    let cancelled = false
    let unsubscribe = null
    initForegroundMessageListener((payload) => {
      setMessage({ ...pushMessageText(payload), receivedAt: Date.now() })
    }).then((off) => {
      if (cancelled) off?.()
      else unsubscribe = off
    })
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [accessToken, permission])

  const enable = useCallback(async () => {
    setEnabling(true)
    setError(null)
    try {
      const fcmToken = await requestPermissionAndGetToken()
      const next = await getPushPermission()
      setPermission(next)
      if (!fcmToken) {
        // 권한 창을 닫았거나 거부했으면 안내만 바뀐다. 허용했는데 토큰을 못 받았으면 오류
        if (next === 'granted') setError('알림을 켜지 못했어요. 잠시 후 다시 시도해 주세요')
        return
      }
      if (accessToken) await register(apiBase, accessToken, userId, fcmToken)
    } catch (err) {
      console.warn('[FCM] 알림 등록에 실패했습니다.', err)
      setError('알림 서버에 등록하지 못했어요. 잠시 후 다시 시도해 주세요')
    } finally {
      setEnabling(false)
    }
  }, [apiBase, accessToken, userId])

  const dismissMessage = useCallback(() => setMessage(null), [])

  return { permission, enabling, error, enable, message, dismissMessage }
}
