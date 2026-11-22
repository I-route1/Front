import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'
import { getFirebaseApp } from '../firebase/config'
import { pushPermissionState } from './pushNotifications'

const getFirebaseMessaging = async () => {
  try {
    const supported = await isSupported()

    if (!supported) {
      console.warn('[FCM] 이 브라우저는 Firebase Messaging을 지원하지 않습니다.')
      return null
    }

    const app = getFirebaseApp()

    if (!app) {
      return null
    }

    return getMessaging(app)
  } catch (error) {
    console.error('[FCM] Firebase Messaging 초기화 중 오류가 발생했습니다.', error)
    return null
  }
}

// 알림 권한 상태 ('unsupported' | 'default' | 'granted' | 'denied'). Firebase 설정값이 없어도 'unsupported'
export const getPushPermission = async () => {
  try {
    const notificationApi = typeof window !== 'undefined' && 'Notification' in window ? window.Notification : null
    const messagingSupported = Boolean(notificationApi) && Boolean(getFirebaseApp()) && await isSupported()
    return pushPermissionState({ notificationApi, messagingSupported })
  } catch {
    return 'unsupported'
  }
}

const issueToken = (messaging) => getToken(messaging, {
  vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || '',
})

// 권한을 묻고 토큰을 받는다. 브라우저(특히 아이폰)는 사용자가 버튼을 눌렀을 때만 권한 창을 띄우므로
// 화면이 열릴 때가 아니라 '알림 켜기' 버튼에서 부른다
export const requestPermissionAndGetToken = async () => {
  try {
    if (!('Notification' in window)) {
      console.warn('[FCM] 이 브라우저는 알림 기능을 지원하지 않습니다.')
      return null
    }

    const messaging = await getFirebaseMessaging()

    if (!messaging) {
      return null
    }

    const permission = await Notification.requestPermission()

    if (permission !== 'granted') {
      console.warn('[FCM] 알림 권한이 허용되지 않았습니다.')
      return null
    }

    return await issueToken(messaging)
  } catch (error) {
    console.error('[FCM] 토큰 발급 중 오류가 발생했습니다.', error)
    return null
  }
}

// 이미 허용된 경우에만 권한 창 없이 토큰을 받는다 (로그인할 때마다 서버에 다시 등록하는 용도)
export const getTokenIfGranted = async () => {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return null
    const messaging = await getFirebaseMessaging()
    return messaging ? await issueToken(messaging) : null
  } catch (error) {
    console.error('[FCM] 토큰 발급 중 오류가 발생했습니다.', error)
    return null
  }
}

export const onMessageListener = async () => {
  try {
    const messaging = await getFirebaseMessaging()

    if (!messaging) {
      return null
    }

    return new Promise((resolve) => {
      onMessage(messaging, (payload) => {
        resolve(payload)
      })
    })
  } catch (error) {
    console.error('[FCM] 메시지 수신 리스너 설정 중 오류가 발생했습니다.', error)
    return null
  }
}

export const initForegroundMessageListener = async (callback) => {
  try {
    const messaging = await getFirebaseMessaging()

    if (!messaging) {
      return null
    }

    return onMessage(messaging, (payload) => {
      if (typeof callback === 'function') {
        callback(payload)
      }
    })
  } catch (error) {
    console.error('[FCM] 포그라운드 메시지 리스너 설정 중 오류가 발생했습니다.', error)
    return null
  }
}

export const requestAndGetFCMToken = requestPermissionAndGetToken