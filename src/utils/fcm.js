import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'
import { getFirebaseApp } from '../firebase/config'

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

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || '',
    })

    return token
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